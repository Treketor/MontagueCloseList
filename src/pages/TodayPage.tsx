import { useEffect, useMemo, useRef, useState } from 'react'
import ChecklistTaskRow from '../components/ChecklistTaskRow'
import HomeScreenHint from '../components/HomeScreenHint'
import ProgressBar from '../components/ProgressBar'
import SectionCard from '../components/SectionCard'
import StatusMessage from '../components/StatusMessage'
import WorkerSelector from '../components/WorkerSelector'
import {
  loadDailyChecklist,
  reconcileDailyChecklistWithTasks,
  saveDailyChecklist,
} from '../lib/checklistStorage'
import {
  fetchClosingChecklistByBarDate,
  upsertClosingChecklistToSupabase,
} from '../lib/supabaseDailyChecklists'
import type {
  ChecklistTask,
  DailyChecklistDraft,
  TaskSection,
  Worker,
} from '../types'

type TodayPageProps = {
  barDate: string
  dailyClosingTasks: ChecklistTask[]
  isCloudSyncEnabled: boolean
  onCreateWorker: (name: string) => Promise<Worker | null> | Worker | null
  onHeaderStatusChange: (status: string) => void
  onSelectWorker: (workerId: string | null) => void
  selectedWorkerId: string
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

function getItemState(draft: DailyChecklistDraft, taskId: string) {
  return draft.items.find((item) => item.taskId === taskId)
}

function getUpdatedTime(updatedAt: string) {
  return new Date(updatedAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function updateDraft(
  draft: DailyChecklistDraft,
  updates: Partial<DailyChecklistDraft>,
  options: { clearSubmitted?: boolean } = {},
) {
  const nextDraft = {
    ...draft,
    ...updates,
    submittedAt: options.clearSubmitted ? null : updates.submittedAt ?? draft.submittedAt,
    updatedAt: new Date().toISOString(),
  }

  saveDailyChecklist(nextDraft)

  return nextDraft
}

function TodayPage({
  barDate,
  dailyClosingTasks,
  isCloudSyncEnabled,
  onCreateWorker,
  onHeaderStatusChange,
  onSelectWorker,
  selectedWorkerId,
  workers,
}: TodayPageProps) {
  const selectedWorker = workers.find((worker) => worker.id === selectedWorkerId)
  const taskGroups = useMemo(
    () => groupTasksBySection(dailyClosingTasks),
    [dailyClosingTasks],
  )
  const [warning, setWarning] = useState('')
  const [syncStatus, setSyncStatus] = useState('Saved on this device')
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(isCloudSyncEnabled)
  const [isChecklistLoaded, setIsChecklistLoaded] = useState(!isCloudSyncEnabled)
  const skipNextCloudSave = useRef(false)
  const draftRevision = useRef(0)
  const [draft, setDraft] = useState(() => {
    const loadedDraft = reconcileDailyChecklistWithTasks(
      loadDailyChecklist(barDate, dailyClosingTasks),
      dailyClosingTasks,
    )

    if (loadedDraft.workerId === (selectedWorkerId || null)) {
      return loadedDraft
    }

    const nextDraft = {
      ...loadedDraft,
      workerId: selectedWorkerId || null,
      updatedAt: new Date().toISOString(),
    }

    saveDailyChecklist(nextDraft)

    return nextDraft
  })
  const completedCount = draft.items.filter((item) => item.isCompleted).length
  const totalCount = draft.items.length
  const remainingCount = Math.max(totalCount - completedCount, 0)

  useEffect(() => {
    onHeaderStatusChange(
      `${syncStatus} · Last updated ${getUpdatedTime(draft.updatedAt)}`,
    )

    return () => onHeaderStatusChange('')
  }, [draft.updatedAt, onHeaderStatusChange, syncStatus])

  useEffect(() => {
    let isCancelled = false

    async function loadDraft() {
      const revisionAtLoadStart = draftRevision.current
      setIsLoadingChecklist(isCloudSyncEnabled)
      setIsChecklistLoaded(false)

      try {
        if (isCloudSyncEnabled) {
          const cloudDraft = await fetchClosingChecklistByBarDate(barDate)

          if (isCancelled) {
            return
          }

          if (cloudDraft) {
            const reconciledDraft = reconcileDailyChecklistWithTasks(
              cloudDraft,
              dailyClosingTasks,
            )

            if (revisionAtLoadStart === draftRevision.current) {
              skipNextCloudSave.current = true
              saveDailyChecklist(reconciledDraft)
              setDraft(reconciledDraft)
              setSyncStatus('Synced')
            }
            return
          }
        }

        const localDraft = reconcileDailyChecklistWithTasks(
          loadDailyChecklist(barDate, dailyClosingTasks),
          dailyClosingTasks,
        )

        if (isCancelled) {
          return
        }

        if (revisionAtLoadStart === draftRevision.current) {
          skipNextCloudSave.current = true
          saveDailyChecklist(localDraft)
          setDraft(localDraft)
          setSyncStatus('Saved on this device')
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingChecklist(false)
          setIsChecklistLoaded(true)
        }
      }
    }

    void loadDraft().catch(() => {
      if (isCancelled) {
        return
      }

      const localDraft = reconcileDailyChecklistWithTasks(
        loadDailyChecklist(barDate, dailyClosingTasks),
        dailyClosingTasks,
      )

      skipNextCloudSave.current = true
      saveDailyChecklist(localDraft)
      setDraft(localDraft)
      setSyncStatus('Saved locally. Cloud sync failed.')
      setIsLoadingChecklist(false)
      setIsChecklistLoaded(true)
    })

    return () => {
      isCancelled = true
    }
  }, [barDate, dailyClosingTasks, isCloudSyncEnabled])

  useEffect(() => {
    if (!isCloudSyncEnabled || !isChecklistLoaded) {
      return
    }

    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setSyncStatus('Syncing...')
      const savedDraft = await upsertClosingChecklistToSupabase(draft)

      if (!savedDraft) {
        setSyncStatus('Saved locally. Cloud sync failed.')
        return
      }

      saveDailyChecklist(savedDraft)
      setSyncStatus('Synced')
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [draft, isChecklistLoaded, isCloudSyncEnabled])

  function handleSelectWorker(workerId: string | null) {
    onSelectWorker(workerId)
    setWarning('')
    setSyncStatus('Saved on this device')
    draftRevision.current += 1
    setDraft((currentDraft) =>
      updateDraft(currentDraft, { workerId: workerId || null }, { clearSubmitted: true }),
    )
  }

  function handleToggleTask(taskId: string) {
    if (!selectedWorkerId) {
      setWarning('Select a worker before checking off tasks.')
      return
    }

    setWarning('')
    setSyncStatus('Saved on this device')
    draftRevision.current += 1
    setDraft((currentDraft) =>
      updateDraft(
        currentDraft,
        {
          items: currentDraft.items.map((item) => {
            if (item.taskId !== taskId) {
              return item
            }

            if (item.isCompleted) {
              return {
                taskId: item.taskId,
                isCompleted: false,
              }
            }

            return {
              taskId: item.taskId,
              isCompleted: true,
              completedAt: new Date().toISOString(),
            }
          }),
        },
        { clearSubmitted: true },
      ),
    )
  }

  function handleNotesChange(notes: string) {
    setWarning('')
    setSyncStatus('Saved on this device')
    draftRevision.current += 1
    setDraft((currentDraft) =>
      updateDraft(currentDraft, { notes }, { clearSubmitted: true }),
    )
  }

  return (
    <div className="grid gap-4">
      <HomeScreenHint />

      <WorkerSelector
        onCreateWorker={onCreateWorker}
        onSelectWorker={handleSelectWorker}
        selectedWorkerId={selectedWorkerId}
        workers={workers}
      />

      {!selectedWorker ? (
        <StatusMessage tone="warning">
          Select a worker before starting the close.
        </StatusMessage>
      ) : null}

      <SectionCard>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xl font-extrabold text-[#1F1D1A]">
                Daily close
              </h2>
              <div className="text-right">
                <p className="text-base font-extrabold text-[#1F1D1A]">
                  {completedCount} / {totalCount} complete
                </p>
                <p className="text-sm font-semibold text-[#6F6A63]">
                  {remainingCount} left
                </p>
              </div>
            </div>
            <ProgressBar
              completed={completedCount}
              showText={false}
              total={totalCount}
            />
          </div>

          {isLoadingChecklist ? (
            <StatusMessage>Loading checklist...</StatusMessage>
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

                  return (
                    <li key={task.id}>
                      <ChecklistTaskRow
                        completedAt={itemState?.completedAt}
                        disabled={!selectedWorkerId}
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

          <label className="grid gap-2 text-base font-extrabold text-[#1F1D1A]">
            Close notes
            <textarea
              className="min-h-28 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] p-3 text-base font-medium leading-relaxed text-[#1F1D1A] placeholder:text-[#6F6A63] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]"
              onChange={(event) => handleNotesChange(event.target.value)}
              placeholder="Add shortages, incidents, maintenance issues, or handover notes."
              value={draft.notes}
            />
          </label>

          {warning ? (
            <StatusMessage tone="warning">{warning}</StatusMessage>
          ) : null}
        </div>
      </SectionCard>
    </div>
  )
}

export default TodayPage
