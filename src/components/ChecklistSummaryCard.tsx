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
  return (
    <button
      className="grid w-full gap-4 rounded-md border border-neutral-800 p-5 text-left active:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold leading-tight">
            {formatReadableDate(checklist.barDate)}
          </p>
          <p className="mt-2 text-xl leading-relaxed text-neutral-300">
            {workerName}
          </p>
        </div>
        <p className="text-xl font-semibold text-white">
          {isSubmitted ? 'Submitted' : 'Incomplete'}
        </p>
      </div>

      <div>
        <p className="text-xl font-medium text-neutral-300">
          {completed} of {total} complete
        </p>
        <p className="mt-1 text-lg text-neutral-500">{checklist.barDate}</p>
      </div>
    </button>
  )
}

export default ChecklistSummaryCard
