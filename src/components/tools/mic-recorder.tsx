"use client";

import { Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/primitives";

/**
 * Records from the microphone straight into the workspace's file list.
 *
 * A recording is only another way of getting a file in, so it becomes one and
 * everything downstream — the list, the options, the result tray — is unchanged.
 * The alternative was a second workspace that duplicated all of it for one
 * button.
 *
 * The audio never leaves the tab: MediaRecorder writes into memory here, and
 * the same engine that handles a dropped file handles this one.
 */

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The first container this browser will actually write. */
function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  if (typeof MediaRecorder === "undefined") return undefined;
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function MicRecorder({ onRecorded }: { onRecorded: (file: File) => void }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);

  const stopTracks = useCallback(() => {
    // Without this the browser's recording indicator stays lit and the
    // microphone stays open after the tool is finished with it.
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopTracks, [stopTracks]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 200);
    return () => window.clearInterval(timer);
  }, [recording]);

  const start = useCallback(async () => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser will not give a page access to a microphone. Chrome, Edge, Firefox and Safari all will.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError"
          ? "The browser blocked access to the microphone. Allow it for this site in the address bar, then press record again."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : "The microphone could not be opened. Another app may be holding it.",
      );
      return;
    }

    streamRef.current = stream;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stopTracks();
      const type = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type });
      if (blob.size === 0) {
        setError("Nothing was recorded. Check that the right microphone is selected.");
        return;
      }
      // The extension has to match what MediaRecorder actually wrote, because
      // the workspace gates on extension rather than on the reported type.
      const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
      const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "-");
      onRecorded(new File([blob], `recording-${stamp}.${extension}`, { type }));
    };

    recorder.start();
    recorderRef.current = recorder;
    startedAt.current = Date.now();
    setElapsed(0);
    setRecording(true);
  }, [onRecorded, stopTracks]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      {recording ? (
        <Button variant="primary" onClick={stop}>
          <Square className="size-4" aria-hidden />
          Stop recording · {formatElapsed(elapsed)}
        </Button>
      ) : (
        <Button variant="primary" onClick={() => void start()}>
          <Mic className="size-4" aria-hidden />
          Record from microphone
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
