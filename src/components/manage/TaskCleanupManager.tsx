import { useMemo, useState } from 'react'
import PrimaryButton from '../PrimaryButton'
import StatusMessage from '../StatusMessage'
import type { ChecklistTask, TaskSection, TaskType } from '../../types'
import { darkButtonClass, secondaryButtonClass } from './manageStyles'

type TaskCleanupManagerProps = {
  onSaveTasks: (tasks: ChecklistTask[]) => Promise<void> | void
  tasks: ChecklistTask[]
}

type PresetTask = {
  title: string
  description?: string
  isCritical?: boolean
  section: TaskSection
  sortOrder: number
}

type StoredPresets = Partial<Record<TaskType, PresetTask[]>>

const presetStorageKey = 'closelist_task_presets'
const taskTypes: { label: string; value: TaskType }[] = [
  { label: 'Daily Close', value: 'daily_closing' },
  { label: 'Weekly Cleaning', value: 'weekly_cleaning' },
]

function createTaskId(taskType: TaskType, title: string, index: number) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `${taskType}-${slug || 'preset'}-${Date.now()}-${index}`
}

function loadPresets(): StoredPresets {
  try {
    const storedValue = window.localStorage.getItem(presetStorageKey)

    if (!storedValue) {
      return {}
    }

    const parsedValue = JSON.parse(storedValue) as StoredPresets

    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {}
  } catch {
    return {}
  }
}

function savePresets(presets: StoredPresets) {
  try {
    window.localStorage.setItem(presetStorageKey, JSON.stringify(presets))
  } catch {
    // Presets are optional; task editing remains usable if storage is unavailable.
  }
}

