import { open, seal } from "../crypto-box";
import { formatBytes, stem, type FileOp, type OutputFile } from "../file-types";
import { bool, num, str, ToolError } from "../types";
import { createCanvas, decodeImage, encodeCanvas, release } from "./decode";

/**
 * Least-significant-bit steganography.
 *
 * The payload is written into the low bits of the red, green and blue channels.
 * Changing a channel by one step out of 256 is below what a screen can show and
 * well below what an eye can see, so the picture is unchanged to look at while
 * carrying a message.
 *
 * Two things this deliberately does not pretend:
 *
 *   - It hides that a message exists, not what it says. Anyone who suspects a
 *     file and reads its low bits gets the payload. That is why a password is
 *     offered: with one, the bits are AES-GCM ciphertext and finding them tells
 *     an attacker nothing.
 *   - The output must be PNG. JPEG and WebP are lossy: they rewrite pixel
 *     values, which destroys the low bits along with the message.
 */

const MAGIC = [0x4d, 0x53, 0x54, 0x47]; // MSTG
const HEADER_BITS_LENGTH = 9; // 4 magic + 1 flag + 4 length, in bytes

function bitsOf(bytes: Uint8Array): number[] {
  const bits: number[] = [];
  for (const byte of bytes) for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  return bits;
}

function bytesOf(bits: number[]): Uint8Array {
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let value = 0;
    for (let b = 0; b < 8; b++) value = (value << 1) | bits[i * 8 + b];
    bytes[i] = value;
  }
  return bytes;
}

function buildPayload(body: Uint8Array, encrypted: boolean): Uint8Array {
  const out = new Uint8Array(HEADER_BITS_LENGTH + body.length);
  out.set(MAGIC, 0);
  out[4] = encrypted ? 1 : 0;
  new DataView(out.buffer).setUint32(5, body.length, false);
  out.set(body, HEADER_BITS_LENGTH);
  return out;
}

