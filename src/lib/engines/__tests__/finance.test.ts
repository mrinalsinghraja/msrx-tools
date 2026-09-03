import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  brokerage,
  homeLoanEmi,
  cagr,
  computeTax,
  emiFor,
  fixedDeposit,
  flatVsReducing,
  goalSip,
  gratuity,
  homeLoanEligibility,
  hra,
  incomeTax,
  inflation,
  loanPrepayment,
  lumpsum,
  nps,
  postOfficeMis,
  ppf,
  principalFor,
  recurringDeposit,
  retirement,
  salaryBreakup,
  simpleInterest,
  solveXirr,
  stepUpSip,
  stockAverage,
  sukanyaSamriddhi,
  swp,
  TAX_YEAR,
  tds,
  xirr,
} from "../pure/finance";
import { ToolError } from "../types";

/**
 * Money maths is the one place on this site where a plausible wrong answer is
 * worse than a crash, so these tests avoid the trap of asserting that the code
 * agrees with itself.
 *
 * Where a figure is externally known — the zero-tax salary under the new
 * regime, a gratuity of fifteen twenty-sixths, an effective rate on quarterly
 * compounding — it is asserted against that figure. Where it is not, the
 * expected value is recomputed inside the test from the formula rather than
 * borrowed from the implementation.
 */

/** Pull a number back out of a result line, so assertions can be exact. */
function figure(output: string, label: string): number {
  const row = output.split("\n").find((l) => l.trim().startsWith(label));
  if (!row) throw new Error(`No line starting "${label}" in:\n${output}`);
  const match = row.slice(label.length).match(/-?[\d,]+\.?\d*/);
  if (!match) throw new Error(`No number on line: ${row}`);
  return Number(match[0].replace(/,/g, ""));
}

describe("instalment arithmetic", () => {
  it("matches the standard EMI formula on a known loan", () => {
    // 10,00,000 at 8.5% over 20 years is quoted at 8,678 by every lender.
    const emi = emiFor(1000000, 0.085 / 12, 240);
    expect(emi).toBeGreaterThan(8677);
    expect(emi).toBeLessThan(8679);
  });

  it("divides evenly when the rate is zero", () => {
    expect(emiFor(120000, 0, 12)).toBe(10000);
  });

  it("inverts itself — the loan an instalment carries returns the principal", () => {
    const principal = 2500000;
    const emi = emiFor(principal, 0.085 / 12, 240);
    expect(principalFor(emi, 0.085 / 12, 240)).toBeCloseTo(principal, 4);
  });
});

describe("income tax", () => {
  it("charges nothing on a 12,75,000 salary in the new regime", () => {
    // The widely published consequence of a 75,000 standard deduction and a
    // full rebate at 12,00,000 of taxable income.
    const result = computeTax({ gross: 1275000, regime: "new", salaried: true, deductions: 0 });
    expect(result.taxable).toBe(1200000);
    expect(result.total).toBe(0);
  });

  it("applies each slab only to the income inside it", () => {
    // 12,00,000 taxable: nil to 4L, 5% on the next 4L, 10% on the next 4L.
    const result = computeTax({ gross: 1200000, regime: "new", salaried: false, deductions: 0 });
    expect(result.slabTax).toBe(0 + 400000 * 0.05 + 400000 * 0.1);
  });

  it("adds the 4% cess on top of the slab tax", () => {
    const result = computeTax({ gross: 1600000, regime: "new", salaried: false, deductions: 0 });
    // 20,000 + 40,000 + 60,000 = 1,20,000, no rebate at this level.
    expect(result.slabTax).toBe(120000);
    expect(result.rebate).toBe(0);
    expect(result.total).toBeCloseTo(120000 * 1.04, 6);
  });

  it("ignores chapter VI-A deductions in the new regime and honours them in the old", () => {
    const newer = computeTax({ gross: 1500000, regime: "new", salaried: true, deductions: 150000 });
    const older = computeTax({ gross: 1500000, regime: "old", salaried: true, deductions: 150000 });
    expect(newer.claimed).toBe(0);
    expect(older.claimed).toBe(150000);
  });

  it("names the cheaper regime rather than assuming one", () => {
    const result = incomeTax("", { income: 800000, regime: "new", salaried: true, deductions: 0, other: 0 });
    expect(result.stats?.[2].value).toBe("new");
  });

  it("stamps the financial year it encodes on every result", () => {
    const result = incomeTax("", { income: 1500000, regime: "new", salaried: true, deductions: 0, other: 0 });
    expect(result.note).toContain(TAX_YEAR);
  });
});

