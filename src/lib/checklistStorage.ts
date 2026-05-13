import type {
  ChecklistTask,
  DailyChecklistDraft,
  WeeklyCleaningDraft,
} from '../types'
import { createPendingChecklistItem, normalizeChecklistItem } from './checklistStats'

function getActiveDailyTasks(tasks: ChecklistTask[]) {
  return tasks
    .filter((task) => task.taskType === 'daily_closing' && task.isActive)
    .sort((firstTask, secondTask) => {
      if (Boolean(firstTask.isCritical) !== Boolean(secondTask.isCritical)) {
        return firstTask.isCritical ? -1 : 1
      }

      return firstTask.sortOrder - secondTask.sortOrder ||
        firstTask.title.localeCompare(secondTask.title)
    })
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
    // The in-memory React state remains usable if browser storage is unavailable.
  }
}

function getActiveWeeklyCleaningTasks(tasks: ChecklistTask[]) {
  return tasks
    .filter((task) => task.taskType === 'weekly_cleaning' && task.isActive)
    .sort((firstTask, secondTask) => firstTask.sortOrder - secondTask.sortOrder)
}

export function createEmptyDailyChecklist(
  barDate: string,
  tasks: ChecklistTask[],
): DailyChecklistDraft {
  return {
    barDate,
    workerId: null,
    items: getActiveDailyTasks(tasks).map((task) => createPendingChecklistItem(task.id)),
    notes: '',
    submittedAt: null,
    updatedAt: new Date().toISOString(),
  }
}

export function reconcileDailyChecklistWithTasks(
  draft: DailyChecklistDraft,
  tasks: ChecklistTask[],
): DailyChecklistDraft {
  const activeTasks = getActiveDailyTasks(tasks)
  const existingItems = new Map(draft.items.map((item) => [item.taskId, item]))
  const items = activeTasks.map((task) => {
    const existingItem = existingItems.get(task.id)

    return existingItem
      ? normalizeChecklistItem({ ...existingItem, taskId: task.id })
      : createPendingChecklistItem(task.id)
  })
  const currentTaskIds = draft.items.map((item) => item.taskId).join('|')
  const nextTaskIds = items.map((item) => item.taskId).join('|')
  const didTaskSetChange = currentTaskIds !== nextTaskIds

  return {
    ...draft,
    items,
    submittedAt: didTaskSetChange ? null : draft.submittedAt,
  }
}

export function getDailyChecklistStorageKey(barDate: string) {
  return `closelist_daily_close_${barDate}`
}

function isDraft(value: unknown): value is DailyChecklistDraft {
  if (!value || typeof value !== 'object') {
    return false
  }

  const draft = value as DailyChecklistDraft

  return (
    typeof draft.barDate === 'string' &&
    Array.isArray(draft.items) &&
    typeof draft.notes === 'string' &&
    typeof draft.updatedAt === 'string'
  )
}

function isWeeklyCleaningDraft(value: unknown): value is WeeklyCleaningDraft {
  if (!value || typeof value !== 'object') {
    return false
  }

  const draft = value as WeeklyCleaningDraft

  return (
    typeof draft.weekStartDate === 'string' &&
    Array.isArray(draft.items) &&
    typeof draft.updatedAt === 'string'
  )
}

export function loadDailyChecklist(
  barDate: string,
  tasks: ChecklistTask[],
): DailyChecklistDraft {
  const storageKey = getDailyChecklistStorageKey(barDate)
  const storedDraft = getStorageItem(storageKey)
  const fallbackDraft = createEmptyDailyChecklist(barDate, tasks)

  if (!storedDraft) {
    return fallbackDraft
  }

  try {
    const parsedDraft = JSON.parse(storedDraft) as unknown

    if (!isDraft(parsedDraft)) {
      return fallbackDraft
    }

    return reconcileDailyChecklistWithTasks({
      barDate,
      workerId: parsedDraft.workerId ?? null,
      notes: parsedDraft.notes,
      submittedAt: parsedDraft.submittedAt ?? null,
      updatedAt: parsedDraft.updatedAt,
      items: parsedDraft.items.map((item) => normalizeChecklistItem(item)),
    }, tasks)
  } catch {
    return fallbackDraft
  }
}

export function saveDailyChecklist(draft: DailyChecklistDraft) {
  setStorageItem(
    getDailyChecklistStorageKey(draft.barDate),
    JSON.stringify(draft),
  )
}

