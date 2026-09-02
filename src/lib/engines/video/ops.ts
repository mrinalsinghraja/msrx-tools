import { AudioSample, type ConversionAudioOptions, type ConversionVideoOptions } from "mediabunny";

import { formatBytes, stem, type FileOp, type FileOpResult, type InputFile, type OutputFile } from "../file-types";
import { parseTimecode } from "../timecode";
import { bool, num, str, ToolError, type OpStat } from "../types";

import {
  containerOf,
  convert,
  makeOutput,
  openVideo,
  outputFile,
  pickCodecs,
  qualityOf,
  requireVideoTrack,
  takeBytes,
  type VideoFacts,
} from "./core";

/**
 * The video tools that are a single pass over one file: trim, crop, resize,
 * rotate, flip, compress, convert, mute, level and extract.
 *
 * Every one of them is the same shape — open the file, describe the change,
 * write a new file — which is why they share `runSingle` below rather than each
 * repeating the open/convert/finalise dance.
 */

/* ------------------------------------------------------------------ */
/* Shared plumbing                                                     */
/* ------------------------------------------------------------------ */

interface Plan {
  video?: ConversionVideoOptions;
  audio?: ConversionAudioOptions;
  trim?: { start?: number; end?: number };
  /** Extra figures for the result panel. */
  stats?: OpStat[];
  note?: string;
}

/**
 * Runs one file through one conversion.
 *
 * `plan` is a function rather than an object because almost every option here
 * is relative to the file: "half the width", "the last ten seconds", "the same
 * quality but smaller". The plan is therefore built after the file is read.
 */
function singleFileOp(
  build: (facts: VideoFacts, options: Parameters<FileOp>[1], file: InputFile) => Plan | Promise<Plan>,
  containerFrom: (options: Parameters<FileOp>[1]) => string = (o) => str(o, "format", "mp4"),
): FileOp {
  return async (files, options, onProgress) => {
    const container = containerOf(containerFrom(options));
    const outputs: OutputFile[] = [];
    const stats: OpStat[] = [];
    let note: string | undefined;
    let sourceBytes = 0;

    for (const [index, file] of files.entries()) {
      const input = await openVideo(file);
      try {
        const facts = await requireVideoTrack(input, file.name);
        const plan = await build(facts, options, file);

        const { video, audio } = await pickCodecs(
          container,
          plan.video?.discard !== true,
          plan.audio?.discard !== true && facts.hasAudio,
          { width: plan.video?.width ?? facts.width, height: plan.video?.height ?? facts.height },
        );

        const { output, target } = makeOutput(container);
        await convert(
          {
            input,
            output,
            trim: plan.trim,
            video: { ...plan.video, ...(video ? { codec: video } : {}) },
            audio: { ...plan.audio, ...(audio ? { codec: audio } : {}) },
          },
          onProgress
            ? (fraction) => onProgress((index + fraction) / files.length, `${file.name}`)
            : undefined,
        );

        const bytes = takeBytes(target);
        sourceBytes += file.bytes.length;
        outputs.push(outputFile(stem(file.name), container, bytes));
        if (plan.stats && files.length === 1) stats.push(...plan.stats);
        if (plan.note) note = plan.note;
      } finally {
        input.dispose();
      }
    }

    const producedBytes = outputs.reduce((total, f) => total + f.bytes.length, 0);
    return {
      files: outputs,
      stats: [
        ...stats,
        { label: "Was", value: formatBytes(sourceBytes) },
        { label: "Now", value: formatBytes(producedBytes) },
      ],
      note,
    };
  };
}

/** `1920 × 1080` for the result panel. */
function sizeStat(width: number, height: number): OpStat {
  return { label: "Size", value: `${Math.round(width)} × ${Math.round(height)}` };
}

/** Even dimensions, because most encoders will not take odd ones. */
function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

/* ------------------------------------------------------------------ */
/* Trim                                                                */
/* ------------------------------------------------------------------ */

