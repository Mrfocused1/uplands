"use client";

import { useRef, useState } from "react";
import type { EvidenceType } from "@/types/evidence";
import { CAMERA_GUIDES } from "@/config/cameraGuides";
import { fileToCompressedDataUrl } from "@/lib/evidence/compressImage";
import { EvidenceSourceChooser } from "./EvidenceSourceChooser";
import { DocumentCamera } from "./DocumentCamera";
import { CapturedPhotoPreview } from "./CapturedPhotoPreview";
import { EvidencePreview } from "./EvidencePreview";

type Mode = "preview" | "chooser" | "camera" | "captured";

type EvidenceUploadProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
  docType?: EvidenceType;
};

const FILE_QUALITY = 0.9;

export function EvidenceUpload({ value, onChange, label, docType }: EvidenceUploadProps) {
  const [mode, setMode] = useState<Mode>(() => (value ? "preview" : "chooser"));
  const [captured, setCaptured] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const guide = docType ? CAMERA_GUIDES[docType] : undefined;

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await fileToCompressedDataUrl(file, FILE_QUALITY));
      setMode("preview");
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
        className="hidden"
        aria-label={label}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {mode === "preview" && value && (
        <EvidencePreview
          dataUrl={value}
          label={label}
          onReplace={() => setMode("chooser")}
          onRemove={() => {
            onChange(null);
            setMode("chooser");
          }}
        />
      )}

      {mode === "chooser" && (
        <EvidenceSourceChooser
          onChoose={(source) => {
            if (source === "camera") {
              setError("");
              setMode("camera");
            } else {
              inputRef.current?.click();
            }
          }}
        />
      )}

      {mode === "camera" && (
        <DocumentCamera
          guide={guide}
          onCapture={(dataUrl) => {
            setCaptured(dataUrl);
            setMode("captured");
          }}
          onCancel={() => setMode("chooser")}
          onError={(message) => {
            setError(message);
            setMode("chooser");
          }}
        />
      )}

      {mode === "captured" && captured && (
        <CapturedPhotoPreview
          dataUrl={captured}
          onRetake={() => {
            setCaptured(null);
            setMode("camera");
          }}
          onUse={() => {
            onChange(captured);
            setMode("preview");
          }}
        />
      )}

      {busy && <p className="mt-3 text-sm font-bold text-zinc-600">Processing photo…</p>}

      {error && (
        <p className="mt-4 border-l-4 border-red-600 bg-white p-4 text-sm font-bold text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
