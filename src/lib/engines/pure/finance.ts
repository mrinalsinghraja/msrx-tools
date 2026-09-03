import type { OptionValues } from "@/lib/tools/types";

import { bool, num, str, ToolError, type OpResult } from "../types";

/**
 * Every op in this file is synchronous — it is arithmetic, with nothing to
 * await. Saying so in the type rather than widening to `PureOp` means callers
 * and tests get an `OpResult` back instead of a union they have to narrow.
 * A synchronous op is still assignable to the engine's `PureOp`, so
 * registration is unchanged.
 */
type FinanceOp = (input: string, options: OptionValues) => OpResult;

/**
 * Financial calculators.
 *
 * Two rules run through this whole file, and both exist because money maths is
 * the one place on this site where a plausible wrong answer is worse than an
 * obvious error.
 *
 * 1. **No rate is ever looked up.** Every notified rate — PPF, EPF, NSC, FD,
 *    the lot — is an input with a default, never a table this file pretends is
 *    current. Small-savings rates are re-notified every quarter and a hardcoded
 *    one would be wrong within months, silently, on a page that looks
 *    authoritative. The defaults are common recent values and each tool says so.
 *
 * 2. **Where a rule genuinely cannot be an input, it carries its year.** Income
 *    tax slabs, the gratuity cap and the TDS rate table are statute, not
 *    preference. Those are stamped with the financial year they encode, the
 *    stamp is shown on the result, and a test pins it so it cannot drift out of
 *    the prose.
 *
 * Everything here is arithmetic. None of it is advice, and several of the pages
 * say so in as many words.
 */

