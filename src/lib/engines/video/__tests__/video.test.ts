import { describe, expect, it } from "vitest";

import { VIDEO_TOOLS } from "@/lib/tools/catalog/video";
import { getToolContent } from "@/content/tools";

import { containerOf, qualityOf, requireWebCodecs } from "../core";
import { VIDEO_OPS } from "../index";

/**
 * What can honestly be tested without a browser.
 *
 * The video ops themselves need WebCodecs, which jsdom does not have and cannot
 * be given — an encoder is a piece of the platform, not a JavaScript API that
 * can be stubbed into meaning something. Faking one would prove that a fake
 * returns what it was told to return.
 *
 * So the unit tests cover the parts that are decisions rather than codecs: the
 * container table, the quality table, the capability gate, and the wiring
 * between the registry and the op table. The ops are verified in a real browser
 * against real footage instead, which is the only place the claim is meaningful.
 */

describe("containers", () => {
  it("knows the four containers the tools offer", () => {
    expect(containerOf("mp4").mime).toBe("video/mp4");
    expect(containerOf("webm").mime).toBe("video/webm");
    expect(containerOf("mkv").ext).toBe("mkv");
    expect(containerOf("mov").mime).toBe("video/quicktime");
  });

  it("puts H.264 first for MP4 and VP9 first for WebM", () => {
    // Not a preference — the reason MP4 exists as an option is that H.264 plays
    // on hardware that has never heard of anything newer.
    expect(containerOf("mp4").video[0]).toBe("avc");
    expect(containerOf("webm").video[0]).toBe("vp9");
  });

  it("refuses a container it cannot write", () => {
    expect(() => containerOf("avi")).toThrow(/not a container/i);
  });
});

describe("quality", () => {
  it("maps every name the option panels offer", () => {
    for (const name of ["very-low", "low", "medium", "high", "very-high"]) {
      expect(qualityOf(name)).toBeDefined();
    }
  });

  it("falls back to medium rather than throwing on an unknown name", () => {
    expect(qualityOf("nonsense")).toBe(qualityOf("medium"));
  });
});

describe("the capability gate", () => {
  it("refuses to start when the browser has no WebCodecs", () => {
    // jsdom has none, which makes it exactly the environment being guarded
    // against. The message has to name the browsers that do.
    expect(() => requireWebCodecs()).toThrow(/WebCodecs/);
    expect(() => requireWebCodecs()).toThrow(/Safari since 16\.4/);
  });
});

describe("registry wiring", () => {
  it("every video tool names an op that exists", () => {
    const missing = VIDEO_TOOLS.filter((tool) => !VIDEO_OPS[tool.op]).map((t) => `${t.slug} → ${t.op}`);
    expect(missing).toEqual([]);
  });

  it("every video tool has prose", () => {
    const missing = VIDEO_TOOLS.filter((tool) => !getToolContent(tool.slug)).map((t) => t.slug);
    expect(missing).toEqual([]);
  });

  it("every video tool declares what it accepts and what it returns", () => {
    for (const tool of VIDEO_TOOLS) {
      expect(tool.accepts, tool.slug).toBeDefined();
      expect(tool.output, tool.slug).toBeDefined();
      expect(tool.engine).toBe("video");
    }
  });

  it("the recorders ask for the right device", () => {
    const modes = Object.fromEntries(VIDEO_TOOLS.filter((t) => t.record).map((t) => [t.slug, t.record]));
    expect(modes).toEqual({ "screen-recorder": "screen", "video-recorder": "camera" });
  });

  it("the tools that need two files accept more than one", () => {
    for (const slug of ["add-audio-to-video", "add-image-to-video", "merge-videos"]) {
      const tool = VIDEO_TOOLS.find((t) => t.slug === slug);
      expect(tool?.accepts?.multiple, slug).toBe(true);
    }
  });
});
