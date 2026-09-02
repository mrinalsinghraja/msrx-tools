"use client";

import { Mic, MonitorUp, Square, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/primitives";

/**
 * Records from the microphone, the camera or the screen straight into the
 * workspace's file list.
 *
 * A recording is only another way of getting a file in, so it becomes one and
 * everything downstream — the list, the options, the result tray — is unchanged.
 * The alternative was a second workspace that duplicated all of it for one
 * button.
 *
 * Nothing leaves the tab. MediaRecorder writes into memory here, and the same
 * engine that handles a dropped file handles this one. That is not a marketing
 * line for a screen recorder: every other one asks you to upload the contents
 * of your screen to a stranger's server, having just watched you type into it.
 */

export type RecorderMode = "mic" | "camera" | "screen";

interface ModeSpec {
  label: string;
  icon: typeof Mic;
  /** Containers to try, best first. */
  types: string[];
  fallback: string;
  /** What a recording of this kind is called on disk. */
  stem: string;
}

const MODES: Record<RecorderMode, ModeSpec> = {
  mic: {
    label: "Record from microphone",
    icon: Mic,
    types: ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"],
    fallback: "audio/webm",
    stem: "recording",
  },
  camera: {
    label: "Record from camera",
    icon: Video,
    types: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"],
    fallback: "video/webm",
    stem: "camera",
  },
  screen: {
    label: "Record the screen",
    icon: MonitorUp,
    types: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"],
    fallback: "video/webm",
    stem: "screen",
  },
};

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The first container this browser will actually write. */
function pickMimeType(candidates: string[]): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionFor(type: string): string {
  if (type.startsWith("audio/")) {
    return type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
  }
  return type.includes("mp4") ? "mp4" : "webm";
}

export function Recorder({ mode, onRecorded }: { mode: RecorderMode; onRecorded: (file: File) => void }) {
  const spec = MODES[mode];
  const Icon = spec.icon;

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const startedAt = useRef(0);

  const stopTracks = useCallback(() => {
    // Without this the browser's recording indicator stays lit, the camera
    // stays open, and a shared screen keeps being shared after the tool has
    // finished with it.
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
  }, []);

  useEffect(() => stopTracks, [stopTracks]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 200);
    return () => window.clearInterval(timer);
  }, [recording]);

  const openStream = useCallback(async (): Promise<MediaStream> => {
    if (mode === "screen") {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("This browser will not let a page record the screen. Chrome, Edge and Firefox on a desktop will; iOS will not, on any browser.");
      }
      // Screen audio is offered but not required: on several platforms the
      // browser simply will not capture it, and refusing the whole recording
      // over a missing sound track would be the wrong trade.
      return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser will not give a page access to the camera or microphone.");
    }
    return navigator.mediaDevices.getUserMedia(
      mode === "camera" ? { video: { width: { ideal: 1280 } }, audio: true } : { audio: true },
    );
  }, [mode]);

  const start = useCallback(async () => {
    setError(null);

    let stream: MediaStream;
    try {
      stream = await openStream();
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError"
          ? mode === "screen"
            ? "The screen share was cancelled or blocked. Press record again and choose a window, tab or screen."
            : "The browser blocked access. Allow it for this site in the address bar, then press record again."
          : name === "NotFoundError"
            ? "No camera or microphone was found on this device."
            : cause instanceof Error
              ? cause.message
              : "The recording could not be started. Another app may be holding the device.",
      );
      return;
    }

    streamRef.current = stream;
    if (previewRef.current && mode !== "mic") {
      previewRef.current.srcObject = stream;
      void previewRef.current.play().catch(() => undefined);
    }

    const mimeType = pickMimeType(spec.types);
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stopTracks();
      const type = recorder.mimeType || spec.fallback;
      const blob = new Blob(chunks, { type });
      if (blob.size === 0) {
        setError("Nothing was recorded. Check that the right device was selected.");
        return;
      }
      // The extension has to match what MediaRecorder actually wrote, because
      // the workspace gates on extension rather than on the reported type.
      const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "-");
      onRecorded(new File([blob], `${spec.stem}-${stamp}.${extensionFor(type)}`, { type }));
    };

    // Stopping the share from the browser's own bar has to end the recording
    // too, or the tool sits there timing a stream that is already dead.
    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      recorderRef.current = null;
      setRecording(false);
    });

    recorder.start();
    recorderRef.current = recorder;
    startedAt.current = Date.now();
    setElapsed(0);
    setRecording(true);
  }, [mode, onRecorded, openStream, spec, stopTracks]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      {mode !== "mic" ? (
        <video
          ref={previewRef}
          muted
          playsInline
          className={recording ? "mb-2 w-full max-w-md rounded-md border border-rule bg-black" : "hidden"}
        />
      ) : null}

      {recording ? (
        <Button variant="primary" onClick={stop}>
          <Square className="size-4" aria-hidden />
          Stop recording · {formatElapsed(elapsed)}
        </Button>
      ) : (
        <Button variant="primary" onClick={() => void start()}>
          <Icon className="size-4" aria-hidden />
          {spec.label}
        </Button>
      )}

      {recording ? (
        <p className="text-[13px] text-graphite-soft" role="status">
          Recording. Nothing is being sent anywhere — it stays in this tab until you save it.
        </p>
      ) : null}
      {error ? <p className="text-[13px] text-pen-rev">{error}</p> : null}
    </div>
  );
}
