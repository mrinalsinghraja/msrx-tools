import type { ToolContent } from "@/lib/tools/types";

/**
 * SEO prose for the AI tools. Server-only.
 *
 * These pages carry an obligation the other hundred and twenty-four do not.
 * Everywhere else on this site the honest sentence is that nothing is sent
 * anywhere; here it is the opposite, and a page that quietly borrows the
 * reassuring version would be lying. So each intro below says where the text
 * goes, and none of them repeats the privacy language used elsewhere.
 */
export const AI_CONTENT: Record<string, ToolContent> = {
  "ai-prompt-generator": {
    intro: `Most disappointing answers from a language model are not the model's fault. They come from a request that never said who the reader was, how long the piece should run, what it must avoid, or what a good answer would even look like. Ask for "a blog post about cybersecurity" and you will get a competent, weightless article aimed at nobody, because that is the only thing the request described.

Writing the request properly is a chore, though, and it is the same chore every time: state the role, name the audience, set the constraints, describe the shape of the output, and say what must not appear. This page does that chore. You describe the job in whatever words come to mind, and it comes back as a finished instruction you can paste straight in.

The target matters, so it is a setting rather than an assumption. An instruction for a chat assistant is written as a command — do this, for these people, under these limits. A request for an image model is not a command at all; it is a description, and one that reads like a sentence spoken to a person will produce a worse picture than a list of subject, composition, lighting and lens. Video adds the dimension that separates it from a still: what changes over the length of the shot. A coding assistant needs the runtime, the interfaces it must not break, and permission to ask rather than assume. An agent with tools needs to be told when to stop and what to confirm before acting.

Where your idea implies a detail without stating it, the generated prompt fills it in — that inference is most of the value. Where a detail genuinely cannot be guessed and would change the answer, it leaves a marked placeholder rather than inventing a figure you would then have to notice and remove.`,
    steps: [
      "Describe the job in the box. Ordinary sentences are fine — that is what the tool is for.",
      "Pick what the prompt is for: a chat assistant, an image or video model, a coding assistant, or an agent with tools.",
      "Choose how detailed you want it. Compact gives a paragraph; Full adds an output format, a worked example and a checklist.",
      "Turn on “Give me three versions” when you want distinct angles to choose between rather than one answer.",
      "Copy the result and paste it into whichever model you use. Fill in any bracketed placeholder before you send it.",
    ],
    faq: [
      {
        q: "Why not just type my question straight into the model?",
        a: "You can, and for a quick question you should. The gap opens on work you intend to reuse or hand over: a prompt you will run every week, one that has to produce the same shape of answer each time, or one a colleague will run without you there to explain what you meant. Specificity is what makes those repeatable, and specificity is tedious to write from scratch.",
      },
      {
        q: "Will the prompt work on any model?",
        a: "The structure travels well between the major chat models, since they all respond to a stated role, explicit constraints and a described output format. Image and video models vary far more in how they read a description, so treat what you get as a strong starting draft and expect to adjust the vocabulary for whichever one you use.",
      },
      {
        q: "What are the square brackets in the result?",
        a: "Places where a detail is needed and could not be inferred from what you wrote — a date, a company, a word count. They are left visible on purpose, because a plausible invention that you fail to spot is worse than an obvious gap you cannot miss.",
      },
      {
        q: "Is my idea stored anywhere?",
        a: "It is sent to the AI provider that produces the answer, and it passes through this site's server on the way without being written to any database, log or file that we keep. We have no account for it to be attached to. The provider's own retention is theirs, which is the honest limit of what can be promised about anything sent off the device.",
      },
      {
        q: "Can it write a prompt that gets around a model's safety rules?",
        a: "No, and it will not try. Requests to impersonate a named real person or to bypass another model's own rules are refused. That is a deliberate limit rather than an oversight.",
      },
    ],
  },

  "improve-prompt": {
    intro: `There is a particular frustration in having a prompt that almost works. It returns the right subject in the wrong shape, or the right shape padded with invented statistics, or an answer that was excellent once and has been mediocre every time since. Starting again from a blank box feels like giving up on the parts that were fine.

Paste the prompt here instead and it comes back rebuilt, with its intent left alone. The rewrite works through a fixed list of the things that actually go wrong with prompts, in the order they cause damage. Vagueness first: an instruction that names a topic but not an audience, a length or a purpose has left the most consequential decisions to a machine that will make them blandly. Then output shape — if you need a table, a word count or valid JSON, an answer that arrives as friendly paragraphs is a failure the prompt caused. Then missing constraints, which is where invented facts come from: a model told what to write and never told what not to invent will fill a gap rather than leave one. Then assumed context you have in your head and never typed. Then outright contradictions, of which asking for something brief and comprehensive in one breath is the most common. Finally the politeness padding, which costs tokens and changes nothing.

There is a box for what goes wrong with it now, and filling it in changes the result more than any other setting on the page. "It answers in bullet points when I want prose" is a fault that can be fixed directly and specifically; without it the rewrite has to guess at your complaint from the prompt alone.

Leave "Explain each change" on the first few times. Seeing which of your habits keep coming up is how you stop needing this page.`,
    steps: [
      "Paste the prompt you are using now into the box.",
      "Describe what goes wrong with it in the options — the more precisely, the better the rewrite.",
      "Leave “Explain each change” on if you want to learn from the edit rather than only take it.",
      "Run it, then read the rewritten prompt before you use it: check it did not narrow your intent.",
      "Test both versions on the same task. The improved one should fail less often, not merely read better.",
    ],
    faq: [
      {
        q: "Will it change what I was asking for?",
        a: "It should not, and that is the first thing to check. The instruction is to sharpen the request without altering its subject or adding requirements you plainly do not want. If the rewrite has quietly narrowed the scope — turning a general request into a specific one — say so in the box describing the problem and run it again.",
      },
      {
        q: "My prompt is very long. Is that a problem in itself?",
        a: "Length is not the fault; disorganisation is. A long prompt that repeats itself, contradicts itself in the third paragraph, or buries the actual task under context tends to produce worse answers than a short one. Expect the rewrite to be shorter, but only because it removed duplication rather than requirements.",
      },
      {
        q: "Does it work on system prompts as well as ordinary ones?",
        a: "Yes, and system prompts benefit more, because they are written once and then run thousands of times without anyone rereading them. Ambiguity that you would notice and correct in a conversation just keeps producing the same drift.",
      },
      {
        q: "Why does it sometimes remove my example?",
        a: "It should not remove a good one. Examples are among the most effective things a prompt can contain. It will remove an example that contradicts the instructions around it, since a model shown one thing and told another will usually follow the example.",
      },
    ],
  },

  "grammar-checker": {
    intro: `A grammar check is only useful if it leaves your writing sounding like you. Plenty of them do not: run a paragraph with any personality through one and it comes back smoothed into the same mid-Atlantic corporate register as everything else, with the fragments joined up, the contractions expanded and the one good sentence flattened.

This page corrects and stops. Grammar, spelling, punctuation, subject-verb agreement, tense that shifts halfway through, a doubled word your eye skated over. The register you wrote in stays where it was. So do your proper nouns, your figures, your quoted passages, your code, your paragraph breaks and your one-line paragraph, which was a choice.

Spelling is a setting with four positions because the default matters more than people expect. British and American differ on far more than a few -ise endings; they part company on punctuation inside quotation marks and on which collective nouns take a plural verb. Indian English is its own convention rather than a variant of either, and it keeps lakh and crore rather than converting them into something a reader would then have to convert back. There is also a position that leaves your spelling entirely alone and fixes only outright misspellings, which is what you want when you are editing somebody else's writing and the variety is not yours to choose.

The second setting controls how far the correction reaches. On its default it will not touch a sentence that is merely clumsy, because a clumsy sentence is not an error and rewriting it is not proofreading. Widen it and it will also untangle sentences that are genuinely hard to follow — a clause nested three deep, a pronoun with nothing to attach to, a subject that has gone missing by the time the verb arrives.

Turn on the list of changes when the corrections matter more than the corrected text: reviewing somebody's draft, or checking that a fix did not introduce a new mistake.`,
    steps: [
      "Paste the writing you want checked — a sentence, an email, or a whole article.",
      "Set the spelling convention. Pick “Leave it alone” when you are editing writing that is not yours.",
      "Choose whether to fix errors only, or also repair phrasing that is hard to follow.",
      "Run it, then compare the two. Anything you disagree with, keep your own version — you are the author.",
      "Turn on “List what changed” when you need to review each correction rather than accept the whole result.",
    ],
    faq: [
      {
        q: "Is this as accurate as a dedicated grammar engine?",
        a: "It is different rather than strictly better. A rule-based engine is consistent and will never surprise you, but it also cannot tell that a sentence is technically fine and still means the wrong thing. A language model reads for sense and catches errors of that kind, at the cost of occasionally changing something it should have left. Read the result before you send it. That advice applies to every checker of either kind.",
      },
      {
        q: "Will it rewrite my writing to sound like everyone else?",
        a: "It is instructed at length not to, and told explicitly that fragments and short paragraphs can be deliberate. If it has flattened something you meant, switch the reach setting back to errors only, which will not touch a sentence unless something in it is actually wrong.",
      },
      {
        q: "Can it check languages other than English?",
        a: "It will make a reasonable attempt at widely-written languages, but the spelling settings and the instructions behind this page are written around English conventions, so the results elsewhere are less dependable. There is a separate translation page if what you need is to move between languages.",
      },
      {
        q: "How long a document can I check at once?",
        a: "Up to fourteen thousand characters in one go, which is around two thousand words or five pages. The counter under the box tracks it. For anything longer, work through it a chapter at a time — you will read the corrections more carefully that way in any case.",
      },
    ],
  },

  "paraphrase-text": {
    intro: `To paraphrase well is to hold the meaning completely still while everything around it moves. That is harder than it sounds, and it is where most rewording falls down: a thesaurus pass swaps words for near-synonyms until the sentence is technically different and slightly wrong, hedges become assertions, and a study that found no effect ends up having found one.

This page rewords your text with the facts pinned. Every figure, date, name and the direction of every claim has to survive intact. If the original says early results suggest, the rewrite says early results suggest. What changes is the wording, the sentence shapes and, where you ask for it, the register.

Two controls decide how far from the original you land. The style setting picks a direction: fluent for better rhythm, formal for a report, simple words for a general audience, creative when you want the imagery rebuilt rather than adjusted, or shorter and longer when the length is the problem. The strength slider decides distance. At one, a handful of words change and the sentences stay where they are. At five, nothing but proper nouns and figures survives verbatim — the passage is rebuilt from its meaning. Most work sits at three, where each sentence is rewritten in turn and the order of ideas is untouched.

There is a switch for technical terms, on unless you turn it off, and the reason for it is worth stating. A synonym for a defined term is a different term. In a document about latency, replacing "latency" with "lag" in one paragraph has introduced an ambiguity that was not there before. Turn it off only when you are deliberately rendering specialist writing for people outside the specialism.

One thing worth saying plainly, because the category attracts the question: changing the words does not change whose ideas they are. If the substance came from a source, cite the source. Rewording is a writing tool, not a way around attribution, and no rewriting tool has ever made an uncredited borrowing into original work.`,
    steps: [
      "Paste the passage you want said differently.",
      "Pick a style — fluent, formal, simple, creative, shorter or longer.",
      "Set the strength slider: low for a light touch, high to rebuild the sentences entirely.",
      "Leave technical terms locked unless you are deliberately writing for a non-specialist reader.",
      "Read the result against the original and check every number and claim still says what it said.",
    ],
    faq: [
      {
        q: "Does this help me avoid plagiarism?",
        a: "No, and it is worth being direct about it. Plagiarism is presenting someone else's ideas as your own; the words are only the evidence. A reworded passage taken from a source you do not credit is still taken from that source. Use this for your own writing, or alongside a proper citation, and the question does not arise.",
      },
      {
        q: "Why did it change a number I wanted left alone?",
        a: "It should not have — every figure is meant to survive unchanged, and that instruction is explicit. If it happens, lower the strength slider, which reduces how much the sentence is rebuilt and therefore how much can go astray. Always check figures against the original regardless of the setting.",
      },
      {
        q: "What is the difference between the highest strength and a summary?",
        a: "Length, and what is allowed to disappear. Even at full strength the rewording keeps every point the original made, using entirely different sentences. A summary is permitted to drop things. If you want less text rather than different text, the summarising page is the right one.",
      },
      {
        q: "Can I run the same passage twice for a different result?",
        a: "Yes. This tool runs warmer than most on this site, so two runs of the same input give genuinely different rewordings. That is useful when the first attempt is close but one sentence in it is awkward.",
      },
    ],
  },

  "summarize-text": {
    intro: `A summary that opens with "this article discusses" has wasted its first and most valuable sentence. The point of shortening something is to put the conclusion where the reader will find it, and a summary that describes what a document is about rather than what it says leaves you exactly where you were: knowing there is something in there and not what.

So this page is built to lead with the finding, whatever text you give it. The board rejected the merger. Latency fell by a third after the migration. The trial found no difference between the groups. Whatever the piece concluded goes first, and the supporting material follows if there is room.

Four shapes are on offer and they suit different jobs. A paragraph reads best when you intend to actually read it. Bullets work when you are scanning a stack of documents and want to compare them. One sentence is for a subject line or a decision about whether to open the thing at all. Key points, which pairs each claim with the detail behind it, is the one to use when you will be relied upon to have understood the document rather than merely skimmed it.

The length slider is separate from the shape, because the two are independent: a bulleted summary can be terse or generous, and so can a paragraph.

Certain things are kept on purpose. The numbers that carry the argument keep their units and their period, since a figure without either is not evidence. Uncertainty is preserved — a source saying early results suggest does not become a source saying research shows, which is the single most common way a summary ends up more confident than the thing it summarised. Anything not in the original stays out, including relevant background you might reasonably expect a reader to want.

Turn on the quoted lines when you will need to defend the summary, or paste it somewhere the exact wording matters.`,
    steps: [
      "Paste the article, report, transcript or email thread into the box.",
      "Choose a shape: a paragraph to read, bullets to scan, one sentence to file, or key points to be examined on.",
      "Set the length slider — low for the bare finding, high to keep the supporting detail.",
      "Turn on the quoted lines when you need the source's exact words alongside the summary.",
      "Check the summary against the original for confidence: it should hedge wherever the source hedged.",
    ],
    faq: [
      {
        q: "How much can I paste in at once?",
        a: "Up to twenty-four thousand characters, roughly four thousand words or a dozen pages. That covers most articles and reports whole. For a book chapter or a long transcript, summarise each section and then summarise the summaries — the result is usually better than one pass over the lot, because nothing has to compete for attention.",
      },
      {
        q: "Will it add things the document does not say?",
        a: "It is instructed not to, including background it might happen to know about the subject, and including implications the author stopped short of drawing. The failure mode to watch for is subtler: a summary that is a shade more certain than its source. Compare the hedging in both if the conclusion matters.",
      },
      {
        q: "Does it work on meeting transcripts?",
        a: "Well, and better with the key points shape than with bullets. Transcripts bury decisions inside conversational back-and-forth, and pairing each decision with the reasoning that produced it is more useful than a list of topics that came up.",
      },
      {
        q: "Can I summarise a PDF here?",
        a: "Not directly — this box takes text. Use the PDF text extraction tool first, which runs entirely on your own machine, then paste what it gives you. The PDF itself never has to leave your device that way; only the text you choose to paste does.",
      },
    ],
  },

  "change-tone": {
    intro: `Register is what makes a message land or bristle, and it is stubbornly hard to adjust in your own writing. You know the email reads as curt. You have read it four times. You still cannot see which of the sentences is doing it, because you know what you meant by them.

This page re-pitches the writing while holding the content still. That second half is the part to watch. Softening a refusal until it reads like a possibility is not a tone change, it is a different message, and one that will cost you a second email in a fortnight. Every commitment, date, figure, condition and refusal in what you paste has to survive into the rewrite saying precisely what it said before.

Eight tones are on offer, and the useful ones are not the obvious ones. Direct puts the point in the first line and stops apologising for the interruption. Diplomatic is for disagreement: generous about the other position, clear about your own, and it still says the thing. Apologetic apologises once, properly, and then moves to what happens next, rather than circling back to sorry three more times in a way that makes the reader responsible for reassuring you. Confident strips the hedges — the perhaps and the might and the just wondering whether — that turn a reasonable request into an imposition you are asking forgiveness for.

The audience setting is a second axis and it changes more than the tone alone does. Writing for a manager means leading with the decision or the ask, because their scarce resource is attention. Writing for a client means dropping every piece of internal vocabulary, which will mean nothing to them and will read as either carelessness or a dodge. Writing for a customer means no internal process at all and, particularly, no blame passed sideways to another department.

Filler openings get cut on the way through, along with sentences that restate the previous one and anything that would read as insincere if the reader knew it had been rewritten.`,
    steps: [
      "Paste the message whose pitch you want to change.",
      "Pick the target tone. Direct and diplomatic are the two that most often fix a message you are unhappy with.",
      "Set who it is written for — the audience changes the vocabulary as much as the tone does.",
      "Run it, then check every commitment and date is still saying exactly what it said.",
      "Keep it near the original length unless you have a reason not to; long rewrites read as evasive.",
    ],
    faq: [
      {
        q: "How is this different from the paraphrasing page?",
        a: "Paraphrasing changes the words and leaves the register alone. This changes the register, which is a change in what the message does to its reader rather than what it denotes. Making an email friendlier is not the same operation as saying the same thing differently, even though both come back as a rewrite.",
      },
      {
        q: "Will it make my refusal ambiguous?",
        a: "It is instructed at length not to, because that is the characteristic failure of this kind of rewrite. A no that has been made polite until it reads like a maybe has failed. Check the first two lines of any declining message: the refusal should be plainly there.",
      },
      {
        q: "Can I use it on something already written by a model?",
        a: "Yes, and it is one of the better uses. Generated prose tends towards a uniform enthusiasm; setting the tone to neutral or direct strips a good deal of that out and leaves the substance.",
      },
      {
        q: "Why did it delete my opening line?",
        a: "Almost certainly because the line was doing no work — hoping the reader is well, apologising for the length, or announcing what the email will be about before saying it. Those are cut deliberately. Anything carrying real content stays.",
      },
    ],
  },

  "simplify-text": {
    intro: `Dense writing is rarely dense because the idea is hard. It is dense because of habits: the actor buried behind a passive construction, verbs turned into abstract nouns, three clauses stacked into one sentence, and a specialist word standing where an ordinary one would do. Undo those four things and most policy, legal and academic prose becomes readable without losing a single thing it was saying.

That is what this page does to the text you paste. It breaks long sentences apart, puts the actor in front of the action, turns abstract nouns back into the verbs they were made from, and cuts words doing no work. What comes back is shorter, but that is a side effect rather than the aim.

The reading level is a setting with four positions, and the fourth is the one most tools omit. Writing for someone reading English as a second language is a different job from writing for a child: the vocabulary needs to be common rather than short, the voice active, and the idioms and phrasal verbs gone, because "put up with" is opaque in a way that "tolerate" is not, however plain it feels to a native speaker.

There is a switch, on by default, that keeps every number, date, name, condition and exception exactly where it is. It matters more than it sounds. To simplify is not to summarise, and a rewrite that drops a condition because the condition made the sentence awkward has changed what the document means. That is a real risk with any policy or contract clause, which is exactly the material people bring here.

The rewrite is also told, in as many words, not to sound as though it is addressing a child unless you asked for that. Plain is not the same as patronising. One produces a document people will read; the other produces one they resent.`,
    steps: [
      "Paste the dense passage — a policy, a clause, an abstract, a page of documentation.",
      "Choose the reading level. Use the second-language setting when your readers are fluent but not native.",
      "Keep every number and name locked unless you genuinely want detail dropped.",
      "Run the readability checker on the result to see the change as a number rather than an impression.",
      "Turn on the glossary when readers will still meet the specialist terms elsewhere and need to recognise them.",
    ],
    faq: [
      {
        q: "Is this the same as summarising?",
        a: "No, and conflating them is how meaning gets lost. Simplifying keeps everything the passage said and changes how it says it — the result is often nearly as long as the original. Summarising is permitted to leave things out. If the document is a rule that someone has to follow, you want this page and not that one.",
      },
      {
        q: "Can I use it on a contract or a policy?",
        a: "For your own understanding, yes, and it is good at exactly that. Do not replace the original with the rewrite. A simplified version of a binding document is a reading aid, not the document, and the conditions in the real one are what will apply.",
      },
      {
        q: "How do I know it worked?",
        a: "Measure it. The readability page on this site takes both versions and gives you six scores computed on your own machine, so you can see the grade level drop rather than take an impression on trust. Two or three grade levels is a typical improvement on genuinely dense prose.",
      },
      {
        q: "Why is the result sometimes longer than what I put in?",
        a: "Because unpacking is expansion. A single sentence with three subordinate clauses becomes three sentences, and a nominalisation such as “the implementation of the procedure” becomes a clause with someone doing something in it. Fewer words per sentence is what makes it easier to read, not fewer words overall.",
      },
    ],
  },

  "expand-text": {
    intro: `Everyone has the notes. Six lines in a text file, or scrawled during a call, and every one of them is true and useful and none of them is a sentence. Turning that into something you can send is a specific and disproportionately tedious task: ordering the points, joining them so each follows from the last, and giving the thing an opening and an ending that were never in the notes at all.

This page does that joining. You paste the fragments, it returns finished writing. The connective tissue is the work — the ordering, the transitions, the framing — and the facts stay exactly as you left them.

Four forms are on offer because rough notes turn into different documents. Plain paragraphs suit a passage inside something longer. A short report adds a one-line summary and two or three headed sections, which is the shape people actually read at a desk. An email body drops straight into the message with no subject line and no signature. A status update follows the order that makes an update useful: what happened, what it means, what is next.

The switch marked "Add nothing I did not say" is on by default and is the reason to trust the output. Expanding notes is precisely the situation where a language model will helpfully invent — a plausible figure to round out a sentence, a second example beside your one, a reason that fits. With the switch on, every fact in the result has to trace back to a note, and where a note is too terse to build a whole sentence from it writes the short sentence the note supports rather than filling the space. Anything genuinely unclear is listed at the end instead of being guessed at, which turns an ambiguous note into a question you can answer in five seconds.

The depth slider controls how much connective writing goes around the points. It never controls how many facts appear, because that number is fixed by what you pasted.`,
    steps: [
      "Paste your notes. Bullets, fragments, half-sentences and shorthand are all fine.",
      "Pick the form: paragraphs, a short report, an email body or a status update.",
      "Leave “Add nothing I did not say” on unless you want it filling gaps.",
      "Set the depth slider for how much connective writing you want around your points.",
      "Read the UNCLEAR list at the end, if there is one, and answer those questions in your notes before running it again.",
    ],
    faq: [
      {
        q: "Will it invent facts to pad the writing?",
        a: "Not with the default switch on — it is instructed to write the short sentence a terse note supports rather than the long one it cannot. Turn the switch off and it may add ordinary connective context, though even then it is barred from introducing a figure, date, name or claim that is not in your notes.",
      },
      {
        q: "How rough can the notes be?",
        a: "Very. Fragments, arrows, abbreviations and single words all work. What limits the result is not the tidiness of the input but its completeness: a note reading “pricing issue” gives it nothing to build on, whereas “pricing issue — enterprise tier undercuts mid tier at 40 seats” gives it a sentence.",
      },
      {
        q: "What happens to the order of my points?",
        a: "It is free to reorder them, and usually should. Notes come out in the order things were said, which is rarely the order that reads well. If a particular sequence matters, number your notes and say so in the first line.",
      },
      {
        q: "Is this the opposite of the bullet point page?",
        a: "In effect, yes — that one goes from prose to points, this one from points to prose. Running one after the other on the same material is not a useful loop, though. You would get a document twice removed from the thinking that produced it.",
      },
    ],
  },

  "bullet-points": {
    intro: `Somebody sends you eleven paragraphs and asks what they should do about it. Somewhere in there are four decisions, two open questions and a great deal of throat-clearing, and separating them out is a task that takes real attention — which is why it tends not to happen and the eleven paragraphs get forwarded instead.

This page pulls a passage apart into the points it was actually making. Four styles cover the situations that come up. Short bullets of a few words each are for scanning. One full sentence per bullet is for a summary somebody else will read without the original beside it. Grouped bullets sort the points under two to four headings, which is what you want when a long document covers genuinely separate subjects. Action items go furthest: each line starts with an imperative verb, names the thing to be done, and attaches who and by when if the text says so.

The count is a target rather than a quota, and this matters. Ask for ten and it will produce seven if there are seven, because padding a list to hit a number is how a useful set of points turns into filler. It merges points that repeat each other, which happens constantly in transcripts and email threads where the same thing is said three times by three people.

The instruction that does most of the work is the one about information. A bullet reading "discussion of the budget" tells a reader nothing they did not already know from the subject line. "Budget cut to forty lakh, signed off by finance" tells them the thing. Every line is meant to carry content of that second kind, and a line that could have been guessed from the heading has failed.

Order is rearranged deliberately. Points come out of a document in the order they were written or spoken, which is almost never the order that makes them easy to act on.`,
    steps: [
      "Paste the prose, notes or transcript you want broken down.",
      "Choose a style. Action items are the one to use when the output is a to-do list rather than a summary.",
      "Set roughly how many points you want. Fewer will come back if the text does not contain that many.",
      "Check the result against the source for anything important that did not make the cut.",
      "Copy the points out, or download them as a text file to paste into your notes.",
    ],
    faq: [
      {
        q: "Why did I get fewer bullets than I asked for?",
        a: "Because the text did not hold that many distinct points, and inventing the remainder would have produced lines with nothing in them. The number is treated as a target to aim at rather than a quota to fill. If you consistently get far fewer, the source is probably repeating one idea at length.",
      },
      {
        q: "What is the difference between action items and ordinary bullets?",
        a: "Action items are filtered as well as reformatted. Only things somebody has to do come through, each phrased as an instruction with an owner and a deadline where the text supplies them. If nothing in the source is actionable it says so rather than converting observations into fake tasks.",
      },
      {
        q: "Can I paste a meeting transcript?",
        a: "That is one of its better uses, particularly with grouping turned on. Transcripts are long, repetitive and organised by who spoke rather than by subject, and reorganising them by subject is most of what makes them usable afterwards.",
      },
      {
        q: "Do the bullets use the original wording?",
        a: "Partly. Specific terms, names and figures are kept as written, but the phrasing is compressed, since a bullet that is a whole sentence lifted from a paragraph is rarely shorter than the paragraph in any useful sense.",
      },
    ],
  },

  "translate-text": {
    intro: `Machine translation crossed a threshold a few years ago. It is now reliably good enough to understand a document written in a language you do not read, and to be understood by someone who does not read yours. It is not good enough to be trusted with a contract, a dosage, or a safety instruction, and no amount of improvement in the last few years has changed that, because the failures are rare and unannounced rather than frequent and obvious.

Within those limits this page covers twenty-eight languages, including eleven written in India. It works out the source language itself, so there is nothing to set on that side.

Two settings matter more than they look. The register control decides between formal and informal address, and in a great many languages that is grammar rather than style — Hindi has three levels of you, French and German two, and Japanese encodes it across the whole verb system. Getting it wrong does not produce a slightly off translation; it produces one that is rude or oddly intimate. The default matches whatever the original implied, which is right when you are translating something written by someone else and want their pitch preserved.

The romanisation switch writes the translation a second time in the Latin alphabet. It exists for a specific and common situation: you need to say something aloud in a language whose script you cannot read. It is skipped automatically when the target already uses Latin letters.

Idioms are translated as equivalents where one exists and as plain speech where none does, rather than word by word into nonsense. Proper nouns, brands, code, URLs and numbers are left alone. Where a term genuinely has no counterpart, the original word is kept with a short gloss in brackets, once. The one thing it will not do is improve what you gave it — a factual mistake in the source is translated faithfully rather than silently corrected.`,
    steps: [
      "Paste the text. You do not need to say what language it is in.",
      "Choose the language to translate into.",
      "Set the register — formal or informal — if the situation calls for a specific one.",
      "Turn on the Latin-alphabet version when you need to read the result aloud.",
      "For anything consequential, have a fluent speaker check it before you rely on it.",
    ],
    faq: [
      {
        q: "How good is it, honestly?",
        a: "Very good for prose of the kind people write to each other: emails, articles, instructions, messages. Weaker on poetry, wordplay, legal drafting and highly regional idiom. The characteristic failure is not gibberish, which you would notice, but a sentence that reads perfectly and means something slightly different — which is why anything that matters wants a human check.",
      },
      {
        q: "Which Indian languages are covered?",
        a: "Hindi, Bengali, Assamese, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi and Urdu. Quality is best on the ones with the most written material online, so Hindi and Bengali are stronger than Assamese, which is a fact about training data rather than about the languages.",
      },
      {
        q: "Will it keep my formatting?",
        a: "Paragraph breaks and list structure are preserved. Detailed markup is not guaranteed — if you are translating something with a lot of formatting, translate the text and reapply the formatting afterwards.",
      },
      {
        q: "Can I translate a document rather than pasted text?",
        a: "Not on this page, which takes text only. Extract the text with one of the document tools here, which run on your own machine, then paste it in. Nothing but the text you choose to paste ever leaves the device.",
      },
    ],
  },

  "write-email": {
    intro: `The hard part of an email is almost never the words. It is deciding what the email is actually for, and then resisting everything that gets in the way of saying it: the paragraph of context nobody needs, the apology for writing at all, the request buried politely in the fourth sentence where it can be missed.

Describe the situation here and you get a draft with the ask in the first paragraph. Seven kinds are on offer, and each carries its own rules about what makes that kind of email work. A request has to be easy to say yes to: what, by when, and why it is reasonable. A follow-up gets one short reminder of what it is about and then the ask again, with no guilt and no third apology for chasing. A refusal says no in the first two lines, gives one honest reason, and does not leave the door ambiguously open, which is the kindest way to decline and the hardest to write. An apology takes responsibility once and moves to what happens next, rather than performing contrition at length in a way that makes the reader console you.

The subject line comes first in the output and is written to say what the email is about, since "Quick question" and "Touching base" tell an inbox nothing and are the reason a message sits unopened for three days.

Facts are held to what you give it. No invented dates, amounts, names or shared history. Where the brief leaves out a detail the email needs, a bracketed placeholder goes in so that it is obvious what to fill rather than plausible enough to send by accident.

One small thing it will never do, on explicit instruction: begin by hoping the email finds you well.

Read the draft before you send it. It is a first draft written by something that has never met the recipient, which is a fine place to start and a poor place to stop.`,
    steps: [
      "Describe what the email needs to do, including anything the recipient already knows.",
      "Pick the kind — a request, a refusal, a follow-up, an apology and so on. This changes the structure, not just the wording.",
      "Choose a length. Three lines is right far more often than people expect.",
      "Put your name in the sign-off box so you do not have to edit it afterwards.",
      "Fill in every bracketed placeholder, read it once as the recipient, and send it.",
    ],
    faq: [
      {
        q: "Will the recipient be able to tell?",
        a: "If you send the draft unedited, quite possibly — generated email has a recognisable evenness to it. The fix is small: cut a sentence, use a contraction, and add the one specific detail only you would know. That last is what makes a message read as written by a person.",
      },
      {
        q: "Can it reply to an email I paste in?",
        a: "Yes. Choose the reply kind and paste the message you are answering along with a line about what you want to say. It will answer each question the original asked rather than restating the thread back at them.",
      },
      {
        q: "Why are there square brackets in my draft?",
        a: "Because the brief did not supply something the email needs — a date, a figure, a name. They are deliberately conspicuous. Inventing a plausible date that you then fail to notice would be far worse than a gap you cannot miss.",
      },
      {
        q: "Is it any good at saying no?",
        a: "It is instructed carefully on it, because a refusal is the kind of email people most want help with and most often get wrong. The refusal goes in the first two lines, gets one honest reason, and is not softened into a maybe. Check that before sending: an ambiguous no produces a second conversation.",
      },
    ],
  },

  "title-generator": {
    intro: `A title has one job, which is to tell the right person that this is for them. Almost everything that goes wrong with headlines is a failure to do that in favour of doing something else — being clever, being intriguing, or covering the subject so broadly that it describes four hundred other articles equally well.

Give this page the subject and it returns a set of options, numbered, one per line. They are meant to be genuinely different from each other rather than one title reworded ten times, because a list of near-identical options is a list of one option.

The platform setting is not cosmetic, since each has a different constraint. A blog title is aiming at fifty to sixty characters so a search result does not truncate it. A video title is front-loaded, because on a phone only the first four words are visible. An email subject line has under forty-five characters and must survive being read with no surrounding context in a crowded inbox. A report title carries no wordplay and no question mark. A news headline names the actor and uses the present tense.

The flavour setting controls the register, and the curiosity setting is the one worth explaining. Curiosity that works comes from naming a real tension or an unexpected specific that the piece genuinely contains. Curiosity that does not comes from withholding the subject, which produces a click and then a reader who feels tricked. The instruction here is for the first kind only: nothing that would disappoint someone who clicked it.

There is a banned list, and it is there because these phrases have been used past the point of meaning anything. Ultimate. Complete guide. Everything you need to know. Game-changer. Unlock. Delve. In today's fast-paced world. Along with the colon used to bolt a vague promise onto the end of a real title.`,
    steps: [
      "Describe what the piece is about — a sentence or two is plenty, or paste the opening paragraph.",
      "Pick the platform, which sets the length limit and the shape.",
      "Choose a flavour, or leave it mixed to get a spread of forms to compare.",
      "Run it, then read the list for the one that names the specific thing your piece has.",
      "Take the best option and edit it. The list is raw material, not a decision.",
    ],
    faq: [
      {
        q: "How many should I ask for?",
        a: "Ten is a good default. Beyond about fifteen the later entries start reaching for variety rather than quality and you end up rejecting most of them. Three is right when you already know the angle and want the phrasing tightened.",
      },
      {
        q: "Why does it refuse to write clickbait?",
        a: "Because it does not work twice. A headline that promises more than the article delivers earns the click and loses the reader, and search engines have measured that pattern for years. Curiosity built on something the piece actually contains does work, and that is what the curious setting produces.",
      },
      {
        q: "Can I use it for a video or a podcast episode?",
        a: "Yes — choose the video platform setting, which front-loads the title so it survives being cut off on a phone. The same setting suits podcast episodes, which are truncated in much the same way in most apps.",
      },
      {
        q: "Should I paste the whole article?",
        a: "You can, and the titles improve when you do, because it can pick the concrete detail that makes a headline specific. Up to eight thousand characters fits. If the piece is longer, paste the opening and any section that carries the main finding.",
      },
    ],
  },

  "meta-description-generator": {
    intro: `The description under a search result is one of the few pieces of writing whose length is dictated by a rendering engine. Google truncates on pixel width rather than character count, which is why the advice varies between one blog and the next, but between about a hundred and forty and a hundred and fifty-eight characters is the range that survives on both desktop and mobile in practice. Write less and you have left space unused; write more and your sentence ends in an ellipsis, usually mid-clause.

This page writes to that budget and prints the character count in brackets after each option, so you can check rather than trust. Several options come back at once, differing in angle rather than wording, because the useful question is which framing to lead with and not which synonym to use.

There is a field for the term you want the page to rank for. When you fill it in, the phrase appears naturally and near the start, which is where it is bolded in the result — and that bolding is most of the reason to place it deliberately. It appears once. Repeating a keyword in a hundred and fifty characters looks exactly like what it is.

Descriptions here are written as sentences someone would actually say, not as a comma-separated pile of terms. Google frequently ignores a supplied description and generates its own from the page, and it is markedly more likely to do that when what you supplied reads as a keyword list rather than a summary.

Each one has to say what the reader gets, specifically. "Learn about PDF compression" is not a description, it is a category. "Shrink a PDF in your browser without uploading it — free, no account, no watermark" is one.

The call-to-action switch is on by default and worth turning off for reference pages, where a nudge to act reads as noise.`,
    steps: [
      "Paste the page's text, or describe the page in a line or two if it is not written yet.",
      "Type the term you want it to rank for, so the phrase lands early where search results bold it.",
      "Ask for several options — comparing angles is the point of the exercise.",
      "Check the bracketed character count on the one you pick; aim between 140 and 158.",
      "Paste it into your page's description meta tag, then look at how it renders in a real search result.",
    ],
    faq: [
      {
        q: "Does the description affect rankings?",
        a: "Not directly — it has not been a ranking factor for many years. It affects whether somebody clicks the result you already have, which is a different and often more valuable lever. A page ranking fourth with a compelling snippet can outperform the same page ranking second without one.",
      },
      {
        q: "Why does Google show something other than what I wrote?",
        a: "It rewrites descriptions routinely, most often when the supplied one does not match the query the searcher typed, or when it reads as a keyword list rather than prose. Writing something a person would say makes the rewrite less likely, though nothing prevents it entirely.",
      },
      {
        q: "Is the character count reliable?",
        a: "The count itself is, but the truncation point is not a character count at all — it is pixel width, so a line of capitals and wide letters is cut sooner than a line of narrow ones. The range this page targets holds for ordinary sentence case. Check anything unusual in a live result.",
      },
      {
        q: "Can I do a whole site's worth at once?",
        a: "Not in a single run, since each page needs its own description written from its own content. Duplicate descriptions across a site are worse than missing ones — they tell a search engine that several pages are the same page.",
      },
    ],
  },

  "blog-outline-generator": {
    intro: `The reason a piece of writing stalls at eight hundred words is almost always that it was started without a structure. There was a topic and an opinion and no plan for how one section would earn the next, so by the middle it is circling, and the only way out is to go back and decide what should have been decided first.

An outline decides it first. This page builds one for a blog post, an essay or a report from a topic and a note about who it is for, and the second half of that input changes the result more than people expect: the same subject aimed at practitioners and at the executives who fund them wants a different sequence entirely.

Six shapes are available here, and every one of them brings its own logic. A how-to follows the order the reader does the thing in, so every section ends with them further along than it found them. A comparison establishes the criteria before introducing the options, judges every option against all of them, and reaches a recommendation with its conditions attached — the three failures of most comparison articles, in order. An essay has its thesis in the first section and confronts the strongest objection rather than a convenient one. A case study runs situation, problem, attempt, outcome, lesson.

Two constraints keep the output usable. Between five and nine main sections, because an outline with fourteen is a list of subjects rather than a plan. And no section called Introduction or Conclusion — each is named for what it contains, since "Body section 2" tells a writer nothing at the moment they most need telling.

At the depth setting above two, each section also gets a line on what it must establish before the reader will accept the next one. That single addition is what turns an outline from a list of topics into an argument.

It closes with a suggestion for the one point that would make the piece worth reading over whatever is already ranking, and optionally a set of questions readers genuinely search for.`,
    steps: [
      "Describe the topic and say who the piece is for. The audience shapes the structure more than the subject does.",
      "Choose the shape — how-to, list, explainer, comparison, essay or case study.",
      "Set the depth. Level three or four is where an outline starts being genuinely useful to write from.",
      "Keep the FAQ suggestions on if the piece will live on a site where search traffic matters.",
      "Rearrange it before you write. It is a draft structure and you know the subject better than it does.",
    ],
    faq: [
      {
        q: "Will it write the article too?",
        a: "No, deliberately. An outline you have argued with is worth far more than a draft you have accepted, because the thinking happens while you are deciding what order the sections go in. Once the structure is right, the writing is comparatively easy and much better done by you.",
      },
      {
        q: "How long a piece does the outline suit?",
        a: "Five to nine sections corresponds to roughly fifteen hundred to three thousand words at ordinary section lengths. For something shorter, take the first four sections. For something much longer, outline each major part separately rather than asking for more sections here.",
      },
      {
        q: "Why no section called Introduction?",
        a: "Because the label describes the position rather than the content, and it is at exactly that point that writers stall. A section named for the job it does — establishing why the reader should care about a problem they have been living with — tells you what to write in it.",
      },
      {
        q: "Are the suggested FAQ questions real search queries?",
        a: "They are plausible ones, not measured ones. This page has no access to search volume data. Treat them as a starting list to check against a keyword tool or against the questions your own readers actually send you.",
      },
    ],
  },

  "social-post-generator": {
    intro: `Every platform has a house style, and the cost of ignoring it is not that a post reads oddly but that it is not read at all. A LinkedIn post arrives as a wall of text and gets scrolled past. A three-hundred-character thought is fine on Threads and too long for X. A post written in marketing voice on Reddit is removed by a moderator, and fairly.

This page writes one social post for one platform, shaped to how that platform is actually read. On LinkedIn that means a hundred to two hundred words in short paragraphs with line breaks between them, and a first two lines that work alone, since everything after them sits behind a More link. On X it means one post under two hundred and eighty characters, not a thread. On Reddit it means writing as a person telling a community what they did and what they learned, with no call to action at all.

The voice setting picks between four registers, and plain is the default for a reason: it is the one that gets read by people who have seen ten thousand posts. Story tells a short one with a beginning, a turn and a point. Teaching explains one thing properly enough to be used. Announcement states what changed, without the countdown theatre.

There is a list of things it will not do, which is longer than the list of things it will. No one-word opening line followed by a full stop for effect. No "I'm thrilled to announce". No "let that sink in". No rhetorical question at the end to farm comments. No aphorism assembled out of em dashes. These are not stylistic preferences. They are the specific tells that make a post read as generated, and stripping them out is most of what makes the result usable.

It will also not claim a result your idea does not contain, which rules out the entire genre of post built on a number nobody measured.`,
    steps: [
      "Say what you want to post about, including any real numbers or specifics you have.",
      "Pick the platform. This sets the length and the shape, both of which differ sharply.",
      "Choose a voice — plain, story, teaching or announcement.",
      "Turn hashtags on only where they still do something, which is mostly Instagram.",
      "Edit it before posting. One detail only you know is what separates a post from a template.",
    ],
    faq: [
      {
        q: "Will people be able to tell it was generated?",
        a: "If you post it unedited, on LinkedIn, probably. The banned-phrase list removes the obvious tells, but the giveaway that remains is the absence of anything only you would know. Add one specific detail — a number, a name, something that happened — and it stops reading as generic.",
      },
      {
        q: "Why does the Reddit setting have no call to action?",
        a: "Because promotional framing is against the culture and usually the rules of most subreddits, and a post that reads as marketing is removed regardless of how useful it is. Writing as a participant is not a tactic there, it is the only thing that works.",
      },
      {
        q: "Can it write a thread?",
        a: "Not currently — it writes one post at a time. For a thread, run it once for the opening post and then again for each subsequent point, which produces better results than asking for the whole thread at once and getting five posts that repeat each other.",
      },
      {
        q: "Should I use hashtags?",
        a: "Rarely, on most platforms now. They still aid discovery on Instagram. On LinkedIn and X their effect has been marginal for some time and a wall of them reads as a tell in itself. The switch is off by default for that reason.",
      },
    ],
  },

  "keyword-extractor": {
    intro: `Counting words is easy and mostly useless. The words a document repeats are often not the words it is about — a page arguing one point will repeat the connective machinery of the argument far more often than the term at its centre, and any frequency-based extraction will hand you the machinery.

This page ranks by centrality instead: how much a term matters to what the text argues, rather than how many times it appears. A term used twice in the thesis outranks one used nine times in an aside. That is a judgement rather than a count, which is the reason this tool needs a model and the word counter on this site does not.

Three output shapes cover the uses. A ranked list is for reading. Grouping under themes is for a long document where the terms fall into distinct clusters, and the clusters themselves are often the finding. Comma-separated output is for pasting into something else.

Multi-word phrases are included by default, and turning them off changes the results substantially. Where the phrase is the unit of meaning, splitting it destroys it: "browser-based processing" is a concept, while "browser" and "processing" separately are two ordinary words that appear in millions of documents. Most of the terms worth having in a technical or commercial document are phrases of two or three words.

Stop words are excluded, along with generic filler nouns — thing, way, process, solution — unless the document is using one as a term of art, which does happen. So is anything that would describe a thousand other documents equally well, which is the real test of whether an extracted keyword is worth anything.

The document's own wording is preserved. If a page consistently says "handset", the term you get back is handset, not "mobile phone" normalised into what somebody thought it should have been called.`,
    steps: [
      "Paste the article, page or batch of messages you want read.",
      "Choose a shape: ranked to read, grouped to see the clusters, comma-separated to paste elsewhere.",
      "Set how many terms you want. Twenty is a sensible default for a single article.",
      "Leave multi-word phrases on unless you specifically need single words.",
      "Compare the result against what you intended the page to be about. A mismatch is the useful finding.",
    ],
    faq: [
      {
        q: "How is this different from counting word frequency?",
        a: "Frequency measures repetition; this measures centrality. They disagree constantly. An article about database indexing will say the word database forty times and the word index eleven times, and index is the subject. A frequency tool cannot see that difference and a model reading for sense can.",
      },
      {
        q: "Can I use it for keyword research?",
        a: "Not on its own, and it is worth being clear about the limit. This tells you what a text is about. It has no access to search volume, competition or what anyone is actually typing into a search engine. It is useful for auditing what your existing pages cover, and for finding gaps, rather than for choosing what to write next.",
      },
      {
        q: "Why did a term I care about not appear?",
        a: "Usually because the text mentions it without being about it. That is worth knowing rather than working around: if a term matters to you and does not survive extraction from your own page, the page probably does not make enough of it.",
      },
      {
        q: "Does it work on a batch of customer messages?",
        a: "Yes, and it is one of the more useful applications — paste a column of support tickets or survey answers and the recurring subjects surface quickly. Pair it with the sentiment page if you also want to know how people feel about each one.",
      },
    ],
  },

  "sentiment-analysis": {
    intro: `Sentiment analysis has a reputation problem it has earned. Presented as a percentage it looks like a measurement, and people treat it as one — sixty-eight per cent positive goes into a slide, gets compared against last quarter, and becomes a number a decision rests on. It is not a measurement. It is a reading, and readings of tone are wrong often enough that the decimal point is a lie.

This page gives you the reading and refuses the false precision. You get a verdict with the reasoning attached, the themes people keep returning to, and a verbatim quotation for each finding so you can check the interpretation against the words that produced it. Those quotations are the important part. A theme without an example is an assertion; a theme with three examples is something you can argue with.

Two modes cover the two situations. Whole-text analysis reads a single piece and describes the shape of the feeling in it, including whether it is uniform or split — which is a materially different finding from an average. Line-by-line treats each line as its own item, which is what you want when you have pasted a column of reviews or survey responses out of a spreadsheet, and it ends with a tally rather than a percentage.

The instruction that matters most is the one about ambiguity. Sarcasm reads as praise to any system that scores words. Politeness masking complaint is the standard register of British and Indian customer feedback both, and reads as neutral or mildly positive when it means nothing of the sort. Where those are suspected, this page is told to say so rather than force the item into a category, and an honest "this could be either" is worth more than a confident classification that is backwards.

What it cannot do is tell you why. That takes talking to the people who wrote it.`,
    steps: [
      "Paste the feedback — reviews, survey answers, support messages, or a single long piece.",
      "Choose line-by-line when each line is a separate response, or whole-text for one continuous document.",
      "Keep the themes on. The recurring subjects are usually more actionable than the overall verdict.",
      "Keep the examples on and read them. They are how you check the interpretation rather than trust it.",
      "Treat the tally as an indication. Where it disagrees with your instinct, read the source before believing either.",
    ],
    faq: [
      {
        q: "Why is there no percentage score?",
        a: "Because a percentage implies a precision that does not exist here. Sarcasm, understatement and cultural register all defeat automated tone reading, and the errors are not evenly distributed — they cluster in exactly the responses that matter most. A tally of items with the reasoning visible is honest about what it is. A decimal is not.",
      },
      {
        q: "Does it handle sarcasm?",
        a: "Better than a word-scoring system, and imperfectly. It is instructed to flag suspected sarcasm as ambiguous rather than to resolve it, on the grounds that a marked uncertainty you can check beats a confident classification you cannot. Expect to catch some yourself.",
      },
      {
        q: "How much feedback can I paste at once?",
        a: "Twenty-four thousand characters, which is a few hundred short reviews. For larger sets, run it in batches and compare the themes between them — themes that hold across batches are the real ones, and themes that appear in only one are usually noise.",
      },
      {
        q: "Can I use this to score individual customers or staff?",
        a: "Please do not. It is not accurate enough at the level of a single item to carry a consequence for a named person, and the errors fall hardest on people who write indirectly or in a second language. It is a tool for finding patterns in a pile, not for judging one item in it.",
      },
    ],
  },

  "text-to-table": {
    intro: `Data arrives shaped like prose more often than anyone plans for. A supplier sends the month's orders in the body of an email. A conference publishes its speakers as a page of headings. A colleague pastes forty addresses into a chat message. The information is all there and structured in a way a person recognises instantly and a spreadsheet cannot use at all.

This page pulls the repeating records out and returns them as a table. CSV to open in a spreadsheet, JSON to feed something, or a Markdown table to paste into a document. Either name the columns you want, or leave the field blank and let it work out the smallest set that captures what the records actually hold.

The rule that makes the output trustworthy is that values are copied rather than tidied. Dates keep the format they were written in. Abbreviations stay abbreviated. A misspelt name comes through misspelt. Currencies are not converted. Every one of those transformations is easy to perform and destroys the thing you needed most, which is the ability to check the table against the source and see that they match.

Empty cells work the same way. When a record does not state a value, the cell is left empty — not inferred, not carried down from the row above, and not filled with N/A or unknown, which are strings that will need cleaning out later. Carrying values down is the failure that does the most damage, because it produces a table that is complete, plausible and wrong in a way that no sanity check catches.

The CSV is written properly: fields containing a comma, a quotation mark or a newline are quoted, and quotation marks inside a quoted field are doubled. That is the difference between a file that opens correctly and one where a single address containing a comma shifts every column after it.

Where the text genuinely has no repeating structure, it says so rather than manufacturing a table out of one.`,
    steps: [
      "Paste the text holding the records — an email, a page, a list, a set of notes.",
      "Pick the output: CSV for a spreadsheet, JSON for code, Markdown for a document.",
      "Name the columns you want if you know them; leave it blank to have them worked out.",
      "Keep unstated values blank rather than guessed, unless you have a reason to want inference.",
      "Open the result and spot-check three rows against the source before you use it for anything.",
    ],
    faq: [
      {
        q: "How accurate is the extraction?",
        a: "Good on text with an obvious repeating pattern, less good where records vary in shape or where one field is easily mistaken for another. Always check a few rows against the source. The characteristic error is not a garbled row, which you would notice, but a value landing in the wrong column in a way that looks entirely reasonable.",
      },
      {
        q: "Why will it not fill in the blanks?",
        a: "Because an inferred value is indistinguishable from a stated one once it is in a spreadsheet cell, and the whole worth of extracted data is knowing where it came from. A blank cell is a visible question. A carried-down value is an invisible error that survives every check you would think to run.",
      },
      {
        q: "Can it read a PDF or a spreadsheet?",
        a: "Not directly. Extract the text first with the PDF tools here, which work entirely on your own machine, and paste the result. If your data is already in a spreadsheet it is already a table, and the conversion tools on this site will move it between formats without a model being involved at all.",
      },
      {
        q: "What if some records are missing a field entirely?",
        a: "The column still appears, with empty cells where the value is absent. Dropping a column because it was often empty would hide the fact that the source is incomplete, which is usually the thing you most need to know.",
      },
    ],
  },

  "regex-generator": {
    intro: `Regular expressions are read far more often than they are written, which is exactly backwards from how they are taught. Most people writing one have not written one for six months, know precisely what they want to match, and will spend twenty minutes rediscovering whether the flavour in front of them supports lookbehind.

Describe the match in English here and the expression comes back, along with the two things that decide whether it works in practice: whether it is anchored, and whether it is meant to validate a whole string or find matches inside one. Getting that pair wrong is the most common way a correct-looking pattern fails in production, and it fails quietly — an unanchored validation pattern accepts anything with a valid substring buried in it.

The flavour setting is not a formality. Go's RE2 has no backreferences and no lookaround of any kind, by design, because it guarantees linear-time matching. POSIX, which is what grep -E gives you, has no shorthand classes and no lazy quantifiers. If your description needs a feature the chosen flavour cannot express, this page says so plainly and gives the nearest thing that works, with its limitation named, rather than handing over a pattern that fails on the target platform.

Readability is preferred over cleverness throughout: character classes rather than long alternations, no nested quantifiers that can backtrack catastrophically, and a recommendation to use two simple expressions where one dense one would be worse. That last suggestion is offered surprisingly often and is almost always right.

The breakdown explains the pattern component by component, in the order the components appear. The examples list strings it matches and, more usefully, near-misses it rejects — chosen to be the ones a careless pattern would wrongly accept, which is what you want to see before trusting it.

Then test it. There is a regex tester on this site that runs entirely on your own machine, and no generated pattern should be deployed without going through something like it.`,
    steps: [
      "Describe what should match, in ordinary words. Mention the cases that should not match too.",
      "Pick the flavour you will use it in — this genuinely changes what is possible, not only the syntax.",
      "Read the line about anchoring before anything else. It decides whether the pattern validates or searches.",
      "Check the near-misses in the “does not match” list against your real data.",
      "Paste it into the regex tester here and run it over real examples before you ship it.",
    ],
    faq: [
      {
        q: "Can I trust the expression without testing it?",
        a: "No, and that is true of hand-written ones too. A pattern that matches every example you thought of can still match things you did not, and validation bugs almost always take that shape. The tester on this site runs on your own machine and takes a minute.",
      },
      {
        q: "Are the example strings verified?",
        a: "Yes, by your browser rather than by the model. Every string in the two lists is run against the generated expression using the engine already in this tab, and anything that behaves differently from its label is reported to you as a contradiction. This exists because it caught one: an early answer here filed a valid postcode under the strings it rejects. What the check proves is narrow but real — that the expression and its own examples agree. It cannot tell you the expression is the one you meant to ask for, and it stays quiet on flavours whose syntax this engine would misread, such as POSIX bracket expressions.",
      },
      {
        q: "Why does the Go option sometimes refuse part of my description?",
        a: "Because Go's regexp package implements RE2, which deliberately omits backreferences and lookaround to guarantee that matching cannot blow up on a crafted input. That is a real trade-off rather than a missing feature, so the honest answer is to say the expression cannot be written there, and give the nearest one that can.",
      },
      {
        q: "Should I use a regex to validate email addresses?",
        a: "Usually not. The specification permits addresses far stranger than any reasonable pattern accepts, and the strict expressions are unreadable and still wrong. Check for an at sign with something either side, then send a confirmation email — which is the only test that establishes the thing you actually care about.",
      },
      {
        q: "What does catastrophic backtracking mean?",
        a: "A pattern with nested quantifiers can take exponential time on an input that nearly matches, hanging the process. It is a real denial-of-service route when patterns run against user input. The expressions here avoid the constructs that cause it, and the RE2 flavour cannot express them at all.",
      },
    ],
  },

  "sql-generator": {
    intro: `The gap between knowing what you want from a database and writing the query for it is mostly syntax you use too rarely to remember. Window functions, date arithmetic, and the particular way each product does pagination are the three that send people to a search engine every single time, because the answer differs between products in ways nothing else does.

Ask the question here in plain words, paste your tables, and the query comes back in the dialect you name. Six are covered, and the differences between them are not cosmetic: date handling, string functions, limits and pagination diverge sharply, and a query copied from a PostgreSQL answer into SQL Server usually fails on the first of those.

Pasting the schema is the single thing that most changes the quality of the result. Without it the query has to invent your column names, and it will invent reasonable ones that are not yours, leaving you to rename half of them. Table and column names in any form work — a create statement, or just orders(id, customer_id, total, created_at) on a line.

It writes SELECT statements only. Ask for an update or a delete and it says so instead, which is a deliberate limit rather than an omission: a generated statement that modifies data is a bad idea in a text box with no undo, and anyone who genuinely needs one is better served writing it themselves with the table in front of them.

Where the question implies keeping rows that have no match, it uses an outer join and says what happens to them, which is the join mistake that silently drops data and produces a number nobody questions.

The explanation covers what the query does and flags anything that will be slow on a large table — a function wrapped around an indexed column, a correlated subquery in the select list, a join with no usable condition. It cannot know your indexes or your row counts, so read it as a prompt to check rather than a verdict.`,
    steps: [
      "Write the question in plain English, including any filters or date ranges you need.",
      "Paste your tables and columns in the schema box. This matters more than any other setting.",
      "Choose the dialect you actually run against — the differences are real.",
      "Read the query before running it, and run it on a copy or with a limit first.",
      "Check the performance notes against your own indexes, which the page cannot see.",
    ],
    faq: [
      {
        q: "Why will it not write an update or a delete?",
        a: "Because there is no undo behind a text box, and a generated statement that modifies data can be subtly wrong in ways a read query cannot — a missing where clause updates every row and returns no error. Read queries can be checked by looking at what comes back. Write queries are checked by the damage.",
      },
      {
        q: "Do I have to give it my schema?",
        a: "No, but the result is much better with it. Without a schema it uses plainly-named placeholders and tells you which names it assumed, so you can substitute your own. With one it uses your actual columns and will tell you if the question needs something your tables do not have.",
      },
      {
        q: "Is it safe to paste my table structure?",
        a: "That is your call to make, and it is worth making deliberately. Table and column names go to the AI provider like everything else in this category. They are not usually secret, but they do describe your systems. Paste the tables the question needs and leave the rest out.",
      },
      {
        q: "Will the query be efficient?",
        a: "It will be reasonable and it may not be optimal, because efficiency depends on indexes, row counts and statistics that this page cannot see. The notes flag the patterns that are commonly slow. Run it against an execution plan before putting it anywhere it will run often.",
      },
    ],
  },

  "explain-code": {
    intro: `Reading unfamiliar code is a slow business, and the slowest part is not the syntax. It is working out the intent — why this is here, what it assumes, what happens if the assumption fails — none of which the code states and all of which the person who wrote it knew.

Paste a function, a file, a config or a shell one-liner here and you get that account. It opens with one sentence on what the whole thing is for, then works outward: the inputs, what happens to them, what comes out, and what it touches on the way — files, network, global state, the clock. Those last four are what turn a function that looks pure into one that behaves differently on Tuesday, and they are the things a summary of the code most often leaves out.

The audience setting genuinely changes the explanation rather than its tone. For someone new to the language, the syntax is explained as well as the intent, and every construct is named so it can be looked up. For a working developer the syntax is skipped entirely and the account concentrates on control flow and the decisions embedded in it. For a reviewer, the explanation is brief and the weight moves to what could go wrong: edge cases, unchecked assumptions, and behaviour that will surprise whoever calls it.

The language is identified in the first line, and where the snippet is truncated or leans on something not shown, that is stated rather than assumed. A confident explanation of a function whose helper you did not paste is a guess wearing a suit.

The warnings section only lists real problems in the code in front of it — unhandled errors, unvalidated input, a resource never closed, an off-by-one, a race, a comparison that will surprise. If there are none worth naming it says so instead of padding the section, which is the failure that makes such sections stop being read.`,
    steps: [
      "Paste the code. Include the surrounding function or file if the snippet depends on it.",
      "Pick who the explanation is for — that changes what gets explained, not just how.",
      "Turn on the line-by-line walk when you need to follow it closely rather than understand it broadly.",
      "Read the warnings section, then check each item against the code yourself.",
      "Where it says something is missing or truncated, paste that part in and run it again.",
    ],
    faq: [
      {
        q: "Should I paste code from work?",
        a: "Think about it first. Unlike the rest of this site, the AI category sends what you paste to a provider, and proprietary source is exactly the sort of thing many employers have a policy about. Paste an isolated function rather than a file with credentials, internal hostnames or business logic you would not put in a public issue.",
      },
      {
        q: "Can it find bugs?",
        a: "It finds some, particularly the common shapes: unhandled errors, missing null checks, resources that are never released, off-by-one boundaries. It cannot know your requirements, so it cannot tell you that correct-looking code implements the wrong rule. Treat the warnings as a list to check, not a clean bill of health.",
      },
      {
        q: "What languages does it handle?",
        a: "Anything widely written, and it identifies the language itself. Quality tracks how much of a language exists publicly, so mainstream languages are explained better than niche or in-house ones. It handles configuration formats and shell scripts as well, which is often where the real confusion is.",
      },
      {
        q: "How much can I paste?",
        a: "Sixteen thousand characters, roughly four hundred lines. For a larger file, paste the part you do not understand along with anything it calls. A focused explanation of one function is more useful than a shallow tour of a whole module in any case.",
      },
    ],
  },

  "commit-message-generator": {
    intro: `A commit message is written in ten seconds and read for years, usually by someone bisecting a regression at an unreasonable hour. "Update files" and "fix stuff" are cheap at the moment of writing and expensive every time afterwards, which is the exact shape of debt that never gets repaid.

Paste a diff here and get a message that describes the change rather than the file list. The distinction is the whole point: "Update media.ts" restates what the version control system already knows, while "Fix crash when the file has no audio track" tells the person reading the log the thing they came for.

Three conventions are supported. Conventional Commits produces the type, scope and description format that changelog tooling parses, with the exclamation mark and the breaking-change footer where they apply. A plain summary line is one line, imperative, no full stop. The descriptive form adds a body of a few lines wrapped at seventy-two characters explaining what changed and why.

The subject line limit is adjustable and defaults to seventy-two characters, which is the width that survives in git log without wrapping in most terminals. Imperative mood throughout — add, not added or adds, because the message completes the sentence "this commit will".

The switch for the reason is worth leaving on. Where the diff shows why — a bug being fixed, a constraint being satisfied, a check being added after something got through — it says so. Where the motivation genuinely is not visible in the diff, it leaves a bracketed placeholder rather than inventing a rationale, because a plausible invented reason in a commit log is worse than no reason at all: it will be believed.

If the diff is plainly two unrelated changes, it says so and offers a message for each, which is a hint that you probably wanted two commits.

Nothing about an issue number, a ticket or a co-author is added unless it appears in what you pasted.`,
    steps: [
      "Run git diff --staged and paste the output, or describe the change in words.",
      "Pick the convention your project uses.",
      "Set the subject line limit if your team uses something other than seventy-two characters.",
      "Read the message against the diff — it should describe the change, not the files.",
      "Fill in any bracketed placeholder about why the change was made before committing.",
    ],
    faq: [
      {
        q: "Can it work out why I made the change?",
        a: "Only where the diff shows it. A test added alongside a fixed boundary condition tells its own story; a refactor with no other evidence does not. When the reason is not visible it leaves a marked gap rather than inventing motivation, because an invented reason in a commit log is a lie that future readers have no way to detect.",
      },
      {
        q: "How large a diff can I paste?",
        a: "Twenty thousand characters. Beyond that the message is going to be vague regardless of the tool, and a diff that large is usually several commits that have not been separated yet.",
      },
      {
        q: "Is it safe to paste a diff from a private repository?",
        a: "It goes to the AI provider like everything else in this category, so treat it as you would pasting the same code into any external service. Check your employer's policy. If in doubt, describe the change in words instead — that works nearly as well and sends nothing but your own sentence.",
      },
      {
        q: "Why does it sometimes give me two messages?",
        a: "Because the diff contains two unrelated changes. That is a hint rather than a limitation: unrelated changes in one commit are what make a later bisect ambiguous and a later revert awkward.",
      },
    ],
  },

  "citation-generator": {
    intro: `Reference styles are a solved problem that remains annoying because the solution is fiddly rather than difficult. Each style has firm rules about the order of elements, which parts are italicised, how names are inverted, how many authors before et al., and how a missing date is marked — and every one of those rules differs between styles in a way no one memorises.

Paste whatever details you have and this page formats them. Six styles are covered: APA seventh edition, MLA ninth, Chicago's notes and bibliography, Harvard, IEEE and Vancouver. The details can arrive in any order and in any shape. It works out the source type from what you give it — journal article, book, chapter, web page, report, thesis, video, dataset — and applies that type's rules, which is where most of the fiddliness lives.

There is one thing it will not do, and it is the reason to prefer it to a chattier alternative: it will not invent an element. Not a year, not a publisher, not a volume number, not a DOI, not a place of publication. This is the specific and serious failure of using a general-purpose assistant for references — asked for a citation it will produce a beautifully formatted one containing a page range that does not exist, and the formatting is what makes it convincing. Where an element is missing here, the style's own convention for a missing element is used, and the list at the end tells you exactly which details you still need to find.

It also cannot open a URL or look a work up. Give it a bare link and it can only format the link. Give it the title, author, publication and date from that page and it can produce a real reference.

The in-text citation comes with it, in both the parenthetical and narrative forms, since those differ and getting them the wrong way round is the most visible mistake in an otherwise correct bibliography.`,
    steps: [
      "Paste every detail you have: title, author, publication, year, publisher, URL, DOI, pages — order does not matter.",
      "Pick the style your department, journal or publisher requires.",
      "Keep the in-text citation on so you have both the parenthetical and narrative forms.",
      "Read the MISSING list and go and find those details rather than leaving them out.",
      "Check the result against your style guide's own example for that source type.",
    ],
    faq: [
      {
        q: "Can it look up a paper from a DOI or a URL?",
        a: "No. It has no access to the internet and cannot open a link. Give it a bare URL and all it can do is format that URL. Copy the title, authors, journal and year from the page first, and it will produce a proper reference from them.",
      },
      {
        q: "Will it make up a page number or a publisher?",
        a: "It is instructed not to, in the strongest terms available, because that is precisely what a general chat assistant will do when asked for a citation. A missing element gets the style's own marker for a missing element and appears in the list of what you still need to find.",
      },
      {
        q: "Which edition of each style does it use?",
        a: "APA seventh, MLA ninth and Chicago seventeenth, which are the current editions at the time of writing. Harvard is not a single standard at all — institutions publish their own variants — so check the result against your own institution's guide, since differences there are normal rather than errors.",
      },
      {
        q: "Can I do a whole bibliography at once?",
        a: "One source per run works best, since the details of several sources pasted together tend to get attributed to the wrong one. Four thousand characters is the limit in any case, and a reference is short — running it once per source takes moments and gives you a chance to check each.",
      },
    ],
  },

  "readability-checker": {
    intro: `This is the one page in the AI category that sends nothing anywhere. Readability scores are arithmetic — every formula here is a fixed sum over four counts of sentences, words, syllables and letters, published between 1948 and 1975 — so they are computed on your own machine, in the tab you are reading this in, and the text you paste never leaves the device. Asking a language model for a Flesch score would be slower, less repeatable, and would have to be believed rather than checked.

Six scores come back at once, and their disagreement is informative rather than a fault. Flesch Reading Ease runs backwards from the others: a hundred is easy, thirty is hard, and sixty to seventy is the plain English most newspapers aim at. Flesch–Kincaid, Gunning Fog, SMOG, Coleman–Liau and the Automated Readability Index all report a school year instead. They differ in what they punish. Coleman–Liau and ARI count letters, so long words hurt regardless of how they are pronounced. Flesch and SMOG count syllables, so polysyllables specifically hurt. A document of short Latinate words scores differently under each, and seeing the spread tells you which problem you have.

Counting is where these tools usually go wrong, so it is done carefully here. Sentence splitting recognises abbreviations, initials, decimals, version numbers and ellipses, because a naive split on full stops turns "Dr. Rao at 4 p.m." into four sentences and every score that depends on words-per-sentence comes out flattering and wrong. Syllable counting is a documented heuristic — it has to be, since English spelling stopped being phonetic centuries ago — and every published formula was calibrated against hand counts, so a shared approximation is the honest thing to use.

The list of your longest sentences is usually more actionable than any of the numbers. Sentence length is the single largest lever in five of the six formulas, and reading your own thirty-eight-word sentence out of context is the fastest way to see it needed splitting.

Run your text through the simplifier and measure it again to see the change as a number.`,
    steps: [
      "Paste the text. Around a hundred words or more, since these formulas average over sentences and settle down slowly.",
      "Read the Flesch Reading Ease row first — it is the one that reports ease rather than school year.",
      "Look at the spread between the six. A wide gap tells you whether long words or long sentences are the problem.",
      "Set the sentence-length threshold and read the flagged sentences aloud.",
      "Edit, paste it back, and watch the numbers move.",
    ],
    faq: [
      {
        q: "Is my text sent anywhere?",
        a: "No. This page is the exception in its category: the counting and the arithmetic happen in JavaScript in your own tab, and there is no request to any server at all. Disconnect from the network and it carries on working, which is proof rather than assurance.",
      },
      {
        q: "Why do the six scores disagree?",
        a: "Because they measure different things. Letter-counting formulas punish long words whatever their rhythm; syllable-counting ones punish polysyllables specifically; Gunning Fog weighs the proportion of three-syllable words heavily. A wide spread across the six is itself a finding, and usually points at a document with either short sentences full of long words or the reverse.",
      },
      {
        q: "How accurate is the syllable counting?",
        a: "It is a heuristic, and it is described as one deliberately. It counts vowel groups, drops a silent terminal e and knows a few endings that add a beat. It is right for most ordinary English and wrong for loanwords, names and irregular spellings. Every published formula was built on hand-counted syllables, so an approximation is the standard basis.",
      },
      {
        q: "Why does SMOG carry a warning on short passages?",
        a: "Because SMOG was defined for samples of thirty sentences or more and is noisy below that. Scaling it to a shorter document is what every calculator does, and the note appears so you read that row as an indication rather than a score.",
      },
      {
        q: "What score should I aim for?",
        a: "Around school year eight, or a Flesch Reading Ease near sixty, for general audiences — that is roughly where most newspapers sit. Technical documentation for specialists can sit higher without being a problem. A public-facing form or a safety instruction should be considerably lower.",
      },
    ],
  },
};