describe("gratuity", () => {
  it("pays fifteen twenty-sixths of a month for each year under the Act", () => {
    const result = gratuity("", { salary: 60000, years: 10, covered: true });
    expect(figure(result.output, "Gratuity payable")).toBeCloseTo((15 / 26) * 60000 * 10, 2);
  });

  it("rounds a part-year of six months up, but only under the Act", () => {
    const inside = gratuity("", { salary: 60000, years: 10.6, covered: true });
    const outside = gratuity("", { salary: 60000, years: 10.6, covered: false });
    expect(figure(inside.output, "Years counted")).toBe(11);
    expect(figure(outside.output, "Years counted")).toBe(10);
  });

  it("caps the payable amount at the statutory ceiling", () => {
    const result = gratuity("", { salary: 500000, years: 30, covered: true });
    expect(figure(result.output, "Gratuity payable")).toBe(2000000);
    expect(figure(result.output, "Before the cap")).toBeGreaterThan(2000000);
  });

  it("refuses below five years rather than returning a figure nobody can claim", () => {
    expect(() => gratuity("", { salary: 60000, years: 4, covered: true })).toThrow(ToolError);
  });
});

describe("house rent allowance", () => {
  it("takes the least of the three figures", () => {
    // basic 50,000 → salary 6,00,000. Received 3,00,000; rent less 10% is
    // 2,40,000; half of salary is 3,00,000. The middle one binds.
    const result = hra("", { basic: 50000, da: 0, hra: 25000, rent: 25000, metro: true });
    expect(figure(result.output, "Exempt from tax")).toBe(240000);
  });

  it("uses 40% outside the metros, which can change which figure binds", () => {
    const metro = hra("", { basic: 100000, da: 0, hra: 60000, rent: 60000, metro: true });
    const other = hra("", { basic: 100000, da: 0, hra: 60000, rent: 60000, metro: false });
    expect(figure(metro.output, "Exempt from tax")).toBe(600000);
    expect(figure(other.output, "Exempt from tax")).toBe(480000);
  });

  it("exempts nothing when no rent is paid", () => {
    const result = hra("", { basic: 50000, da: 0, hra: 25000, rent: 0, metro: true });
    expect(figure(result.output, "Exempt from tax")).toBe(0);
  });
});

describe("returns", () => {
  it("computes CAGR as the rate that doubles money over the period", () => {
    const result = cagr("", { start: 100000, end: 200000, years: 10 });
    // 2^(1/10) − 1 = 7.1773%
    expect(figure(result.output, "CAGR")).toBeCloseTo(7.18, 1);
  });

  it("solves XIRR on a single year to the rate that produced it", () => {
    // 2024 has 366 days, so a 10% gain over the calendar year annualises
    // marginally below 10% on a 365-day basis.
    const rate = solveXirr([
      { date: new Date("2024-01-01"), amount: -10000 },
      { date: new Date("2025-01-01"), amount: 11000 },
    ]);
    const days = (new Date("2025-01-01").getTime() - new Date("2024-01-01").getTime()) / 86400000;
    expect(rate).toBeCloseTo(1.1 ** (365 / days) - 1, 8);
  });

  it("solves XIRR on flows that Newton's method alone would not settle", () => {
    const rate = solveXirr([
      { date: new Date("2020-01-01"), amount: -100000 },
      { date: new Date("2020-06-01"), amount: -50000 },
      { date: new Date("2021-03-01"), amount: 40000 },
      { date: new Date("2024-01-01"), amount: 180000 },
    ]);
    // Verified by substitution: the flows must discount to zero at this rate.
    const npv = [
      [-100000, "2020-01-01"],
      [-50000, "2020-06-01"],
      [40000, "2021-03-01"],
      [180000, "2024-01-01"],
    ].reduce((sum, [amount, date]) => {
      const years =
        (new Date(date as string).getTime() - new Date("2020-01-01").getTime()) / (365 * 86400000);
      return sum + (amount as number) / (1 + rate) ** years;
    }, 0);
    expect(Math.abs(npv)).toBeLessThan(0.01);
  });

  it("refuses flows that cannot have a rate", () => {
    expect(() =>
      xirr("2024-01-01, -1000\n2025-01-01, -2000", {}),
    ).toThrow(ToolError);
  });

  it("weights a stock average by quantity, not by price", () => {
    const result = stockAverage("10, 1000\n90, 100", {});
    // 10,000 + 9,000 over 100 shares = 190, not the 550 a naive average gives.
    expect(figure(result.output, "Average price")).toBe(190);
  });
});

