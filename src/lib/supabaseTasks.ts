import type { ChecklistTask, TaskSection, TaskType } from '../types'
import type { TaskInsert, TaskRow } from '../types.supabase'
import { isSupabaseConfigured, supabase } from './supabase'

function warn(message: string, detail?: unknown) {
  if (import.meta.env.DEV) {
    console.warn(message, detail)
  }
}

function mapTaskRow(row: TaskRow): ChecklistTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    section: row.section as TaskSection,
    taskType: row.task_type as TaskType,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function mapTaskToInsert(task: ChecklistTask): TaskInsert {
  const insert: TaskInsert = {
    title: task.title,
    description: task.description ?? null,
    section: task.section,
    task_type: task.taskType,
    sort_order: task.sortOrder,
    is_active: task.isActive,
  }

  if (isUuid(task.id)) {
    insert.id = task.id
  }

  return insert
}

export async function fetchTasksFromSupabase(): Promise<ChecklistTask[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('task_type', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    warn('Unable to fetch tasks from Supabase.', error.message)
    return []
  }

  return ((data ?? []) as TaskRow[]).map(mapTaskRow)
}

export async function seedTasksToSupabaseIfEmpty(
  localTasks: ChecklistTask[],
): Promise<ChecklistTask[]> {
  if (!isSupabaseConfigured || !supabase) {
    return localTasks
  }

  const existingTasks = await fetchTasksFromSupabase()

  if (existingTasks.length > 0) {
    return existingTasks
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(localTasks.map(mapTaskToInsert))
    .select('*')

  if (error) {
    warn('Unable to seed tasks to Supabase.', error.message)
    return localTasks
  }

  return ((data ?? []) as TaskRow[]).map(mapTaskRow)
}

export async function saveTaskToSupabase(
  task: ChecklistTask,
): Promise<ChecklistTask | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('tasks')
    .upsert(mapTaskToInsert(task), { onConflict: 'id' })
    .select('*')
    .single()

  if (error) {
    warn('Unable to save task to Supabase.', error.message)
    return null
  }

  return data ? mapTaskRow(data as TaskRow) : null
}

export async function saveTasksToSupabase(
  tasks: ChecklistTask[],
): Promise<ChecklistTask[]> {
  if (!isSupabaseConfigured || !supabase) {
    return tasks
  }

  const { error } = await supabase
    .from('tasks')
    .upsert(tasks.map(mapTaskToInsert), { onConflict: 'id' })

  if (error) {
    warn('Unable to save tasks to Supabase.', error.message)
    return tasks
  }

  const savedTasks = await fetchTasksFromSupabase()

  return savedTasks.length > 0 ? savedTasks : tasks
}

async function findTaskIdsForDelete(task: ChecklistTask) {
  if (!supabase) {
    return []
  }

  if (isUuid(task.id)) {
    return [task.id]
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('title', task.title)
    .eq('task_type', task.taskType)
    .eq('section', task.section)

  if (error) {
    warn('Unable to find matching task rows to delete.', error.message)
    return []
  }

  return ((data ?? []) as Pick<TaskRow, 'id'>[]).map((row) => row.id)
}

export async function deleteTaskFromSupabase(task: ChecklistTask): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return true
  }

  const taskIds = await findTaskIdsForDelete(task)

  if (taskIds.length === 0) {
    warn('No matching Supabase task row found to delete.', task.id)
    return false
  }

  const { error: closingItemsError } = await supabase
    .from('closing_checklist_items')
    .delete()
    .in('task_id', taskIds)

  if (closingItemsError) {
    warn('Unable to delete closing checklist task items.', closingItemsError.message)
    return false
  }

  const { error: weeklyItemsError } = await supabase
    .from('weekly_cleaning_items')
    .delete()
    .in('task_id', taskIds)

  if (weeklyItemsError) {
    warn('Unable to delete weekly cleaning task items.', weeklyItemsError.message)
    return false
  }

  const { data: deletedTasks, error: taskError } = await supabase
    .from('tasks')
    .delete()
    .in('id', taskIds)
    .select('id')

  if (taskError || !deletedTasks || deletedTasks.length === 0) {
    warn(
      'Unable to delete task from Supabase.',
      taskError?.message ?? 'No task rows were deleted.',
    )
    return false
  }

  return true
}
