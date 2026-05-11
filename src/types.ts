export type Worker = {
  id: string
  name: string
}

export type TaskType = 'daily_closing' | 'weekly_cleaning'

export type TaskSection =
  | 'Bar'
  | 'Floor'
  | 'Stock'
  | 'Cleaning'
  | 'Admin'
  | 'Other'

export type ChecklistTask = {
  id: string
  title: string
  description?: string
  section: TaskSection
  taskType: TaskType
  sortOrder: number
  isActive: boolean
}

export type ChecklistItemState = {
  taskId: string
  isCompleted: boolean
  completedAt?: string
}

export type DailyChecklistDraft = {
  barDate: string
  workerId: string | null
  items: ChecklistItemState[]
  notes: string
  submittedAt: string | null
  updatedAt: string
}

export type WeeklyCleaningItemState = {
  taskId: string
  isCompleted: boolean
  workerId: string | null
  completedAt?: string
}

export type WeeklyCleaningDraft = {
  weekStartDate: string
  items: WeeklyCleaningItemState[]
  updatedAt: string
}
