import { useEffect, useMemo, useState } from 'react'
import PrimaryButton from '../PrimaryButton'
import StatusMessage from '../StatusMessage'
import ChecklistDetailModal from '../ChecklistDetailModal'
import {
  getDailyChecklistsForRange,
  reconcileDailyChecklistWithTasks,
} from '../../lib/checklistStorage'
import { getDailyChecklistStats } from '../../lib/checklistStats'
import { formatReadableDate, getCurrentWeekRange } from '../../lib/date'
import { fetchClosingChecklistsForRangeFromSupabase } from '../../lib/supabaseDailyChecklists'
import { getWorkerName } from '../../lib/workers'
import type { ChecklistTask, DailyChecklistDraft, Worker } from '../../types'

type Filter = 'attention' | 'submitted' | 'all'

type ManagerReviewPanelProps = {
  isCloudSyncEnabled: boolean
  tasks: ChecklistTask[]
  workers: Worker[]
}

function parseDateString(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function addDays(dateString: string, days: number) {
  const date = parseDateString(dateString)
  date.setDate(date.getDate() + days)

  return toDateString(date)
}

function getStatus(checklist: DailyChecklistDraft, tasks: ChecklistTask[]) {
  if (checklist.submittedAt) {
    return 'Submitted'
  }

  const stats = getDailyChecklistStats(checklist, tasks)

  return stats.resolved > 0 || checklist.workerId || checklist.notes.trim()
    ? 'In progress'
    : 'Incomplete'
}

function needsAttention(checklist: DailyChecklistDraft, tasks: ChecklistTask[]) {
  const stats = getDailyChecklistStats(checklist, tasks)

  return (
    !checklist.submittedAt ||
    stats.skipped > 0 ||
    stats.pending > 0 ||
    Boolean(checklist.notes.trim()) ||
    stats.criticalIssues > 0
  )
}

function ManagerReviewPanel({
  isCloudSyncEnabled,
  tasks,
  workers,
}: ManagerReviewPanelProps) {
  const [filter, setFilter] = useState<Filter>('attention')
  const [checklists, setChecklists] = useState<DailyChecklistDraft[]>([])
  const [selectedChecklist, setSelectedChecklist] =
    useState<DailyChecklistDraft | null>(null)
  const [warning, setWarning] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const currentWeek = useMemo(() => getCurrentWeekRange(), [])
  const startDate = addDays(currentWeek.startDate, -21)
  const endDate = currentWeek.endDate
  const selectedWorkerName = getWorkerName(workers, selectedChecklist?.workerId)

  async function loadReview() {
    setIsLoading(isCloudSyncEnabled)
    setWarning('')

    try {
      const loadedChecklists = isCloudSyncEnabled
        ? await fetchClosingChecklistsForRangeFromSupabase(startDate, endDate)
        : getDailyChecklistsForRange(startDate, endDate)

      setChecklists(
        loadedChecklists.map((checklist) =>
          reconcileDailyChecklistWithTasks(checklist, tasks),
        ),
      )
    } catch {
      setWarning('Showing local review data. Cloud sync failed.')
      setChecklists(
        getDailyChecklistsForRange(startDate, endDate).map((checklist) =>
          reconcileDailyChecklistWithTasks(checklist, tasks),
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadReview()
  }, [isCloudSyncEnabled, startDate, endDate, tasks])

  const visibleChecklists = checklists.filter((checklist) => {
    if (filter === 'submitted') {
      return Boolean(checklist.submittedAt)
    }

    if (filter === 'attention') {
      return needsAttention(checklist, tasks)
    }

    return true
  })

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:flex sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            ['attention', 'Needs attention'],
            ['submitted', 'Submitted'],
            ['all', 'All'],
          ].map(([value, label]) => (
            <button
              className={[
                'interactive-press min-h-11 rounded-xl border px-4 text-base font-extrabold',
                filter === value
                  ? 'border-[#1F1D1A] bg-[#1F1D1A] text-[#FFFCF7]'
                  : 'border-[#DED8CF] bg-[#FFFCF7] text-[#1F1D1A]',
              ].join(' ')}
              key={value}
              onClick={() => setFilter(value as Filter)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <PrimaryButton onClick={() => void loadReview()}>Refresh</PrimaryButton>
      </div>

      {isLoading ? <StatusMessage>Loading review...</StatusMessage> : null}
      {warning ? <StatusMessage tone="warning">{warning}</StatusMessage> : null}

      {visibleChecklists.length === 0 ? (
        <StatusMessage>No closes match this filter.</StatusMessage>
      ) : null}

      <ul className="grid gap-3">
        {visibleChecklists.map((checklist) => {
          const stats = getDailyChecklistStats(checklist, tasks)
          const status = getStatus(checklist, tasks)
          const workerName = getWorkerName(workers, checklist.workerId)

          return (
            <li
              className="rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4"
              key={checklist.barDate}
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-lg font-extrabold text-[#1F1D1A]">
                    {formatReadableDate(checklist.barDate)}
                  </p>
                  <p className="text-base font-semibold text-[#6F6A63]">
                    {workerName} · {status}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#6F6A63]">
                    {stats.completed} completed · {stats.skipped} skipped · {stats.pending} pending
                    {checklist.notes.trim() ? ' · Notes' : ''}
                    {stats.criticalIssues > 0 ? ' · Important issue' : ''}
                  </p>
                </div>
                <PrimaryButton onClick={() => setSelectedChecklist(checklist)}>
                  View details
                </PrimaryButton>
              </div>
            </li>
          )
        })}
      </ul>

      <ChecklistDetailModal
        checklist={selectedChecklist}
        onClose={() => setSelectedChecklist(null)}
        tasks={tasks}
        workerName={selectedWorkerName}
      />
    </div>
  )
}

export default ManagerReviewPanel
