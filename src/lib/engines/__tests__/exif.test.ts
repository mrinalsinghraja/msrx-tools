import { describe, expect, it } from "vitest";

import { readExif, requireJpegOrTiff } from "@/lib/engines/image/exif";

/**
 * The EXIF reader is pointer arithmetic over a format where a value is either
 * inline or an offset depending on its size, and where the sub-directory
 * holding the interesting tags is itself reached through a pointer. None of
 * that is exercised by a photo with no metadata, so the fixture is built here
 * byte by byte from the spec.
 */

function buildExifJpeg(): Uint8Array {
  // TIFF, little-endian. Offsets below are from the start of this block.
  const tiff = new Uint8Array(142);
  const view = new DataView(tiff.buffer);
  const ascii = (at: number, text: string) => {
    for (let i = 0; i < text.length; i++) tiff[at + i] = text.charCodeAt(i);
  };

  ascii(0, "II");
  view.setUint16(2, 0x002a, true);
  view.setUint32(4, 8, true); // IFD0 starts at byte 8

  view.setUint16(8, 2, true); // two entries

  // Make = "MSRX", five bytes with its terminator, so it lives at an offset.
  view.setUint16(10, 0x010f, true);
  view.setUint16(12, 2, true);
  view.setUint32(14, 5, true);
  view.setUint32(18, 34, true);

  // Pointer to the GPS sub-directory.
  view.setUint16(22, 0x8825, true);
  view.setUint16(24, 4, true);
  view.setUint32(26, 1, true);
  view.setUint32(30, 40, true);

  ascii(34, "MSRX\0");

  view.setUint16(40, 4, true); // four GPS entries

  // Latitude reference "N", two bytes, so it fits inline in the entry.
  view.setUint16(42, 0x0001, true);
  view.setUint16(44, 2, true);
  view.setUint32(46, 2, true);
  ascii(50, "N\0");

  view.setUint16(54, 0x0002, true); // latitude, three rationals
  view.setUint16(56, 5, true);
  view.setUint32(58, 3, true);
  view.setUint32(62, 94, true);

  view.setUint16(66, 0x0003, true);
  view.setUint16(68, 2, true);
  view.setUint32(70, 2, true);
  ascii(74, "E\0");

  view.setUint16(78, 0x0004, true); // longitude
  view.setUint16(80, 5, true);
  view.setUint32(82, 3, true);
  view.setUint32(86, 118, true);

  view.setUint32(90, 0, true); // no further IFD

  const rational = (at: number, numerator: number, denominator: number) => {
    view.setUint32(at, numerator, true);
    view.setUint32(at + 4, denominator, true);
  };

  // 12° 58' 0" N, 77° 35' 0" E — Bengaluru.
  rational(94, 12, 1);
  rational(102, 58, 1);
  rational(110, 0, 1);
  rational(118, 77, 1);
  rational(126, 35, 1);
  rational(134, 0, 1);

  const jpeg = new Uint8Array(2 + 2 + 2 + 6 + tiff.length + 2);
  jpeg.set([0xff, 0xd8], 0);
  jpeg.set([0xff, 0xe1], 2);
  new DataView(jpeg.buffer).setUint16(4, 2 + 6 + tiff.length, false);
  jpeg.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 6); // "Exif\0\0"
  jpeg.set(tiff, 12);
  jpeg.set([0xff, 0xd9], 12 + tiff.length);
  return jpeg;
}

describe("EXIF reader", () => {
  it("reads a tag whose value sits at an offset", () => {
    const result = readExif(buildExifJpeg());
    expect(result.entries.find((entry) => entry.name === "Camera make")?.value).toBe("MSRX");
  });

  it("follows the GPS pointer and converts to decimal degrees", () => {
    const { location } = readExif(buildExifJpeg());
    expect(location).not.toBeNull();
    expect(location!.latitude).toBeCloseTo(12.966667, 5);
    expect(location!.longitude).toBeCloseTo(77.583333, 5);
  });

  it("honours the hemisphere reference", () => {
    const bytes = buildExifJpeg();
    // Flip "N" to "S" inside the GPS latitude-reference entry.
    bytes[12 + 50] = "S".charCodeAt(0);
    expect(readExif(bytes).location!.latitude).toBeCloseTo(-12.966667, 5);
  });

  it("returns nothing rather than throwing for a JPEG with no EXIF", () => {
    const plain = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x02, 0x00, 0xff, 0xd9]);
    const result = readExif(plain);
    expect(result.entries).toEqual([]);
    expect(result.location).toBeNull();
  });

  it("explains itself when handed a PNG", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => requireJpegOrTiff("shot.png", png)).toThrow(/JPEG and TIFF convention/);
  });
});
