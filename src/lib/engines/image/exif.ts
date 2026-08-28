import { ToolError } from "../types";

/**
 * A small EXIF reader for JPEG and TIFF.
 *
 * Written here rather than pulled in as a dependency because the useful part is
 * about forty tags: what the camera was, how it was set, and — the reason most
 * people arrive — whether the photo is carrying the coordinates it was taken
 * at. Tags outside that list are counted but not named, which is honest and
 * costs nothing.
 */

export interface ExifEntry {
  tag: number;
  name: string;
  value: string;
  group: "Image" | "Camera" | "Location" | "Other";
}

export interface ExifResult {
  entries: ExifEntry[];
  /** Decimal degrees, when the file carries a position. */
  location: { latitude: number; longitude: number } | null;
  unknownCount: number;
  byteLength: number;
}

const TAGS: Record<number, { name: string; group: ExifEntry["group"] }> = {
  0x010f: { name: "Camera make", group: "Camera" },
  0x0110: { name: "Camera model", group: "Camera" },
  0x0112: { name: "Orientation", group: "Image" },
  0x011a: { name: "X resolution", group: "Image" },
  0x011b: { name: "Y resolution", group: "Image" },
  0x0131: { name: "Software", group: "Camera" },
  0x0132: { name: "File changed", group: "Image" },
  0x013b: { name: "Artist", group: "Other" },
  0x8298: { name: "Copyright", group: "Other" },
  0x829a: { name: "Exposure time", group: "Camera" },
  0x829d: { name: "F number", group: "Camera" },
  0x8827: { name: "ISO", group: "Camera" },
  0x9003: { name: "Taken at", group: "Image" },
  0x9004: { name: "Digitised at", group: "Image" },
  0x9201: { name: "Shutter speed", group: "Camera" },
  0x9202: { name: "Aperture", group: "Camera" },
  0x9204: { name: "Exposure compensation", group: "Camera" },
  0x9207: { name: "Metering mode", group: "Camera" },
  0x9209: { name: "Flash", group: "Camera" },
  0x920a: { name: "Focal length", group: "Camera" },
  0xa002: { name: "Width", group: "Image" },
  0xa003: { name: "Height", group: "Image" },
  0xa405: { name: "Focal length (35mm)", group: "Camera" },
  0xa430: { name: "Camera owner", group: "Other" },
  0xa431: { name: "Body serial number", group: "Other" },
  0xa432: { name: "Lens specification", group: "Camera" },
  0xa433: { name: "Lens make", group: "Camera" },
  0xa434: { name: "Lens model", group: "Camera" },
  0xa435: { name: "Lens serial number", group: "Other" },
};

const GPS_TAGS: Record<number, string> = {
  0x0001: "Latitude reference",
  0x0002: "Latitude",
  0x0003: "Longitude reference",
  0x0004: "Longitude",
  0x0005: "Altitude reference",
  0x0006: "Altitude",
  0x0007: "GPS time",
  0x000b: "GPS accuracy",
  0x001d: "GPS date",
};

const ORIENTATIONS: Record<number, string> = {
  1: "Normal",
  2: "Mirrored horizontally",
  3: "Rotated 180°",
  4: "Mirrored vertically",
  5: "Mirrored and rotated 270°",
  6: "Rotated 90° clockwise",
  7: "Mirrored and rotated 90°",
  8: "Rotated 270° clockwise",
};

const TYPE_SIZES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

/** Finds the APP1 payload in a JPEG, or the TIFF header if the file is a TIFF. */
function findExif(bytes: Uint8Array): { view: DataView; start: number } | null {
  if (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a) {
    return { view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), start: 0 };
  }
  if (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[3] === 0x2a) {
    return { view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), start: 0 };
  }
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    // SOS: the compressed scan begins, and no metadata segment follows it.
    if (marker === 0xda) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (marker === 0xe1) {
      const header = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (header === "Exif") {
        const start = offset + 10;
        return {
          view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
          start,
        };
      }
    }
    offset += 2 + length;
  }
  return null;
}

function readString(view: DataView, offset: number, count: number): string {
  let text = "";
  for (let i = 0; i < count; i++) {
    const code = view.getUint8(offset + i);
    if (code === 0) break;
    text += String.fromCharCode(code);
  }
  return text.trim();
}

interface RawValue {
  numbers: number[];
  text: string;
  type: number;
}

