import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import PrimaryButton from '../components/PrimaryButton'
import ProgressBar from '../components/ProgressBar'
import SectionCard from '../components/SectionCard'
import StatusMessage from '../components/StatusMessage'
import WeeklyCleaningTaskRow from '../components/WeeklyCleaningTaskRow'
import WorkerSelector from '../components/WorkerSelector'
import {
  getWeeklyCleaningStats,
  loadWeeklyCleaningDraft,
  reconcileWeeklyCleaningWithTasks,
  saveWeeklyCleaningDraft,
} from '../lib/checklistStorage'
import { formatReadableDate, getCurrentWeekRange } from '../lib/date'
import {
  fetchWeeklyCleaningDraft,
  upsertWeeklyCleaningDraftToSupabase,
} from '../lib/supabaseWeeklyCleaning'
import { getWorkerName } from '../lib/workers'
import type {
  ChecklistTask,
  TaskSection,
  WeeklyCleaningDraft,
  Worker,
} from '../types'

type WeeklyCleaningPageProps = {
  isCloudSyncEnabled: boolean
  onCreateWorker: (name: string) => Promise<Worker | null> | Worker | null
  onHeaderStatusChange: (status: string) => void
  weeklyCleaningTasks: ChecklistTask[]
  workers: Worker[]
}

const sectionOrder: TaskSection[] = [
  'Bar',
  'Floor',
  'Stock',
  'Cleaning',
  'Admin',
  'Other',
]

function groupTasksBySection(tasks: ChecklistTask[]) {
  return sectionOrder
    .map((section) => ({
      section,
      tasks: tasks
        .filter((task) => task.section === section && task.isActive)
        .sort((firstTask, secondTask) => firstTask.sortOrder - secondTask.sortOrder),
    }))
    .filter((group) => group.tasks.length > 0)
}

function getItemState(draft: WeeklyCleaningDraft, taskId: string) {
  return draft.items.find((item) => item.taskId === taskId)
}

