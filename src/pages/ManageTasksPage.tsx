import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import PageHeader from '../components/PageHeader'
import PrimaryButton from '../components/PrimaryButton'
import SectionCard from '../components/SectionCard'
import StatusMessage from '../components/StatusMessage'
import { getDiagnostics } from '../lib/diagnostics'
import { verifyManagerCodeStatus } from '../lib/managerAccess'
import { getAllTasksByType } from '../lib/taskStorage'
import type { ChecklistTask, TaskSection, TaskType } from '../types'

type ManageTasksPageProps = {
  onRefreshCloudData: () => Promise<void> | void
  onSaveTasks: (tasks: ChecklistTask[]) => Promise<void> | void
  setupDataStatus: string
  tasks: ChecklistTask[]
}

type TaskFormState = {
  description: string
  section: TaskSection
  title: string
}

const sections: TaskSection[] = [
  'Bar',
  'Floor',
  'Stock',
  'Cleaning',
  'Admin',
  'Other',
]
const taskTypes: { label: string; value: TaskType }[] = [
  { label: 'Daily Close', value: 'daily_closing' },
  { label: 'Weekly Cleaning', value: 'weekly_cleaning' },
]
const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Delete']
const managerCodeLength = 4
const emptyForm: TaskFormState = {
  description: '',
  section: 'Bar',
  title: '',
}
const inputClass =
  'min-h-12 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] px-4 text-lg text-[#1F1D1A] placeholder:text-[#6F6A63] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]'
const textareaClass =
  'min-h-28 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] p-4 text-lg font-normal leading-relaxed text-[#1F1D1A] placeholder:text-[#6F6A63] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]'
const secondaryButtonClass =
  'min-h-12 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] px-5 text-base font-bold text-[#1F1D1A] active:bg-[#EFE8DD] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]'
const darkButtonClass =
  'min-h-12 rounded-xl border border-[#1F1D1A] bg-[#1F1D1A] px-5 text-base font-bold text-[#FFFCF7] active:bg-[#3A352F] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]'

function createTaskId(taskType: TaskType, title: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `${taskType}-${slug || 'task'}-${Date.now()}`
}

function hasDuplicateActiveTitle(
  tasks: ChecklistTask[],
  taskType: TaskType,
  title: string,
  ignoredTaskId?: string,
) {
  const normalizedTitle = title.trim().toLowerCase()

  return tasks.some(
    (task) =>
      task.id !== ignoredTaskId &&
      task.taskType === taskType &&
      task.isActive &&
      task.title.trim().toLowerCase() === normalizedTitle,
  )
}

function getGroupedTasks(tasks: ChecklistTask[]) {
  return sections
    .map((section) => ({
      section,
      tasks: tasks.filter((task) => task.section === section),
    }))
    .filter((group) => group.tasks.length > 0)
}

