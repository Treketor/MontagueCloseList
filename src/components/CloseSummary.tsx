import { CheckCircle2 } from 'lucide-react'
import { formatReadableDate } from '../lib/date'
import { getDailyChecklistStats, getItemStatus } from '../lib/checklistStats'
import type { ChecklistTask, DailyChecklistDraft } from '../types'

type CloseSummaryProps = {
  checklist: DailyChecklistDraft
  onClose?: () => void
  tasks: ChecklistTask[]
  workerName: string
}

function CloseSummary({ checklist, onClose, tasks, workerName }: CloseSummaryProps) {
  const stats = getDailyChecklistStats(checklist, tasks)
  const tasksById = new Map(tasks.map((task) => [task.id, task]))
  const skippedItems = checklist.items.filter(
    (item) => getItemStatus(item) === 'skipped',
  )

  return (
    <div className="grid gap-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1F1D1A] text-[#FFFCF7]">
          <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-2xl font-extrabold text-[#1F1D1A]">Close submitted</h2>
          <p className="mt-1 text-base font-semibold text-[#6F6A63]">
            {formatReadableDate(checklist.barDate)}
          </p>
        </div>
      </div>

      <dl className="grid gap-3 rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-bold text-[#6F6A63]">Worker</dt>
          <dd className="text-lg font-extrabold text-[#1F1D1A]">{workerName}</dd>
        </div>
        <div>
          <dt className="text-sm font-bold text-[#6F6A63]">Submitted</dt>
          <dd className="text-lg font-extrabold text-[#1F1D1A]">
            {checklist.submittedAt
              ? new Date(checklist.submittedAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : 'Not submitted'}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-bold text-[#6F6A63]">Completed</dt>
          <dd className="text-lg font-extrabold text-[#1F1D1A]">{stats.completed}</dd>
        </div>
        <div>
          <dt className="text-sm font-bold text-[#6F6A63]">Skipped</dt>
          <dd className="text-lg font-extrabold text-[#1F1D1A]">{stats.skipped}</dd>
        </div>
        <div>
          <dt className="text-sm font-bold text-[#6F6A63]">Pending</dt>
          <dd className="text-lg font-extrabold text-[#1F1D1A]">{stats.pending}</dd>
        </div>
        <div>
          <dt className="text-sm font-bold text-[#6F6A63]">Notes</dt>
          <dd className="text-lg font-extrabold text-[#1F1D1A]">
            {checklist.notes.trim() ? 'Notes added' : 'No notes'}
          </dd>
        </div>
      </dl>

      {skippedItems.length > 0 ? (
        <section className="grid gap-3">
          <h3 className="text-lg font-extrabold text-[#1F1D1A]">Skipped tasks</h3>
          <ul className="grid gap-2">
            {skippedItems.map((item) => (
              <li
                className="rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-3"
                key={item.taskId}
              >
                <p className="font-extrabold text-[#1F1D1A]">
                  {tasksById.get(item.taskId)?.title ?? 'Unknown task'}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#6F6A63]">
                  {item.skipReason}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {onClose ? (
        <button
          className="interactive-press min-h-12 rounded-xl border border-[#1F1D1A] bg-[#1F1D1A] px-5 text-base font-extrabold text-[#FFFCF7]"
          onClick={onClose}
          type="button"
        >
          Done
        </button>
      ) : null}
    </div>
  )
}

export default CloseSummary
