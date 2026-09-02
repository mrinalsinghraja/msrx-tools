import { AudioBufferSink, AudioBufferSource, CanvasSink, CanvasSource, Conversion, type Input } from "mediabunny";

import { formatBytes, stem, type FileOp, type InputFile } from "../file-types";
import { num, str, ToolError } from "../types";

import { containerOf, makeOutput, openVideo, outputFile, pickCodecs, qualityOf, requireVideoTrack, takeBytes } from "./core";

/**
 * The tools that build a new timeline rather than adjust an existing one:
 * joining clips, repeating one, changing how fast it runs, and putting a
 * different sound track under it.
 *
 * These cannot be a straight conversion, because a conversion has one input and
 * copies its timing. Here the output is assembled frame by frame: a decoder on
 * one side, a canvas in the middle, an encoder on the other.
 *
 * The cost is honest and worth stating on the page — every frame is decoded and
 * encoded again, so joining four clips takes about as long as playing them.
 */

const SAMPLE_RATE = 48_000;
const CHANNELS = 2;

let audioContext: AudioContext | null = null;

/** Only ever used to allocate AudioBuffers; nothing is played. */
function context(): AudioContext {
  if (!audioContext) audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  return audioContext;
}

/* ------------------------------------------------------------------ */
/* Reading a clip's sound into one buffer                              */
/* ------------------------------------------------------------------ */

/**
 * Every clip contributes a block of audio exactly as long as its picture.
 *
 * A clip with no sound contributes silence of the right length rather than
 * nothing at all. Without that, a silent clip in the middle of a join would
 * pull all the audio after it forward and the rest of the film would be out of
 * sync with its own soundtrack.
 */
async function readSegmentAudio(input: Input, seconds: number): Promise<AudioBuffer> {
  const frames = Math.max(1, Math.ceil(seconds * SAMPLE_RATE));
  const buffer = context().createBuffer(CHANNELS, frames, SAMPLE_RATE);

  const track = await input.getPrimaryAudioTrack();
  if (!track) return buffer;

  const sink = new AudioBufferSink(track);
  for await (const chunk of sink.buffers()) {
    const at = Math.round(chunk.timestamp * SAMPLE_RATE);
    if (at >= frames) break;

    for (let channel = 0; channel < CHANNELS; channel++) {
      // A mono clip is written to both output channels; a five-channel one is
      // read down to two. Neither is a mix worth being clever about here.
      const source = chunk.buffer.getChannelData(Math.min(channel, chunk.buffer.numberOfChannels - 1));
      const destination = buffer.getChannelData(channel);
      const count = Math.min(source.length, frames - Math.max(0, at));
      if (count <= 0) continue;
      destination.set(at >= 0 ? source.subarray(0, count) : source.subarray(-at, -at + count), Math.max(0, at));
    }
  }
  return buffer;
}

/* ------------------------------------------------------------------ */
/* The shared assembly pipeline                                        */
/* ------------------------------------------------------------------ */

interface Segment {
  file: InputFile;
  input: Input;
  duration: number;
}

/**
 * Writes a sequence of clips into one file at one size.
 *
 * `timeScale` stretches or squeezes the result: 1 joins clips as they are, 0.5
 * makes everything run at double speed. It is the same operation either way,
 * which is why the speed tool and the join tool share this function.
 */
async function assemble(
  segments: Segment[],
  options: Parameters<FileOp>[1],
  onProgress: Parameters<FileOp>[2],
  timeScale: number,
  audioFor: (segment: Segment, index: number) => Promise<AudioBuffer>,
) {
  const container = containerOf(str(options, "format", "mp4"));
  const first = await requireVideoTrack(segments[0].input, segments[0].file.name);

  const width = Math.max(2, Math.round(first.width / 2) * 2);
  const height = Math.max(2, Math.round(first.height / 2) * 2);

  const canvas = new OffscreenCanvas(width, height);
  const drawing = canvas.getContext("2d");
  if (!drawing) throw new ToolError("This browser would not give the tool a drawing surface.");

  const quality = qualityOf(str(options, "quality", "high"));
  const { video, audio } = await pickCodecs(container, true, true, { width, height });
  const { output, target } = makeOutput(container);

  const videoSource = new CanvasSource(canvas, { codec: video!, quality });
  const audioSource = new AudioBufferSource({ codec: audio!, quality });
  output.addVideoTrack(videoSource);
  output.addAudioTrack(audioSource);
  await output.start();

  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
  let elapsed = 0;
  let frameCount = 0;

  for (const [index, segment] of segments.entries()) {
    const track = await segment.input.getPrimaryVideoTrack();
    if (!track) {
      throw new ToolError(`“${segment.file.name}” has no video track, so it cannot be part of a video.`);
    }

    // Every clip is drawn into the same box at the same size. `contain` keeps
    // each one's shape and pads the difference, which is the only join that
    // does not distort a clip shot in a different aspect ratio.
    const sink = new CanvasSink(track, { width, height, fit: "contain", poolSize: 2 });

    for await (const frame of sink.canvases()) {
      drawing.fillStyle = "#000000";
      drawing.fillRect(0, 0, width, height);
      drawing.drawImage(frame.canvas as CanvasImageSource, 0, 0, width, height);

      await videoSource.add(
        (elapsed + frame.timestamp) * timeScale,
        Math.max(1 / 240, frame.duration) * timeScale,
      );
      frameCount++;

      if (frameCount % 10 === 0) {
        onProgress?.((elapsed + frame.timestamp) / Math.max(totalDuration, 0.001), segment.file.name);
      }
    }

    await audioSource.add(await audioFor(segment, index));
    elapsed += segment.duration;
  }

  videoSource.close();
  audioSource.close();
  await output.finalize();

  const bytes = takeBytes(target);
  return {
    bytes,
    file: outputFile(stem(segments[0].file.name), container, bytes),
    frameCount,
    duration: elapsed * timeScale,
    size: { width, height },
  };
}

