import { describe, expect, it } from "vitest";

import { encodeMp3, encodeWav } from "@/lib/engines/audio/codec";
import {
  applyGain,
  biquadCoefficients,
  changeSpeed,
  concatSignals,
  decibelsToGain,
  duration,
  equalise,
  fadeEdges,
  frameCount,
  normalise,
  peakLevel,
  pitchShift,
  resampleByFactor,
  reverseSignal,
  sliceSignal,
  timeStretch,
  toMono,
  type AudioSignal,
} from "@/lib/engines/audio/dsp";
import { formatTimecode, parseTimecode } from "@/lib/engines/audio/ops";
import { ToolError } from "@/lib/engines/types";

/**
 * The audio maths, against signals whose answers are known in advance.
 *
 * A sine wave is the useful fixture here: its frequency can be measured out of
 * the result, so "the pitch did not change" stops being a matter of opinion.
 */

const RATE = 44100;

function sine(frequency: number, seconds: number, amplitude = 0.5, sampleRate = RATE): AudioSignal {
  const length = Math.round(seconds * sampleRate);
  const channel = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    channel[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return { channels: [channel], sampleRate };
}

/**
 * Measures how strongly one frequency is present, by correlating against it.
 *
 * This is a single-bin discrete Fourier transform. Comparing the strength at
 * several candidate frequencies says which one the signal actually is, without
 * needing a whole FFT.
 */
function energyAt(signal: AudioSignal, frequency: number): number {
  const channel = signal.channels[0];
  let real = 0;
  let imaginary = 0;
  for (let i = 0; i < channel.length; i++) {
    const angle = (2 * Math.PI * frequency * i) / signal.sampleRate;
    real += channel[i] * Math.cos(angle);
    imaginary += channel[i] * Math.sin(angle);
  }
  return Math.hypot(real, imaginary) / channel.length;
}

/** Which of the candidates the signal is loudest at. */
function dominantOf(signal: AudioSignal, candidates: number[]): number {
  return candidates.reduce((best, f) => (energyAt(signal, f) > energyAt(signal, best) ? f : best));
}

describe("timecodes", () => {
  it("reads seconds and minutes:seconds", () => {
    expect(parseTimecode("90", 0)).toBe(90);
    expect(parseTimecode("1:30", 0)).toBe(90);
    expect(parseTimecode("1:02:03", 0)).toBe(3723);
    expect(parseTimecode("  ", 42)).toBe(42);
  });

  it("refuses text that is not a time rather than treating it as zero", () => {
    // Silently reading "start" as 0 would trim from the beginning and the person
    // would never learn their input was ignored.
    expect(() => parseTimecode("half way", 0)).toThrow(ToolError);
    expect(() => parseTimecode("-5", 0)).toThrow(ToolError);
  });

  it("writes times the way a player shows them", () => {
    expect(formatTimecode(0)).toBe("0:00");
    expect(formatTimecode(65)).toBe("1:05");
  });
});

describe("cutting", () => {
  it("keeps exactly the seconds asked for", () => {
    const cut = sliceSignal(sine(440, 3), 1, 2.5);
    expect(duration(cut)).toBeCloseTo(1.5, 3);
  });

  it("clamps rather than reading past the end", () => {
    const cut = sliceSignal(sine(440, 1), 0.5, 99);
    expect(duration(cut)).toBeCloseTo(0.5, 3);
  });

  it("fades the edges to silence, which is what stops the click", () => {
    const faded = fadeEdges(sine(440, 1), 0.02, 0.02);
    const channel = faded.channels[0];
    expect(Math.abs(channel[0])).toBeLessThan(1e-6);
    expect(Math.abs(channel[channel.length - 1])).toBeLessThan(1e-3);
    // The middle is untouched.
    expect(peakLevel({ channels: [channel.slice(RATE / 4, RATE / 2)], sampleRate: RATE })).toBeCloseTo(0.5, 2);
  });
});

describe("level", () => {
  it("applies a gain in decibels", () => {
    const louder = applyGain(sine(440, 0.1, 0.25), decibelsToGain(6));
    expect(peakLevel(louder)).toBeCloseTo(0.5, 2);
  });

  it("clamps at full scale instead of wrapping", () => {
    // Wrapping is the difference between a loud file and a ruined one: a sample
    // past 1.0 written as an integer comes back as a value of the opposite sign.
    const blasted = applyGain(sine(440, 0.05, 0.9), decibelsToGain(24));
    expect(peakLevel(blasted)).toBeLessThanOrEqual(1);
  });

  it("normalises quiet material up to just under full scale", () => {
    const lifted = normalise(sine(440, 0.2, 0.02), -1);
    expect(peakLevel(lifted)).toBeCloseTo(decibelsToGain(-1), 2);
  });

  it("leaves silence alone rather than dividing by zero", () => {
    const silence: AudioSignal = { channels: [new Float32Array(1000)], sampleRate: RATE };
    expect(peakLevel(normalise(silence))).toBe(0);
  });
});

describe("reverse", () => {
  it("is its own inverse", () => {
    const original = sine(440, 0.05);
    const there = reverseSignal(original);
    const back = reverseSignal(there);
    expect(Array.from(back.channels[0])).toEqual(Array.from(original.channels[0]));
  });
});

describe("speed and pitch", () => {
  it("resampling changes length and pitch together, like a tape machine", () => {
    const faster = resampleByFactor(sine(440, 1), 2);
    expect(duration(faster)).toBeCloseTo(0.5, 2);
    expect(dominantOf(faster, [440, 660, 880])).toBe(880);
  });

  it("time stretching changes the length and leaves the pitch alone", () => {
    // This is the whole reason WSOLA is in the file rather than a resample.
    const slower = timeStretch(sine(440, 1), 2);
    expect(duration(slower)).toBeCloseTo(2, 1);
    expect(dominantOf(slower, [220, 330, 440, 880])).toBe(440);
  });

  it("plays faster while keeping the voice at its own pitch", () => {
    const quick = changeSpeed(sine(440, 2), 1.5, true);
    expect(duration(quick)).toBeCloseTo(2 / 1.5, 1);
    expect(dominantOf(quick, [293, 440, 660])).toBe(440);
  });

  it("gives the tape effect when asked to", () => {
    const quick = changeSpeed(sine(440, 1), 2, false);
    expect(dominantOf(quick, [440, 880])).toBe(880);
  });

  it("shifts pitch by semitones without changing the duration", () => {
    const up = pitchShift(sine(440, 1), 12);
    expect(duration(up)).toBeCloseTo(1, 1);
    expect(dominantOf(up, [440, 622, 880, 1760])).toBe(880);
  });

  it("moves down as well as up", () => {
    const down = pitchShift(sine(440, 1), -12);
    expect(dominantOf(down, [110, 220, 440])).toBe(220);
  });
});

describe("equaliser", () => {
  it("boosts the bass shelf and leaves the treble where it was", () => {
    const low = sine(60, 0.5, 0.2);
    const high = sine(10000, 0.5, 0.2);

    const boostedLow = equalise(low, { bass: 6, mid: 0, treble: 0 });
    const boostedHigh = equalise(high, { bass: 6, mid: 0, treble: 0 });

    expect(energyAt(boostedLow, 60) / energyAt(low, 60)).toBeCloseTo(2, 0);
    expect(energyAt(boostedHigh, 10000) / energyAt(high, 10000)).toBeCloseTo(1, 1);
  });

  it("cuts what it is asked to cut", () => {
    const high = sine(10000, 0.5, 0.2);
    const dulled = equalise(high, { bass: 0, mid: 0, treble: -12 });
    expect(energyAt(dulled, 10000)).toBeLessThan(energyAt(high, 10000) * 0.4);
  });

  it("does nothing at all when every band is flat", () => {
    const original = sine(440, 0.1);
    const same = equalise(original, { bass: 0, mid: 0, treble: 0 });
    expect(same).toBe(original);
  });

  it("uses the same filter shapes as the browser's own equaliser", () => {
    // A peaking filter at its centre frequency should show exactly its gain.
    const c = biquadCoefficients("peaking", RATE, 1000, 0.8, 6);
    const w = (2 * Math.PI * 1000) / RATE;
    const cos = Math.cos(w), sin = Math.sin(w);
    const cos2 = Math.cos(2 * w), sin2 = Math.sin(2 * w);
    const numerator = Math.hypot(c.b0 + c.b1 * cos + c.b2 * cos2, -(c.b1 * sin + c.b2 * sin2));
    const denominator = Math.hypot(1 + c.a1 * cos + c.a2 * cos2, -(c.a1 * sin + c.a2 * sin2));
    expect(20 * Math.log10(numerator / denominator)).toBeCloseTo(6, 1);
  });
});

describe("joining", () => {
  it("lays recordings end to end", () => {
    const joined = concatSignals([sine(440, 1), sine(660, 0.5)]);
    expect(duration(joined)).toBeCloseTo(1.5, 2);
  });

  it("overlaps them by the crossfade", () => {
    const joined = concatSignals([sine(440, 1), sine(660, 1)], 0.25);
    expect(duration(joined)).toBeCloseTo(1.75, 2);
  });

  it("holds the level through an equal-power crossfade", () => {
    // Two linear ramps crossing would dip to half amplitude in the middle, which
    // is heard as a hole at every join.
    const joined = concatSignals([sine(440, 1, 0.5), sine(440, 1, 0.5)], 0.4);
    const middle = Math.round(0.9 * RATE);
    const window = joined.channels[0].slice(middle, middle + 2000);
    expect(peakLevel({ channels: [window], sampleRate: RATE })).toBeGreaterThan(0.4);
  });

  it("survives being given one recording, or none", () => {
    expect(duration(concatSignals([sine(440, 1)]))).toBeCloseTo(1, 3);
    expect(frameCount(concatSignals([]))).toBe(0);
  });
});

describe("wav", () => {
  it("writes a header a player will accept", () => {
    const bytes = encodeWav(sine(440, 0.1, 0.5, 8000));
    const text = new TextDecoder("latin1").decode(bytes.slice(0, 44));

    expect(text.slice(0, 4)).toBe("RIFF");
    expect(text.slice(8, 12)).toBe("WAVE");

    const view = new DataView(bytes.buffer);
    expect(view.getUint16(22, true)).toBe(1); // channels
    expect(view.getUint32(24, true)).toBe(8000); // sample rate
    expect(view.getUint16(34, true)).toBe(16); // bits
    expect(bytes.length).toBe(44 + 800 * 2);
    // The size fields have to agree with the file, or players truncate it.
    expect(view.getUint32(4, true)).toBe(bytes.length - 8);
    expect(view.getUint32(40, true)).toBe(bytes.length - 44);
  });

  it("writes stereo interleaved, left then right", () => {
    const left = new Float32Array([1, 0, 0]);
    const right = new Float32Array([-1, 0, 0]);
    const bytes = encodeWav({ channels: [left, right], sampleRate: 8000 });
    const view = new DataView(bytes.buffer);

    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32768);
  });
});

