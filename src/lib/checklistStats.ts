import type {
  ChecklistItemState,
  ChecklistItemStatus,
  ChecklistTask,
  DailyChecklistDraft,
} from '../types'

export function getItemStatus(item?: ChecklistItemState): ChecklistItemStatus {
  if (!item) {
    return 'pending'
  }

  if (item.status === 'completed' || item.status === 'pending' || item.status === 'skipped') {
    return item.status
  }

  return item.isCompleted ? 'completed' : 'pending'
}

export function normalizeChecklistItem(item: ChecklistItemState): ChecklistItemState {
  const status = getItemStatus(item)

  if (status === 'completed') {
    return {
      taskId: item.taskId,
      isCompleted: true,
      status,
      completedAt: item.completedAt,
    }
  }

  if (status === 'skipped') {
    return {
      taskId: item.taskId,
      isCompleted: false,
      status,
      skipReason: item.skipReason?.trim() || undefined,
    }
  }

  return {
    taskId: item.taskId,
    isCompleted: false,
    status: 'pending',
  }
}

export function createPendingChecklistItem(taskId: string): ChecklistItemState {
  return {
    taskId,
    isCompleted: false,
    status: 'pending',
  }
}

export function isItemCompleted(item?: ChecklistItemState) {
  return getItemStatus(item) === 'completed'
}

export function isItemSkipped(item?: ChecklistItemState) {
  return getItemStatus(item) === 'skipped'
}

export function isItemResolved(item?: ChecklistItemState) {
  if (!item) {
    return false
  }

  if (isItemCompleted(item)) {
    return true
  }

  return isItemSkipped(item) && Boolean(item.skipReason?.trim())
}

export function getDailyChecklistStats(
  draft: DailyChecklistDraft,
  tasks: ChecklistTask[] = [],
) {
  const itemsByTaskId = new Map(draft.items.map((item) => [item.taskId, item]))
  const criticalTaskIds = new Set(
    tasks.filter((task) => task.isCritical).map((task) => task.id),
  )
  let completed = 0
  let skipped = 0
  let skippedWithoutReason = 0
  let pending = 0
  let criticalIssues = 0

  for (const item of draft.items) {
    const status = getItemStatus(item)

    if (status === 'completed') {
      completed += 1
      continue
    }

    if (status === 'skipped') {
      skipped += 1

      if (!item.skipReason?.trim()) {
        skippedWithoutReason += 1
      }

      if (criticalTaskIds.has(item.taskId)) {
        criticalIssues += 1
      }
      continue
    }

    pending += 1

    if (criticalTaskIds.has(item.taskId)) {
      criticalIssues += 1
    }
  }

  const resolved = completed + skipped - skippedWithoutReason
  const total = draft.items.length

  return {
    completed,
    skipped,
    skippedWithoutReason,
    pending,
    resolved,
    total,
    left: Math.max(total - resolved, 0),
    hasSkipped: skipped > 0,
    hasNotes: draft.notes.trim().length > 0,
    criticalIssues,
    canSubmit:
      total > 0 &&
      resolved === total &&
      skippedWithoutReason === 0 &&
      (!skipped || draft.notes.trim().length > 0),
    itemsByTaskId,
  }
}
