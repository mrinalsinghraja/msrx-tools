import {
  ALL_FORMATS,
  BufferSource,
  BufferTarget,
  Conversion,
  Input,
  MkvOutputFormat,
  MovOutputFormat,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_VERY_HIGH,
  QUALITY_VERY_LOW,
  WebMOutputFormat,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  type AudioCodec,
  type ConversionOptions,
  type OutputFormat,
  type Quality,
  type VideoCodec,
} from "mediabunny";

import type { InputFile, OutputFile, ProgressReporter } from "../file-types";
import { ToolError } from "../types";

/**
 * The video engine's plumbing: opening a file, choosing a container, running a
 * conversion, handing back bytes.
 *
 * There is no FFmpeg build here and no thirty-megabyte download before the
 * first click. Every codec these tools use is one the browser already ships for
 * playing video, reached through WebCodecs; Mediabunny does the container work
 * — reading the boxes out of an MP4, writing new ones — in plain TypeScript.
 *
 * Three consequences worth knowing, because they shape every op in this
 * directory:
 *
 *  - Encoding is hardware-accelerated where the machine offers it, so a phone
 *    re-encodes a clip in roughly real time rather than ten times slower.
 *  - The site needs no cross-origin isolation. An FFmpeg build wants
 *    SharedArrayBuffer, which wants COOP and COEP headers, which break embeds
 *    and third-party fonts across every other page on the site.
 *  - What can be decoded is what the browser can play. That is a real limit —
 *    an exotic codec will be refused — and it is stated plainly to the visitor
 *    rather than discovered as a hang.
 */

/* ------------------------------------------------------------------ */
/* Capability                                                          */
/* ------------------------------------------------------------------ */

/**
 * WebCodecs is the whole engine. Checked before anything else runs so a browser
 * without it gets a sentence instead of a stack trace.
 */
export function requireWebCodecs(): void {
  if (typeof globalThis.VideoDecoder === "undefined" || typeof globalThis.VideoEncoder === "undefined") {
    throw new ToolError(
      "This browser has no video engine (WebCodecs), so it cannot read or write video here. Chrome, Edge and Opera have had it since 2021, Safari since 16.4 and Firefox since version 130 — updating the browser is usually all this needs.",
    );
  }
}

/* ------------------------------------------------------------------ */
/* Containers                                                          */
/* ------------------------------------------------------------------ */

export type VideoContainer = "mp4" | "webm" | "mkv" | "mov";

interface ContainerSpec {
  ext: string;
  mime: string;
  make: () => OutputFormat;
  /** Codecs to try, best first. The first one the machine can encode wins. */
  video: VideoCodec[];
  audio: AudioCodec[];
}

const CONTAINERS: Record<VideoContainer, ContainerSpec> = {
  mp4: {
    ext: "mp4",
    mime: "video/mp4",
    make: () => new Mp4OutputFormat({ fastStart: "in-memory" }),
    // H.264 first because it is the format everything on earth can play,
    // including the television and the ten-year-old phone.
    video: ["avc", "hevc", "av1", "vp9"],
    audio: ["aac", "opus", "mp3"],
  },
  webm: {
    ext: "webm",
    mime: "video/webm",
    make: () => new WebMOutputFormat(),
    video: ["vp9", "vp8", "av1"],
    audio: ["opus", "vorbis"],
  },
  mkv: {
    ext: "mkv",
    mime: "video/x-matroska",
    make: () => new MkvOutputFormat(),
    video: ["avc", "vp9", "av1", "vp8", "hevc"],
    audio: ["opus", "aac", "vorbis"],
  },
  mov: {
    ext: "mov",
    mime: "video/quicktime",
    make: () => new MovOutputFormat({ fastStart: "in-memory" }),
    video: ["avc", "hevc", "prores"],
    audio: ["aac", "opus"],
  },
};

export function containerOf(name: string): ContainerSpec {
  const spec = CONTAINERS[name as VideoContainer];
  if (!spec) throw new ToolError(`“${name}” is not a container this tool can write.`);
  return spec;
}

/**
 * The codecs to encode with, picked by asking the machine rather than assuming.
 *
 * Codec support is per-device, not per-browser: the same Chrome encodes H.264
 * on a laptop with the hardware for it and cannot on one without. Asking first
 * turns a mid-conversion failure into a working file in a second-choice codec.
 */
export async function pickCodecs(
  container: ContainerSpec,
  needsVideo: boolean,
  needsAudio: boolean,
  size?: { width: number; height: number },
): Promise<{ video: VideoCodec | null; audio: AudioCodec | null }> {
  const [video, audio] = await Promise.all([
    needsVideo ? getFirstEncodableVideoCodec(container.video, size) : Promise.resolve(null),
    needsAudio ? getFirstEncodableAudioCodec(container.audio) : Promise.resolve(null),
  ]);

  if (needsVideo && !video) {
    throw new ToolError(
      `This device cannot encode video into a ${container.ext.toUpperCase()} file — none of ${container.video.join(", ")} is available here. Try WebM instead, which uses a different family of codecs.`,
    );
  }
  return { video, audio };
}

