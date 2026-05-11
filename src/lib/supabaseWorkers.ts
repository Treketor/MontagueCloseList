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
    const workersByName = new Map(
      existingWorkers.map((worker) => [worker.name.toLowerCase(), worker]),
    )

    for (const worker of localWorkers) {
      const trimmedName = worker.name.trim()

      if (!trimmedName || workersByName.has(trimmedName.toLowerCase())) {
        continue
      }

      const createdWorker = await createWorkerInSupabase(trimmedName)

      if (createdWorker) {
        workersByName.set(createdWorker.name.toLowerCase(), createdWorker)
      }
    }

    const finalWorkers = await fetchWorkersFromSupabase()

    return finalWorkers.length > 0 ? finalWorkers : localWorkers
  } catch (error) {
    warn('Unable to sync workers to Supabase.', error)
    return localWorkers
  }
}
