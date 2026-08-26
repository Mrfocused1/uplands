"use client";

import { useRef, useState } from "react";

type DocumentUploadProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
};

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read image"));
    image.src = src;
  });
}

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function DocumentUpload({ value, onChange, label }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");

    try {
      onChange(await fileToCompressedDataUrl(file));
    } catch {
      setError("That image could not be read. Please try another photo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label={label}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {value ? (
        <div className="space-y-4">
          <img
            src={value}
            alt={label}
            className="max-h-80 w-full rounded border border-zinc-200 bg-white object-contain"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="min-h-12 border border-zinc-300 bg-white px-4 font-bold text-uplands-charcoal disabled:cursor-not-allowed disabled:opacity-60"
            >
              Replace photo
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="min-h-12 border border-zinc-300 bg-white px-4 font-bold text-uplands-charcoal"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex min-h-32 w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-300 bg-white p-6 text-center transition hover:border-uplands-magenta disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="font-bold text-uplands-charcoal">{busy ? "Processing photo…" : "Take or upload a photo"}</span>
        </button>
      )}

      {error && (
        <p className="mt-4 border-l-4 border-red-600 bg-white p-4 text-sm font-bold text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