/* ------------------------------------------------------------------ */
/* Shared helpers                                                       */
/* ------------------------------------------------------------------ */

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** No currency symbol: the tools work in whatever unit the reader is thinking in. */
function money(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(value: number, places = 2): string {
  return `${round(value, places)}%`;
}

function pad(label: string, width = 24): string {
  return label.padEnd(width);
}

function line(label: string, value: string): string {
  return `${pad(label)} ${value}`;
}

/** Positive-or-fail, with a message written for a person rather than a log. */
function positive(value: number, what: string): number {
  if (!(value > 0)) throw new ToolError(`Enter ${what} above zero.`);
  return value;
}

/**
 * The standard reducing-balance instalment. Split out because six tools need it
 * and a second copy is a second place for the zero-rate branch to be forgotten.
 */
export function emiFor(principal: number, monthlyRate: number, months: number): number {
  if (months <= 0) throw new ToolError("Enter a tenure above zero.");
  if (monthlyRate === 0) return principal / months;
  const growth = (1 + monthlyRate) ** months;
  return (principal * monthlyRate * growth) / (growth - 1);
}

/** The loan a given instalment can carry — eligibility and prepayment both need it. */
export function principalFor(emi: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return emi * months;
  const growth = (1 + monthlyRate) ** months;
  return (emi * (growth - 1)) / (monthlyRate * growth);
}

/**
 * Future value of a contribution made at the start of every month — an annuity
 * due. Indian SIP mandates debit before the month runs, so the first
 * contribution earns that month's return; end-of-month would understate every
 * projection on the site by one period.
 */
function annuityDueValue(contribution: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return contribution * months;
  return contribution * (((1 + monthlyRate) ** months - 1) / monthlyRate) * (1 + monthlyRate);
}

/* ------------------------------------------------------------------ */
/* Growing money                                                        */
/* ------------------------------------------------------------------ */

export const stepUpSip: FinanceOp = (_input, options): OpResult => {
  const monthly = positive(num(options, "monthly", 0), "a starting monthly amount");
  const stepUp = num(options, "stepUp", 10) / 100;
  const annualRate = num(options, "rate", 12);
  const years = Math.round(positive(num(options, "years", 0), "a duration of at least one year"));

  const monthlyRate = annualRate / 12 / 100;
  let balance = 0;
  let invested = 0;
  const rows: string[] = [];

  for (let year = 1; year <= years; year++) {
    const contribution = monthly * (1 + stepUp) ** (year - 1);
    for (let m = 0; m < 12; m++) {
      balance = (balance + contribution) * (1 + monthlyRate);
      invested += contribution;
    }
    rows.push(
      `${String(year).padStart(4)}   ${money(contribution).padStart(12)}   ${money(invested).padStart(15)}   ${money(balance).padStart(16)}`,
    );
  }

  // The whole point of a step-up is the comparison, so compute the flat case too.
  const flat = annuityDueValue(monthly, monthlyRate, years * 12);
  const flatInvested = monthly * years * 12;

  const out = [
    line("Final value", money(balance)),
    line("Total invested", money(invested)),
    line("Gain", money(balance - invested)),
    "",
    line("Without the step-up", money(flat)),
    line("  invested instead", money(flatInvested)),
    line("  extra value gained", money(balance - flat)),
    line("Last year's monthly", money(monthly * (1 + stepUp) ** (years - 1))),
  ];

  if (bool(options, "schedule", true)) {
    out.push("", "Year   Monthly        Invested          Value", ...rows);
  }

  return {
    output: out.join("\n"),
    stats: [
      { label: "Final value", value: money(balance) },
      { label: "Invested", value: money(invested) },
      { label: "Beats a flat SIP by", value: money(balance - flat) },
    ],
    note: "A step-up assumes your income rises enough to fund every increase. If a year is tight, the projection quietly stops matching what you actually paid.",
  };
};

export const lumpsum: FinanceOp = (_input, options): OpResult => {
  const amount = positive(num(options, "amount", 0), "an amount to invest");
  const annualRate = num(options, "rate", 12);
  const years = positive(num(options, "years", 0), "a duration");

  const value = amount * (1 + annualRate / 100) ** years;
  const rows: string[] = [];
  for (let year = 1; year <= Math.ceil(years); year++) {
    const at = Math.min(year, years);
    rows.push(`${String(year).padStart(4)}   ${money(amount * (1 + annualRate / 100) ** at).padStart(16)}`);
  }

  const out = [
    line("Value at the end", money(value)),
    line("Amount invested", money(amount)),
    line("Gain", money(value - amount)),
    line("Growth multiple", `×${round(value / amount, 2)}`),
    line("Years to double", annualRate > 0 ? `${round(Math.log(2) / Math.log(1 + annualRate / 100), 1)} at this rate` : "never at zero per cent"),
  ];

  if (bool(options, "schedule", true)) out.push("", "Year              Value", ...rows);

  return {
    output: out.join("\n"),
    stats: [
      { label: "Final value", value: money(value) },
      { label: "Gain", value: money(value - amount) },
      { label: "Multiple", value: `×${round(value / amount, 2)}` },
    ],
    note: "A single steady rate is a projection, not a forecast. A market that averages this rate will still spend individual years well below it.",
  };
};

export const swp: FinanceOp = (_input, options): OpResult => {
  const corpus = positive(num(options, "corpus", 0), "a starting corpus");
  const withdrawal = positive(num(options, "withdrawal", 0), "a monthly withdrawal");
  const annualRate = num(options, "rate", 8);
  const years = Math.round(positive(num(options, "years", 0), "a number of years"));
  const escalate = num(options, "escalate", 0) / 100;

  const monthlyRate = annualRate / 12 / 100;
  let balance = corpus;
  let taken = 0;
  let exhaustedAt = 0;
  const rows: string[] = [];

  for (let year = 1; year <= years && balance > 0; year++) {
    const draw = withdrawal * (1 + escalate) ** (year - 1);
    for (let m = 0; m < 12; m++) {
      balance *= 1 + monthlyRate;
      const actual = Math.min(draw, balance);
      balance -= actual;
      taken += actual;
      if (balance <= 0 && exhaustedAt === 0) exhaustedAt = (year - 1) * 12 + m + 1;
    }
    rows.push(`${String(year).padStart(4)}   ${money(draw).padStart(12)}   ${money(taken).padStart(15)}   ${money(Math.max(0, balance)).padStart(16)}`);
  }

  const out = [
    line("Balance at the end", money(Math.max(0, balance))),
    line("Total withdrawn", money(taken)),
    line("Started with", money(corpus)),
    exhaustedAt > 0
      ? line("Ran out after", `${Math.floor(exhaustedAt / 12)} years ${exhaustedAt % 12} months`)
      : line("Corpus survived", `all ${years} years, with ${money(balance)} left`),
  ];

  if (bool(options, "schedule", true)) out.push("", "Year   Monthly        Withdrawn         Balance", ...rows);

  return {
    output: out.join("\n"),
    stats: [
      { label: "Withdrawn", value: money(taken) },
      { label: "Left over", value: money(Math.max(0, balance)) },
      { label: exhaustedAt > 0 ? "Ran out in month" : "Lasted", value: exhaustedAt > 0 ? String(exhaustedAt) : `${years} years` },
    ],
    note:
      exhaustedAt > 0
        ? "The corpus ran out before the term. Lower the withdrawal or shorten the plan — a projection that ends at zero is a warning, not a result."
        : "Withdrawals are taken after the month's return, and the return is assumed steady. A run of bad years early in a withdrawal plan does far more damage than the same years later.",
  };
};

export const goalSip: FinanceOp = (_input, options): OpResult => {
  const target = positive(num(options, "target", 0), "a target amount");
  const annualRate = num(options, "rate", 12);
  const years = positive(num(options, "years", 0), "a number of years");
  const existing = num(options, "existing", 0);

  const monthlyRate = annualRate / 12 / 100;
  const months = Math.round(years * 12);

  // Anything already invested grows on its own, so the SIP only has to cover
  // the shortfall. Skipping this is the single commonest way these tools
  // overstate what someone needs to save.
  const existingGrowsTo = existing * (1 + monthlyRate) ** months;
  const shortfall = Math.max(0, target - existingGrowsTo);

  const factorPerRupee = annuityDueValue(1, monthlyRate, months);
  const required = shortfall / factorPerRupee;
  const contributed = required * months;

  return {
    output: [
      line("Invest each month", money(required)),
      line("Target", money(target)),
      "",
      line("Already invested", money(existing)),
      line("  which grows to", money(existingGrowsTo)),
      line("Shortfall to fund", money(shortfall)),
      "",
      line("Total you will pay in", money(contributed)),
      line("Growth does the rest", money(shortfall - contributed)),
      line("Months of investing", String(months)),
    ].join("\n"),
    stats: [
      { label: "Monthly", value: money(required) },
      { label: "You pay in", value: money(contributed) },
      { label: "Growth adds", value: money(Math.max(0, shortfall - contributed)) },
    ],
    note:
      existingGrowsTo >= target
        ? "What you already hold reaches the target on its own at this rate. The monthly figure is zero."
        : "The monthly figure is only as reliable as the return you assumed. Run it two points lower and save the higher number.",
  };
};

export const simpleInterest: FinanceOp = (_input, options): OpResult => {
  const principal = positive(num(options, "principal", 0), "a principal");
  const annualRate = num(options, "rate", 0);
  const years = positive(num(options, "years", 0), "a duration");

  const interest = (principal * annualRate * years) / 100;
  const total = principal + interest;

  // Showing the compound figure alongside is the useful part: the gap is the
  // reason lenders quote one and savers want the other.
  const compound = principal * (1 + annualRate / 100) ** years - principal;

  return {
    output: [
      line("Interest", money(interest)),
      line("Total repayable", money(total)),
      line("Principal", money(principal)),
      "",
      line("If it compounded yearly", money(compound)),
      line("Difference", money(compound - interest)),
    ].join("\n"),
    stats: [
      { label: "Interest", value: money(interest) },
      { label: "Total", value: money(total) },
    ],
  };
};

export const cagr: FinanceOp = (_input, options): OpResult => {
  const start = positive(num(options, "start", 0), "a starting value");
  const end = positive(num(options, "end", 0), "an ending value");
  const years = positive(num(options, "years", 0), "a number of years");

  const rate = ((end / start) ** (1 / years) - 1) * 100;
  const absolute = ((end - start) / start) * 100;

  return {
    output: [
      line("CAGR", pct(rate, 2)),
      line("Absolute return", pct(absolute, 2)),
      "",
      line("Started at", money(start)),
      line("Ended at", money(end)),
      line("Over", `${round(years, 2)} years`),
      line("Growth multiple", `×${round(end / start, 3)}`),
    ].join("\n"),
    stats: [
      { label: "CAGR", value: pct(rate, 2) },
      { label: "Absolute", value: pct(absolute, 2) },
      { label: "Multiple", value: `×${round(end / start, 2)}` },
    ],
    note: "CAGR is the smooth rate that would have joined these two points. It says nothing about the path between them, and it cannot be used where money went in or out along the way — that is what XIRR is for.",
  };
};

/**
 * The rate that makes a set of dated cash flows sum to zero.
 *
 * Newton–Raphson converges fast on well-behaved flows and diverges on badly
 * behaved ones, so it falls back to bisection over a wide bracket rather than
 * returning whatever the last iteration happened to hold.
 */
export function solveXirr(flows: { date: Date; amount: number }[]): number {
  const first = flows[0].date.getTime();
  const years = flows.map((f) => (f.date.getTime() - first) / (365 * 24 * 3600 * 1000));

  const npv = (rate: number) =>
    flows.reduce((sum, f, i) => sum + f.amount / (1 + rate) ** years[i], 0);

  let rate = 0.1;
  for (let i = 0; i < 60; i++) {
    const value = npv(rate);
    if (Math.abs(value) < 1e-7) return rate;
    const slope = flows.reduce(
      (sum, f, i2) => sum - (years[i2] * f.amount) / (1 + rate) ** (years[i2] + 1),
      0,
    );
    if (slope === 0 || !Number.isFinite(slope)) break;
    const next = rate - value / slope;
    if (!Number.isFinite(next) || next <= -0.9999) break;
    if (Math.abs(next - rate) < 1e-10) return next;
    rate = next;
  }

  let low = -0.9999;
  let high = 100;
  if (npv(low) * npv(high) > 0) {
    throw new ToolError(
      "No rate fits these cash flows. Check that at least one is negative (money out) and at least one is positive (money back).",
    );
  }
  for (let i = 0; i < 300; i++) {
    const mid = (low + high) / 2;
    if (npv(low) * npv(mid) <= 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

export const xirr: FinanceOp = (input, options): OpResult => {
  const text = (input || str(options, "flows", "")).trim();
  if (!text) {
    throw new ToolError("Paste one cash flow per line, as a date and an amount: 2023-04-01, -10000");
  }

  const flows: { date: Date; amount: number }[] = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const row = raw.trim();
    if (!row || row.startsWith("#")) continue;
    const parts = row.split(/[,\t]+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      throw new ToolError(`Line ${index + 1} needs a date and an amount separated by a comma.`);
    }
    const date = new Date(parts[0]);
    if (Number.isNaN(date.getTime())) {
      throw new ToolError(`Line ${index + 1}: "${parts[0]}" is not a date this can read. Use 2023-04-01.`);
    }
    const amount = Number(parts[1].replace(/[, ]/g, ""));
    if (!Number.isFinite(amount)) {
      throw new ToolError(`Line ${index + 1}: "${parts[1]}" is not a number.`);
    }
    flows.push({ date, amount });
  }

  if (flows.length < 2) throw new ToolError("XIRR needs at least two cash flows.");
  flows.sort((a, b) => a.date.getTime() - b.date.getTime());

  const rate = solveXirr(flows);
  const invested = flows.filter((f) => f.amount < 0).reduce((s, f) => s - f.amount, 0);
  const returned = flows.filter((f) => f.amount > 0).reduce((s, f) => s + f.amount, 0);
  const spanYears =
    (flows[flows.length - 1].date.getTime() - flows[0].date.getTime()) / (365 * 24 * 3600 * 1000);

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return {
    output: [
      line("XIRR", pct(rate * 100, 3)),
      "",
      line("Money in", money(invested)),
      line("Money out", money(returned)),
      line("Net", money(returned - invested)),
      line("Absolute return", invested > 0 ? pct(((returned - invested) / invested) * 100, 2) : "n/a"),
      line("Period", `${iso(flows[0].date)} to ${iso(flows[flows.length - 1].date)} (${round(spanYears, 2)} years)`),
      "",
      "Date         Amount",
      ...flows.map((f) => `${iso(f.date)}   ${money(f.amount).padStart(16)}`),
    ].join("\n"),
    stats: [
      { label: "XIRR", value: pct(rate * 100, 2) },
      { label: "Money in", value: money(invested) },
      { label: "Money out", value: money(returned) },
    ],
    note: "Money out of your pocket is negative, money back to you is positive. Include the current value as a final positive flow dated today if the investment is still running.",
  };
};

export const stockAverage: FinanceOp = (input, options): OpResult => {
  const text = (input || str(options, "buys", "")).trim();
  if (!text) throw new ToolError("Enter one purchase per line, as quantity and price: 50, 240.75");

  const buys: { qty: number; price: number }[] = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const row = raw.trim();
    if (!row || row.startsWith("#")) continue;
    const parts = row.split(/[,\t]+|\s{2,}|\s+/).map((p) => p.replace(/[, ]/g, "").trim()).filter(Boolean);
    if (parts.length < 2) throw new ToolError(`Line ${index + 1} needs a quantity and a price.`);
    const qty = Number(parts[0]);
    const price = Number(parts[1]);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) {
      throw new ToolError(`Line ${index + 1} has something that is not a number in it.`);
    }
    if (qty <= 0 || price <= 0) throw new ToolError(`Line ${index + 1}: quantity and price must both be above zero.`);
    buys.push({ qty, price });
  }
  if (!buys.length) throw new ToolError("No purchases found. One per line: quantity, price.");

  const shares = buys.reduce((s, b) => s + b.qty, 0);
  const cost = buys.reduce((s, b) => s + b.qty * b.price, 0);
  const average = cost / shares;
  const current = num(options, "current", 0);

  const out = [
    line("Average price", money(average)),
    line("Total shares", String(round(shares, 4))),
    line("Total invested", money(cost)),
    "",
    "Qty        Price          Cost",
    ...buys.map((b) => `${String(b.qty).padStart(8)}   ${money(b.price).padStart(10)}   ${money(b.qty * b.price).padStart(14)}`),
  ];

  const stats = [
    { label: "Average price", value: money(average) },
    { label: "Shares", value: String(round(shares, 2)) },
    { label: "Invested", value: money(cost) },
  ];

  if (current > 0) {
    const value = shares * current;
    out.splice(3, 0, line("Current price", money(current)), line("Position value", money(value)), line("Profit or loss", `${money(value - cost)} (${pct(((value - cost) / cost) * 100, 2)})`), "");
    stats.push({ label: "P&L", value: money(value - cost) });
  }

  return { output: out.join("\n"), stats };
};

/* ------------------------------------------------------------------ */
/* Deposits and small-savings schemes                                   */
/* ------------------------------------------------------------------ */

const RATE_INPUT_NOTE =
  "The rate is yours to set. Nothing here looks up a live or notified figure — type in the rate on your own account or the current notification.";

export const fixedDeposit: FinanceOp = (_input, options): OpResult => {
  const principal = positive(num(options, "principal", 0), "a deposit amount");
  const annualRate = num(options, "rate", 7);
  const years = positive(num(options, "years", 0), "a tenure");
  const frequency = Math.max(1, num(options, "frequency", 4));
  const payout = str(options, "payout", "cumulative");
  const taxRate = num(options, "tax", 0);

  let maturity: number;
  let periodic = 0;

  if (payout === "cumulative") {
    maturity = principal * (1 + annualRate / 100 / frequency) ** (frequency * years);
  } else {
    // Interest leaves the account, so nothing compounds and the principal returns whole.
    periodic = (principal * annualRate) / 100 / frequency;
    maturity = principal;
  }

  const interest = payout === "cumulative" ? maturity - principal : periodic * frequency * years;
  const tax = (interest * taxRate) / 100;
  const effective = ((1 + annualRate / 100 / frequency) ** frequency - 1) * 100;

  const out = [
    line(payout === "cumulative" ? "Maturity value" : "Principal returned", money(maturity)),
    line("Interest earned", money(interest)),
    line("Deposit", money(principal)),
    line("Effective annual rate", payout === "cumulative" ? pct(effective, 3) : pct(annualRate, 3)),
  ];

  if (payout !== "cumulative") {
    out.push(line("Paid out each period", money(periodic)), line("Payouts", String(Math.round(frequency * years))));
  }

  if (taxRate > 0) {
    out.push("", line("Tax at your slab", money(tax)), line("Interest after tax", money(interest - tax)), line("Post-tax return", pct(((interest - tax) / principal / years) * 100, 2)));
  }

  return {
    output: out.join("\n"),
    stats: [
      { label: payout === "cumulative" ? "Maturity" : "Per payout", value: money(payout === "cumulative" ? maturity : periodic) },
      { label: "Interest", value: money(interest) },
      { label: taxRate > 0 ? "After tax" : "Effective rate", value: taxRate > 0 ? money(interest - tax) : pct(effective, 2) },
    ],
    note: `${RATE_INPUT_NOTE} Bank deposit interest is taxed at your slab in the year it accrues, not the year it is paid.`,
  };
};

export const recurringDeposit: FinanceOp = (_input, options): OpResult => {
  const monthly = positive(num(options, "monthly", 0), "a monthly instalment");
  const annualRate = num(options, "rate", 6.75);
  const months = Math.round(positive(num(options, "months", 0), "a tenure in months"));

  // Indian banks compound recurring deposits quarterly, and each instalment
  // earns for the months it is actually in the account. Treating it as a plain
  // monthly annuity overstates the maturity by a noticeable amount on long terms.
  const quarterly = annualRate / 100 / 4;
  let maturity = 0;
  for (let i = 0; i < months; i++) {
    const monthsHeld = months - i;
    maturity += monthly * (1 + quarterly) ** (monthsHeld / 3);
  }

  const invested = monthly * months;

  return {
    output: [
      line("Maturity value", money(maturity)),
      line("Total deposited", money(invested)),
      line("Interest earned", money(maturity - invested)),
      "",
      line("Instalment", money(monthly)),
      line("Instalments", String(months)),
      line("Compounding", "quarterly, as banks do"),
    ].join("\n"),
    stats: [
      { label: "Maturity", value: money(maturity) },
      { label: "Deposited", value: money(invested) },
      { label: "Interest", value: money(maturity - invested) },
    ],
    note: `${RATE_INPUT_NOTE} A missed instalment attracts a penalty and shortens the earning period, neither of which is modelled here.`,
  };
};

/** Yearly deposits, yearly compounding — PPF, SSY and NSC share this shape. */
function yearlySchemeRun(
  deposit: number,
  rate: number,
  depositYears: number,
  totalYears: number,
): { balance: number; invested: number; rows: string[] } {
  let balance = 0;
  let invested = 0;
  const rows: string[] = [];
  for (let year = 1; year <= totalYears; year++) {
    const put = year <= depositYears ? deposit : 0;
    balance = (balance + put) * (1 + rate / 100);
    invested += put;
    rows.push(`${String(year).padStart(4)}   ${money(put).padStart(13)}   ${money(invested).padStart(15)}   ${money(balance).padStart(16)}`);
  }
  return { balance, invested, rows };
}

export const ppf: FinanceOp = (_input, options): OpResult => {
  const yearly = positive(num(options, "yearly", 0), "a yearly deposit");
  const rate = num(options, "rate", 7.1);
  const years = Math.round(num(options, "years", 15));

  if (yearly > 150000) {
    throw new ToolError("The Public Provident Fund caps deposits at 1,50,000 a year. Enter that or less.");
  }

  const { balance, invested, rows } = yearlySchemeRun(yearly, rate, years, years);

  const out = [
    line("Maturity value", money(balance)),
    line("Total deposited", money(invested)),
    line("Interest earned", money(balance - invested)),
    line("Term", `${years} years`),
    line("Tax on the interest", "none — PPF is exempt at all three stages"),
  ];

  if (bool(options, "schedule", true)) out.push("", "Year   Deposited       Total in         Balance", ...rows);

  return {
    output: out.join("\n"),
    stats: [
      { label: "Maturity", value: money(balance) },
      { label: "Deposited", value: money(invested) },
      { label: "Interest", value: money(balance - invested) },
    ],
    note: `${RATE_INPUT_NOTE} PPF interest is calculated on the lowest balance between the fifth and the last day of each month, so depositing before the fifth of April earns a full year and depositing in March earns almost nothing.`,
  };
};

export const sukanyaSamriddhi: FinanceOp = (_input, options): OpResult => {
  const yearly = positive(num(options, "yearly", 0), "a yearly deposit");
  const rate = num(options, "rate", 8.2);
  const girlAge = num(options, "age", 5);

  if (yearly > 150000) throw new ToolError("Sukanya Samriddhi caps deposits at 1,50,000 a year. Enter that or less.");
  if (girlAge < 0 || girlAge > 10) throw new ToolError("An account can only be opened for a girl under ten. Enter an age from 0 to 10.");

  // Deposits run for 15 years; the account matures 21 years after opening.
  const { balance, invested, rows } = yearlySchemeRun(yearly, rate, 15, 21);

  const out = [
    line("Maturity value", money(balance)),
    line("Total deposited", money(invested)),
    line("Interest earned", money(balance - invested)),
    "",
    line("Deposits run for", "15 years"),
    line("Account matures in", "21 years"),
    line("She will then be", `${girlAge + 21}`),
    line("Earning without deposits", "the last 6 years"),
  ];

  if (bool(options, "schedule", true)) out.push("", "Year   Deposited       Total in         Balance", ...rows);

  return {
    output: out.join("\n"),
    stats: [
      { label: "Maturity", value: money(balance) },
      { label: "Deposited", value: money(invested) },
      { label: "Interest", value: money(balance - invested) },
    ],
    note: `${RATE_INPUT_NOTE} Deposits stop after fifteen years but the balance keeps earning until the account matures, which is where a large part of the final figure comes from.`,
  };
};

export const nsc: FinanceOp = (_input, options): OpResult => {
  const amount = positive(num(options, "amount", 0), "an amount to invest");
  const rate = num(options, "rate", 7.7);
  const years = Math.round(num(options, "years", 5));

  const rows: string[] = [];
  let balance = amount;
  for (let year = 1; year <= years; year++) {
    const interest = balance * (rate / 100);
    balance += interest;
    rows.push(`${String(year).padStart(4)}   ${money(interest).padStart(14)}   ${money(balance).padStart(16)}`);
  }

  return {
    output: [
      line("Maturity value", money(balance)),
      line("Invested", money(amount)),
      line("Interest earned", money(balance - amount)),
      line("Term", `${years} years`),
      "",
      "Year   Interest             Value",
      ...rows,
      "",
      "The interest of the first four years is reinvested, which is why it also",
      "counts as a fresh deduction under section 80C in each of those years.",
    ].join("\n"),
    stats: [
      { label: "Maturity", value: money(balance) },
      { label: "Invested", value: money(amount) },
      { label: "Interest", value: money(balance - amount) },
    ],
    note: `${RATE_INPUT_NOTE} The rate is fixed for the whole term on the day you buy, so a certificate bought today is unaffected by later re-notifications.`,
  };
};

export const employeeProvidentFund: FinanceOp = (_input, options): OpResult => {
  const wage = positive(num(options, "wage", 0), "a monthly basic plus dearness allowance");
  const age = num(options, "age", 30);
  const retireAt = num(options, "retireAt", 58);
  const rate = num(options, "rate", 8.25);
  const growth = num(options, "growth", 5) / 100;
  const balance0 = num(options, "balance", 0);
  const employeeShare = num(options, "employeeShare", 12) / 100;

  const years = Math.round(retireAt - age);
  if (years <= 0) throw new ToolError("Retirement age has to be later than your current age.");

  // The employer's 12% is split: 8.33% of wages up to the statutory ceiling goes
  // to the pension scheme and never appears in the provident fund balance. That
  // split is the reason a naive 24% model overstates the corpus.
  const ceiling = num(options, "ceiling", 15000);
  const monthlyRate = rate / 100 / 12;

  let balance = balance0;
  let contributed = 0;
  let pensionDiverted = 0;
  const rows: string[] = [];

  for (let year = 1; year <= years; year++) {
    const monthlyWage = wage * (1 + growth) ** (year - 1);
    const employee = monthlyWage * employeeShare;
    const toPension = Math.min(monthlyWage, ceiling) * 0.0833;
    const employer = monthlyWage * 0.12 - toPension;
    for (let m = 0; m < 12; m++) {
      balance = (balance + employee + employer) * (1 + monthlyRate);
      contributed += employee + employer;
      pensionDiverted += toPension;
    }
    rows.push(`${String(year).padStart(4)}   ${money(monthlyWage).padStart(12)}   ${money(contributed).padStart(15)}   ${money(balance).padStart(16)}`);
  }

  const out = [
    line("Balance at retirement", money(balance)),
    line("Total contributed", money(contributed)),
    line("Interest earned", money(balance - contributed - balance0)),
    line("Opening balance", money(balance0)),
    "",
    line("Sent to the pension", money(pensionDiverted)),
    line("  from the employer's", `8.33% of wages up to ${money(ceiling)}`),
    line("Years to retirement", String(years)),
  ];

  if (bool(options, "schedule", true)) out.push("", "Year   Wage           Contributed          Balance", ...rows);

  return {
    output: out.join("\n"),
    stats: [
      { label: "At retirement", value: money(balance) },
      { label: "Contributed", value: money(contributed) },
      { label: "Interest", value: money(balance - contributed - balance0) },
    ],
    note: `${RATE_INPUT_NOTE} The pension share is money you do not get back as a lump sum — it buys a monthly pension instead, which this does not project.`,
  };
};

export const nps: FinanceOp = (_input, options): OpResult => {
  const monthly = positive(num(options, "monthly", 0), "a monthly contribution");
  const age = num(options, "age", 30);
  const retireAt = num(options, "retireAt", 60);
  const rate = num(options, "rate", 10);
  const annuityShare = num(options, "annuityShare", 40) / 100;
  const annuityRate = num(options, "annuityRate", 6);

  const years = Math.round(retireAt - age);
  if (years <= 0) throw new ToolError("Retirement age has to be later than your current age.");
  if (annuityShare < 0.4) {
    throw new ToolError("At least 40% of the corpus has to buy an annuity at sixty. Enter 40 or more.");
  }

  const monthlyRate = rate / 100 / 12;
  const months = years * 12;
  const corpus = annuityDueValue(monthly, monthlyRate, months);
  const invested = monthly * months;

  const annuityCorpus = corpus * annuityShare;
  const lumpSum = corpus - annuityCorpus;
  const pension = (annuityCorpus * annuityRate) / 100 / 12;

  return {
    output: [
      line("Corpus at retirement", money(corpus)),
      line("Total contributed", money(invested)),
      line("Growth", money(corpus - invested)),
      "",
      line("Tax-free lump sum", money(lumpSum)),
      line("Buys an annuity with", money(annuityCorpus)),
      line("Monthly pension", money(pension)),
      "",
      line("Years of contributing", String(years)),
      line("Annuity rate assumed", pct(annuityRate, 2)),
    ].join("\n"),
    stats: [
      { label: "Corpus", value: money(corpus) },
      { label: "Lump sum", value: money(lumpSum) },
      { label: "Monthly pension", value: money(pension) },
    ],
    note: "The pension figure depends entirely on the annuity rate available on the day you retire, which nobody can know now. The lump sum is tax-free; the pension is taxed as income.",
  };
};

export const seniorCitizensSavings: FinanceOp = (_input, options): OpResult => {
  const deposit = positive(num(options, "deposit", 0), "a deposit");
  const rate = num(options, "rate", 8.2);
  const years = num(options, "years", 5);
  const cap = 3000000;

  if (deposit > cap) throw new ToolError(`The scheme caps a deposit at ${money(cap)}. Enter that or less.`);

  const quarterly = (deposit * rate) / 100 / 4;
  const total = quarterly * 4 * years;

  return {
    output: [
      line("Paid every quarter", money(quarterly)),
      line("Works out monthly at", money(quarterly / 3)),
      line("Interest over the term", money(total)),
      line("Deposit returned", money(deposit)),
      line("Total you receive", money(total + deposit)),
      "",
      line("Term", `${years} years`),
      line("Quarterly payouts", String(Math.round(4 * years))),
      "",
      "Interest is paid out, not reinvested, so nothing compounds here. That is",
      "the trade: a predictable quarterly income instead of a larger final sum.",
    ].join("\n"),
    stats: [
      { label: "Per quarter", value: money(quarterly) },
      { label: "Total interest", value: money(total) },
      { label: "Deposit back", value: money(deposit) },
    ],
    note: `${RATE_INPUT_NOTE} The rate is locked on the day of deposit for the whole term. Interest is fully taxable and TDS applies above the threshold for senior citizens.`,
  };
};

export const postOfficeMis: FinanceOp = (_input, options): OpResult => {
  const deposit = positive(num(options, "deposit", 0), "a deposit");
  const rate = num(options, "rate", 7.4);
  const years = num(options, "years", 5);
  const holding = str(options, "holding", "single");

  const cap = holding === "joint" ? 1500000 : 900000;
  if (deposit > cap) {
    throw new ToolError(
      `A ${holding} account caps out at ${money(cap)}. Enter that or less, or switch the account type.`,
    );
  }

  const monthly = (deposit * rate) / 100 / 12;
  const total = monthly * 12 * years;

  return {
    output: [
      line("Monthly income", money(monthly)),
      line("Income over the term", money(total)),
      line("Deposit returned", money(deposit)),
      line("Total you receive", money(total + deposit)),
      "",
      line("Account type", holding === "joint" ? "joint, capped at 15,00,000" : "single, capped at 9,00,000"),
      line("Term", `${years} years`),
      line("Payments", String(Math.round(12 * years))),
    ].join("\n"),
    stats: [
      { label: "Monthly income", value: money(monthly) },
      { label: "Total income", value: money(total) },
      { label: "Deposit back", value: money(deposit) },
    ],
    note: `${RATE_INPUT_NOTE} The income is taxable as other income and there is no deduction for the deposit. Interest is credited to a linked savings account each month.`,
  };
};

/* ------------------------------------------------------------------ */
/* Borrowing                                                            */
/* ------------------------------------------------------------------ */

/** Year-by-year split of a reducing-balance loan, shared by four tools. */
function amortise(principal: number, monthlyRate: number, months: number, emi: number): string[] {
  const rows: string[] = [];
  let balance = principal;
  for (let year = 1; year <= Math.ceil(months / 12); year++) {
    let principalYear = 0;
    let interestYear = 0;
    for (let m = 0; m < 12 && (year - 1) * 12 + m < months; m++) {
      const interest = balance * monthlyRate;
      const part = Math.min(emi - interest, balance);
      interestYear += interest;
      principalYear += part;
      balance -= part;
    }
    rows.push(
      `${String(year).padStart(4)}   ${money(principalYear).padStart(14)}   ${money(interestYear).padStart(14)}   ${money(Math.max(0, balance)).padStart(15)}`,
    );
  }
  return rows;
}

export const homeLoanEmi: FinanceOp = (_input, options): OpResult => {
  const price = positive(num(options, "price", 0), "a property price");
  const downPercent = num(options, "down", 20);
  const annualRate = num(options, "rate", 8.5);
  const years = positive(num(options, "years", 0), "a tenure");

  const down = (price * downPercent) / 100;
  const principal = price - down;
  if (principal <= 0) throw new ToolError("The down payment covers the whole price — there is no loan to work out.");

  const months = Math.round(years * 12);
  const monthlyRate = annualRate / 12 / 100;
  const emi = emiFor(principal, monthlyRate, months);
  const totalPaid = emi * months;
  const interest = totalPaid - principal;

  // First-year interest is the figure that matters for the section 24(b) claim,
  // and it is also the one that surprises people: almost the whole instalment.
  let balance = principal;
  let firstYearInterest = 0;
  let firstYearPrincipal = 0;
  for (let m = 0; m < Math.min(12, months); m++) {
    const monthInterest = balance * monthlyRate;
    const part = Math.min(emi - monthInterest, balance);
    firstYearInterest += monthInterest;
    firstYearPrincipal += part;
    balance -= part;
  }

  const out = [
    line("Monthly instalment", money(emi)),
    line("Loan amount", money(principal)),
    line("Down payment", `${money(down)} (${pct(downPercent, 1)})`),
    "",
    line("Total interest", money(interest)),
    line("Total repayable", money(totalPaid)),
    line("Interest as a share", `${pct((interest / principal) * 100, 1)} of the amount borrowed`),
    line("Instalments", String(months)),
    "",
    line("First year interest", money(firstYearInterest)),
    line("First year principal", money(firstYearPrincipal)),
    line("  which means", `${pct((firstYearInterest / (firstYearInterest + firstYearPrincipal)) * 100, 1)} of year one is interest`),
  ];

  if (bool(options, "schedule", true)) {
    out.push("", "Year   Principal paid   Interest paid         Balance", ...amortise(principal, monthlyRate, months, emi));
  }

  return {
    output: out.join("\n"),
    stats: [
      { label: "EMI", value: money(emi) },
      { label: "Total interest", value: money(interest) },
      { label: "Loan", value: money(principal) },
    ],
    note: "Registration, stamp duty, legal fees and the processing charge sit on top of the down payment and are not in the loan. Budget for them separately.",
  };
};

export const carLoanEmi: FinanceOp = (_input, options): OpResult => {
  const exShowroom = positive(num(options, "price", 0), "an ex-showroom price");
  const onRoadExtra = num(options, "onRoad", 10);
  const down = num(options, "down", 0);
  const annualRate = num(options, "rate", 9.5);
  const years = positive(num(options, "years", 0), "a tenure");

  const onRoad = exShowroom * (1 + onRoadExtra / 100);
  const principal = onRoad - down;
  if (principal <= 0) throw new ToolError("The down payment covers the whole on-road price — there is no loan to work out.");

  const months = Math.round(years * 12);
  const monthlyRate = annualRate / 12 / 100;
  const emi = emiFor(principal, monthlyRate, months);
  const totalPaid = emi * months;
  const interest = totalPaid - principal;

  // A car is a depreciating asset, so the honest comparison is what it is worth
  // when the loan ends against what the loan cost.
  const depreciation = num(options, "depreciation", 15) / 100;
  const worthAtEnd = onRoad * (1 - depreciation) ** years;

  const out = [
    line("Monthly instalment", money(emi)),
    line("On-road price", money(onRoad)),
    line("  ex-showroom", money(exShowroom)),
    line("  taxes and extras", `${money(onRoad - exShowroom)} at ${pct(onRoadExtra, 1)}`),
    line("Down payment", money(down)),
    line("Loan amount", money(principal)),
    "",
    line("Total interest", money(interest)),
    line("Total repayable", money(totalPaid)),
    line("Instalments", String(months)),
    "",
    line("Worth when the loan ends", money(worthAtEnd)),
    line("  assuming", `${pct(depreciation * 100, 0)} a year of depreciation`),
    line("Paid in, minus worth", money(totalPaid + down - worthAtEnd)),
  ];

  if (bool(options, "schedule", true)) {
    out.push("", "Year   Principal paid   Interest paid         Balance", ...amortise(principal, monthlyRate, months, emi));
  }

  return {
    output: out.join("\n"),
    stats: [
      { label: "EMI", value: money(emi) },
      { label: "Total interest", value: money(interest) },
      { label: "On-road", value: money(onRoad) },
    ],
    note: "Insurance is renewed every year for the life of the car and is not part of the instalment. Dealer finance often quotes a flat rate, which is not comparable to this one — the flat versus reducing tool converts it.",
  };
};

export const loanPrepayment: FinanceOp = (_input, options): OpResult => {
  const principal = positive(num(options, "principal", 0), "a loan amount");
  const annualRate = num(options, "rate", 8.5);
  const years = positive(num(options, "years", 0), "a tenure");
  const lump = num(options, "lump", 0);
  const afterMonths = Math.max(1, Math.round(num(options, "after", 12)));
  const extraMonthly = num(options, "extra", 0);
  const shortenTenure = str(options, "keep", "tenure") === "tenure";

  const months = Math.round(years * 12);
  const monthlyRate = annualRate / 12 / 100;
  const emi = emiFor(principal, monthlyRate, months);
  const baselineTotal = emi * months;

  if (lump <= 0 && extraMonthly <= 0) {
    throw new ToolError("Enter a lump sum, a bit extra each month, or both — otherwise there is nothing to compare.");
  }

  // Run the loan month by month rather than solving it. A part payment part way
  // through, plus a monthly top-up, plus a choice of what the lender does with
  // the saving, has no closed form worth trusting.
  let balance = principal;
  let paid = 0;
  let elapsed = 0;
  let instalment = emi;
  let reducedTo = emi;

  // A runaway guard, not a business rule: a rate high enough that the interest
  // exceeds the instalment would otherwise loop for ever.
  const ceiling = months * 3;

  while (balance > 0.01 && elapsed < ceiling) {
    const interest = balance * monthlyRate;
    let payment = instalment + extraMonthly;

    if (elapsed + 1 === afterMonths && lump > 0) {
      payment += lump;

      if (!shortenTenure) {
        // Keep the original end date and let the instalment fall instead. The
        // balance after this month's payment is what the remaining months have
        // to clear, so the new instalment is solved on that.
        const remaining = Math.max(0, balance + interest - payment);
        const monthsLeft = months - (elapsed + 1);
        instalment = monthsLeft > 0 && remaining > 0 ? emiFor(remaining, monthlyRate, monthsLeft) : 0;
        reducedTo = instalment;
      }
    }

    payment = Math.min(payment, balance + interest);
    balance = balance + interest - payment;
    paid += payment;
    elapsed++;
  }

  const saved = baselineTotal - paid;
  const monthsSaved = months - elapsed;
  const prepaid = lump + extraMonthly * elapsed;

  const out = [
    line("Interest saved", money(saved)),
    line("Loan closes in", `${Math.floor(elapsed / 12)} years ${elapsed % 12} months`),
    line("Instead of", `${Math.floor(months / 12)} years ${months % 12} months`),
    line("Months saved", String(monthsSaved)),
    "",
    line("Original instalment", money(emi)),
    shortenTenure
      ? line("Instalment stays", `${money(emi)}, and the loan ends sooner`)
      : line("Instalment drops to", `${money(reducedTo)}, and the end date holds`),
    line("Extra each month", money(extraMonthly)),
    lump > 0 ? line("Part payment", `${money(lump)} in month ${afterMonths}`) : line("Part payment", "none"),
    "",
    line("Total paid without it", money(baselineTotal)),
    line("Total paid with it", money(paid)),
    line("Extra put in", money(prepaid)),
    line("Each rupee prepaid saved", prepaid > 0 ? money(saved / prepaid) : "nothing was prepaid"),
  ];

  return {
    output: out.join("\n"),
    stats: [
      { label: "Interest saved", value: money(saved) },
      { label: "Months saved", value: String(monthsSaved) },
      { label: shortenTenure ? "Closes in" : "New instalment", value: shortenTenure ? `${Math.floor(elapsed / 12)}y ${elapsed % 12}m` : money(reducedTo) },
    ],
    note: "Prepaying early saves far more than prepaying late, because early instalments are almost all interest. Shortening the tenure saves more than cutting the instalment, because the money stays out of the loan. Check your agreement for a prepayment charge first — a floating-rate home loan to an individual cannot carry one, but other loans can.",
  };
};


export const flatVsReducing: FinanceOp = (_input, options): OpResult => {
  const principal = positive(num(options, "principal", 0), "a loan amount");
  const flatRate = num(options, "flatRate", 7);
  const years = positive(num(options, "years", 0), "a tenure");

  const months = Math.round(years * 12);
  const flatInterest = (principal * flatRate * years) / 100;
  const flatEmi = (principal + flatInterest) / months;

  // Find the reducing rate that produces the same instalment. Bisection rather
  // than a formula because there isn't one, and because a wrong answer here is
  // the entire point of the tool.
  let low = 0;
  let high = 2; // 200% a year, far past any real quote
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    if (emiFor(principal, mid / 12, months) > flatEmi) high = mid;
    else low = mid;
  }
  const equivalent = ((low + high) / 2) * 100;

  const reducingRate = num(options, "reducingRate", 0);
  const out = [
    line("Flat rate quoted", pct(flatRate, 2)),
    line("Really costs you", pct(equivalent, 2) + " on a reducing balance"),
    line("Difference", `${pct(equivalent - flatRate, 2)} more than the quote suggests`),
    "",
    line("Monthly instalment", money(flatEmi)),
    line("Total interest", money(flatInterest)),
    line("Total repayable", money(principal + flatInterest)),
  ];

  if (reducingRate > 0) {
    const emi = emiFor(principal, reducingRate / 12 / 100, months);
    const interest = emi * months - principal;
    out.push(
      "",
      `Against a reducing-balance quote of ${pct(reducingRate, 2)}:`,
      line("  its instalment", money(emi)),
      line("  its total interest", money(interest)),
      line("  cheaper by", money(flatInterest - interest)),
      line("  better offer", interest < flatInterest ? `the ${pct(reducingRate, 2)} reducing loan` : `the ${pct(flatRate, 2)} flat loan`),
    );
  }

  return {
    output: out.join("\n"),
    stats: [
      { label: "Flat rate", value: pct(flatRate, 2) },
      { label: "Real rate", value: pct(equivalent, 2) },
      { label: "EMI", value: money(flatEmi) },
    ],
    note: "A flat rate charges interest on the whole original amount for the whole term, even though you have repaid most of it by the end. That is why the honest figure is close to double the quote.",
  };
};

