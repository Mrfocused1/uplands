type ProgressBarProps = {
  progress: number;
  current: number;
  total: number;
};

export function ProgressBar({ progress, current, total }: ProgressBarProps) {
  return (
    <div className="no-print mt-8">
      <div className="mb-3 flex items-center justify-between text-sm text-zinc-600">
        <span>
          Question {current} of {total}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden bg-zinc-200" aria-label={`Progress ${progress}%`}>
        <div className="h-full bg-uplands-magenta transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
