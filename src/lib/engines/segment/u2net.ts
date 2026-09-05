import type { InferenceSession } from "onnxruntime-web";

import { ToolError } from "../types";

/**
 * Loading U²-Net, once per tab and once per browser.
 *
 * The model is served from this origin rather than a CDN, for the same reason
 * every other asset here is: a background remover whose selling point is that
 * the photo never leaves the device should not be announcing to a third party
 * that someone is about to remove a background.
 */

/** Served from `public/models`, with an immutable cache header. */
const MODEL_URL = "/models/u2netp.onnx";

/** Where the copy step puts onnxruntime's WebAssembly. */
const WASM_PATH = "/vendor/onnxruntime/";

/** Recorded so a corrupted or substituted download is noticed rather than guessed at. */
export const MODEL_BYTES = 4_574_861;

let sessionPromise: Promise<InferenceSession> | null = null;

export type LoadProgress = (fraction: number, label: string) => void;

/**
 * Fetch with a real progress fraction.
 *
 * `response.blob()` would be one line, but the first run of this tool is a
 * 4.4 MB download on whatever connection the visitor has, and a progress bar
 * that sits at zero and then jumps to done is indistinguishable from a hang.
 */
async function fetchModel(onProgress?: LoadProgress): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(MODEL_URL, { cache: "force-cache" });
  } catch {
    throw new ToolError(
      "The background-removal model could not be downloaded. Check your connection and try again — it is only fetched once.",
    );
  }
  if (!response.ok) {
    throw new ToolError(`The background-removal model is missing from this site (${response.status}).`);
  }

  const declared = Number(response.headers.get("content-length")) || MODEL_BYTES;

  if (!response.body) return new Uint8Array(await response.arrayBuffer());

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(Math.min(0.95, received / declared), "Downloading the model, once");
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/**
 * The session, created on first use and then reused.
 *
 * The promise is cached rather than the session, so two files dropped at once
 * share one download instead of racing to start two. A failure clears the cache
 * so a retry is actually a retry.
 */
export function loadSession(onProgress?: LoadProgress): Promise<InferenceSession> {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    // The wasm-only entry, deliberately. The default bundle is the "all" build,
    // which asks for ort-wasm-simd-threaded.jsep.wasm — the WebGPU-capable
    // binary, 27 MB against 13 MB. Nothing here uses the WebGPU provider, so
    // that would be double the download for no gain. Getting this wrong is a
    // 404 on a file nobody copied, surfacing as a bare "Failed to load resource".
    const ort = await import("onnxruntime-web/wasm");

    ort.env.wasm.wasmPaths = WASM_PATH;
    // Threads need SharedArrayBuffer, which needs cross-origin isolation, which
    // would mean COOP/COEP headers across the whole site and would break every
    // third-party embed on it. One thread is the price of not doing that.
    ort.env.wasm.numThreads = 1;
    ort.env.logLevel = "error";

    const bytes = await fetchModel(onProgress);
    onProgress?.(0.97, "Starting the model");

    try {
      return await ort.InferenceSession.create(bytes, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
    } catch {
      throw new ToolError(
        "The background-removal model could not be started in this browser. A recent Chrome, Edge, Firefox or Safari can run it.",
      );
    }
  })();

  sessionPromise.catch(() => {
    sessionPromise = null;
  });

  return sessionPromise;
}

/** Test seam: forget the cached session so a test can load a fresh one. */
export function resetSession() {
  sessionPromise = null;
}
