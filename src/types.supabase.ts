export type WorkerRow = {
  id: string
  name: string
  created_at?: string
  updated_at?: string
}

export type WorkerInsert = {
  id?: string
  name: string
}

export type WorkerUpdate = {
  name?: string
}

export type TaskRow = {
  id: string
  title: string
  description: string | null
  section: string
  task_type: string
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type TaskInsert = {
  id?: string
  title: string
  description?: string | null
  section: string
  task_type: string
  sort_order: number
  is_active: boolean
}

export type TaskUpdate = Partial<TaskInsert>

export type ClosingChecklistRow = {
  id: string
  bar_date: string
  worker_id: string | null
  notes: string | null
  submitted_at: string | null
  updated_at: string
  created_at?: string
}

export type ClosingChecklistInsert = {
  id?: string
  bar_date: string
  worker_id: string | null
  notes: string
  submitted_at: string | null
  updated_at: string
}

export type ClosingChecklistUpdate = Partial<ClosingChecklistInsert>

export type ClosingChecklistItemRow = {
  id: string
  checklist_id: string
  task_id: string
  is_completed: boolean
  completed_at: string | null
  created_at?: string
  updated_at?: string
}

export type ClosingChecklistItemInsert = {
  checklist_id: string
  task_id: string
  is_completed: boolean
  completed_at?: string | null
}

export type ClosingChecklistItemUpdate = Partial<ClosingChecklistItemInsert>

export type WeeklyCleaningRunRow = {
  id: string
  week_start_date: string
  updated_at: string
  created_at?: string
}

export type WeeklyCleaningRunInsert = {
  id?: string
  week_start_date: string
  updated_at: string
}

export type WeeklyCleaningRunUpdate = Partial<WeeklyCleaningRunInsert>

export type WeeklyCleaningItemRow = {
  id: string
  weekly_run_id: string
  task_id: string
  is_completed: boolean
  worker_id: string | null
  completed_at: string | null
  created_at?: string
  updated_at?: string
}

export type WeeklyCleaningItemInsert = {
  weekly_run_id: string
  task_id: string
  is_completed: boolean
  worker_id: string | null
  completed_at?: string | null
}

export type WeeklyCleaningItemUpdate = Partial<WeeklyCleaningItemInsert>
