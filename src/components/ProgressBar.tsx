type ProgressBarProps = {
  completed: number
  total: number
}

function ProgressBar({ completed, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xl font-semibold">
          {completed} of {total} complete
        </p>
        <p className="text-lg text-neutral-400">{percentage}%</p>
      </div>
      <div
        aria-label={`${completed} of ${total} complete`}
        aria-valuemax={total}
        aria-valuemin={0}
        aria-valuenow={completed}
        className="h-4 overflow-hidden rounded-sm border border-neutral-700 bg-black"
        role="progressbar"
      >
        <div
          className="h-full bg-white"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
