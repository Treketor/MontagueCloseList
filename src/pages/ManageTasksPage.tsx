import { useMemo, useState, type FormEvent } from 'react'
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
const emptyForm: TaskFormState = {
  description: '',
  section: 'Bar',
  title: '',
}

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

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

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
    } catch {
      setUnlockError('Could not verify manager code.')
    } finally {
      setIsVerifyingCode(false)
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
      <div className="grid gap-6">
        <PageHeader title="Manage Tasks" description="Task editing is manager-only." />
        <SectionCard>
          <form className="grid gap-4" onSubmit={handleUnlock}>
            <label className="grid gap-2 text-xl font-semibold">
              Manager code
              <input
                className="min-h-14 rounded-md border border-neutral-700 bg-black px-4 text-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                inputMode="numeric"
                disabled={isVerifyingCode}
                onChange={(event) => setCode(event.target.value)}
                type="password"
                value={code}
              />
            </label>
            {unlockError ? (
              <StatusMessage tone="warning">{unlockError}</StatusMessage>
            ) : null}
            <PrimaryButton disabled={isVerifyingCode} type="submit">
              {isVerifyingCode ? 'Checking...' : 'Unlock'}
            </PrimaryButton>
          </form>
        </SectionCard>
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
                'min-h-14 rounded-md border px-4 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black',
                isSelected
                  ? 'border-white bg-white text-black'
                  : 'border-neutral-700 bg-black text-white active:bg-neutral-900',
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
          <label className="grid gap-2 text-xl font-semibold">
            Title
            <input
              className="min-h-14 rounded-md border border-neutral-700 bg-black px-4 text-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              onChange={(event) =>
                setAddForm((currentForm) => ({
                  ...currentForm,
                  title: event.target.value,
                }))
              }
              value={addForm.title}
            />
          </label>
          <label className="grid gap-2 text-xl font-semibold">
            Description
            <textarea
              className="min-h-28 rounded-md border border-neutral-700 bg-black p-4 text-xl font-normal leading-relaxed text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              onChange={(event) =>
                setAddForm((currentForm) => ({
                  ...currentForm,
                  description: event.target.value,
                }))
              }
              value={addForm.description}
            />
          </label>
          <label className="grid gap-2 text-xl font-semibold">
            Section
            <select
              className="min-h-14 rounded-md border border-neutral-700 bg-black px-4 text-xl text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
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
              <h3 className="mb-3 text-2xl font-semibold">{group.section}</h3>
              <ul className="grid gap-3">
                {group.tasks.map((task) => {
                  const isEditing = editingTaskId === task.id

                  return (
                    <li
                      className="rounded-md border border-neutral-800 p-4"
                      key={task.id}
                    >
                      {isEditing ? (
                        <div className="grid gap-4">
                          <label className="grid gap-2 text-lg font-semibold">
                            Title
                            <input
                              className="min-h-14 rounded-md border border-neutral-700 bg-black px-4 text-xl text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                              onChange={(event) =>
                                setEditForm((currentForm) => ({
                                  ...currentForm,
                                  title: event.target.value,
                                }))
                              }
                              value={editForm.title}
                            />
                          </label>
                          <label className="grid gap-2 text-lg font-semibold">
                            Description
                            <textarea
                              className="min-h-28 rounded-md border border-neutral-700 bg-black p-4 text-xl font-normal leading-relaxed text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                              onChange={(event) =>
                                setEditForm((currentForm) => ({
                                  ...currentForm,
                                  description: event.target.value,
                                }))
                              }
                              value={editForm.description}
                            />
                          </label>
                          <label className="grid gap-2 text-lg font-semibold">
                            Section
                            <select
                              className="min-h-14 rounded-md border border-neutral-700 bg-black px-4 text-xl text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
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
                              className="min-h-14 rounded-md border border-neutral-700 px-6 text-lg font-semibold text-white active:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
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
                                task.isActive ? 'text-white' : 'text-neutral-500',
                              ].join(' ')}
                            >
                              {task.title}
                            </p>
                            {task.description ? (
                              <p className="mt-2 text-lg leading-relaxed text-neutral-300">
                                {task.description}
                              </p>
                            ) : null}
                            <p className="mt-3 text-lg font-semibold text-neutral-400">
                              {task.section} - {task.isActive ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <button
                              className="min-h-14 rounded-md border border-neutral-700 px-6 text-lg font-semibold text-white active:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                              onClick={() => startEditing(task)}
                              type="button"
                            >
                              Edit
                            </button>
                            {task.isActive ? (
                              confirmingDisableTaskId === task.id ? (
                                <div className="grid gap-3 rounded-md border border-neutral-700 p-3 sm:col-span-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                                  <p className="text-lg font-semibold text-white">
                                    Disable this task?
                                  </p>
                                  <button
                                    className="min-h-12 rounded-md border border-neutral-700 px-5 text-lg font-semibold text-white active:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                                    onClick={() => setConfirmingDisableTaskId(null)}
                                    type="button"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="min-h-12 rounded-md border border-white bg-white px-5 text-lg font-semibold text-black active:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                                    onClick={() => setTaskActive(task.id, false)}
                                    type="button"
                                  >
                                    Disable
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="min-h-14 rounded-md border border-neutral-700 px-6 text-lg font-semibold text-white active:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
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
                                className="min-h-14 rounded-md border border-white bg-white px-6 text-lg font-semibold text-black active:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
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
          <dl className="grid gap-3 text-lg">
            <div className="flex justify-between gap-4 border-b border-neutral-800 pb-2">
              <dt className="text-neutral-400">App version</dt>
              <dd className="font-semibold">{diagnostics.appVersion}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800 pb-2">
              <dt className="text-neutral-400">Environment</dt>
              <dd className="font-semibold">{diagnostics.environment}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800 pb-2">
              <dt className="text-neutral-400">Cloud sync ready</dt>
              <dd className="font-semibold">
                {diagnostics.supabaseConfigured ? 'yes' : 'no'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800 pb-2">
              <dt className="text-neutral-400">Local workers cache</dt>
              <dd className="font-semibold">
                {diagnostics.hasLocalWorkers ? 'yes' : 'no'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800 pb-2">
              <dt className="text-neutral-400">Local tasks cache</dt>
              <dd className="font-semibold">
                {diagnostics.hasLocalTasks ? 'yes' : 'no'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800 pb-2">
              <dt className="text-neutral-400">Daily checklist cache</dt>
              <dd className="font-semibold">{diagnostics.localDailyChecklistKeys}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-800 pb-2">
              <dt className="text-neutral-400">Weekly cleaning cache</dt>
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
              className="min-h-14 rounded-md border border-neutral-700 px-6 text-lg font-semibold text-white active:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              onClick={() => void handleCopyDiagnostics()}
              type="button"
            >
              Copy diagnostics
            </button>
          </div>

          {isConfirmingCacheClear ? (
            <div className="grid gap-3 rounded-md border border-neutral-700 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <p className="text-lg font-semibold text-white">
                Clear CloseList local cache on this device?
              </p>
              <button
                className="min-h-12 rounded-md border border-neutral-700 px-5 text-lg font-semibold text-white active:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                onClick={() => setIsConfirmingCacheClear(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-12 rounded-md border border-white bg-white px-5 text-lg font-semibold text-black active:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                onClick={clearLocalCache}
                type="button"
              >
                Clear cache
              </button>
            </div>
          ) : (
            <button
              className="min-h-14 rounded-md border border-neutral-700 px-6 text-lg font-semibold text-white active:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
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
