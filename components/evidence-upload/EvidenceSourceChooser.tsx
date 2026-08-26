"use client";

type EvidenceSourceChooserProps = {
  onChoose: (source: "camera" | "file") => void;
};

export function EvidenceSourceChooser({ onChoose }: EvidenceSourceChooserProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChoose("camera")}
        className="flex min-h-28 flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-300 bg-white p-5 text-center transition hover:border-uplands-magenta"
      >
        <span className="text-2xl" aria-hidden>📷</span>
        <span className="font-bold text-uplands-charcoal">Take photo</span>
        <span className="text-sm text-zinc-500">Use your camera</span>
      </button>
      <button
        type="button"
        onClick={() => onChoose("file")}
        className="flex min-h-28 flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-300 bg-white p-5 text-center transition hover:border-uplands-magenta"
      >
        <span className="text-2xl" aria-hidden>🖼️</span>
        <span className="font-bold text-uplands-charcoal">Upload file</span>
        <span className="text-sm text-zinc-500">Choose from device</span>
      </button>
    </div>
  );
}
