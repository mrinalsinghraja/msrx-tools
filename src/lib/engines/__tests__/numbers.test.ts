import { describe, expect, it } from "vitest";

import { boxShadow, colorConvert, contrastRatio, cssGradient, parseColor, rgbToOklch } from "@/lib/engines/pure/css";
import {
  aspectRatio,
  baseConvert,
  bmi,
  compoundInterest,
  convertUnit,
  discount,
  fromRoman,
  gst,
  loanEmi,
  numberToWords,
  percentage,
  romanNumeral,
  sip,
  tip,
  toRoman,
  unitConvert,
} from "@/lib/engines/pure/numbers";
import { buildQrPayload, qrGenerate } from "@/lib/engines/pure/qr";
import { ToolError, type PureOp } from "@/lib/engines/types";

async function run(op: PureOp, input: string, options: Record<string, unknown> = {}) {
  return await op(input, options as never);
}

describe("unit conversion", () => {
  it.each([
    ["length", 1, "m", "ft", 3.280839895],
    ["length", 1, "mi", "km", 1.609344],
    ["mass", 1, "kg", "lb", 2.204622622],
    ["volume", 1, "gal", "l", 3.785411784],
    ["data", 1, "MiB", "KiB", 1024],
    ["speed", 100, "km/h", "mph", 62.13711922],
  ])("converts %s %d %s to %s", (quantity, value, from, to, expected) => {
    expect(convertUnit(quantity, value, from, to)).toBeCloseTo(expected, 6);
  });

  it("handles temperature as an affine transform, not a ratio", () => {
    expect(convertUnit("temperature", 100, "C", "F")).toBeCloseTo(212, 9);
    expect(convertUnit("temperature", 32, "F", "C")).toBeCloseTo(0, 9);
    expect(convertUnit("temperature", 0, "C", "K")).toBeCloseTo(273.15, 9);
  });

  it("names the valid units when given an unknown one", () => {
    expect(() => convertUnit("length", 1, "furlong", "m")).toThrow(/Try one of/);
  });

  it("lists the whole table alongside the answer", async () => {
    const result = await run(unitConvert, "", { quantity: "length", value: 1, from: "m", to: "ft" });
    expect(result.output).toContain("All units");
    expect(result.output).toContain("kilometre");
  });
});

describe("percentages", () => {
  it("works out X percent of Y", async () => {
    const result = await run(percentage, "", { mode: "of", a: 15, b: 200 });
    expect(result.output).toContain("= 30");
  });

  it("works out what percent X is of Y", async () => {
    const result = await run(percentage, "", { mode: "isWhat", a: 30, b: 200 });
    expect(result.output).toContain("15%");
  });

  it("computes a percentage decrease with the right sign", async () => {
    const result = await run(percentage, "", { mode: "change", a: 200, b: 150 });
    expect(result.output).toContain("25% decrease");
  });

  it("refuses a change from zero", async () => {
    await expect(run(percentage, "", { mode: "change", a: 0, b: 5 })).rejects.toBeInstanceOf(ToolError);
  });
});

describe("loan EMI", () => {
  it("matches the standard amortisation formula", async () => {
    // 1,000,000 at 10% for 10 years is a well-known 13,215/month.
    const result = await run(loanEmi, "", { principal: 1_000_000, rate: 10, years: 10, schedule: false });
    const emi = Number(result.stats?.[0].value.replace(/,/g, ""));
    expect(emi).toBeCloseTo(13215.07, 1);
  });

  it("divides evenly at zero interest rather than dividing by zero", async () => {
    const result = await run(loanEmi, "", { principal: 120_000, rate: 0, years: 10, schedule: false });
    expect(result.stats?.[0].value.replace(/,/g, "")).toBe("1000.00");
  });

  it("produces a schedule whose final balance is zero", async () => {
    const result = await run(loanEmi, "", { principal: 500_000, rate: 9, years: 5, schedule: true });
    const lastLine = result.output.trim().split("\n").pop() ?? "";
    expect(Number(lastLine.split(/\s{2,}/).pop()?.replace(/,/g, ""))).toBeCloseTo(0, 1);
  });

  it("refuses a zero principal", async () => {
    await expect(run(loanEmi, "", { principal: 0, rate: 8, years: 5 })).rejects.toBeInstanceOf(ToolError);
  });
});

describe("investment maths", () => {
  it("grows a SIP above the amount invested at a positive return", async () => {
    const result = await run(sip, "", { monthly: 10_000, rate: 12, years: 10, schedule: false });
    const final = Number(result.stats?.[0].value.replace(/,/g, ""));
    expect(final).toBeGreaterThan(1_200_000);
    expect(final).toBeCloseTo(2_323_391, -3);
  });

  it("applies an annual step-up", async () => {
    const flat = await run(sip, "", { monthly: 10_000, rate: 12, years: 10, schedule: false });
    const stepped = await run(sip, "", { monthly: 10_000, rate: 12, years: 10, stepUp: 10, schedule: false });
    expect(Number(stepped.stats?.[0].value.replace(/,/g, ""))).toBeGreaterThan(
      Number(flat.stats?.[0].value.replace(/,/g, "")),
    );
  });

  it("compounds a lump sum at the stated frequency", async () => {
    const result = await run(compoundInterest, "", {
      principal: 100_000,
      rate: 10,
      years: 10,
      frequency: "1",
      contribution: 0,
    });
    expect(Number(result.stats?.[0].value.replace(/,/g, ""))).toBeCloseTo(259_374.25, 1);
  });

  it("warns that a steady return is an assumption", async () => {
    const result = await run(sip, "", { monthly: 1000, rate: 12, years: 5, schedule: false });
    expect(result.note).toMatch(/projection, not a forecast/i);
  });
});