describe("projections", () => {
  it("grows a lump sum at the compound rate", () => {
    const result = lumpsum("", { amount: 100000, rate: 12, years: 10, schedule: false });
    expect(figure(result.output, "Value at the end")).toBeCloseTo(100000 * 1.12 ** 10, 2);
  });

  it("beats a flat instalment with a step-up, and says by how much", () => {
    const result = stepUpSip("", { monthly: 10000, stepUp: 10, rate: 12, years: 15, schedule: false });
    const stepped = figure(result.output, "Final value");
    const flat = figure(result.output, "Without the step-up");
    expect(stepped).toBeGreaterThan(flat);
    // Recomputed here as an annuity due rather than read from the engine.
    const r = 0.12 / 12;
    expect(flat).toBeCloseTo(10000 * ((1 + r) ** 180 - 1) / r * (1 + r), 2);
  });

  it("subtracts what is already invested before sizing a goal instalment", () => {
    const bare = goalSip("", { target: 5000000, rate: 12, years: 10, existing: 0 });
    const funded = goalSip("", { target: 5000000, rate: 12, years: 10, existing: 500000 });
    expect(figure(funded.output, "Invest each month")).toBeLessThan(
      figure(bare.output, "Invest each month"),
    );
    const r = 0.12 / 12;
    expect(figure(funded.output, "which grows to")).toBeCloseTo(500000 * (1 + r) ** 120, 2);
  });

  it("reports the month a withdrawal plan runs out", () => {
    const result = swp("", { corpus: 1000000, withdrawal: 50000, rate: 8, years: 25, escalate: 0, schedule: false });
    const ran = result.output.split("\n").find((l) => l.startsWith("Ran out after"));
    expect(ran).toBeDefined();
    expect(result.note).toContain("ran out");
  });

  it("leaves a corpus intact when the draw is below what it earns", () => {
    const result = swp("", { corpus: 10000000, withdrawal: 20000, rate: 8, years: 20, escalate: 0, schedule: false });
    expect(figure(result.output, "Balance at the end")).toBeGreaterThan(10000000);
  });

  it("shows simple interest below the compound figure over a long term", () => {
    const result = simpleInterest("", { principal: 100000, rate: 8, years: 15 });
    expect(figure(result.output, "Interest")).toBe(120000);
    expect(figure(result.output, "If it compounded yearly")).toBeCloseTo(100000 * 1.08 ** 15 - 100000, 2);
  });
});