function updateDraft(
  draft: WeeklyCleaningDraft,
  updates: Partial<WeeklyCleaningDraft>,
) {
  const nextDraft = {
    ...draft,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  saveWeeklyCleaningDraft(nextDraft)

  return nextDraft
}

function getUpdatedTime(updatedAt: string) {
  return new Date(updatedAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function WeeklyCleaningPage({
  isCloudSyncEnabled,
  onCreateWorker,
  onHeaderStatusChange,
  weeklyCleaningTasks,
  workers,
}: WeeklyCleaningPageProps) {
  const [warning, setWarning] = useState('')
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
  const [pendingWorkerId, setPendingWorkerId] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState('Saved on this device')
  const [isLoadingDraft, setIsLoadingDraft] = useState(isCloudSyncEnabled)
  const [isDraftLoaded, setIsDraftLoaded] = useState(!isCloudSyncEnabled)
  const skipNextCloudSave = useRef(false)
  const draftRevision = useRef(0)
  const weekRange = useMemo(() => getCurrentWeekRange(), [])
  const taskGroups = useMemo(
    () => groupTasksBySection(weeklyCleaningTasks),
    [weeklyCleaningTasks],
  )
  const [draft, setDraft] = useState(() =>
    reconcileWeeklyCleaningWithTasks(
      loadWeeklyCleaningDraft(weekRange.startDate, weeklyCleaningTasks),
      weeklyCleaningTasks,
    ),
  )
  const stats = getWeeklyCleaningStats(draft)
  const readableWeekRange = `${formatReadableDate(
    weekRange.startDate,
  )} - ${formatReadableDate(weekRange.endDate)}`

  useEffect(() => {
    onHeaderStatusChange(
      `${syncStatus} · Last updated ${getUpdatedTime(draft.updatedAt)}`,
    )

    return () => onHeaderStatusChange('')
  }, [draft.updatedAt, onHeaderStatusChange, syncStatus])

  async function loadDraft() {
    const revisionAtLoadStart = draftRevision.current
    setIsLoadingDraft(isCloudSyncEnabled)
    setIsDraftLoaded(false)

    try {
      if (isCloudSyncEnabled) {
        const cloudDraft = await fetchWeeklyCleaningDraft(weekRange.startDate)

        if (cloudDraft) {
          const reconciledDraft = reconcileWeeklyCleaningWithTasks(
            cloudDraft,
            weeklyCleaningTasks,
          )

          if (revisionAtLoadStart === draftRevision.current) {
            skipNextCloudSave.current = true
            saveWeeklyCleaningDraft(reconciledDraft)
            setDraft(reconciledDraft)
            setSyncStatus('Synced')
          }
          return
        }
      }

      const localDraft = reconcileWeeklyCleaningWithTasks(
        loadWeeklyCleaningDraft(weekRange.startDate, weeklyCleaningTasks),
        weeklyCleaningTasks,
      )

      if (revisionAtLoadStart === draftRevision.current) {
        skipNextCloudSave.current = true
        saveWeeklyCleaningDraft(localDraft)
        setDraft(localDraft)
        setSyncStatus('Saved on this device')
      }
    } catch {
      const localDraft = reconcileWeeklyCleaningWithTasks(
        loadWeeklyCleaningDraft(weekRange.startDate, weeklyCleaningTasks),
        weeklyCleaningTasks,
      )

      if (revisionAtLoadStart === draftRevision.current) {
        skipNextCloudSave.current = true
        saveWeeklyCleaningDraft(localDraft)
        setDraft(localDraft)
        setSyncStatus('Saved locally. Cloud sync failed.')
      }
    } finally {
      setIsLoadingDraft(false)
      setIsDraftLoaded(true)
    }
  }

  useEffect(() => {
    let isCancelled = false

    async function loadDraftForEffect() {
      const revisionAtLoadStart = draftRevision.current
      setIsLoadingDraft(isCloudSyncEnabled)
      setIsDraftLoaded(false)

      try {
        if (isCloudSyncEnabled) {
          const cloudDraft = await fetchWeeklyCleaningDraft(weekRange.startDate)

          if (isCancelled) {
            return
          }

          if (cloudDraft) {
            const reconciledDraft = reconcileWeeklyCleaningWithTasks(
              cloudDraft,
              weeklyCleaningTasks,
            )

            if (revisionAtLoadStart === draftRevision.current) {
              skipNextCloudSave.current = true
              saveWeeklyCleaningDraft(reconciledDraft)
              setDraft(reconciledDraft)
              setSyncStatus('Synced')
            }
            return
          }
        }

        const localDraft = reconcileWeeklyCleaningWithTasks(
          loadWeeklyCleaningDraft(weekRange.startDate, weeklyCleaningTasks),
          weeklyCleaningTasks,
        )

        if (isCancelled) {
          return
        }

        if (revisionAtLoadStart === draftRevision.current) {
          skipNextCloudSave.current = true
          saveWeeklyCleaningDraft(localDraft)
          setDraft(localDraft)
          setSyncStatus('Saved on this device')
        }
      } catch {
        if (isCancelled) {
          return
        }

        const localDraft = reconcileWeeklyCleaningWithTasks(
          loadWeeklyCleaningDraft(weekRange.startDate, weeklyCleaningTasks),
          weeklyCleaningTasks,
        )

        if (revisionAtLoadStart === draftRevision.current) {
          skipNextCloudSave.current = true
          saveWeeklyCleaningDraft(localDraft)
          setDraft(localDraft)
          setSyncStatus('Saved locally. Cloud sync failed.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDraft(false)
          setIsDraftLoaded(true)
        }
      }
    }

    void loadDraftForEffect()

    return () => {
      isCancelled = true
    }
  }, [isCloudSyncEnabled, weekRange.startDate, weeklyCleaningTasks])

  useEffect(() => {
    if (!isCloudSyncEnabled || !isDraftLoaded) {
      return
    }

    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setSyncStatus('Syncing...')
      const savedDraft = await upsertWeeklyCleaningDraftToSupabase(draft)

      if (!savedDraft) {
        setSyncStatus('Saved locally. Cloud sync failed.')
        return
      }

      saveWeeklyCleaningDraft(savedDraft)
      setSyncStatus('Synced')
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [draft, isCloudSyncEnabled, isDraftLoaded])

  function handleSelectWorker(workerId: string | null) {
    setPendingWorkerId(workerId)
    setWarning('')

    if (workerId && pendingTaskId) {
      completeTask(pendingTaskId, workerId)
      setPendingTaskId(null)
      setPendingWorkerId(null)
    }
  }

  function completeTask(taskId: string, workerId: string) {
    setWarning('')
    setSyncStatus('Saved on this device')
    draftRevision.current += 1
    setDraft((currentDraft) =>
      updateDraft(currentDraft, {
        items: currentDraft.items.map((item) => {
          if (item.taskId !== taskId) {
            return item
          }

          return {
            taskId: item.taskId,
            isCompleted: true,
            workerId,
            completedAt: new Date().toISOString(),
          }
        }),
      }),
    )
  }

  function handleToggleTask(taskId: string) {
    const itemState = getItemState(draft, taskId)

    if (!itemState?.isCompleted) {
      setPendingTaskId(taskId)
      setPendingWorkerId(null)
      setWarning('Select who completed this cleaning task.')
      return
    }

    setWarning('')
    setSyncStatus('Saved on this device')
    draftRevision.current += 1
    setDraft((currentDraft) =>
      updateDraft(currentDraft, {
        items: currentDraft.items.map((item) => {
          if (item.taskId !== taskId) {
            return item
          }

          if (item.isCompleted) {
            return {
              taskId: item.taskId,
              isCompleted: false,
              workerId: null,
            }
          }

          return {
            taskId: item.taskId,
            isCompleted: true,
            workerId: item.workerId,
            completedAt: new Date().toISOString(),
          }
        }),
      }),
    )
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="text-left sm:[&>div]:mb-0 sm:[&>div]:text-left">
          <PageHeader title="Weekly Cleaning" description={readableWeekRange} />
        </div>
        <PrimaryButton
          className="inline-flex shrink-0 items-center justify-center gap-2"
          onClick={() => void loadDraft()}
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Refresh
        </PrimaryButton>
      </div>

      <SectionCard>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <h2 className="text-xl font-extrabold text-[#1F1D1A]">
              Cleaning progress
            </h2>
            <ProgressBar completed={stats.completed} total={stats.total} />
          </div>

          {isLoadingDraft ? (
            <StatusMessage>Loading weekly cleaning...</StatusMessage>
          ) : null}

          {warning ? (
            <StatusMessage tone="warning">{warning}</StatusMessage>
          ) : null}

          {taskGroups.map((group) => {
            const sectionCompleted = group.tasks.filter(
              (task) => getItemState(draft, task.id)?.isCompleted,
            ).length

            return (
              <section key={group.section}>
                <div className="mb-0.5 flex items-baseline justify-between gap-4">
                  <h3 className="text-lg font-extrabold leading-tight text-[#1F1D1A]">
                    {group.section}
                  </h3>
                  <p className="text-sm font-bold text-[#6F6A63]">
                    {sectionCompleted}/{group.tasks.length}
                  </p>
                </div>
                <ul>
                {group.tasks.map((task) => {
                  const itemState = getItemState(draft, task.id)
                  const completedByName = itemState?.workerId
                    ? getWorkerName(workers, itemState.workerId)
                    : null

                  return (
                    <li key={task.id}>
                      <WeeklyCleaningTaskRow
                        completedAt={itemState?.completedAt}
                        completedByName={completedByName}
                        isCompleted={itemState?.isCompleted ?? false}
                        onToggle={() => handleToggleTask(task.id)}
                        task={task}
                      />
                    </li>
                  )
                })}
                </ul>
              </section>
            )
          })}
        </div>
      </SectionCard>

      {pendingTaskId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1A]/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#FFFCF7] p-5 text-[#1F1D1A] shadow-[0_20px_60px_rgba(31,29,26,0.18)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold">
                  Who completed this?
                </h2>
                <p className="mt-1 text-base font-semibold text-[#6F6A63]">
                  Select a worker to mark the cleaning task complete.
                </p>
              </div>
              <button
                className="min-h-11 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] px-5 text-base font-bold text-[#1F1D1A] active:bg-[#EFE8DD] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]"
                onClick={() => {
                  setPendingTaskId(null)
                  setPendingWorkerId(null)
                  setWarning('')
                }}
                type="button"
              >
                Cancel
              </button>
            </div>

            <WorkerSelector
              onCreateWorker={onCreateWorker}
              onSelectWorker={handleSelectWorker}
              selectedWorkerId={pendingWorkerId}
              workers={workers}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default WeeklyCleaningPage