export const trimVideo = singleFileOp((facts, options) => {
  const start = parseTimecode(str(options, "start"), 0);
  const end = parseTimecode(str(options, "end"), facts.duration);

  if (start >= facts.duration) {
    throw new ToolError(
      `The start time is past the end of the video, which runs for ${facts.duration.toFixed(1)} seconds.`,
    );
  }
  if (end <= start) {
    throw new ToolError("The end time has to come after the start time.");
  }

  const kept = Math.min(end, facts.duration) - start;
  return {
    trim: { start, end: Math.min(end, facts.duration) },
    stats: [
      { label: "Kept", value: `${kept.toFixed(1)}s of ${facts.duration.toFixed(1)}s` },
      sizeStat(facts.width, facts.height),
    ],
    // Worth saying, because a trimmed file that is a third of the length is
    // often not a third of the size — the cut can land between key frames.
    note: "Trimming re-encodes only where it has to. The cut is placed exactly, which means the frames around each edge are rebuilt.",
  };
});

/* ------------------------------------------------------------------ */
/* Crop                                                                */
/* ------------------------------------------------------------------ */

export const cropVideo = singleFileOp((facts, options) => {
  const percent = (id: string, fallback: number) => {
    const value = num(options, id, fallback);
    if (value < 0 || value > 100) throw new ToolError(`“${id}” must be between 0 and 100 per cent.`);
    return value / 100;
  };

  const left = Math.round(facts.width * percent("x", 0));
  const top = Math.round(facts.height * percent("y", 0));
  const width = even(facts.width * percent("width", 100));
  const height = even(facts.height * percent("height", 100));

  if (width < 16 || height < 16) {
    throw new ToolError("That selection is smaller than sixteen pixels across. Nothing useful survives a crop that small.");
  }

  return {
    video: {
      crop: {
        left: Math.min(left, facts.width - 16),
        top: Math.min(top, facts.height - 16),
        width,
        height,
      },
    },
    stats: [sizeStat(width, height), { label: "From", value: `${facts.width} × ${facts.height}` }],
  };
});

/* ------------------------------------------------------------------ */
/* Resize                                                              */
/* ------------------------------------------------------------------ */

const HEIGHT_PRESETS: Record<string, number> = {
  "2160": 2160,
  "1440": 1440,
  "1080": 1080,
  "720": 720,
  "480": 480,
  "360": 360,
  "240": 240,
};

export const resizeVideo = singleFileOp((facts, options) => {
  const mode = str(options, "mode", "preset");

  if (mode === "preset") {
    const target = HEIGHT_PRESETS[str(options, "preset", "720")] ?? 720;
    if (target >= facts.height && !bool(options, "upscale", false)) {
      throw new ToolError(
        `This video is already ${facts.height} lines tall, which is no larger than the ${target}p you asked for. Enlarging it would invent detail that was never recorded — turn on "allow enlarging" if you want it anyway.`,
      );
    }
    const height = even(target);
    const width = even((facts.width / facts.height) * height);
    return { video: { width, height, fit: "fill" }, stats: [sizeStat(width, height)] };
  }

  const width = num(options, "width", 0);
  const height = num(options, "height", 0);
  if (width <= 0 && height <= 0) {
    throw new ToolError("Give a width, a height, or both. Leaving one empty keeps the shape of the original.");
  }

  const fit = str(options, "fit", "contain") as "fill" | "contain" | "cover";
  const plan: ConversionVideoOptions = { fit };
  if (width > 0) plan.width = even(width);
  if (height > 0) plan.height = even(height);

  return {
    video: plan,
    stats: [
      {
        label: "Size",
        value:
          width > 0 && height > 0
            ? `${even(width)} × ${even(height)}`
            : width > 0
              ? `${even(width)} wide`
              : `${even(height)} tall`,
      },
    ],
    note:
      width > 0 && height > 0
        ? undefined
        : "One dimension was left blank, so the other was worked out from the original shape. Nothing is stretched.",
  };
});

/* ------------------------------------------------------------------ */
/* Rotate and flip                                                     */
/* ------------------------------------------------------------------ */

export const rotateVideo = singleFileOp((facts, options) => {
  const angle = num(options, "angle", 90);
  if (![0, 90, 180, 270].includes(angle)) {
    throw new ToolError("A video can be turned by 90, 180 or 270 degrees. Anything else would need the frame to be padded out with blank corners.");
  }

  // A rotation can be written as one number in the file header, which costs
  // nothing and loses nothing — but some players and nearly every social
  // upload ignore it and show the video on its side anyway. Baking the turn
  // into the pixels always works and always costs a re-encode, so it is the
  // default and the cheap route is offered beside it.
  const bake = bool(options, "bake", true);
  const turned = angle === 90 || angle === 270;

  return {
    video: { rotate: angle as 0 | 90 | 180 | 270, allowRotationMetadata: !bake },
    stats: [
      { label: "Turned", value: `${angle}° clockwise` },
      sizeStat(turned ? facts.height : facts.width, turned ? facts.width : facts.height),
    ],
    note: bake
      ? undefined
      : "Written as a rotation flag rather than into the frames. This is instant and lossless, but players that ignore the flag — and several upload forms do — will still show the original orientation.",
  };
});