describe("tax and pricing", () => {
  it("adds GST to an exclusive amount", async () => {
    const result = await run(gst, "", { amount: 1000, rate: 18, mode: "exclusive" });
    expect(result.output).toContain("Invoice total        1,180.00");
  });

  it("works backwards from an inclusive amount", async () => {
    const result = await run(gst, "", { amount: 1180, rate: 18, mode: "inclusive" });
    expect(result.output).toContain("Taxable value        1,000.00");
  });

  it("splits into CGST and SGST for an intra-state supply", async () => {
    const result = await run(gst, "", { amount: 1000, rate: 18 });
    expect(result.output).toContain("CGST");
    expect(result.output).toContain("SGST");
  });

  it("uses IGST for an inter-state supply", async () => {
    const result = await run(gst, "", { amount: 1000, rate: 18, interstate: true });
    expect(result.output).toContain("IGST");
    expect(result.output).not.toContain("CGST");
  });

  it("stacks two discounts multiplicatively, not additively", async () => {
    const result = await run(discount, "", { price: 1000, discount: 30, second: 20 });
    expect(result.output).toContain("You pay              560.00");
    expect(result.output).toContain("not 50%");
  });

  it("splits a tipped bill between people", async () => {
    const result = await run(tip, "", { bill: 1000, percent: 10, people: 4 });
    expect(result.stats).toEqual(expect.arrayContaining([{ label: "Each", value: "275.00" }]));
  });
});

describe("health and geometry", () => {
  it("computes BMI in metric", async () => {
    const result = await run(bmi, "", { system: "metric", heightCm: 180, weightKg: 75 });
    expect(result.output).toContain("BMI                  23.1");
    expect(result.output).toContain("Healthy weight");
  });

  it("agrees between metric and imperial for the same body", async () => {
    const metric = await run(bmi, "", { system: "metric", heightCm: 180, weightKg: 75 });
    // 180 cm is 5 ft 10.866 in. Each system has its own fields, so this is the
    // same body typed the way somebody using that system would type it.
    const imperial = await run(bmi, "", {
      system: "imperial",
      heightFt: 5,
      heightIn: 10.866,
      weightLb: 165.347,
    });
    expect(imperial.stats?.[0].value).toBe(metric.stats?.[0].value);
  });

  it("states that BMI is not a diagnosis", async () => {
    const result = await run(bmi, "", { heightCm: 170, weightKg: 70 });
    expect(result.note).toMatch(/not a diagnosis/i);
  });

  it("reduces an aspect ratio to its simplest form", async () => {
    const result = await run(aspectRatio, "", { width: 1920, height: 1080, target: 1280 });
    expect(result.output).toContain("16:9");
    expect(result.output).toContain("720");
  });
});

describe("number notation", () => {
  it("shows binary, octal, decimal and hex together", async () => {
    const result = await run(baseConvert, "255", { from: 10, common: true });
    expect(result.output).toContain("1111 1111");
    expect(result.output).toContain("FF");
    expect(result.output).toContain("377");
  });

  it("reads hex input", async () => {
    const result = await run(baseConvert, "ff", { from: 16 });
    expect(result.output).toContain("Decimal (10)     255");
  });

  it("rejects digits that don't exist in the source base", async () => {
    await expect(run(baseConvert, "2", { from: 2 })).rejects.toBeInstanceOf(ToolError);
  });

  it.each([
    [1, "I"], [4, "IV"], [9, "IX"], [14, "XIV"], [40, "XL"], [1990, "MCMXC"], [2026, "MMXXVI"], [3999, "MMMCMXCIX"],
  ])("writes %d as %s", (value, expected) => {
    expect(toRoman(value)).toBe(expected);
    expect(fromRoman(expected)).toBe(value);
  });

  it("refuses numbers outside the Roman range", () => {
    expect(() => toRoman(4000)).toThrow(ToolError);
    expect(() => toRoman(0)).toThrow(ToolError);
  });

  it("rejects non-standard numerals like IIII", () => {
    expect(() => fromRoman("IIII")).toThrow(/standard form/);
  });

  it("detects the direction automatically", async () => {
    expect((await run(romanNumeral, "MMXXVI")).output).toBe("2026");
    expect((await run(romanNumeral, "2026")).output).toBe("MMXXVI");
  });

  it("spells numbers with Indian grouping", async () => {
    const result = await run(numberToWords, "12345678", { system: "indian" });
    expect(result.output.toLowerCase()).toContain("crore");
    expect(result.output.toLowerCase()).toContain("lakh");
  });

  it("spells numbers with international grouping", async () => {
    const result = await run(numberToWords, "12345678", { system: "international" });
    expect(result.output.toLowerCase()).toContain("million");
    expect(result.output.toLowerCase()).not.toContain("lakh");
  });

  it("writes a currency amount with its minor unit", async () => {
    const result = await run(numberToWords, "1250.50", { currency: true, unit: "Rupees", subunit: "Paise" });
    expect(result.output).toContain("Rupees");
    expect(result.output).toContain("Paise");
    expect(result.output).toContain("only");
  });
});

