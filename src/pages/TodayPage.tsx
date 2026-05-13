import { useEffect, useMemo, useRef, useState } from 'react'
import AppModal from '../components/AppModal'
import ChecklistTaskRow from '../components/ChecklistTaskRow'
import CloseSummary from '../components/CloseSummary'
import CompletionConfetti from '../components/CompletionConfetti'
import EmptyState from '../components/EmptyState'
import HomeScreenHint from '../components/HomeScreenHint'
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
  createPendingChecklistItem,
  getDailyChecklistStats,
  getItemStatus,
  isItemCompleted,
  isItemSkipped,
} from '../lib/checklistStats'
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
        .sort((firstTask, secondTask) => {
          if (Boolean(firstTask.isCritical) !== Boolean(secondTask.isCritical)) {
            return firstTask.isCritical ? -1 : 1
          }

          return firstTask.sortOrder - secondTask.sortOrder ||
            firstTask.title.localeCompare(secondTask.title)
        }),
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
  const [skipTaskId, setSkipTaskId] = useState<string | null>(null)
  const [skipReason, setSkipReason] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [syncStatus, setSyncStatus] = useState('Saved on this device')
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(isCloudSyncEnabled)
  const [isChecklistLoaded, setIsChecklistLoaded] = useState(!isCloudSyncEnabled)
  const skipNextCloudSave = useRef(false)
  const draftRevision = useRef(0)
  const hasWatchedCompletion = useRef(false)
  const wasComplete = useRef(false)
  const [completionConfettiKey, setCompletionConfettiKey] = useState(0)
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
  const stats = getDailyChecklistStats(draft, dailyClosingTasks)
  const skipTask = dailyClosingTasks.find((task) => task.id === skipTaskId)

  useEffect(() => {
    const isComplete = stats.total > 0 && stats.resolved === stats.total

    if (!hasWatchedCompletion.current) {
      hasWatchedCompletion.current = true
      wasComplete.current = isComplete
      return
    }

    if (isComplete && !wasComplete.current) {
      setCompletionConfettiKey((currentKey) => currentKey + 1)
    }

    wasComplete.current = isComplete
  }, [stats.resolved, stats.total])

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

            if (isItemCompleted(item)) {
              return createPendingChecklistItem(item.taskId)
            }

            return {
              taskId: item.taskId,
              isCompleted: true,
              status: 'completed',
              completedAt: new Date().toISOString(),
            }
          }),
        },
        { clearSubmitted: true },
      ),
    )
  }

  function handleOpenSkip(taskId: string) {
    const item = getItemState(draft, taskId)
    setSkipTaskId(taskId)
    setSkipReason(isItemSkipped(item) ? item?.skipReason ?? '' : '')
    setWarning('')
  }

  function handleSaveSkipReason() {
    const trimmedReason = skipReason.trim()

    if (!skipTaskId || !trimmedReason) {
      setWarning('Add a reason before skipping the task.')
      return
    }

    setWarning('')
    setSyncStatus('Saved on this device')
    draftRevision.current += 1
    setDraft((currentDraft) =>
      updateDraft(
        currentDraft,
        {
          items: currentDraft.items.map((item) =>
            item.taskId === skipTaskId
              ? {
                  taskId: item.taskId,
                  isCompleted: false,
                  status: 'skipped',
                  skipReason: trimmedReason,
                }
              : item,
          ),
        },
        { clearSubmitted: true },
      ),
    )
    setSkipTaskId(null)
    setSkipReason('')
  }

  function handleMarkPending(taskId: string) {
    setWarning('')
    setSyncStatus('Saved on this device')
    draftRevision.current += 1
    setDraft((currentDraft) =>
      updateDraft(
        currentDraft,
        {
          items: currentDraft.items.map((item) =>
            item.taskId === taskId ? createPendingChecklistItem(item.taskId) : item,
          ),
        },
        { clearSubmitted: true },
      ),
    )
  }

  function getSubmitValidationMessage() {
    if (!selectedWorkerId) {
      return 'Select a worker before submitting.'
    }

    if (stats.skippedWithoutReason > 0) {
      return 'Add reasons for skipped tasks.'
    }

    if (stats.pending > 0 || stats.resolved < stats.total) {
      return 'Resolve all tasks before submitting.'
    }

    if (stats.hasSkipped && !draft.notes.trim()) {
      return 'Add close notes before submitting with skipped tasks.'
    }

    return ''
  }

  function handleSubmitClose() {
    const validationMessage = getSubmitValidationMessage()

    if (validationMessage) {
      setWarning(validationMessage)
      return
    }

    setWarning('')
    setSyncStatus('Saved on this device')
    draftRevision.current += 1
    const submittedAt = new Date().toISOString()
    setDraft((currentDraft) =>
      updateDraft(currentDraft, {
        workerId: selectedWorkerId,
        submittedAt,
      }),
    )
    setShowSummary(true)
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
    <div className="grid gap-4 pb-24">
      <CompletionConfetti fireKey={completionConfettiKey} />
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

      {dailyClosingTasks.length === 0 ? (
        <EmptyState
          message="No daily close tasks set up. Ask a manager to add tasks in Manage."
        />
      ) : null}

      {dailyClosingTasks.length > 0 ? (
      <SectionCard>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xl font-extrabold text-[#1F1D1A]">
                Daily close
              </h2>
              <div className="text-right">
                <p className="text-base font-extrabold text-[#1F1D1A]">
                  {stats.resolved} / {stats.total} resolved
                </p>
                <p className="text-sm font-semibold text-[#6F6A63]">
                  {stats.completed} completed · {stats.skipped} skipped · {stats.left} left
                </p>
              </div>
            </div>
            <ProgressBar
              completed={stats.resolved}
              showText={false}
              total={stats.total}
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
                  const status = getItemStatus(itemState)

                  return (
                    <li key={task.id}>
                      <ChecklistTaskRow
                        completedAt={itemState?.completedAt}
                        disabled={!selectedWorkerId}
                        isCompleted={status === 'completed'}
                        isSkipped={status === 'skipped'}
                        onMarkPending={() => handleMarkPending(task.id)}
                        onSkip={() => handleOpenSkip(task.id)}
                        onToggle={() => handleToggleTask(task.id)}
                        skipReason={itemState?.skipReason}
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

          {draft.submittedAt ? (
            <StatusMessage tone="success">
              Close submitted. You can still edit tasks and submit again if needed.
            </StatusMessage>
          ) : null}
        </div>
      </SectionCard>
      ) : null}

      {dailyClosingTasks.length > 0 ? (
        <div className="sticky bottom-3 z-30 rounded-2xl border border-[#DED8CF] bg-[#FFFCF7]/95 p-3 shadow-sm backdrop-blur">
          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-extrabold text-[#1F1D1A]">
                {stats.resolved} / {stats.total} resolved
              </p>
              <p className="text-sm font-semibold text-[#6F6A63]">
                {stats.completed} completed · {stats.skipped} skipped · {stats.left} left
              </p>
            </div>
            <div className="grid gap-2 sm:flex sm:items-center">
              {draft.submittedAt ? (
                <button
                  className="interactive-press min-h-12 rounded-xl border border-[#DED8CF] px-4 text-base font-extrabold text-[#1F1D1A]"
                  onClick={() => setShowSummary(true)}
                  type="button"
                >
                  View summary
                </button>
              ) : null}
              <PrimaryButton onClick={handleSubmitClose}>
                Submit close
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}

      <AppModal
        description={skipTask?.title}
        isOpen={Boolean(skipTaskId)}
        onClose={() => {
          setSkipTaskId(null)
          setSkipReason('')
        }}
        title="Skip task"
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-base font-extrabold text-[#1F1D1A]">
            Reason
            <textarea
              className="min-h-28 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] p-3 text-base font-medium leading-relaxed text-[#1F1D1A] placeholder:text-[#6F6A63] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]"
              onChange={(event) => setSkipReason(event.target.value)}
              placeholder="Why is this task being skipped?"
              value={skipReason}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <PrimaryButton onClick={handleSaveSkipReason}>Save reason</PrimaryButton>
            <button
              className="interactive-press min-h-12 rounded-xl border border-[#DED8CF] px-4 text-base font-extrabold text-[#1F1D1A]"
              onClick={() => {
                setSkipTaskId(null)
                setSkipReason('')
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      </AppModal>

      <AppModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        title="Close summary"
      >
        <CloseSummary
          checklist={draft}
          onClose={() => setShowSummary(false)}
          tasks={dailyClosingTasks}
          workerName={selectedWorker?.name ?? 'No worker selected'}
        />
      </AppModal>
    </div>
  )
}

export default TodayPage
