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

This validator points at the exact character that broke it, giving the line and offset of the first fault. It finds that position itself by scanning the document, rather than relying on the browser's error message, because those messages vary wildly between browsers and versions — some give a byte offset, some give a truncated excerpt and no position at all.

When the document is valid, the tool describes its shape instead: the root type, how many objects and arrays it contains, the total number of keys, how many scalar values there are and how deeply the structure nests. That summary is a quick sanity check against what you expected. An API that should return a list of twenty items and reports one object at depth two has told you something useful before you have read a single field.

Everything happens in your browser. You can validate a payload containing real customer data or a live token without it leaving the machine.

Validation here means the strict specification, not the dialects that look like it. Comments, trailing commas, single-quoted strings and unquoted keys all belong to JSON5 or JSONC, and all of them are rejected — deliberately, because a document this tool calls valid should be a document every real parser accepts.`,
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

Everything runs in the browser as you type, which matters more than it sounds: renaming a column across a schema, or a variable across a file, often means pasting something you would rather not hand to a stranger's server. There is no server here to hand it to.

The conversions are lossless in one direction and not the other, which is worth knowing before you rely on a round trip. Going from “userAccountId” to “user_account_id” and back returns exactly what you started with. Going from “HTTPResponse” to “http_response” and back gives you “HttpResponse”, because once the capitals have gone there is nothing left to say the first three letters were an acronym. If you are converting identifiers in bulk, check the acronyms afterwards.`,
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

  "sort-lines": {
    intro: `Sorting a list is one of those operations that is trivial in a terminal, awkward in a spreadsheet and oddly missing from most text editors. This does it on whatever you paste: alphabetically, in reverse, or numerically, with optional case sensitivity.

The numeric option is the one that matters more than it looks. Sorting numbers as text puts 10 before 2, because comparison happens character by character and "1" comes before "2". That is correct string behaviour and almost never what anyone wants from a list of quantities, versions or ports. Switching to numeric sorting reads each line as a number and orders it properly.

Case sensitivity changes where capitals land. A case-sensitive sort puts every capital letter before every lowercase one, because that is their order in the character set, so "Zebra" comes before "apple". Case-insensitive folding gives the ordering a person expects from an index. Neither is wrong; they answer different questions, and the default here is the human one.

Sorting is also the fastest way to find duplicates without a dedicated tool: identical lines end up adjacent, and a repeated entry that was invisible in a thousand-line file becomes obvious. If removing them is the actual goal, the deduplication tool on this site does it in one step and reports how many went.

Everything runs in this tab, which is the practical reason to use a web page for this at all — a list of customer email addresses or internal hostnames is exactly the kind of thing that should not be pasted into a service that keeps a copy.`,
    steps: [
      "Paste your list, one item per line.",
      "Choose the direction and whether the sort should be alphabetical or numeric.",
      "Switch on numeric ordering for anything that is a quantity, a version or a port.",
      "Copy the sorted result, or send it to the deduplication tool if repeated lines are what you were looking for.",
    ],
    faq: [
      {
        q: "Why does 10 sort before 2?",
        a: "Because a text sort compares character by character, and \"1\" precedes \"2\". Switch on numeric sorting and each line is read as a number instead, which orders them the way you expect.",
      },
      {
        q: "Where do capital letters end up?",
        a: "In a case-sensitive sort, before all lowercase letters, since that is their position in the character set. Case-insensitive sorting folds them together and produces the ordering you would find in an index.",
      },
      {
        q: "Can it sort by a column rather than the whole line?",
        a: "Not here — it compares whole lines. For column-based ordering, a spreadsheet or the CSV tools on this site will do better, since they understand where the fields begin and end.",
      },
      {
        q: "What happens to blank lines?",
        a: "They sort to the top in ascending order, being empty strings. Removing them first with the deduplication tool usually gives a tidier result.",
      },
    ],
  },

  "remove-duplicate-lines": {
    intro: `Duplicated lines accumulate wherever lists get merged. Two exports of the same mailing list, a log filtered twice, a set of URLs collected from several pages. Finding them by eye is impossible past a few dozen lines.

This removes them and tells you how many went, which is often the more interesting number: it is the difference between "the merge worked" and "the merge ran twice".

Order is preserved by default, and that distinguishes this from the usual command-line approach. The classic sort-then-unique pipeline removes duplicates but also reorders everything, which destroys a chronology or a deliberate ranking. Here the first occurrence of each line stays where it was and later copies are dropped, so a log stays in time order and a priority list stays prioritised.

Case sensitivity is worth thinking about before you run it. Treating "Alice@example.com" and "alice@example.com" as the same line is usually right for email addresses, since the domain part is definitively case-insensitive. It is usually wrong for identifiers, file paths on a case-sensitive filesystem, or anything where the capitalisation carries meaning.

Trailing whitespace is the invisible reason two lines that look identical are not. A line ending in a space is a different string from one that does not, and neither is visible on screen. Trimming before comparison handles the common case where one export used a different convention from another.

For addresses and hostnames it is worth remembering the tool compares text and not meaning: two URLs that differ only by a trailing slash are two different lines here, because they are two different strings.`,
    steps: [
      "Paste the list you want cleaned.",
      "Decide whether case should matter — usually not for email addresses, usually yes for identifiers.",
      "Trim whitespace if the lines came from more than one source, since a trailing space makes two identical-looking lines different.",
      "Read the count of what was removed. It is often more informative than the cleaned list itself.",
    ],
    faq: [
      {
        q: "Does it change the order of my lines?",
        a: "No. The first occurrence of each line stays where it was and later copies are dropped. That is the difference from a sort-and-unique pipeline, which removes duplicates and reorders everything as a side effect.",
      },
      {
        q: "Two lines look identical but both survived.",
        a: "Almost certainly trailing whitespace, or a non-breaking space rather than an ordinary one. Switch on trimming, and if that does not resolve it, run the line through the Unicode inspector to see what is actually there.",
      },
      {
        q: "Should I ignore case?",
        a: "For email addresses, yes — the domain is case-insensitive and the local part is in practice. For identifiers, file paths and anything where capitalisation is meaningful, no.",
      },
      {
        q: "Can it show me only the duplicates instead?",
        a: "Not directly. Sorting the list first makes repeated lines adjacent and easy to see, which is the usual way to inspect them before deciding to remove anything.",
      },
    ],
  },

  "remove-line-breaks": {
    intro: `Text copied out of a PDF, an email client or a terminal often arrives with a line break every seventy or eighty characters — wrapped for a column that no longer exists. Pasting it anywhere else produces a ragged block that reflows badly and reads worse.

This joins those lines back into continuous paragraphs. The difficulty is knowing which breaks were the original formatting and which were meant, and the tool handles that by treating a blank line as a genuine paragraph boundary and everything else as a wrap to be removed.

That rule is right most of the time because it matches how the text was produced. A hard-wrapped document separates paragraphs with an empty line and wraps within them, so keeping the empty lines and joining the rest reconstructs the original. Text extracted from a PDF is the main exception, since PDFs frequently have no blank lines at all, and there the result needs a read.

Joining is done with a space rather than nothing, because two lines pushed together without one produce merged words. Where a word was hyphenated across a break the hyphen is removed and the halves rejoined, which is the behaviour you want from PDF text and the thing that makes the difference between readable output and a page full of "some- thing".

The other direction is available too: converting Windows line endings to Unix ones and back. That matters when a file crosses between systems, and it is the invisible cause of a great many diffs that show every line as changed when nothing in them actually was.`,
    steps: [
      "Paste the text with unwanted breaks in it.",
      "Choose whether blank lines should be kept as paragraph boundaries — usually yes.",
      "Read the result. Text from a PDF may need a check, since PDFs often lack the blank lines that mark paragraphs.",
      "Use the line-ending conversion instead when a file is moving between Windows and Unix systems.",
    ],
    faq: [
      {
        q: "How does it know which breaks to remove?",
        a: "A blank line is treated as a real paragraph boundary and kept; every other break is treated as wrapping and removed. That matches how hard-wrapped text is produced, which is why it works on most sources.",
      },
      {
        q: "My paragraphs all ran together.",
        a: "The source had no blank lines between them, which is common in text extracted from a PDF. There is no signal to work from in that case, so the paragraph breaks have to go back in by hand.",
      },
      {
        q: "What happens to hyphenated words split across lines?",
        a: "The hyphen is removed and the two halves are rejoined, which is what you want from PDF text. A genuinely hyphenated word at the end of a line is the rare case where that guesses wrong.",
      },
      {
        q: "What is the difference between CRLF and LF?",
        a: "Windows ends a line with a carriage return and a line feed; Unix and macOS use the line feed alone. Mixing them makes diffs show every line as changed, and is why Git offers to normalise them on checkout.",
      },
    ],
  },

  "find-and-replace": {
    intro: `Replacing every occurrence of something across a block of text is a two-second job in an editor and an awkward one in a browser, a chat window or a form field. This does it on whatever you paste, with the options that make the difference between a clean substitution and a mess.

Case sensitivity, whole-word matching and regular expressions are all available. Whole-word matching is the one that saves the most damage: replacing "id" without it hits "identity", "video", "idle" and "candidate", and the results are invisible until something breaks. With word boundaries applied, only the standalone word is touched.

Regular expressions turn the tool into something considerably more capable. Capture groups can be referred to in the replacement, so a date written as 2026-08-28 can be rewritten as 28/08/2026 in a single pass by capturing the three parts and reordering them. The regex tester on this site is the place to work out the pattern before you use it here.

The count of replacements made is the number to check before you copy anything. A substitution that reports far more matches than expected has found something you did not intend, and a substitution that reports zero has usually failed on invisible whitespace or a smart quote rather than on the word itself — a document editor turns a straight apostrophe into a curly one silently, and the two do not match.

Everything happens in this tab, which is what makes it reasonable to run over a block of production configuration or a customer record while you are cleaning it up.`,
    steps: [
      "Paste the text you want to change.",
      "Enter what to find and what to replace it with.",
      "Switch on whole-word matching unless you genuinely want to match inside longer words.",
      "Check the replacement count before copying — a surprising number in either direction means the pattern is not matching what you thought.",
    ],
    faq: [
      {
        q: "Nothing was replaced even though I can see the word.",
        a: "Usually a typographic quote where you typed a straight one, a non-breaking space, or a case difference. Paste the line into the Unicode inspector if it continues to look identical and continues not to match.",
      },
      {
        q: "How do I avoid matching inside longer words?",
        a: "Switch on whole-word matching, which applies word boundaries around your term. Without it, replacing “id” will also rewrite parts of “video” and “candidate”.",
      },
      {
        q: "Can I use a capture group in the replacement?",
        a: "Yes, with regular expression mode switched on. Refer to groups as $1, $2 and so on, which lets you reorder parts of a match — rewriting date formats is the standard example.",
      },
      {
        q: "Is my text sent anywhere?",
        a: "No. The substitution runs in this browser tab, so pasting configuration, credentials or customer data here does not transmit any of it.",
      },
    ],
  },

  "markdown-to-html": {
    intro: `Markdown exists so that text can be written as text and rendered as markup. Converting it to HTML is what every static site generator, documentation tool and content platform does behind the scenes; this does it visibly, so you can see exactly what your Markdown produces.

The output is clean semantic HTML — headings, paragraphs, lists, links, emphasis, code blocks, block quotes and tables — with no wrapper divs, no framework classes and nothing to strip out afterwards. That makes it suitable for pasting into a CMS, an email template or a page you are hand-writing.

The most useful thing this reveals is what your Markdown actually says, which is not always what you meant. A list that needs a blank line before it renders as a paragraph without one. Indenting four spaces turns a line into a code block. A single asterisk produces italics where two produce bold, and an underscore inside a word does nothing at all in most dialects, which is why file_name_here survives unchanged where you might have expected italics.

Dialects differ, and it is worth knowing which one you are writing for. Tables, strikethrough, task lists and automatic links come from GitHub Flavored Markdown rather than the original specification, and a renderer that only implements the original will pass them through as literal text. This tool implements the common GitHub-flavoured set, which is what most platforms now expect.

Raw HTML inside Markdown passes through untouched, as the format intends. That is convenient and it is also the reason Markdown from an untrusted source must be sanitised before rendering: a script tag written in a comment field is still a script tag after conversion.`,
    steps: [
      "Paste or type your Markdown into the input.",
      "Read the HTML output, and the preview alongside it.",
      "Check anything that did not render as expected — a missing blank line before a list is the usual cause.",
      "Copy the HTML. It carries no wrapper elements or classes, so it drops into an existing page cleanly.",
    ],
    faq: [
      {
        q: "My list rendered as a paragraph.",
        a: "It needs a blank line before it. Without one, most renderers treat the list items as a continuation of the preceding paragraph. The same rule applies to headings and block quotes.",
      },
      {
        q: "Which flavour of Markdown is this?",
        a: "The GitHub-flavoured set, which adds tables, strikethrough, task lists and automatic links to the original specification. That is what most platforms now implement, though a strictly original renderer will not understand the additions.",
      },
      {
        q: "Why did my underscores not produce italics?",
        a: "Underscores inside a word are ignored in most dialects, precisely so that snake_case identifiers survive. Use asterisks for emphasis mid-word.",
      },
      {
        q: "Is the HTML safe to insert directly?",
        a: "Only if you trust the Markdown. Raw HTML passes through by design, so a script tag written in the source is a script tag in the output. Sanitise anything that came from a user before rendering it.",
      },
    ],
  },

  "html-to-markdown": {
    intro: `The reverse trip: taking HTML and producing Markdown. Useful when moving content out of a CMS, converting an article into something a static site generator can build, or turning a page into text a person can edit without fighting tags.

Headings, paragraphs, links, emphasis, lists, block quotes, code blocks and tables all convert. Scripts, styles and comments are dropped, since none of them has a Markdown equivalent and none belongs in the text.

The conversion is deliberately lossy, and understanding what it loses is the point of using it. Markdown has no way to express a colspan, a class, an inline style, a data attribute or a nested table. Everything presentational disappears, and what remains is the structure and the words. If a page's meaning depends on its layout, the Markdown will not carry it.

Where HTML has no equivalent at all, the tool keeps the tag rather than discarding the content — an iframe, a video element, a form. Markdown permits inline HTML, so those survive as literal markup for you to deal with, which is better than silently losing them.

Content pasted from a word processor is the difficult case. Word and Google Docs produce HTML dense with spans carrying inline styles, and the conversion strips all of it, which is usually what you wanted but occasionally removes emphasis that was applied as a style rather than as a bold tag. Check the result against the original if that distinction matters.

The output uses a consistent style — hyphens for bullets, asterisks for emphasis, ATX-style headings with hash marks — so a batch of converted documents does not arrive in three different conventions.`,
    steps: [
      "Paste the HTML, or the page source you want converted.",
      "Read the Markdown output.",
      "Check anything structural — tables with merged cells and nested layouts do not survive.",
      "Look for leftover HTML tags in the result: those are elements Markdown cannot express, kept rather than dropped.",
    ],
    faq: [
      {
        q: "Why is there still HTML in the output?",
        a: "Because Markdown has no equivalent for those elements — an iframe, a video, a form. Markdown allows inline HTML, so they are kept as-is rather than silently discarded along with their content.",
      },
      {
        q: "What happens to tables?",
        a: "Simple tables convert to Markdown's pipe syntax. Merged cells, nested tables and cell alignment beyond the basic three options have no representation and are flattened.",
      },
      {
        q: "Can I convert a whole web page?",
        a: "You can paste the source, but the result will include navigation, footers and any other markup on the page. Copy the article element or the main content region rather than the entire document.",
      },
      {
        q: "Why did my styling disappear?",
        a: "Markdown carries structure, not presentation. Classes, inline styles, fonts and colours have nowhere to go. That is usually the reason to convert in the first place, but it does mean emphasis applied as a style rather than as a tag is lost.",
      },
    ],
  },

  "csv-to-markdown-table": {
    intro: `Pasting tabular data into a README, a pull request description, an issue or a wiki page means converting it to a Markdown table, and doing that by hand means counting pipes.

This takes CSV — from a spreadsheet export, a database query, or a copied selection — and produces the table syntax, aligned so the source is readable as well as the rendered result.

Column alignment is set with colons in the separator row, and the tool writes them for you: left by default, or right for numeric columns, which is how a column of figures becomes readable. Aligning numbers on their right edge lines up the digits, and a column of prices or counts is genuinely hard to scan without it.

Two details in the escaping matter. A pipe character inside a cell would end the cell early, so it is escaped. And a cell containing a newline cannot be represented at all — Markdown tables are strictly one row per line — so line breaks within a cell are replaced with a space or an HTML break tag depending on what your renderer supports.

The alignment padding in the output is cosmetic and worth keeping anyway. It makes no difference to how the table renders, but it makes the Markdown source legible to whoever opens the file next, which is the whole reason to write a table in Markdown rather than in HTML.

Delimiters other than commas are handled, since exports from European locales frequently use semicolons — a consequence of the comma being the decimal separator there.`,
    steps: [
      "Paste your CSV, including the header row.",
      "Check the delimiter if the data came from a European export, where semicolons are common.",
      "Set numeric columns to right alignment so the digits line up.",
      "Copy the table into your Markdown file. The padding is cosmetic but keeps the source readable.",
    ],
    faq: [
      {
        q: "What happens to a cell containing a comma?",
        a: "Nothing, as long as the CSV quoted it properly. The parser respects quoted fields, so a quoted cell containing commas stays intact as one cell.",
      },
      {
        q: "Can a cell contain a line break?",
        a: "Not in a Markdown table — the format is strictly one row per line. Line breaks inside a cell are replaced with a space, or with a break tag if your renderer accepts inline HTML.",
      },
      {
        q: "Does the padding affect how it renders?",
        a: "No. It exists so the Markdown source is readable to the next person who opens the file. The rendered output is identical either way.",
      },
      {
        q: "My export uses semicolons rather than commas.",
        a: "Set the delimiter accordingly. Semicolon-separated files are standard in locales where the comma is the decimal separator, which covers most of Europe.",
      },
    ],
  },

  "xml-to-json": {
    intro: `XML and JSON describe the same kind of nested data with entirely different assumptions, which is why converting between them requires decisions rather than just a parser. This converts XML into JSON and states the decisions it is making.

The core difficulty is that XML distinguishes between an attribute and a child element while JSON has only keys. An element with attributes and text content has to become an object with a convention for both, and the usual approach — which this follows — prefixes attribute names with an @ symbol and puts text content under a dedicated key. That is the convention most XML-to-JSON tooling has settled on.

The second difficulty is repeated elements. A parent with three child elements of the same name should become an array; a parent with one should arguably become an object, except that then the shape of the JSON depends on the data rather than the schema, and code that worked yesterday breaks when a list happens to have one item. That is a genuine trap, and it is worth deciding deliberately which behaviour you want rather than discovering it in production.

Namespaces are the third. XML namespaces carry meaning that JSON has no way to express, so a prefixed element name either keeps its prefix as part of the key or loses the distinction entirely. Neither is a faithful translation because there is no faithful translation available.

The practical use for this is reading, more than converting: an XML response is much easier to scan as JSON, and pasting one in here is often the fastest way to work out what a SOAP endpoint or an RSS feed is actually returning. For production parsing, an XML library that understands namespaces will serve you better than a conversion.`,
    steps: [
      "Paste the XML document or fragment.",
      "Read the JSON output — attributes appear with an @ prefix and text content under its own key.",
      "Look carefully at any element that can repeat, since one occurrence and several produce different shapes.",
      "For production code, parse the XML with a real library rather than converting first.",
    ],
    faq: [
      {
        q: "Why do some keys start with an @?",
        a: "Those were XML attributes rather than child elements. JSON has no equivalent distinction, so the prefix preserves it. It is the convention most XML-to-JSON tooling uses.",
      },
      {
        q: "Why is a single element not an array?",
        a: "Because XML gives no indication that an element can repeat — that lives in the schema, not the document. One occurrence looks like a single value and several look like a list, which is a real trap when writing code against the result.",
      },
      {
        q: "What happens to namespaces?",
        a: "The prefix is kept as part of the key. JSON has no namespace concept, so the meaning behind the prefix is lost even though the text of it survives.",
      },
      {
        q: "Where did my comments and processing instructions go?",
        a: "They are dropped. Neither has any representation in JSON, and carrying them would require inventing a convention that nothing else would understand.",
      },
    ],
  },

  "json-to-xml": {
    intro: `Converting JSON into XML is usually driven by something at the other end that will not accept anything else — an enterprise system, a legacy API, a SOAP endpoint, a specified interchange format.

The conversion has to invent things, and it is better to know what. JSON has no root element and XML requires exactly one, so a name has to be supplied. JSON arrays have no equivalent structure at all, so each element becomes a repeated child element and the array itself disappears. JSON keys can contain characters that are illegal in XML element names — spaces, leading digits, hyphens in some contexts — so those are sanitised.

Numbers, booleans and nulls all become text, because XML has no types without a schema. A boolean true becomes the string "true", and whatever reads the document has to know to interpret it. Null becomes an empty element, which is the conventional representation and is indistinguishable from an empty string, which is one of the reasons round-tripping through XML and back does not return what you started with.

Element names are derived from keys, with a fallback for array items since the array's own key names the collection rather than each member. The output is indented, and characters that would be markup are escaped.

If the receiving system has an XSD, check the result against it before assuming the shape is right. A conversion can only produce a reasonable structure; it cannot produce the specific structure someone else's schema demands, and the two are rarely the same on the first attempt.`,
    steps: [
      "Paste the JSON you need converted.",
      "Set the root element name, since XML requires one and JSON does not provide it.",
      "Check how arrays came out — each element becomes a repeated child, and the array itself has no representation.",
      "Validate the result against the receiving system's schema before sending it anywhere.",
    ],
    faq: [
      {
        q: "Why do I have to name a root element?",
        a: "Because an XML document must have exactly one, and JSON has no equivalent. A JSON object with three top-level keys has three roots as far as XML is concerned, so one has to be supplied to contain them.",
      },
      {
        q: "How are arrays represented?",
        a: "Each element becomes a repeated child element and the array itself disappears. XML has no array construct, so a list of three items is simply three sibling elements of the same name.",
      },
      {
        q: "What happens to numbers and booleans?",
        a: "They become text, because XML has no types of its own without a schema. The consumer has to know that a particular element holds a number, which is what an XSD is for.",
      },
      {
        q: "Can I convert back to the original JSON?",
        a: "Not exactly. Types are gone, a null and an empty string look identical, and a single-element array is indistinguishable from a plain value. The round trip loses information in both directions.",
      },
    ],
  },

  "toml-to-json": {
    intro: `TOML is a configuration format designed to be read and edited by people, which is why Rust's Cargo, Python's packaging tooling and a growing number of other projects use it. This converts a TOML document into JSON, which is what most code wants to work with.

The conversion is more direct than it is for XML, because TOML and JSON model very nearly the same things: tables become objects, arrays become arrays, and TOML's types map onto JSON's cleanly enough.

Three details do not survive the trip. TOML has genuine date and time types — a datetime written without quotes is a datetime, not a string — and JSON has no such type, so they become strings in the RFC 3339 form. TOML distinguishes integers from floats and JSON has one number type, so the distinction is lost. And TOML files are usually full of comments, which is a large part of why the format was chosen, and JSON has no comments at all so they are dropped.

Table syntax is where people misread TOML rather than where the conversion goes wrong. A section header in square brackets creates a table, and a doubled bracket creates an element of an array of tables — so repeating [[dependencies]] builds a list while repeating [dependencies] is an error. Seeing the JSON makes the resulting structure obvious in a way that reading the TOML sometimes does not.

Dotted keys behave the same way: a key written as owner.name creates a nested object rather than a key containing a full stop, which is another thing the JSON output makes immediately visible.`,
    steps: [
      "Paste the TOML document — a Cargo.toml, a pyproject.toml, or any configuration file.",
      "Read the JSON structure, which shows what the table syntax actually built.",
      "Check any dates, which become RFC 3339 strings since JSON has no date type.",
      "Note that comments are gone, since JSON has no way to carry them.",
    ],
    faq: [
      {
        q: "What happens to my comments?",
        a: "They are dropped. JSON has no comment syntax, and comments are frequently the reason a project chose TOML in the first place, so keep the TOML as the source of truth and treat the JSON as derived.",
      },
      {
        q: "How are dates handled?",
        a: "TOML has real date and time types; JSON does not. They become RFC 3339 strings, which is the conventional representation and what most parsers on the other side will expect.",
      },
      {
        q: "What is the difference between one bracket and two?",
        a: "A single pair defines a table. A doubled pair defines an element of an array of tables, so repeating it builds a list. Repeating a single-bracket header instead is an error, and the JSON output makes which one you wrote immediately obvious.",
      },
      {
        q: "Are integers and floats distinguished?",
        a: "Not after conversion. TOML separates them; JSON has a single number type. A value written as 1.0 in TOML may come back as 1 depending on how the JSON is later serialised.",
      },
    ],
  },
};