export const flipVideo = singleFileOp((facts, options) => {
  const axis = str(options, "axis", "horizontal");
  const flipX = axis === "horizontal" || axis === "both";
  const flipY = axis === "vertical" || axis === "both";

  const canvas = new OffscreenCanvas(even(facts.width), even(facts.height));
  const context = canvas.getContext("2d");
  if (!context) throw new ToolError("This browser would not give the tool a drawing surface, so frames cannot be mirrored.");

  return {
    video: {
      processedWidth: canvas.width,
      processedHeight: canvas.height,
      process: (sample) => {
        context.save();
        context.setTransform(flipX ? -1 : 1, 0, 0, flipY ? -1 : 1, flipX ? canvas.width : 0, flipY ? canvas.height : 0);
        sample.draw(context, 0, 0, canvas.width, canvas.height);
        context.restore();
        // The canvas is reused every frame, so it must be copied out before
        // the next one overwrites it. VideoSample does that copy for us.
        return canvas;
      },
    },
    stats: [{ label: "Mirrored", value: axis === "both" ? "both ways" : axis }, sizeStat(canvas.width, canvas.height)],
  };
});

/* ------------------------------------------------------------------ */
/* Compress and convert                                                */
/* ------------------------------------------------------------------ */

export const compressVideo = singleFileOp((facts, options) => {
  const quality = str(options, "quality", "medium");
  const maxHeight = num(options, "maxHeight", 0);
  const frameRate = num(options, "frameRate", 0);

  const plan: ConversionVideoOptions = { quality: qualityOf(quality), forceTranscode: true };

  // Resolution is the biggest lever there is: half the height is a quarter of
  // the pixels, and quality settings cannot compete with that.
  if (maxHeight > 0 && facts.height > maxHeight) {
    plan.height = even(maxHeight);
    plan.width = even((facts.width / facts.height) * maxHeight);
    plan.fit = "fill";
  }
  if (frameRate > 0) plan.frameRate = frameRate;

  return {
    video: plan,
    audio: { quality: qualityOf(quality === "very-high" ? "high" : quality) },
    stats: [sizeStat(plan.width ?? facts.width, plan.height ?? facts.height)],
    note: "A video that was already compressed hard will not shrink much further without visible damage — the size it arrived at was someone else's answer to the same question.",
  };
});

export const convertVideo = singleFileOp((facts, options) => ({
  video: { quality: qualityOf(str(options, "quality", "high")) },
  audio: { quality: qualityOf(str(options, "quality", "high")) },
  stats: [sizeStat(facts.width, facts.height), { label: "Length", value: `${facts.duration.toFixed(1)}s` }],
}));

/* ------------------------------------------------------------------ */
/* Sound                                                               */
/* ------------------------------------------------------------------ */

export const muteVideo = singleFileOp((facts) => {
  if (!facts.hasAudio) {
    throw new ToolError("This video has no sound track, so there is nothing to remove. It is already silent.");
  }
  return {
    audio: { discard: true },
    stats: [{ label: "Removed", value: "the sound track" }, sizeStat(facts.width, facts.height)],
    note: "The picture is copied across untouched wherever the format allows it, so muting costs no quality.",
  };
});

