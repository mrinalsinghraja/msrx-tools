import { parseTimecode } from "../timecode";
import { bool, num, str, ToolError } from "../types";
import { formatBytes, stem, type FileOp, type OutputFile } from "../file-types";

import { AUDIO_MIME, decodeAudio, encodeAudio, type AudioFormat } from "./codec";
import {
  changeSpeed,
  concatSignals,
  duration,
  equalise,
  fadeEdges,
  frameCount,
  applyGain,
  decibelsToGain,
  normalise,
  peakLevel,
  gainToDecibels,
  pitchShift,
  resampleTo,
  reverseSignal,
  sliceSignal,
  type AudioSignal,
} from "./dsp";

/**
 * Audio tools, on the browser's own decoder and arithmetic written here.
 *
 * There is no FFmpeg in this engine and no thirty-megabyte download waiting on
 * the first click. Everything these tools do to a waveform is a few hundred
 * lines of maths over sample arrays, and doing it that way means the work is
 * testable, starts instantly, and needs none of the cross-origin isolation that
 * a WebAssembly FFmpeg build would impose on the whole site.
 */

/** Shared with the video engine, which reads the same kind of times. */
export { parseTimecode } from "../timecode";

export function formatTimecode(seconds: number): string {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function chosenFormat(options: Parameters<FileOp>[1]): AudioFormat {
  return str(options, "format", "mp3") === "wav" ? "wav" : "mp3";
}

/** MP3 only understands a fixed set of rates; anything else has to be moved first. */
const MP3_RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];

function prepareForFormat(signal: AudioSignal, format: AudioFormat): AudioSignal {
  if (format !== "mp3" || MP3_RATES.includes(signal.sampleRate)) return signal;
  const nearest = MP3_RATES.reduce((best, rate) =>
    Math.abs(rate - signal.sampleRate) < Math.abs(best - signal.sampleRate) ? rate : best,
  );
  return resampleTo(signal, nearest);
}

/**
 * The shape every one-file-in, one-file-out audio tool shares: decode, do the
 * work, encode. Written once so a new tool is a function over a signal.
 */
function signalOp(
  transform: (signal: AudioSignal, options: Parameters<FileOp>[1]) => AudioSignal | Promise<AudioSignal>,
  suffix: string,
  describe?: (before: AudioSignal, after: AudioSignal, options: Parameters<FileOp>[1]) => string | undefined,
): FileOp {
  return async (files, options, onProgress) => {
    const format = chosenFormat(options);
    const bitrate = num(options, "bitrate", 192);
    const outputs: OutputFile[] = [];
    let note: string | undefined;

    for (const [index, file] of files.entries()) {
      const decoded = await decodeAudio(file.name, file.bytes);
      const processed = await transform(decoded, options);
      if (frameCount(processed) === 0) {
        throw new ToolError(
          `Those settings leave nothing of “${file.name}”. Check the times — the result is zero seconds long.`,
        );
      }

      const ready = prepareForFormat(processed, format);
      outputs.push({
        name: `${stem(file.name)}-${suffix}.${format}`,
        bytes: await encodeAudio(ready, format, bitrate),
        mime: AUDIO_MIME[format],
      });

      if (index === 0 && describe) note = describe(decoded, processed, options);
      onProgress?.((index + 1) / files.length, file.name);
    }

    const after = outputs.reduce((sum, f) => sum + f.bytes.length, 0);
    return {
      files: outputs,
      stats: [
        { label: "Files", value: String(outputs.length) },
        { label: "Format", value: format.toUpperCase() },
        { label: "Size", value: formatBytes(after) },
      ],
      note,
    };
  };
}

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

export const trimAudio: FileOp = signalOp(
  (signal, options) => {
    const start = parseTimecode(str(options, "start", ""), 0);
    const end = parseTimecode(str(options, "end", ""), duration(signal));

    if (end <= start) {
      throw new ToolError(
        `The end (${formatTimecode(end)}) is not after the start (${formatTimecode(start)}), so there is nothing between them to keep.`,
      );
    }

    const cut = sliceSignal(signal, start, end);
    return bool(options, "fade", true) ? fadeEdges(cut, 0.02, 0.02) : cut;
  },
  "trimmed",
  (before, after) =>
    `Kept ${formatTimecode(duration(after))} of ${formatTimecode(duration(before))}.`,
);

export const changeAudioVolume: FileOp = signalOp(
  (signal, options) => {
    if (str(options, "mode", "gain") === "normalise") {
      return normalise(signal, num(options, "targetPeak", -1));
    }
    return applyGain(signal, decibelsToGain(num(options, "gain", 0)));
  },
  "volume",
  (before, after, options) => {
    if (str(options, "mode", "gain") === "normalise") {
      return `Loudest point moved from ${gainToDecibels(peakLevel(before)).toFixed(1)} dB to ${gainToDecibels(peakLevel(after)).toFixed(1)} dB below full scale.`;
    }
    const gain = num(options, "gain", 0);
    if (gain > 0 && peakLevel(after) >= 1) {
      return "The loudest parts have reached full scale and are being held there, so more gain will flatten them rather than make them louder. Use “match a target level” instead.";
    }
    return undefined;
  },
);