describe("colour", () => {
  it("parses every hex length", () => {
    expect(parseColor("#f00")).toMatchObject({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor("#ff0000")).toMatchObject({ r: 255, g: 0, b: 0 });
    expect(parseColor("#ff000080").a).toBeCloseTo(0.502, 2);
  });

  it("parses rgb(), hsl() and colour names", () => {
    expect(parseColor("rgb(59 130 246)")).toMatchObject({ r: 59, g: 130, b: 246 });
    expect(parseColor("hsl(0 100% 50%)").r).toBeCloseTo(255, 5);
    expect(parseColor("teal")).toMatchObject({ r: 0, g: 128, b: 128 });
  });

  it("explains an unrecognisable colour", () => {
    expect(() => parseColor("bananas")).toThrow(ToolError);
  });

  it("computes the WCAG contrast of black on white as 21:1", () => {
    const ratio = contrastRatio({ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 });
    expect(ratio).toBeCloseTo(21, 5);
  });

  it("puts white at OKLCH lightness 1 and black at 0", () => {
    expect(rgbToOklch({ r: 255, g: 255, b: 255, a: 1 }).l).toBeCloseTo(1, 3);
    expect(rgbToOklch({ r: 0, g: 0, b: 0, a: 1 }).l).toBeCloseTo(0, 3);
  });

  it("renders every notation and a contrast verdict", async () => {
    const result = await run(colorConvert, "#3b82f6", { contrast: true });
    for (const label of ["HEX", "RGB", "HSL", "OKLCH", "CMYK", "against white"]) {
      expect(result.output).toContain(label);
    }
  });
});

describe("css generators", () => {
  it("builds a linear gradient with the chosen angle", async () => {
    const result = await run(cssGradient, "", { type: "linear", angle: 90, from: "#000", to: "#fff" });
    expect(result.output).toContain("linear-gradient(90deg, #000, #fff)");
  });

  it("adds a middle stop when asked", async () => {
    const result = await run(cssGradient, "", { midpoint: true, via: "#0ff" });
    expect(result.output).toContain("#0ff");
  });

  it("emits a box shadow with the alpha folded into the colour", async () => {
    const result = await run(boxShadow, "", { x: 0, y: 4, blur: 12, spread: 0, color: "#000000", opacity: 25 });
    expect(result.output).toContain("box-shadow: 0px 4px 12px 0px rgb(0 0 0 / 25%);");
  });

  it("prefixes inset when the toggle is on", async () => {
    const result = await run(boxShadow, "", { inset: true });
    expect(result.output).toContain("box-shadow: inset");
  });
});

describe("qr payloads", () => {
  it("builds a Wi-Fi payload in the shape scanners expect", () => {
    expect(buildQrPayload({ kind: "wifi", ssid: "Home", wifiPassword: "s3cret", wifiSecurity: "WPA" })).toBe(
      "WIFI:T:WPA;S:Home;P:s3cret;;",
    );
  });

  it("escapes the separators inside a Wi-Fi value", () => {
    const payload = buildQrPayload({ kind: "wifi", ssid: "My;Net", wifiPassword: "a:b", wifiSecurity: "WPA" });
    expect(payload).toContain("S:My\\;Net");
    expect(payload).toContain("P:a\\:b");
  });

  it("omits the password field on an open network", () => {
    const payload = buildQrPayload({ kind: "wifi", ssid: "Cafe", wifiSecurity: "nopass" });
    expect(payload).not.toContain("P:");
  });

  it("builds a vCard with the name split correctly", () => {
    const payload = buildQrPayload({ kind: "vcard", name: "Ada Lovelace", email: "ada@example.test" });
    expect(payload).toContain("N:Lovelace;Ada");
    expect(payload).toContain("FN:Ada Lovelace");
    expect(payload).toContain("EMAIL:ada@example.test");
  });

  it("insists on the fields each kind needs", () => {
    expect(() => buildQrPayload({ kind: "wifi" })).toThrow(ToolError);
    expect(() => buildQrPayload({ kind: "text", content: "" })).toThrow(ToolError);
  });

  it("renders an SVG and warns about Wi-Fi codes", async () => {
    const result = await run(qrGenerate, "", { kind: "wifi", ssid: "Home", wifiPassword: "x", size: 256 });
    expect(result.output.startsWith("<svg")).toBe(true);
    expect(result.note).toMatch(/password is inside the code/i);
  });
});