describe("mono fold", () => {
  it("averages the channels rather than dropping one", () => {
    const stereo: AudioSignal = {
      channels: [new Float32Array([1, 1]), new Float32Array([0, -1])],
      sampleRate: RATE,
    };
    expect(Array.from(toMono(stereo).channels[0])).toEqual([0.5, 0]);
  });
});

describe("mp3", () => {
  it("writes frames a player will sync to", async () => {
    const bytes = await encodeMp3(sine(440, 1, 0.5), 128);

    // Every MPEG frame opens with eleven set bits. If the first two bytes are
    // not a sync word, no player will find the start of the file.
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1] & 0xe0).toBe(0xe0);

    // A second of mono at 128 kbps is about 16 kB. An order of magnitude either
    // way would mean the encoder was fed the wrong thing.
    expect(bytes.length).toBeGreaterThan(8_000);
    expect(bytes.length).toBeLessThan(30_000);
  });

  it("makes a smaller file at a lower bitrate", async () => {
    const high = await encodeMp3(sine(440, 1, 0.5), 320);
    const low = await encodeMp3(sine(440, 1, 0.5), 64);
    expect(low.length).toBeLessThan(high.length / 2);
  });

  it("encodes stereo as stereo", async () => {
    const stereo = { channels: [sine(440, 1).channels[0], sine(660, 1).channels[0]], sampleRate: RATE };
    const bytes = await encodeMp3(stereo, 128);
    expect(bytes[0]).toBe(0xff);
    expect(bytes.length).toBeGreaterThan(8_000);
  });
});
