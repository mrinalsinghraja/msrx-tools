/**
 * Audio arithmetic, as plain functions over plain arrays.
 *
 * Nothing here touches the Web Audio API. The browser is very good at decoding
 * an MP3 and very good at playing one back, but everything in between — cutting,
 * stretching, filtering — is arithmetic, and arithmetic that lives in a
 * `BiquadFilterNode` cannot be tested outside a browser. Written this way, every
 * claim these tools make about a waveform is checkable against a signal built in
 * a test file.
 */

export interface AudioSignal {
  /** One Float32Array per channel, samples in -1..1. */
  channels: Float32Array[];
  sampleRate: number;
}

export function frameCount(signal: AudioSignal): number {
  return signal.channels[0]?.length ?? 0;
}

export function duration(signal: AudioSignal): number {
  return frameCount(signal) / signal.sampleRate;
}

function mapChannels(signal: AudioSignal, fn: (channel: Float32Array) => Float32Array): AudioSignal {
  return { channels: signal.channels.map(fn), sampleRate: signal.sampleRate };
}

/* ------------------------------------------------------------------ */
/* Cutting and joining                                                 */
/* ------------------------------------------------------------------ */

/** Takes the seconds between `start` and `end`. Out-of-range bounds are clamped. */
export function sliceSignal(signal: AudioSignal, start: number, end: number): AudioSignal {
  const total = frameCount(signal);
  const from = Math.max(0, Math.min(total, Math.round(start * signal.sampleRate)));
  const to = Math.max(from, Math.min(total, Math.round(end * signal.sampleRate)));
  return mapChannels(signal, (channel) => channel.slice(from, to));
}

/**
 * Fades the first and last moments in and out.
 *
 * A cut made at an arbitrary point almost never lands on a zero crossing, and
 * the step from silence to mid-waveform is heard as a click. Twenty
 * milliseconds is enough to remove it and short enough that nobody notices a
 * fade happened at all.
 */
export function fadeEdges(signal: AudioSignal, inSeconds: number, outSeconds: number): AudioSignal {
  const total = frameCount(signal);
  const fadeIn = Math.min(total, Math.round(inSeconds * signal.sampleRate));
  const fadeOut = Math.min(total - fadeIn, Math.round(outSeconds * signal.sampleRate));

  return mapChannels(signal, (channel) => {
    const out = channel.slice();
    for (let i = 0; i < fadeIn; i++) out[i] *= i / fadeIn;
    for (let i = 0; i < fadeOut; i++) out[total - 1 - i] *= i / fadeOut;
    return out;
  });
}

/**
 * Joins recordings end to end, optionally overlapping them by `crossfade`
 * seconds so one runs into the next instead of butting against it.
 *
 * Inputs are expected to share a sample rate and channel count; the callers
 * resample and fold them first, because guessing here would hide a mistake
 * rather than report it.
 */
export function concatSignals(signals: AudioSignal[], crossfade = 0): AudioSignal {
  const present = signals.filter((signal) => frameCount(signal) > 0);
  if (present.length === 0) return { channels: [new Float32Array(0)], sampleRate: 44100 };
  if (present.length === 1) return present[0];

  const sampleRate = present[0].sampleRate;
  const channelCount = present[0].channels.length;
  const overlap = Math.max(0, Math.round(crossfade * sampleRate));

  let total = 0;
  for (const signal of present) total += frameCount(signal);
  total -= overlap * (present.length - 1);

  const channels = Array.from({ length: channelCount }, () => new Float32Array(Math.max(0, total)));

  let position = 0;
  for (const [index, signal] of present.entries()) {
    const length = frameCount(signal);
    const blend = index === 0 ? 0 : Math.min(overlap, length);

    for (let c = 0; c < channelCount; c++) {
      const source = signal.channels[Math.min(c, signal.channels.length - 1)];
      const target = channels[c];
      for (let i = 0; i < length; i++) {
        const at = position + i;
        if (at >= target.length) break;
        if (i < blend) {
          // Equal-power rather than linear: two linear ramps crossing at half
          // amplitude make an audible dip in the middle of every join.
          const t = (i + 1) / (blend + 1);
          target[at] = target[at] * Math.cos((t * Math.PI) / 2) + source[i] * Math.sin((t * Math.PI) / 2);
        } else {
          target[at] = source[i];
        }
      }
    }
    position += length - blend;
  }

  return { channels, sampleRate };
}

