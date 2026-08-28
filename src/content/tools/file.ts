import type { ToolContent } from "@/lib/tools/types";

/**
 * SEO prose for the Files & Archives tools. Server-only.
 */
export const FILE_CONTENT: Record<string, ToolContent> = {
  "zip-files": {
    intro: `Putting several files into one archive is the ordinary way to send a batch of anything: a set of photographs, a folder of documents, the assets for a design handover. Every operating system can make a zip, and yet people reach for a website to do it constantly — because the built-in tool is somewhere different on every platform, and because on a phone it frequently is not there at all.

This makes the archive in your browser. Files are read into the tab, compressed with deflate, and handed back as a single download. The compression runs on fflate, a deflate implementation in plain JavaScript rather than WebAssembly, which is why the page stays small enough to work on a slow connection and on a phone.

You can name the archive and optionally place everything inside a folder within it, which is the polite thing to do when the recipient will extract it into a directory that already has files in it. Two inputs sharing a filename are numbered rather than silently overwriting each other, because a zip is perfectly capable of holding two entries with the same name and most extractors will quietly keep only one.

The compression level is worth understanding before you move it. Level 6 is the sensible default. Level 0 stores without compressing at all, which is genuinely the right choice when the contents are already compressed: JPEG, PNG, MP4, MP3 and PDF have had their redundancy squeezed out already, and running deflate over them costs time to save a fraction of a per cent. The result panel says so when the saving turns out to be negligible, so you can see it rather than assume it.

Text, source code, CSV and log files are the opposite case and compress dramatically — often to a fifth of their original size.`,
    steps: [
      "Drop in every file you want in the archive. Order does not matter.",
      "Give the archive a name, and optionally a folder name to nest everything inside.",
      "Leave compression at 6, or drop it to 0 if the files are photographs, video or PDFs that are already compressed.",
      "Download the zip. The summary reports how much, if anything, the compression actually saved.",
    ],
    faq: [
      {
        q: "Are my files uploaded to make the archive?",
        a: "No. They are read into this browser tab, compressed there, and returned as a download. Nothing is transmitted, which is why the page continues to work with the network switched off.",
      },
      {
        q: "Can I password-protect the zip?",
        a: "Not here. Zip's own encryption is weak in its common form and awkward in its strong one. Encrypt the file first with the file encryption tool on this site, which uses AES-256-GCM, and zip the encrypted result if you still want it bundled.",
      },
      {
        q: "Why did the archive barely get smaller?",
        a: "Because the contents were already compressed. JPEG, PNG, MP4 and PDF have had their redundancy removed at the point they were created, so deflate has nothing left to find. The zip is still useful as a single container.",
      },
      {
        q: "How large a batch can it handle?",
        a: "A few hundred megabytes in practice. Everything is held in memory while the archive is built, so a phone will run out of room before a laptop does. For very large sets, use the operating system's own archiver.",
      },
    ],
  },

  "unzip-file": {
    intro: `Opening an archive to retrieve one file from it is a small task that becomes irritating on the wrong device. A phone may have no extractor at all, a work laptop may block installing one, and a shared machine is exactly where you do not want to leave an extracted folder behind.

This unzips the archive in your browser and lets you take what you need. Every entry is listed, and each can be downloaded individually.

The filter is what makes it worth using on a large archive. Enter a pattern such as *.csv, or a comma-separated list of several, and only the matching entries are extracted. Pulling three spreadsheets out of a five-hundred-file export is then one operation rather than an extraction followed by a hunt.

Hidden files and the __MACOSX directory are skipped by default. That directory is metadata the macOS archiver adds and no other system wants; it is the reason a zip made on a Mac and opened on Windows appears full of files beginning with an underscore.

One practical limit comes from the browser rather than the tool. A download cannot create directories, so an entry at a nested path is renamed with underscores in place of the separators — "docs/report.pdf" arrives as "docs_report.pdf". The alternative is to flatten the names entirely, which is available as an option but will collide when two folders contain a file of the same name.

Encrypted archives cannot be opened here, and neither can .rar, .7z or .tar.gz, which are different formats that happen to serve the same purpose.`,
    steps: [
      "Drop in the zip archive. Several at once is fine.",
      "Add a filter such as *.csv if you only want particular entries out of a large archive.",
      "Leave the hidden-file option on to skip __MACOSX and dot-files that no other system wants.",
      "Download the entries you need. Folder separators become underscores, since a browser download cannot create directories.",
    ],
    faq: [
      {
        q: "Can it open password-protected archives?",
        a: "No. Encrypted zip entries need the password applied during decompression, which this tool does not implement. Use a desktop archiver for those.",
      },
      {
        q: "What about .rar, .7z or .tar.gz files?",
        a: "None of them are zip files, despite doing the same job, and none can be opened here. Each uses a different container and compression scheme.",
      },
      {
        q: "Why do my extracted files have underscores in their names?",
        a: "Because the archive stored them in folders and a browser download cannot create a folder. The path separators become underscores so the structure is still legible. Switch on flattening if you would rather have the bare filenames.",
      },
      {
        q: "Are the contents uploaded anywhere?",
        a: "No. The archive is decompressed inside this tab and the entries become downloads directly from it. Nothing is sent, which is what makes this safe for an archive you would not hand to a third party.",
      },
    ],
  },

  "epub-to-text": {
    intro: `An EPUB is a zip archive containing XHTML files, a stylesheet or two, images, and a manifest describing how they fit together. Getting the words out of one is useful for reading in a plain editor, for searching with tools that do not understand the format, for feeding into something else, or simply for reading on a device with no ebook reader.

This unpacks the archive in your browser and returns the text as Markdown or as plain text.

Reading order is the part that has to be got right, and it is where naive extractors fail. The chapters inside an EPUB are not named in any order you can sort — they are often c1.xhtml, ch10.xhtml, part2_sec3.xhtml and so on, and sorting those alphabetically produces chapter 10 before chapter 2. The real order lives in the spine, a list inside the package document, and that is what this follows. The result reads as a book rather than as a shuffled one.

Markdown output keeps the structure that survives the trip: headings stay headings, bold and italic are preserved, lists and block quotes keep their shape. Plain text keeps only the paragraphs. Chapter boundaries are marked so you can see where each begins, and the title and author are read from the metadata and placed at the top.

What does not come across: images, footnote links, tables in any useful form, and the original typography. This is a text extraction rather than a conversion, and an EPUB that is mostly illustration will produce very little.

DRM-protected files cannot be opened at all. Their contents are encrypted, and the tool will report that it cannot read the archive rather than pretending otherwise.`,
    steps: [
      "Drop in the EPUB file. Several books at once is fine.",
      "Choose Markdown to keep headings and emphasis, or plain text for paragraphs only.",
      "Keep the chapter separators switched on if you want to see where each one begins.",
      "Download the result. Chapters appear in the book's own reading order, not alphabetical order.",
    ],
    faq: [
      {
        q: "Will this open a book bought from a store?",
        a: "Only if it has no DRM. Protected files from most retailers are encrypted, and the tool will say it cannot read the archive. Books from public-domain sources, direct-from-author sales and library exports usually open without trouble.",
      },
      {
        q: "Are the chapters in the right order?",
        a: "Yes. The order is read from the spine inside the package document, which is the book's own declared reading order. Sorting the files by name instead is what puts chapter 10 before chapter 2.",
      },
      {
        q: "What gets lost in the conversion?",
        a: "Images, footnote links, table layout and all original typography. Headings, emphasis, lists and block quotes survive in the Markdown output. A heavily illustrated book will produce very little text.",
      },
      {
        q: "Can it read .mobi or .azw files?",
        a: "No. Those are Amazon's formats and are structured completely differently. Only EPUB, which is a zip of XHTML, is supported.",
      },
    ],
  },
};