export const changeAudioSpeed: FileOp = signalOp(
  (signal, options) => changeSpeed(signal, num(options, "speed", 1), bool(options, "keepPitch", true)),
  "speed",
  (before, after) =>
    `${formatTimecode(duration(before))} became ${formatTimecode(duration(after))}.`,
);

export const changeAudioPitch: FileOp = signalOp(
  (signal, options) => pitchShift(signal, num(options, "semitones", 0)),
  "pitch",
  (_before, _after, options) => {
    const semitones = num(options, "semitones", 0);
    if (Math.abs(semitones) <= 5) return undefined;
    return "Past about five semitones the stretching that keeps the length starts to be audible on voices. Smaller moves sound cleaner.";
  },
);

/** Ready-made curves, for people who know the sound they want but not the numbers. */
const EQ_PRESETS: Record<string, { bass: number; mid: number; treble: number }> = {
  flat: { bass: 0, mid: 0, treble: 0 },
  voice: { bass: -3, mid: 4, treble: 2 },
  bass: { bass: 6, mid: -1, treble: 0 },
  bright: { bass: -1, mid: 0, treble: 5 },
  warm: { bass: 4, mid: 1, treble: -3 },
  phone: { bass: -12, mid: 6, treble: -8 },
};

export const equalizeAudio: FileOp = signalOp(
  (signal, options) => {
    const preset = str(options, "preset", "custom");
    const bands =
      preset !== "custom" && EQ_PRESETS[preset]
        ? EQ_PRESETS[preset]
        : {
            bass: num(options, "bass", 0),
            mid: num(options, "mid", 0),
            treble: num(options, "treble", 0),
          };

    const shaped = equalise(signal, bands);
    // Boosting a band can push peaks past full scale, where they would clip on
    // the way to an integer. Pull the whole thing back rather than let it break.
    return peakLevel(shaped) > 1 ? normalise(shaped, -0.5) : shaped;
  },
  "eq",
  (_before, after) =>
    peakLevel(after) >= 0.94
      ? "The boost pushed the level to the top, so the whole track was turned down slightly to keep it from clipping."
      : undefined,
);

export const reverseAudio: FileOp = signalOp((signal) => reverseSignal(signal), "reversed");

/**
 * A recording made in the browser, re-encoded.
 *
 * What arrives is whatever the microphone path produced — usually WebM/Opus —
 * which is fine to play and awkward to send to anyone. This turns it into an
 * MP3 or a WAV, and can level it, which matters more for speech than anything
 * else here: a laptop microphone at arm's length records very quietly.
 */
export const exportRecording: FileOp = signalOp(
  (signal, options) => (bool(options, "normalise", true) ? normalise(signal, -1) : signal),
  "recording",
  (before) => `Recorded ${formatTimecode(duration(before))}.`,
);

/**
 * Joins several recordings into one.
 *
 * Files are folded onto the first one's sample rate and channel count before
 * anything is joined. Two files at different rates concatenated raw would play
 * the second at the wrong speed — a bug that sounds like a mastering choice.
 */
export const joinAudio: FileOp = async (files, options, onProgress) => {
  if (files.length < 2) {
    throw new ToolError("Add at least two recordings — joining one file to nothing is the file you already have.");
  }

  const format = chosenFormat(options);
  const crossfade = num(options, "crossfade", 0);
  const decoded: AudioSignal[] = [];

  for (const [index, file] of files.entries()) {
    decoded.push(await decodeAudio(file.name, file.bytes));
    onProgress?.(((index + 1) / files.length) * 0.8, file.name);
  }

  const sampleRate = decoded[0].sampleRate;
  const channelCount = Math.max(...decoded.map((signal) => signal.channels.length));
  let converted = 0;

  const aligned = decoded.map((signal) => {
    let ready = signal;
    if (ready.sampleRate !== sampleRate) {
      ready = resampleTo(ready, sampleRate);
      converted++;
    }
    if (ready.channels.length < channelCount) {
      // A mono file joined to a stereo one is copied to both sides rather than
      // left silent on the right.
      const channels = Array.from({ length: channelCount }, (_, c) => ready.channels[Math.min(c, ready.channels.length - 1)]);
      ready = { channels, sampleRate: ready.sampleRate };
    }
    return ready;
  });

  const joined = concatSignals(aligned, crossfade);
  const bytes = await encodeAudio(prepareForFormat(joined, format), format, num(options, "bitrate", 192));
  const name = str(options, "filename", "joined") || "joined";

  return {
    files: [{ name: `${name}.${format}`, bytes, mime: AUDIO_MIME[format] }],
    stats: [
      { label: "Joined", value: `${files.length} files` },
      { label: "Length", value: formatTimecode(duration(joined)) },
      { label: "Size", value: formatBytes(bytes.length) },
    ],
    note: converted
      ? `${converted === 1 ? "One recording was" : `${converted} recordings were`} resampled to ${sampleRate} Hz to match the first file. Without that they would have played at the wrong speed.`
      : undefined,
  };
};

export const AUDIO_OPS: Record<string, FileOp> = {
  trimAudio,
  changeAudioVolume,
  changeAudioSpeed,
  changeAudioPitch,
  equalizeAudio,
  reverseAudio,
  joinAudio,
  exportRecording,
};

export function getAudioOp(name: string): FileOp | undefined {
  return AUDIO_OPS[name];
}
