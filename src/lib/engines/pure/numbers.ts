import { convertUnit, TEMPERATURE, UNITS } from "@/lib/units";

import { bool, num, str, ToolError, type OpResult, type PureOp } from "../types";

// Re-exported so the engine stays the single import site for callers and tests.
export { convertUnit, UNITS };

/**
 * Units, money and number notation.
 *
 * Currency figures are formatted with `toLocaleString` and no currency symbol —
 * the tools work in whatever unit the user is thinking in, and inventing a
 * symbol would be wrong for most of them.
 */

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function money(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ------------------------------------------------------------------ */
/* Units                                                                */
/* ------------------------------------------------------------------ */

export const unitConvert: PureOp = (_input, options): OpResult => {
  const quantity = str(options, "quantity", "length");
  const value = num(options, "value", 1);
  // One picker pair per quantity, so the units on screen always belong to the
  // quantity being measured. See the note in catalog/calc.ts.
  const from = str(options, `from_${quantity}`, "m");
  const to = str(options, `to_${quantity}`, "ft");
  const precision = Math.min(12, Math.max(0, num(options, "precision", 6)));

  const result = convertUnit(quantity, value, from, to);

  // The full table for this quantity is the useful part — one conversion is a
  // single number, but the table answers the next three questions too.
  const table =
    quantity === "temperature"
      ? TEMPERATURE.map((unit) => ({ unit, label: unit === "C" ? "Celsius" : unit === "F" ? "Fahrenheit" : "Kelvin", value: convertUnit(quantity, value, from, unit) }))
      : Object.entries(UNITS[quantity]).map(([unit, meta]) => ({
          unit,
          label: meta.label,
          value: convertUnit(quantity, value, from, unit),
        }));

  const width = Math.max(...table.map((r) => r.unit.length));
  const lines = [
    `${value} ${from} = ${round(result, precision)} ${to}`,
    "",
    "All units",
    ...table.map(
      (r) => `  ${r.unit.padEnd(width)}  ${round(r.value, precision).toLocaleString(undefined, { maximumFractionDigits: precision })}  ${r.label}`,
    ),
  ];

  return {
    output: lines.join("\n"),
    extra: { result, table },
    stats: [{ label: "Result", value: `${round(result, precision)} ${to}` }],
  };
};

/* ------------------------------------------------------------------ */
/* Percentages & money                                                  */
/* ------------------------------------------------------------------ */

export const percentage: PureOp = (_input, options): OpResult => {
  const mode = str(options, "mode", "of");
  const a = num(options, "a", 0);
  const b = num(options, "b", 0);
  const places = Math.min(10, Math.max(0, num(options, "precision", 2)));

  switch (mode) {
    case "of":
      return {
        output: `${a}% of ${b} = ${round((a / 100) * b, places)}`,
        stats: [{ label: "Result", value: String(round((a / 100) * b, places)) }],
      };
    case "isWhat": {
      if (b === 0) throw new ToolError("Y can't be zero — nothing is a percentage of nothing.");
      const pct = (a / b) * 100;
      return {
        output: `${a} is ${round(pct, places)}% of ${b}`,
        stats: [{ label: "Result", value: `${round(pct, places)}%` }],
      };
    }
    case "change": {
      if (a === 0) throw new ToolError("A change from zero has no defined percentage.");
      const change = ((b - a) / Math.abs(a)) * 100;
      const direction = change >= 0 ? "increase" : "decrease";
      return {
        output: [
          `${a} → ${b} is a ${round(Math.abs(change), places)}% ${direction}`,
          `Absolute change  ${round(b - a, places)}`,
          `Multiplier       ×${round(b / a, places + 2)}`,
        ].join("\n"),
        stats: [{ label: "Change", value: `${change >= 0 ? "+" : ""}${round(change, places)}%` }],
      };
    }
    default: {
      const increased = a * (1 + b / 100);
      const decreased = a * (1 - b / 100);
      return {
        output: [
          `${a} increased by ${b}%  =  ${round(increased, places)}`,
          `${a} decreased by ${b}%  =  ${round(decreased, places)}`,
        ].join("\n"),
        stats: [
          { label: "Increased", value: String(round(increased, places)) },
          { label: "Decreased", value: String(round(decreased, places)) },
        ],
      };
    }
  }
};

export const loanEmi: PureOp = (_input, options): OpResult => {
  const principal = num(options, "principal", 0);
  const annualRate = num(options, "rate", 0);
  const years = num(options, "years", 0);

  if (principal <= 0) throw new ToolError("Enter a loan amount above zero.");
  if (years <= 0) throw new ToolError("Enter a tenure above zero.");

  const months = Math.round(years * 12);
  const monthlyRate = annualRate / 12 / 100;

  // A zero-interest loan divides evenly; the standard formula divides by zero.
  const emi =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);

  const totalPaid = emi * months;
  const totalInterest = totalPaid - principal;

  const lines = [
    `Monthly instalment   ${money(emi)}`,
    `Total interest       ${money(totalInterest)}`,
    `Total repayable      ${money(totalPaid)}`,
    `Interest as a share  ${round((totalInterest / principal) * 100, 1)}% of the amount borrowed`,
    `Instalments          ${months}`,
  ];

  if (bool(options, "schedule", true)) {
    lines.push("", "Year   Principal paid   Interest paid   Balance");
    let balance = principal;
    for (let year = 1; year <= Math.ceil(months / 12); year++) {
      let principalYear = 0;
      let interestYear = 0;
      for (let m = 0; m < 12 && (year - 1) * 12 + m < months; m++) {
        const interest = balance * monthlyRate;
        const principalPart = Math.min(emi - interest, balance);
        interestYear += interest;
        principalYear += principalPart;
        balance -= principalPart;
      }
      lines.push(
        `${String(year).padStart(4)}   ${money(principalYear).padStart(14)}   ${money(interestYear).padStart(13)}   ${money(Math.max(0, balance)).padStart(12)}`,
      );
    }
  }

  return {
    output: lines.join("\n"),
    stats: [
      { label: "EMI", value: money(emi) },
      { label: "Total interest", value: money(totalInterest) },
      { label: "Total repayable", value: money(totalPaid) },
    ],
  };
};

