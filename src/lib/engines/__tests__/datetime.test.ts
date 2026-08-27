import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  age,
  cronExplain,
  dateDiff,
  describeCron,
  nextCronRuns,
  parseCron,
  timestampConvert,
} from "@/lib/engines/pure/datetime";
import { ToolError, type PureOp } from "@/lib/engines/types";

async function run(op: PureOp, input: string, options: Record<string, unknown> = {}) {
  return await op(input, options as never);
}

/** Tests are pinned to a fixed instant; "today" is not a stable input. */
const NOW = new Date("2026-08-27T10:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("timestamp conversion", () => {
  it("reads a 10-digit value as seconds", async () => {
    const result = await run(timestampConvert, "1516239022", { direction: "toDate" });
    expect(result.output).toContain("2018-01-18");
    expect(result.output).toContain("Read as          seconds");
  });

  it("reads a 13-digit value as milliseconds", async () => {
    const result = await run(timestampConvert, "1516239022000", { direction: "toDate" });
    expect(result.output).toContain("2018-01-18");
    expect(result.output).toContain("Read as          milliseconds");
  });

  it("honours an explicit unit over the heuristic", async () => {
    const result = await run(timestampConvert, "1516239022", { direction: "toDate", unit: "ms" });
    expect(result.output).toContain("1970-01-18");
  });

  it("converts a date back to epoch seconds", async () => {
    const result = await run(timestampConvert, "2018-01-18T01:30:22Z", { direction: "toStamp" });
    expect(result.output).toContain("1516239022");
  });

  it("shows the current time when given nothing", async () => {
    const result = await run(timestampConvert, "");
    expect(result.output).toContain(String(Math.floor(NOW.getTime() / 1000)));
  });

  it("refuses text that isn't a number", async () => {
    await expect(run(timestampConvert, "tomorrow", { direction: "toDate" })).rejects.toBeInstanceOf(
      ToolError,
    );
  });
});

describe("cron parsing", () => {
  it("expands a step range", () => {
    const schedule = parseCron("*/15 * * * *");
    expect([...schedule.minute.values]).toEqual([0, 15, 30, 45]);
  });

  it("accepts day and month names", () => {
    const schedule = parseCron("0 9 * JAN-MAR MON");
    expect([...schedule.month.values]).toEqual([1, 2, 3]);
    expect([...schedule.dayOfWeek.values]).toEqual([1]);
  });

  it("treats 7 and 0 as the same Sunday", () => {
    expect([...parseCron("0 0 * * 7").dayOfWeek.values]).toEqual([0]);
  });

  it("expands @daily and friends", () => {
    expect([...parseCron("@daily").hour.values]).toEqual([0]);
  });

  it("tolerates a six-field expression with seconds", () => {
    expect([...parseCron("30 0 9 * * *").hour.values]).toEqual([9]);
  });

  it("rejects the wrong number of fields", () => {
    expect(() => parseCron("0 9 *")).toThrow(ToolError);
  });

  it("rejects an out-of-range value", () => {
    expect(() => parseCron("0 99 * * *")).toThrow(ToolError);
  });

  it("describes a schedule in English", () => {
    expect(describeCron(parseCron("0 9 * * 1-5"))).toContain("09:00");
    expect(describeCron(parseCron("0 9 * * 1-5"))).toContain("Monday");
  });

  it("computes the next runs in order", () => {
    const runs = nextCronRuns(parseCron("0 0 * * *"), NOW, 3, true);
    expect(runs).toHaveLength(3);
    expect(runs[0].toISOString()).toBe("2026-08-28T00:00:00.000Z");
    expect(runs[1].toISOString()).toBe("2026-08-29T00:00:00.000Z");
  });

  it("only fires in the months named", () => {
    const runs = nextCronRuns(parseCron("0 0 1 1 *"), NOW, 1, true);
    expect(runs[0].toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("warns that day-of-month and day-of-week are an OR, not an AND", async () => {
    const result = await run(cronExplain, "0 0 13 * 5", { utc: true });
    expect(result.output).toContain("EITHER matches");
  });
});

describe("age", () => {
  it("gives a calendar-correct age", async () => {
    const result = await run(age, "", { birth: "1990-08-28" });
    expect(result.output).toContain("Age              35 years, 11 months, 30 days");
  });

  it("counts a birthday that has already passed this year", async () => {
    const result = await run(age, "", { birth: "1990-01-15" });
    expect(result.output).toContain("36 years");
  });

  it("reports days until the next birthday", async () => {
    const result = await run(age, "", { birth: "1990-09-01" });
    expect(result.stats).toEqual(
      expect.arrayContaining([{ label: "Next birthday", value: "5 days" }]),
    );
  });

  it("refuses a birth date in the future", async () => {
    await expect(run(age, "", { birth: "2030-01-01" })).rejects.toBeInstanceOf(ToolError);
  });

  it("explains an unparseable date", async () => {
    await expect(run(age, "", { birth: "not a date" })).rejects.toThrow(/YYYY-MM-DD/);
  });
});

describe("date difference", () => {
  it("counts plain days between two dates", async () => {
    const result = await run(dateDiff, "", { start: "2026-01-01", end: "2026-01-31" });
    expect(result.output).toContain("Total days       30");
  });

  it("counts both ends when asked", async () => {
    const result = await run(dateDiff, "", { start: "2026-01-01", end: "2026-01-31", inclusive: true });
    expect(result.output).toContain("Total days       31");
  });

  it("excludes weekends from the working-day figure", async () => {
    // 5 to 9 January 2026 is Monday to Friday.
    const result = await run(dateDiff, "", { start: "2026-01-05", end: "2026-01-09", inclusive: true });
    expect(result.output).toContain("Working days     5");
  });

  it("handles the dates in either order", async () => {
    const forward = await run(dateDiff, "", { start: "2026-01-01", end: "2026-02-01" });
    const backward = await run(dateDiff, "", { start: "2026-02-01", end: "2026-01-01" });
    expect(backward.output).toBe(forward.output);
  });

  it("says holidays are not deducted", async () => {
    const result = await run(dateDiff, "", { start: "2026-01-01", end: "2026-01-05" });
    expect(result.note).toMatch(/holidays aren't deducted/i);
  });
});
