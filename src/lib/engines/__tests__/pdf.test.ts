import { PDFDocument, StandardFonts } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";

import { parsePageRange, type InputFile } from "@/lib/engines/file-types";
import {
  addPageNumbers,
  addWatermark,
  cropPdf,
  extractPages,
  mergePdf,
  organizePdf,
  removePages,
  repairPdf,
  rotatePdf,
  splitPdf,
} from "@/lib/engines/pdf";
import { loadPdf } from "@/lib/engines/pdf/document";
import { ToolError } from "@/lib/engines/types";
import type { OptionValues } from "@/lib/tools/types";

/**
 * These run against real PDFs built here rather than checked-in binaries, so the
 * fixtures can state their own page counts and stay readable in the diff.
 *
 * Only the pdf-lib ops are covered. The pdf.js ones need a canvas, which jsdom
 * does not implement — those are verified in the browser instead.
 */

async function makePdf(pageCount: number, label = "Page"): Promise<InputFile> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i++) {
    const page = document.addPage([595, 842]);
    page.drawText(`${label} ${i}`, { x: 60, y: 760, size: 24, font });
  }
  return { name: `${label.toLowerCase()}-${pageCount}.pdf`, bytes: await document.save() };
}

async function pageCountOf(bytes: Uint8Array): Promise<number> {
  const document = await PDFDocument.load(bytes);
  return document.getPageCount();
}

const NO_OPTIONS: OptionValues = {};

let tenPages: InputFile;
let threePages: InputFile;

beforeAll(async () => {
  tenPages = await makePdf(10);
  threePages = await makePdf(3, "Sheet");
});

describe("page ranges", () => {
  it("expands ranges, singles and open-ended forms", () => {
    expect(parsePageRange("1-3, 7, 9-", 10)).toEqual([0, 1, 2, 6, 8, 9]);
  });

  it("treats an empty selection and “all” as the whole document", () => {
    expect(parsePageRange("", 3)).toEqual([0, 1, 2]);
    expect(parsePageRange("all", 3)).toEqual([0, 1, 2]);
  });

  it("keeps the written order and any repeats, which reordering depends on", () => {
    expect(parsePageRange("3,1,1", 3)).toEqual([2, 0, 0]);
  });

  it("names the page count when a selection runs past the end", () => {
    expect(() => parsePageRange("1-99", 10)).toThrow(/10 pages/);
    expect(() => parsePageRange("50", 10)).toThrow(/10 pages/);
  });

  it("rejects a backwards range", () => {
    expect(() => parsePageRange("7-2", 10)).toThrow();
  });
});

