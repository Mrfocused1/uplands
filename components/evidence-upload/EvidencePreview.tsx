"use client";

type EvidencePreviewProps = {
  dataUrl: string;
  label: string;
  onReplace: () => void;
  onRemove: () => void;
};

export function EvidencePreview({ dataUrl, label, onReplace, onRemove }: EvidencePreviewProps) {
  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={label}
        className="max-h-80 w-full rounded border border-zinc-200 bg-white object-contain"
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReplace}
          className="min-h-12 border border-zinc-300 bg-white px-5 font-bold text-uplands-charcoal"
        >
          Replace photo
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="min-h-12 border border-zinc-300 bg-white px-5 font-bold text-uplands-charcoal"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
