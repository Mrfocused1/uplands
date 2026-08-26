"use client";

import { useEffect, useRef, useState } from "react";
import type { CameraGuideConfig } from "@/config/cameraGuides";
import { drawToDataUrl } from "@/lib/evidence/compressImage";
import { CameraGuide } from "./CameraGuide";

type DocumentCameraProps = {
  guide?: CameraGuideConfig;
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

const CAPTURE_QUALITY = 0.92;

export function DocumentCamera({ guide, onCapture, onCancel, onError }: DocumentCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  const onCaptureRef = useRef(onCapture);
  const onCancelRef = useRef(onCancel);
  const onErrorRef = useRef(onError);
  onCaptureRef.current = onCapture;
  onCancelRef.current = onCancel;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        if (!cancelled) {
          onErrorRef.current("Could not access the camera. Check permissions, or choose Upload file instead.");
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    try {
      onCaptureRef.current(drawToDataUrl(video, CAPTURE_QUALITY));
    } catch {
      onErrorRef.current("Could not capture the photo. Please try again.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative h-[62vh] min-h-[320px] overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        {guide && <CameraGuide aspectRatio={guide.aspectRatio} />}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-4">
          {guide && (
            <p className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
              {guide.label} · {guide.hint}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancelRef.current}
          className="min-h-11 border border-zinc-300 bg-white px-4 font-bold text-uplands-charcoal"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={capture}
          disabled={!ready}
          className="flex min-h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-uplands-magenta shadow-lg disabled:opacity-50"
          aria-label="Capture photo"
        >
          <span className="block h-9 w-9 rounded-full bg-white/90" />
        </button>
        <button
          type="button"
          onClick={onCancelRef.current}
          className="min-h-11 border border-zinc-300 bg-white px-4 font-bold text-uplands-charcoal"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
