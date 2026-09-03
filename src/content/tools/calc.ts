import type { ToolContent } from "@/lib/tools/types";

/**
 * SEO prose for the Calculators & Generators tools. Server-only.
 */
export const CALC_CONTENT: Record<string, ToolContent> = {

  "bmi-calculator": {
    intro: `Body mass index divides weight by the square of height. It was devised in the 1830s by a Belgian statistician studying populations, and it was never intended as a measure of an individual's health — a fact worth holding onto before reading anything into the number it produces.

This calculator asks for a height and a weight, each with its own unit. There is no metric or imperial switch anywhere on it, and that is deliberate. Plenty of people give their height in feet and inches and their weight in kilograms, which is entirely normal in India and belongs to neither system. Asking someone to choose a system forces them to answer a question they do not have, so each measurement carries its own unit picker and any combination works.

The result includes the healthy weight range for your height, reported in the units you typed rather than converted into something else. That range is usually more useful than the index itself, since it answers the question people actually have.

What BMI genuinely tells you: whether your weight is unusual for your height, in a population sense. What it does not: anything about body composition. Muscle is denser than fat, so a fit and muscular person is routinely classified as overweight by a formula that cannot distinguish the two. It also takes no account of where weight is carried, and abdominal fat carries substantially more risk than the same weight elsewhere.

The thresholds themselves were derived from European and North American populations, and health bodies in India and across Asia use lower cut-offs — overweight from 23 rather than 25 — because cardiometabolic risk appears at a lower index in South Asian populations. A single global set of thresholds was never going to fit everybody.

Treat it as one rough number among several, not as a verdict.`,
    steps: [
      "Enter your height and pick its unit — centimetres, or feet and inches, whichever you think in.",
      "Enter your weight and pick its unit independently. Feet with kilograms is a perfectly ordinary combination.",
      "Read the index, and then the healthy weight range for your height, which is reported in the units you typed.",
      "Treat the result as a rough population statistic rather than an assessment of your health.",
    ],
    faq: [
      {
        q: "Can I give my height in feet and my weight in kilograms?",
        a: "Yes, and that combination is common in India. Every measurement here carries its own unit, so there is no system to choose and no conversion to do in your head first.",
      },
      {
        q: "Is BMI accurate for everybody?",
        a: "No. It cannot distinguish muscle from fat, so athletes are routinely classified as overweight. It ignores where weight is carried, though abdominal fat carries far more risk. And it was derived from European populations, which is why Asian health bodies use lower thresholds.",
      },
      {
        q: "What counts as a healthy BMI?",
        a: "The widely used range is 18.5 to 25. Indian and other Asian guidelines set the upper bound at 23, because risk appears at a lower index in South Asian populations. Which applies to you depends on which guidance your doctor follows.",
      },
      {
        q: "Should I be worried about my number?",
        a: "Not on its own. BMI is a rough population statistic, and a single figure derived from two measurements cannot assess an individual. Waist measurement, blood pressure and blood tests all tell a doctor more.",
      },
    ],
  },

  "percentage-calculator": {
    intro: `Percentages are simple arithmetic that people get wrong constantly, usually because the question is ambiguous rather than because the sum is hard. This handles the several distinct calculations that all get called "percentage".

What is fifteen per cent of 240? What percentage is 36 of 240? What is the change from 240 to 276? Those are three different formulas and this does each of them, which removes the step where you work out which one you meant.

The distinction that causes the most trouble is percentage change against percentage points. If an interest rate moves from four per cent to five, that is a rise of one percentage point and an increase of twenty-five per cent. Both statements are true and they describe the same event; reporting that mixes them is either careless or deliberately misleading, and it is worth noticing which.

The second common error is assuming percentage changes reverse. A price that falls forty per cent and then rises forty per cent does not return to where it started — it ends at 84 per cent of the original, because the rise is calculated on the reduced figure. This is why a stock that halves needs to double to recover, and it is the arithmetic behind a great many disappointing investment stories.

The third is compounding two increases. A twenty per cent rise followed by a ten per cent rise is not thirty per cent; it is 32, because the second applies to the already-increased amount. The same is true of successive discounts, which is why stacking "twenty per cent off" and "ten per cent off" gives twenty-eight per cent off rather than thirty.`,
    steps: [
      "Choose the calculation that matches your question — a share of a total, a proportion, or a change between two figures.",
      "Enter the numbers and read the result.",
      "For a change, check whether you want percentage change or percentage points, since they answer different questions.",
      "Where two changes stack, apply them in sequence rather than adding them together.",
    ],
    faq: [
      {
        q: "What is the difference between a percentage and a percentage point?",
        a: "A rate moving from four to five per cent has risen by one percentage point and by twenty-five per cent. Both are correct descriptions of the same change, and confusing them is how figures get made to sound larger or smaller than they are.",
      },
      {
        q: "Why does a forty per cent drop and a forty per cent rise not cancel out?",
        a: "Because the rise is calculated on the reduced amount. Something that falls forty per cent to 60 and then rises forty per cent reaches 84, not 100. This is why a halved investment needs to double to recover.",
      },
      {
        q: "Do two discounts add together?",
        a: "No. Twenty per cent off followed by ten per cent off is twenty-eight per cent off, not thirty, because the second applies to the already-discounted price. The same compounding applies to successive increases.",
      },
      {
        q: "How do I work out what percentage one number is of another?",
        a: "Divide the part by the whole and multiply by a hundred. The usual mistake is dividing the wrong way round, which the labelled fields here prevent.",
      },
    ],
  },

  "discount-calculator": {
    intro: `Working out what a discount actually saves takes a moment, and shops rely on that moment. This calculates the final price and the amount saved from an original price and a discount, and handles the stacked cases that are genuinely hard to do in your head.

Successive discounts are the case worth understanding. Twenty per cent off followed by a further ten per cent is not thirty per cent off. The second reduction applies to the already-reduced price, so the combined effect is twenty-eight per cent. That gap widens as the numbers grow: fifty and then fifty is seventy-five per cent off, not a hundred, which is obvious once stated and is exactly how such offers are meant to be read quickly and misread.

Working backwards is the calculation that catches out anyone pricing something. To make a fifty rupee margin on an item you sell at a twenty per cent discount, the list price is not the target plus twenty per cent — it is the target divided by 0.8. Adding a percentage and removing it are not inverse operations, and the difference grows with the rate.

The other figure worth having is the effective discount on a bundle. Buy-one-get-one is fifty per cent off if you wanted both items and zero per cent off if you did not, and a three-for-two is a third off on the same terms. The calculator can tell you the rate; only you can say whether you needed the second one.

The most useful discount question is usually the total spend rather than the percentage. Thirty per cent off a thing you do not need is a hundred per cent of a wasted amount.`,
    steps: [
      "Enter the original price and the discount percentage.",
      "Read the final price and the amount saved.",
      "Apply stacked discounts in sequence rather than adding them together.",
      "To work backwards from a target price, divide by one minus the discount rather than adding the percentage on.",
    ],
    faq: [
      {
        q: "Do stacked discounts add up?",
        a: "No. Twenty per cent then ten per cent is twenty-eight per cent off, because the second applies to the reduced price. Fifty then fifty is seventy-five per cent off, not a hundred.",
      },
      {
        q: "How do I set a list price to hit a target after discount?",
        a: "Divide the target by one minus the discount rate. For a target of 400 at twenty per cent off, the list price is 400 divided by 0.8, which is 500 — not 480.",
      },
      {
        q: "What is buy-one-get-one worth as a percentage?",
        a: "Fifty per cent off if you genuinely wanted both, and nothing at all if you did not. Three-for-two is a third off on the same condition. The arithmetic is straightforward; whether you needed the second item is the actual question.",
      },
      {
        q: "Does this handle tax?",
        a: "Not directly — it works on the price you give it. Use the GST calculator for the tax component, being careful about whether the price you started with was inclusive or exclusive.",
      },
    ],
  },

  "tip-calculator": {
    intro: `Working out a tip and splitting a bill is arithmetic under social pressure, which is precisely when arithmetic goes wrong. This does both, including the per-person figure when the bill is shared.

Tipping conventions vary enormously and the calculator has no opinion about which applies to you. In the United States, fifteen to twenty per cent is expected and staff wages are set on the assumption it will be paid. Across most of Europe, service is generally included and rounding up is the norm. In India, five to ten per cent is common in restaurants, and many now add a service charge to the bill already — which is worth checking before adding a tip on top, since paying twice is easy to do without noticing.

The service charge question comes up often enough to be worth stating clearly: a service charge is a charge levied by the restaurant, not a tip paid to the server, and the two are not the same money. In India a service charge is not legally mandatory and can be declined. Whether the staff receive it depends entirely on the establishment.

On splitting, an equal split is the least awkward option and is fair when everyone ate similarly. When one person had considerably more, splitting the bill by item and the tip equally is the arrangement most people find reasonable — the service was the same for everyone at the table.

Rounding up to a convenient number is nearly always worth the small extra. It makes the payment simpler for everyone and the difference is trivial.`,
    steps: [
      "Enter the bill total.",
      "Check the bill for a service charge before adding anything, since some establishments include one already.",
      "Set the tip percentage according to local convention rather than a default.",
      "Enter the number of people to get the per-person figure, then round up to something convenient.",
    ],
    faq: [
      {
        q: "How much should I tip in India?",
        a: "Five to ten per cent is common in restaurants where no service charge has been added. Many now include one, so check the bill first — adding a tip on top of a service charge means paying twice.",
      },
      {
        q: "Is a service charge the same as a tip?",
        a: "No. A service charge is levied by the restaurant and whether staff receive it depends on the establishment. In India it is not legally mandatory and can be declined. A tip is money you choose to give.",
      },
      {
        q: "Should the tip be calculated before or after tax?",
        a: "Convention varies and the difference is small. Calculating on the pre-tax subtotal is the more common practice where it is distinguished at all, and nobody will notice either way.",
      },
      {
        q: "How should we split an uneven bill?",
        a: "By item for the food, and equally for the tip. The service was the same for everyone at the table, which is the arrangement most people find fair when one person ate considerably more.",
      },
    ],
  },

  "unit-converter": {
    intro: `Converting between units is arithmetic anyone can do and nobody wants to. This handles length, mass, area, volume, speed, temperature, data size, pressure, energy and time, in whichever direction you need.

Each quantity has its own pair of unit menus, generated from the same conversion table the calculation uses. That sounds like an implementation detail and it is the reason the tool works: an earlier version offered ten quantities but only ever accepted units of length, so nine of them silently produced nonsense. A control that changes nothing, or that quietly changes what its neighbours mean, is worse than no control at all, and the arrangement here makes that failure impossible to reintroduce.

Temperature is the one quantity that is genuinely different. Every other conversion here is a multiplication, because the scales share a zero — nought metres is nought feet. Celsius and Fahrenheit do not, so their conversion needs an offset as well as a factor, and it is why 0°C is 32°F rather than 0°F. Kelvin shares its zero with nothing else at all.

Data size carries an ambiguity worth knowing about. A kilobyte is 1,000 bytes by the SI definition and 1,024 by the older binary convention, and both are in use: storage manufacturers sell in the first, operating systems frequently display the second, and the discrepancy is why a one-terabyte drive shows as 931 gigabytes. The unambiguous binary units are kibibyte, mebibyte and gibibyte, which almost nobody says out loud.

Where a conversion is exact it is exact — an inch is defined as precisely 25.4 millimetres — and where it is a measured constant the tool carries enough precision that rounding is yours to do rather than ours.`,
    steps: [
      "Pick the quantity you are converting: length, mass, volume, temperature and so on.",
      "Choose the unit you have and the unit you want from the menus for that quantity.",
      "Enter the value and read the result.",
      "For data sizes, check whether you want the decimal or the binary definition — they differ by about seven per cent at gigabyte scale.",
    ],
    faq: [
      {
        q: "Why is temperature handled differently?",
        a: "Because Celsius and Fahrenheit do not share a zero point, so converting needs an offset as well as a multiplication. Every other quantity here starts from the same zero, which is why those conversions are a single factor.",
      },
      {
        q: "Is a kilobyte 1,000 or 1,024 bytes?",
        a: "Both definitions are in use. SI says 1,000; the older binary convention says 1,024. Storage is sold in the first and often displayed in the second, which is why a one-terabyte drive appears as 931 gigabytes.",
      },
      {
        q: "How accurate are the conversions?",
        a: "Exact where the relationship is defined — an inch is precisely 25.4 millimetres by international agreement. Where the factor is a measured constant, enough digits are carried that any rounding is yours to apply.",
      },
      {
        q: "Why does each quantity have its own unit menus?",
        a: "Because a single pair of free-text fields could only ever be right for one quantity. An earlier version worked for length and silently produced nonsense for the other nine, which is the kind of bug that only shows up when someone checks the answer.",
      },
    ],
  },

  "age-calculator": {
    intro: `Working out an exact age is harder than subtracting two years, because months have different lengths and February changes size every four years. This gives the exact interval between a birth date and today, or any date you choose, in years, months and days.

The calculation walks the calendar rather than dividing by 365.25. That distinction matters at the edges: someone born on 31 January is one month old on 28 February in most conventions, and dividing by an average year length gives an answer that is close and wrong. Walking the calendar gives the answer a person would give.

The next birthday countdown is the part most people actually came for, and it handles the 29 February case by falling back to the 28th in common years, which is the convention most jurisdictions use for legal purposes.

Total days lived is included because it is a genuinely interesting number and because it is the figure needed for anything measured in days rather than years — visa durations, residency qualifying periods, some insurance calculations.

The one thing to know about time zones: this uses your device's local date. If you are calculating across a date line, or close to midnight, confirm the reference date is the one you meant. Age is a civil concept tied to a calendar rather than an instant, so the answer depends on which calendar you are asking about.

For intervals between two arbitrary dates rather than a birth date, the date difference calculator on this site is the better fit, since it does not assume one of them is in the past.`,
    steps: [
      "Enter the date of birth.",
      "Leave the second date as today, or set it to work out an age at a particular moment.",
      "Read the exact age in years, months and days, and the total days lived.",
      "Check the next birthday countdown, which handles 29 February by falling back to the 28th in common years.",
    ],
    faq: [
      {
        q: "Why not just divide the days by 365?",
        a: "Because that ignores leap years and the different lengths of months, so it drifts. Walking the calendar month by month gives the answer a person would give, which is the one that matters for an age.",
      },
      {
        q: "How is a 29 February birthday handled?",
        a: "The next birthday falls back to 28 February in common years, which is the convention most legal systems use. Some jurisdictions use 1 March instead, so check if it matters for a formal purpose.",
      },
      {
        q: "Can I work out an age on a past or future date?",
        a: "Yes — set the second date to whatever you need. That is the usual way to answer eligibility questions, where the age on a specific cut-off date is what counts.",
      },
      {
        q: "Does the time zone matter?",
        a: "It can. The calculation uses your device's local date, so near midnight or across a date line the reference day may not be the one you intend. Age is tied to a calendar rather than an instant.",
      },
    ],
  },

  "date-difference-calculator": {
    intro: `Counting the days between two dates is the sort of thing a calendar makes surprisingly hard. This gives the interval in days, weeks, months and years, and it counts working days separately.

Working days is the figure most people want and few calendars provide. Project deadlines, notice periods, delivery estimates and payment terms are usually expressed in business days, and counting them by eye across a month is tedious and error-prone. The tool excludes weekends; public holidays vary by country and by state and are not included, so subtract those yourself for anything contractual.

Inclusive against exclusive counting is the ambiguity that causes real disputes. The gap between Monday and Wednesday is two days if you count the intervals and three if you count the days involved. Contracts, visa conditions and hotel bookings all differ on which they mean, and the difference is exactly one day — which is enough to matter when it decides whether something was filed on time. Read the terms rather than assuming.

Month arithmetic has its own awkwardness. One month after 31 January is not a date that exists, and different systems resolve it differently: some give 28 February, some 3 March. There is no universally correct answer, and it is worth knowing which convention a system uses before relying on a monthly interval near the end of a month.

For an interval from a birth date, the age calculator handles the birthday countdown as well, which is usually what is wanted there.`,
    steps: [
      "Enter the two dates.",
      "Read the total in days, then in weeks, months and years.",
      "Check the working-day count if the period is a business one, and subtract public holidays yourself.",
      "Confirm whether your context counts inclusively or exclusively — the difference is one day and it often matters.",
    ],
    faq: [
      {
        q: "Does the count include both end dates?",
        a: "The primary figure counts the intervals between them, so Monday to Wednesday is two days. Contracts and visa conditions frequently count inclusively instead, making it three. Check the terms, because the difference decides deadlines.",
      },
      {
        q: "Are public holidays excluded from working days?",
        a: "No. Holidays differ by country and often by state, so only weekends are excluded. Subtract the holidays that apply to you for anything contractual.",
      },
      {
        q: "How are months counted when the day does not exist?",
        a: "One month after 31 January has no exact answer, and different systems give 28 February or 3 March. Where a monthly interval near the end of a month matters, find out which convention the relevant system uses.",
      },
      {
        q: "Can I calculate a date a number of days from now?",
        a: "Enter today and the target date to get the interval. For adding a period to a date, work forwards from the result and check it, particularly across month boundaries.",
      },
    ],
  },

  "aspect-ratio-calculator": {
    intro: `An aspect ratio is the relationship between width and height, and keeping it constant is what stops resized images and video from looking stretched. This works out the missing dimension when you know the other one and the ratio.

The everyday use is resizing to fit a space. A 1920 by 1080 video in a 1280-pixel-wide container needs to be 720 tall; the arithmetic is easy and doing it repeatedly is not. Enter what you know, leave the unknown blank, and the ratio does the rest.

It also reduces arbitrary dimensions to their simplest ratio, which is how you find out that an image is 16:9 or that it is 683:384 and therefore not quite what someone told you it was. Those small discrepancies are usually the reason a video has thin black bars on two sides.

The common ratios are worth knowing by sight. 16:9 is standard video and nearly every screen. 4:3 is older television and the format most projectors still default to. 21:9 is ultrawide cinema. 1:1 is square, which social platforms favour because it fills a feed column efficiently. 9:16 is vertical, which is now the dominant format for short video and is 16:9 turned on its side.

For print, the ratio is only half the answer — the other half is pixel density. An image at 1000 pixels wide is four inches at 250 dots per inch and ten inches at 100. Ratio governs the shape, density governs the physical size, and print jobs go wrong when only one has been considered.`,
    steps: [
      "Enter the ratio you need, or two known dimensions to have it worked out.",
      "Fill in whichever of width or height you know and leave the other blank.",
      "Read the missing dimension.",
      "For print, check the pixel density as well — the ratio gives the shape, not the physical size.",
    ],
    faq: [
      {
        q: "Which ratios are standard?",
        a: "16:9 for video and most screens, 4:3 for older television and many projectors, 21:9 for ultrawide cinema, 1:1 for square social posts and 9:16 for vertical video. Anything else usually produces bars on two sides.",
      },
      {
        q: "Why does my video have black bars?",
        a: "Because its ratio differs from the container's. A 4:3 video in a 16:9 frame gets bars at the sides; a 16:9 video in a 4:3 frame gets them top and bottom. The alternative is cropping, which loses content.",
      },
      {
        q: "How do I work out the ratio of an existing image?",
        a: "Enter both dimensions and the ratio is reduced to its simplest form. That is how you discover an image is 683:384 rather than the 16:9 someone claimed, which is usually why it does not quite fit.",
      },
      {
        q: "Does the ratio determine print size?",
        a: "No, only the shape. Physical size comes from pixel density: 1000 pixels is four inches at 250 dpi and ten inches at 100. Both have to be considered before sending anything to print.",
      },
    ],
  },

  "base-converter": {
    intro: `Numbers are written in a base, and the same quantity looks entirely different depending on which one. This converts between binary, octal, decimal, hexadecimal and any base from 2 to 36.

Hexadecimal exists because it maps cleanly onto binary: each hexadecimal digit is exactly four bits, so a byte is always two digits and the conversion is mechanical rather than arithmetic. That is why colours, memory addresses, hashes and byte dumps are all written in hex — it is binary that a person can read.

Binary is where the structure is visible. Bit flags, permissions and masks all make sense in binary and none of them makes sense in decimal. Unix file permissions are the everyday example: 755 in octal is 111 101 101 in binary, which is read-write-execute for the owner and read-execute for everyone else. Each octal digit is exactly three bits, which is precisely why permissions are written in octal in the first place.

Bases above 16 use letters beyond F, running to Z at base 36. Base 36 is occasionally used for short identifiers, since it packs the most information into the alphanumeric characters that are safe everywhere.

Digit grouping makes long binary readable, and the tool applies it to every line rather than only some. Grouping in fours aligns with hexadecimal digits; grouping in eights shows byte boundaries.

One thing a base conversion does not change is the number. Fifteen in decimal, F in hexadecimal and 1111 in binary are the same quantity written three ways, in the same sense that "fifteen" and "quinze" are the same number in two languages.`,
    steps: [
      "Enter the number and say which base it is currently in.",
      "Read the conversions into the other common bases.",
      "Set a custom base for anything outside binary, octal, decimal and hexadecimal.",
      "Switch on digit grouping to make long binary readable — fours for hex alignment, eights for byte boundaries.",
    ],
    faq: [
      {
        q: "Why is hexadecimal used so much in computing?",
        a: "Because each hexadecimal digit is exactly four bits, so a byte is always two digits and converting to binary needs no arithmetic. It is a compact way of writing binary that people can actually read.",
      },
      {
        q: "Why are file permissions written in octal?",
        a: "Because each octal digit is exactly three bits, matching the read, write and execute triple. 755 is 111 101 101, which is the permission set written directly.",
      },
      {
        q: "What is the highest base supported?",
        a: "Base 36, which uses the digits 0 to 9 followed by A to Z. Beyond that there are no conventional characters, though base 62 and base 64 exist with their own defined alphabets.",
      },
      {
        q: "Does converting change the number?",
        a: "No. Fifteen, F and 1111 are the same quantity written in decimal, hexadecimal and binary. Only the notation changes, the way a number does when you say it in another language.",
      },
    ],
  },

  "roman-numeral-converter": {
    intro: `Roman numerals turn up on clock faces, in book chapters, on building dedications, in film credits and in monarchs' names. Reading them is a skill that fades quickly without practice, so converting in both directions is a reasonable thing to want.

The system uses seven letters — I, V, X, L, C, D and M — and works by addition, with a subtractive rule for the awkward cases. Placing a smaller value before a larger one subtracts it, which is why IV is four and IX is nine rather than IIII and VIIII.

The subtractive rule has constraints that are frequently broken. Only I, X and C can be subtracted, and only from the next two values up: I from V and X, X from L and C, C from D and M. So 99 is XCIX, not IC, even though IC is shorter and reads plausibly. The strict form is what the calculator produces and what a validator will accept.

The system has no zero and no way to express a fraction or a negative number, which is a serious limitation for arithmetic and the reason Roman numerals were replaced. It also has no standard notation above 3,999 in the everyday form — larger numbers used an overbar to multiply by a thousand, which is impractical to type.

Historical inscriptions do not always follow the strict rules, and clock faces are the famous exception: many use IIII rather than IV for four, a convention with several competing explanations and no settled one. The converter accepts common non-standard forms when reading, and always produces the strict form when writing.`,
    steps: [
      "Enter a number to get the numeral, or a numeral to get the number.",
      "Read the result. The strict subtractive form is used when writing.",
      "Check that any numeral you are entering follows the rules — only I, X and C may be subtracted.",
      "Note the 3,999 ceiling: above that the system needs an overbar notation that cannot be typed.",
    ],
    faq: [
      {
        q: "Why is 99 written XCIX rather than IC?",
        a: "Because only I, X and C may be subtracted, and only from the next two values up. I can precede V and X, but not C. So 99 is ninety (XC) plus nine (IX).",
      },
      {
        q: "What is the largest number that can be written?",
        a: "3,999 in the everyday form, which is MMMCMXCIX. Larger values used an overbar to multiply by a thousand, a notation that cannot be typed and is rarely seen outside inscriptions.",
      },
      {
        q: "Why do clock faces show IIII instead of IV?",
        a: "A long-standing convention with several competing explanations — visual balance against VIII opposite, casting efficiency, and a superstition about the letters of Jupiter's name among them. None is settled, and the practice persists regardless.",
      },
      {
        q: "Is there a Roman numeral for zero?",
        a: "No. The system has no zero, no fractions in the standard form and no negative numbers, which is a large part of why positional notation replaced it for anything requiring arithmetic.",
      },
    ],
  },

  "number-to-words": {
    intro: `Writing a number out in words is required on cheques, in contracts, on invoices and in legal documents, for a reason that predates computers: words are much harder to alter than digits. A figure can have a nought added; "four thousand" cannot be quietly extended.

This converts a number into its written form, in both the international and the Indian numbering systems.

That distinction is the reason to have this rather than a generic converter. The international system groups digits in threes and counts in thousands, millions and billions. The Indian system groups the first three and then in twos, and counts in thousands, lakhs and crores. Ten million is ten million internationally and one crore in India, and 1,00,000 with that comma placement is one lakh. Neither is more correct; they are different conventions, and an amount written in the wrong one on an Indian cheque will be questioned.

The convention for currency amounts is worth following exactly. Indian cheques are conventionally written as "Rupees Four Lakh Fifty Thousand Only", with the currency first and "Only" at the end. "Only" is not decoration — it prevents anything being appended after the amount, which is the same reason the words are there at all.

Paise or cents are written after the main amount, commonly as "and fifty paise only" or with a fractional notation depending on the document. Hyphenation follows ordinary English: twenty-one through ninety-nine are hyphenated, and "and" appears before the final two digits in the British convention but not the American one.

For a cheque, copy the bank's own format if you have an example. Conventions vary and matching theirs avoids a conversation.`,
    steps: [
      "Enter the number you need written out.",
      "Choose the numbering system — lakhs and crores for Indian documents, millions and billions for international ones.",
      "Copy the words, adding the currency name at the front and “Only” at the end for a cheque.",
      "Check the result against your bank's own example if you have one, since conventions vary slightly.",
    ],
    faq: [
      {
        q: "What is the difference between the Indian and international systems?",
        a: "Grouping and naming. International groups in threes and counts in thousands, millions and billions. Indian groups the first three then in twos, counting in thousands, lakhs and crores. Ten million is one crore.",
      },
      {
        q: "Why write “Only” at the end of a cheque?",
        a: "To stop anything being appended after the amount. It serves the same purpose as writing the figure in words in the first place — words are far harder to alter than digits.",
      },
      {
        q: "How should paise be written?",
        a: "After the main amount, commonly as “and fifty paise only”. Some documents use a fractional form instead. Follow whatever convention the receiving institution uses.",
      },
      {
        q: "Is “and” required before the last two digits?",
        a: "In British usage, yes — one hundred and five. American usage omits it. Both are understood on a cheque, and neither will cause a problem.",
      },
    ],
  },
};