export const sip: PureOp = (_input, options): OpResult => {
  const monthly = num(options, "monthly", 0);
  const annualRate = num(options, "rate", 0);
  const years = Math.round(num(options, "years", 0));
  const stepUp = num(options, "stepUp", 0) / 100;

  if (monthly <= 0) throw new ToolError("Enter a monthly investment above zero.");
  if (years <= 0) throw new ToolError("Enter a duration of at least one year.");

  const monthlyRate = annualRate / 12 / 100;
  let balance = 0;
  let invested = 0;
  const perYear: { year: number; invested: number; balance: number }[] = [];

  for (let year = 1; year <= years; year++) {
    const contribution = monthly * (1 + stepUp) ** (year - 1);
    for (let m = 0; m < 12; m++) {
      balance = (balance + contribution) * (1 + monthlyRate);
      invested += contribution;
    }
    perYear.push({ year, invested, balance });
  }

  const lines = [
    `Final value          ${money(balance)}`,
    `Total invested       ${money(invested)}`,
    `Gain                 ${money(balance - invested)}`,
    `Gain as a multiple   ×${round(balance / invested, 2)}`,
  ];

  if (bool(options, "schedule", true)) {
    lines.push("", "Year   Invested         Value");
    for (const row of perYear) {
      lines.push(`${String(row.year).padStart(4)}   ${money(row.invested).padStart(14)}   ${money(row.balance).padStart(14)}`);
    }
  }

  return {
    output: lines.join("\n"),
    stats: [
      { label: "Final value", value: money(balance) },
      { label: "Invested", value: money(invested) },
      { label: "Gain", value: money(balance - invested) },
    ],
    note: "Assumes a steady return every month, which no real market delivers. Treat it as a projection, not a forecast.",
  };
};

export const compoundInterest: PureOp = (_input, options): OpResult => {
  const principal = num(options, "principal", 0);
  const annualRate = num(options, "rate", 0) / 100;
  const years = num(options, "years", 0);
  const frequency = Math.max(1, num(options, "frequency", 4));
  const monthly = num(options, "contribution", 0);

  if (years <= 0) throw new ToolError("Enter a duration above zero.");

  const lumpSum = principal * (1 + annualRate / frequency) ** (frequency * years);

  // Monthly contributions compound at a monthly rate derived from the same APR,
  // so the two halves of the answer stay consistent with each other.
  const monthlyRate = (1 + annualRate / frequency) ** (frequency / 12) - 1;
  const months = Math.round(years * 12);
  const contributionValue =
    monthly === 0
      ? 0
      : monthlyRate === 0
        ? monthly * months
        : monthly * (((1 + monthlyRate) ** months - 1) / monthlyRate);

  const total = lumpSum + contributionValue;
  const invested = principal + monthly * months;

  return {
    output: [
      `Final value          ${money(total)}`,
      `  from the lump sum  ${money(lumpSum)}`,
      `  from contributions ${money(contributionValue)}`,
      "",
      `Total put in         ${money(invested)}`,
      `Interest earned      ${money(total - invested)}`,
      `Effective annual rate ${round(((1 + annualRate / frequency) ** frequency - 1) * 100, 3)}%`,
    ].join("\n"),
    stats: [
      { label: "Final value", value: money(total) },
      { label: "Interest", value: money(total - invested) },
    ],
  };
};