export const changeVideoVolume = singleFileOp((facts, options) => {
  if (!facts.hasAudio) {
    throw new ToolError("This video has no sound track, so there is no volume to change.");
  }

  const decibels = num(options, "decibels", 0);
  if (decibels === 0) {
    throw new ToolError("Nought decibels is no change at all. Move the slider, or use Mute Video if silence is what you want.");
  }

  const gain = 10 ** (decibels / 20);
  let clipped = false;

  return {
    audio: {
      forceTranscode: true,
      process: (sample) => {
        const frames = sample.numberOfFrames * sample.numberOfChannels;
        const data = new Float32Array(frames);
        sample.copyTo(data, { planeIndex: 0, format: "f32" });

        for (let i = 0; i < data.length; i++) {
          const value = data[i] * gain;
          // Digital audio has a hard ceiling. Past it the number wraps and a
          // peak becomes a burst of noise, so peaks are flattened instead.
          if (value > 1 || value < -1) clipped = true;
          data[i] = value > 1 ? 1 : value < -1 ? -1 : value;
        }

        const next = new AudioSample({
          data,
          format: "f32",
          numberOfChannels: sample.numberOfChannels,
          sampleRate: sample.sampleRate,
          timestamp: sample.timestamp,
        });
        sample.close();
        return next;
      },
    },
    stats: [
      { label: "Volume", value: `${decibels > 0 ? "+" : ""}${decibels} dB` },
      { label: "Roughly", value: `${gain.toFixed(2)}× as loud` },
    ],
    get note() {
      return clipped
        ? "The loudest moments hit the ceiling and were flattened rather than allowed to wrap round into noise. Back the gain off a few decibels if the result sounds harsh."
        : undefined;
    },
  };
});

/* ------------------------------------------------------------------ */
/* Extract the sound                                                   */
/* ------------------------------------------------------------------ */

/** The quality words the option panel offers, in the units LAME wants. */
const MP3_BITRATES: Record<string, number> = {
  "very-high": 320,
  high: 192,
  medium: 128,
  low: 64,
};

/**
 * Takes the sound out of a video.
 *
 * This one does not go through a conversion, and the reason is a genuine hole
 * in the platform: WebCodecs can decode MP3 everywhere and encode it nowhere.
 * Chrome's `AudioEncoder` offers Opus and AAC, not MP3, so asking the browser
 * to write one fails with "no encoder that the chosen format can hold" — which
 * is exactly what this tool did until it was pointed at LAME instead.
 *
 * So the samples are decoded here and handed to the same encoder the audio
 * tools use. It is imported on demand, so only this tool pays for it.
 */
export const videoToAudio: FileOp = async (files, options, onProgress) => {
  const format = str(options, "format", "mp3") === "wav" ? "wav" : "mp3";
  const bitrate = MP3_BITRATES[str(options, "quality", "high")] ?? 192;
  const outputs: OutputFile[] = [];

  const [{ AudioBufferSink }, { AUDIO_MIME, encodeAudio }] = await Promise.all([
    import("mediabunny"),
    import("../audio/codec"),
  ]);

  for (const [index, file] of files.entries()) {
    const input = await openVideo(file);
    try {
      const track = await input.getPrimaryAudioTrack();
      if (!track) {
        throw new ToolError(`“${file.name}” has no sound track, so there is no audio to take out of it.`);
      }

      const duration = await input.computeDuration();
      const sampleRate = await track.getSampleRate();
      const channelCount = Math.min(2, await track.getNumberOfChannels());
      const frames = Math.max(1, Math.ceil(duration * sampleRate));
      const channels = Array.from({ length: channelCount }, () => new Float32Array(frames));

      const sink = new AudioBufferSink(track);
      for await (const chunk of sink.buffers()) {
        const at = Math.round(chunk.timestamp * sampleRate);
        if (at >= frames) break;
        for (let channel = 0; channel < channelCount; channel++) {
          const source = chunk.buffer.getChannelData(Math.min(channel, chunk.buffer.numberOfChannels - 1));
          const count = Math.min(source.length, frames - at);
          if (count > 0) channels[channel].set(source.subarray(0, count), at);
        }
        onProgress?.((index + Math.min(1, chunk.timestamp / Math.max(duration, 0.001)) * 0.8) / files.length, file.name);
      }

      const bytes = await encodeAudio({ channels, sampleRate }, format, bitrate);
      outputs.push({ name: `${stem(file.name)}.${format}`, bytes, mime: AUDIO_MIME[format] });
      onProgress?.((index + 1) / files.length, file.name);
    } finally {
      input.dispose();
    }
  }

  const total = outputs.reduce((sum, f) => sum + f.bytes.length, 0);
  return {
    files: outputs,
    stats: [
      { label: "Files", value: String(outputs.length) },
      { label: "Sound", value: formatBytes(total) },
    ],
    note:
      format === "wav"
        ? "WAV keeps every sample the video held. It is roughly ten times the size of the MP3 and is the right choice when the audio is going into an editor next."
        : undefined,
  } satisfies FileOpResult;
};