export const homeLoanEligibility: FinanceOp = (_input, options): OpResult => {
  const income = positive(num(options, "income", 0), "a monthly income");
  const obligations = num(options, "obligations", 0);
  const foir = num(options, "foir", 50) / 100;
  const annualRate = num(options, "rate", 8.5);
  const years = positive(num(options, "years", 0), "a tenure");
  const ltv = num(options, "ltv", 80) / 100;

  const available = income * foir - obligations;
  if (available <= 0) {
    throw new ToolError(
      "Your existing instalments already use up the share of income a lender will lend against. Clear some of them, or raise the income figure.",
    );
  }

  const months = Math.round(years * 12);
  const monthlyRate = annualRate / 12 / 100;
  const loan = principalFor(available, monthlyRate, months);
  const property = loan / ltv;

  return {
    output: [
      line("Loan you could get", money(loan)),
      line("Instalment it carries", money(available)),
      "",
      line("Monthly income", money(income)),
      line("Existing instalments", money(obligations)),
      line("Lender's income share", `${pct(foir * 100, 0)} of income can go to instalments`),
      line("Room left for a new EMI", money(available)),
      "",
      line("Property you could buy", money(property)),
      line("  at a loan-to-value of", pct(ltv * 100, 0)),
      line("  needing a deposit of", money(property - loan)),
      "",
      line("Tenure assumed", `${years} years`),
      line("Rate assumed", pct(annualRate, 2)),
    ].join("\n"),
    stats: [
      { label: "Eligible loan", value: money(loan) },
      { label: "Max EMI", value: money(available) },
      { label: "Property", value: money(property) },
    ],
    note: "This is the arithmetic a lender starts from, not its decision. Credit history, employment type, age at the end of the tenure and the property's own valuation all move the final number, usually downwards.",
  };
};