export const gst: PureOp = (_input, options): OpResult => {
  const amount = num(options, "amount", 0);
  const rate = num(options, "rate", 18);
  const inclusive = str(options, "mode", "exclusive") === "inclusive";
  const interstate = bool(options, "interstate");

  const base = inclusive ? amount / (1 + rate / 100) : amount;
  const tax = base * (rate / 100);
  const total = base + tax;

  const split = interstate
    ? [`IGST ${rate}%          ${money(tax)}`]
    : [`CGST ${rate / 2}%${" ".repeat(Math.max(0, 10 - String(rate / 2).length))}   ${money(tax / 2)}`, `SGST ${rate / 2}%${" ".repeat(Math.max(0, 10 - String(rate / 2).length))}   ${money(tax / 2)}`];

  return {
    output: [
      `Taxable value        ${money(base)}`,
      ...split,
      `Total GST            ${money(tax)}`,
      `Invoice total        ${money(total)}`,
    ].join("\n"),
    stats: [
      { label: "GST", value: money(tax) },
      { label: "Total", value: money(total) },
    ],
    note: interstate
      ? "Inter-state supply, so the whole amount is IGST."
      : "Intra-state supply, so GST splits evenly between CGST and SGST.",
  };
};

export const discount: PureOp = (_input, options): OpResult => {
  const price = num(options, "price", 0);
  const first = num(options, "discount", 0);
  const second = num(options, "second", 0);
  const tax = num(options, "tax", 0);

  const afterFirst = price * (1 - first / 100);
  const afterSecond = afterFirst * (1 - second / 100);
  const final = afterSecond * (1 + tax / 100);
  const saved = price - afterSecond;
  const effective = price === 0 ? 0 : (saved / price) * 100;

  const lines = [
    `You pay              ${money(final)}`,
    `You save             ${money(saved)}`,
    `Effective discount   ${round(effective, 2)}%`,
  ];
  if (second > 0) {
    lines.push(
      "",
      `After ${first}%           ${money(afterFirst)}`,
      `After a further ${second}%  ${money(afterSecond)}`,
      `Note: ${first}% + ${second}% stacked is ${round(effective, 2)}% off, not ${first + second}%.`,
    );
  }
  if (tax > 0) lines.push("", `Tax at ${tax}%         ${money(final - afterSecond)}`);

  return {
    output: lines.join("\n"),
    stats: [
      { label: "You pay", value: money(final) },
      { label: "You save", value: money(saved) },
    ],
  };
};

