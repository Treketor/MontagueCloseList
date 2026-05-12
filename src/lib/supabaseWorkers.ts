import type { Worker } from '../types'
import type { WorkerRow } from '../types.supabase'
import { isSupabaseConfigured, supabase } from './supabase'

function warn(message: string, detail?: unknown) {
  if (import.meta.env.DEV) {
    console.warn(message, detail)
  }
}

function mapWorkerRow(row: WorkerRow): Worker {
  return {
    id: row.id,
    name: row.name,
  }
}

export async function fetchWorkersFromSupabase(): Promise<Worker[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    warn('Unable to fetch workers from Supabase.', error.message)
    return []
  }

  return ((data ?? []) as WorkerRow[]).map(mapWorkerRow)
}

export async function createWorkerInSupabase(
  name: string,
): Promise<Worker | null> {
  const trimmedName = name.trim()

  if (!trimmedName || !isSupabaseConfigured || !supabase) {
    return null
  }

  const existingWorkers = await fetchWorkersFromSupabase()
  const matchingWorker = existingWorkers.find(
    (worker) => worker.name.toLowerCase() === trimmedName.toLowerCase(),
  )

  if (matchingWorker) {
    return matchingWorker
  }

  const { data, error } = await supabase
    .from('workers')
    .insert({ name: trimmedName })
    .select('*')
    .single()

  if (error) {
    warn('Unable to create worker in Supabase.', error.message)
    return null
  }

  return data ? mapWorkerRow(data as WorkerRow) : null
}

export async function syncWorkersToSupabase(
  localWorkers: Worker[],
): Promise<Worker[]> {
  if (!isSupabaseConfigured || !supabase) {
    return localWorkers
  }

  try {
    const existingWorkers = await fetchWorkersFromSupabase()

    return existingWorkers
  } catch (error) {
    warn('Unable to sync workers to Supabase.', error)
    return localWorkers
  }
}

export async function updateWorkerInSupabase(
  worker: Worker,
): Promise<Worker | null> {
  const trimmedName = worker.name.trim()

  if (!trimmedName || !isSupabaseConfigured || !supabase) {
    return null
  }

  const existingWorkers = await fetchWorkersFromSupabase()
  const matchingWorker = existingWorkers.find(
    (existingWorker) =>
      existingWorker.id !== worker.id &&
      existingWorker.name.toLowerCase() === trimmedName.toLowerCase(),
  )

  if (matchingWorker) {
    warn('Unable to update worker. Duplicate worker name.', trimmedName)
    return null
  }

  const { data, error } = await supabase
    .from('workers')
    .update({ name: trimmedName })
    .eq('id', worker.id)
    .select('*')
    .single()

  if (error) {
    warn('Unable to update worker in Supabase.', error.message)
    return null
  }

  return data ? mapWorkerRow(data as WorkerRow) : null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export async function deleteWorkerFromSupabase(worker: Worker): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return true
  }

  const supabaseClient = supabase
  const existingWorkers = await fetchWorkersFromSupabase()
  const matchingWorker = existingWorkers.find(
    (existingWorker) =>
      existingWorker.id === worker.id ||
      existingWorker.name.toLowerCase() === worker.name.trim().toLowerCase(),
  )
  const workerIdToDelete =
    matchingWorker?.id ?? (isUuid(worker.id) ? worker.id : '')

  if (!workerIdToDelete) {
    return true
  }

  const { data: rpcDeletedWorker, error: rpcDeleteError } =
    await supabaseClient.rpc('delete_worker', {
      worker_id_to_delete: workerIdToDelete,
    })

  if (!rpcDeleteError && rpcDeletedWorker === true) {
    return true
  }

  if (rpcDeleteError) {
    warn('Unable to delete worker with Supabase RPC. Trying fallback delete.', rpcDeleteError.message)
  }

  const deleteWorker = async () =>
    supabaseClient
      .from('workers')
      .delete()
      .eq('id', workerIdToDelete)
      .select('id')

  const firstDeleteResult = await deleteWorker()

  if (
    !firstDeleteResult.error &&
    firstDeleteResult.data &&
    firstDeleteResult.data.length > 0
  ) {
    return true
  }

  const workersAfterFirstDelete = await fetchWorkersFromSupabase()
  const workerStillExists = workersAfterFirstDelete.some(
    (existingWorker) =>
      existingWorker.id === workerIdToDelete ||
      existingWorker.name.toLowerCase() === worker.name.trim().toLowerCase(),
  )

  if (!workerStillExists) {
    return true
  }

  const { error: closingChecklistUpdateError } = await supabase
    .from('closing_checklists')
    .update({ worker_id: null })
    .eq('worker_id', workerIdToDelete)

  if (closingChecklistUpdateError) {
    warn(
      'Unable to clear daily checklist worker references before deleting worker.',
      closingChecklistUpdateError.message,
    )
    return false
  }

  const { error: weeklyCleaningUpdateError } = await supabase
    .from('weekly_cleaning_items')
    .update({ worker_id: null })
    .eq('worker_id', workerIdToDelete)

  if (weeklyCleaningUpdateError) {
    warn(
      'Unable to clear weekly cleaning worker references before deleting worker.',
      weeklyCleaningUpdateError.message,
    )
    return false
  }

  const { data, error } = await deleteWorker()

  if (error || !data || data.length === 0) {
    warn(
      'Unable to delete worker from Supabase.',
      error?.message ?? 'No worker rows were deleted.',
    )

    const remainingWorkers = await fetchWorkersFromSupabase()
    const stillExists = remainingWorkers.some(
      (existingWorker) =>
        existingWorker.id === workerIdToDelete ||
        existingWorker.name.toLowerCase() === worker.name.trim().toLowerCase(),
    )

    return !stillExists
  }

  return true
}
