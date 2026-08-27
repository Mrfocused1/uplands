type NavigationControlsProps = {
  canGoBack: boolean;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  showSkip?: boolean;
};

export function NavigationControls({
  canGoBack,
  onBack,
  onSkip,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  showSkip = true,
}: NavigationControlsProps) {
  return (
    <div className="no-print sticky bottom-0 z-20 -mx-5 mt-10 border-t border-zinc-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          className="min-h-12 px-3 text-base font-bold text-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-35"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={!showSkip}
          aria-hidden={!showSkip}
          tabIndex={showSkip ? 0 : -1}
          className={`min-h-12 px-5 text-base font-bold text-uplands-magenta underline-offset-4 transition hover:underline focus:outline-none focus:ring-2 focus:ring-uplands-magenta focus:ring-offset-2 ${
            showSkip ? "" : "invisible pointer-events-none"
          }`}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled}
          className="min-h-12 bg-uplands-magenta px-5 text-base font-bold text-white transition hover:bg-[#930076] focus:outline-none focus:ring-2 focus:ring-uplands-magenta focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {continueLabel} →
        </button>
      </div>
    </div>
  );
}
