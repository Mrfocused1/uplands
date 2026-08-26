type ModalActionsProps = {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
};

export function ModalActions({ onCancel, onSave, saveLabel = "Save" }: ModalActionsProps) {
  return (
    <div className="no-print sticky bottom-0 z-20 -mx-5 mt-10 border-t border-zinc-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 px-3 text-base font-bold text-zinc-700 transition focus:outline-none focus:ring-2 focus:ring-uplands-magenta"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="min-h-12 bg-uplands-magenta px-5 text-base font-bold text-white transition hover:bg-[#930076] focus:outline-none focus:ring-2 focus:ring-uplands-magenta focus:ring-offset-2"
        >
          {saveLabel} →
        </button>
      </div>
    </div>
  );
}