/* ------------------------------------------------------------------ */
/* Earning and paying                                                   */
/* ------------------------------------------------------------------ */

/**
 * The financial year whose statute is encoded below.
 *
 * Slabs, the rebate, the standard deduction and the gratuity cap are law, not
 * preference, so they cannot be inputs. They can, however, go stale — so the
 * year they belong to is stated here once, shown on every result that depends
 * on it, and pinned by a test against the prose. If this file is not updated
 * after a Budget, the page says which year it is answering rather than quietly
 * answering the wrong one.
 */
export const TAX_YEAR = "FY 2025-26 (AY 2026-27)";

const NEW_REGIME_SLABS: [number, number][] = [
  [400000, 0],
  [800000, 5],
  [1200000, 10],
  [1600000, 15],
  [2000000, 20],
  [2400000, 25],
  [Infinity, 30],
];

const OLD_REGIME_SLABS: [number, number][] = [
  [250000, 0],
  [500000, 5],
  [1000000, 20],
  [Infinity, 30],
];

function taxOnSlabs(income: number, slabs: [number, number][]): { tax: number; rows: string[] } {
  let previous = 0;
  let tax = 0;
  const rows: string[] = [];
  for (const [ceiling, rate] of slabs) {
    if (income <= previous) break;
    const band = Math.min(income, ceiling) - previous;
    const due = (band * rate) / 100;
    tax += due;
    rows.push(
      `  ${money(previous).padStart(14)} to ${(ceiling === Infinity ? "above" : money(ceiling)).padStart(14)}  ${String(rate).padStart(2)}%  ${money(due).padStart(14)}`,
    );
    previous = ceiling;
  }
  return { tax, rows };
}