export const tip: PureOp = (_input, options): OpResult => {
  const bill = num(options, "bill", 0);
  const percent = num(options, "percent", 10);
  const people = Math.max(1, Math.round(num(options, "people", 1)));
  const roundUp = bool(options, "roundUp");

  const tipAmount = bill * (percent / 100);
  const total = bill + tipAmount;
  const rawShare = total / people;
  const share = roundUp ? Math.ceil(rawShare) : rawShare;

  return {
    output: [
      `Tip                  ${money(tipAmount)}`,
      `Total                ${money(total)}`,
      `Each person pays     ${money(share)}`,
      people > 1 ? `Split between        ${people} people` : "",
      roundUp && share * people !== total ? `Rounded up by        ${money(share * people - total)} in total` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    stats: [
      { label: "Tip", value: money(tipAmount) },
      { label: "Total", value: money(total) },
      { label: "Each", value: money(share) },
    ],
  };
};

export const bmi: PureOp = (_input, options): OpResult => {
  const metric = str(options, "system", "metric") === "metric";

  /*
    Each system has its own fields. They used to share one height and one
    weight, which meant switching to imperial kept the metric numbers and read
    170 cm as 170 inches — a BMI of 1.7 and a "healthy range" of 760–1023 lb.
  */
  const metres = metric
    ? num(options, "heightCm", 0) / 100
    : (num(options, "heightFt", 0) * 12 + num(options, "heightIn", 0)) * 0.0254;
  const kilos = metric ? num(options, "weightKg", 0) : num(options, "weightLb", 0) * 0.45359237;

  if (metres <= 0 || kilos <= 0) throw new ToolError("Enter a height and weight above zero.");

  const value = kilos / metres ** 2;

  const category =
    value < 18.5 ? "Underweight" : value < 25 ? "Healthy weight" : value < 30 ? "Overweight" : "Obese";

  const healthyLow = 18.5 * metres ** 2;
  const healthyHigh = 24.9 * metres ** 2;
  const unit = metric ? "kg" : "lb";
  const toDisplay = (kg: number) => round(metric ? kg : kg / 0.45359237, 1);
  const heightLabel = metric
    ? `${round(metres * 100, 1)} cm`
    : `${num(options, "heightFt", 0)} ft ${num(options, "heightIn", 0)} in`;

  return {
    output: [
      `BMI                  ${round(value, 1)}`,
      `Category             ${category}`,
      `Healthy range        ${toDisplay(healthyLow)}–${toDisplay(healthyHigh)} ${unit} at ${heightLabel}`,
    ].join("\n"),
    stats: [
      { label: "BMI", value: String(round(value, 1)) },
      { label: "Category", value: category },
    ],
    note:
      "BMI is a rough population measure. It takes no account of muscle, build, age or ancestry, and it is not a diagnosis — a clinician's reading of it is worth more than this number.",
  };
};

export const aspectRatio: PureOp = (_input, options): OpResult => {
  const width = num(options, "width", 0);
  const height = num(options, "height", 0);
  if (width <= 0 || height <= 0) throw new ToolError("Enter an original width and height above zero.");

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(width), Math.round(height));
  const ratio = `${Math.round(width) / divisor}:${Math.round(height) / divisor}`;

  const target = num(options, "target", 0);
  const solveHeight = str(options, "lock", "height") === "height";
  const newWidth = solveHeight ? target : (target * width) / height;
  const newHeight = solveHeight ? (target * height) / width : target;

  return {
    output: [
      `Aspect ratio         ${ratio}`,
      `Decimal ratio        ${round(width / height, 4)}`,
      "",
      `New size             ${round(newWidth, 2)} × ${round(newHeight, 2)}`,
      `Scale factor         ${round(newWidth / width, 4)}×`,
    ].join("\n"),
    stats: [
      { label: "Ratio", value: ratio },
      { label: "New size", value: `${Math.round(newWidth)} × ${Math.round(newHeight)}` },
    ],
  };
};

/* ------------------------------------------------------------------ */
/* Notation                                                             */
/* ------------------------------------------------------------------ */

export const baseConvert: PureOp = (input, options): OpResult => {
  const text = input.trim().replace(/[\s_,]/g, "");
  if (!text) return { output: "" };

  const from = Math.min(36, Math.max(2, num(options, "from", 10)));
  const cleaned = text.replace(/^0[bxo]/i, "");
  const value = parseInt(cleaned, from);

  if (Number.isNaN(value)) {
    throw new ToolError(`“${text}” isn't a valid base-${from} number.`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new ToolError("That number is too large to convert exactly — it exceeds JavaScript's safe integer range.");
  }

  /*
    Grouping used to be applied to the binary line alone, and only inside the
    common-bases block — so with the common bases turned off the switch was on
    screen and did nothing at all. Every line is grouped now: fours for the
    bases people read in nibbles, threes for the ones they read in threes.
  */
  const grouped = bool(options, "group", true);
  const group = (text: string, size: number) => {
    if (!grouped || text.length <= size) return text;
    const parts: string[] = [];
    for (let end = text.length; end > 0; end -= size) {
      parts.unshift(text.slice(Math.max(0, end - size), end));
    }
    return parts.join(" ");
  };

  const lines: string[] = [];
  if (bool(options, "common", true)) {
    lines.push(
      `Binary (2)       ${group(value.toString(2), 4)}`,
      `Octal (8)        ${group(value.toString(8), 3)}`,
      `Decimal (10)     ${group(value.toString(10), 3)}`,
      `Hexadecimal (16) ${group(value.toString(16).toUpperCase(), 4)}`,
    );
  }

  const to = Math.min(36, Math.max(2, num(options, "to", 2)));
  if (![2, 8, 10, 16].includes(to) || !bool(options, "common", true)) {
    const digits = group(value.toString(to).toUpperCase(), to === 8 || to === 10 ? 3 : 4);
    lines.push(`Base ${to}${" ".repeat(Math.max(1, 11 - String(to).length))}${digits}`);
  }

  return {
    output: lines.join("\n"),
    format: "code",
    stats: [{ label: "Decimal", value: value.toLocaleString() }],
  };
};

const ROMAN: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function toRoman(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 3999) {
    throw new ToolError("Roman numerals cover 1 to 3999 — there is no standard symbol beyond that.");
  }
  let remaining = value;
  let out = "";
  for (const [n, symbol] of ROMAN) {
    while (remaining >= n) {
      out += symbol;
      remaining -= n;
    }
  }
  return out;
}