describe("loading", () => {
  it("rejects a file that isn't a PDF with a readable message", async () => {
    const notAPdf: InputFile = { name: "notes.docx", bytes: new TextEncoder().encode("PK zip") };
    await expect(loadPdf(notAPdf)).rejects.toThrow(/doesn't look like a PDF/);
  });

  it("rejects an empty file", async () => {
    await expect(loadPdf({ name: "empty.pdf", bytes: new Uint8Array() })).rejects.toBeInstanceOf(ToolError);
  });
});

describe("merge", () => {
  it("concatenates page counts in order", async () => {
    const result = await mergePdf([tenPages, threePages], NO_OPTIONS);
    expect(result.files).toHaveLength(1);
    expect(await pageCountOf(result.files[0].bytes)).toBe(13);
  });

  it("insists on at least two documents", async () => {
    await expect(mergePdf([tenPages], NO_OPTIONS)).rejects.toThrow(/at least 2/);
  });

  it("uses the requested output name", async () => {
    const result = await mergePdf([tenPages, threePages], { filename: "contract" });
    expect(result.files[0].name).toBe("contract.pdf");
  });

  it("reports the page total", async () => {
    const result = await mergePdf([tenPages, threePages], NO_OPTIONS);
    expect(result.stats).toEqual(expect.arrayContaining([{ label: "Pages", value: "13" }]));
  });
});

describe("split", () => {
  it("makes one file per page", async () => {
    const result = await splitPdf([tenPages], { mode: "each" });
    expect(result.files).toHaveLength(10);
    expect(await pageCountOf(result.files[0].bytes)).toBe(1);
  });

  it("zero-pads the numbering so files sort correctly", async () => {
    const result = await splitPdf([tenPages], { mode: "each" });
    expect(result.files[0].name).toContain("-01.pdf");
    expect(result.files[9].name).toContain("-10.pdf");
  });

  it("splits into fixed blocks, with a short final block", async () => {
    const result = await splitPdf([tenPages], { mode: "every", size: 4 });
    expect(result.files).toHaveLength(3);
    expect(await pageCountOf(result.files[2].bytes)).toBe(2);
  });

  it("makes one file per named range", async () => {
    const result = await splitPdf([tenPages], { mode: "ranges", ranges: "1-3, 8-" });
    expect(result.files).toHaveLength(2);
    expect(await pageCountOf(result.files[0].bytes)).toBe(3);
    expect(await pageCountOf(result.files[1].bytes)).toBe(3);
  });

  it("asks for ranges when none are given", async () => {
    await expect(splitPdf([tenPages], { mode: "ranges", ranges: "" })).rejects.toThrow(/ranges/i);
  });
});

describe("remove and extract", () => {
  it("removes the selected pages", async () => {
    const result = await removePages([tenPages], { pages: "2-4" });
    expect(await pageCountOf(result.files[0].bytes)).toBe(7);
  });

  it("refuses to remove every page", async () => {
    await expect(removePages([tenPages], { pages: "1-10" })).rejects.toThrow(/at least one/);
  });

  it("extracts a selection into one document", async () => {
    const result = await extractPages([tenPages], { pages: "1,5,9" });
    expect(result.files).toHaveLength(1);
    expect(await pageCountOf(result.files[0].bytes)).toBe(3);
  });

  it("can extract each page to its own file", async () => {
    const result = await extractPages([tenPages], { pages: "1,5,9", separate: true });
    expect(result.files).toHaveLength(3);
    expect(result.files[1].name).toContain("page-05");
  });
});

describe("organize", () => {
  it("reverses by default", async () => {
    const result = await organizePdf([threePages], { order: "reverse" });
    expect(await pageCountOf(result.files[0].bytes)).toBe(3);
  });

  it("honours an explicit order without sorting it", async () => {
    const result = await organizePdf([threePages], { order: "3,1,2" });
    expect(await pageCountOf(result.files[0].bytes)).toBe(3);
  });

  it("warns about dropped and repeated pages even when the count is unchanged", async () => {
    // "1,1,2" keeps three pages but loses page 3 and duplicates page 1.
    const result = await organizePdf([threePages], { order: "1,1,2" });
    expect(result.note).toMatch(/page 3 is not in the new order/);
    expect(result.note).toMatch(/page 1 appears more than once/);
  });

  it("says nothing when the count is unchanged", async () => {
    const result = await organizePdf([threePages], { order: "3,2,1" });
    expect(result.note).toBeUndefined();
  });
});

describe("rotate", () => {
  it("turns every page by the given angle", async () => {
    const result = await rotatePdf([threePages], { angle: 90, pages: "all" });
    const document = await PDFDocument.load(result.files[0].bytes);
    for (const page of document.getPages()) expect(page.getRotation().angle).toBe(90);
  });

  it("accumulates rather than setting an absolute angle", async () => {
    const once = await rotatePdf([threePages], { angle: 90, pages: "all" });
    const twice = await rotatePdf(
      [{ name: "r.pdf", bytes: once.files[0].bytes }],
      { angle: 90, pages: "all" },
    );
    const document = await PDFDocument.load(twice.files[0].bytes);
    expect(document.getPage(0).getRotation().angle).toBe(180);
  });

  it("leaves unselected pages alone", async () => {
    const result = await rotatePdf([threePages], { angle: 90, pages: "1" });
    const document = await PDFDocument.load(result.files[0].bytes);
    expect(document.getPage(0).getRotation().angle).toBe(90);
    expect(document.getPage(1).getRotation().angle).toBe(0);
  });
});

describe("stamping", () => {
  it("numbers every page and keeps the count", async () => {
    const result = await addPageNumbers([threePages], { pages: "all" });
    expect(await pageCountOf(result.files[0].bytes)).toBe(3);
    expect(result.stats).toEqual(expect.arrayContaining([{ label: "Pages numbered", value: "3" }]));
  });

  it("starts numbering where asked", async () => {
    const result = await addPageNumbers([threePages], { pages: "all", startAt: 7 });
    expect(result.stats).toEqual(expect.arrayContaining([{ label: "Starting at", value: "7" }]));
  });

  it("requires watermark text", async () => {
    await expect(addWatermark([threePages], { text: "  " })).rejects.toThrow(/watermark text/i);
  });

  it("warns that a watermark is not protection", async () => {
    const result = await addWatermark([threePages], { text: "DRAFT", pages: "all" });
    expect(result.note).toMatch(/does not protect/);
  });

  it("tiles without changing the page count", async () => {
    const result = await addWatermark([threePages], { text: "DRAFT", pages: "all", tile: true });
    expect(await pageCountOf(result.files[0].bytes)).toBe(3);
  });
});

describe("crop", () => {
  it("shrinks the crop box by the requested percentage", async () => {
    const result = await cropPdf([threePages], { unit: "percent", top: 10, bottom: 10, left: 0, right: 0, pages: "all" });
    const document = await PDFDocument.load(result.files[0].bytes);
    const box = document.getPage(0).getCropBox();
    expect(box.height).toBeCloseTo(842 * 0.8, 0);
    expect(box.width).toBeCloseTo(595, 0);
  });

  it("insists on at least one non-zero margin", async () => {
    await expect(
      cropPdf([threePages], { unit: "percent", top: 0, bottom: 0, left: 0, right: 0, pages: "all" }),
    ).rejects.toThrow(/at least one margin/i);
  });

  it("refuses margins that would leave nothing", async () => {
    await expect(
      cropPdf([threePages], { unit: "percent", top: 50, bottom: 50, left: 0, right: 0, pages: "all" }),
    ).rejects.toThrow(/leave nothing/);
  });

  it("says the trimmed content is hidden, not deleted", async () => {
    const result = await cropPdf([threePages], { unit: "percent", top: 5, bottom: 0, left: 0, right: 0, pages: "all" });
    expect(result.note).toMatch(/hidden rather than deleted/);
  });
});

describe("repair", () => {
  it("rebuilds a readable document and keeps its pages", async () => {
    const result = await repairPdf([tenPages], NO_OPTIONS);
    expect(await pageCountOf(result.files[0].bytes)).toBe(10);
    expect(result.stats).toEqual(expect.arrayContaining([{ label: "Pages recovered", value: "10" }]));
  });

  it("tells the user to check the result before discarding the original", async () => {
    const result = await repairPdf([threePages], NO_OPTIONS);
    expect(result.note).toMatch(/before discarding the original/);
  });

  it("gives up clearly on a file it cannot parse at all", async () => {
    const rubbish: InputFile = { name: "broken.pdf", bytes: new TextEncoder().encode("%PDF-1.4 then nonsense") };
    await expect(repairPdf([rubbish], NO_OPTIONS)).rejects.toThrow(/damaged beyond/);
  });
});