describe("deposits and schemes", () => {
  it("states the effective rate of quarterly compounding", () => {
    const result = fixedDeposit("", { principal: 100000, rate: 7, years: 1, frequency: 4, payout: "cumulative", tax: 0 });
    // (1 + 0.07/4)^4 − 1 = 7.1859%
    expect(figure(result.output, "Effective annual rate")).toBeCloseTo(7.186, 2);
  });

  it("stops compounding when the interest is paid out", () => {
    const cumulative = fixedDeposit("", { principal: 100000, rate: 7, years: 5, frequency: 4, payout: "cumulative", tax: 0 });
    const payout = fixedDeposit("", { principal: 100000, rate: 7, years: 5, frequency: 4, payout: "payout", tax: 0 });
    expect(figure(payout.output, "Interest earned")).toBe(35000);
    expect(figure(cumulative.output, "Interest earned")).toBeGreaterThan(35000);
  });

  it("earns a recurring deposit less than a lump sum of the same total", () => {
    const rd = recurringDeposit("", { monthly: 5000, rate: 6.75, months: 60 });
    const deposited = figure(rd.output, "Total deposited");
    expect(deposited).toBe(300000);
    // Each instalment earns for part of the term, so the interest must be well
    // under what the whole sum would earn if it had been there from month one.
    expect(figure(rd.output, "Interest earned")).toBeLessThan(300000 * (1.0675 ** 5 - 1));
  });

  it("matches the published PPF maturity within a rounding band", () => {
    const result = ppf("", { yearly: 150000, rate: 7.1, years: 15, schedule: false });
    const maturity = figure(result.output, "Maturity value");
    // Commonly published as roughly 40.68 lakh for a fully funded account.
    expect(maturity).toBeGreaterThan(4050000);
    expect(maturity).toBeLessThan(4080000);
    expect(figure(result.output, "Total deposited")).toBe(2250000);
  });

  it("refuses a PPF deposit above the annual ceiling", () => {
    expect(() => ppf("", { yearly: 200000, rate: 7.1, years: 15 })).toThrow(ToolError);
  });

  it("keeps compounding a Sukanya account for six years after the deposits stop", () => {
    const result = sukanyaSamriddhi("", { yearly: 150000, rate: 8.2, age: 5, schedule: false });
    expect(figure(result.output, "Total deposited")).toBe(150000 * 15);
    // Fifteen years of deposits, twenty-one years of compounding.
    const fifteen = 150000 * ((1.082 ** 15 - 1) / 0.082) * 1.082;
    expect(figure(result.output, "Maturity value")).toBeCloseTo(fifteen * 1.082 ** 6, 0);
  });

  it("applies the right monthly income cap for a joint post office account", () => {
    expect(() => postOfficeMis("", { deposit: 1200000, rate: 7.4, holding: "single", years: 5 })).toThrow(ToolError);
    const joint = postOfficeMis("", { deposit: 1200000, rate: 7.4, holding: "joint", years: 5 });
    expect(figure(joint.output, "Monthly income")).toBeCloseTo((1200000 * 0.074) / 12, 2);
  });

  it("splits an NPS corpus and refuses an annuity share below the floor", () => {
    const result = nps("", { monthly: 5000, age: 30, retireAt: 60, rate: 10, annuityShare: 40, annuityRate: 6 });
    const corpus = figure(result.output, "Corpus at retirement");
    expect(figure(result.output, "Tax-free lump sum")).toBeCloseTo(corpus * 0.6, 1);
    expect(figure(result.output, "Monthly pension")).toBeCloseTo((corpus * 0.4 * 0.06) / 12, 1);
    expect(() =>
      nps("", { monthly: 5000, age: 30, retireAt: 60, rate: 10, annuityShare: 20, annuityRate: 6 }),
    ).toThrow(ToolError);
  });
});

