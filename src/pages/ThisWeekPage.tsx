import { useCallback, useEffect, useMemo, useState } from 'react'
import ChecklistDetailModal from '../components/ChecklistDetailModal'
import ChecklistSummaryCard from '../components/ChecklistSummaryCard'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import PrimaryButton from '../components/PrimaryButton'
import StatusMessage from '../components/StatusMessage'
import {
  getDailyChecklistCompletionStats,
  getDailyChecklistsForRange,
  reconcileDailyChecklistWithTasks,
  saveDailyChecklist,
} from '../lib/checklistStorage'
import { formatReadableDate, getCurrentWeekRange } from '../lib/date'
import { fetchClosingChecklistsForRangeFromSupabase } from '../lib/supabaseDailyChecklists'
import { getWorkerName } from '../lib/workers'
import type { ChecklistTask, DailyChecklistDraft, Worker } from '../types'

type ThisWeekPageProps = {
  isCloudSyncEnabled: boolean
  tasks: ChecklistTask[]
  workers: Worker[]
}

function ThisWeekPage({
  isCloudSyncEnabled,
  tasks,
  workers,
}: ThisWeekPageProps) {
  const [selectedChecklist, setSelectedChecklist] =
    useState<DailyChecklistDraft | null>(null)
  const [checklists, setChecklists] = useState<DailyChecklistDraft[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [warning, setWarning] = useState('')
  const weekRange = useMemo(() => getCurrentWeekRange(), [])
  const readableWeekRange = `${formatReadableDate(
    weekRange.startDate,
  )} - ${formatReadableDate(weekRange.endDate)}`
  const selectedWorkerName = getWorkerName(
    workers,
    selectedChecklist?.workerId,
  )

  const loadHistory = useCallback(async () => {
    setIsLoading(isCloudSyncEnabled)
    setWarning('')

    try {
      if (isCloudSyncEnabled) {
        const cloudChecklists = await fetchClosingChecklistsForRangeFromSupabase(
          weekRange.startDate,
          weekRange.endDate,
        )
        const reconciledChecklists = cloudChecklists.map((checklist) =>
          reconcileDailyChecklistWithTasks(checklist, tasks),
        )

        for (const checklist of reconciledChecklists) {
          saveDailyChecklist(checklist)
        }

        setChecklists(reconciledChecklists)
        return
      }

      setChecklists(
        getDailyChecklistsForRange(weekRange.startDate, weekRange.endDate).map(
          (checklist) => reconcileDailyChecklistWithTasks(checklist, tasks),
        ),
      )
    } catch {
      setWarning('Showing local history. Cloud sync failed.')
      setChecklists(
        getDailyChecklistsForRange(weekRange.startDate, weekRange.endDate).map(
          (checklist) => reconcileDailyChecklistWithTasks(checklist, tasks),
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }, [isCloudSyncEnabled, tasks, weekRange.endDate, weekRange.startDate])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHistory()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadHistory])

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Previous closes" description={readableWeekRange} />
        <PrimaryButton className="mt-1 shrink-0" onClick={() => void loadHistory()}>
          Refresh
        </PrimaryButton>
      </div>

      {isLoading ? (
        <StatusMessage>Loading history...</StatusMessage>
      ) : null}
      {warning ? (
        <StatusMessage tone="warning">{warning}</StatusMessage>
      ) : null}

      {checklists.length === 0 ? (
        <EmptyState message="No closing checklists saved for this week." />
      ) : (
        <div className="grid gap-3">
          {checklists.map((checklist) => {
            const stats = getDailyChecklistCompletionStats(checklist)
            const workerName = getWorkerName(workers, checklist.workerId)

            return (
              <ChecklistSummaryCard
                checklist={checklist}
                completed={stats.completed}
                isSubmitted={Boolean(checklist.submittedAt)}
                key={checklist.barDate}
                onOpen={() => setSelectedChecklist(checklist)}
                total={stats.total}
                workerName={workerName}
              />
            )
          })}
        </div>
      )}

      <ChecklistDetailModal
        checklist={selectedChecklist}
        onClose={() => setSelectedChecklist(null)}
        tasks={tasks}
        workerName={selectedWorkerName}
      />
    </div>
  )
}

export default ThisWeekPage
