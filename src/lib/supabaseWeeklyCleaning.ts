import type { WeeklyCleaningDraft } from '../types'
import type {
  WeeklyCleaningItemInsert,
  WeeklyCleaningItemRow,
  WeeklyCleaningRunRow,
} from '../types.supabase'
import { isSupabaseConfigured, supabase } from './supabase'

function warn(message: string, detail?: unknown) {
  if (import.meta.env.DEV) {
    console.warn(message, detail)
  }
}

function mapRowsToDraft(
  run: WeeklyCleaningRunRow,
  items: WeeklyCleaningItemRow[],
): WeeklyCleaningDraft {
  return {
    weekStartDate: run.week_start_date,
    updatedAt: run.updated_at,
    items: items.map((item) => ({
      taskId: item.task_id,
      isCompleted: item.is_completed,
      workerId: item.worker_id,
      completedAt: item.completed_at ?? undefined,
    })),
  }
}

export async function fetchWeeklyCleaningDraft(
  weekStartDate: string,
): Promise<WeeklyCleaningDraft | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  const { data: run, error: runError } = await supabase
    .from('weekly_cleaning_runs')
    .select('*')
    .eq('week_start_date', weekStartDate)
    .maybeSingle()

  if (runError) {
    warn('Unable to fetch weekly cleaning run.', runError.message)
    return null
  }

  if (!run) {
    return null
  }

  const { data: items, error: itemsError } = await supabase
    .from('weekly_cleaning_items')
    .select('*')
    .eq('weekly_run_id', (run as WeeklyCleaningRunRow).id)

  if (itemsError) {
    warn('Unable to fetch weekly cleaning items.', itemsError.message)
    return null
  }

  return mapRowsToDraft(
    run as WeeklyCleaningRunRow,
    (items ?? []) as WeeklyCleaningItemRow[],
  )
}

export async function upsertWeeklyCleaningDraftToSupabase(
  draft: WeeklyCleaningDraft,
): Promise<WeeklyCleaningDraft | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  const { data: run, error: runError } = await supabase
    .from('weekly_cleaning_runs')
    .upsert(
      {
        week_start_date: draft.weekStartDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'week_start_date' },
    )
    .select('*')
    .single()

  if (runError || !run) {
    warn(
      'Unable to upsert weekly cleaning run.',
      runError?.message ?? 'No weekly run returned.',
    )
    return null
  }

  const runRow = run as WeeklyCleaningRunRow
  const itemRows: WeeklyCleaningItemInsert[] = draft.items.map((item) => ({
    weekly_run_id: runRow.id,
    task_id: item.taskId,
    is_completed: item.isCompleted,
    worker_id: item.workerId,
    completed_at: item.completedAt ?? null,
  }))

  const { error: itemsError } = await supabase
    .from('weekly_cleaning_items')
    .upsert(itemRows, { onConflict: 'weekly_run_id,task_id' })

  if (itemsError) {
    warn('Unable to upsert weekly cleaning items.', itemsError.message)
    return null
  }

  return mapRowsToDraft(runRow, draft.items.map((item) => ({
    id: '',
    weekly_run_id: runRow.id,
    task_id: item.taskId,
    is_completed: item.isCompleted,
    worker_id: item.workerId,
    completed_at: item.completedAt ?? null,
  })))
}
