import type { ToolContent } from "@/lib/tools/types";

/**
 * SEO prose for the PDF tools. Server-only.
 */
export const PDF_CONTENT: Record<string, ToolContent> = {

  "merge-pdf": {
    intro: `Combining several PDFs into one is the most common thing anyone does to a PDF, and it is the reason most people end up on a file-conversion website at all. Which is unfortunate, because a PDF is very often exactly the document you should not be uploading: a signed contract, a bank statement, a medical letter, a passport scan.

This merges them in your browser. The files are read into the tab, assembled with pdf-lib, and handed back as a download. No upload step exists, so there is no retention policy to read and no server that could have kept a copy.

Order is set by dragging, and the result follows the order on screen. That matters more than it sounds, because merging is usually assembling a submission — a form, then its supporting documents, then the annexures — and the order is the structure of the submission.

What survives the merge: pages, text, images, vector content and the internal links within each document. What is lost or altered: bookmarks and outlines are rebuilt rather than preserved perfectly, form fields from multiple documents can collide if they share names, and any digital signature is invalidated. That last point is not a limitation of this tool but of merging itself — a signature attests to a specific document, and combining it with others produces a different one.

Page sizes are preserved as they are rather than normalised, so merging A4 with Letter gives a document with both. Most viewers handle that without complaint; a printer may not, which is worth checking before sending anything to a print shop.

File size is roughly the sum of the inputs. Run the result through the compression tool if it needs to go by email.`,
    steps: [
      "Drop in every PDF you want combined.",
      "Drag them into the order the final document should read in.",
      "Merge, and download the result.",
      "Compress the output afterwards if it needs to fit an email attachment limit.",
    ],
    faq: [
      {
        q: "Are my documents uploaded?",
        a: "No. They are read into this browser tab and assembled there. Nothing is transmitted, which matters given that the documents people merge are usually contracts, statements and scans of identity papers.",
      },
      {
        q: "How many files can I merge at once?",
        a: "Dozens without difficulty. The practical limit is your device's memory, since every document is held while the merge runs. Very large scanned files will reach that limit sooner than small text ones.",
      },
      {
        q: "What happens to digital signatures?",
        a: "They are invalidated, necessarily. A signature attests to one specific document, and the merged file is a different document. Sign after merging rather than before.",
      },
      {
        q: "Will mixed page sizes cause problems?",
        a: "Not on screen — each page keeps its own size and viewers handle that fine. Printing a document with mixed sizes can produce unexpected scaling, so check before sending it to a print shop.",
      },
    ],
  },

  "split-pdf": {
    intro: `Splitting a PDF means taking one document and producing several. There are two quite different reasons to do it, and they want different behaviour: extracting a section to send on its own, or breaking a bundle into its constituent documents.

This handles both. Split at chosen page numbers to cut a document into sections, or split every page into its own file when a scanner has produced one PDF containing forty unrelated pages.

The privacy point is more pointed here than for most operations. Splitting is what you do to a bank statement to send one page to an accountant, to a medical report to share one result, to a contract to circulate one schedule. The whole purpose is that only part of it should travel — which makes uploading the complete document to a website in order to achieve that a very strange trade. Nothing here leaves your browser.

Page numbering follows what you see in the document rather than what a programmer would count from, so page 1 is the first page. Ranges can be written as 1-3, 7, 12- with the last meaning "to the end", which is the notation most people expect and the one printers use.

Each output keeps the page content exactly: text stays selectable, images stay at their original resolution, and nothing is re-rendered or re-compressed. What does not survive is anything document-wide — bookmarks pointing at pages now in a different file, and a signature that attested to the whole.

Output files are named after the source with a range suffix, so a split of forty pages is still navigable afterwards.`,
    steps: [
      "Drop in the PDF you want to split.",
      "Choose whether to split at particular pages or to separate every page into its own file.",
      "Enter the ranges using the page numbers shown in the document — 1-3, 7, 12- for “to the end”.",
      "Download the results individually, or as a zip when there are many.",
    ],
    faq: [
      {
        q: "Does splitting reduce quality?",
        a: "No. The pages are copied rather than re-rendered, so text stays selectable and images keep their original resolution. It is a structural operation, not a conversion.",
      },
      {
        q: "How do I extract a single page?",
        a: "Enter that page number on its own. The extract-pages tool is the more direct route when pulling out a few specific pages rather than dividing the document.",
      },
      {
        q: "Is my document uploaded to be split?",
        a: "No. Which matters especially here, since the reason to split a document is usually that only part of it should be seen by someone. Uploading the whole thing to achieve that would defeat the purpose.",
      },
      {
        q: "What happens to bookmarks?",
        a: "Document-wide structures do not survive a split — a bookmark pointing at a page now in a different file has nothing to point at. Page content is preserved exactly; navigation built on top of the whole document is not.",
      },
    ],
  },

  "remove-pages": {
    intro: `Deleting pages from a PDF — a blank scan, a cover sheet, an internal note that should not go to the client — is a small edit that most PDF viewers make surprisingly difficult without a paid application.

This removes the pages you name and produces the rest as a new document. The original is untouched, since nothing is written back.

The distinction that matters most is between removing a page and hiding what is on it. Deleting a page removes its content entirely; it is gone from the file. Covering something with a white rectangle does not — the content stays underneath and can be recovered by anyone who extracts the text. If the reason you are removing a page is that it contains something confidential, deleting the page is the right operation and it is genuinely thorough. If only part of a page is the problem, the redaction tool is what you want, because it removes the text rather than covering it.

Pages are named as the document displays them, counting from one. The range notation is the same one a print dialogue uses — 2, 5-7, 11- — which is what most people reach for without thinking about it.

Everything else in the document survives: the remaining pages keep their content exactly, and no re-rendering happens. Internal links pointing at a removed page will no longer resolve, which is a consequence of the page not existing rather than a defect in the removal.

File size drops roughly in proportion to what was taken out, though a document dominated by one large image will not shrink much when a text page goes.`,
    steps: [
      "Drop in the PDF.",
      "Enter the pages to remove, using the numbers shown in the document.",
      "Check the page count of the result against what you expected.",
      "Use the redaction tool instead if only part of a page is the problem.",
    ],
    faq: [
      {
        q: "Is the removed content really gone?",
        a: "Yes. The page is not included in the output at all, so its text and images are absent from the file rather than hidden within it. That is the difference from covering something with a rectangle.",
      },
      {
        q: "Can I get the pages back afterwards?",
        a: "Not from the output — but your original file is untouched, since the result is a new document. Keep the original until you have checked the result.",
      },
      {
        q: "How do I remove every other page?",
        a: "List them explicitly: 2, 4, 6, 8 and so on. There is no interval syntax, since it would be ambiguous alongside the range notation that ordinary page selection uses.",
      },
      {
        q: "What if I only want to remove part of a page?",
        a: "Use the redaction tool. It removes the text itself rather than drawing over it, which is the distinction that has embarrassed a long list of organisations that drew rectangles instead.",
      },
    ],
  },

  "extract-pages": {
    intro: `Pulling specific pages out of a document into a new one is the operation behind sending a single invoice from a batch, a chapter from a report, or the two pages of a contract that someone actually needs to read.

This extracts the pages you name, in the order you name them, into a single new PDF.

That ordering behaviour is deliberate and useful. Entering 5, 2, 9 produces a document with those three pages in that sequence, not sorted back into document order. It means extraction doubles as reordering when you only want part of a document anyway, and repeating a page number includes it twice — which is occasionally exactly what a submission requires.

Extraction is a copy rather than a conversion. Text remains selectable and searchable, images stay at their original resolution, and vector content stays vector. Nothing is rasterised, which is what separates this from printing selected pages to a new PDF — a route that frequently flattens everything into images and quietly triples the file size.

The output carries only the pages you asked for, which is the point: sending a client the one page they need rather than the forty-page bundle it came in is both more considerate and less likely to disclose something you did not intend.

Links pointing at pages that were not extracted will not resolve, and document-wide bookmarks do not carry over. Both follow from the pages not being there.

For dividing a whole document rather than taking a few pages from it, the split tool is the better fit.`,
    steps: [
      "Drop in the source PDF.",
      "Enter the pages you want, in the order they should appear — 5, 2, 9 gives that sequence.",
      "Extract and check the result before sending it on.",
      "Use the split tool instead if you are dividing the whole document rather than taking a few pages.",
    ],
    faq: [
      {
        q: "Will the pages come out in the order I typed?",
        a: "Yes. Entering 5, 2, 9 gives exactly that sequence rather than sorting them. Repeating a number includes the page twice, which is occasionally what a form requires.",
      },
      {
        q: "Does extraction change quality?",
        a: "No. Pages are copied, so text stays selectable and images keep their resolution. Printing selected pages to a new PDF often rasterises everything instead, which is why that route produces larger, worse files.",
      },
      {
        q: "What is the difference between this and splitting?",
        a: "Extraction takes the pages you name into one new document. Splitting divides the whole document into several. Use extraction when you want a few specific pages and splitting when you want all of it in pieces.",
      },
      {
        q: "Are annotations and form fields carried over?",
        a: "Annotations attached to the extracted pages generally survive. Form fields may lose their behaviour if they were part of a document-wide structure, so check any interactive elements in the result.",
      },
    ],
  },

  "organize-pdf": {
    intro: `Reordering the pages of a PDF is the fix for a document that was scanned out of sequence, assembled in the wrong order, or arrived with the appendix in front of the report.

This organises the document visually: pages appear as thumbnails, you drag them into the order you want, and the reordered document comes back.

Seeing the pages is what makes it workable. Reordering by typing page numbers requires knowing what is on each page, and for a scanned bundle that means opening it in another window and cross-referencing. Thumbnails remove that step entirely, and for a document scanned upside-down or sideways they also show you which pages need rotating before anything else.

The classic case this solves is the double-sided scan. A document fed through a single-sided scanner twice arrives as all the odd pages followed by all the even ones, and often with the evens in reverse. Interleaving them by hand is tedious and error-prone; doing it visually takes a minute.

Reordering is a structural operation. The page content is copied exactly, so nothing is re-rendered, nothing is re-compressed, and file size stays essentially the same. Text remains searchable and images keep their resolution.

What does not follow the pages: bookmarks and internal links still point at their original positions, so a table of contents in a reordered document will send readers to the wrong place. Anything that navigates by page number needs checking afterwards, which is a good reason to reorder before adding page numbers rather than after.

Deleting pages is available in the same view, so a bundle can be tidied and trimmed in one pass.`,
    steps: [
      "Drop in the PDF and wait for the page thumbnails to render.",
      "Drag pages into the order you want. Remove any that should not be there while you are looking at them.",
      "Check the sequence in the thumbnails before producing the result.",
      "Add page numbers afterwards rather than before, since numbering follows the final order.",
    ],
    faq: [
      {
        q: "How do I fix a double-sided scan?",
        a: "The odd pages arrive first and the even ones after, often reversed. Interleave them in the thumbnail view — it is the case this tool most obviously exists for, and it takes about a minute for a typical document.",
      },
      {
        q: "Does reordering affect quality or file size?",
        a: "Neither. Pages are copied rather than re-rendered, so content, text selectability and image resolution are unchanged and the file stays roughly the same size.",
      },
      {
        q: "Do bookmarks follow the pages?",
        a: "No. Bookmarks and internal links keep pointing at their original page positions, so a contents page in a reordered document will send readers somewhere unexpected. Check any internal navigation afterwards.",
      },
      {
        q: "Can I rotate pages here too?",
        a: "Rotation lives in its own tool, which handles a batch or individual pages. Doing it there and reordering here keeps each operation predictable.",
      },
    ],
  },

  "rotate-pdf": {
    intro: `A PDF page that displays sideways is usually a scan fed in the wrong orientation, or a page inserted from a landscape source. Reading it means tilting your head or rotating the view every time the document is opened, which the next reader will also have to do.

This rotates pages permanently — the rotation is written into the document, so it displays correctly everywhere rather than only in a viewer where you happened to rotate the view.

That distinction is the whole reason to use a tool rather than the rotate button in a reader. Most viewers rotate the display and do not save it, so the document is unchanged and the next person sees it sideways again. Some offer to save, and then only some of them write it in a way every other viewer respects.

Rotation in a PDF is a page attribute rather than a transformation of the content, which has a pleasant consequence: it is completely lossless. Nothing is re-rendered or re-compressed, text stays selectable, and the file size does not change. A page rotated four times is byte-identical to where it started.

You can rotate the whole document or specific pages, which matters for a mixed bundle where the landscape tables need turning and the portrait text does not.

One thing to check afterwards: some older software and some printers ignore the page rotation attribute and print the original orientation regardless. It is rare now, but if a rotated document prints sideways, that is the cause, and the workaround is to re-print to PDF with the rotation applied.`,
    steps: [
      "Drop in the PDF.",
      "Choose the rotation — 90 degrees clockwise or anticlockwise, or 180 for an upside-down scan.",
      "Apply it to the whole document, or name the pages that need it in a mixed bundle.",
      "Check the result in a viewer, and print a test page if the document is destined for a print shop.",
    ],
    faq: [
      {
        q: "Why does the rotate button in my PDF reader not stick?",
        a: "Because it rotates the view rather than the document. Nothing is written to the file, so the next person to open it sees the original orientation. Rotating here writes it in.",
      },
      {
        q: "Does rotating lose any quality?",
        a: "None at all. Rotation is a page attribute rather than a transformation of the content, so nothing is re-rendered or re-compressed and the file size is unchanged.",
      },
      {
        q: "Can I rotate only some pages?",
        a: "Yes — name the pages that need it. That is the usual case for a bundle containing landscape tables among portrait text.",
      },
      {
        q: "It still prints sideways.",
        a: "Some older printers and drivers ignore the page rotation attribute. Printing to a new PDF with the rotation applied flattens it into the content, which every printer respects.",
      },
    ],
  },

  "compress-pdf": {
    intro: `PDFs are large for a small number of predictable reasons, and knowing which one applies to your document determines whether compression will help at all.

Scanned documents are large because every page is a photograph. A 300-dpi colour scan of an A4 page is several megabytes before anything else, and a forty-page scan is a very large file made of forty large images. That is the case compression helps most, and re-encoding those images at a sensible quality routinely removes most of the size with no meaningful loss for reading on screen.

Text-based PDFs exported from a word processor are usually small already, and where they are not the cause is embedded fonts or an unnecessarily large image on the cover. Compression will do very little to a document that is mostly text, because text in a PDF is already stored efficiently.

This re-encodes embedded images at a quality you choose and rewrites the document structure. The before and after sizes are reported, so a document that does not shrink tells you immediately that images were not the problem.

The quality choice is a genuine trade rather than a free win. Downsampling images to 150 dpi is invisible on a screen and visible in print; 300 dpi is the usual floor for anything that will be printed. If the document is going to a printer, compress less than feels efficient.

Everything happens in this tab, which matters because the documents people most want to shrink — a signed contract for email, a scanned identity document for a form — are precisely the ones that should not be uploaded to achieve it.`,
    steps: [
      "Drop in the PDF.",
      "Choose a quality level. Lower is smaller; check the result if the document will be printed.",
      "Compare the before and after sizes.",
      "If it barely shrank, the document is mostly text and compression has little to work with.",
    ],
    faq: [
      {
        q: "Why did my PDF barely get smaller?",
        a: "Because it is mostly text, which is already stored efficiently. Compression works on embedded images, so a scanned document shrinks dramatically and a word-processor export usually does not.",
      },
      {
        q: "Will compression make my document unreadable?",
        a: "Not at moderate settings — text is not re-encoded, only images are. Aggressive settings soften scanned pages and show on print. Compress less if the document is going to a printer.",
      },
      {
        q: "Is the compression reversible?",
        a: "No. Image re-encoding discards data permanently. Keep the original file, and compress a copy.",
      },
      {
        q: "Are my documents uploaded?",
        a: "No. The document is read and rewritten in this browser tab, which matters given that the files people most want to shrink are contracts and scanned identity documents.",
      },
    ],
  },

  "crop-pdf": {
    intro: `Cropping a PDF trims the visible area of its pages. It is what you want for a scan with a black border, a document with margins so wide the text is lost in the middle, or a page captured at the wrong size.

The important thing to understand is what cropping a PDF actually does, because it is not what cropping an image does. A PDF page has a media box, which is its full extent, and a crop box, which is the region a viewer displays. Cropping sets the crop box. The content outside it is still in the file — it is hidden, not removed, and another tool can restore the full page by resetting the box.

That has a security consequence worth stating plainly. Cropping is not a way to remove something from a document. If a page contains a name in the margin and you crop it away, the name is still there for anyone who looks. For removing content, use the redaction tool, which takes the text out rather than hiding it.

For its actual purpose — making a document readable — cropping is excellent and completely lossless. Nothing is re-rendered, text stays selectable, and the file size barely changes.

Applying the same crop to every page works when the document is uniform, which scans usually are. A mixed document needs the crop applied to groups of pages, since a margin that is right for portrait text will cut into a landscape table.

Printing a cropped PDF gives the cropped area, which is usually what is wanted and occasionally a surprise if the intention was only to change the on-screen view.`,
    steps: [
      "Drop in the PDF and set the crop area on the preview.",
      "Apply it to every page if the document is uniform, or to a range if it is mixed.",
      "Check a few pages of the result, particularly any in a different orientation.",
      "Use the redaction tool instead if the aim is to remove content rather than to hide it from view.",
    ],
    faq: [
      {
        q: "Does cropping delete the content outside the area?",
        a: "No. It sets the crop box, which controls what a viewer displays. The content is still in the file and another tool can bring it back by resetting the box.",
      },
      {
        q: "Can I use cropping to hide confidential information?",
        a: "No, and this is important. Cropped-away content remains in the document and is trivially recoverable. Use the redaction tool, which removes the text rather than hiding it.",
      },
      {
        q: "Does cropping reduce file size?",
        a: "Barely. The content is still there, so only the page dimensions change. Use the compression tool if size is the goal.",
      },
      {
        q: "Can different pages have different crops?",
        a: "Yes — apply a crop to a range of pages rather than the whole document. That is necessary for any bundle mixing portrait and landscape pages, where one crop cannot suit both.",
      },
    ],
  },

  "add-watermark": {
    intro: `Stamping a word across every page of a document marks its status in a way that survives being printed, photographed and forwarded. DRAFT, CONFIDENTIAL, the client's name on a proposal, a date on a version circulated for review.

This adds text across the pages of a PDF, with control over size, opacity, rotation and whether it appears on every page or a selection.

The purpose is mostly social rather than technical. A document marked DRAFT in large diagonal letters does not stop anyone from acting on it, but it stops the specific and common failure where a working version is mistaken for a final one — and it survives the trip through a printer and a photograph, which a filename never does.

Diagonal placement at low opacity is the convention because it works. Diagonal text crosses the whole page, so it cannot be cropped off; low opacity keeps the underlying text readable, which matters because a document nobody can read is a document nobody will use. Fifteen to twenty-five per cent is the usual range.

For confidentiality marking, adding the recipient's name is worth considering. A proposal watermarked with the name of the firm it went to makes a leaked copy traceable to a source, which changes how carefully it gets handled.

The watermark is drawn into the page content, so it is part of the document rather than an annotation a viewer might hide. It can still be removed by someone with the right tools — this is a marking rather than a protection, and treating it as protection is the mistake to avoid.

Existing text stays selectable and searchable underneath.`,
    steps: [
      "Drop in the PDF.",
      "Enter the watermark text — DRAFT, CONFIDENTIAL, a client name, a version date.",
      "Set it diagonally at fifteen to twenty-five per cent opacity so the document stays readable.",
      "Apply to every page unless only part of the document needs marking.",
    ],
    faq: [
      {
        q: "Can the watermark be removed?",
        a: "By someone with the right tools, yes. It is drawn into the page content rather than added as an annotation, which makes it harder than deleting a layer, but it is a marking rather than a protection.",
      },
      {
        q: "Will it make the document hard to read?",
        a: "Not at fifteen to twenty-five per cent opacity, which is the point of the convention. Full-strength text ruins the document, which defeats the purpose of circulating it.",
      },
      {
        q: "Why diagonal?",
        a: "Because it crosses the whole page and cannot be cropped off. A mark in a corner disappears the moment someone trims the page or screenshots the middle of it.",
      },
      {
        q: "Does the text underneath stay searchable?",
        a: "Yes. The watermark is drawn over the existing content rather than replacing it, so the document's own text remains selectable and searchable.",
      },
    ],
  },

  "add-page-numbers": {
    intro: `Page numbers turn a stack of paper into a document. They let someone say "look at page fourteen", they show when a page is missing from a printed bundle, and they are frequently required for court filings, academic submissions and formal reports.

This adds numbers to a PDF that lacks them, with control over position, starting number, format and which pages are numbered.

The options that matter are the ones about starting point. A document with a cover page usually should not number the cover, and the page after it should usually be page one rather than page two. Those are two separate settings — which page to start numbering on, and what number to start at — and needing both is why so many built-in numbering features produce the wrong result.

Formats beyond plain digits are available because documents ask for them. "Page 3 of 40" is the standard for anything that will be printed and handled, since it tells a reader immediately whether they have all of it. Roman numerals for front matter is a publishing convention that persists in formal reports and dissertations.

Position follows convention: bottom centre is the safe default, bottom outer corner is the choice for anything bound, since it puts the number where a thumb finds it. Avoid the bottom of a page that already has a footer, which is the most common collision.

The numbers are drawn into the page content, so they print and survive conversion. They are added after any reordering, which is why numbering should be the last operation on a document rather than an early one.`,
    steps: [
      "Drop in the PDF.",
      "Choose the position — bottom centre for most documents, bottom outer corner for anything bound.",
      "Set which page numbering starts on and what number it starts at. A cover page usually wants both.",
      "Pick the format. “Page 3 of 40” is worth it for anything that will be printed and handled.",
    ],
    faq: [
      {
        q: "How do I skip the cover page?",
        a: "Set numbering to begin on page two and the starting number to one. Those are two separate settings, and needing both is why built-in numbering so often produces a cover marked page one or a second page marked two.",
      },
      {
        q: "Can I use Roman numerals?",
        a: "Yes, which is the convention for front matter in reports and dissertations — numbered separately from the body, restarting at one when the main content begins.",
      },
      {
        q: "The numbers overlap my footer.",
        a: "Move them to a corner, or increase the margin. The tool places numbers where you specify without knowing what is already on the page.",
      },
      {
        q: "Should I number before or after reordering?",
        a: "After, always. Numbers are drawn into the page content and do not follow pages that move, so numbering an unfinished document produces a sequence that no longer matches.",
      },
    ],
  },

  "sign-pdf": {
    intro: `Signing a document electronically covers two quite different things, and knowing which one you are doing matters more than the mechanics.

This adds a visible signature image to a PDF: draw one with a mouse or a finger, type a name in a script face, or upload a photograph of your handwritten signature. That is an electronic signature, and it is legally recognised for the great majority of everyday agreements in most jurisdictions, including India under the Information Technology Act, the United States under ESIGN, and the European Union as a simple electronic signature under eIDAS.

What it is not is a digital signature. That is a cryptographic operation binding a document to a certificate issued to a verified identity, which proves both who signed and that nothing changed afterwards. Some documents require one — certain filings, certain regulated transactions — and no image of a signature satisfies that requirement. Getting a digital signature means a certificate from a licensed authority, not a drawing tool.

For everyday agreements the visible signature is what people expect and what the process is built around. What gives it evidential weight is not the image but the surrounding record: who sent it, when, from where, and the exchange of messages that shows the parties agreed.

Placement is by dragging onto the page, with the size adjustable. Sign after any merging or reordering, since both invalidate a signature and, more practically, move it.

The document is signed in your browser. A contract you are signing is not a document to upload to a stranger's server on the way to signing it.`,
    steps: [
      "Drop in the PDF to be signed.",
      "Draw your signature, type it in a script face, or upload a photograph of a handwritten one.",
      "Drag it into place and size it to fit the signature line.",
      "Do this after any merging or reordering, since both would move or invalidate it.",
    ],
    faq: [
      {
        q: "Is an electronic signature legally binding?",
        a: "For most everyday agreements, yes — under India's Information Technology Act, the US ESIGN Act and the EU's eIDAS regulation among others. Certain categories, such as some property and testamentary documents, still require wet ink or a qualified digital signature.",
      },
      {
        q: "What is the difference from a digital signature?",
        a: "A digital signature is a cryptographic operation using a certificate issued to a verified identity, proving who signed and that the document has not changed. This adds a visible mark. Where a digital signature is required, no image will satisfy it.",
      },
      {
        q: "Can someone copy my signature image out of the PDF?",
        a: "Yes — any visible signature in any document can be extracted and reused, which has always been true of paper too. Evidential weight comes from the surrounding record of the exchange rather than from the image being secret.",
      },
      {
        q: "Is my document uploaded to be signed?",
        a: "No. It is opened and modified in this browser tab. A contract on its way to being signed is close to the last thing that should be uploaded to a third party.",
      },
    ],
  },

  "redact-pdf": {
    intro: `Redaction means removing information from a document, and the distinction between removing and concealing is the entire subject. Drawing a black rectangle over a name in a PDF hides it from view and leaves the text underneath, where anyone can select it, copy it, or extract it with a script. Public bodies, law firms, courts and newspapers have all released documents that way and all had the covered text read back to them.

This does the other thing. Name the words or phrases to remove, and every occurrence is taken out of the document's text and covered. The text is not there to recover, because it has been removed rather than obscured.

Search is across the whole document rather than page by page, which matters because the thing you are redacting is rarely in one place. A name appears in a header, a signature block, a footnote and the body; missing one occurrence undoes the entire exercise, and that is the ordinary way redaction fails.

Two limits stated plainly. Scanned documents contain images of text rather than text, so there is nothing for a search to find — those need the region blurred as an image, which the image blur tool on this site does destructively. And metadata is separate from page content: the author field, the title and the revision history are not touched by redacting the body, and they are a well-known route to what a document used to say.

Check the result by searching it for the terms you removed. If the search finds nothing, the redaction worked. That check takes ten seconds and is the difference between a redacted document and an incident.`,
    steps: [
      "Drop in the PDF.",
      "List every term to remove, one per line — including the variants: full name, surname alone, initials, email address.",
      "Produce the redacted document.",
      "Open it and search for each term. Finding nothing is the confirmation; skipping this step is how redaction fails.",
    ],
    faq: [
      {
        q: "Is the text really gone?",
        a: "Yes. Matching text is removed from the document's content rather than covered over, so there is nothing beneath the marking to select, copy or extract. Verify by searching the result for the terms.",
      },
      {
        q: "Why is drawing a black box not enough?",
        a: "Because the box is a graphic on top and the text is still in the file. Selecting it, copying it or extracting the content recovers it in seconds. This is the mistake behind a long series of public disclosures.",
      },
      {
        q: "Will it work on a scanned document?",
        a: "No. A scan contains images of text, so there is nothing for a search to match. Use the image blur tool to destroy those regions in the pixels, which is the equivalent operation for images.",
      },
      {
        q: "What about metadata?",
        a: "Redacting the body does not touch the author, title, creation software or revision history, and those are a well-known route to what a document previously said. Clear them separately before releasing anything sensitive.",
      },
    ],
  },

  "compare-pdf": {
    intro: `Finding what changed between two versions of a document is a task that gets done badly by reading both. This extracts the text from each and reports the differences.

The comparison is on text rather than on appearance, which determines what it is good for. It will find an altered clause, an inserted paragraph, a changed figure, a deleted sentence — the things that matter in a contract, a policy or a specification. It will not find a changed font, a moved image, an adjusted margin or a different colour, because none of those changes the text.

Options to ignore whitespace and case exist because they remove most of the noise. Two documents exported from different versions of the same software frequently differ in line breaking throughout while saying exactly the same thing, and a comparison that reports every line as changed is a comparison nobody will read.

The obvious use is a contract returned by the other side. "We've made a few small changes" is a sentence that deserves verification, and reading forty pages to find them is not a good use of an afternoon.

Two limits. A scanned document contains no extractable text, so there is nothing to compare — that needs OCR first. And text extraction follows the document's internal ordering, which for a complex layout with columns or sidebars may not match reading order, so a multi-column document can produce differences that are ordering artefacts rather than real changes.

Both documents are read in this browser tab. Sending two versions of a contract to a comparison service is an unusual thing to do with a contract.`,
    steps: [
      "Drop in both versions, original first.",
      "Switch on the whitespace and case options to remove noise from differing export settings.",
      "Read the differences, which are reported as insertions and deletions.",
      "Check anything in a multi-column layout by eye, since extraction order may not match reading order.",
    ],
    faq: [
      {
        q: "Does it compare how the pages look?",
        a: "No — it compares the text. Formatting, fonts, images, colours and layout changes are invisible to it. For those, a visual comparison of rendered pages is the right tool.",
      },
      {
        q: "Why is every line reported as different?",
        a: "Usually different line breaking between the two exports. Switch on the option to ignore whitespace, which removes that noise and leaves the real changes.",
      },
      {
        q: "Can it compare scanned documents?",
        a: "No. A scan holds images of text with nothing to extract. Run OCR on both first, and remember that OCR introduces its own differences where it reads a character differently in each pass.",
      },
      {
        q: "Are my documents uploaded?",
        a: "No. Both are read in this tab, which matters given that the usual reason to compare two PDFs is that one of them is a contract someone has just sent back.",
      },
    ],
  },

  "repair-pdf": {
    intro: `A PDF that will not open is usually not destroyed. The format has a cross-reference table at the end pointing at every object in the file, and if that table is damaged or the file was truncated, a reader refuses to open a document whose content is largely intact.

This attempts a repair by rebuilding that structure: scanning the file for the objects that are actually present, reconstructing the index from what it finds, and writing a valid document.

That works for the common causes. An interrupted download that truncated the file. A transfer that corrupted a few bytes. Software that crashed mid-save and wrote an incomplete table. A file that was edited by something that produced a technically invalid result. In all of those the page content is present and only the map to it is broken.

It does not work when the data is genuinely gone. A file that lost half its bytes has lost half its pages, and no reconstruction can recover what is not there. Encrypted files with a lost password are a different problem entirely and not one a repair addresses.

Recovery is often partial, which is worth expecting rather than being disappointed by. Getting eighteen pages of a twenty-page document back is a good outcome from a damaged file, and the tool reports how many pages it found so you can tell.

Before trying anything: if the file came from somewhere, download it again. A corrupted download is by far the most common cause, and a fresh copy is a better fix than any repair.

Check the recovered document page by page. A file that opens is not necessarily a file that is complete.`,
    steps: [
      "Download the file again first if it came from somewhere — a truncated download is the most common cause.",
      "Drop the damaged PDF in and let the tool rebuild its structure.",
      "Check the reported page count against what the document should have.",
      "Read through the result, since a file that opens is not necessarily a file that is intact.",
    ],
    faq: [
      {
        q: "What can actually be repaired?",
        a: "Damage to the file's structure — a broken cross-reference table, a truncated ending, an invalid index. The page content is usually intact in those cases and only the map to it is broken.",
      },
      {
        q: "What cannot?",
        a: "Missing data. A file that lost half its bytes lost the pages in them, and nothing can reconstruct content that is not present. Encryption with a lost password is a separate problem that repair does not address.",
      },
      {
        q: "Some pages came back and others did not.",
        a: "That is the normal outcome for a damaged file, and usually the best available one. The recovered pages are the objects that were still readable. Check the page count against what the document should contain.",
      },
      {
        q: "Is my file uploaded?",
        a: "No. The repair runs in this browser tab, which is worth knowing given that a document valuable enough to attempt recovering is rarely one to hand to a stranger's server.",
      },
    ],
  },

  "pdf-to-jpg": {
    intro: `Turning PDF pages into images is what you need when the destination cannot take a PDF: a slide, a social post, a chat message, a website, a document editor that will not embed one.

This renders each page and produces an image of it, at a resolution you choose.

Resolution decides whether the output is worth having. The default of 150 dots per inch is right for viewing on a screen. Print wants 300, which doubles the pixels in each dimension and quadruples the file size. Anything below about 100 makes body text hard to read, which is easy to miss when checking a thumbnail and obvious to whoever receives it.

Rendering is the important word. The page is drawn as it appears, so the output is a picture. The text becomes pixels: no longer selectable, no longer searchable, no longer accessible to a screen reader. That is a real loss and it is exactly why converting a PDF to images to email it is usually the wrong instinct — the recipient gets something they cannot search or copy from.

The right reason to do it is that the destination genuinely requires an image. The wrong reason is to prevent copying, which it does not achieve: anyone can read the text off the image, and optical character recognition does it automatically.

JPEG suits pages that are mostly photographs. PNG suits pages that are mostly text or diagrams, because JPEG's compression smears exactly the sharp edges that letterforms are made of — which is why a converted text page looks fuzzy around the type when saved as JPEG.`,
    steps: [
      "Drop in the PDF.",
      "Set the resolution: 150 dpi for screen use, 300 for print.",
      "Choose PNG for pages that are mostly text or diagrams, JPEG for pages that are mostly photographs.",
      "Download the images, individually or as a zip for a long document.",
    ],
    faq: [
      {
        q: "What resolution should I use?",
        a: "150 dpi for anything viewed on a screen, 300 for print. Below 100 the body text becomes hard to read, which is easy to miss when you are checking a thumbnail.",
      },
      {
        q: "Can the text still be selected?",
        a: "No. The page is rendered as a picture, so the text becomes pixels — not selectable, not searchable, and invisible to a screen reader. That is the main cost of the conversion.",
      },
      {
        q: "Does this stop people copying my document?",
        a: "No. Anyone can read text off an image, and OCR does it automatically in seconds. Converting to images inconveniences legitimate readers and stops nobody.",
      },
      {
        q: "JPEG or PNG?",
        a: "PNG for pages of text or diagrams, since JPEG's compression blurs the sharp edges letterforms depend on. JPEG for pages that are mostly photographs, where it is smaller and the artefacts do not show.",
      },
    ],
  },

  "jpg-to-pdf": {
    intro: `Combining images into a single PDF is how a set of photographs becomes a document. Photographed receipts for an expense claim, pages of a form captured with a phone, scanned certificates for an application — all of them want to arrive as one file rather than eleven attachments.

This takes images and assembles them into a PDF, one image per page, in the order you arrange them.

Page size and orientation are worth setting deliberately. Fitting each image to its own page preserves proportions exactly and gives a document with pages of different sizes, which is fine on screen and awkward to print. Fitting everything to A4 gives a uniform document that prints properly, with white space around images whose shape does not match. For anything that will be printed or filed, uniform pages are the better choice.

Orientation should follow the images. A landscape photograph on a portrait page wastes half the sheet and renders the content small; rotating the page to match is a single setting that makes the difference between a readable document and a squinting exercise.

Resolution is inherited from the images. A phone photograph is more than enough for any document, and it is also large — a twelve-page PDF assembled from phone photographs can easily exceed twenty megabytes. Compress the result if it needs to be emailed, or resize the images first.

The text in a photographed document is not text, it is pixels, so the resulting PDF is not searchable. That is inherent to photographing a page rather than a limitation here, and OCR is the only route to searchable text from a photograph.`,
    steps: [
      "Drop in the images and drag them into the order the document should read in.",
      "Choose a uniform page size if the document will be printed, or fit-to-image if it is for screen only.",
      "Set the orientation to match the images rather than leaving landscape photographs on portrait pages.",
      "Compress the result if it needs to go by email, since phone photographs make large PDFs.",
    ],
    faq: [
      {
        q: "Which page size should I choose?",
        a: "A4 or Letter for anything that will be printed or filed, which gives uniform pages. Fit-to-image preserves proportions exactly and produces a document with differently sized pages, which is fine on screen and awkward on a printer.",
      },
      {
        q: "Why is my PDF so large?",
        a: "Because phone photographs are large and there are several of them. Resize the images before assembling, or run the finished PDF through the compression tool.",
      },
      {
        q: "Will the text in my photographs be searchable?",
        a: "No. A photograph of a page contains pixels rather than text, so the PDF is not searchable. Only OCR can produce searchable text from an image, and that is a separate operation.",
      },
      {
        q: "Are my images uploaded?",
        a: "No. They are read in this tab and the PDF is assembled there, which matters given how often the images being combined are receipts, forms and identity documents.",
      },
    ],
  },

  "pdf-to-markdown": {
    intro: `Getting the text out of a PDF as Markdown is useful for moving content into a wiki, a static site, a note-taking application, or anywhere that wants structured text rather than a fixed page.

This extracts the text and infers structure from it — headings from relative font sizes, paragraphs from spacing, lists from leading characters — and produces Markdown.

The inference is the interesting part and the reason to expect a draft rather than a finished conversion. A PDF has no concept of a heading. It has text drawn at a position in a size, and a heading is simply text that happens to be larger and to have space around it. That heuristic works well on a report and poorly on a design-led document where size varies for visual reasons rather than structural ones.

What comes through reliably: paragraphs, headings in a conventionally structured document, simple lists, and the reading order for single-column layouts. What does not: tables, which lose their structure because a PDF table is lines and text at coordinates rather than rows and cells; multi-column layouts, where extraction follows the internal ordering rather than the visual one; footnotes, which land wherever they were drawn; and every image.

Scanned PDFs produce nothing at all, and it is worth understanding why. A scan is a picture of a page, and there is no text in it to extract. That requires OCR, which is a different operation with different failure modes.

Expect to edit the result. This does the tedious ninety per cent — getting the words out in the right order with the paragraphs intact — and leaves the judgement to you.`,
    steps: [
      "Drop in the PDF.",
      "Read the extracted Markdown, checking the heading levels the tool inferred.",
      "Rebuild any tables by hand, since a PDF table has no structure to extract.",
      "For a scanned document, run OCR first — there is no text in a scan to extract.",
    ],
    faq: [
      {
        q: "Why did my tables come out as a jumble?",
        a: "Because a PDF table is lines and text placed at coordinates, with no rows or cells recorded. Extraction can recover the words but not the grid, so tables have to be rebuilt by hand.",
      },
      {
        q: "Nothing was extracted from my document.",
        a: "It is almost certainly a scan — a picture of a page with no text in it. OCR is the only route to text from a scanned document, and it is a separate operation.",
      },
      {
        q: "How does it decide what is a heading?",
        a: "By relative font size and the spacing around the text, since a PDF records no structural information. That works on conventionally formatted reports and poorly on design-led documents where size varies for visual reasons.",
      },
      {
        q: "Why is the text in a strange order?",
        a: "Extraction follows the document's internal ordering, which for multi-column layouts, sidebars and pull quotes may not match the order a person reads in. Single-column documents come out reliably.",
      },
    ],
  },
};
