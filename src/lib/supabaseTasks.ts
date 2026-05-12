import type { ChecklistTask, TaskSection, TaskType } from '../types'
import type { TaskInsert, TaskRow } from '../types.supabase'
import { isUuid } from './ids'
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

  const { data: rpcData, error: rpcError } = await supabase.rpc('closelist_upsert_task', {
    task_id: isUuid(task.id) ? task.id : null,
    task_title: task.title,
    task_description: task.description ?? null,
    task_section: task.section,
    task_type_value: task.taskType,
    task_sort_order: task.sortOrder,
    task_is_active: task.isActive,
  })

  if (!rpcError && rpcData) {
    return mapTaskRow(rpcData as TaskRow)
  }

  if (rpcError) {
    warn('Unable to save task with Supabase RPC. Trying fallback upsert.', rpcError.message)
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

  if (tasks.length === 0) {
    return fetchTasksFromSupabase()
  }

  for (const task of tasks) {
    const savedTask = await saveTaskToSupabase(task)

    if (!savedTask) {
      throw new Error(`Unable to save task "${task.title}" to Supabase.`)
    }
  }

  const savedTasks = await fetchTasksFromSupabase()

  return savedTasks
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

async function taskRowsStillExist(taskIds: string[]) {
  if (!supabase || taskIds.length === 0) {
    return false
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('id')
    .in('id', taskIds)

  if (error) {
    warn('Unable to verify deleted task rows.', error.message)
    return true
  }

  return (data ?? []).length > 0
}

export async function deleteTaskFromSupabase(task: ChecklistTask): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return true
  }

  const supabaseClient = supabase
  const taskIds = await findTaskIdsForDelete(task)

  if (taskIds.length === 0) {
    return true
  }

  const rpcResults = await Promise.all(
    taskIds.map((taskId) =>
      supabaseClient.rpc('delete_task', {
        task_id_to_delete: taskId,
      }),
    ),
  )
  const rpcHadError = rpcResults.some((result) => result.error)
  const rpcDeletedAllTasks = rpcResults.every((result) => result.data === true)

  if (!rpcHadError && rpcDeletedAllTasks) {
    return true
  }

  if (rpcHadError) {
    warn(
      'Unable to delete task with Supabase RPC. Trying fallback delete.',
      rpcResults.find((result) => result.error)?.error?.message,
    )
  }

  const deleteTasks = async () =>
    supabaseClient.from('tasks').delete().in('id', taskIds).select('id')

  const firstDeleteResult = await deleteTasks()

  if (
    !firstDeleteResult.error &&
    firstDeleteResult.data &&
    firstDeleteResult.data.length > 0
  ) {
    return true
  }

  if (!firstDeleteResult.error && !(await taskRowsStillExist(taskIds))) {
    return true
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

  const { data: deletedTasks, error: taskError } = await deleteTasks()

  if (taskError || !deletedTasks || deletedTasks.length === 0) {
    warn(
      'Unable to delete task from Supabase.',
      taskError?.message ?? 'No task rows were deleted.',
    )
    return !(await taskRowsStillExist(taskIds))
  }

  return true
}