/** Resamples a buffer by a factor, which is what changes playback speed. */
function stretchBuffer(source: AudioBuffer, factor: number): AudioBuffer {
  const frames = Math.max(1, Math.round(source.length * factor));
  const output = context().createBuffer(source.numberOfChannels, frames, source.sampleRate);

  for (let channel = 0; channel < source.numberOfChannels; channel++) {
    const from = source.getChannelData(channel);
    const to = output.getChannelData(channel);
    for (let i = 0; i < frames; i++) {
      // Linear interpolation between neighbouring samples. At the speeds a
      // person actually asks for — half to double — the artefacts of anything
      // fancier are inaudible against the pitch shift itself.
      const position = (i / factor) % source.length;
      const index = Math.floor(position);
      const next = Math.min(index + 1, from.length - 1);
      const fraction = position - index;
      to[i] = from[index] * (1 - fraction) + from[next] * fraction;
    }
  }
  return output;
}

/* ------------------------------------------------------------------ */
/* Merge                                                               */
/* ------------------------------------------------------------------ */

export const mergeVideos: FileOp = async (files, options, onProgress) => {
  if (files.length < 2) {
    throw new ToolError("Joining needs at least two clips. Drop the rest in — they are joined in the order they are listed.");
  }

  const segments: Segment[] = [];
  try {
    for (const file of files) {
      const input = await openVideo(file);
      const facts = await requireVideoTrack(input, file.name);
      segments.push({ file, input, duration: facts.duration });
    }

    const result = await assemble(segments, options, onProgress, 1, (segment) =>
      readSegmentAudio(segment.input, segment.duration),
    );

    return {
      files: [{ ...result.file, name: `joined.${result.file.name.split(".").pop()}` }],
      stats: [
        { label: "Clips", value: String(files.length) },
        { label: "Length", value: `${result.duration.toFixed(1)}s` },
        { label: "Size", value: `${result.size.width} × ${result.size.height}` },
        { label: "File", value: formatBytes(result.bytes.length) },
      ],
      note: "Every clip is redrawn at the first clip's size and shape. A portrait clip joined to a landscape one is fitted inside the frame with black at the sides rather than stretched.",
    };
  } finally {
    for (const segment of segments) segment.input.dispose();
  }
};

/* ------------------------------------------------------------------ */
/* Loop                                                                */
/* ------------------------------------------------------------------ */

export const loopVideo: FileOp = async (files, options, onProgress) => {
  const times = Math.max(2, Math.min(50, Math.round(num(options, "times", 3))));
  const file = files[0];
  const input = await openVideo(file);

  try {
    const facts = await requireVideoTrack(input, file.name);
    if (facts.duration * times > 30 * 60) {
      throw new ToolError(
        `${times} copies of this clip would run for over half an hour, which is more than this browser will hold in memory. Try fewer repeats.`,
      );
    }

    const segments: Segment[] = Array.from({ length: times }, () => ({ file, input, duration: facts.duration }));
    const result = await assemble(segments, options, onProgress, 1, () => readSegmentAudio(input, facts.duration));

    return {
      files: [result.file],
      stats: [
        { label: "Repeats", value: `${times}×` },
        { label: "Length", value: `${result.duration.toFixed(1)}s` },
        { label: "File", value: formatBytes(result.bytes.length) },
      ],
      note: "The copies are laid end to end in one file, so the loop plays anywhere — including in the places that ignore a player's repeat setting, which is most of them.",
    };
  } finally {
    input.dispose();
  }
};

/* ------------------------------------------------------------------ */
/* Speed                                                               */
/* ------------------------------------------------------------------ */

