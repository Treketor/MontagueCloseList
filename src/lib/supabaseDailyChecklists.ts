import type { DailyChecklistDraft } from '../types'
import type {
  ClosingChecklistItemInsert,
  ClosingChecklistItemRow,
  ClosingChecklistRow,
} from '../types.supabase'
import { isUuid } from './ids'
import { isSupabaseConfigured, supabase } from './supabase'

function warn(message: string, detail?: unknown) {
  if (import.meta.env.DEV) {
    console.warn(message, detail)
  }
}

function mapRowsToDraft(
  checklist: ClosingChecklistRow,
  items: ClosingChecklistItemRow[],
): DailyChecklistDraft {
  return {
    barDate: checklist.bar_date,
    workerId: checklist.worker_id,
    notes: checklist.notes ?? '',
    submittedAt: checklist.submitted_at,
    updatedAt: checklist.updated_at,
    items: items.map((item) => ({
      taskId: item.task_id,
      isCompleted: item.is_completed,
      completedAt: item.completed_at ?? undefined,
    })),
  }
}

export async function fetchClosingChecklistByBarDate(
  barDate: string,
): Promise<DailyChecklistDraft | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  const { data: checklist, error: checklistError } = await supabase
    .from('closing_checklists')
    .select('*')
    .eq('bar_date', barDate)
    .maybeSingle()

  if (checklistError) {
    warn('Unable to fetch closing checklist.', checklistError.message)
    return null
  }

  if (!checklist) {
    return null
  }

  const { data: items, error: itemsError } = await supabase
    .from('closing_checklist_items')
    .select('*')
    .eq('checklist_id', (checklist as ClosingChecklistRow).id)

  if (itemsError) {
    warn('Unable to fetch closing checklist items.', itemsError.message)
    return null
  }

  return mapRowsToDraft(
    checklist as ClosingChecklistRow,
    (items ?? []) as ClosingChecklistItemRow[],
  )
}

export async function upsertClosingChecklistToSupabase(
  draft: DailyChecklistDraft,
): Promise<DailyChecklistDraft | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  const validItemRows = draft.items
    .filter((item) => isUuid(item.taskId))
    .map((item) => ({
      taskId: item.taskId,
      isCompleted: item.isCompleted,
      completedAt: item.completedAt ?? null,
    }))

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'closelist_save_daily_close',
    {
      checklist_bar_date_text: draft.barDate,
      checklist_worker_id_text: isUuid(draft.workerId) ? draft.workerId : null,
      checklist_notes: draft.notes,
      checklist_submitted_at_text: draft.submittedAt,
      checklist_items: validItemRows,
    },
  )

  if (!rpcError && rpcData === true) {
    return {
      ...draft,
      workerId: isUuid(draft.workerId) ? draft.workerId : null,
      items: draft.items.filter((item) => isUuid(item.taskId)),
      updatedAt: new Date().toISOString(),
    }
  }

  if (rpcError) {
    warn(
      'Unable to upsert closing checklist with Supabase RPC. Trying fallback upsert.',
      rpcError.message,
    )
  }

  const { data: checklist, error: checklistError } = await supabase
    .from('closing_checklists')
    .upsert(
      {
        bar_date: draft.barDate,
        worker_id: isUuid(draft.workerId) ? draft.workerId : null,
        notes: draft.notes,
        submitted_at: draft.submittedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'bar_date' },
    )
    .select('*')
    .single()

  if (checklistError || !checklist) {
    warn(
      'Unable to upsert closing checklist.',
      checklistError?.message ?? 'No checklist returned.',
    )
    return null
  }

  const checklistRow = checklist as ClosingChecklistRow
  const itemRows: ClosingChecklistItemInsert[] = draft.items
    .filter((item) => isUuid(item.taskId))
    .map((item) => ({
      checklist_id: checklistRow.id,
      task_id: item.taskId,
      is_completed: item.isCompleted,
      completed_at: item.completedAt ?? null,
    }))

  if (itemRows.length !== draft.items.length) {
    warn(
      'Skipped daily checklist items with local-only task IDs. Refresh cloud data before completing those tasks.',
    )
  }

  if (itemRows.length === 0) {
    return mapRowsToDraft(checklistRow, [])
  }

  const { error: itemsError } = await supabase
    .from('closing_checklist_items')
    .upsert(itemRows, { onConflict: 'checklist_id,task_id' })

  if (itemsError) {
    warn('Unable to upsert closing checklist items.', itemsError.message)
    return null
  }

  return mapRowsToDraft(checklistRow, itemRows.map((item) => ({
    id: '',
    checklist_id: checklistRow.id,
    task_id: item.task_id,
    is_completed: item.is_completed,
    completed_at: item.completed_at ?? null,
  })))
}

export async function fetchClosingChecklistsForRangeFromSupabase(
  startDate: string,
  endDate: string,
): Promise<DailyChecklistDraft[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data: checklists, error: checklistsError } = await supabase
    .from('closing_checklists')
    .select('*')
    .gte('bar_date', startDate)
    .lte('bar_date', endDate)
    .order('bar_date', { ascending: false })

  if (checklistsError) {
    warn('Unable to fetch closing checklist range.', checklistsError.message)
    throw checklistsError
  }

  const checklistRows = (checklists ?? []) as ClosingChecklistRow[]

  if (checklistRows.length === 0) {
    return []
  }

  const checklistIds = checklistRows.map((checklist) => checklist.id)
  const { data: items, error: itemsError } = await supabase
    .from('closing_checklist_items')
    .select('*')
    .in('checklist_id', checklistIds)

  if (itemsError) {
    warn('Unable to fetch closing checklist range items.', itemsError.message)
    throw itemsError
  }

  const itemRows = (items ?? []) as ClosingChecklistItemRow[]

  return checklistRows.map((checklist) =>
    mapRowsToDraft(
      checklist,
      itemRows.filter((item) => item.checklist_id === checklist.id),
    ),
  )
}
