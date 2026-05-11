import { useEffect, useMemo, useRef, useState } from 'react'
import ChecklistTaskRow from '../components/ChecklistTaskRow'
import HomeScreenHint from '../components/HomeScreenHint'
import PageHeader from '../components/PageHeader'
import PrimaryButton from '../components/PrimaryButton'
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
  onSelectWorker: (workerId: string | null) => void
  readableBarDate: string
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

function getSubmittedTime(submittedAt: string) {
  return new Date(submittedAt).toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
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
  onSelectWorker,
  readableBarDate,
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
  const isComplete = totalCount > 0 && completedCount === totalCount

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

  function handleSubmit() {
    if (!selectedWorkerId) {
      setWarning('Select who is closing before submitting.')
      return
    }

    if (!isComplete) {
      setWarning('Complete all tasks before submitting.')
      return
    }

    setWarning('')
    setSyncStatus('Saved on this device')
    draftRevision.current += 1
    setDraft((currentDraft) =>
      updateDraft(currentDraft, {
        workerId: selectedWorkerId,
        submittedAt: new Date().toISOString(),
      }),
    )
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Today's Close" description={readableBarDate} />

      <HomeScreenHint />

      <WorkerSelector
        onCreateWorker={onCreateWorker}
        onSelectWorker={handleSelectWorker}
        selectedWorkerId={selectedWorkerId}
        workers={workers}
      />

      <SectionCard title="Daily Closing Checklist">
        <div className="mb-5 border-b border-neutral-800 pb-5">
          <p className="text-sm font-medium uppercase tracking-normal text-neutral-400">
            Bar Date
          </p>
          <p className="mt-1 text-2xl font-semibold leading-tight">
            {readableBarDate}
          </p>
          <p className="mt-2 text-lg text-neutral-400">{barDate}</p>
        </div>

        <div className="grid gap-6">
          {isLoadingChecklist ? (
            <StatusMessage>Loading checklist...</StatusMessage>
          ) : null}
          <p className="text-lg font-medium text-neutral-500">
            {syncStatus} · Last updated {getUpdatedTime(draft.updatedAt)}
          </p>

          {!selectedWorker ? (
            <StatusMessage>
              Select who is closing before starting the checklist.
            </StatusMessage>
          ) : (
            <p className="text-2xl font-medium leading-relaxed text-neutral-200">
              Ready for {selectedWorker.name}'s close.
            </p>
          )}

          <ProgressBar completed={completedCount} total={totalCount} />

          {draft.submittedAt ? (
            <StatusMessage tone="success">
              <p className="text-2xl font-semibold">Closing checklist submitted.</p>
              <p className="mt-2 text-lg text-neutral-300">
                Submitted {getSubmittedTime(draft.submittedAt)}
              </p>
            </StatusMessage>
          ) : null}

          {taskGroups.map((group) => (
            <section key={group.section}>
              <h3 className="mb-3 text-2xl font-semibold leading-tight">
                {group.section}
              </h3>
              <ul className="grid gap-3">
                {group.tasks.map((task) => {
                  const itemState = getItemState(draft, task.id)

                  return (
                    <li key={task.id}>
                      <ChecklistTaskRow
                        completedAt={itemState?.completedAt}
                        isCompleted={itemState?.isCompleted ?? false}
                        onToggle={() => handleToggleTask(task.id)}
                        task={task}
                      />
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          <label className="grid gap-2 text-xl font-semibold">
            Close notes
            <textarea
              className="min-h-36 rounded-md border border-neutral-700 bg-black p-4 text-xl font-normal leading-relaxed text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              onChange={(event) => handleNotesChange(event.target.value)}
              placeholder="Add shortages, incidents, maintenance issues, or handover notes."
              value={draft.notes}
            />
          </label>

          {warning ? (
            <StatusMessage tone="warning">{warning}</StatusMessage>
          ) : null}

          <div className="sticky bottom-28 border-t border-neutral-800 bg-black pt-4">
            <PrimaryButton className="w-full" onClick={handleSubmit}>
              Submit Close
            </PrimaryButton>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export default TodayPage