export const changeVideoSpeed: FileOp = async (files, options, onProgress) => {
  const rate = num(options, "rate", 2);
  if (rate <= 0 || rate > 8) {
    throw new ToolError("Choose a speed between a quarter and eight times. Beyond that there is nothing left to watch.");
  }
  if (rate === 1) throw new ToolError("That is the speed it already runs at. Pick a different one.");

  const file = files[0];
  const input = await openVideo(file);

  try {
    const facts = await requireVideoTrack(input, file.name);
    const keepSound = str(options, "sound", "keep") !== "drop";

    const result = await assemble([{ file, input, duration: facts.duration }], options, onProgress, 1 / rate, async () => {
      const original = await readSegmentAudio(input, facts.duration);
      if (!keepSound || !facts.hasAudio) {
        return context().createBuffer(CHANNELS, Math.max(1, Math.ceil((facts.duration / rate) * SAMPLE_RATE)), SAMPLE_RATE);
      }
      return stretchBuffer(original, 1 / rate);
    });

    return {
      files: [result.file],
      stats: [
        { label: "Speed", value: `${rate}×` },
        { label: "Was", value: `${facts.duration.toFixed(1)}s` },
        { label: "Now", value: `${result.duration.toFixed(1)}s` },
      ],
      note: keepSound
        ? "The sound is sped up with the picture, which raises its pitch — voices go up as they go faster, the way they do on a record played too fast. Drop the sound instead if that matters more than hearing it."
        : "The sound was dropped. Speeding audio up without raising its pitch is a different job, and the Change Audio Speed tool does it properly on the sound alone.",
    };
  } finally {
    input.dispose();
  }
};

/* ------------------------------------------------------------------ */
/* A different soundtrack                                              */
/* ------------------------------------------------------------------ */

export const addAudioToVideo: FileOp = async (files, options, onProgress) => {
  const [videoFile, audioFile] = files;
  if (!audioFile) {
    throw new ToolError("Two files are needed: the video, and the sound to put under it. Drop them both in.");
  }

  const container = containerOf(str(options, "format", "mp4"));
  const input = await openVideo(videoFile);

  try {
    const facts = await requireVideoTrack(input, videoFile.name);

    let decoded: AudioBuffer;
    try {
      decoded = await context().decodeAudioData(audioFile.bytes.slice().buffer as ArrayBuffer);
    } catch {
      throw new ToolError(
        `“${audioFile.name}” could not be read as sound. This browser reads what it can play — MP3, WAV, M4A, OGG and usually FLAC.`,
      );
    }

    const mode = str(options, "mode", "replace");
    const shorten = str(options, "fit", "loop");
    const frames = Math.max(1, Math.ceil(facts.duration * SAMPLE_RATE));
    const bed = context().createBuffer(CHANNELS, frames, SAMPLE_RATE);

    // The new sound almost never matches the video's length. Repeating it is
    // what a soundtrack wants; stopping when it runs out is what a voiceover
    // wants. Both are one line, so both are offered.
    for (let channel = 0; channel < CHANNELS; channel++) {
      const source = decoded.getChannelData(Math.min(channel, decoded.numberOfChannels - 1));
      const destination = bed.getChannelData(channel);
      const ratio = decoded.sampleRate / SAMPLE_RATE;
      for (let i = 0; i < frames; i++) {
        const position = i * ratio;
        if (position >= source.length && shorten !== "loop") break;
        destination[i] = source[Math.floor(position) % source.length] ?? 0;
      }
    }

    if (mode === "mix" && facts.hasAudio) {
      const original = await readSegmentAudio(input, facts.duration);
      const level = num(options, "level", 50) / 100;
      for (let channel = 0; channel < CHANNELS; channel++) {
        const keep = original.getChannelData(channel);
        const add = bed.getChannelData(channel);
        for (let i = 0; i < add.length; i++) {
          const mixed = keep[i] * (1 - level) + add[i] * level;
          add[i] = mixed > 1 ? 1 : mixed < -1 ? -1 : mixed;
        }
      }
    }

    const quality = qualityOf(str(options, "quality", "high"));
    const { video, audio } = await pickCodecs(container, true, true, { width: facts.width, height: facts.height });
    const { output, target } = makeOutput(container);

    // Composable: the conversion brings the picture across — copying the
    // encoded frames untouched where the container allows it — and the sound
    // track beside it is written here. The video is never re-encoded to gain a
    // soundtrack, which is the whole reason for taking this route.
    const conversion = await Conversion.init({
      input,
      output,
      composable: true,
      showWarnings: false,
      video: { codec: video! },
      audio: { discard: true },
    });

    const audioSource = new AudioBufferSource({ codec: audio!, quality });
    output.addAudioTrack(audioSource);
    await output.start();

    if (onProgress) conversion.onProgress = (fraction) => onProgress(fraction * 0.9, videoFile.name);

    await Promise.all([
      conversion.execute(),
      (async () => {
        await audioSource.add(bed);
        audioSource.close();
      })(),
    ]);

    await output.finalize();
    onProgress?.(1, videoFile.name);

    const bytes = takeBytes(target);
    return {
      files: [outputFile(stem(videoFile.name), container, bytes)],
      stats: [
        { label: "Sound", value: audioFile.name },
        { label: "Length", value: `${facts.duration.toFixed(1)}s` },
        { label: "File", value: formatBytes(bytes.length) },
      ],
      note:
        mode === "mix" && facts.hasAudio
          ? "The video's own sound was kept underneath and the new track mixed over it at the level you chose."
          : facts.hasAudio
            ? "The video's original sound was replaced. Choose “mix” instead to keep both."
            : undefined,
    };
  } finally {
    input.dispose();
  }
};
