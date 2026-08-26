"use client";

type CapturedPhotoPreviewProps = {
  dataUrl: string;
  onRetake: () => void;
  onUse: () => void;
};

export function CapturedPhotoPreview({ dataUrl, onRetake, onUse }: CapturedPhotoPreviewProps) {
  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="Captured photo"
        className="max-h-80 w-full rounded border border-zinc-200 bg-white object-contain"
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onUse}
          className="min-h-12 bg-uplands-magenta px-5 font-bold text-white"
        >
          Use this photo
        </button>
        <button
          type="button"
          onClick={onRetake}
          className="min-h-12 border border-zinc-300 bg-white px-5 font-bold text-uplands-charcoal"
        >
          Retake
        </button>
      </div>
    </div>
  );
}
