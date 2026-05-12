import { useState, type FormEvent } from 'react'
import { Plus, UserRound } from 'lucide-react'
import type { Worker } from '../types'

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
  const [isAddingWorker, setIsAddingWorker] = useState(false)
  const [isChangingWorker, setIsChangingWorker] = useState(false)
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
      setIsAddingWorker(false)
      setIsChangingWorker(false)
    } finally {
      setIsCreating(false)
    }
  }

  const showWorkerGrid = !selectedWorker || isChangingWorker

  return (
    <section className="rounded-2xl border border-[#DED8CF] bg-[#FFFCF7] p-3 shadow-[0_1px_2px_rgba(31,29,26,0.04)]">
      <div className="mb-2">
        <h3 className="text-base font-extrabold leading-tight tracking-normal text-[#1F1D1A]">
          {selectedWorker ? 'Worker' : 'Select worker'}
        </h3>
      </div>

      <div className="grid gap-2">
        {selectedWorker && !showWorkerGrid ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#DED8CF] bg-[#F7F4EF] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <UserRound aria-hidden="true" className="h-5 w-5 shrink-0 text-[#6F6A63]" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-[#6F6A63]">
                  Closing as
                </p>
                <p className="truncate text-xl font-extrabold leading-tight text-[#1F1D1A]">
                  {selectedWorker.name}
                </p>
              </div>
            </div>
            <button
              className="min-h-11 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] px-5 text-base font-bold text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7] active:bg-[#EFE8DD]"
              onClick={() => {
                onSelectWorker(null)
                setIsChangingWorker(true)
                setError('')
              }}
              type="button"
            >
              Change
            </button>
          </div>
        ) : null}

        {showWorkerGrid ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {workers.map((worker) => (
              <button
                className="min-h-11 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] px-3 text-base font-bold leading-tight text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7] active:bg-[#EFE8DD]"
                key={worker.id}
                onClick={() => {
                  onSelectWorker(worker.id)
                  setIsChangingWorker(false)
                  setIsAddingWorker(false)
                  setError('')
                }}
                type="button"
              >
                {worker.name}
              </button>
            ))}

            <button
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1F1D1A] bg-[#1F1D1A] px-3 text-base font-bold leading-tight text-[#FFFCF7] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7] active:bg-[#3A352F]"
              onClick={() => {
                setIsAddingWorker(true)
                setError('')
              }}
              type="button"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add Worker
            </button>
          </div>
        ) : null}

        {isAddingWorker ? (
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={handleSubmit}>
            <input
              autoFocus
              className="min-h-12 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] px-4 text-lg text-[#1F1D1A] placeholder:text-[#6F6A63] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]"
              disabled={isCreating}
              onChange={(event) => setNewWorkerName(event.target.value)}
              placeholder="Worker name"
              type="text"
              value={newWorkerName}
            />
            <button
              className="min-h-12 rounded-xl border border-[#1F1D1A] bg-[#1F1D1A] px-5 text-lg font-bold text-[#FFFCF7] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7] disabled:border-[#DED8CF] disabled:bg-[#EFE8DD] disabled:text-[#6F6A63]"
              disabled={!canAddWorker || isCreating}
              type="submit"
            >
              {isCreating ? 'Adding...' : 'Add'}
            </button>
            <button
              className="min-h-12 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] px-5 text-lg font-bold text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7] active:bg-[#EFE8DD]"
              disabled={isCreating}
              onClick={() => {
                setIsAddingWorker(false)
                setNewWorkerName('')
                setError('')
              }}
              type="button"
            >
              Cancel
            </button>
          </form>
        ) : null}

        {trimmedName && hasDuplicateName ? (
          <p className="text-base font-semibold text-[#6F6A63]">
            That worker already exists.
          </p>
        ) : null}
        {error ? (
          <p className="text-base font-semibold text-[#6F6A63]">{error}</p>
        ) : null}
      </div>
    </section>
  )
}

export default WorkerSelector