function readEntry(view: DataView, entry: number, tiff: number, little: boolean): RawValue | null {
  const type = view.getUint16(entry + 2, little);
  const count = view.getUint32(entry + 4, little);
  const size = TYPE_SIZES[type];
  if (!size) return null;

  const total = size * count;
  // Values of four bytes or fewer live in the entry itself; anything larger is
  // an offset from the start of the TIFF header.
  const valueAt = total <= 4 ? entry + 8 : tiff + view.getUint32(entry + 8, little);
  if (valueAt < 0 || valueAt + total > view.byteLength) return null;

  if (type === 2) return { numbers: [], text: readString(view, valueAt, count), type };

  const numbers: number[] = [];
  for (let i = 0; i < Math.min(count, 64); i++) {
    const at = valueAt + i * size;
    if (type === 1 || type === 7) numbers.push(view.getUint8(at));
    else if (type === 3) numbers.push(view.getUint16(at, little));
    else if (type === 4) numbers.push(view.getUint32(at, little));
    else if (type === 9) numbers.push(view.getInt32(at, little));
    else if (type === 5) {
      const denominator = view.getUint32(at + 4, little);
      numbers.push(denominator === 0 ? 0 : view.getUint32(at, little) / denominator);
    } else if (type === 10) {
      const denominator = view.getInt32(at + 4, little);
      numbers.push(denominator === 0 ? 0 : view.getInt32(at, little) / denominator);
    }
  }
  return { numbers, text: "", type };
}

function describe(tag: number, raw: RawValue): string {
  if (raw.text) return raw.text;
  const [first] = raw.numbers;

  if (tag === 0x0112) return ORIENTATIONS[first] ?? String(first);
  if (tag === 0x829a) return first >= 1 ? `${first}s` : `1/${Math.round(1 / first)}s`;
  if (tag === 0x829d) return `f/${first}`;
  if (tag === 0x920a || tag === 0xa405) return `${Math.round(first)}mm`;
  if (tag === 0x8827) return `ISO ${first}`;
  if (tag === 0x9209) return first === 0 ? "Did not fire" : `Fired (0x${first.toString(16)})`;
  if (tag === 0x9207) {
    const modes = ["Unknown", "Average", "Centre-weighted", "Spot", "Multi-spot", "Pattern", "Partial"];
    return modes[first] ?? String(first);
  }

  return raw.numbers.map((n) => (Number.isInteger(n) ? n : Number(n.toFixed(4)))).join(", ");
}

export function readExif(bytes: Uint8Array): ExifResult {
  const found = findExif(bytes);
  if (!found) {
    return { entries: [], location: null, unknownCount: 0, byteLength: 0 };
  }

  const { view, start } = found;
  const little = view.getUint16(start, false) === 0x4949;
  const firstIfd = view.getUint32(start + 4, little);

  const entries: ExifEntry[] = [];
  let unknownCount = 0;
  const gps: Record<number, RawValue> = {};

  const walk = (ifdOffset: number, isGps: boolean, depth: number) => {
    if (depth > 3) return;
    const at = start + ifdOffset;
    if (at + 2 > view.byteLength) return;
    const count = view.getUint16(at, little);
    if (count > 512) return;

    for (let i = 0; i < count; i++) {
      const entry = at + 2 + i * 12;
      if (entry + 12 > view.byteLength) return;
      const tag = view.getUint16(entry, little);

      // Pointers to the Exif and GPS sub-directories, which is where most of
      // the interesting tags actually live.
      if (!isGps && (tag === 0x8769 || tag === 0x8825)) {
        const raw = readEntry(view, entry, start, little);
        if (raw?.numbers[0]) walk(raw.numbers[0], tag === 0x8825, depth + 1);
        continue;
      }

      const raw = readEntry(view, entry, start, little);
      if (!raw) continue;

      if (isGps) {
        gps[tag] = raw;
        const name = GPS_TAGS[tag];
        if (name) {
          entries.push({
            tag,
            name,
            value: raw.text || raw.numbers.map((n) => Number(n.toFixed(6))).join(", "),
            group: "Location",
          });
        }
        continue;
      }

      const known = TAGS[tag];
      if (!known) {
        unknownCount++;
        continue;
      }
      const value = describe(tag, raw);
      if (value) entries.push({ tag, name: known.name, value, group: known.group });
    }
  };

  walk(firstIfd, false, 0);

  let location: ExifResult["location"] = null;
  const lat = gps[0x0002]?.numbers;
  const lon = gps[0x0004]?.numbers;
  if (lat?.length === 3 && lon?.length === 3) {
    const toDecimal = (parts: number[]) => parts[0] + parts[1] / 60 + parts[2] / 3600;
    const latSign = gps[0x0001]?.text?.toUpperCase() === "S" ? -1 : 1;
    const lonSign = gps[0x0003]?.text?.toUpperCase() === "W" ? -1 : 1;
    location = {
      latitude: Number((toDecimal(lat) * latSign).toFixed(6)),
      longitude: Number((toDecimal(lon) * lonSign).toFixed(6)),
    };
  }

  return { entries, location, unknownCount, byteLength: bytes.length };
}

export function requireJpegOrTiff(name: string, bytes: Uint8Array) {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isTiff =
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[3] === 0x2a);
  if (!isJpeg && !isTiff) {
    throw new ToolError(
      `“${name}” isn't a JPEG or TIFF. EXIF is a JPEG and TIFF convention — PNG, WebP and AVIF store metadata differently, and a screenshot has none of it to begin with.`,
    );
  }
}
