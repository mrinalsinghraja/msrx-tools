import type { ToolContent } from "@/lib/tools/types";

/**
 * SEO prose for the Text & Data tools. Server-only.
 *
 * House style: write about the actual problem, name the real edge cases, and
 * never pad. A paragraph that would fit any tool on any site is worse than no
 * paragraph, because it teaches Google the page is filler.
 */
export const TEXT_CONTENT: Record<string, ToolContent> = {
  "json-formatter": {
    intro: `JSON arrives ugly. An API returns it on one enormous line, a log file wraps it at column eighty, someone pastes it out of a browser console with the quotes half-escaped. None of that is readable, and reading it is usually the whole task — you are looking for one field, or checking whether the shape matches what your code expects.

This formatter reparses the document and prints it back with consistent indentation, so the structure becomes visible rather than inferred. You can indent with two spaces, four spaces or a tab, and optionally sort every object's keys alphabetically. That last option is more useful than it sounds: two API responses that list their fields in different orders look completely different in a diff, and sorting both makes the real difference obvious.

When the document does not parse, the tool does something most formatters skip. Rather than repeating the browser's message — which is often a truncated snippet and no position at all — it scans the text itself and reports the line and column of the first character that cannot belong to valid JSON. A trailing comma before a closing brace, an unterminated string, a missing bracket: each gets a location you can jump to.

Nothing is uploaded. The document is parsed by your own browser, which means you can safely paste a production payload, an access token or a customer record into it. There is no server to receive them and no log for them to land in.`,
    steps: [
      "Paste your JSON into the input box, or press “Try an example” to see the tool work on a sample document.",
      "Choose your indentation — two spaces, four spaces or a tab — in the options on the right.",
      "Turn on “Sort keys alphabetically” if you are about to compare this document with another one.",
      "Read the formatted result below, then copy it to the clipboard or download it as a .json file.",
      "If the document is invalid, read the error: it names the line and column of the first problem.",
    ],
    faq: [
      {
        q: "Is my JSON sent to a server?",
        a: "No. The parsing and formatting happen in JavaScript inside your browser tab. There is no upload step, no API call and nothing stored, which is why the tool keeps working if you disconnect from the network.",
      },
      {
        q: "How large a document can it handle?",
        a: "Comfortably a few megabytes. The limit is your device's memory rather than any rule we impose. Very large files — tens of megabytes — will make the browser pause while it reparses, so a text editor is a better tool at that size.",
      },
      {
        q: "Why does it say my JSON is invalid when it looks fine?",
        a: "The usual causes are a trailing comma before a closing brace or bracket, single quotes instead of double quotes, an unquoted key, or a stray non-breaking space pasted in from a document. The error message names the line and column, which almost always points straight at one of those.",
      },
      {
        q: "What does sorting keys actually change?",
        a: "Only the order the keys are printed in — the data is identical, since JSON objects are unordered by definition. It exists to make diffs meaningful when two systems emit the same object with the fields in different sequences.",
      },
      {
        q: "Can I format JSON with comments or trailing commas?",
        a: "Not currently. Those belong to JSON5 and JSONC rather than JSON proper, and this tool validates against the strict specification so that what it accepts is what a real parser will accept.",
      },
    ],
  },

  "json-minifier": {
    intro: `Minifying JSON removes every space, newline and indent that a parser does not need. The result is identical data in fewer bytes — typically thirty to fifty per cent smaller for a document that had been pretty-printed, and more than that for deeply nested structures where indentation dominates.

It is worth doing whenever the JSON is going over a wire or into a store that charges by size: an API request body, a config blob in a database column, a payload embedded in a URL or a data attribute, a message on a queue. It is not worth doing to a file a person has to read, and it is pointless before gzip, which will squeeze the whitespace out anyway.

The tool reparses the document rather than stripping whitespace with a regular expression. That distinction matters: a naive strip would happily destroy the spaces inside your string values. Because this one parses and re-serialises, a string containing newlines or indentation survives exactly as written, and anything that would not parse is reported instead of being silently mangled.

The size figures above the result show the before, the after and the percentage saved, so you can see whether the exercise was worth it for your particular document.`,
    steps: [
      "Paste the JSON you want to shrink into the input box.",
      "The minified version appears immediately below — there is nothing to configure.",
      "Check the before and after sizes in the figures above the result.",
      "Copy the result, or download it as a .json file.",
    ],
    faq: [
      {
        q: "Does minifying change my data?",
        a: "No. The document is parsed into values and written back out with no formatting. Every key, value, number and string is preserved exactly, including whitespace that appears inside string values.",
      },
      {
        q: "How much smaller will my JSON get?",
        a: "It depends entirely on how it was formatted. A document indented with four spaces and heavily nested can lose more than half its bytes; one that was already on a single line loses nothing.",
      },
      {
        q: "Should I minify before gzip?",
        a: "There is little point. Gzip compresses repeated whitespace extremely well, so the compressed sizes end up within a few per cent of each other. Minify when the bytes are stored or measured uncompressed.",
      },
      {
        q: "Will it remove my comments?",
        a: "Strict JSON has no comments, so a document containing them will not parse at all. The tool reports the position of the comment rather than quietly deleting it.",
      },
    ],
  },

  "json-validator": {
    intro: `A validator answers one question — will a parser accept this? — and, when the answer is no, says exactly where it stopped. That is most of the value. Malformed JSON almost always fails at a single identifiable character, and the difference between a five-second fix and a twenty-minute hunt is knowing which character.

This validator reports the line and column of the first fault. It finds that position itself by scanning the document, rather than relying on the browser's error message, because those messages vary wildly between browsers and versions — some give a byte offset, some give a truncated excerpt and no position at all.

When the document is valid, the tool describes its shape instead: the root type, how many objects and arrays it contains, the total number of keys, how many scalar values there are and how deeply the structure nests. That summary is a quick sanity check against what you expected. An API that should return a list of twenty items and reports one object at depth two has told you something useful before you have read a single field.

Everything happens in your browser. You can validate a payload containing real customer data or a live token without it leaving the machine.`,
    steps: [
      "Paste the JSON you want to check into the input box.",
      "Read the verdict below: either a confirmation with a structure summary, or an error naming the line and column.",
      "Fix the reported position in your source and paste it again — the check reruns as you type.",
      "Turn off “Show a structure summary” if you only want the pass or fail.",
    ],
    faq: [
      {
        q: "What counts as valid JSON here?",
        a: "The strict specification: double-quoted keys and strings, no trailing commas, no comments, no single quotes, and no unquoted identifiers. If this tool accepts a document, a standards-compliant parser will too.",
      },
      {
        q: "It says line 88, but line 88 looks correct.",
        a: "The reported position is where parsing became impossible, which is often just after the real mistake. An unterminated string on line 80 is only detectable when the parser hits something unexpected further down. Read a little above the reported line.",
      },
      {
        q: "Can it validate against a JSON Schema?",
        a: "Not yet — this checks syntax, not shape. Schema validation is a different job and will be a separate tool.",
      },
      {
        q: "Is it safe to paste a token or a customer record?",
        a: "Yes. The document is parsed by JavaScript running in your own tab. Nothing is transmitted, so there is no server-side copy to worry about.",
      },
    ],
  },

  "json-to-yaml": {
    intro: `YAML is what people write and JSON is what machines emit, which is why this conversion comes up constantly. You have an API response, a Terraform output or a package manifest in JSON, and you need it in a Kubernetes manifest, a GitHub Actions workflow or a Docker Compose file.

The conversion is mostly mechanical — YAML is a superset of JSON — but there is one trap worth knowing about, and this tool gives you a switch for it. YAML's older type inference reads the bare words “yes”, “no”, “on”, “off”, “y” and “n” as booleans. A JSON string of “"no"” becomes a bare “no” in YAML, and some parsers will then hand your program a boolean “false”. Country code “NO”, the answer to a survey question, a two-letter product code: all of them can flip type on the way through. Turning on "Always quote strings" prevents it at the cost of a slightly noisier document.

The tool also disables line wrapping, so long strings and URLs stay on one line rather than being folded across several — folded scalars are valid YAML but they are miserable to diff and easy to mis-edit.

Indentation is yours to choose, and the whole conversion happens inside your browser.`,
    steps: [
      "Paste your JSON document into the input box.",
      "Pick two-space or four-space indentation to match the file you are pasting into.",
      "Turn on “Always quote strings” if any of your values are words like yes, no, on or off.",
      "Copy the YAML, or download it as a .yaml file.",
    ],
    faq: [
      {
        q: "Is the conversion lossless?",
        a: "For data, yes — every JSON document is representable in YAML. What does not survive is formatting: comments cannot exist in the JSON source to begin with, and key order is preserved but has no meaning in either format.",
      },
      {
        q: "Why would I quote every string?",
        a: "Because YAML 1.1 parsers read yes, no, on, off, y and n as booleans, and some read a leading-zero number as octal. Quoting removes all of that inference. If your data contains none of those values, leave it off for a cleaner file.",
      },
      {
        q: "Which YAML version does it produce?",
        a: "Output follows YAML 1.2, which is what modern parsers expect. The quoting option exists because plenty of tooling in the wild still behaves like YAML 1.1.",
      },
      {
        q: "Can it convert back?",
        a: "Yes — the YAML to JSON tool does the reverse, and the two round-trip cleanly.",
      },
    ],
  },

  "yaml-to-json": {
    intro: `Going from YAML to JSON is usually about feeding a config file to something that only speaks JSON: a validator, a diff tool, a script, an API that will not accept anything else. It is also the fastest way to find out what your YAML actually means, because the JSON output shows you the values your parser will see rather than the ones you assumed you wrote.

That second use is the interesting one. YAML has more ways to be subtly wrong than any format in common use. Indentation that mixes tabs and spaces, a colon inside an unquoted value, a multi-line block that folds when you wanted it to preserve newlines, a bare “no” that becomes “false” — all of these are legal YAML that means something other than what was intended. Converting to JSON makes the interpretation explicit: if a value comes out as “false” rather than “"no"”, you have found your bug.

Parse errors are reported on their own line, trimmed of the multi-line diagnostic that YAML libraries tend to produce, so the message stays readable.

The document never leaves your browser, which matters more here than usual — YAML files are where people keep secrets, connection strings and deployment credentials.`,
    steps: [
      "Paste your YAML configuration into the input box.",
      "Read the JSON result below and check that the values are the types you expected.",
      "Choose indentation, or pick “Minified” if the JSON is going into a request body.",
      "Copy the result or download it as a .json file.",
    ],
    faq: [
      {
        q: "Why did my value become true or false?",
        a: "YAML reads unquoted yes, no, on, off, y and n as booleans. If you meant the two-letter string, quote it in the source. Seeing the conversion is exactly how this class of bug gets caught.",
      },
      {
        q: "Can it handle multiple documents in one file?",
        a: "Only the first document is converted. A file separated by --- markers holds several documents, and JSON has no equivalent for that — split them and convert each in turn.",
      },
      {
        q: "Are YAML anchors and aliases supported?",
        a: "Yes. Anchors are resolved during parsing, so the JSON output contains the expanded value wherever the alias appeared.",
      },
      {
        q: "My YAML is valid but the tool rejects it.",
        a: "Check for tab characters used as indentation — YAML forbids them outright, and they are invisible in most editors. The reported error line is a good place to start looking.",
      },
    ],
  },

  "json-to-csv": {
    intro: `Spreadsheets do not read JSON, and half the people who need to look at an API response live in a spreadsheet. This tool flattens an array of objects into a CSV you can open in Excel, Numbers, Google Sheets or anything else that reads a table.

Two decisions make the difference between a usable CSV and a useless one, and the tool gets both right. The first is nesting: a value like “{"user": {"name": "Ada"}}” has no natural column, so by default it becomes a “user.name” column rather than a cell containing raw JSON. The second is ragged data. Real API responses are not uniform — the fifth record has a field the first four lacked. Rather than taking the columns from the first row, the tool collects the union of every key across every row, so no data is silently dropped off the right-hand edge.

You can choose the delimiter, which matters more than it should. Comma is standard, but Excel in a locale that uses the comma as a decimal separator expects semicolons, and a tab-separated file is the safest thing to paste directly into a sheet.

Quoting and escaping follow RFC 4180, so values containing commas, quotes or newlines survive the round trip.`,
    steps: [
      "Paste an array of JSON objects — the shape most APIs return for a list.",
      "Pick a delimiter: comma for a standard CSV, semicolon for European Excel, tab for pasting straight into a spreadsheet.",
      "Leave “Flatten nested objects” on unless you want nested values written as raw JSON in the cell.",
      "Download the result, then open it in your spreadsheet application.",
    ],
    faq: [
      {
        q: "My JSON is one object, not an array. Will it work?",
        a: "Yes — a single object becomes a one-row CSV. What cannot be converted is an array of bare values like [1, 2, 3], because there are no field names to make columns from.",
      },
      {
        q: "What happens to nested arrays?",
        a: "An array of simple values is joined with semicolons into a single cell. An array of objects is expanded into indexed columns such as items[0].name, which keeps the data but can produce a very wide table.",
      },
      {
        q: "Why do some rows have empty cells?",
        a: "Because those records did not contain that field. The tool builds columns from every key it sees anywhere in the data, so a field present in only some records leaves the rest blank rather than shifting the columns.",
      },
      {
        q: "Excel is showing everything in one column.",
        a: "That is a delimiter mismatch. Try semicolon-separated output, or use Excel's Data → From Text import and pick the delimiter there.",
      },
    ],
  },

  "csv-to-json": {
    intro: `CSV looks trivial until you meet a real one. A field containing a comma, a value wrapped in quotes with a quote inside it, a description with a newline in the middle, a file that uses semicolons because it was exported in Germany — a naive split on commas breaks on all of them. This converter uses a proper CSV parser, so quoted fields, escaped quotes and embedded newlines come through intact.

Delimiter detection is automatic by default, and usually right; you can force comma, semicolon, tab or pipe when the guess is wrong or the file is ambiguous.

The option worth thinking about is type conversion. With it on, “1” becomes the number 1 and “true” becomes a boolean, which is what you want for data you are about to compute with. With it off, everything stays a string — and that is what you want for identifiers. A postcode, an order number or an account code with a leading zero loses that zero the moment it becomes a number, and the damage is permanent and silent. If your CSV contains identifiers, turn typing off.

Rows that do not parse cleanly are reported above the result rather than causing the whole file to fail, so one ragged line does not cost you the other nine hundred.`,
    steps: [
      "Paste your CSV, or the contents of a .csv file, into the input box.",
      "Leave the delimiter on automatic unless the columns come out wrong, then pick it explicitly.",
      "Turn off “Convert numbers and booleans” if your data contains IDs, postcodes or anything with a leading zero.",
      "Copy the JSON array, or download it as a .json file.",
    ],
    faq: [
      {
        q: "Why did my ID lose its leading zero?",
        a: "Type conversion turned it into a number, and 007 as a number is 7. Turn off “Convert numbers and booleans” and every value stays a string exactly as written.",
      },
      {
        q: "Can it handle fields containing commas or line breaks?",
        a: "Yes, provided they are quoted as the CSV format requires. The parser handles quoted fields, doubled quotes inside them, and newlines within a quoted value.",
      },
      {
        q: "My first row is data, not headers.",
        a: "Turn off “First row is a header” and each record becomes an array of values rather than an object with named fields.",
      },
      {
        q: "What does the warning about rows that did not parse mean?",
        a: "Usually that a row has more or fewer fields than the header. The tool converts what it can and tells you which row was first affected, rather than discarding the file.",
      },
    ],
  },

  "text-diff": {
    intro: `Two versions of something, and a question: what changed? A diff answers it far faster than reading both, and far more reliably — the eye skips over a changed digit or a swapped word without noticing.

This tool compares by line, by word or by character. Line mode is right for code, configuration and structured data, where a change belongs to a line. Word mode is right for prose, where a paragraph reflowing would otherwise mark every line as changed while only one word actually moved. Character mode is for the fine detail: a transposed pair of letters, a changed digit in an ID, a smart quote that replaced a straight one.

Two switches handle the noise. Ignoring case is useful when comparing exports from systems that disagree about capitalisation. Ignoring whitespace is useful when one file has been reindented or has different line endings — otherwise every single line reads as modified and the real change is buried.

Additions are shown in green, removals in red and struck through, and the counts above tell you the scale of the change before you read a line of it. Both texts stay in your browser, so comparing two versions of a contract, a config file or anything else confidential is safe.`,
    steps: [
      "Paste the original version into the first box.",
      "Paste the changed version into the second box.",
      "Choose how to compare: by line for code, by word for prose, by character for fine detail.",
      "Turn on “Ignore whitespace” if one version has been reindented or has different line endings.",
      "Read the coloured result — green is added, red struck through is removed.",
    ],
    faq: [
      {
        q: "Everything is marked as changed. Why?",
        a: "Almost always line endings or indentation. One file uses Windows CRLF and the other Unix LF, or one has been reformatted. Turn on “Ignore whitespace” and the real differences appear.",
      },
      {
        q: "Which comparison mode should I use?",
        a: "Line for code and config, word for prose and documents, character when you are hunting a single-character difference such as a changed digit or a curly quote.",
      },
      {
        q: "Are my documents uploaded anywhere?",
        a: "No. The comparison runs in your browser, which is why this is a reasonable place to diff a contract, a credential file or an unreleased document.",
      },
      {
        q: "Can it diff two files rather than pasted text?",
        a: "Not yet — paste the contents for now. File-based diffing arrives with the file tools.",
      },
    ],
  },

  "case-converter": {
    intro: `Ten cases, one box. Sentence case and title case for prose; camelCase, PascalCase, snake_case, CONSTANT_CASE and kebab-case for code; plain upper and lower for when something arrived shouting.

The conversion is smarter than swapping characters, because turning “getHTTPResponseCode” into “get-http-response-code” requires knowing where the words are. The splitter handles the lowercase-to-uppercase boundary, the run of capitals followed by a capitalised word — which is what separates “HTTP” from “Response” — as well as spaces, hyphens and underscores. That means you can convert between naming conventions in either direction without first taking the identifier apart by hand.

Title case follows the convention most style guides share: articles, short prepositions and conjunctions stay lowercase unless they begin or end the title. "The Lord of the Rings", not "The Lord Of The Rings". Sentence case lowercases the whole string and then capitalises after each full stop, question mark or exclamation mark, which is the right behaviour for a heading that arrived in all capitals.

Everything runs in the browser as you type.`,
    steps: [
      "Paste or type your text into the input box.",
      "Pick the case you want from the dropdown — the result updates immediately.",
      "Copy the converted text, or switch cases to compare them.",
    ],
    faq: [
      {
        q: "How does it decide which words stay lowercase in title case?",
        a: "It keeps a list of articles, conjunctions and short prepositions — a, an, the, and, of, in, to, for and similar — lowercase unless the word begins or ends the title, which is the common convention across English style guides.",
      },
      {
        q: "Can it convert an existing camelCase name to snake_case?",
        a: "Yes. Word boundaries are detected from capitalisation as well as from spaces and punctuation, so any of the ten cases converts to any other.",
      },
      {
        q: "What happens to acronyms?",
        a: "A run of capitals followed by a capitalised word is treated as one word, so getHTTPResponse splits into get, HTTP and Response. In camelCase and PascalCase output the acronym is normalised to Http, which is what most style guides prefer.",
      },
      {
        q: "Does it handle accented characters?",
        a: "Yes for upper and lower case, which follow Unicode rules. The programming cases strip characters outside A–Z and 0–9, because identifiers in most languages cannot contain them.",
      },
    ],
  },

  "word-counter": {
    intro: `Word limits are real. A meta description that runs long gets truncated in the results page, an abstract over the cap gets rejected, an essay under it loses marks, and a newsletter that takes eleven minutes to read does not get read. Counting by eye does not work past a paragraph.

This counter reports words, characters with and without spaces, sentences, paragraphs and lines, along with estimated reading and speaking times. The reading speed is adjustable because it varies enormously with material — 225 words a minute is a reasonable default for general prose, but technical writing is closer to 150 and light fiction closer to 300. The speaking estimate uses 130 words a minute, which is the pace of a measured presentation rather than a rushed one.

Words are counted the way a person would count them: letters, digits, apostrophes and hyphens hold a word together, so "don't" and "well-known" each count once rather than twice. Sentences are counted by terminal punctuation, and paragraphs by blank lines.

The frequency list underneath shows the ten words you lean on most, with common function words filtered out. It is a quick way to catch a piece of writing that has said "leverage" nine times, and a quick way to see whether an article actually mentions its own subject.`,
    steps: [
      "Paste or type your text into the input box — counts update as you type.",
      "Adjust the reading speed if your material is more technical or lighter than average prose.",
      "Read the counts and the estimated reading and speaking times below.",
      "Check the frequency list for words you have overused.",
    ],
    faq: [
      {
        q: "How is a word defined?",
        a: "A run of letters or digits, with apostrophes and hyphens treated as part of the word. So don't is one word and well-known is one word, which matches how a person counts and how most word processors do.",
      },
      {
        q: "Why does my word processor give a different number?",
        a: "Different tools disagree about hyphenated compounds, numbers and text inside footnotes or headers. Differences of one or two per cent are normal. If you are working to a hard limit, use the counter belonging to whoever is enforcing it.",
      },
      {
        q: "Is the reading time reliable?",
        a: "It is an estimate from a words-per-minute rate, so it is only as good as the rate you choose. Use it to compare pieces rather than as a precise measure of anyone's actual reading.",
      },
      {
        q: "Which words are excluded from the frequency list?",
        a: "Common function words — the, and, of, to, is and about eighty others — plus anything shorter than three letters. Without that filter the list is the same for every text ever written.",
      },
    ],
  },
};
