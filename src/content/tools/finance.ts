import type { ToolContent } from "@/lib/tools/types";

/**
 * SEO prose for the Financial Calculators. Server-only.
 *
 * Four entries here (SIP, EMI, compound interest and GST) moved across from the
 * Calculators & Generators file when this category was created. Their text is
 * unchanged — the tools did not change, only where they live.
 */
export const FINANCE_CONTENT: Record<string, ToolContent> = {

  "loan-emi-calculator": {
    intro: `An EMI is the fixed amount you pay every month on a loan until it is repaid. The figure comes from the standard amortisation formula, and knowing it before you sign is the difference between a decision and a hope.

This calculates the monthly instalment from the principal, the interest rate and the term, and shows the total interest — which is generally the number that changes people's minds.

The amortisation split is worth understanding because it explains a lot of confusion about home loans. Every instalment covers interest on the outstanding balance first, and only the remainder reduces the principal. Early in a long loan the balance is large, so most of the payment is interest and the debt barely moves. On a twenty-year loan at nine per cent, roughly three-quarters of the first year's payments are interest. That reverses gradually, and the last years are almost entirely principal.

That structure is why prepayment early is so much more effective than prepayment late. A lump sum in year two removes principal that would have accrued interest for eighteen more years; the same amount in year eighteen saves two years of interest on a small balance. If you can prepay, prepay early.

Change the term and watch what happens. Extending a loan reduces the monthly figure and increases the total substantially, because interest accrues for longer on a balance that reduces more slowly. A cheaper month is not a cheaper loan, and the total interest figure is where that becomes visible.

Compare offers on the effective annual rate rather than the headline, since processing fees and insurance requirements change the real cost.`,
    steps: [
      "Enter the loan amount, the annual interest rate and the term in years.",
      "Read the monthly instalment, and then the total interest, which is the figure worth reacting to.",
      "Try a shorter term to see how much a higher monthly payment saves overall.",
      "Compare lenders on total cost including fees, not on the advertised rate alone.",
    ],
    faq: [
      {
        q: "Why is so much of my early payment going to interest?",
        a: "Because interest is charged on the outstanding balance, which is at its largest at the start. The split reverses over the life of the loan, and by the final years almost the whole instalment is reducing principal.",
      },
      {
        q: "Does prepaying early really help that much?",
        a: "Yes, disproportionately. Principal removed in year two would otherwise have accrued interest for the remaining eighteen years. The same amount paid in year eighteen saves interest on a small balance for two.",
      },
      {
        q: "Should I choose a longer term for a lower payment?",
        a: "Only if the monthly figure is genuinely unaffordable otherwise. A longer term costs considerably more in total, because a slower-reducing balance accrues interest for longer. The total interest figure shows the trade plainly.",
      },
      {
        q: "Is this exactly what my bank will charge?",
        a: "It is the standard amortisation calculation, so the instalment should match closely. Processing fees, insurance and any difference in how the bank rounds or compounds will move the real figure slightly.",
      },
    ],
  },

  "sip-calculator": {
    intro: `A systematic investment plan puts a fixed amount into a fund every month. This projects what a series of those contributions could grow to, given an assumed annual return.

The arithmetic is a future value calculation over a series of payments: each contribution compounds for the time remaining, so the first one has the full term to grow and the last one has none. That structure is why the total contributed and the projected value diverge so dramatically over long periods — and why the divergence is almost entirely in the final years.

Look at the difference between a fifteen-year and a twenty-year projection at the same monthly amount. The extra five years of contributions are a third more money in, and the projected value typically rises by considerably more than a third, because the early contributions have had five more years to compound. Time in the market is doing more work than the amount invested, which is the single most useful thing a projection like this can show.

The assumed return is the number that deserves scepticism. Twelve per cent is a common figure for Indian equity projections and is roughly what broad indices have averaged over long periods, but the average conceals the path: real returns arrive as several bad years and several extraordinary ones, and a plan that only works if returns are smooth is not a plan. Run the projection at eight and at fifteen per cent and treat the range as the honest answer.

This is arithmetic, not advice. It shows what a rate of return would produce; it says nothing about which fund, what risk, or whether a market-linked product suits your circumstances. That conversation belongs with a registered adviser.`,
    steps: [
      "Enter your monthly contribution and how many years you plan to keep investing.",
      "Set an assumed annual return, then run it again a few points lower to see the pessimistic case.",
      "Compare the total contributed against the projected value — the gap is what compounding did.",
      "Extend the term by five years and see how much the projection moves. It is usually more than the extra contributions explain.",
    ],
    faq: [
      {
        q: "What return should I assume?",
        a: "For Indian equity funds, twelve per cent is the conventional projection figure and broadly matches long-run index averages. Run eight per cent as well. A plan that only survives the optimistic figure is not a plan.",
      },
      {
        q: "Why does five extra years make such a difference?",
        a: "Because the early contributions get five more years of compounding, and compounding is most powerful at the end. The extra money invested is a small part of the increase; the extra time is most of it.",
      },
      {
        q: "Are the returns guaranteed?",
        a: "No. Market-linked investments can lose value, and the projection assumes a smooth rate that no real market delivers. Actual returns arrive unevenly, which matters if you need the money at a particular time.",
      },
      {
        q: "Is this financial advice?",
        a: "No. It is a compound growth calculation. It says nothing about which fund to choose, how much risk suits you, or whether this is the right product for your situation. Speak to a registered adviser for that.",
      },
    ],
  },

  "compound-interest-calculator": {
    intro: `Compound interest is interest that earns interest. It is why long-term saving works and why long-term debt is dangerous, and the effect is consistently larger than intuition suggests.

This calculates growth from a starting amount, a rate, a term and a compounding frequency, with the option to add regular contributions.

Compounding frequency matters less than people expect and more than nothing. Ten per cent compounded annually gives ten per cent; compounded monthly it gives 10.47; compounded daily, 10.52. The gain from monthly to daily is small because the increments are already tiny. That is why comparing products on their effective annual rate rather than the nominal one is the only meaningful comparison — a headline rate quoted at a different frequency is not the same number.

The rule of 72 is the shortcut worth carrying: divide 72 by the interest rate and you have roughly the years to double. At six per cent, twelve years. At nine, eight years. It is accurate enough for mental arithmetic across the range of rates anybody actually encounters.

The same mathematics runs the other way on debt, and credit cards are the clearest case. A card at three per cent monthly is not thirty-six per cent a year — compounded, it is around 42.6 per cent, and a balance left untouched grows at that rate. Paying the minimum on a card is a decision to be compounded against.

Inflation is not modelled here, and it should be in your head. A nominal seven per cent with inflation at five is two per cent of real growth. A projection that ignores inflation over twenty years is not describing purchasing power.`,
    steps: [
      "Enter your starting amount, the annual rate and the number of years.",
      "Set the compounding frequency to match the product you are comparing.",
      "Add regular contributions if you will be paying in as well as leaving the balance to grow.",
      "Subtract expected inflation from the rate to see the growth in real terms rather than nominal ones.",
    ],
    faq: [
      {
        q: "How much does compounding frequency change the outcome?",
        a: "Less than most people expect. Ten per cent compounded annually is ten; monthly gives 10.47; daily 10.52. The step from annual to monthly is the one worth noticing, and beyond that the gains are negligible.",
      },
      {
        q: "What is the rule of 72?",
        a: "Divide 72 by the annual rate for a rough number of years to double. Six per cent doubles in twelve years, nine per cent in eight. It is close enough for mental arithmetic across ordinary rates.",
      },
      {
        q: "Does this account for inflation?",
        a: "No — it calculates nominal growth. Subtract your expected inflation rate to see the real figure. Seven per cent nominal with five per cent inflation is two per cent of actual purchasing power.",
      },
      {
        q: "Why do credit cards cost so much more than the rate suggests?",
        a: "Because monthly compounding turns three per cent a month into about 42.6 per cent a year, not thirty-six. Interest is charged on interest already added, which is what makes a carried balance grow so fast.",
      },
    ],
  },

  "gst-calculator": {
    intro: `India's goods and services tax replaced a stack of separate central and state levies in 2017. The arithmetic is simple in one direction and slightly awkward in the other, which is where a calculator earns its place.

Adding GST to a base price is a multiplication. Extracting it from an inclusive price is not, and it is the step people get wrong: with eighteen per cent GST, the tax component of an inclusive price is not eighteen per cent of it. The correct calculation divides by 1.18 to recover the base and subtracts, which gives about 15.25 per cent of the inclusive figure. Taking eighteen per cent of the total overstates the tax every time.

The split between CGST, SGST and IGST is determined by geography rather than by the amount. A supply within a state splits the rate equally between central and state GST — eighteen per cent becomes nine and nine. A supply across state lines is integrated GST at the full rate, going to the centre and then apportioned. Getting this wrong on an invoice is a common and correctable error, and the calculator shows both breakdowns.

The rate slabs are 0, 5, 12, 18 and 28 per cent, with the higher slabs carrying additional cess on some categories such as tobacco and large vehicles. Which slab applies to a given item is a classification question rather than a calculation one, and it changes — the GST Council revises rates periodically, so verify the current rate rather than relying on what it was last year.

For invoicing, rounding rules matter: tax is generally computed per line item and rounded to two decimal places, and totalling rounded figures gives a different answer from rounding the total.`,
    steps: [
      "Enter the amount and choose whether it already includes GST.",
      "Select the rate slab that applies to the item.",
      "Read the base, the tax and the total, along with the CGST and SGST split.",
      "Use the integrated figure instead when the supply crosses a state boundary.",
    ],
    faq: [
      {
        q: "How do I find the GST inside an inclusive price?",
        a: "Divide by one plus the rate, then subtract. At eighteen per cent, divide by 1.18. Taking eighteen per cent of the inclusive figure overstates the tax — the correct share is about 15.25 per cent of the total.",
      },
      {
        q: "What is the difference between CGST, SGST and IGST?",
        a: "Geography. A sale within one state splits the rate equally between central and state GST. A sale across state lines is integrated GST at the full rate. The total is the same either way; the recipients differ.",
      },
      {
        q: "Which rate applies to my product?",
        a: "That is a classification question decided by the HSN or SAC code, not a calculation. The GST Council revises rates periodically, so check the current notification rather than relying on last year's figure.",
      },
      {
        q: "How should rounding be handled on an invoice?",
        a: "Compute tax per line item and round each to two decimal places. Rounding the total instead gives a slightly different figure, and reconciliation systems will notice the difference.",
      },
    ],
  },

  "step-up-sip-calculator": {
    intro: `A step-up plan raises the instalment by a fixed percentage every year, on the theory that your income rises too. This works out where that lands after a decade or two, and shows the flat-instalment version beside it so the increases can be priced rather than assumed.

The gap between the two is larger than most people expect, and for a reason worth understanding. A ten per cent annual increase does not add ten per cent to the outcome. Each year's higher instalment compounds for every remaining year, so an increase made in year three is worth far more than the same increase made in year twelve. The first few raises carry most of the benefit, which is an argument for starting the escalation early rather than promising yourself a bigger one later.

The table shows the instalment for each year alongside the running total and the projected value. Look at the last row of the middle column before you commit to a percentage: a ten per cent yearly rise turns ten thousand into roughly forty-seven thousand a month by year seventeen. That is the figure to sanity-check against a realistic view of your salary, not the pleasant number at the bottom of the projection.

There is one failure mode this does not model. If a year is tight and you skip the increase, or drop back to the previous amount, the whole projection quietly stops describing what you paid. Treat the plan as a commitment you have checked against your own budget, and re-run it whenever reality diverges.`,
    steps: [
      "Put in the amount you can commit to this month, not the amount you hope to manage next year.",
      "Set the yearly increase to something your salary can actually absorb — five to ten per cent is the usual honest range.",
      "Read the last row of the monthly column and ask whether you would really be paying that.",
      "Compare the projection against the flat-instalment figure to see what the escalation is buying you.",
    ],
    faq: [
      {
        q: "How much difference does a step-up really make?",
        a: "At ten per cent a year over fifteen years it typically lifts the final figure by roughly two-thirds against a flat instalment, because every raise compounds for all the years that follow it. The tool prints both, so you can read the exact gap for your own numbers.",
      },
      {
        q: "Should the increase match my appraisal?",
        a: "Matching it exactly is tidy but optimistic. Appraisals are lumpy and some years bring none. Pick a rate you could sustain through a flat year, and raise it manually in the years you do better.",
      },
      {
        q: "Does the fund house have to support this?",
        a: "Most Indian fund houses offer a top-up option on the mandate itself, which automates the increase. Where they do not, the same effect comes from starting a second plan each year and leaving the first alone.",
      },
      {
        q: "What happens if I stop escalating halfway?",
        a: "The projection stops matching your account from that point on. Re-run it with the instalment you have actually reached and a step-up of zero to see where you now land.",
      },
    ],
  },

  "lumpsum-calculator": {
    intro: `A lumpsum investment is one amount, put in once and left alone for a number of years. This is the simplest projection in personal finance and the one that shows compounding most clearly, because nothing else is happening to muddy it.

The figure that repays attention here is the doubling time, printed alongside the result. At twelve per cent money doubles roughly every six years; at eight per cent it takes about nine. That difference sounds modest stated as four percentage points and is enormous stated as outcomes — over twenty-four years the twelve per cent case doubles four times and the eight per cent case doubles under three, which is the difference between sixteen times your money and about six.

The year-by-year column is there to make the shape visible. Growth on a single amount is not a line but a curve that stays almost flat for years before turning upward, and most of the final value appears in the last third of the term. Anyone who has abandoned an investment at year four because "it has not done much" has met the flat part of that curve and mistaken it for the whole thing.

A caution on the rate. Historical averages for Indian equity indices sit in the low teens over long windows, but any particular decade can sit well below that, and the projection assumes the rate arrives evenly, which no market does. Run the number twice — once at the rate you hope for and once four points below it — and plan against the lower one.`,
    steps: [
      "Enter the amount you are putting in as a single payment.",
      "Set the return you expect, then note the doubling time the tool prints beside it.",
      "Read down the yearly column and see how late in the term most of the growth appears.",
      "Re-run at a materially lower rate and use that as the figure you plan against.",
    ],
    faq: [
      {
        q: "Is a lump sum better than spreading the money out?",
        a: "Statistically a lump sum wins more often, because the money is exposed to growth for longer. The case for spreading it is behavioural rather than mathematical: it removes the risk of committing everything the week before a fall, which is the thing that makes people abandon a plan.",
      },
      {
        q: "Why does the doubling time matter more than the rate?",
        a: "Because it converts an abstract percentage into a period you can picture. Six years versus nine years is a comparison anyone can hold in their head; twelve per cent versus eight per cent is not.",
      },
      {
        q: "Does this account for tax on the gain?",
        a: "No. The projection is pre-tax. What you owe depends on the instrument, how long you held it and which regime applies, none of which this knows about.",
      },
      {
        q: "What if I want to add to it later?",
        a: "Use the compound interest tool, which takes a starting amount and a monthly addition together, or the SIP tool if the additions are the main event.",
      },
    ],
  },

  "swp-calculator": {
    intro: `A systematic withdrawal plan reverses the usual arrangement: instead of paying in each month you take out, and whatever is left keeps earning. The question this answers is whether the corpus survives the plan, and it answers it in months rather than in reassurance.

The mechanics matter. Each month the balance earns its return first, then the withdrawal comes out. Early on the return covers most of the draw and the balance barely moves; later, if the draw exceeds what the balance earns, the shortfall eats into capital and the erosion accelerates. That acceleration is why a plan can look comfortable for twelve years and then collapse in three, and why the year-by-year table is worth reading past the first few rows.

The escalation field exists because a fixed withdrawal is not a fixed standard of living. Thirty thousand a month buys materially less after fifteen years, so a plan that never raises the draw is quietly planning to become poorer. Setting the escalation to your expected inflation rate is the honest version of the question, and it usually shortens the life of the corpus considerably.

If the corpus runs out before the term, the tool says so in months rather than rounding it away, and the result reads as a warning instead of an outcome. That is deliberate: the useful answer to "will this last" is not a number with a reassuring shape but the specific month in which it fails.

Sequence risk is the part no steady-rate model can show. A run of poor years at the start of a withdrawal plan does far more damage than the same years later, because the withdrawals are being taken from a shrunken base.`,
    steps: [
      "Enter the corpus you will start with and the amount you need each month.",
      "Set the return you expect on the balance that stays invested — lower than a growth portfolio, since you are drawing from it.",
      "Set the yearly escalation to your inflation assumption rather than leaving it at zero.",
      "Check the month the corpus runs out, if it does, and reduce the draw until it survives the term.",
    ],
    faq: [
      {
        q: "What withdrawal rate is safe?",
        a: "There is no single figure, but plans drawing much more than six or seven per cent of the corpus a year tend to fail over long horizons once inflation is included. Use the escalation field and read the exhaustion month rather than trusting a rule of thumb.",
      },
      {
        q: "Why does the order of returns matter if the average is the same?",
        a: "Because withdrawals crystallise losses. A bad first year means you sell more units to fund the same draw, and those units are never there for the recovery. Two portfolios with identical average returns can end very differently depending on when the bad years fell.",
      },
      {
        q: "Is the withdrawal taxed?",
        a: "Each withdrawal from a fund is partly capital and partly gain, and only the gain is taxable, at a rate that depends on the fund type and holding period. This model works in gross figures.",
      },
      {
        q: "How is this different from a monthly income scheme?",
        a: "A monthly income scheme pays a fixed rate and returns your capital intact at the end. Here the capital is being consumed, which is why the plan can end early — and also why it can leave more behind if returns are good.",
      },
    ],
  },

  "goal-sip-calculator": {
    intro: `Most projections start from what you can pay and end at a number. This one runs the other way: name the amount you need and the date you need it by, and it works out the monthly commitment that gets there.

The field that changes the answer most is the one people leave blank. Anything already invested keeps growing on its own, so the monthly figure only has to cover the shortfall between the target and what that existing money becomes. Ignoring it is the commonest way these tools overstate what someone needs to save, sometimes by a wide margin — five lakh already invested at twelve per cent becomes over fifteen lakh in ten years, and fifteen lakh of a fifty lakh goal is a third of the work already done.

The output splits the answer into two parts that are worth separating: what you will pay in over the whole term, and what growth contributes on top. On a ten-year goal the split is usually somewhere near two-thirds contributions to one-third growth; stretch the same goal to twenty years and growth overtakes contributions entirely. Seeing the crossover makes the case for a longer horizon better than any argument about compounding does.

Treat the resulting figure as a floor, not a target. It is exactly right only if the return assumption is exactly right, and returns arrive unevenly. Running the calculation two or three points below your expected rate and saving that higher amount is the version of this that survives contact with a real market.`,
    steps: [
      "Enter the amount you need and the year you need it.",
      "Add whatever is already invested towards this goal — it changes the answer more than anything else on the form.",
      "Set a return you would be comfortable defending if the next five years disappoint.",
      "Compare what you pay in against what growth adds, then try the same goal over a longer term.",
    ],
    faq: [
      {
        q: "Why is the monthly figure lower than the target divided by the months?",
        a: "Because growth does part of the work. The gap between those two numbers is exactly what compounding contributes, and the tool prints it as its own line so you can see the size of it.",
      },
      {
        q: "Should I use my expected return or a conservative one?",
        a: "A conservative one. If you plan at twelve per cent and get nine, you arrive short at the moment you need the money. If you plan at nine and get twelve, you arrive early with a surplus, which is a far better kind of wrong.",
      },
      {
        q: "What if the required amount is more than I can afford?",
        a: "Three levers move it: a longer horizon, a smaller target, or more already invested. Extending the term is usually the most powerful, because every extra year both adds contributions and compounds the existing ones.",
      },
      {
        q: "Does it handle a goal that is only a few years away?",
        a: "It does, but the arithmetic gets unforgiving. Over three or four years growth contributes very little and the monthly figure is close to the target divided by the months, which is the honest answer for a short horizon.",
      },
    ],
  },

  "simple-interest-calculator": {
    intro: `Simple interest is charged on the original amount and nothing else. Borrow a lakh at eight per cent for five years and the interest is forty thousand — eight thousand a year, five times, with no interaction between the years.

Its usefulness today is mostly as a comparison. Almost nothing in modern finance actually works this way: bank deposits compound, loans reduce, and the few products that quote a flat figure are quoting it precisely because the number looks smaller than the equivalent compound one. So this tool prints both, and the difference between them is the point of the page.

Over short periods the two barely diverge. At eight per cent for one year they are identical, and at two years the gap is under a thousand rupees on a lakh. Push the term to fifteen years and the compound figure is roughly double the simple one. The divergence is a function of time far more than of rate, which is why a flat quote on a long loan is so much more misleading than the same quote on a short one.

Where you will genuinely meet simple interest is in loans between individuals, some short-term business advances, certain deposit schemes that pay interest out rather than reinvesting it, and the interest component of a few tax provisions. In each of those cases the number here is the whole answer rather than a comparison.

If you are looking at a lender quoting a flat rate on an instalment loan, the tool you actually want is the flat versus reducing comparison, which converts the quote into the rate you are really paying.`,
    steps: [
      "Enter the principal, the rate and the number of years.",
      "Read the interest and the total repayable.",
      "Look at the compound figure printed underneath and note the gap.",
      "Stretch the term and watch the gap widen — that widening is the whole argument for compounding.",
    ],
    faq: [
      {
        q: "When would I actually use simple interest?",
        a: "Loans between individuals, short business advances, deposit schemes that pay interest out rather than reinvesting it, and certain statutory interest calculations. Outside those, compounding is the norm.",
      },
      {
        q: "Why show the compound figure as well?",
        a: "Because the comparison is the useful part. A rate quoted on a simple basis and the same rate quoted on a compound basis are not the same offer, and on a long term they are not even close.",
      },
      {
        q: "Is a flat loan rate the same as simple interest?",
        a: "The interest is calculated the same way, on the full original amount for the full term. But because you repay the loan in instalments, you are paying that interest on money you no longer have, which makes the effective cost far higher than the quote. The flat versus reducing tool works out by how much.",
      },
      {
        q: "Does the gap depend more on the rate or the term?",
        a: "The term, decisively. Doubling the rate widens the gap; doubling the years widens it far more, because compounding feeds on itself and simple interest never does.",
      },
    ],
  },

  "cagr-calculator": {
    intro: `Compound annual growth rate is the single steady rate that would have carried a starting value to an ending value over a given period. It is a summary, not a description — it says nothing whatsoever about what happened in between.

That distinction is the reason CAGR is both useful and routinely abused. An investment that rose forty per cent, fell thirty, then rose fifty over three years has a perfectly respectable CAGR, and reading only that number would leave you unprepared for the year you would have spent thirty per cent down. Two investments with identical CAGRs can have wildly different experiences attached to them, and the one with the smoother path is worth more to most people than the arithmetic suggests.

The tool prints the absolute return beside the annualised one, which is the comparison most people actually need. Doubling your money sounds impressive until you notice it took twelve years, at which point the annualised figure of about six per cent puts it in perspective against a fixed deposit. Conversely a modest-sounding forty per cent total is a strong result over eighteen months.

There is one thing CAGR cannot do, and it is worth being explicit about. It only works where money went in once and came out once. The moment you add or withdraw along the way — which is what every monthly investment plan does — the two endpoints stop containing enough information, and the figure you want is XIRR instead. Using CAGR on a plan with ongoing contributions produces a number that is not merely imprecise but meaningless.`,
    steps: [
      "Enter the value you started with and the value you ended with.",
      "Set the period between them, in years — decimals are fine for part-years.",
      "Read the annualised rate, then check the absolute return beside it for context.",
      "If money went in or out during the period, stop and use XIRR instead.",
    ],
    faq: [
      {
        q: "What counts as a good CAGR?",
        a: "It depends entirely on what you are comparing against and over what period. Judge it against an index over the same window and against what a deposit would have paid, rather than against a number someone quoted you.",
      },
      {
        q: "Why can't I use this for a monthly investment plan?",
        a: "Because each instalment was invested for a different length of time, and two endpoints cannot encode that. XIRR takes the dates and amounts of every flow and solves for the rate that reconciles them all.",
      },
      {
        q: "Does CAGR account for volatility?",
        a: "Not at all, and that is its main limitation. It is the smooth line drawn between two points, and the actual path is invisible to it.",
      },
      {
        q: "Can it be negative?",
        a: "Yes, whenever the ending value is below the starting one. The tool handles that and reports the rate as negative rather than refusing the calculation.",
      },
    ],
  },

  "xirr-calculator": {
    intro: `XIRR finds the annualised return on a set of cash flows that happened on irregular dates. It is the right measure for almost every real portfolio, because real portfolios are not one payment in and one payment out — they are a monthly instalment here, a top-up there, a redemption when something came up, and a current balance that is not yet realised.

Paste one flow per line as a date and an amount. Money leaving your pocket is negative and money coming back is positive. If the investment is still running, add today's date and the current value as a final positive line: without it there is nothing for the calculation to solve against and the answer will be badly wrong.

What the tool does is find the discount rate at which all those dated flows net to zero. There is no closed formula for that, so it iterates — Newton's method first, which converges quickly on well-behaved inputs, and a bisection search over a wide bracket when the flows are awkward enough to send the first method wandering. Where no rate can reconcile the flows at all, which usually means every line has the same sign, it says so rather than returning whatever the last iteration held.

The result is directly comparable to a fixed deposit rate or a fund's published return, which is what makes it worth the trouble. A statement showing a total gain of forty per cent tells you nothing until you know across how many instalments and how long; XIRR compresses all of that into one number you can put next to any other rate.`,
    steps: [
      "Write one line per transaction: the date, a comma, then the amount.",
      "Make money you paid in negative and money you took out positive.",
      "Add today's date and the current value as a final positive line if the investment is still open.",
      "Run it and compare the rate against a deposit or an index over the same period.",
    ],
    faq: [
      {
        q: "What date format does it accept?",
        a: "Anything the browser can parse, but 2024-04-01 is unambiguous and always works. Formats that put the day first can be read the other way round, so avoid them.",
      },
      {
        q: "Why do I have to include the current value?",
        a: "Because otherwise the flows only show money going out, and there is no rate that makes a series of pure outflows net to zero. The current value is what the investment is worth if you sold today, and it belongs in the calculation as a positive line.",
      },
      {
        q: "How does this differ from the return my fund reports?",
        a: "A fund reports the return on the fund. XIRR reports the return you got, which depends on when you put money in. Someone who invested heavily just before a fall has a worse XIRR than the fund's own figure, and someone who bought the dip has a better one.",
      },
      {
        q: "It says no rate fits my flows. What went wrong?",
        a: "Almost always a sign error — either everything is negative, or everything is positive. There has to be at least one of each for a rate to exist.",
      },
    ],
  },

  "stock-average-calculator": {
    intro: `Buy the same stock several times at different prices and your average cost is not the average of those prices — it is the total spent divided by the total shares. The distinction matters whenever the quantities differ, and it is where a quick mental sum usually goes wrong.

Buy ten shares at a thousand and ninety at a hundred, and the naive average of the two prices is five hundred and fifty. The real average cost is a hundred and ninety, because ninety per cent of the position was bought at the lower price. Weighting by quantity is the entire calculation, and doing it by eye reliably overstates the effect of the small trades.

Enter one purchase per line as a quantity and a price. The tool prints the weighted average, the total invested and a line for each purchase so you can check the entries. Add a current price and it also reports the value of the position and the profit or loss in both rupees and per cent.

A word on what averaging down actually does, since that is why most people arrive here. Buying more of a falling holding lowers the average cost, which makes the position look better on a statement without changing anything about the underlying business. The number moves whether or not the original decision was sound. Use the average price for what it is — the break-even level and the basis for a tax computation — rather than as evidence that the position is recovering.

For a portfolio built through many purchases over years, the more informative measure is XIRR, which weights by time as well as by amount.`,
    steps: [
      "Enter one purchase per line: the number of shares, a comma, then the price you paid.",
      "Run it to get the weighted average and the total invested.",
      "Add the current price to see the position value and the profit or loss.",
      "Use the average as your break-even level rather than as a verdict on the holding.",
    ],
    faq: [
      {
        q: "Why isn't the average just the middle of my two prices?",
        a: "Because the quantities are almost never equal. A hundred shares at one price and ten at another are not two equal inputs, and weighting by quantity is the whole point of the calculation.",
      },
      {
        q: "Does averaging down actually help?",
        a: "It lowers your break-even price, which is arithmetic. Whether it is a good idea depends entirely on whether the holding is worth owning at the new price, which is a separate question the number cannot answer.",
      },
      {
        q: "Are brokerage and taxes included?",
        a: "No. Enter the price you paid per share; charges are worked out separately by the brokerage tool, which itemises every statutory line on a trade.",
      },
      {
        q: "Can I use this for units of a fund?",
        a: "Yes. Fractional quantities are accepted, so unit balances with decimals work exactly as share counts do.",
      },
    ],
  },

  "fd-calculator": {
    intro: `A fixed deposit pays a rate agreed on the day you open it, for a term agreed on the same day, and nothing that happens to rates afterwards changes either. That certainty is the product. This works out what the deposit matures at, and separates the two arrangements banks offer for the interest.

In a cumulative deposit the interest stays in and compounds, usually every quarter, so the maturity value is larger than the rate alone suggests. Seven per cent compounded quarterly is really 7.186 per cent a year, and the tool prints that effective figure because it is the number to compare against another bank's offer. In a payout deposit the interest leaves at the end of each period and the principal comes back untouched at the end — nothing compounds, and the total interest is lower, which is the price of receiving an income.

The tax field is there because deposit interest is where a headline rate and a real one diverge most sharply. Interest is taxable at your slab in the year it accrues, not the year it reaches you, so a five-year cumulative deposit generates a tax liability in each of those five years even though no money has arrived. At a thirty per cent slab, a seven per cent deposit returns under five per cent after tax, which is worth knowing before comparing it against anything.

Deduction at source is a separate mechanism from the tax itself. Once interest crosses a yearly threshold the bank withholds part of it and pays it in against your name; the amount shows up in your annual statement and settles part of the bill rather than adding to it.`,
    steps: [
      "Enter the deposit, the rate your bank is offering and the term.",
      "Choose whether the interest is reinvested until maturity or paid out as it accrues.",
      "Set the compounding or payout frequency to match the offer document.",
      "Put your tax slab in the last field to see what the deposit really returns after tax.",
    ],
    faq: [
      {
        q: "What is the effective rate the tool prints?",
        a: "It is the yearly rate that would produce the same result if it compounded only once a year. Quarterly compounding at seven per cent gives an effective 7.186 per cent, and comparing effective rates is the only fair way to compare two offers with different compounding.",
      },
      {
        q: "Should I take the interest as a payout or let it accumulate?",
        a: "Accumulate it if you do not need the money, because compounding is worth real amounts over five years. Take the payout if the deposit exists to produce an income, and accept that the total will be lower.",
      },
      {
        q: "Is the interest taxed even if I do not withdraw it?",
        a: "Yes. It is taxable in the year it accrues, which for a cumulative deposit means a liability every year with no cash arriving to meet it. This surprises people at maturity more than any other feature of the product.",
      },
      {
        q: "What happens if I break the deposit early?",
        a: "Banks apply a penalty, typically by paying the rate that applied to the shorter period actually completed, minus a percentage. The maturity figure here assumes you hold to term.",
      },
    ],
  },

  "rd-calculator": {
    intro: `A recurring deposit takes a fixed instalment every month and pays a fixed rate, so it is a disciplined savings habit with a guaranteed outcome. The arithmetic is less obvious than it looks, and the difference between doing it properly and doing it roughly is not small.

Indian banks compound recurring deposits quarterly, and each instalment earns only for the months it has actually been in the account. The first instalment earns for the whole term; the last earns for one month. So the maturity value is not the total deposited grown at the rate, and it is not a simple monthly annuity either — treating it as one overstates the result noticeably on a long term. This tool computes each instalment separately against the quarterly compounding the bank applies, which is why its figure will match a bank's own quote rather than sitting a few thousand above it.

The interest is smaller than the headline rate feels, and that is not the bank being unfair. On a sixty-month deposit the average rupee has been in the account for about thirty months, not sixty, so roughly half the rate is what the total deposited effectively earns. Reading the interest line against the deposited line makes this concrete.

Two practical notes. Missing an instalment attracts a penalty and shortens the earning period for that month, neither of which is modelled here. The interest is also taxed at whatever rate your income attracts, in the year it is credited rather than the year it is paid, so setting this beside an exempt scheme compares two unlike things.`,
    steps: [
      "Enter the instalment you will pay each month and the rate the bank quotes.",
      "Set the tenure in months rather than years — most recurring deposits are quoted that way.",
      "Read the maturity value against the total deposited to see what the interest actually amounted to.",
      "Compare the result against the bank's own quote; it should match, because the compounding matches.",
    ],
    faq: [
      {
        q: "Why is the interest lower than I expected?",
        a: "Because most of the money has not been in the account for the full term. On a five-year deposit the average instalment has earned for about half the period, so the total interest is close to half of what the headline rate on the full amount would suggest.",
      },
      {
        q: "Why compound quarterly rather than monthly?",
        a: "Because that is the convention Indian banks and post offices use for these accounts. Compounding monthly would produce a slightly higher figure than the bank will actually pay you.",
      },
      {
        q: "What if I miss a month?",
        a: "Most banks charge a small penalty per missed instalment and some close the account after several. The missed month also earns nothing, which reduces the maturity beyond the penalty itself.",
      },
      {
        q: "Is this better than a monthly investment in a fund?",
        a: "It is safer and it is guaranteed, and over long periods it has historically returned considerably less. Which is better depends on the horizon and on whether you can tolerate a falling balance.",
      },
    ],
  },

  "ppf-calculator": {
    intro: `The Public Provident Fund runs for fifteen years, compounds once a year, and is exempt from tax on the way in, along the way and on the way out. That last property is rare enough in India that it changes how the scheme should be compared against anything else.

Because the interest is untaxed, the headline rate is the rate you actually receive. A bank deposit paying the same nominal figure returns materially less to anyone in a higher slab, so a comparison that ignores tax will always understate this scheme. The maturity figure here is the figure that reaches you.

There is a timing rule inside the scheme that most calculators ignore and that is worth more than a rate change. Interest is computed on the lowest balance in the account between the fifth day of the month and the last. Money deposited on the third of April earns for the full year; the same money deposited on the sixth earns for eleven months, and deposited in March it earns for almost none. Over fifteen years, always depositing in early April rather than late March is worth a meaningful sum for nothing but a diary entry. This projection assumes deposits are made at the start of each year, which is the arrangement that rule rewards.

The account can be extended in blocks of five years once the initial term ends, with or without further deposits, which is why the term field goes beyond fifteen. An extended account that receives no fresh money still compounds, and those later years are the cheapest growth in the scheme.

The annual ceiling is a hundred and fifty thousand rupees across all accounts you hold.`,
    steps: [
      "Enter what you plan to deposit each year, up to the annual ceiling.",
      "Set the rate from the current notification — the default is a common recent figure, not a live lookup.",
      "Leave the term at fifteen for the standard account, or raise it in steps of five for an extension.",
      "Read the yearly table to see how much of the final balance comes from the last few years.",
    ],
    faq: [
      {
        q: "When in the year should I deposit?",
        a: "Before the fifth of April, if you can. Interest is calculated on the lowest balance between the fifth and the end of each month, so an early-April deposit earns a full year and a March one earns almost nothing.",
      },
      {
        q: "Is the maturity amount really tax free?",
        a: "Yes. The scheme is exempt at all three stages: the deposit qualifies for a deduction, the interest is not taxed as it accrues, and the maturity proceeds are not taxed. That is why its rate is not directly comparable to a bank deposit's.",
      },
      {
        q: "Can I take money out before fifteen years?",
        a: "Partial withdrawal is allowed from the seventh year, subject to limits, and a loan is available earlier against the balance. Full closure before maturity is permitted only in narrow circumstances.",
      },
      {
        q: "What happens after fifteen years?",
        a: "You can withdraw everything, or extend in five-year blocks with or without further deposits. An extension without deposits still earns interest, which makes those years unusually efficient.",
      },
    ],
  },

  "epf-calculator": {
    intro: `The Employees' Provident Fund takes twelve per cent of basic pay and dearness allowance from you and a matching twelve per cent from your employer. What most projections get wrong is what happens to the employer's half.

It does not all reach your provident fund. Of the employer's twelve per cent, 8.33 per cent of wages up to the statutory ceiling is diverted to the Employees' Pension Scheme and never appears in the balance you can withdraw. Only the remainder joins your fund. Modelling the whole twenty-four per cent as accumulating is the standard error in this calculation, and on a thirty-year projection it overstates the corpus substantially. This tool takes the pension share out and reports it separately, so you can see both what accumulated and what was redirected.

Salary growth is the other lever, and it compounds against the contribution rather than the balance. A five per cent yearly rise means the contribution in year twenty is roughly two and a half times the contribution in year one, and those larger later contributions have the least time to grow — which is why the projection is more sensitive to the early years than to the salary you eventually reach.

The rate is declared each year by the central board rather than fixed, so treat the default as a recent figure rather than a promise. You can also raise your own share above twelve per cent through a voluntary contribution, which the employer does not match but which earns the same rate; the contribution field accepts that.

The pension share buys a monthly pension rather than a lump sum, and this does not project it.`,
    steps: [
      "Enter your monthly basic plus dearness allowance — not your gross salary, which is a larger number.",
      "Set your current age and the age you expect to retire.",
      "Add whatever balance is already in the account, from your passbook.",
      "Set a realistic yearly salary growth, then read the pension diversion line alongside the balance.",
    ],
    faq: [
      {
        q: "Why is the balance lower than twenty-four per cent of my salary compounded?",
        a: "Because 8.33 per cent of wages up to the ceiling goes to the pension scheme instead of the fund. The tool shows that amount on its own line so the gap is visible rather than mysterious.",
      },
      {
        q: "What is the wage ceiling for?",
        a: "The pension diversion is capped at 8.33 per cent of a statutory wage figure rather than of your actual salary, so above that wage the diverted amount stops growing and more of the employer's share reaches your fund.",
      },
      {
        q: "Can I contribute more than twelve per cent?",
        a: "Yes, through a voluntary contribution. It earns the same rate and the employer is not obliged to match it. Raise the contribution field to model it.",
      },
      {
        q: "Is the balance taxable when I withdraw it?",
        a: "Not after five years of continuous service. Withdrawal before that is taxable and attracts deduction at source, which is what section 192A covers.",
      },
    ],
  },

  "nps-calculator": {
    intro: `The National Pension System accumulates monthly contributions until sixty and then splits the result in two. At least forty per cent must buy an annuity that pays a monthly pension; the rest can be taken as a lump sum, tax free. This projects both halves.

The lump sum is the straightforward part — a monthly contribution compounded at whatever the underlying funds return. The pension is not, and the tool is explicit about why. It depends on the annuity rate available on the day you retire, from a provider you have not yet chosen, in a market that may look nothing like today's. Six per cent is a reasonable placeholder and nothing more. Anyone quoting you a precise pension figure thirty years out is quoting the placeholder as though it were a promise.

Two features of the scheme are worth understanding before reading the numbers. The first is that the annuity share is a floor, not a target — you may put more than forty per cent into it, and the tool accepts that, but you cannot put less. The second is that the pension is taxable as income when it arrives, while the lump sum is not. So the two halves of the same corpus are treated very differently, and a plan that maximises the tax-free half is not the same as a plan that maximises income.

The return assumption should reflect your asset mix. A contributor in the aggressive equity option and one in the conservative government-securities option are running very different schemes under the same name, and a single default rate suits neither exactly.`,
    steps: [
      "Enter your monthly contribution, your age now and the age you will retire.",
      "Set a return that matches your chosen asset mix rather than the scheme average.",
      "Leave the annuity share at forty per cent unless you intend to buy more pension than the minimum.",
      "Treat the monthly pension figure as an illustration — the annuity rate is the part nobody can know now.",
    ],
    faq: [
      {
        q: "Why must forty per cent buy an annuity?",
        a: "Because the scheme is designed to produce a pension rather than a lump sum. The rule prevents the corpus being spent in a way that leaves nothing for later life, which is the failure the scheme exists to avoid.",
      },
      {
        q: "How reliable is the pension figure?",
        a: "Directionally useful, precisely worthless. It is the annuity rate you enter applied to the annuity corpus, and the real rate will be whatever the market offers on the day you buy. Treat it as a scenario.",
      },
      {
        q: "Is the lump sum taxed?",
        a: "The portion taken at exit is exempt within the scheme's rules. The pension itself is taxable as income in the year you receive it, which is a meaningful difference between the two halves.",
      },
      {
        q: "How does this compare with the provident fund?",
        a: "The provident fund pays a declared rate on a debt portfolio; this invests according to an asset mix you choose, so it carries market risk and, historically, higher long-run returns. They are complements more than substitutes.",
      },
    ],
  },

  "sukanya-samriddhi-calculator": {
    intro: `Sukanya Samriddhi Yojana is a savings account opened in the name of a girl under ten, funded for fifteen years, and left to mature twenty-one years after opening. The six-year gap between the last deposit and maturity is the most valuable part of the scheme and the part most people miss.

During those final six years nothing is paid in and the balance keeps compounding at the notified rate. On a fully funded account that stretch typically adds more to the maturity value than the last several years of deposits did, because the balance being compounded is at its largest and no further capital is required. Anyone deciding whether to open the account late should look at what that tail is worth before concluding a later start is only slightly worse.

The rate has generally been set above the Public Provident Fund's, and the scheme is untaxed at every stage: the deposit, the interest and the maturity proceeds alike. The combination is why it tends to beat any taxable deposit available for the same horizon, and the reason to compare it against tax-free alternatives rather than headline bank rates.

Deposits are capped at one and a half lakh rupees each year, counted across every account held for the same child, and a household may open accounts for two girls, with a narrow exception for twins. There is a minimum too, and letting an account lapse below it requires a penalty payment to revive.

Partial withdrawal is permitted for higher education once she turns eighteen, which is often the reason the account exists in the first place. Withdrawing then forgoes part of that valuable final compounding stretch, so it is worth planning around rather than into.`,
    steps: [
      "Enter what you can deposit each year, up to the annual ceiling.",
      "Set the rate from the current notification rather than trusting the default.",
      "Enter her age at opening — it sets the age she will be when the account matures.",
      "Look at the last six rows of the table, where no deposits are made and the balance still climbs.",
    ],
    faq: [
      {
        q: "Why do deposits stop at fifteen years but the account run to twenty-one?",
        a: "That is how the scheme is written, and it works in your favour. Those final six years compound a large balance without requiring any further money, and they account for a substantial share of the maturity value.",
      },
      {
        q: "How late can I open an account?",
        a: "Any time before she turns ten. Opening later shortens nothing about the deposit period or the term — both run from the opening date — but she will be older at maturity, which may or may not suit the purpose.",
      },
      {
        q: "Can I take money out for her education?",
        a: "Up to half the balance may be withdrawn once she turns eighteen or finishes the tenth standard, for higher education. Doing so reduces the amount compounding through the remaining years.",
      },
      {
        q: "How does it compare with the Public Provident Fund?",
        a: "The rate has usually been higher and the tax treatment is the same, but the money is locked to one child and one purpose. The provident fund is more flexible; this pays more for accepting the restriction.",
      },
    ],
  },

  "nsc-calculator": {
    intro: `A National Savings Certificate is bought once, held for five years, and pays a rate fixed on the day of purchase. Nothing that happens to notified rates afterwards affects a certificate already bought, which makes it a way of locking a rate rather than tracking one.

Interest accrues yearly and is reinvested rather than paid out, so the certificate compounds. This has an unusual consequence at tax time. Because the reinvested interest is treated as a fresh investment in the scheme, it qualifies for a deduction under section 80C in each of the first four years, alongside your original purchase. The interest of the fifth and final year does not, since it is paid out at maturity rather than reinvested. So a certificate quietly generates its own deductions for most of its life, which is worth knowing when planning a year's 80C claim.

The interest is nevertheless taxable in the year it accrues. The deduction and the taxability offset each other for many people, but not for everyone, and the two are separate provisions that happen to point in opposite directions.

The tool shows the interest credited each year alongside the running value, which makes the compounding visible and gives you the figures to report annually. The rate is an input rather than a lookup, because it is re-notified each quarter and a certificate bought last year carries a different one from a certificate bought this week.

Certificates can be pledged as security for a loan and transferred in limited circumstances, but there is no early exit except in narrow cases such as the holder's death or a court order.`,
    steps: [
      "Enter the amount you are investing and the rate on the certificate you are buying.",
      "Leave the term at five years unless you are modelling a variant with a different one.",
      "Read the yearly interest column — those are the figures to declare, and to claim under 80C.",
      "Compare the maturity value against a tax-free scheme rather than against a headline bank rate.",
    ],
    faq: [
      {
        q: "Why does the interest qualify for a deduction?",
        a: "Because it is reinvested in the scheme rather than paid to you, so it counts as a fresh investment. This applies to the first four years; the final year's interest is paid out and does not qualify.",
      },
      {
        q: "Is the rate fixed for the whole term?",
        a: "Yes, at the rate applying on the date of purchase. Later re-notifications change what new certificates pay and leave existing ones alone.",
      },
      {
        q: "Is the interest taxable?",
        a: "Yes, in the year it accrues. For many people the 80C deduction on the reinvested amount offsets it, but the two provisions are independent and the offset is not automatic.",
      },
      {
        q: "Can I redeem early?",
        a: "Only in narrow circumstances, such as the death of the holder or a court order. Otherwise the certificate runs its term, which is the trade for the fixed rate.",
      },
    ],
  },

  "senior-citizens-savings-calculator": {
    intro: `The Senior Citizens Savings Scheme takes a deposit, pays interest every quarter, and returns the capital at the end of five years. It is designed to produce income rather than growth, and the arithmetic reflects that: nothing compounds, because the interest leaves the account each quarter.

That is the trade at the centre of the scheme and the tool states it plainly. A deposit that compounds for five years ends larger than one that pays out; a deposit that pays out gives you money to live on in the meantime. Neither is better in the abstract — they answer different questions — but comparing the maturity value of one against the other without noticing the difference is a mistake.

The quarterly payment is straightforward to work out and the tool also states it as a monthly equivalent, because household budgets run monthly and quarterly figures are awkward to think in.

Two limits shape the scheme. The deposit is capped at thirty lakh rupees per person, and eligibility generally begins at sixty, with earlier entry allowed for some retirees under specific conditions. The rate is fixed at the time of deposit for the full five years, so a re-notification afterwards leaves an existing account untouched — the same lock-in that applies to the National Savings Certificate.

The interest is fully taxable and deduction at source applies above the threshold for senior citizens, which is higher than the ordinary one. Where total income stays below the taxable limit, a declaration can prevent the deduction rather than reclaiming it later.

The account can be extended by three years once the initial term ends.`,
    steps: [
      "Enter the deposit, keeping within the per-person ceiling.",
      "Set the rate from the current notification for the quarter in which you are depositing.",
      "Read the quarterly payment and the monthly equivalent beside it.",
      "Check the total interest against what the same amount would have earned if it compounded instead.",
    ],
    faq: [
      {
        q: "Why does nothing compound here?",
        a: "Because the interest is paid out to you every quarter rather than staying in the account. That is the purpose of the scheme — a predictable income — and it is why the total is lower than a cumulative deposit's.",
      },
      {
        q: "Is the rate locked for five years?",
        a: "Yes, at whatever applied on the date of deposit. Later re-notifications affect new accounts only.",
      },
      {
        q: "What is the deposit limit?",
        a: "Thirty lakh rupees per person. A couple can hold separate accounts, which doubles the household ceiling.",
      },
      {
        q: "Is tax deducted from the quarterly payment?",
        a: "Above the threshold that applies to senior citizens, yes. If your total income is below the taxable limit, a declaration filed with the bank or post office prevents the deduction rather than leaving you to reclaim it.",
      },
    ],
  },

  "post-office-mis-calculator": {
    intro: `The Post Office Monthly Income Scheme converts a lump sum into a monthly payment for five years and then hands the lump sum back. There is no growth and no compounding — the deposit is a rate-earning asset and the interest is spent as it arrives.

The appeal is that the payment is fixed, guaranteed by the government, and lands in a linked savings account every month without any action from you. For someone who needs a predictable amount each month and cannot tolerate a variable one, that combination is difficult to reproduce elsewhere at the same risk.

The deposit ceilings are the constraint that decides most cases, and they differ by account type: nine lakh rupees for a single account and fifteen lakh for a joint one. The tool applies the right ceiling for the account you pick and refuses a deposit above it rather than quietly computing an income you cannot actually receive. Where a household needs more income than the ceiling supports, the usual arrangement is a single account and a joint account held in different combinations.

What the scheme does not do is protect the capital's value. Five years of six per cent inflation takes roughly a quarter off what the returned deposit will buy, and the monthly payment does not rise at all in the meantime. Against a rising cost of living, a fixed income is a shrinking one, and the inflation tool will put a number on it.

The income is taxable as income from other sources, and there is no deduction for the deposit itself.`,
    steps: [
      "Choose whether the account is single or joint — it sets the deposit ceiling.",
      "Enter the deposit and the rate from the current notification.",
      "Read the monthly income figure, which is what will actually arrive each month.",
      "Run the same deposit through the inflation tool to see what that income is worth in five years.",
    ],
    faq: [
      {
        q: "How much can I deposit?",
        a: "Nine lakh rupees in a single account and fifteen lakh in a joint one. The tool applies the ceiling for the account type you select and will not compute a deposit above it.",
      },
      {
        q: "Does the monthly income change over the five years?",
        a: "No. It is fixed at the rate applying when you deposit, which means it buys steadily less as prices rise. That is the main limitation of the scheme.",
      },
      {
        q: "Do I get the deposit back?",
        a: "Yes, in full at the end of the term. The monthly payments are interest only and never touch the capital.",
      },
      {
        q: "Can I withdraw early?",
        a: "After one year, with a deduction from the deposit that reduces the longer you have held it. Within the first year, no withdrawal is permitted.",
      },
    ],
  },

  "home-loan-emi-calculator": {
    intro: `A home loan is agreed against a property price rather than a loan amount, so this starts where the decision does. Set the down payment as a share of the price and the loan falls out of it, along with the instalment, the total interest and the year-by-year split.

The figure worth stopping on is the first-year breakdown, and the tool prints the exact share rather than leaving you to guess at it. On a twenty-year loan at typical rates roughly four-fifths of the first year's instalments is interest, and the share climbs with the tenure — stretch the same loan to thirty years and it passes ninety per cent. People discover this at the end of year one, look at how little the outstanding balance has moved, and conclude something has gone wrong. Nothing has: a reducing-balance loan charges interest on a balance that starts at its largest, and the principal only begins to fall meaningfully in the second half of the term. Seeing it stated before you sign is better than discovering it afterwards.

That front-loading is also the whole case for prepaying early. A rupee paid into the principal in year two removes eighteen years of compounding interest on that rupee; the same rupee in year sixteen removes four. The prepayment tool works out the difference for a specific loan, and the answer is usually large enough to change behaviour.

Tenure deserves the same scrutiny. Stretching a loan from fifteen years to twenty cuts the instalment by a comfortable-looking amount and raises the total interest by far more than the saving. The instalment is what you feel monthly; the total is what the house actually costs.

Registration, stamp duty, legal fees and the processing charge sit outside all of this and are paid from your own funds alongside the down payment.`,
    steps: [
      "Enter the property price and the share of it you can pay upfront.",
      "Set the rate you have been quoted and the tenure you are considering.",
      "Read the first-year interest and principal lines before anything else.",
      "Try the same loan five years shorter and compare the total interest, not the instalment.",
    ],
    faq: [
      {
        q: "Why is almost nothing coming off the principal in the first year?",
        a: "Because interest is charged on the outstanding balance, and in year one that balance is at its maximum. The instalment is constant but its composition shifts, and the principal share only becomes substantial in the later half of the term.",
      },
      {
        q: "Should I take the longest tenure available?",
        a: "Only if the shorter instalment is genuinely necessary. A longer tenure lowers the monthly figure and raises the total cost sharply — compare the two totals here before deciding, because the instalment alone hides the difference.",
      },
      {
        q: "What costs are not in this calculation?",
        a: "Stamp duty, registration, legal and valuation fees, the processing charge, and any insurance the lender bundles. They are paid from your own funds on top of the down payment, and together they are rarely trivial.",
      },
      {
        q: "Does the interest give me a tax deduction?",
        a: "Under the old regime, interest on a self-occupied property is deductible within a statutory limit and the principal repayment counts towards 80C. The new regime does not allow either for a self-occupied property, which changes the real cost of the loan considerably.",
      },
    ],
  },

  "car-loan-emi-calculator": {
    intro: `A car loan is usually agreed against a number nobody quotes first. The ex-showroom price is what the advertisement says; what you actually finance is the on-road price, which adds registration, road tax, insurance and whatever the dealer has attached to the deal. This tool starts from the ex-showroom figure and lets you set the on-road uplift, because that is where the loan really begins.

Alongside the instalment it prints something most calculators leave out: what the car is worth when the loan ends. A vehicle losing fifteen per cent of its value each year is worth under half its on-road price after five years, while you have paid the full price plus interest. The line showing total paid minus residual value is the honest cost of the arrangement, and it is a number worth seeing before choosing a longer tenure to make the instalment comfortable.

Longer tenures are precisely where car loans go wrong. Stretching to seven years lowers the monthly figure and raises both the total interest and the period during which you owe more than the car is worth. Being underwater on a depreciating asset matters the moment you need to sell it or it is written off.

One more thing to check. Dealer finance is frequently quoted as a flat rate, which is not comparable to the reducing rate a bank quotes and is close to twice as expensive as it sounds. Put the flat quote through the flat versus reducing tool before comparing it against anything.

Insurance renews annually for the life of the car and is not part of the instalment.`,
    steps: [
      "Enter the ex-showroom price, then set the uplift for registration, road tax and insurance.",
      "Put in your down payment and the rate you have been offered.",
      "Read the instalment, then look at the residual value line at the bottom.",
      "If the dealer quoted a flat rate, convert it first — it is not comparable to a bank's quote.",
    ],
    faq: [
      {
        q: "What is the difference between ex-showroom and on-road price?",
        a: "Ex-showroom is the vehicle alone. On-road adds registration, road tax, insurance and any dealer handling or accessories. The gap is typically ten per cent or more, and the loan is written against the larger figure.",
      },
      {
        q: "Why does the tool show depreciation?",
        a: "Because a car is an expense, not an investment, and the instalment alone conceals that. The line comparing everything you paid against what the car is worth at the end is the real cost of owning it over the term.",
      },
      {
        q: "Is a seven-year car loan a bad idea?",
        a: "It lowers the instalment and raises the total interest, and it extends the period during which the outstanding balance exceeds the car's value. That matters if the vehicle is stolen, written off, or simply needs replacing sooner than planned.",
      },
      {
        q: "Should I take the dealer's finance?",
        a: "Compare it properly first. Dealer offers are often quoted flat, which makes the rate look roughly half of what it effectively is. Convert the quote before deciding.",
      },
    ],
  },

  "loan-prepayment-calculator": {
    intro: `Paying extra into a loan saves interest, and the amount saved is far larger than most people assume — but only if the extra money arrives early. This runs the loan month by month, with and without the prepayment, and reports the difference.

Two things change the answer. The first is timing. Because early instalments are almost entirely interest, a part payment in year two removes many years of compounding on that amount, while the same payment in year fifteen removes only a few. The tool takes the month you make the payment as an input for exactly this reason: the same rupee is worth several times more at month twenty-four than at month one-eighty.

The second is what the lender does with the saving. Reducing the tenure keeps the instalment where it is and ends the loan sooner. Reducing the instalment keeps the end date and lowers the monthly outgo. The first saves substantially more, because the money stays out of the loan for the whole remaining term rather than being handed back to you month by month. Lenders often default to the second without asking, so it is worth stating your preference in writing.

The output also divides interest saved by the extra money put in, which is the cleanest way to compare prepaying against investing the same amount elsewhere. If a rupee prepaid saves you two rupees of interest over the term, an investment would have to beat that to be the better use of the money.

Check the loan agreement for a prepayment charge before acting. Floating-rate home loans to individuals cannot carry one; other loans can.`,
    steps: [
      "Enter the loan as it stands: amount, rate and the original tenure.",
      "Set the part payment and the month you would make it — timing changes the answer substantially.",
      "Add anything extra you would pay monthly on top of the instalment.",
      "Choose whether the saving shortens the loan or lowers the instalment, and compare both.",
    ],
    faq: [
      {
        q: "Should I shorten the tenure or reduce the instalment?",
        a: "Shortening the tenure saves considerably more interest, because the money stays out of the loan for the whole remaining period. Reducing the instalment gives you monthly breathing room instead. Run both and read the two totals.",
      },
      {
        q: "How much does timing matter?",
        a: "Enormously. The same part payment made in year two rather than year twelve can save several times as much, because early instalments are almost all interest and prepaying removes the compounding on that amount for every year that follows.",
      },
      {
        q: "Is prepaying better than investing the money?",
        a: "Compare the interest saved per rupee prepaid, which the tool prints, against what you could earn after tax elsewhere. Prepaying is a guaranteed, tax-free return equal to the loan rate, which is a higher bar than it first appears.",
      },
      {
        q: "Will my lender charge me for prepaying?",
        a: "Not on a floating-rate home loan to an individual, where regulation prohibits it. Fixed-rate loans, business loans and many personal loans can carry a charge, so check the agreement first.",
      },
    ],
  },

  "flat-vs-reducing-rate-calculator": {
    intro: `A flat rate charges interest on the full original amount for the full term, regardless of how much you have already repaid. A reducing rate charges only on what is still outstanding. The same percentage means something entirely different under each, and the gap is roughly a factor of two.

Consider a five-lakh loan over five years at a flat seven per cent. The interest is thirty-five thousand a year for five years — a hundred and seventy-five thousand — even though by the final year you owe barely a fifth of the original amount and are still paying interest as if you owed all of it. Expressed as a reducing rate, which is how banks and regulators quote loans, that same deal is closer to twelve and a half per cent. The instalment is identical; only the honesty of the description differs.

This tool solves for that equivalent rate. There is no formula for it, so it searches for the reducing rate that produces exactly the same instalment as the flat quote, which is the only meaningful basis for comparison. Enter a competing reducing-rate offer in the last field and it will tell you which of the two loans is actually cheaper.

Flat quoting is most common in dealer vehicle finance, consumer durable loans, gold loans from smaller lenders, and much informal lending. It is not illegal and it is not always a bad deal — but a flat seven and a reducing eleven are not what they appear to be relative to each other, and choosing between them on the quoted numbers alone reliably picks the worse one.

Ask any lender to state the annualised reducing rate before comparing offers.`,
    steps: [
      "Enter the loan amount, the flat rate you were quoted and the tenure.",
      "Read the equivalent reducing rate — that is what the loan actually costs.",
      "Put a competing bank's reducing-rate quote into the last field.",
      "Compare the two totals rather than the two headline percentages.",
    ],
    faq: [
      {
        q: "Why is the equivalent rate almost double the flat rate?",
        a: "Because you repay the loan gradually but are charged interest on the whole original amount throughout. By the end you owe very little and are still paying interest on the full sum, which roughly doubles the effective cost.",
      },
      {
        q: "Where will I run into flat rates?",
        a: "Dealer vehicle finance, consumer durable loans at the point of sale, some gold loans and much informal lending. Banks quoting home and personal loans use reducing rates.",
      },
      {
        q: "Is a flat rate ever the better deal?",
        a: "It can be, if the flat number is low enough. Seven per cent flat over five years is worse than eleven per cent reducing; five per cent flat might not be. Convert first, then compare.",
      },
      {
        q: "How does the tool find the equivalent rate?",
        a: "It searches for the reducing rate that produces exactly the same monthly instalment as the flat quote, narrowing the range until the two match. There is no closed formula, which is why so few comparisons are done by hand.",
      },
    ],
  },

  "home-loan-eligibility-calculator": {
    intro: `No lender decides a home loan by looking at the property first. They look at income, subtract the instalments you already pay, and allow a share of what remains to go towards a new instalment. That share is the fixed obligation to income ratio, and this tool runs the same arithmetic backwards to arrive at the loan it supports.

Fifty per cent is a common figure and it moves with income — lenders often allow less of a modest salary and more of a large one, on the reasoning that a household with a bigger surplus can carry a higher proportion. Existing instalments come off the top before the ratio is applied, so a car loan does not merely reduce the amount you can borrow; it reduces it by many times its own size. An instalment of twenty thousand can easily cost you twenty-five lakh of eligibility.

The second constraint is the loan-to-value ratio, which caps the loan as a share of the property's assessed value rather than its asking price. The tool converts the eligible loan into the property price it reaches at the ratio you set, and shows the deposit that leaves you to find. Where the two constraints disagree, the smaller one binds — a household may be able to service a larger loan than the property will secure, or the reverse.

Treat the result as the lender's starting arithmetic rather than its answer. Credit history, employment type, the age at which the tenure ends, the property's own valuation and the lender's appetite that quarter all move the final sanction, and almost always downwards.`,
    steps: [
      "Enter your monthly income and every instalment you are already committed to.",
      "Set the share of income the lender allows towards instalments, if you have been told it.",
      "Put in the rate and tenure you are being offered.",
      "Read the property figure and the deposit it implies, then check it against what you actually have.",
    ],
    faq: [
      {
        q: "What is the fixed obligation to income ratio?",
        a: "The share of your monthly income a lender will allow to go towards loan instalments in total, existing ones included. Around fifty per cent is common, though lenders vary it by income level and by their own policy.",
      },
      {
        q: "Why does a small existing loan reduce my eligibility so much?",
        a: "Because it comes off the instalment you can afford, and every rupee of instalment supports many rupees of loan. Clearing a modest car loan before applying often raises the sanction by far more than the loan's outstanding balance.",
      },
      {
        q: "Can I borrow the full price of the property?",
        a: "No. Lenders fund a share of the assessed value, commonly around eighty per cent for mid-sized loans and less for larger ones, so the balance plus all the transaction costs has to come from you.",
      },
      {
        q: "Does adding a co-applicant help?",
        a: "Usually, because the incomes combine and so does the instalment capacity. It also makes the co-applicant jointly liable for the whole loan, which is a commitment worth understanding before signing.",
      },
    ],
  },

  "income-tax-calculator": {
    intro: `This works out tax under both Indian regimes and prints them side by side, because choosing between them is the only decision most salaried people actually have to make here.

The calculation is shown slab by slab rather than as a single figure. Each band of income is taxed at its own rate — the thirty per cent band applies only to income above its threshold, never to the whole amount — and a surprising number of people believe crossing a slab boundary raises the tax on everything below it. Seeing the bands listed with their own amounts settles that permanently.

Two features deserve care. The section 87A rebate wipes out the liability entirely below a threshold of taxable income, which creates a genuine cliff: a rupee of extra income near that line can cost far more than a rupee of tax. Marginal relief exists to soften the edge and is not modelled here, so figures immediately above the threshold read slightly harsher than they finally are. The other is that deductions beyond the standard one belong almost entirely to the old regime — enter them and the new-regime calculation correctly ignores them rather than quietly applying deductions that do not exist there.

The comparison at the bottom runs your figures through the other regime and names the cheaper one. For most people with few deductions the new regime wins comfortably; for someone with a large housing loan interest claim, a full 80C, health premiums and rent, the old one can still come out ahead. There is no rule of thumb that beats running both.

Slabs are statute and this page states the financial year it encodes rather than assuming it is current.`,
    steps: [
      "Enter your gross salary for the year, before any deductions.",
      "Pick a regime — the other one is computed automatically for comparison.",
      "If you are on the old regime, add up your deductions and enter the total.",
      "Read the slab table, then the comparison at the bottom naming the cheaper regime.",
    ],
    faq: [
      {
        q: "Does crossing into a higher slab raise the tax on all my income?",
        a: "No. Each slab rate applies only to the income within that band. The slab table prints the amount taxed at each rate so you can see exactly how much falls where.",
      },
      {
        q: "Which regime should I choose?",
        a: "Run both, which this does automatically. With few deductions the new regime almost always wins. With a substantial housing loan interest claim, a full 80C, medical premiums and rent, the old one can still be cheaper.",
      },
      {
        q: "What is the rebate and why does it create a cliff?",
        a: "Section 87A removes the liability entirely for taxable income below a threshold. Just above it the tax appears in full, so a small rise in income can cost disproportionately. Marginal relief softens this in practice and is not modelled here.",
      },
      {
        q: "Which financial year does this use?",
        a: "The year is stated on every result, and the figures are not updated automatically after a Budget. Check the stated year against the one you are filing for before relying on the output.",
      },
    ],
  },

  "salary-calculator": {
    intro: `Cost to company and take-home pay are different numbers, and the distance between them is where most offer letters cause disappointment. This starts at the CTC and works down to what reaches the bank each month.

Three things come out before you ever see the salary. The employer's provident fund share is part of the package but goes into your fund, not your account. The gratuity provision is set aside against an entitlement you only receive after five years, and never if you leave sooner. Some companies also count insurance premiums and meal cards inside CTC. What is left after all of that is the gross salary, and it is often eighty-five per cent or less of the headline figure.

From gross, your own provident fund contribution, professional tax and income tax come off. The last of those depends on which regime you are on, so the regime selector matters — and your own fund contribution is deductible under the old regime only, which the calculation handles rather than making you adjust for it.

The basic pay percentage is the input people most often set wrongly, and it moves the answer in both directions. A higher basic raises the provident fund contributions, which reduces take-home now and increases retirement savings, and it raises the gratuity provision too. Companies typically set it somewhere around forty per cent of fixed pay, but it varies enough that the offer letter is the only reliable source.

Every company splits a package differently. Use this against your own letter rather than as a general rule.`,
    steps: [
      "Enter the CTC exactly as the offer letter states it.",
      "Set the basic pay percentage from the letter's own breakdown if it gives one.",
      "Put the variable or bonus portion in separately — it does not arrive monthly.",
      "Pick your regime and add old-regime deductions if you claim them.",
    ],
    faq: [
      {
        q: "Why is my take-home so much less than the CTC?",
        a: "The employer's provident fund share and the gratuity provision are inside CTC but never reach your account, and then your own fund contribution, professional tax and income tax come out of what is left. Fifteen to thirty per cent of the headline figure typically never appears as salary.",
      },
      {
        q: "Should I want a higher or lower basic pay?",
        a: "A higher basic means more going into the provident fund and a larger gratuity entitlement, at the cost of less cash each month. Which you prefer depends on whether you need the money now or later.",
      },
      {
        q: "Is the bonus included in the monthly figure?",
        a: "No. It is computed and taxed as part of the year, but shown separately, because it arrives once rather than every month and budgeting against it monthly is how people get caught out.",
      },
      {
        q: "Why does my own provident fund contribution reduce my tax?",
        a: "It qualifies under 80C, but only in the old regime. The calculation applies it there and correctly ignores it under the new regime, where the deduction does not exist.",
      },
    ],
  },

  "hra-calculator": {
    intro: `The house rent allowance exemption is the least of three separate figures, which is why guessing at it almost never works. This computes all three, names the one that binds, and shows how much of the allowance stays taxable.

The three are: the allowance you actually receive; the rent you paid minus ten per cent of salary; and half your salary in a metro or forty per cent elsewhere. Salary here means basic pay plus dearness allowance, not your gross package — using gross is the single commonest error and it inflates the exemption substantially.

Knowing which figure binds tells you what to do about it. If the allowance itself is the smallest, paying more rent changes nothing and the fix is a restructured salary. If the fifty per cent cap binds, the same applies. Only when rent minus ten per cent of salary is the smallest does additional rent increase the exemption, and even then only up to the point where one of the other two takes over. The tool names the binding constraint for this reason.

A few conditions sit outside the arithmetic. The exemption requires that you actually pay rent for accommodation you occupy and do not own. Annual rent above one lakh requires the landlord's permanent account number. Rent paid to a parent is allowed if it is genuinely paid and the parent declares it as income; rent claimed against a spouse is routinely disallowed.

The largest condition of all is the regime. The exemption exists only under the old regime — the new one does not allow it, which for many renters is the deciding factor between the two.`,
    steps: [
      "Enter your monthly basic pay and dearness allowance, not your gross salary.",
      "Enter the allowance you receive and the rent you actually pay.",
      "Set the metro toggle correctly — only Delhi, Mumbai, Kolkata and Chennai count.",
      "Read which of the three figures is binding before trying to increase the exemption.",
    ],
    faq: [
      {
        q: "Which salary figure does the calculation use?",
        a: "Basic pay plus dearness allowance, not gross salary and not CTC. Using a larger figure inflates both the ten per cent deduction and the fifty per cent cap, and produces an exemption you cannot claim.",
      },
      {
        q: "Will paying more rent increase my exemption?",
        a: "Only if rent minus ten per cent of salary is currently the smallest of the three figures, and only until one of the others becomes smaller. The tool names the binding one so you can tell.",
      },
      {
        q: "Which cities count as metros?",
        a: "Delhi, Mumbai, Kolkata and Chennai, and no others. Bengaluru, Hyderabad and Pune are treated as non-metro for this purpose regardless of what rents there suggest.",
      },
      {
        q: "Can I claim this under the new regime?",
        a: "No. The exemption exists only in the old regime, which is often the single largest factor in choosing between the two for someone paying substantial rent.",
      },
    ],
  },

  "gratuity-calculator": {
    intro: `Gratuity is a lump sum an employer pays for long service, and it becomes payable after five continuous years — except where service ends in death or disablement, when the five-year condition falls away. Before that threshold there is simply nothing to compute, and the tool says so rather than returning a figure you cannot claim.

The formula depends on whether the employer is covered by the Payment of Gratuity Act. Under the Act it is fifteen twenty-sixths of the last drawn monthly basic and dearness allowance, multiplied by the years served, on the reasoning that a month contains twenty-six working days. Outside the Act the divisor is thirty rather than twenty-six, which produces a smaller amount for the same service.

Rounding is the other difference and it is worth more than it sounds. Under the Act a part-year of six months or more counts as a whole year; outside it, only completed years count. Someone leaving after ten years and seven months is credited with eleven years under the Act and ten outside it, and the gap is a full month of pay.

A statutory ceiling caps the amount that is exempt from tax for employees outside government service. The tool shows the raw calculation and the capped figure separately, so you can see whether the ceiling is binding — for long service at a senior salary it frequently is, and anything above it is taxable as salary.

The salary to use is the last drawn basic plus dearness allowance, not gross pay and not CTC.`,
    steps: [
      "Enter your last drawn monthly basic plus dearness allowance.",
      "Enter your total service in years, decimals included — the part-year matters.",
      "Set whether the employer is covered by the Act; it changes both the formula and the rounding.",
      "Check whether the statutory cap is binding on your figure.",
    ],
    faq: [
      {
        q: "Do I get anything before five years?",
        a: "Not in the ordinary case. The five-year condition is waived only where service ends because of death or disablement.",
      },
      {
        q: "What does the fifteen over twenty-six mean?",
        a: "Fifteen days of pay for each year of service, with a month treated as twenty-six working days. Employers outside the Act use thirty instead, which yields a smaller amount for identical service.",
      },
      {
        q: "How is a part-year treated?",
        a: "Under the Act, six months or more rounds up to a full year. Outside it, only completed years count. The difference is a whole month of pay for someone leaving just past a half-year.",
      },
      {
        q: "Is gratuity taxable?",
        a: "It is exempt up to the statutory ceiling for non-government employees, and anything above that is taxable as salary. The tool shows both the uncapped and the capped figures so you can see which applies.",
      },
    ],
  },

  "tds-calculator": {
    intro: `Tax deducted at source is your own tax, collected early by whoever is paying you. It is not an extra charge and not a final settlement — it is credited against your liability when you file, and if too much was deducted you get it back.

This works out the deduction for the common sections, shows the threshold below which nothing is deducted, and applies the higher rate that follows when no permanent account number is on file. That last provision catches people out regularly: without a PAN the rate rises to twenty per cent or the section rate, whichever is greater, which on a small commission payment can more than double the deduction.

The section matters more than the amount. A payment of a lakh attracts ten per cent as professional fees under 194J, two per cent as technical services under the same section, one or two per cent as a contract payment under 194C depending on who is receiving it, and two per cent as commission under 194H. Choosing the wrong section is the usual reason a deduction looks wrong on a statement.

Thresholds move more often than rates, typically at each Budget, and they are per section and sometimes per transaction as well as per year. The tool prints the threshold it holds and states the year it belongs to rather than treating it as permanent, and the rate can be overridden where a lower deduction certificate applies or where you know the current figure differs.

Check the deduction against your annual statement before filing; that statement, not the payer's word, is what the department recognises.`,
    steps: [
      "Enter the payment amount and choose the section that actually applies to it.",
      "Confirm whether a permanent account number is on file — it changes the rate sharply.",
      "Override the rate if you hold a lower deduction certificate or know the current figure differs.",
      "Check the threshold line to see whether deduction is triggered at all.",
    ],
    faq: [
      {
        q: "Is this an extra tax?",
        a: "No. It is an advance instalment of the tax you already owe, collected by the payer. When you file, it is credited against your liability, and any excess is refunded.",
      },
      {
        q: "What happens without a PAN?",
        a: "The rate rises to twenty per cent or the section rate, whichever is higher. On low-rate sections this more than doubles the deduction, and the credit is also harder to claim.",
      },
      {
        q: "How do I know which section applies?",
        a: "By the nature of the payment: professional fees, contract work, commission, rent, interest and dividend each have their own. Where a payment could plausibly fall under two, the classification is the payer's responsibility and worth agreeing in writing.",
      },
      {
        q: "Why does the tool let me override the rate?",
        a: "Because thresholds and rates are amended at Budgets, and because a lower deduction certificate can authorise a reduced rate for a specific payee. The stated year tells you what the built-in figures encode.",
      },
    ],
  },

  "inflation-calculator": {
    intro: `Inflation works exactly like compound interest, pointed the wrong way. This shows both directions: what something costing a given amount today will cost after a run of years, and what today's money will still buy by then.

The second figure is the more uncomfortable one. At six per cent, money loses about forty-four per cent of its purchasing power over ten years and about seventy per cent over twenty. A retirement corpus that looks generous in today's terms is being planned for a future in which each rupee buys a third of what it does now, which is why any long-horizon plan built on today's expenses without inflating them is badly wrong from the start.

Enter your expected return in the last field and the tool also computes the real return — what you gain after inflation has taken its share. It uses the proper relation rather than subtracting one rate from the other, and prints both so the difference is visible. Subtraction is a decent approximation at low rates and drifts noticeably as the numbers rise; at twelve per cent against six, the honest figure is about 5.66 per cent rather than six.

A caution about which rate to use. Headline inflation is an average across a basket that may look nothing like yours. Education and healthcare costs in India have run well ahead of the general index for years, so a school fee projection or a medical corpus deserves a materially higher rate than a grocery bill does. Running the same amount at two rates and treating the answer as a range is more honest than a single figure.`,
    steps: [
      "Enter what the thing costs today and the inflation rate you think applies to it.",
      "Set the number of years you are projecting over.",
      "Read both the future cost and what today's money will buy by then.",
      "Add your expected return to see the real rate, and compare it against the rough subtraction.",
    ],
    faq: [
      {
        q: "What inflation rate should I use?",
        a: "It depends on what you are buying. General inflation is one figure; education and healthcare have run well above it in India for years. For those, use a higher rate, and treat the result as a range rather than a point.",
      },
      {
        q: "Why not just subtract inflation from my return?",
        a: "Subtraction is an approximation that drifts as rates rise. The correct relation divides rather than subtracts, and the tool prints both so you can see the size of the error for your own numbers.",
      },
      {
        q: "Does this predict future prices?",
        a: "No. It applies the rate you supply. Whether that rate turns out to be right is a question about the economy, not about the arithmetic.",
      },
      {
        q: "How does this change how much I need to save?",
        a: "Substantially. A goal stated in today's money has to be inflated to the year you will spend it before you work out what to save, or you will arrive with a corpus that buys far less than you planned for.",
      },
    ],
  },

  "retirement-calculator": {
    intro: `Retirement planning has two halves and most calculators only do one properly. The first is working out what the corpus needs to be; the second is working out the monthly amount that builds it. This does both, and it uses a real rate of return for the drawdown half, which is where the usual arithmetic goes wrong.

Here is why that matters. Once retired, your expenses keep rising with inflation while the corpus earns a nominal return. Discounting the withdrawals at the nominal rate ignores that rising cost and can understate the corpus needed by a third or more. Using the real rate — the return after inflation is stripped out — models a corpus that keeps pace with a cost of living that will not stand still. The tool prints the real rate it derived so you can see how small it is: seven per cent against six per cent inflation is under one per cent in real terms, which is a sobering figure and an accurate one.

The expense figure is stated in today's money and inflated to the retirement date, which is the only way to ask the question sensibly. Sixty thousand a month today at six per cent inflation is roughly three and a half lakh a month in thirty years — a number that looks absurd until you remember what sixty thousand bought thirty years ago.

The corpus is built to reach zero at the age you set. Outliving that age is the risk this does not cover, which is the argument for targeting a corpus that generates income without depleting, or for buying an annuity with part of it.`,
    steps: [
      "Enter your age, the age you plan to retire, and the age to plan until.",
      "State your monthly expense in today's money — the tool inflates it for you.",
      "Set separate returns for building and for retirement; the second should be lower.",
      "Add whatever is already saved, then read the corpus and the monthly amount together.",
    ],
    faq: [
      {
        q: "Why is the corpus so much larger than I expected?",
        a: "Because expenses keep rising after you retire while the corpus earns only a modest real return. Discounting at the nominal rate instead of the real one is the usual reason other estimates come out lower, and it is the wrong way to do it.",
      },
      {
        q: "What age should I plan until?",
        a: "Longer than you expect to need. Planning to eighty-five and living to ninety-two is a bad way to discover the limit of a plan. Some people avoid the question entirely by targeting a corpus that is never drawn down.",
      },
      {
        q: "Should the return be the same before and after retiring?",
        a: "No. Portfolios usually shift towards stability as retirement approaches, so the second figure should be lower. The gap between them is one of the more consequential assumptions here.",
      },
      {
        q: "What is the real rate the tool prints?",
        a: "The return after inflation has been removed, computed properly rather than by subtraction. It is often startlingly small, and it is the number that actually governs how long a corpus lasts.",
      },
    ],
  },

  "brokerage-calculator": {
    intro: `The difference between a trade's gross profit and what reaches your account is a stack of charges, most of them statutory and none of them optional. This itemises every one and works out the price move needed just to break even.

The lines are brokerage, securities transaction tax, the exchange transaction charge, the regulator's turnover fee, stamp duty, goods and services tax on the first three of those, and depository charges on a delivery sale. Each appears separately so you can check it against a real contract note rather than accepting a single total. That matters because brokers occasionally get one wrong, and a bundled figure makes it impossible to notice.

The segment changes the arithmetic more than anything else. Securities transaction tax on delivery is charged on both the buy and the sell; on intraday it applies to the sell alone and at a quarter of the rate. Stamp duty differs too. So the same price movement produces materially different net results depending on how the position was held, which is one reason intraday costs look deceptively low until the brokerage on frequent trading is added up.

The break-even line is the practical output. On a small delivery trade with a discount broker, charges routinely amount to a fraction of a per cent of turnover — which sounds negligible until you notice that a stock has to move that much before you have made anything at all. On very small positions the fixed depository charge alone can dominate.

Statutory rates are re-notified from time to time and the year encoded is stated on the result. Set brokerage to zero for a discount broker's delivery trade.`,
    steps: [
      "Enter the buy price, the sell price and the quantity.",
      "Choose delivery or intraday — it changes the transaction tax and stamp duty.",
      "Set your broker's own rate and cap, or leave the rate at zero for free delivery.",
      "Read the itemised charges and the break-even move before placing the trade.",
    ],
    faq: [
      {
        q: "Why do delivery and intraday cost such different amounts?",
        a: "Securities transaction tax on delivery applies to both sides of the trade; on intraday it applies only to the sell, at a much lower rate. Stamp duty differs as well, and delivery adds a depository charge on the sale.",
      },
      {
        q: "What is the break-even move?",
        a: "The per-share price rise needed to cover every charge on the round trip. Below it the trade loses money even though the price went up, which is the figure most worth knowing before entering a small position.",
      },
      {
        q: "Are these rates current?",
        a: "They encode the year printed on the result, and statutory charges are re-notified periodically. Every line is itemised so you can check each against your own contract note rather than trusting a total.",
      },
      {
        q: "Why is my broker's charge different?",
        a: "Because brokerage is the one line that is not statutory. Discount brokers commonly charge nothing on delivery and a flat cap on intraday; full-service brokers charge a percentage. Set the field to match your own arrangement.",
      },
    ],
  },
};