export function getAllLocalDailyChecklists(): DailyChecklistDraft[] {
  const drafts: DailyChecklistDraft[] = []

  let storageLength: number

  try {
    storageLength = window.localStorage.length
  } catch {
    return drafts
  }

  for (let index = 0; index < storageLength; index += 1) {
    const key = window.localStorage.key(index)

    if (!key?.startsWith('closelist_daily_close_')) {
      continue
    }

    const value = getStorageItem(key)

    if (!value) {
      continue
    }

    try {
      const parsedDraft = JSON.parse(value) as unknown

      if (isDraft(parsedDraft)) {
        drafts.push({
          ...parsedDraft,
          items: parsedDraft.items.map((item) => normalizeChecklistItem(item)),
        })
      }
    } catch {
      // Ignore invalid local drafts. A clean fallback is created on Today.
    }
  }

  return drafts.sort((firstDraft, secondDraft) =>
    secondDraft.barDate.localeCompare(firstDraft.barDate),
  )
}

export function getDailyChecklistsForRange(
  startDate: string,
  endDate: string,
): DailyChecklistDraft[] {
  return getAllLocalDailyChecklists().filter(
    (draft) => draft.barDate >= startDate && draft.barDate <= endDate,
  )
}

export function getDailyChecklistCompletionStats(draft: DailyChecklistDraft) {
  const completed = draft.items.filter((item) => normalizeChecklistItem(item).isCompleted).length
  const total = draft.items.length

  return {
    completed,
    total,
    isComplete: completed === total && total > 0,
  }
}

export function createEmptyWeeklyCleaningDraft(
  weekStartDate: string,
  tasks: ChecklistTask[],
): WeeklyCleaningDraft {
  return {
    weekStartDate,
    items: getActiveWeeklyCleaningTasks(tasks).map((task) => ({
      taskId: task.id,
      isCompleted: false,
      workerId: null,
    })),
    updatedAt: new Date().toISOString(),
  }
}

export function reconcileWeeklyCleaningWithTasks(
  draft: WeeklyCleaningDraft,
  tasks: ChecklistTask[],
): WeeklyCleaningDraft {
  const activeTasks = getActiveWeeklyCleaningTasks(tasks)
  const existingItems = new Map(draft.items.map((item) => [item.taskId, item]))
  const items = activeTasks.map((task) => {
    const existingItem = existingItems.get(task.id)

    return {
      taskId: task.id,
      isCompleted: existingItem?.isCompleted ?? false,
      workerId: existingItem?.workerId ?? null,
      completedAt: existingItem?.completedAt,
    }
  })
  const currentTaskIds = draft.items.map((item) => item.taskId).join('|')
  const nextTaskIds = items.map((item) => item.taskId).join('|')
  const didTaskSetChange = currentTaskIds !== nextTaskIds

  return {
    ...draft,
    items,
    updatedAt: didTaskSetChange ? new Date().toISOString() : draft.updatedAt,
  }
}

export function getWeeklyCleaningStorageKey(weekStartDate: string) {
  return `closelist_weekly_cleaning_${weekStartDate}`
}

export function loadWeeklyCleaningDraft(
  weekStartDate: string,
  tasks: ChecklistTask[],
): WeeklyCleaningDraft {
  const storageKey = getWeeklyCleaningStorageKey(weekStartDate)
  const storedDraft = getStorageItem(storageKey)
  const fallbackDraft = createEmptyWeeklyCleaningDraft(weekStartDate, tasks)

  if (!storedDraft) {
    return fallbackDraft
  }

  try {
    const parsedDraft = JSON.parse(storedDraft) as unknown

    if (!isWeeklyCleaningDraft(parsedDraft)) {
      return fallbackDraft
    }

    return reconcileWeeklyCleaningWithTasks({
      weekStartDate,
      updatedAt: parsedDraft.updatedAt,
      items: parsedDraft.items,
    }, tasks)
  } catch {
    return fallbackDraft
  }
}

export function saveWeeklyCleaningDraft(draft: WeeklyCleaningDraft) {
  setStorageItem(
    getWeeklyCleaningStorageKey(draft.weekStartDate),
    JSON.stringify(draft),
  )
}

export function getWeeklyCleaningStats(draft: WeeklyCleaningDraft) {
  const completed = draft.items.filter((item) => item.isCompleted).length
  const total = draft.items.length

  return {
    completed,
    total,
    isComplete: completed === total && total > 0,
  }
}