function surchargeRate(income: number, regime: "new" | "old"): number {
  if (income <= 5000000) return 0;
  if (income <= 10000000) return 10;
  if (income <= 20000000) return 15;
  // The new regime caps surcharge at 25%; the old one goes to 37% above 5 crore.
  if (income <= 50000000) return 25;
  return regime === "new" ? 25 : 37;
}

/**
 * The tax itself, as numbers.
 *
 * Split out from the tool because the salary calculator needs the same answer.
 * The alternative — calling the tool and parsing the figure back out of its
 * formatted output — would have made a thousand-separator the load-bearing part
 * of a tax calculation.
 */
export function computeTax(input: {
  gross: number;
  regime: "new" | "old";
  salaried: boolean;
  deductions: number;
}): {
  taxable: number;
  standard: number;
  claimed: number;
  slabTax: number;
  slabRows: string[];
  rebate: number;
  surcharge: number;
  surchargeAt: number;
  cess: number;
  total: number;
} {
  const { gross, regime, salaried, deductions } = input;

  const standard = salaried ? (regime === "new" ? 75000 : 50000) : 0;
  // The new regime allows the standard deduction and little else; chapter VI-A
  // deductions belong to the old regime, so they are ignored here rather than
  // silently applied where they do not exist.
  const claimed = regime === "old" ? deductions : 0;
  const taxable = Math.max(0, gross - standard - claimed);

  const { tax: slabTax, rows: slabRows } = taxOnSlabs(
    taxable,
    regime === "new" ? NEW_REGIME_SLABS : OLD_REGIME_SLABS,
  );

  // Section 87A: a full rebate up to a threshold, which is why a rupee over the
  // line can cost far more than a rupee. Marginal relief is not modelled.
  const rebateLimit = regime === "new" ? 1200000 : 500000;
  const rebateCap = regime === "new" ? 60000 : 12500;
  const rebate = taxable <= rebateLimit ? Math.min(slabTax, rebateCap) : 0;

  const afterRebate = Math.max(0, slabTax - rebate);
  const surchargeAt = surchargeRate(taxable, regime);
  const surcharge = (afterRebate * surchargeAt) / 100;
  const cess = (afterRebate + surcharge) * 0.04;

  return {
    taxable,
    standard,
    claimed,
    slabTax,
    slabRows,
    rebate,
    surcharge,
    surchargeAt,
    cess,
    total: afterRebate + surcharge + cess,
  };
}