describe("borrowing", () => {
  it("converts a flat rate to the reducing rate that produces the same instalment", () => {
    const result = flatVsReducing("", { principal: 500000, flatRate: 7, years: 5, reducingRate: 0 });
    const emi = figure(result.output, "Monthly instalment");
    expect(emi).toBeCloseTo((500000 + 500000 * 0.07 * 5) / 60, 2);

    const equivalent = figure(result.output, "Really costs you");
    // The rate found must reproduce the instalment it was solved for. The
    // printed rate is rounded to two decimals, as rates are quoted, and on this
    // loan a hundredth of a per cent is worth about a rupee of instalment — so
    // the tolerance is the rounding, not slack in the solver.
    expect(emiFor(500000, equivalent / 100 / 12, 60)).toBeCloseTo(emi, -0.5);
    expect(Math.abs(emiFor(500000, equivalent / 100 / 12, 60) - emi)).toBeLessThan(2);
    // And a flat rate always costs materially more than it says.
    expect(equivalent).toBeGreaterThan(7 * 1.7);
  });

  it("saves more by shortening the tenure than by cutting the instalment", () => {
    const base = { principal: 5000000, rate: 8.5, years: 20, lump: 500000, after: 24, extra: 0 };
    const shorter = loanPrepayment("", { ...base, keep: "tenure" });
    const smaller = loanPrepayment("", { ...base, keep: "emi" });
    expect(figure(shorter.output, "Interest saved")).toBeGreaterThan(
      figure(smaller.output, "Interest saved"),
    );
    expect(figure(smaller.output, "Months saved")).toBe(0);
  });

  it("saves more from an early part payment than a late one", () => {
    const base = { principal: 5000000, rate: 8.5, years: 20, lump: 500000, extra: 0, keep: "tenure" };
    const early = loanPrepayment("", { ...base, after: 12 });
    const late = loanPrepayment("", { ...base, after: 180 });
    expect(figure(early.output, "Interest saved")).toBeGreaterThan(figure(late.output, "Interest saved"));
  });

  it("refuses a prepayment run with nothing prepaid", () => {
    expect(() =>
      loanPrepayment("", { principal: 100000, rate: 9, years: 5, lump: 0, after: 12, extra: 0, keep: "tenure" }),
    ).toThrow(ToolError);
  });

  it("says in prose what the home loan tool actually prints about year one", () => {
    // This page claimed "something like ninety-five per cent" until a browser
    // sweep read its own default output and found 80.9%. A page contradicted by
    // the tool sitting above it is worse than a page with no figure at all, so
    // the claim is pinned to the arithmetic here.
    const share = (years: number) => {
      const result = homeLoanEmi("", { price: 8000000, down: 20, rate: 8.5, years, schedule: false });
      const interest = figure(result.output, "First year interest");
      const principal = figure(result.output, "First year principal");
      return (interest / (interest + principal)) * 100;
    };

    expect(share(20)).toBeGreaterThan(78);
    expect(share(20)).toBeLessThan(82);
    expect(share(30)).toBeGreaterThan(90);
    expect(share(30)).toBeLessThan(95);

    const prose = readFileSync(join(process.cwd(), "src/content/tools/finance.ts"), "utf8");
    const intro = prose.slice(prose.indexOf('"home-loan-emi-calculator"'));
    expect(intro).toContain("roughly four-fifths");
    expect(intro).toContain("passes ninety per cent");
    expect(intro).not.toContain("ninety-five per cent");
  });

  it("sizes eligibility from the instalment the income can carry", () => {
    const result = homeLoanEligibility("", {
      income: 150000, obligations: 0, foir: 50, rate: 8.5, years: 20, ltv: 80,
    });
    expect(figure(result.output, "Instalment it carries")).toBe(75000);
    expect(figure(result.output, "Loan you could get")).toBeCloseTo(
      principalFor(75000, 0.085 / 12, 240), 2,
    );
  });

  it("lets an existing instalment cost many times its own size in eligibility", () => {
    const clear = homeLoanEligibility("", { income: 150000, obligations: 0, foir: 50, rate: 8.5, years: 20, ltv: 80 });
    const owing = homeLoanEligibility("", { income: 150000, obligations: 20000, foir: 50, rate: 8.5, years: 20, ltv: 80 });
    const lost = figure(clear.output, "Loan you could get") - figure(owing.output, "Loan you could get");
    expect(lost).toBeGreaterThan(20000 * 50);
  });

  it("refuses when existing instalments already use the allowance", () => {
    expect(() =>
      homeLoanEligibility("", { income: 100000, obligations: 60000, foir: 50, rate: 8.5, years: 20, ltv: 80 }),
    ).toThrow(ToolError);
  });
});

describe("salary and deductions", () => {
  it("keeps take-home below the cost to company by the employer's own costs", () => {
    const result = salaryBreakup("", {
      ctc: 1800000, basic: 40, bonus: 0, professionalTax: 2400, regime: "new", deductions: 0,
      pfBasis: "actual",
    });
    const takeHome = figure(result.output, "Annual take-home");
    expect(takeHome).toBeLessThan(1800000);
    // Basic is 40% of fixed pay; both provident fund shares are 12% of that.
    expect(figure(result.output, "Employer's PF share")).toBeCloseTo(1800000 * 0.4 * 0.12, 2);
  });

  it("agrees with the provident fund tool about the contribution basis", () => {
    // Two pages disagreeing about the same statutory contribution would be
    // worse than either being wrong on its own, so the basis is an input.
    const actual = salaryBreakup("", {
      ctc: 1800000, basic: 40, bonus: 0, professionalTax: 2400, regime: "new", deductions: 0,
      pfBasis: "actual",
    });
    const ceiling = salaryBreakup("", {
      ctc: 1800000, basic: 40, bonus: 0, professionalTax: 2400, regime: "new", deductions: 0,
      pfBasis: "ceiling",
    });
    expect(figure(ceiling.output, "Employer's PF share")).toBe(180000 * 0.12);
    expect(figure(actual.output, "Employer's PF share")).toBeGreaterThan(
      figure(ceiling.output, "Employer's PF share"),
    );
  });

  it("applies the section rate and lifts it when no PAN is on file", () => {
    const withPan = tds("", { amount: 100000, section: "194J", rate: 0, pan: true });
    const without = tds("", { amount: 100000, section: "194J", rate: 0, pan: false });
    expect(figure(withPan.output, "TDS deducted")).toBe(10000);
    expect(figure(without.output, "TDS deducted")).toBe(20000);
  });

  it("lifts a low section rate to twenty per cent without a PAN", () => {
    const result = tds("", { amount: 1000000, section: "194Q", rate: 0, pan: false });
    expect(figure(result.output, "Rate applied")).toBe(20);
  });

  it("rejects a section it holds no rate for", () => {
    expect(() => tds("", { amount: 100000, section: "194ZZ", rate: 0, pan: true })).toThrow(ToolError);
  });
});

