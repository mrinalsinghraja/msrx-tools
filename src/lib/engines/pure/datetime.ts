import { bool, num, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Dates, timestamps and cron.
 *
 * Everything works in the viewer's own time zone unless they ask for UTC, and
 * says which it used — a date tool that is silently in the wrong zone is worse
 * than no date tool.
 */

/* ------------------------------------------------------------------ */
/* Timestamps                                                           */
/* ------------------------------------------------------------------ */

function formatDate(date: Date, utc: boolean): string[] {
  const iso = date.toISOString();
  const local = date.toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "long",
  });
  return utc ? [`ISO 8601 (UTC)   ${iso}`, `Local            ${local}`] : [`Local            ${local}`, `ISO 8601 (UTC)   ${iso}`];
}

function relativeTo(date: Date): string {
  const deltaSeconds = (date.getTime() - Date.now()) / 1000;
  const absolute = Math.abs(deltaSeconds);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let value = deltaSeconds;
  for (const [factor, unit] of units) {
    if (Math.abs(value) < factor) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(value), unit);
    }
    value /= factor;
  }
  return absolute > 0 ? "a very long time away" : "now";
}

export const timestampConvert: PureOp = (input, options): OpResult => {
  const text = input.trim();
  const utc = bool(options, "utc", true);

  if (!text) {
    const now = new Date();
    return {
      output: [
        "Right now",
        "",
        `Unix seconds     ${Math.floor(now.getTime() / 1000)}`,
        `Unix ms          ${now.getTime()}`,
        ...formatDate(now, utc),
      ].join("\n"),
      stats: [{ label: "Now", value: String(Math.floor(Date.now() / 1000)) }],
    };
  }

  const direction = str(options, "direction", "toDate");

  if (direction === "toStamp") {
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      throw new ToolError(
        `“${text}” isn't a date this browser recognises. ISO form — 2026-08-27 or 2026-08-27T14:30:00Z — always works.`,
      );
    }
    return {
      output: [
        `Unix seconds     ${Math.floor(parsed.getTime() / 1000)}`,
        `Unix ms          ${parsed.getTime()}`,
        ...formatDate(parsed, utc),
        `Relative         ${relativeTo(parsed)}`,
      ].join("\n"),
      stats: [{ label: "Seconds", value: String(Math.floor(parsed.getTime() / 1000)) }],
    };
  }

  const digits = text.replace(/[,_\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(digits)) {
    throw new ToolError(`“${text}” isn't a number, so it can't be a Unix timestamp.`);
  }

  const raw = Number(digits);
  const unit = str(options, "unit", "auto");
  // 10 digits is seconds until the year 2286; 13 is milliseconds. Anything with
  // 12 or more digits is treated as ms, which is right for every value people
  // actually paste in.
  const isMillis = unit === "ms" || (unit === "auto" && Math.abs(raw) >= 1e12);
  const date = new Date(isMillis ? raw : raw * 1000);

  if (Number.isNaN(date.getTime())) throw new ToolError("That number is outside the range of representable dates.");

  return {
    output: [
      ...formatDate(date, utc),
      `Relative         ${relativeTo(date)}`,
      `Day of week      ${date.toLocaleDateString(undefined, { weekday: "long" })}`,
      `Read as          ${isMillis ? "milliseconds" : "seconds"}`,
    ].join("\n"),
    stats: [
      { label: "Interpreted as", value: isMillis ? "milliseconds" : "seconds" },
      { label: "Date", value: date.toISOString().slice(0, 10) },
    ],
  };
};

/* ------------------------------------------------------------------ */
/* Cron                                                                 */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const ALIASES: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

interface CronField {
  values: Set<number>;
  restricted: boolean;
  source: string;
}

function parseField(source: string, min: number, max: number, names: string[], label: string): CronField {
  const restricted = source !== "*" && source !== "?";
  const values = new Set<number>();

  for (const part of source.split(",")) {
    const [rangePart, stepPart] = part.split("/");
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isInteger(step) || step < 1) {
      throw new ToolError(`“${part}” has an invalid step in the ${label} field.`);
    }

    let from: number;
    let to: number;

    if (rangePart === "*" || rangePart === "?") {
      from = min;
      to = max;
    } else if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-");
      from = toNumber(a, names, label);
      to = toNumber(b, names, label);
    } else {
      from = toNumber(rangePart, names, label);
      to = stepPart ? max : from;
    }

    if (from < min || to > max || from > to) {
      throw new ToolError(`“${part}” is out of range for the ${label} field (${min}–${max}).`);
    }
    for (let v = from; v <= to; v += step) values.add(v);
  }

  if (values.size === 0) throw new ToolError(`The ${label} field “${source}” matches nothing.`);
  return { values, restricted, source };
}

function toNumber(token: string, names: string[], label: string): number {
  const upper = token.toUpperCase();
  const named = names.indexOf(upper);
  if (named >= 0) return named + (names === MONTH_NAMES ? 1 : 0);
  const n = Number(token);
  if (!Number.isInteger(n)) throw new ToolError(`“${token}” isn't a valid value in the ${label} field.`);
  return n;
}

