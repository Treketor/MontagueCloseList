import { formatReadableDate } from '../lib/date'
import type { DailyChecklistDraft } from '../types'

type ChecklistSummaryCardProps = {
  checklist: DailyChecklistDraft
  completed: number
  isSubmitted: boolean
  onOpen: () => void
  total: number
  workerName: string
}

function ChecklistSummaryCard({
  checklist,
  completed,
  isSubmitted,
  onOpen,
  total,
  workerName,
}: ChecklistSummaryCardProps) {
  const submittedTime = checklist.submittedAt
    ? new Date(checklist.submittedAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  return (
    <button
      className="grid w-full gap-4 rounded-2xl border border-[#DED8CF] bg-[#FFFCF7] p-5 text-left active:bg-[#EFE8DD] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#F7F4EF]"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-extrabold leading-tight text-[#1F1D1A]">
            {formatReadableDate(checklist.barDate)}
          </p>
          <p className="mt-2 text-lg font-semibold leading-relaxed text-[#6F6A63]">
            {workerName}
          </p>
        </div>
        <p className="text-base font-extrabold text-[#1F1D1A]">
          {isSubmitted ? 'Submitted' : 'Incomplete'}
        </p>
      </div>

      <div>
        <p className="text-lg font-bold text-[#6F6A63]">
          {completed} of {total} complete
        </p>
        {submittedTime ? (
          <p className="mt-1 text-sm font-semibold text-[#6F6A63]">
            Submitted {submittedTime}
          </p>
        ) : null}
      </div>
    </button>
  )
}

export default ChecklistSummaryCard