describe("inflation and retirement", () => {
  it("uses the Fisher relation for the real return, not subtraction", () => {
    const result = inflation("", { amount: 100000, rate: 6, years: 10, nominal: 12 });
    // (1.12 / 1.06) − 1 = 5.6604%, not 6%.
    expect(figure(result.output, "Real return")).toBeCloseTo(5.66, 2);
    expect(figure(result.output, "Rough subtraction gives")).toBe(6);
  });

  it("inflates a cost and deflates purchasing power symmetrically", () => {
    const result = inflation("", { amount: 100000, rate: 6, years: 10, nominal: 0 });
    expect(figure(result.output, "Will cost")).toBeCloseTo(100000 * 1.06 ** 10, 2);
    expect(figure(result.output, "Today's money then buys")).toBeCloseTo(100000 / 1.06 ** 10, 2);
  });

  it("sizes a retirement corpus on the real rate, so it exceeds a nominal estimate", () => {
    const result = retirement("", {
      age: 30, retireAt: 60, until: 85, expense: 60000,
      inflation: 6, preReturn: 12, postReturn: 7, existing: 0,
    });
    const corpus = figure(result.output, "Corpus you will need");
    const atRetirement = figure(result.output, "Same expense at 60");
    expect(atRetirement).toBeCloseTo(60000 * 1.06 ** 30, 2);

    // Discounting the same withdrawals at the nominal 7% would understate the
    // corpus badly. That understatement is the bug this models around.
    const nominalMonthly = 1.07 ** (1 / 12) - 1;
    const nominalCorpus =
      atRetirement * ((1 - (1 + nominalMonthly) ** -300) / nominalMonthly) * (1 + nominalMonthly);
    expect(corpus).toBeGreaterThan(nominalCorpus * 1.3);
  });

  it("refuses a plan that ends before it starts", () => {
    expect(() =>
      retirement("", { age: 60, retireAt: 60, until: 85, expense: 60000, inflation: 6, preReturn: 12, postReturn: 7, existing: 0 }),
    ).toThrow(ToolError);
  });
});

describe("trading charges", () => {
  it("charges the transaction tax on both sides of a delivery trade and one side of an intraday one", () => {
    const shared = { buy: 100, sell: 110, quantity: 100, brokerage: 0, cap: 20 };
    const delivery = brokerage("", { ...shared, segment: "delivery" });
    const intraday = brokerage("", { ...shared, segment: "intraday" });

    const sttDelivery = Number(
      delivery.output.split("\n").find((l) => l.includes("Securities transaction"))!.match(/[\d,]+\.\d+/)![0].replace(/,/g, ""),
    );
    const sttIntraday = Number(
      intraday.output.split("\n").find((l) => l.includes("Securities transaction"))!.match(/[\d,]+\.\d+/)![0].replace(/,/g, ""),
    );

    expect(sttDelivery).toBeCloseTo((100 * 100 + 110 * 100) * 0.001, 4);
    expect(sttIntraday).toBeCloseTo(110 * 100 * 0.00025, 4);
    expect(sttIntraday).toBeLessThan(sttDelivery);
  });

  it("reports a break-even move that covers every charge", () => {
    const result = brokerage("", { buy: 100, sell: 110, quantity: 100, segment: "delivery", brokerage: 0, cap: 20 });
    const charges = figure(result.output, "Total charges");
    expect(figure(result.output, "Break-even move")).toBeCloseTo(charges / 100, 2);
    expect(figure(result.output, "Net profit or loss")).toBeCloseTo(1000 - charges, 2);
  });

  it("caps a percentage brokerage per side", () => {
    const result = brokerage("", { buy: 1000, sell: 1100, quantity: 1000, segment: "intraday", brokerage: 0.03, cap: 20 });
    const line = result.output.split("\n").find((l) => l.includes("Brokerage"))!;
    // 0.03% of 10,00,000 is 300 a side, so the cap of 20 binds on both.
    expect(Number(line.match(/[\d,]+\.\d+/)![0].replace(/,/g, ""))).toBe(40);
  });
});