/* ------------------------------------------------------------------ */
/* Quality                                                             */
/* ------------------------------------------------------------------ */

const QUALITIES: Record<string, Quality> = {
  "very-low": QUALITY_VERY_LOW,
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  "very-high": QUALITY_VERY_HIGH,
};

export function qualityOf(name: string): Quality {
  return QUALITIES[name] ?? QUALITY_MEDIUM;
}

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

export interface VideoFacts {
  width: number;
  height: number;
  duration: number;
  frameRate: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  codec: string | null;
}

/**
 * Opens a dropped file for reading.
 *
 * The bytes are copied because Mediabunny reads lazily from the buffer it is
 * given, and the same dropped file may be run through a second tool afterwards.
 */
export async function openVideo(file: InputFile): Promise<Input> {
  requireWebCodecs();

  const input = new Input({
    formats: ALL_FORMATS,
    source: new BufferSource(file.bytes.slice().buffer as ArrayBuffer),
  });

  if (!(await input.canRead())) {
    input.dispose();
    throw new ToolError(
      `“${file.name}” is not in a container this tool recognises. MP4, MOV, WebM, MKV and MPEG-TS are read; a file that will not open here is usually one the browser cannot play either.`,
    );
  }
  return input;
}

/** Everything the option panels and the result stats need to know about a file. */
export async function describeVideo(input: Input): Promise<VideoFacts> {
  const [videoTrack, audioTrack] = await Promise.all([
    input.getPrimaryVideoTrack(),
    input.getPrimaryAudioTrack(),
  ]);

  const duration = await input.computeDuration();

  if (!videoTrack) {
    return {
      width: 0,
      height: 0,
      duration,
      frameRate: null,
      hasVideo: false,
      hasAudio: Boolean(audioTrack),
      codec: null,
    };
  }

  const [width, height, codec] = await Promise.all([
    videoTrack.getDisplayWidth(),
    videoTrack.getDisplayHeight(),
    videoTrack.getCodec(),
  ]);

  return {
    width,
    height,
    duration,
    frameRate: null,
    hasVideo: true,
    hasAudio: Boolean(audioTrack),
    codec,
  };
}

/** Refuses an audio-only or image-only file before the visitor waits for one. */
export async function requireVideoTrack(input: Input, name: string): Promise<VideoFacts> {
  const facts = await describeVideo(input);
  if (!facts.hasVideo) {
    input.dispose();
    throw new ToolError(
      `“${name}” has no video track — it is a sound file in a video container. The audio tools will do more with it than this one can.`,
    );
  }
  return facts;
}

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

export function makeOutput(container: ContainerSpec): { output: Output; target: BufferTarget } {
  const target = new BufferTarget();
  return { output: new Output({ format: container.make(), target }), target };
}


/** The finalized bytes, or a clear failure rather than a null dereference. */
export function takeBytes(target: BufferTarget): Uint8Array {
  if (!target.buffer) {
    throw new ToolError("The video was processed but produced no file. Please report this with the file that caused it.");
  }
  return new Uint8Array(target.buffer);
}

/* ------------------------------------------------------------------ */
/* Running a conversion                                                */
/* ------------------------------------------------------------------ */

/**
 * The library reports discard reasons as slugs. A visitor is owed the sentence.
 */
const DISCARD_REASONS: Record<string, string> = {
  discarded_by_user: "The track was removed by an option you chose.",
  max_track_count_reached: "The output format had no room for another track.",
  max_track_count_of_type_reached: "The output format cannot hold a track of that kind.",
  unknown_source_codec: "The track is in a codec this browser could not identify.",
  undecodable_source_codec: "The track is in a codec this browser cannot decode.",
  no_encodable_target_codec: "This device has no encoder that the chosen format can hold.",
};

/**
 * Initialises and runs a conversion, turning its two failure modes into
 * sentences.
 *
 * `isValid` is false when nothing usable survives — every track was discarded
 * because the output container cannot hold it. Mediabunny records why for each
 * track, so the message can say which and not merely that.
 */
export async function convert(
  options: ConversionOptions,
  onProgress?: ProgressReporter,
  label?: string,
): Promise<void> {
  const conversion = await Conversion.init({ ...options, showWarnings: false });

  if (!conversion.isValid) {
    const reasons = [...new Set(conversion.discardedTracks.map((t) => DISCARD_REASONS[t.reason]))];
    throw new ToolError(
      `Nothing in this file could be written to the format you chose. ${reasons.join(" ")} Try a different output format — WebM and MP4 accept different families of codec, so a file one refuses the other often takes.`,
    );
  }

  if (onProgress) conversion.onProgress = (fraction) => onProgress(fraction, label);
  await conversion.execute();
  onProgress?.(1, label);
}

/* ------------------------------------------------------------------ */
/* Naming                                                              */
/* ------------------------------------------------------------------ */

export function outputFile(stemName: string, container: ContainerSpec, bytes: Uint8Array): OutputFile {
  return { name: `${stemName}.${container.ext}`, bytes, mime: container.mime };
}