function TaskCleanupManager({ onSaveTasks, tasks }: TaskCleanupManagerProps) {
  const [message, setMessage] = useState('')
  const [presets, setPresets] = useState<StoredPresets>(loadPresets)
  const [viewingPreset, setViewingPreset] = useState<TaskType | null>(null)
  const [confirmingPresetSave, setConfirmingPresetSave] =
    useState<TaskType | null>(null)
  const [confirmingPresetApply, setConfirmingPresetApply] =
    useState<TaskType | null>(null)
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, ChecklistTask[]>()

    for (const task of tasks.filter((currentTask) => currentTask.isActive)) {
      const key = `${task.taskType}:${task.title.trim().toLowerCase()}`
      groups.set(key, [...(groups.get(key) ?? []), task])
    }

    return Array.from(groups.values()).filter((group) => group.length > 1)
  }, [tasks])

  function disableObviousDuplicates() {
    if (duplicateGroups.length === 0) {
      setMessage('No active duplicate task titles found.')
      return
    }

    const idsToDisable = new Set(
      duplicateGroups.flatMap((group) => group.slice(1).map((task) => task.id)),
    )

    onSaveTasks(
      tasks.map((task) =>
        idsToDisable.has(task.id) ? { ...task, isActive: false } : task,
      ),
    )
    setMessage('Duplicate tasks disabled.')
  }

  function getActivePresetTasks(taskType: TaskType): PresetTask[] {
    return tasks
      .filter((task) => task.taskType === taskType && task.isActive)
      .sort((firstTask, secondTask) => firstTask.sortOrder - secondTask.sortOrder)
      .map((task) => ({
        title: task.title,
        description: task.description,
        isCritical: task.isCritical,
        section: task.section,
        sortOrder: task.sortOrder,
      }))
  }

  function saveCurrentTasksAsPreset(taskType: TaskType) {
    const presetTasks = getActivePresetTasks(taskType)

    if (presetTasks.length === 0) {
      setMessage('There are no active tasks to save as a preset.')
      setConfirmingPresetSave(null)
      return
    }

    const nextPresets = {
      ...presets,
      [taskType]: presetTasks,
    }

    savePresets(nextPresets)
    setPresets(nextPresets)
    setConfirmingPresetSave(null)
    setMessage(
      taskType === 'daily_closing'
        ? 'Daily close preset saved.'
        : 'Weekly cleaning preset saved.',
    )
  }

  function applyPreset(taskType: TaskType) {
    const presetTasks = presets[taskType] ?? []

    if (presetTasks.length === 0) {
      setMessage('No preset saved for this checklist yet.')
      setConfirmingPresetApply(null)
      return
    }

    const otherTasks = tasks.filter((task) => task.taskType !== taskType)
    const disabledCurrentTasks = tasks
      .filter((task) => task.taskType === taskType)
      .map((task) => ({ ...task, isActive: false }))
    const nextPresetTasks: ChecklistTask[] = presetTasks.map((task, index) => ({
      id: createTaskId(taskType, task.title, index),
      title: task.title,
      description: task.description,
      section: task.section,
      taskType,
      sortOrder: index + 1,
      isActive: true,
      isCritical: task.isCritical ?? false,
    }))

    onSaveTasks([...otherTasks, ...disabledCurrentTasks, ...nextPresetTasks])
    setConfirmingPresetApply(null)
    setMessage(
      taskType === 'daily_closing'
        ? 'Daily close preset applied.'
        : 'Weekly cleaning preset applied.',
    )
  }

  return (
    <div className="grid gap-5">
      {message ? <StatusMessage>{message}</StatusMessage> : null}

      <section className="grid gap-3 rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4">
        <div>
          <h3 className="text-xl font-extrabold text-[#1F1D1A]">
            Duplicate detection
          </h3>
          <p className="mt-1 text-base font-semibold text-[#6F6A63]">
            Finds active tasks with the same title in the same checklist.
          </p>
        </div>
        {duplicateGroups.length === 0 ? (
          <p className="text-base font-semibold text-[#6F6A63]">
            No active duplicate task titles found.
          </p>
        ) : (
          <ul className="grid gap-2">
            {duplicateGroups.map((group) => (
              <li
                className="rounded-xl border border-[#DED8CF] bg-[#FFFCF7] p-3 text-base font-semibold"
                key={`${group[0].taskType}:${group[0].title}`}
              >
                {group[0].title} - {group.length} copies
              </li>
            ))}
          </ul>
        )}
        <PrimaryButton onClick={disableObviousDuplicates}>
          Disable obvious duplicates
        </PrimaryButton>
      </section>

      <section className="grid gap-3 rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4">
        <div>
          <h3 className="text-xl font-extrabold text-[#1F1D1A]">
            Saved presets
          </h3>
          <p className="mt-1 text-base font-semibold text-[#6F6A63]">
            Save the current active tasks as the preset for each checklist.
          </p>
        </div>

        {taskTypes.map((taskType) => {
          const presetTasks = presets[taskType.value] ?? []
          const activeCount = tasks.filter(
            (task) => task.taskType === taskType.value && task.isActive,
          ).length
          const isViewing = viewingPreset === taskType.value

          return (
            <div
              className="grid gap-3 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] p-3"
              key={taskType.value}
            >
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-lg font-bold text-[#1F1D1A]">
                    {taskType.label}
                  </p>
                  <p className="text-base font-semibold text-[#6F6A63]">
                    {presetTasks.length} saved tasks. {activeCount} active now.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    className={secondaryButtonClass}
                    onClick={() =>
                      setViewingPreset((current) =>
                        current === taskType.value ? null : taskType.value,
                      )
                    }
                    type="button"
                  >
                    {isViewing ? 'Hide Preset' : 'View Preset'}
                  </button>
                  <button
                    className={secondaryButtonClass}
                    onClick={() => {
                      setConfirmingPresetSave(taskType.value)
                      setConfirmingPresetApply(null)
                    }}
                    type="button"
                  >
                    Save Current
                  </button>
                  <button
                    className={secondaryButtonClass}
                    disabled={presetTasks.length === 0}
                    onClick={() => {
                      setConfirmingPresetApply(taskType.value)
                      setConfirmingPresetSave(null)
                    }}
                    type="button"
                  >
                    Apply Preset
                  </button>
                </div>
              </div>

              {confirmingPresetSave === taskType.value ? (
                <div className="grid gap-3 rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <p className="text-base font-bold text-[#1F1D1A]">
                    Overwrite the saved preset with current active tasks?
                  </p>
                  <button
                    className={secondaryButtonClass}
                    onClick={() => setConfirmingPresetSave(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className={darkButtonClass}
                    onClick={() => saveCurrentTasksAsPreset(taskType.value)}
                    type="button"
                  >
                    Save Preset
                  </button>
                </div>
              ) : null}

              {confirmingPresetApply === taskType.value ? (
                <div className="grid gap-3 rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <p className="text-base font-bold text-[#1F1D1A]">
                    Apply this preset and disable current active tasks?
                  </p>
                  <button
                    className={secondaryButtonClass}
                    onClick={() => setConfirmingPresetApply(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className={darkButtonClass}
                    onClick={() => applyPreset(taskType.value)}
                    type="button"
                  >
                    Apply
                  </button>
                </div>
              ) : null}

              {isViewing ? (
                <ul className="grid gap-2">
                  {presetTasks.length === 0 ? (
                    <li className="rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-3 text-base font-semibold text-[#6F6A63]">
                      No preset saved yet.
                    </li>
                  ) : null}
                  {presetTasks.map((task, index) => (
                    <li
                      className="rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-3"
                      key={`${task.title}-${index}`}
                    >
                      <p className="text-base font-bold text-[#1F1D1A]">
                        {task.title}
                        {task.isCritical ? (
                          <span className="ml-2 inline-flex rounded-full border border-[#DED8CF] bg-[#EFE8DD] px-2 py-0.5 align-middle text-xs font-extrabold text-[#6F6A63]">
                            Important
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm font-bold text-[#6F6A63]">
                        {task.section}
                      </p>
                      {task.description ? (
                        <p className="mt-1 text-sm font-semibold text-[#6F6A63]">
                          {task.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        })}
      </section>
    </div>
  )
}

export default TaskCleanupManager