function ManageTasksPage({
  onRefreshCloudData,
  onSaveTasks,
  setupDataStatus,
  tasks,
}: ManageTasksPageProps) {
  const [code, setCode] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [selectedTaskType, setSelectedTaskType] =
    useState<TaskType>('daily_closing')
  const [addForm, setAddForm] = useState<TaskFormState>(emptyForm)
  const [addError, setAddError] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<TaskFormState>(emptyForm)
  const [editError, setEditError] = useState('')
  const [taskError, setTaskError] = useState('')
  const [confirmingDisableTaskId, setConfirmingDisableTaskId] = useState<string | null>(
    null,
  )
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false)
  const [isConfirmingCacheClear, setIsConfirmingCacheClear] = useState(false)
  const diagnostics = getDiagnostics()
  const visibleTasks = useMemo(
    () => getAllTasksByType(tasks, selectedTaskType),
    [selectedTaskType, tasks],
  )
  const groupedTasks = useMemo(() => getGroupedTasks(visibleTasks), [visibleTasks])

  const verifyCode = useCallback(async () => {
    if (isVerifyingCode || code.length !== managerCodeLength) {
      return
    }

    setIsVerifyingCode(true)
    setUnlockError('')

    try {
      const verificationResult = await verifyManagerCodeStatus(code)

      if (verificationResult === 'valid') {
        setIsUnlocked(true)
        setUnlockError('')
        return
      }

      setUnlockError(
        verificationResult === 'invalid'
          ? 'Incorrect manager code.'
          : 'Could not verify manager code.',
      )
      setCode('')
    } catch {
      setUnlockError('Could not verify manager code.')
      setCode('')
    } finally {
      setIsVerifyingCode(false)
    }
  }, [code, isVerifyingCode])

  useEffect(() => {
    if (code.length === managerCodeLength && !isVerifyingCode) {
      void verifyCode()
    }
  }, [code, isVerifyingCode, verifyCode])

  function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void verifyCode()
  }

  function handleKeypadInput(key: string) {
    if (isVerifyingCode) {
      return
    }

    setUnlockError('')

    if (key === 'Clear') {
      setCode('')
      return
    }

    if (key === 'Delete') {
      setCode((currentCode) => currentCode.slice(0, -1))
      return
    }

    setCode((currentCode) =>
      currentCode.length >= managerCodeLength ? currentCode : `${currentCode}${key}`,
    )
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void verifyCode()
      return
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      handleKeypadInput('Delete')
      return
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      handleKeypadInput(event.key)
    }
  }

  function persistTasks(nextTasks: ChecklistTask[]) {
    setTaskError('')
    onSaveTasks(nextTasks)
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = addForm.title.trim()
    const description = addForm.description.trim()

    if (!title) {
      setAddError('Task title is required.')
      return
    }

    if (hasDuplicateActiveTitle(tasks, selectedTaskType, title)) {
      setAddError('An active task with this title already exists.')
      return
    }

    const maxSortOrder = Math.max(
      0,
      ...tasks
        .filter((task) => task.taskType === selectedTaskType)
        .map((task) => task.sortOrder),
    )
    const newTask: ChecklistTask = {
      id: createTaskId(selectedTaskType, title),
      title,
      description: description || undefined,
      section: addForm.section,
      taskType: selectedTaskType,
      sortOrder: maxSortOrder + 1,
      isActive: true,
    }

    persistTasks([...tasks, newTask])
    setAddForm(emptyForm)
    setAddError('')
  }

  function startEditing(task: ChecklistTask) {
    setEditingTaskId(task.id)
    setConfirmingDisableTaskId(null)
    setEditError('')
    setTaskError('')
    setEditForm({
      description: task.description ?? '',
      section: task.section,
      title: task.title,
    })
  }

  function cancelEditing() {
    setEditingTaskId(null)
    setEditError('')
    setEditForm(emptyForm)
  }

  function saveEdit(task: ChecklistTask) {
    const title = editForm.title.trim()
    const description = editForm.description.trim()

    if (!title) {
      setEditError('Task title is required.')
      return
    }

    if (hasDuplicateActiveTitle(tasks, task.taskType, title, task.id)) {
      setEditError('An active task with this title already exists.')
      return
    }

    persistTasks(
      tasks.map((currentTask) =>
        currentTask.id === task.id
          ? {
              ...currentTask,
              title,
              description: description || undefined,
              section: editForm.section,
            }
          : currentTask,
      ),
    )
    cancelEditing()
  }

  function setTaskActive(taskId: string, isActive: boolean) {
    const task = tasks.find((currentTask) => currentTask.id === taskId)

    if (
      task &&
      isActive &&
      hasDuplicateActiveTitle(tasks, task.taskType, task.title, task.id)
    ) {
      setTaskError('An active task with this title already exists.')
      return
    }

    persistTasks(
      tasks.map((task) => (task.id === taskId ? { ...task, isActive } : task)),
    )
    setConfirmingDisableTaskId(null)
  }

  function getDiagnosticsText() {
    return [
      `App version: ${diagnostics.appVersion}`,
      `Environment: ${diagnostics.environment}`,
      `Cloud sync ready: ${diagnostics.supabaseConfigured ? 'yes' : 'no'}`,
      `Local workers cache: ${diagnostics.hasLocalWorkers ? 'yes' : 'no'}`,
      `Local tasks cache: ${diagnostics.hasLocalTasks ? 'yes' : 'no'}`,
      `Local daily checklist cache count: ${diagnostics.localDailyChecklistKeys}`,
      `Local weekly cleaning cache count: ${diagnostics.localWeeklyCleaningKeys}`,
    ].join('\n')
  }

  async function handleCopyDiagnostics() {
    try {
      await window.navigator.clipboard.writeText(getDiagnosticsText())
      setDiagnosticsCopied(true)
    } catch {
      setDiagnosticsCopied(false)
    }
  }

  function clearLocalCache() {
    try {
      const keysToRemove: string[] = []

      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index)

        if (key?.startsWith('closelist_')) {
          keysToRemove.push(key)
        }
      }

      for (const key of keysToRemove) {
        window.localStorage.removeItem(key)
      }
    } catch {
      // Reload anyway; the app will fall back to in-memory state if storage is unavailable.
    }

    window.location.reload()
  }

  if (!isUnlocked) {
    return (
      <div className="grid gap-4">
        <div className="mx-auto w-full max-w-lg">
        <SectionCard>
          <form
            className="mx-auto grid max-w-xs gap-4 py-1"
            onKeyDown={handleKeyDown}
            onSubmit={handleUnlock}
          >
            <div>
              <p className="mb-3 text-center text-base font-bold text-[#6F6A63]">
                Manager code
              </p>
              <div className="flex min-h-10 items-center justify-center px-4">
                <p
                  aria-label={`${code.length} digits entered`}
                  className="sr-only"
                >
                  {code ? '•'.repeat(code.length) : '○○○○'}
                </p>
                <div className="flex gap-3" aria-hidden="true">
                  {Array.from({ length: managerCodeLength }, (_, index) => (
                    <span
                      className={[
                        'h-3.5 w-3.5 rounded-full border',
                        index < code.length
                          ? 'border-[#1F1D1A] bg-[#1F1D1A]'
                          : 'border-[#CFC7BC] bg-transparent',
                      ].join(' ')}
                      key={index}
                    />
                  ))}
                </div>
              </div>
            </div>

            {unlockError ? (
              <StatusMessage tone="warning">{unlockError}</StatusMessage>
            ) : isVerifyingCode ? (
              <div className="min-h-14 rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-4 text-center text-base font-semibold text-[#6F6A63]">
                Checking...
              </div>
            ) : (
              <div className="min-h-14 rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-4 text-center text-base font-semibold text-[#6F6A63]">
                Enter the manager code to edit tasks.
              </div>
            )}

            <div className="grid grid-cols-3 justify-items-center gap-3">
              {keypadKeys.map((key) => {
                const isUtilityKey = key === 'Clear' || key === 'Delete'

                return (
                  <button
                    className={[
                      'flex h-16 w-20 items-center justify-center rounded-2xl border font-extrabold focus:outline-none',
                      isUtilityKey
                        ? 'border-transparent bg-transparent text-sm text-[#6F6A63] active:bg-[#EFE8DD]'
                        : 'border-[#DED8CF] bg-[#F7F4EF] text-2xl text-[#1F1D1A] active:bg-[#EFE8DD]',
                    ].join(' ')}
                    disabled={isVerifyingCode}
                    key={key}
                    onClick={() => handleKeypadInput(key)}
                    type="button"
                  >
                    {key}
                  </button>
                )
              })}
            </div>

          </form>
        </SectionCard>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Manage Tasks" description="Edit local checklist tasks." />

      <div className="grid grid-cols-2 gap-3">
        {taskTypes.map((taskType) => {
          const isSelected = selectedTaskType === taskType.value

          return (
            <button
              className={[
                'min-h-12 rounded-xl border px-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#F7F4EF]',
                isSelected
                  ? 'border-[#1F1D1A] bg-[#1F1D1A] text-[#FFFCF7]'
                  : 'border-[#DED8CF] bg-[#FFFCF7] text-[#1F1D1A] active:bg-[#EFE8DD]',
              ].join(' ')}
              key={taskType.value}
              onClick={() => {
                setSelectedTaskType(taskType.value)
                cancelEditing()
                setAddError('')
                setTaskError('')
              }}
              type="button"
            >
              {taskType.label}
            </button>
          )
        })}
      </div>

      <SectionCard title="Add Task">
        <form className="grid gap-4" onSubmit={handleAddTask}>
          <label className="grid gap-2 text-lg font-bold text-[#1F1D1A]">
            Title
            <input
              className={inputClass}
              onChange={(event) =>
                setAddForm((currentForm) => ({
                  ...currentForm,
                  title: event.target.value,
                }))
              }
              value={addForm.title}
            />
          </label>
          <label className="grid gap-2 text-lg font-bold text-[#1F1D1A]">
            Description
            <textarea
              className={textareaClass}
              onChange={(event) =>
                setAddForm((currentForm) => ({
                  ...currentForm,
                  description: event.target.value,
                }))
              }
              value={addForm.description}
            />
          </label>
          <label className="grid gap-2 text-lg font-bold text-[#1F1D1A]">
            Section
            <select
              className={inputClass}
              onChange={(event) =>
                setAddForm((currentForm) => ({
                  ...currentForm,
                  section: event.target.value as TaskSection,
                }))
              }
              value={addForm.section}
            >
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </label>
          {addError ? (
            <StatusMessage tone="warning">{addError}</StatusMessage>
          ) : null}
          <PrimaryButton type="submit">Add Task</PrimaryButton>
        </form>
      </SectionCard>

      <SectionCard title="Tasks">
        <div className="grid gap-6">
          {taskError ? (
            <StatusMessage tone="warning">{taskError}</StatusMessage>
          ) : null}

          {groupedTasks.map((group) => (
            <section key={group.section}>
              <h3 className="mb-3 text-xl font-extrabold text-[#1F1D1A]">{group.section}</h3>
              <ul className="grid gap-3">
                {group.tasks.map((task) => {
                  const isEditing = editingTaskId === task.id

                  return (
                    <li
                      className="rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4"
                      key={task.id}
                    >
                      {isEditing ? (
                        <div className="grid gap-4">
                          <label className="grid gap-2 text-lg font-bold text-[#1F1D1A]">
                            Title
                            <input
                              className={inputClass}
                              onChange={(event) =>
                                setEditForm((currentForm) => ({
                                  ...currentForm,
                                  title: event.target.value,
                                }))
                              }
                              value={editForm.title}
                            />
                          </label>
                          <label className="grid gap-2 text-lg font-bold text-[#1F1D1A]">
                            Description
                            <textarea
                              className={textareaClass}
                              onChange={(event) =>
                                setEditForm((currentForm) => ({
                                  ...currentForm,
                                  description: event.target.value,
                                }))
                              }
                              value={editForm.description}
                            />
                          </label>
                          <label className="grid gap-2 text-lg font-bold text-[#1F1D1A]">
                            Section
                            <select
                              className={inputClass}
                              onChange={(event) =>
                                setEditForm((currentForm) => ({
                                  ...currentForm,
                                  section: event.target.value as TaskSection,
                                }))
                              }
                              value={editForm.section}
                            >
                              {sections.map((section) => (
                                <option key={section} value={section}>
                                  {section}
                                </option>
                              ))}
                            </select>
                          </label>
                          {editError ? (
                            <StatusMessage tone="warning">{editError}</StatusMessage>
                          ) : null}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <PrimaryButton onClick={() => saveEdit(task)}>
                              Save
                            </PrimaryButton>
                            <button
                              className={secondaryButtonClass}
                              onClick={cancelEditing}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          <div>
                            <p
                              className={[
                                'text-xl font-semibold leading-tight',
                                task.isActive ? 'text-[#1F1D1A]' : 'text-[#6F6A63]',
                              ].join(' ')}
                            >
                              {task.title}
                            </p>
                            {task.description ? (
                              <p className="mt-2 text-base leading-relaxed text-[#6F6A63]">
                                {task.description}
                              </p>
                            ) : null}
                            <p className="mt-3 text-base font-bold text-[#6F6A63]">
                              {task.section} - {task.isActive ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <button
                              className={secondaryButtonClass}
                              onClick={() => startEditing(task)}
                              type="button"
                            >
                              Edit
                            </button>
                            {task.isActive ? (
                              confirmingDisableTaskId === task.id ? (
                                <div className="grid gap-3 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] p-3 sm:col-span-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                                  <p className="text-lg font-bold text-[#1F1D1A]">
                                    Disable this task?
                                  </p>
                                  <button
                                    className={secondaryButtonClass}
                                    onClick={() => setConfirmingDisableTaskId(null)}
                                    type="button"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className={darkButtonClass}
                                    onClick={() => setTaskActive(task.id, false)}
                                    type="button"
                                  >
                                    Disable
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className={secondaryButtonClass}
                                  onClick={() => {
                                    setTaskError('')
                                    setConfirmingDisableTaskId(task.id)
                                  }}
                                  type="button"
                                >
                                  Disable
                                </button>
                              )
                            ) : (
                              <button
                                className={darkButtonClass}
                                onClick={() => setTaskActive(task.id, true)}
                                type="button"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Diagnostics">
        <div className="grid gap-4">
          <dl className="grid gap-3 text-base">
            <div className="flex justify-between gap-4 border-b border-[#DED8CF] pb-2">
              <dt className="text-[#6F6A63]">App version</dt>
              <dd className="font-semibold">{diagnostics.appVersion}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#DED8CF] pb-2">
              <dt className="text-[#6F6A63]">Environment</dt>
              <dd className="font-semibold">{diagnostics.environment}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#DED8CF] pb-2">
              <dt className="text-[#6F6A63]">Cloud sync ready</dt>
              <dd className="font-semibold">
                {diagnostics.supabaseConfigured ? 'yes' : 'no'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#DED8CF] pb-2">
              <dt className="text-[#6F6A63]">Local workers cache</dt>
              <dd className="font-semibold">
                {diagnostics.hasLocalWorkers ? 'yes' : 'no'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#DED8CF] pb-2">
              <dt className="text-[#6F6A63]">Local tasks cache</dt>
              <dd className="font-semibold">
                {diagnostics.hasLocalTasks ? 'yes' : 'no'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#DED8CF] pb-2">
              <dt className="text-[#6F6A63]">Daily checklist cache</dt>
              <dd className="font-semibold">{diagnostics.localDailyChecklistKeys}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#DED8CF] pb-2">
              <dt className="text-[#6F6A63]">Weekly cleaning cache</dt>
              <dd className="font-semibold">{diagnostics.localWeeklyCleaningKeys}</dd>
            </div>
          </dl>

          {setupDataStatus ? (
            <StatusMessage
              tone={
                setupDataStatus.startsWith('Could not') ? 'warning' : 'neutral'
              }
            >
              {setupDataStatus}
            </StatusMessage>
          ) : null}

          {diagnosticsCopied ? (
            <StatusMessage tone="success">Diagnostics copied.</StatusMessage>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <PrimaryButton onClick={() => void onRefreshCloudData()}>
              Refresh cloud data
            </PrimaryButton>
            <button
              className={secondaryButtonClass}
              onClick={() => void handleCopyDiagnostics()}
              type="button"
            >
              Copy diagnostics
            </button>
          </div>

          {isConfirmingCacheClear ? (
            <div className="grid gap-3 rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <p className="text-lg font-bold text-[#1F1D1A]">
                Clear CloseList local cache on this device?
              </p>
              <button
                className={secondaryButtonClass}
                onClick={() => setIsConfirmingCacheClear(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={darkButtonClass}
                onClick={clearLocalCache}
                type="button"
              >
                Clear cache
              </button>
            </div>
          ) : (
            <button
              className={secondaryButtonClass}
              onClick={() => setIsConfirmingCacheClear(true)}
              type="button"
            >
              Clear local cache on this device
            </button>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

export default ManageTasksPage