/* ------------------------------------------------------------------ */
/* Level                                                               */
/* ------------------------------------------------------------------ */

export function decibelsToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function gainToDecibels(gain: number): number {
  return 20 * Math.log10(Math.max(gain, 1e-9));
}

export function peakLevel(signal: AudioSignal): number {
  let peak = 0;
  for (const channel of signal.channels) {
    for (let i = 0; i < channel.length; i++) {
      const value = Math.abs(channel[i]);
      if (value > peak) peak = value;
    }
  }
  return peak;
}

/**
 * Multiplies the whole signal by a gain, clamping at full scale.
 *
 * Clamping — rather than letting samples run past 1.0 and wrap when they are
 * written as integers — is the difference between a loud recording and a
 * destroyed one. Wrapping turns a peak into a burst of noise.
 */
export function applyGain(signal: AudioSignal, gain: number): AudioSignal {
  return mapChannels(signal, (channel) => {
    const out = new Float32Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      const value = channel[i] * gain;
      out[i] = value > 1 ? 1 : value < -1 ? -1 : value;
    }
    return out;
  });
}

/** Scales so the loudest sample sits at `targetDb` below full scale. */
export function normalise(signal: AudioSignal, targetDb = -1): AudioSignal {
  const peak = peakLevel(signal);
  if (peak === 0) return signal;
  return applyGain(signal, decibelsToGain(targetDb) / peak);
}

/* ------------------------------------------------------------------ */
/* Direction                                                           */
/* ------------------------------------------------------------------ */

export function reverseSignal(signal: AudioSignal): AudioSignal {
  return mapChannels(signal, (channel) => {
    const out = new Float32Array(channel.length);
    for (let i = 0; i < channel.length; i++) out[i] = channel[channel.length - 1 - i];
    return out;
  });
}

/* ------------------------------------------------------------------ */
/* Rate, speed and pitch                                               */
/* ------------------------------------------------------------------ */

/** Cubic interpolation between samples. Linear interpolation whistles. */
function sampleAt(channel: Float32Array, position: number): number {
  const index = Math.floor(position);
  const fraction = position - index;

  const p0 = channel[Math.max(0, index - 1)] ?? 0;
  const p1 = channel[index] ?? 0;
  const p2 = channel[Math.min(channel.length - 1, index + 1)] ?? 0;
  const p3 = channel[Math.min(channel.length - 1, index + 2)] ?? 0;

  const a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
  const b = p0 - 2.5 * p1 + 2 * p2 - 0.5 * p3;
  const c = -0.5 * p0 + 0.5 * p2;
  return ((a * fraction + b) * fraction + c) * fraction + p1;
}

/**
 * Resamples by a factor: 2 makes the result half as long and an octave higher.
 *
 * This is what a tape machine does when you speed it up, and it is the correct
 * behaviour for "change speed" when someone wants the chipmunk effect. It is
 * also the building block underneath pitch shifting.
 */
export function resampleByFactor(signal: AudioSignal, factor: number): AudioSignal {
  if (factor === 1) return signal;
  const length = Math.max(1, Math.round(frameCount(signal) / factor));

  return mapChannels(signal, (channel) => {
    const out = new Float32Array(length);
    for (let i = 0; i < length; i++) out[i] = sampleAt(channel, i * factor);
    return out;
  });
}

/** Changes the sample rate itself, keeping the sound identical. */
export function resampleTo(signal: AudioSignal, sampleRate: number): AudioSignal {
  if (sampleRate === signal.sampleRate) return signal;
  const resampled = resampleByFactor(signal, signal.sampleRate / sampleRate);
  return { channels: resampled.channels, sampleRate };
}

function hannWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  return window;
}

/**
 * Stretches or compresses time without moving the pitch, by WSOLA.
 *
 * The naive version — overlap-add at a shifted hop — leaves the grains out of
 * phase with each other and the result warbles. WSOLA fixes it by sliding each
 * grain a little, up to `search` samples, to wherever it best matches the
 * waveform that would naturally have followed the previous one. That similarity
 * search is the whole algorithm, and it is why a stretched voice still sounds
 * like a voice.
 *
 * `stretch` is the output duration over the input duration: 2 is half speed.
 */
export function timeStretch(signal: AudioSignal, stretch: number): AudioSignal {
  const total = frameCount(signal);
  if (stretch === 1 || total === 0) return signal;

  const frame = Math.min(2048, Math.max(256, 1 << Math.round(Math.log2(signal.sampleRate * 0.046))));
  const synthesisHop = frame >> 1;
  const analysisHop = Math.max(1, Math.round(synthesisHop / stretch));
  const search = Math.round(synthesisHop / 4);
  const correlationLength = Math.min(512, synthesisHop);

  const window = hannWindow(frame);
  const outputLength = Math.max(1, Math.round(total * stretch));
  const channels = signal.channels.map(() => new Float32Array(outputLength));

  // The similarity search runs once, on the first channel, and every channel is
  // then cut at the same places. Searching per channel would slide the left and
  // right of a stereo recording independently and smear the stereo image.
  const guide = signal.channels[0];
  const template = new Float32Array(correlationLength);

  let outputPosition = 0;
  let analysisPosition = 0;
  let first = true;

  while (outputPosition + frame <= outputLength && analysisPosition + frame <= total) {
    let offset = 0;

    if (!first) {
      let best = -Infinity;
      for (let candidate = -search; candidate <= search; candidate++) {
        const start = analysisPosition + candidate;
        if (start < 0 || start + correlationLength > total) continue;

        let score = 0;
        for (let i = 0; i < correlationLength; i++) score += guide[start + i] * template[i];
        if (score > best) {
          best = score;
          offset = candidate;
        }
      }
    }

    const start = analysisPosition + offset;
    for (let c = 0; c < channels.length; c++) {
      const source = signal.channels[c];
      const target = channels[c];
      for (let i = 0; i < frame; i++) {
        const from = start + i;
        if (from < 0 || from >= total) continue;
        target[outputPosition + i] += source[from] * window[i];
      }
    }

    // What the waveform would have done next, had the grain played on. The next
    // grain is chosen to look as much like this as possible.
    for (let i = 0; i < correlationLength; i++) {
      const from = start + synthesisHop + i;
      template[i] = from < total ? guide[from] : 0;
    }

    outputPosition += synthesisHop;
    analysisPosition += analysisHop;
    first = false;
  }

  return { channels, sampleRate: signal.sampleRate };
}

/**
 * Plays the recording faster or slower.
 *
 * `keepPitch` decides which of two quite different effects this is: left on it
 * is the one people want for a lecture or an audiobook, where the voice should
 * still sound like the person. Turned off it is the tape effect, and the pitch
 * rises with the speed.
 */
export function changeSpeed(signal: AudioSignal, speed: number, keepPitch: boolean): AudioSignal {
  if (speed === 1) return signal;
  if (!keepPitch) return resampleByFactor(signal, speed);
  return timeStretch(signal, 1 / speed);
}

/**
 * Moves the pitch by a number of semitones, leaving the duration alone.
 *
 * Resample to move the pitch, then stretch back to undo the change in length.
 * Both halves are above; this is only the composition, which is the standard
 * way pitch shifting is built.
 */
export function pitchShift(signal: AudioSignal, semitones: number): AudioSignal {
  if (semitones === 0) return signal;
  const factor = Math.pow(2, semitones / 12);
  const resampled = resampleByFactor(signal, factor);
  return timeStretch(resampled, factor);
}

