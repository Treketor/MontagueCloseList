import { mockDailyClosingTasks, mockWeeklyCleaningTasks } from './mockData'
import type { ChecklistTask, TaskType } from '../types'

type StoredTasks = {
  tasks: ChecklistTask[]
  updatedAt: string
}

const taskTypeOrder: Record<TaskType, number> = {
  daily_closing: 0,
  weekly_cleaning: 1,
}

function sortTasks(firstTask: ChecklistTask, secondTask: ChecklistTask) {
  const typeSort =
    taskTypeOrder[firstTask.taskType] - taskTypeOrder[secondTask.taskType]

  if (typeSort !== 0) {
    return typeSort
  }

  return firstTask.sortOrder - secondTask.sortOrder
}

function isChecklistTask(value: unknown): value is ChecklistTask {
  if (!value || typeof value !== 'object') {
    return false
  }

  const task = value as ChecklistTask

  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    typeof task.section === 'string' &&
    typeof task.taskType === 'string' &&
    typeof task.sortOrder === 'number' &&
    typeof task.isActive === 'boolean'
  )
}

function isStoredTasks(value: unknown): value is StoredTasks {
  if (!value || typeof value !== 'object') {
    return false
  }

  const storedTasks = value as StoredTasks

  return Array.isArray(storedTasks.tasks)
}

function getStorageItem(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function setStorageItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Keep the app usable in memory if browser storage is unavailable.
  }
}

export function createInitialTasks() {
  return [...mockDailyClosingTasks, ...mockWeeklyCleaningTasks].sort(sortTasks)
}

export function getTaskStorageKey() {
  return 'closelist_tasks'
}

export function loadTasks() {
  const storedValue = getStorageItem(getTaskStorageKey())

  if (!storedValue) {
    return createInitialTasks()
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown

    if (!isStoredTasks(parsedValue)) {
      return createInitialTasks()
    }

    const tasks = parsedValue.tasks.filter(isChecklistTask)

    if (tasks.length === 0) {
      return createInitialTasks()
    }

    return tasks.sort(sortTasks)
  } catch {
    return createInitialTasks()
  }
}

export function saveTasks(tasks: ChecklistTask[]) {
  const sortedTasks = [...tasks].sort(sortTasks)

  setStorageItem(
    getTaskStorageKey(),
    JSON.stringify({
      tasks: sortedTasks,
      updatedAt: new Date().toISOString(),
    }),
  )
}

export function getActiveTasksByType(
  tasks: ChecklistTask[],
  taskType: TaskType,
) {
  return tasks
    .filter((task) => task.taskType === taskType && task.isActive)
    .sort((firstTask, secondTask) => firstTask.sortOrder - secondTask.sortOrder)
}

export function getAllTasksByType(tasks: ChecklistTask[], taskType: TaskType) {
  return tasks
    .filter((task) => task.taskType === taskType)
    .sort((firstTask, secondTask) => firstTask.sortOrder - secondTask.sortOrder)
}