export const incomeTax: FinanceOp = (_input, options): OpResult => {
  const salary = positive(num(options, "income", 0), "your gross income");
  const regime = str(options, "regime", "new") === "old" ? "old" : "new";
  const salaried = bool(options, "salaried", true);
  const deductions = num(options, "deductions", 0);
  const otherIncome = num(options, "other", 0);

  const gross = salary + otherIncome;
  const mine = computeTax({ gross, regime, salaried, deductions });
  const effective = gross > 0 ? (mine.total / gross) * 100 : 0;

  // Running the other regime is the question everyone actually has.
  const otherRegime: "new" | "old" = regime === "new" ? "old" : "new";
  const theirs = computeTax({ gross, regime: otherRegime, salaried, deductions });

  return {
    output: [
      line("Tax payable", money(mine.total)),
      line("Left after tax", money(gross - mine.total)),
      line("Effective rate", pct(effective, 2)),
      "",
      line("Gross income", money(gross)),
      line("Standard deduction", money(mine.standard)),
      regime === "old"
        ? line("Other deductions", money(mine.claimed))
        : line("Other deductions", "not available in the new regime"),
      line("Taxable income", money(mine.taxable)),
      "",
      "Slab by slab",
      ...mine.slabRows,
      "",
      line("Tax on slabs", money(mine.slabTax)),
      line("Section 87A rebate", mine.rebate > 0 ? `−${money(mine.rebate)}` : "not applicable"),
      line(
        "Surcharge",
        mine.surcharge > 0 ? `${money(mine.surcharge)} at ${pct(mine.surchargeAt, 0)}` : "none",
      ),
      line("Health and education cess", `${money(mine.cess)} at 4%`),
      line("Total", money(mine.total)),
      "",
      `The ${otherRegime} regime on the same figures`,
      line("  taxable income", money(theirs.taxable)),
      line("  tax payable", money(theirs.total)),
      line(
        "  difference",
        `${money(Math.abs(theirs.total - mine.total))} ${theirs.total < mine.total ? "cheaper" : "dearer"}`,
      ),
      line("  better for you", theirs.total < mine.total ? `the ${otherRegime} regime` : `the ${regime} regime`),
    ].join("\n"),
    stats: [
      { label: "Tax payable", value: money(mine.total) },
      { label: "Effective rate", value: pct(effective, 2) },
      { label: "Better regime", value: theirs.total < mine.total ? otherRegime : regime },
    ],
    note: `Slabs, rebate and standard deduction as enacted for ${TAX_YEAR}. This is not updated automatically after a Budget, and it does not model marginal relief, capital gains at their own rates, or any income taxed on a special basis.`,
  };
};