export function fromRoman(text: string): number {
  const upper = text.trim().toUpperCase();
  if (!/^[MDCLXVI]+$/.test(upper)) throw new ToolError(`“${text}” contains characters that aren't Roman numerals.`);

  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < upper.length; i++) {
    const current = values[upper[i]];
    const next = values[upper[i + 1]] ?? 0;
    total += current < next ? -current : current;
  }

  // Round-tripping is the cheapest way to reject XIIII, IIX and friends.
  if (toRoman(total) !== upper) {
    throw new ToolError(`“${upper}” isn't written in standard form — ${total} is normally ${toRoman(total)}.`);
  }
  return total;
}

export const romanNumeral: PureOp = (input, options): OpResult => {
  const text = input.trim();
  if (!text) return { output: "" };

  const direction = str(options, "direction", "auto");
  const looksRoman = /^[MDCLXVImdclxvi]+$/.test(text);
  const toNumber = direction === "toNumber" || (direction === "auto" && looksRoman);

  if (toNumber) {
    const value = fromRoman(text);
    return { output: String(value), stats: [{ label: "Value", value: String(value) }] };
  }

  const value = Number(text.replace(/[\s,]/g, ""));
  if (!Number.isFinite(value)) throw new ToolError(`“${text}” is neither a number nor a Roman numeral.`);
  const roman = toRoman(value);
  return { output: roman, stats: [{ label: "Numeral", value: roman }] };
};

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
  "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function underThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${underThousand(n % 100)}` : ""}`;
}

/** Indian grouping: thousand, lakh, crore — not thousand, million, billion. */
function indianWords(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;

  if (crore) parts.push(`${indianWords(crore)} crore`);
  if (lakh) parts.push(`${underThousand(lakh)} lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} thousand`);
  if (rest) parts.push(underThousand(rest));
  return parts.join(" ");
}

const SCALES = ["", " thousand", " million", " billion", " trillion", " quadrillion"];

function internationalWords(n: number): string {
  if (n === 0) return "zero";
  const groups: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }
  return groups
    .map((group, i) => (group ? underThousand(group) + SCALES[i] : ""))
    .filter(Boolean)
    .reverse()
    .join(" ");
}

export const numberToWords: PureOp = (input, options): OpResult => {
  const text = input.trim().replace(/[\s,]/g, "");
  if (!text) return { output: "" };

  const value = Number(text);
  if (!Number.isFinite(value)) throw new ToolError(`“${input.trim()}” isn't a number.`);
  if (Math.abs(value) > 1e15) throw new ToolError("That number is beyond the range this tool spells out.");

  const negative = value < 0;
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute);
  const fraction = Math.round((absolute - whole) * 100);

  const indian = str(options, "system", "indian") === "indian";
  const spell = indian ? indianWords : internationalWords;

  let words = spell(whole);
  if (bool(options, "currency")) {
    const unit = str(options, "unit", "Rupees");
    const subunit = str(options, "subunit", "Paise");
    words = `${unit} ${words}`;
    if (fraction > 0) words += ` and ${subunit} ${spell(fraction)}`;
    words += " only";
  } else if (fraction > 0) {
    words += ` point ${String(fraction).padStart(2, "0").split("").map((d) => ONES[Number(d)] || "zero").join(" ")}`;
  }

  if (negative) words = `minus ${words}`;
  if (bool(options, "capitalise")) {
    words = words.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  } else {
    words = words.charAt(0).toUpperCase() + words.slice(1);
  }

  return {
    output: words,
    stats: [{ label: "Words", value: String(words.split(/\s+/).length) }],
  };
};