export const stegoHide: FileOp = async (files, options, onProgress) => {
  const message = str(options, "message");
  const password = str(options, "password");
  const bitsPerChannel = Math.max(1, Math.min(2, num(options, "bits", 1)));

  if (!message.trim()) throw new ToolError("Type the message you want hidden.");

  const body = password
    ? await seal(new TextEncoder().encode(message), password)
    : new TextEncoder().encode(message);
  const payload = buildPayload(body, Boolean(password));
  const bits = bitsOf(payload);

  const outputs: OutputFile[] = [];

  for (const [index, file] of files.entries()) {
    const image = await decodeImage(file);
    try {
      const { canvas, context } = createCanvas(image.width, image.height);
      context.drawImage(image.bitmap, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const capacityBits = (data.length / 4) * 3 * bitsPerChannel;
      if (bits.length > capacityBits) {
        throw new ToolError(
          `That message needs ${Math.ceil(bits.length / 8)} bytes but “${file.name}” holds ${Math.floor(capacityBits / 8)}. Use a larger picture, shorten the message, or raise the bits per channel.`,
        );
      }

      const mask = bitsPerChannel === 2 ? 0b11111100 : 0b11111110;
      let bitIndex = 0;

      for (let i = 0; i < data.length && bitIndex < bits.length; i += 4) {
        for (let channel = 0; channel < 3 && bitIndex < bits.length; channel++) {
          let value = 0;
          for (let b = 0; b < bitsPerChannel; b++) {
            value = (value << 1) | (bits[bitIndex++] ?? 0);
          }
          data[i + channel] = (data[i + channel] & mask) | value;
        }
        // Alpha is forced opaque: a canvas premultiplies transparent pixels on
        // the way out, which would round the very bits carrying the message.
        data[i + 3] = 255;
      }

      context.putImageData(imageData, 0, 0);
      outputs.push({
        name: `${stem(file.name)}-hidden.png`,
        bytes: await encodeCanvas(canvas, "image/png"),
        mime: "image/png",
      });
    } finally {
      release(image);
    }
    onProgress?.((index + 1) / files.length, file.name);
  }

  return {
    files: outputs,
    stats: [
      { label: "Message", value: formatBytes(payload.length) },
      { label: "Bits per channel", value: String(bitsPerChannel) },
      { label: "Encrypted", value: password ? "Yes, AES-256-GCM" : "No" },
    ],
    note: password
      ? "The message is encrypted before it is hidden, so finding the bits is not the same as reading them. Save the result as PNG and send it as PNG — re-saving it as JPEG, or letting a chat app recompress it, destroys the message."
      : "This hides the message but does not encrypt it: anyone who reads the low bits can read the text. Add a password to encrypt it first. Keep the file as PNG — any lossy re-save destroys the message.",
  };
};

export const stegoReveal: FileOp = async (files, options, onProgress) => {
  const password = str(options, "password");
  const bitsPerChannel = Math.max(1, Math.min(2, num(options, "bits", 1)));
  const asFile = bool(options, "asFile", true);

  const outputs: OutputFile[] = [];
  const found: string[] = [];

  for (const [index, file] of files.entries()) {
    const image = await decodeImage(file);
    try {
      const { canvas, context } = createCanvas(image.width, image.height);
      context.drawImage(image.bitmap, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;

      // Reads `bitCount` bits starting `from` bits in. The header has to be
      // read before the body length is known, so this is called twice rather
      // than pulling the whole image apart for a message of a few hundred bytes.
      const read = (bitCount: number, from: number): number[] => {
        const bits: number[] = [];
        for (let i = 0; i < data.length && bits.length < bitCount + from; i += 4) {
          for (let channel = 0; channel < 3 && bits.length < bitCount + from; channel++) {
            const value = data[i + channel] & (bitsPerChannel === 2 ? 0b11 : 0b1);
            for (let b = bitsPerChannel - 1; b >= 0; b--) bits.push((value >> b) & 1);
          }
        }
        return bits.slice(from);
      };

      const headerBits = read(HEADER_BITS_LENGTH * 8, 0);
      const header = bytesOf(headerBits);

      if (!MAGIC.every((byte, i) => header[i] === byte)) {
        throw new ToolError(
          `No hidden message was found in “${file.name}”. Either it carries none, it was recompressed since — a JPEG re-save destroys the message — or it was hidden at a different bits-per-channel setting than the one selected.`,
        );
      }

      const encrypted = header[4] === 1;
      const length = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(5, false);
      if (length === 0 || length > data.length) {
        throw new ToolError(`The message header in “${file.name}” is damaged, so its length cannot be trusted.`);
      }

      const bodyBits = read(length * 8, HEADER_BITS_LENGTH * 8);
      const body = bytesOf(bodyBits);

      if (encrypted && !password) {
        throw new ToolError(
          `“${file.name}” carries an encrypted message. Enter the password it was hidden with.`,
        );
      }

      const plaintext = encrypted ? (await open(body, password)).plaintext : body;
      const text = new TextDecoder().decode(plaintext);
      found.push(text);

      if (asFile) {
        outputs.push({
          name: `${stem(file.name)}-message.txt`,
          bytes: plaintext,
          mime: "text/plain",
        });
      }
    } finally {
      release(image);
    }
    onProgress?.((index + 1) / files.length, file.name);
  }

  if (!asFile) {
    outputs.push({
      name: "hidden-messages.txt",
      bytes: new TextEncoder().encode(found.join("\n\n---\n\n")),
      mime: "text/plain",
    });
  }

  return {
    files: outputs,
    stats: [
      { label: "Images", value: String(files.length) },
      { label: "Messages", value: String(found.length) },
      { label: "Characters", value: found.reduce((sum, text) => sum + text.length, 0).toLocaleString() },
    ],
    note: "Download the text file to read the message — it was never sent anywhere, and closing this tab is the end of it.",
  };
};
