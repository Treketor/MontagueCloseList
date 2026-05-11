import type { Worker } from '../types'

export function getWorkerName(
  workers: Worker[],
  workerId: string | null | undefined,
) {
  if (!workerId) {
    return 'No worker selected'
  }

  return (
    workers.find((worker) => worker.id === workerId)?.name ?? 'No worker selected'
  )
}
