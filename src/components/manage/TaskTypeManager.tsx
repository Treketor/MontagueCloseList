import { useMemo, useState, type FormEvent } from 'react'
import PrimaryButton from '../PrimaryButton'
import StatusMessage from '../StatusMessage'
import type { ChecklistTask, TaskSection, TaskType } from '../../types'
import {
  darkButtonClass,
  inputClass,
  secondaryButtonClass,
  textareaClass,
} from './manageStyles'

type TaskFormState = {
  description: string
  section: TaskSection
  title: string
}

type TaskTypeManagerProps = {
  onDeleteTask: (taskId: string) => Promise<void> | void
  onSaveTasks: (tasks: ChecklistTask[]) => Promise<void> | void
  sections: TaskSection[]
  taskType: TaskType
  tasks: ChecklistTask[]
}

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

function groupTasks(tasks: ChecklistTask[], sections: TaskSection[]) {
  return sections
    .map((section) => ({
      section,
      tasks: tasks.filter((task) => task.section === section),
    }))
    .filter((group) => group.tasks.length > 0)
}

function TaskTypeManager({
  onDeleteTask,
  onSaveTasks,
  sections,
  taskType,
  tasks,
}: TaskTypeManagerProps) {
  const [mode, setMode] = useState<'idle' | 'add'>('idle')
  const [addForm, setAddForm] = useState<TaskFormState>({
    ...emptyForm,
    section: sections[0] ?? 'Bar',
  })
  const [addError, setAddError] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<TaskFormState>(emptyForm)
  const [editError, setEditError] = useState('')
  const [taskError, setTaskError] = useState('')
  const [confirmingDisableTaskId, setConfirmingDisableTaskId] = useState<
    string | null
  >(null)
  const [confirmingDeleteTaskId, setConfirmingDeleteTaskId] = useState<
    string | null
  >(null)
  const [showDisabled, setShowDisabled] = useState(false)
  const typeTasks = useMemo(
    () => tasks.filter((task) => task.taskType === taskType),
    [taskType, tasks],
  )
  const activeTasks = useMemo(
    () => typeTasks.filter((task) => task.isActive),
    [typeTasks],
  )
  const disabledTasks = useMemo(
    () => typeTasks.filter((task) => !task.isActive),
    [typeTasks],
  )
  const groupedTasks = useMemo(
    () => groupTasks(activeTasks, sections),
    [activeTasks, sections],
  )

  function persistTasks(nextTasks: ChecklistTask[]) {
    setTaskError('')
    onSaveTasks(nextTasks)
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const taskTitle = addForm.title.trim()
    const description = addForm.description.trim()

    if (!taskTitle) {
      setAddError('Task title is required.')
      return
    }

    if (hasDuplicateActiveTitle(tasks, taskType, taskTitle)) {
      setAddError('An active task with this title already exists.')
      return
    }

    const maxSortOrder = Math.max(
      0,
      ...tasks
        .filter((task) => task.taskType === taskType)
        .map((task) => task.sortOrder),
    )
    const newTask: ChecklistTask = {
      id: createTaskId(taskType, taskTitle),
      title: taskTitle,
      description: description || undefined,
      section: addForm.section,
      taskType,
      sortOrder: maxSortOrder + 1,
      isActive: true,
    }

    persistTasks([...tasks, newTask])
    setAddForm({ ...emptyForm, section: sections[0] ?? 'Bar' })
    setAddError('')
    setMode('idle')
  }

  function startEditing(task: ChecklistTask) {
    setEditingTaskId(task.id)
    setConfirmingDisableTaskId(null)
    setConfirmingDeleteTaskId(null)
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
    const taskTitle = editForm.title.trim()
    const description = editForm.description.trim()

    if (!taskTitle) {
      setEditError('Task title is required.')
      return
    }

    if (hasDuplicateActiveTitle(tasks, task.taskType, taskTitle, task.id)) {
      setEditError('An active task with this title already exists.')
      return
    }

    persistTasks(
      tasks.map((currentTask) =>
        currentTask.id === task.id
          ? {
              ...currentTask,
              title: taskTitle,
              description: description || undefined,
              section: editForm.section,
            }
          : currentTask,
      ),
    )
    cancelEditing()
  }

  function disableTask(taskId: string) {
    setConfirmingDisableTaskId(null)
    persistTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, isActive: false } : task,
      ),
    )
  }

  function deleteTask(taskId: string) {
    setTaskError('')
    setEditingTaskId(null)
    setConfirmingDisableTaskId(null)
    setConfirmingDeleteTaskId(null)
    void onDeleteTask(taskId)
  }

  function restoreTask(task: ChecklistTask) {
    if (hasDuplicateActiveTitle(tasks, task.taskType, task.title, task.id)) {
      setTaskError('Cannot restore because an active task has the same title.')
      return
    }

    persistTasks(
      tasks.map((currentTask) =>
        currentTask.id === task.id ? { ...currentTask, isActive: true } : currentTask,
      ),
    )
  }

  function renderTask(task: ChecklistTask) {
    const isEditing = editingTaskId === task.id

    return (
      <li
        className="rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4"
        key={task.id}
      >
        {isEditing ? (
          <form className="grid gap-4" onSubmit={(event) => {
            event.preventDefault()
            saveEdit(task)
          }}>
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
            {editError ? <StatusMessage tone="warning">{editError}</StatusMessage> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <PrimaryButton type="submit">Save</PrimaryButton>
              <button
                className={secondaryButtonClass}
                onClick={cancelEditing}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
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
                {task.section}
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
                      onClick={() => disableTask(task.id)}
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
                      setConfirmingDeleteTaskId(null)
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
                  onClick={() => restoreTask(task)}
                  type="button"
                >
                  Restore
                </button>
              )}
              {confirmingDeleteTaskId === task.id ? (
                <div className="grid gap-3 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] p-3 sm:col-span-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <p className="text-lg font-bold text-[#1F1D1A]">
                    Delete this task permanently?
                  </p>
                  <button
                    className={secondaryButtonClass}
                    onClick={() => setConfirmingDeleteTaskId(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className={darkButtonClass}
                    onClick={() => deleteTask(task.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <button
                  className={secondaryButtonClass}
                  onClick={() => {
                    setTaskError('')
                    setConfirmingDisableTaskId(null)
                    setConfirmingDeleteTaskId(task.id)
                  }}
                  type="button"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-[#6F6A63]">
          {activeTasks.length} active task{activeTasks.length === 1 ? '' : 's'}
        </p>
        {mode === 'idle' ? (
          <PrimaryButton onClick={() => setMode('add')}>Add Task</PrimaryButton>
        ) : null}
      </div>

      {mode === 'add' ? (
        <form
          className="grid gap-4 rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4"
          onSubmit={handleAddTask}
        >
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
          {addError ? <StatusMessage tone="warning">{addError}</StatusMessage> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <PrimaryButton type="submit">Save Task</PrimaryButton>
            <button
              className={secondaryButtonClass}
              onClick={() => {
                setMode('idle')
                setAddError('')
                setAddForm({ ...emptyForm, section: sections[0] ?? 'Bar' })
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {taskError ? <StatusMessage tone="warning">{taskError}</StatusMessage> : null}

      <div className="grid gap-5">
        {groupedTasks.map((group) => (
          <section key={group.section}>
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <h3 className="text-xl font-extrabold text-[#1F1D1A]">
                {group.section}
              </h3>
              <p className="text-sm font-bold text-[#6F6A63]">
                {group.tasks.length}
              </p>
            </div>
            <ul className="grid gap-3">{group.tasks.map(renderTask)}</ul>
          </section>
        ))}
      </div>

      <section className="grid gap-3 border-t border-[#DED8CF] pt-4">
        <button
          className={secondaryButtonClass}
          onClick={() => setShowDisabled((current) => !current)}
          type="button"
        >
          {showDisabled ? 'Hide Disabled Tasks' : `Show Disabled Tasks (${disabledTasks.length})`}
        </button>
        {showDisabled ? (
          <ul className="grid gap-3">
            {disabledTasks.length === 0 ? (
              <li className="rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4 text-base font-semibold text-[#6F6A63]">
                No disabled tasks.
              </li>
            ) : null}
            {disabledTasks.map(renderTask)}
          </ul>
        ) : null}
      </section>
    </div>
  )
}

export default TaskTypeManager