/* ------------------------------------------------------------------ */
/* Tone                                                                */
/* ------------------------------------------------------------------ */

export interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

export type ShelfType = "lowshelf" | "peaking" | "highshelf";

/**
 * Robert Bristow-Johnson's cookbook filters, normalised by a0.
 *
 * These are the same formulas the browser's own `BiquadFilterNode` uses, which
 * is the point: an equaliser built here sounds like an equaliser built anywhere
 * else, and can be checked with a test rather than with an ear.
 */
export function biquadCoefficients(
  type: ShelfType,
  sampleRate: number,
  frequency: number,
  q: number,
  dbGain: number,
): BiquadCoefficients {
  const A = Math.pow(10, dbGain / 40);
  const w0 = (2 * Math.PI * frequency) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);

  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;

  if (type === "peaking") {
    b0 = 1 + alpha * A;
    b1 = -2 * cos;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cos;
    a2 = 1 - alpha / A;
  } else {
    const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha;
    if (type === "lowshelf") {
      b0 = A * (A + 1 - (A - 1) * cos + twoSqrtAAlpha);
      b1 = 2 * A * (A - 1 - (A + 1) * cos);
      b2 = A * (A + 1 - (A - 1) * cos - twoSqrtAAlpha);
      a0 = A + 1 + (A - 1) * cos + twoSqrtAAlpha;
      a1 = -2 * (A - 1 + (A + 1) * cos);
      a2 = A + 1 + (A - 1) * cos - twoSqrtAAlpha;
    } else {
      b0 = A * (A + 1 + (A - 1) * cos + twoSqrtAAlpha);
      b1 = -2 * A * (A - 1 + (A + 1) * cos);
      b2 = A * (A + 1 + (A - 1) * cos - twoSqrtAAlpha);
      a0 = A + 1 - (A - 1) * cos + twoSqrtAAlpha;
      a1 = 2 * (A - 1 - (A + 1) * cos);
      a2 = A + 1 - (A - 1) * cos - twoSqrtAAlpha;
    }
  }

  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Runs one biquad over one channel, direct form I. */
export function applyBiquad(channel: Float32Array, c: BiquadCoefficients): Float32Array {
  const out = new Float32Array(channel.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < channel.length; i++) {
    const x0 = channel[i];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    out[i] = y0;
  }
  return out;
}

export interface EqualiserBands {
  /** Decibels, positive to boost. */
  bass: number;
  mid: number;
  treble: number;
}

/** Where the three controls sit. Chosen to match what a hi-fi's three knobs do. */
const BAND_SHAPE: { type: ShelfType; frequency: number; q: number; key: keyof EqualiserBands }[] = [
  { type: "lowshelf", frequency: 200, q: 0.7, key: "bass" },
  { type: "peaking", frequency: 1000, q: 0.8, key: "mid" },
  { type: "highshelf", frequency: 4000, q: 0.7, key: "treble" },
];

export function equalise(signal: AudioSignal, bands: EqualiserBands): AudioSignal {
  const active = BAND_SHAPE.filter((band) => bands[band.key] !== 0);
  if (active.length === 0) return signal;

  const filters = active.map((band) =>
    biquadCoefficients(band.type, signal.sampleRate, band.frequency, band.q, bands[band.key]),
  );

  return mapChannels(signal, (channel) => {
    let current = channel;
    for (const filter of filters) current = applyBiquad(current, filter);
    return current;
  });
}

/** Folds every channel down to one. */
export function toMono(signal: AudioSignal): AudioSignal {
  if (signal.channels.length === 1) return signal;
  const length = frameCount(signal);
  const mono = new Float32Array(length);
  for (const channel of signal.channels) {
    for (let i = 0; i < length; i++) mono[i] += channel[i] / signal.channels.length;
  }
  return { channels: [mono], sampleRate: signal.sampleRate };
}
