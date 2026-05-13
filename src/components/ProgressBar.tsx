type ProgressBarProps = {
  completed: number
  showText?: boolean
  total: number
}

function ProgressBar({ completed, showText = true, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const remaining = Math.max(total - completed, 0)

  return (
    <div className="grid gap-2">
      {showText ? (
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-base font-extrabold text-[#1F1D1A]">
            {completed} / {total} complete
          </p>
          <p className="text-sm font-semibold text-[#6F6A63]">
            {remaining} left
          </p>
        </div>
      ) : null}
      <div
        aria-label={`${completed} of ${total} complete`}
        aria-valuemax={total}
        aria-valuemin={0}
        aria-valuenow={completed}
        className="h-2.5 overflow-hidden rounded-full bg-[#EFE8DD]"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-[#1F1D1A] transition-[width] duration-200 ease-out motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