interface CronSchedule {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

export function parseCron(expression: string): CronSchedule {
  const normalised = ALIASES[expression.trim().toLowerCase()] ?? expression.trim();
  const parts = normalised.split(/\s+/).filter(Boolean);

  if (parts.length === 6) parts.shift(); // tolerate a seconds field by ignoring it
  if (parts.length !== 5) {
    throw new ToolError(
      `A cron expression has five fields — minute, hour, day of month, month, day of week. This has ${parts.length}.`,
    );
  }

  const dayOfWeek = parseField(parts[4], 0, 7, DAY_NAMES, "day of week");
  // 7 and 0 both mean Sunday.
  if (dayOfWeek.values.has(7)) {
    dayOfWeek.values.delete(7);
    dayOfWeek.values.add(0);
  }

  return {
    minute: parseField(parts[0], 0, 59, [], "minute"),
    hour: parseField(parts[1], 0, 23, [], "hour"),
    dayOfMonth: parseField(parts[2], 1, 31, [], "day of month"),
    month: parseField(parts[3], 1, 12, MONTH_NAMES, "month"),
    dayOfWeek,
  };
}

function dayMatches(schedule: CronSchedule, date: Date, utc: boolean): boolean {
  const dom = utc ? date.getUTCDate() : date.getDate();
  const dow = utc ? date.getUTCDay() : date.getDay();
  const month = (utc ? date.getUTCMonth() : date.getMonth()) + 1;

  if (!schedule.month.values.has(month)) return false;

  // Standard cron: when BOTH day fields are restricted the job runs if either
  // matches. When only one is restricted, only that one is consulted.
  const domRestricted = schedule.dayOfMonth.restricted;
  const dowRestricted = schedule.dayOfWeek.restricted;
  if (domRestricted && dowRestricted) {
    return schedule.dayOfMonth.values.has(dom) || schedule.dayOfWeek.values.has(dow);
  }
  if (domRestricted) return schedule.dayOfMonth.values.has(dom);
  if (dowRestricted) return schedule.dayOfWeek.values.has(dow);
  return true;
}

export function nextCronRuns(schedule: CronSchedule, from: Date, count: number, utc: boolean): Date[] {
  const runs: Date[] = [];
  const hours = [...schedule.hour.values].sort((a, b) => a - b);
  const minutes = [...schedule.minute.values].sort((a, b) => a - b);

  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  // Walk day by day rather than minute by minute; four years of days is 1,461
  // iterations, which covers every schedule short of a 29 February rarity.
  for (let day = 0; day < 1500 && runs.length < count; day++) {
    const probe = new Date(cursor.getTime());
    probe.setDate(probe.getDate() + day);

    if (!dayMatches(schedule, probe, utc)) continue;

    for (const hour of hours) {
      for (const minute of minutes) {
        const candidate = new Date(probe.getTime());
        if (utc) candidate.setUTCHours(hour, minute, 0, 0);
        else candidate.setHours(hour, minute, 0, 0);

        if (candidate < cursor) continue;
        runs.push(candidate);
        if (runs.length >= count) return runs;
      }
    }
  }

  return runs;
}

function listPhrase(field: CronField, names?: string[], offset = 0): string {
  const values = [...field.values].sort((a, b) => a - b);
  const rendered = values.map((v) => (names ? names[v - offset] : String(v)));
  if (rendered.length === 1) return rendered[0];
  if (rendered.length === 2) return `${rendered[0]} and ${rendered[1]}`;
  return `${rendered.slice(0, -1).join(", ")} and ${rendered[rendered.length - 1]}`;
}

export function describeCron(schedule: CronSchedule): string {
  const parts: string[] = [];

  const everyMinute = !schedule.minute.restricted;
  const everyHour = !schedule.hour.restricted;

  if (everyMinute && everyHour) parts.push("Every minute");
  else if (everyMinute) parts.push(`Every minute of ${listPhrase(schedule.hour)}:00`);
  else if (everyHour) parts.push(`At minute ${listPhrase(schedule.minute)} of every hour`);
  else {
    const times = [...schedule.hour.values]
      .sort((a, b) => a - b)
      .flatMap((h) =>
        [...schedule.minute.values].sort((a, b) => a - b).map((m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`),
      );
    parts.push(times.length <= 6 ? `At ${times.join(", ")}` : `At ${times.length} times a day`);
  }

  if (schedule.dayOfWeek.restricted) {
    const full = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    parts.push(`on ${listPhrase(schedule.dayOfWeek, full)}`);
  }
  if (schedule.dayOfMonth.restricted) {
    parts.push(`on day ${listPhrase(schedule.dayOfMonth)} of the month`);
  }
  if (schedule.month.restricted) {
    const full = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    parts.push(`in ${listPhrase(schedule.month, full, 1)}`);
  }

  return `${parts.join(" ")}.`;
}

export const cronExplain: PureOp = (input, options): OpResult => {
  const expression = input.trim();
  if (!expression) return { output: "" };

  const schedule = parseCron(expression);
  const utc = bool(options, "utc");
  const count = Math.min(25, Math.max(1, num(options, "count", 5)));
  const runs = nextCronRuns(schedule, new Date(), count, utc);

  const lines = [
    describeCron(schedule),
    "",
    `Next ${runs.length} run${runs.length === 1 ? "" : "s"} (${utc ? "UTC" : "your local time"})`,
    ...runs.map((r) =>
      utc
        ? `  ${r.toISOString().replace("T", " ").slice(0, 16)}`
        : `  ${r.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`,
    ),
  ];

  if (schedule.dayOfMonth.restricted && schedule.dayOfWeek.restricted) {
    lines.push(
      "",
      "Note: both the day-of-month and day-of-week fields are set. Standard cron runs the job when EITHER matches, not both.",
    );
  }

  return {
    output: lines.join("\n"),
    stats: [{ label: "Next run", value: runs[0] ? runs[0].toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "never" }],
  };
};

/* ------------------------------------------------------------------ */
/* Age & date difference                                                */
/* ------------------------------------------------------------------ */

function parseDateInput(text: string, label: string): Date {
  const trimmed = text.trim();
  if (!trimmed) throw new ToolError(`Enter the ${label}.`);
  // Date-only strings are parsed as UTC by the spec, which shifts them a day for
  // anyone west of Greenwich. Pin them to local midnight instead.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new ToolError(`“${trimmed}” isn't a date this browser recognises. Try YYYY-MM-DD.`);
  }
  return parsed;
}

/** Calendar-aware difference: 31 Jan to 1 Mar is 1 month 1 day, not 29 days. */
function calendarDiff(from: Date, to: Date) {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonth = new Date(to.getFullYear(), to.getMonth(), 0).getDate();
    days += previousMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

export const age: PureOp = (_input, options): OpResult => {
  const birth = parseDateInput(str(options, "birth"), "date of birth");
  const asOfText = str(options, "asOf").trim();
  const asOf = asOfText ? parseDateInput(asOfText, "reference date") : new Date();

  if (birth > asOf) throw new ToolError("The date of birth is after the date you're measuring to.");

  const { years, months, days } = calendarDiff(birth, asOf);
  const totalDays = Math.floor((asOf.getTime() - birth.getTime()) / 86_400_000);

  const nextBirthday = new Date(asOf.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBirthday < asOf) nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  const daysToBirthday = Math.ceil((nextBirthday.getTime() - asOf.getTime()) / 86_400_000);

  return {
    output: [
      `Age              ${years} years, ${months} months, ${days} days`,
      "",
      `In months        ${years * 12 + months}`,
      `In weeks         ${Math.floor(totalDays / 7)}`,
      `In days          ${totalDays.toLocaleString()}`,
      `In hours         ${(totalDays * 24).toLocaleString()}`,
      "",
      `Born on a        ${birth.toLocaleDateString(undefined, { weekday: "long" })}`,
      `Next birthday    ${nextBirthday.toLocaleDateString(undefined, { dateStyle: "full" })} — ${daysToBirthday} day${daysToBirthday === 1 ? "" : "s"} away`,
    ].join("\n"),
    stats: [
      { label: "Age", value: `${years} years` },
      { label: "Days lived", value: totalDays.toLocaleString() },
      { label: "Next birthday", value: `${daysToBirthday} days` },
    ],
  };
};

export const dateDiff: PureOp = (_input, options): OpResult => {
  const start = parseDateInput(str(options, "start"), "start date");
  const end = parseDateInput(str(options, "end"), "end date");
  const [from, to] = start <= end ? [start, end] : [end, start];

  const inclusive = bool(options, "inclusive");
  const rawDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const totalDays = rawDays + (inclusive ? 1 : 0);

  let businessDays = 0;
  const cursor = new Date(from.getTime());
  for (let i = 0; i < totalDays; i++) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) businessDays++;
    cursor.setDate(cursor.getDate() + 1);
  }

  const { years, months, days } = calendarDiff(from, to);
  const headline = bool(options, "businessOnly") ? businessDays : totalDays;

  return {
    output: [
      `Difference       ${years} years, ${months} months, ${days} days`,
      "",
      `Total days       ${totalDays.toLocaleString()}${inclusive ? " (both ends counted)" : ""}`,
      `Working days     ${businessDays.toLocaleString()} (Saturdays and Sundays excluded)`,
      `Weekend days     ${(totalDays - businessDays).toLocaleString()}`,
      `Weeks            ${(totalDays / 7).toFixed(2)}`,
      `Hours            ${(totalDays * 24).toLocaleString()}`,
      "",
      `From             ${from.toLocaleDateString(undefined, { dateStyle: "full" })}`,
      `To               ${to.toLocaleDateString(undefined, { dateStyle: "full" })}`,
    ].join("\n"),
    stats: [
      { label: bool(options, "businessOnly") ? "Working days" : "Days", value: headline.toLocaleString() },
      { label: "Weeks", value: (totalDays / 7).toFixed(1) },
    ],
    note:
      "Public holidays aren't deducted — they differ by country and by year, and guessing yours would be worse than leaving them in.",
  };
};
