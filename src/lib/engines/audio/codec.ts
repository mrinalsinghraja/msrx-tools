import { ToolError } from "../types";

import { frameCount, resampleTo, type AudioSignal } from "./dsp";

/**
 * Getting audio in and out of the browser.
 *
 * In: `decodeAudioData`, which is the browser's own decoder — the same one that
 * plays the file — so whatever a visitor can listen to, these tools can read.
 * Out: WAV written here, or MP3 through LAME.
 */

export type AudioFormat = "mp3" | "wav";

export const AUDIO_MIME: Record<AudioFormat, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

/* ------------------------------------------------------------------ */
/* Decode                                                              */
/* ------------------------------------------------------------------ */

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext {
  if (sharedContext) return sharedContext;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new ToolError("This browser has no audio engine, so it cannot read sound files.");
  sharedContext = new Ctor();
  return sharedContext;
}

export async function decodeAudio(name: string, bytes: Uint8Array): Promise<AudioSignal> {
  const context = getContext();

  let buffer: AudioBuffer;
  try {
    // decodeAudioData detaches the buffer it is handed, so a copy goes in —
    // otherwise running a second tool on the same dropped file finds it empty.
    buffer = await context.decodeAudioData(bytes.slice().buffer as ArrayBuffer);
  } catch {
    throw new ToolError(
      `“${name}” could not be decoded. This browser reads the formats it can play — MP3, WAV, M4A, OGG and FLAC on most machines — and a file that will not open here usually will not play either.`,
    );
  }

  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    // getChannelData hands back a view into the AudioBuffer; the slice makes it
    // ours, so the buffer can be released and the samples stay valid.
    channels.push(buffer.getChannelData(c).slice());
  }

  const signal = { channels, sampleRate: buffer.sampleRate };

  // decodeAudioData resamples to the audio context's rate, and that rate comes
  // from the sound hardware rather than from the file. On a machine with a
  // 96 kHz interface every result would come back at 96 kHz — twice the size,
  // for detail the source never had. Anything above 48 kHz is the soundcard
  // talking, not the recording, so it comes back down.
  return signal.sampleRate > 48000 ? resampleTo(signal, 48000) : signal;
}

/* ------------------------------------------------------------------ */
/* Encode                                                              */
/* ------------------------------------------------------------------ */

/** Float -1..1 to signed 16-bit, clamped rather than wrapped. */
function toInt16(value: number): number {
  const clamped = value > 1 ? 1 : value < -1 ? -1 : value;
  return Math.round(clamped * (clamped < 0 ? 0x8000 : 0x7fff));
}

/**
 * Writes a 16-bit PCM WAV.
 *
 * Uncompressed and about ten times the size of the MP3, which is the point of
 * offering it: nothing is thrown away, so a file that will be edited again does
 * not lose a little more each time it is saved.
 */
export function encodeWav(signal: AudioSignal): Uint8Array {
  const channelCount = signal.channels.length;
  const frames = frameCount(signal);
  const blockAlign = channelCount * 2;
  const dataLength = frames * blockAlign;

  const bytes = new Uint8Array(44 + dataLength);
  const view = new DataView(bytes.buffer);

  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM header length
  view.setUint16(20, 1, true); // format: uncompressed PCM
  view.setUint16(22, channelCount, true);
  view.setUint32(24, signal.sampleRate, true);
  view.setUint32(28, signal.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channelCount; c++) {
      view.setInt16(offset, toInt16(signal.channels[c][i]), true);
      offset += 2;
    }
  }

  return bytes;
}

/** LAME takes 1152 samples per channel per call. */
const MP3_BLOCK = 1152;

/**
 * Encodes MP3 with LAME, compiled to JavaScript.
 *
 * Loaded on demand: it is a hundred kilobytes that only the audio tools need.
 * LAME is LGPL-3.0 and is used unmodified — see docs/licences.md.
 */
export async function encodeMp3(signal: AudioSignal, bitrate: number): Promise<Uint8Array> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");

  const channelCount = Math.min(2, signal.channels.length);
  const frames = frameCount(signal);
  const encoder = new Mp3Encoder(channelCount, signal.sampleRate, bitrate);

  const left = new Int16Array(MP3_BLOCK);
  const right = channelCount > 1 ? new Int16Array(MP3_BLOCK) : null;
  const parts: Uint8Array[] = [];
  let total = 0;

  for (let start = 0; start < frames; start += MP3_BLOCK) {
    const size = Math.min(MP3_BLOCK, frames - start);
    for (let i = 0; i < size; i++) {
      left[i] = toInt16(signal.channels[0][start + i]);
      if (right) right[i] = toInt16(signal.channels[1][start + i]);
    }

    const block = right
      ? encoder.encodeBuffer(left.subarray(0, size), right.subarray(0, size))
      : encoder.encodeBuffer(left.subarray(0, size));

    if (block.length > 0) {
      parts.push(block);
      total += block.length;
    }
  }

  const tail = encoder.flush();
  if (tail.length > 0) {
    parts.push(tail);
    total += tail.length;
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

export async function encodeAudio(
  signal: AudioSignal,
  format: AudioFormat,
  bitrate = 192,
): Promise<Uint8Array> {
  return format === "wav" ? encodeWav(signal) : await encodeMp3(signal, bitrate);
}
