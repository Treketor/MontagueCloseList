import { useState, type FormEvent } from 'react'
import type { Worker } from '../types'
import PrimaryButton from './PrimaryButton'

type WorkerSelectorProps = {
  workers: Worker[]
  selectedWorkerId: string | null
  onCreateWorker: (name: string) => Promise<Worker | null> | Worker | null
  onSelectWorker: (workerId: string | null) => void
}

function WorkerSelector({
  workers,
  selectedWorkerId,
  onCreateWorker,
  onSelectWorker,
}: WorkerSelectorProps) {
  const [newWorkerName, setNewWorkerName] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const selectedWorker = workers.find((worker) => worker.id === selectedWorkerId)
  const trimmedName = newWorkerName.trim()
  const hasDuplicateName = workers.some(
    (worker) => worker.name.toLowerCase() === trimmedName.toLowerCase(),
  )
  const canAddWorker = trimmedName.length > 0 && !hasDuplicateName

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canAddWorker) {
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const worker = await onCreateWorker(trimmedName)

      if (!worker) {
        setError('Unable to add worker.')
        return
      }

      onSelectWorker(worker.id)
      setNewWorkerName('')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <section className="rounded-md border border-neutral-800 bg-black p-5">
      <div className="mb-5">
        <h3 className="text-2xl font-semibold leading-tight tracking-normal">
          Closing Worker
        </h3>
        <p className="mt-2 text-xl leading-relaxed text-neutral-300">
          {selectedWorker
            ? `${selectedWorker.name} is selected for this close.`
            : 'Select who is closing before starting the checklist.'}
        </p>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2 text-lg font-semibold">
          Worker
          <select
            className="min-h-14 rounded-md border border-neutral-700 bg-black px-4 text-xl text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
            onChange={(event) => onSelectWorker(event.target.value || null)}
            value={selectedWorkerId ?? ''}
          >
            <option value="">Select worker</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
        </label>

        <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-lg font-semibold">
            Add Worker
            <input
              className="min-h-14 rounded-md border border-neutral-700 bg-black px-4 text-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              disabled={isCreating}
              onChange={(event) => setNewWorkerName(event.target.value)}
              placeholder="Worker name"
              type="text"
              value={newWorkerName}
            />
          </label>
          <div className="flex items-end">
            <PrimaryButton
              className="w-full sm:w-auto"
              disabled={!canAddWorker || isCreating}
              type="submit"
            >
              {isCreating ? 'Adding...' : 'Add'}
            </PrimaryButton>
          </div>
        </form>

        {trimmedName && hasDuplicateName ? (
          <p className="text-lg font-medium text-neutral-300">
            That worker already exists.
          </p>
        ) : null}
        {error ? (
          <p className="text-lg font-medium text-neutral-300">{error}</p>
        ) : null}
      </div>
    </section>
  )
}

export default WorkerSelector