export const salaryBreakup: FinanceOp = (_input, options): OpResult => {
  const ctc = positive(num(options, "ctc", 0), "an annual cost to company");
  const basicPercent = num(options, "basic", 40);
  const bonusPercent = num(options, "bonus", 0);
  const professionalTax = num(options, "professionalTax", 2400);
  const regime = str(options, "regime", "new") === "old" ? "old" : "new";
  const deductions = num(options, "deductions", 0);

  const bonus = (ctc * bonusPercent) / 100;
  const fixed = ctc - bonus;
  const basic = (fixed * basicPercent) / 100;

  // The employer's provident fund share and the gratuity provision are part of
  // cost to company but never reach the bank account, which is the whole reason
  // a CTC figure and a salary figure feel like two different jobs.
  //
  // Whether the contribution is 12% of actual basic or 12% of the statutory
  // wage ceiling is an employer's choice, and both are common. It is asked
  // rather than assumed: restricting to the ceiling can change take-home by a
  // large amount at a senior salary, and guessing would put this page at odds
  // with the provident fund tool, which works on actual wages.
  const restricted = str(options, "pfBasis", "actual") === "ceiling";
  const pfWage = restricted ? Math.min(basic, 180000) : basic;
  const employerPf = pfWage * 0.12;
  const employeePf = pfWage * 0.12;
  const gratuityProvision = (basic * (15 / 26)) / 12;
  const gross = fixed - employerPf - gratuityProvision;

  // Your own PF contribution is deductible under 80C, but only in the old
  // regime — the same rule the tax function applies, so pass it and let that
  // one decide rather than deciding twice.
  const tax = computeTax({
    gross: gross + bonus,
    regime,
    salaried: true,
    deductions: deductions + employeePf,
  }).total;

  const annualTakeHome = gross + bonus - employeePf - professionalTax - tax;

  return {
    output: [
      line("Monthly in hand", money((annualTakeHome - bonus) / 12)),
      line("Annual take-home", money(annualTakeHome)),
      line("  of which bonus", money(bonus)),
      "",
      line("Cost to company", money(ctc)),
      line("Employer's PF share", `−${money(employerPf)}`),
      line("Gratuity provision", `−${money(gratuityProvision)}`),
      line("Gross salary", money(gross)),
      "",
      line("Basic pay", `${money(basic)} at ${pct(basicPercent, 0)} of fixed pay`),
      line("PF calculated on", restricted ? `the statutory ceiling of ${money(180000)}` : "actual basic pay"),
      line("Your PF contribution", `−${money(employeePf)}`),
      line("Professional tax", `−${money(professionalTax)}`),
      line("Income tax", `−${money(tax)}`),
      line("Take-home", money(annualTakeHome)),
      "",
      line("Kept as a share of CTC", pct((annualTakeHome / ctc) * 100, 1)),
      line("Regime used", `${regime}, ${TAX_YEAR}`),
    ].join("\n"),
    stats: [
      { label: "Monthly in hand", value: money((annualTakeHome - bonus) / 12) },
      { label: "Annual take-home", value: money(annualTakeHome) },
      { label: "Kept", value: pct((annualTakeHome / ctc) * 100, 1) },
    ],
    note: "Every company splits a package differently — the basic share, the allowances and whether gratuity sits inside CTC all vary. Check this against your own offer letter rather than treating it as the answer.",
  };
};


export const hra: FinanceOp = (_input, options): OpResult => {
  const basic = positive(num(options, "basic", 0), "a monthly basic pay");
  const da = num(options, "da", 0);
  const received = positive(num(options, "hra", 0), "the HRA you receive");
  const rent = num(options, "rent", 0);
  const metro = bool(options, "metro", true);

  const salary = (basic + da) * 12;
  const hraReceived = received * 12;
  const rentPaid = rent * 12;

  // The exemption is the least of three figures, which is why raising rent past
  // a point stops helping — the other two caps bind first.
  const optionA = hraReceived;
  const optionB = Math.max(0, rentPaid - salary * 0.1);
  const optionC = salary * (metro ? 0.5 : 0.4);

  const exempt = Math.max(0, Math.min(optionA, optionB, optionC));
  const taxable = hraReceived - exempt;
  const binding = exempt === optionA ? "the HRA you actually receive" : exempt === optionB ? "rent minus 10% of salary" : `${metro ? "50" : "40"}% of salary`;

  return {
    output: [
      line("Exempt from tax", money(exempt)),
      line("Taxable HRA", money(taxable)),
      line("Exempt each month", money(exempt / 12)),
      "",
      "The exemption is the least of three figures",
      line("  HRA received", money(optionA)),
      line("  Rent less 10% of salary", money(optionB)),
      line(`  ${metro ? "50" : "40"}% of salary`, money(optionC)),
      line("  Least of the three", money(exempt)),
      line("  Set by", binding),
      "",
      line("Salary for this purpose", `${money(salary)} (basic plus DA)`),
      line("Rent paid in the year", money(rentPaid)),
      line("City", metro ? "metro — Delhi, Mumbai, Kolkata or Chennai" : "non-metro"),
    ].join("\n"),
    stats: [
      { label: "Exempt", value: money(exempt) },
      { label: "Taxable", value: money(taxable) },
      { label: "Monthly", value: money(exempt / 12) },
    ],
    note: "The HRA exemption exists only in the old regime — the new regime does not allow it. Rent above one lakh a year needs the landlord's PAN, and rent paid to a spouse is routinely disallowed.",
  };
};

/** The statutory ceiling on tax-free gratuity. Statute, so it carries its year. */
export const GRATUITY_CAP = 2000000;

export const gratuity: FinanceOp = (_input, options): OpResult => {
  const salary = positive(num(options, "salary", 0), "a last drawn monthly basic plus DA");
  const years = positive(num(options, "years", 0), "the years you have served");
  const covered = bool(options, "covered", true);

  if (years < 5) {
    throw new ToolError(
      "Gratuity is payable after five years of continuous service. Below that there is nothing to work out, except where service ended in death or disablement.",
    );
  }

  // Under the Act a part-year of six months or more counts as a whole year;
  // outside it, only completed years count. That single difference moves the
  // answer by a month's pay for a lot of people.
  const countedYears = covered ? Math.round(years) : Math.floor(years);
  const raw = covered ? (15 / 26) * salary * countedYears : (15 / 30) * salary * countedYears;
  const payable = Math.min(raw, GRATUITY_CAP);

  return {
    output: [
      line("Gratuity payable", money(payable)),
      line("Before the cap", money(raw)),
      line("Statutory cap", money(GRATUITY_CAP)),
      raw > GRATUITY_CAP ? line("Capped away", money(raw - GRATUITY_CAP)) : line("Under the cap by", money(GRATUITY_CAP - raw)),
      "",
      line("Last drawn monthly pay", money(salary)),
      line("Years served", `${round(years, 2)}`),
      line("Years counted", String(countedYears)),
      line("Formula", covered ? "15/26 × pay × years" : "15/30 × pay × years"),
      line("Employer", covered ? "covered by the Payment of Gratuity Act" : "not covered by the Act"),
      "",
      covered
        ? "Under the Act a part-year of six months or more counts as a full year."
        : "Outside the Act only completed years count, and a month is taken as thirty days.",
    ].join("\n"),
    stats: [
      { label: "Gratuity", value: money(payable) },
      { label: "Years counted", value: String(countedYears) },
      { label: "Monthly pay used", value: money(salary) },
    ],
    note: `The cap of ${money(GRATUITY_CAP)} is the exempt limit for non-government employees. Anything above it is taxable as salary. Figures as at ${TAX_YEAR}.`,
  };
};

/**
 * TDS sections. Rates are statute and carry the same year stamp as the slabs;
 * thresholds move more often than rates do, which is why the rate is overridable
 * on the page and the threshold is shown rather than enforced.
 */
const TDS_SECTIONS: Record<string, { label: string; rate: number; threshold: number; note: string }> = {
  "194C": { label: "Payment to a contractor", rate: 1, threshold: 30000, note: "1% to an individual or HUF, 2% to anyone else. Per contract, or 1,00,000 in the year." },
  "194J": { label: "Professional or technical fees", rate: 10, threshold: 50000, note: "10% for professional fees, 2% for technical services and call-centre work." },
  "194H": { label: "Commission or brokerage", rate: 2, threshold: 20000, note: "Cut from 5% to 2% with effect from October 2024." },
  "194I": { label: "Rent of land or building", rate: 10, threshold: 600000, note: "10% for land, building and furniture; 2% for plant and machinery." },
  "194A": { label: "Interest other than on securities", rate: 10, threshold: 50000, note: "Banks and post offices. A higher threshold applies to senior citizens." },
  "192A": { label: "Early provident fund withdrawal", rate: 10, threshold: 50000, note: "Applies when the fund is withdrawn before five years of service." },
  "194": { label: "Dividend", rate: 10, threshold: 10000, note: "Deducted by the company before the dividend reaches you." },
  "194Q": { label: "Purchase of goods", rate: 0.1, threshold: 5000000, note: "Deducted by the buyer, on the value above the threshold." },
  "194O": { label: "E-commerce sale", rate: 0.1, threshold: 500000, note: "Deducted by the platform on the gross amount of the sale." },
};

export const tds: FinanceOp = (_input, options): OpResult => {
  const amount = positive(num(options, "amount", 0), "a payment amount");
  const section = str(options, "section", "194J");
  const override = num(options, "rate", 0);
  const hasPan = bool(options, "pan", true);

  const spec = TDS_SECTIONS[section];
  if (!spec) throw new ToolError(`No rate is held for section ${section}.`);

  // Without a PAN the rate goes to 20% or the section rate, whichever is higher.
  const base = override > 0 ? override : spec.rate;
  const rate = hasPan ? base : Math.max(20, base);

  const deducted = (amount * rate) / 100;
  const net = amount - deducted;

  return {
    output: [
      line("TDS deducted", money(deducted)),
      line("You receive", money(net)),
      line("Rate applied", pct(rate, 2)),
      "",
      line("Section", `${section} — ${spec.label}`),
      line("Payment", money(amount)),
      line("Section rate", pct(spec.rate, 2)),
      line("Threshold", `${money(spec.threshold)} before deduction starts`),
      line("PAN on file", hasPan ? "yes" : `no — rate lifted to ${pct(rate, 2)}`),
      line("Above the threshold", amount > spec.threshold ? "yes, so TDS applies" : "no, so nothing may be deductible"),
      "",
      spec.note,
    ].join("\n"),
    stats: [
      { label: "TDS", value: money(deducted) },
      { label: "You receive", value: money(net) },
      { label: "Rate", value: pct(rate, 2) },
    ],
    note: `Rates as at ${TAX_YEAR}. TDS is an advance payment of your own tax, not a separate charge — it is credited against your liability when you file. Thresholds change more often than rates, so check the current one before relying on the "no deduction" line.`,
  };
};

export const inflation: FinanceOp = (_input, options): OpResult => {
  const amount = positive(num(options, "amount", 0), "an amount");
  const rate = num(options, "rate", 6);
  const years = positive(num(options, "years", 0), "a number of years");
  const nominalReturn = num(options, "nominal", 0);

  const future = amount * (1 + rate / 100) ** years;
  const purchasingPower = amount / (1 + rate / 100) ** years;

  const out = [
    line("Will cost", money(future)),
    line("Costs today", money(amount)),
    line("Increase", `${money(future - amount)} (${pct(((future - amount) / amount) * 100, 1)})`),
    "",
    line("Today's money then buys", money(purchasingPower)),
    line("Value lost", `${pct((1 - purchasingPower / amount) * 100, 1)} of what it buys now`),
    line("Over", `${round(years, 2)} years at ${pct(rate, 2)}`),
  ];

  if (nominalReturn > 0) {
    // The Fisher relation, not nominal minus inflation — the subtraction is a
    // decent approximation at low rates and drifts badly at high ones.
    const real = ((1 + nominalReturn / 100) / (1 + rate / 100) - 1) * 100;
    out.push(
      "",
      line("Your return", pct(nominalReturn, 2)),
      line("Real return", pct(real, 2)),
      line("Rough subtraction gives", pct(nominalReturn - rate, 2)),
      line("Which is out by", pct(Math.abs(nominalReturn - rate - real), 3)),
      line("Real value of the amount", money(amount * (1 + real / 100) ** years)),
    );
  }

  return {
    output: out.join("\n"),
    stats: [
      { label: "Future cost", value: money(future) },
      { label: "Today's money buys", value: money(purchasingPower) },
      { label: "Rise", value: pct(((future - amount) / amount) * 100, 1) },
    ],
    note: "Headline inflation is an average across a basket you may not buy. Education and healthcare have run well ahead of it in India for years, so a school-fee or hospital projection deserves a higher rate than a grocery one.",
  };
};

export const retirement: FinanceOp = (_input, options): OpResult => {
  const age = num(options, "age", 30);
  const retireAt = num(options, "retireAt", 60);
  const until = num(options, "until", 85);
  const monthlyExpense = positive(num(options, "expense", 0), "your monthly expense today");
  const inflationRate = num(options, "inflation", 6) / 100;
  const preReturn = num(options, "preReturn", 12) / 100;
  const postReturn = num(options, "postReturn", 7) / 100;
  const existing = num(options, "existing", 0);

  const yearsToRetire = retireAt - age;
  const yearsInRetirement = until - retireAt;
  if (yearsToRetire <= 0) throw new ToolError("Your retirement age has to be later than your current age.");
  if (yearsInRetirement <= 0) throw new ToolError("Set an age to plan until that is later than the retirement age.");

  const expenseAtRetirement = monthlyExpense * (1 + inflationRate) ** yearsToRetire;

  // The corpus has to survive a rising expense against a return that outpaces
  // it only slightly, so the annuity uses the real rate rather than the
  // nominal one. Using the nominal rate is the classic way these tools
  // understate the corpus by a third or more.
  const realRate = (1 + postReturn) / (1 + inflationRate) - 1;
  const monthsInRetirement = yearsInRetirement * 12;
  const monthlyReal = (1 + realRate) ** (1 / 12) - 1;

  const corpus =
    monthlyReal === 0
      ? expenseAtRetirement * monthsInRetirement
      : expenseAtRetirement * ((1 - (1 + monthlyReal) ** -monthsInRetirement) / monthlyReal) * (1 + monthlyReal);

  const monthsToRetire = yearsToRetire * 12;
  const preMonthly = (1 + preReturn) ** (1 / 12) - 1;
  const existingGrows = existing * (1 + preMonthly) ** monthsToRetire;
  const shortfall = Math.max(0, corpus - existingGrows);
  const sip = shortfall / annuityDueValue(1, preMonthly, monthsToRetire);

  return {
    output: [
      line("Corpus you will need", money(corpus)),
      line("Invest each month", money(sip)),
      "",
      line("Expense today", `${money(monthlyExpense)} a month`),
      line("Same expense at 60", `${money(expenseAtRetirement)} a month`),
      line("  inflated at", pct(inflationRate * 100, 2)),
      "",
      line("Years to build it", String(yearsToRetire)),
      line("Years it must last", String(yearsInRetirement)),
      line("Return while building", pct(preReturn * 100, 2)),
      line("Return in retirement", pct(postReturn * 100, 2)),
      line("Real return in retirement", pct(realRate * 100, 2)),
      "",
      line("Already saved", money(existing)),
      line("  which grows to", money(existingGrows)),
      line("Still to fund", money(shortfall)),
      line("Total you will pay in", money(sip * monthsToRetire)),
    ].join("\n"),
    stats: [
      { label: "Corpus needed", value: money(corpus) },
      { label: "Monthly SIP", value: money(sip) },
      { label: "Expense at 60", value: money(expenseAtRetirement) },
    ],
    note: "The corpus is built to run to zero at the age you set. Living longer than that is the risk this plan does not cover, and it is the reason many people target a corpus that never depletes instead.",
  };
};

/* ------------------------------------------------------------------ */
/* Trading                                                              */
/* ------------------------------------------------------------------ */

export const brokerage: FinanceOp = (_input, options): OpResult => {
  const buy = positive(num(options, "buy", 0), "a buy price");
  const sell = positive(num(options, "sell", 0), "a sell price");
  const quantity = positive(num(options, "quantity", 0), "a quantity");
  const segment = str(options, "segment", "delivery");
  const brokeragePercent = num(options, "brokerage", 0);
  const brokerageCap = num(options, "cap", 20);

  const buyValue = buy * quantity;
  const sellValue = sell * quantity;
  const turnover = buyValue + sellValue;

  const perSide = (value: number) =>
    brokeragePercent === 0 ? 0 : Math.min((value * brokeragePercent) / 100, brokerageCap);
  const brokerageTotal = perSide(buyValue) + perSide(sellValue);

  // Statutory charges, each shown as its own line so every one can be checked
  // against a real contract note rather than taken on trust.
  const stt = segment === "delivery" ? turnover * 0.001 : sellValue * 0.00025;
  const exchange = turnover * 0.0000297;
  const sebi = turnover * 0.000001;
  const stamp = segment === "delivery" ? buyValue * 0.00015 : buyValue * 0.00003;
  const gst = (brokerageTotal + exchange + sebi) * 0.18;
  const dp = segment === "delivery" ? 15.93 : 0;

  const charges = brokerageTotal + stt + exchange + sebi + stamp + gst + dp;
  const gross = sellValue - buyValue;
  const net = gross - charges;
  const breakeven = charges / quantity;

  return {
    output: [
      line("Net profit or loss", money(net)),
      line("Gross profit or loss", money(gross)),
      line("Total charges", money(charges)),
      line("Break-even move", `${money(breakeven)} a share`),
      "",
      line("Bought", `${quantity} at ${money(buy)} = ${money(buyValue)}`),
      line("Sold", `${quantity} at ${money(sell)} = ${money(sellValue)}`),
      line("Turnover", money(turnover)),
      line("Segment", segment === "delivery" ? "equity delivery" : "equity intraday"),
      "",
      "Charge                     Amount",
      `  Brokerage              ${money(brokerageTotal).padStart(12)}`,
      `  Securities transaction ${money(stt).padStart(12)}`,
      `  Exchange transaction   ${money(exchange).padStart(12)}`,
      `  SEBI turnover          ${money(sebi).padStart(12)}`,
      `  Stamp duty             ${money(stamp).padStart(12)}`,
      `  GST at 18%             ${money(gst).padStart(12)}`,
      `  Depository             ${money(dp).padStart(12)}`,
      `  Total                  ${money(charges).padStart(12)}`,
      "",
      line("Charges as a share", `${pct((charges / turnover) * 100, 3)} of turnover`),
    ].join("\n"),
    stats: [
      { label: "Net P&L", value: money(net) },
      { label: "Charges", value: money(charges) },
      { label: "Break-even", value: money(breakeven) },
    ],
    note: `Statutory rates as at ${TAX_YEAR}, on NSE equity. They are re-notified from time to time and your broker's own charges differ — every line is shown separately so you can check it against a real contract note. Set your brokerage to zero for a discount broker's delivery trade.`,
  };
};
