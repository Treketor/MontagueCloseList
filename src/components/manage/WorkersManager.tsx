import { useState, type FormEvent } from 'react'
import PrimaryButton from '../PrimaryButton'
import StatusMessage from '../StatusMessage'
import type { Worker } from '../../types'
import {
  darkButtonClass,
  inputClass,
  secondaryButtonClass,
} from './manageStyles'

type WorkersManagerProps = {
  onCreateWorker: (name: string) => Promise<Worker | null> | Worker | null
  onDeleteWorker: (workerId: string) => Promise<boolean> | boolean
  onSaveWorker: (worker: Worker) => Promise<boolean> | boolean
  workers: Worker[]
}

function WorkersManager({
  onCreateWorker,
  onDeleteWorker,
  onSaveWorker,
  workers,
}: WorkersManagerProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [workerName, setWorkerName] = useState('')
  const [workerError, setWorkerError] = useState('')
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null)
  const [editingWorkerName, setEditingWorkerName] = useState('')
  const [confirmingDeleteWorkerId, setConfirmingDeleteWorkerId] = useState<
    string | null
  >(null)

  function hasDuplicateWorkerName(name: string, ignoredWorkerId?: string) {
    const normalizedName = name.trim().toLowerCase()

    return workers.some(
      (worker) =>
        worker.id !== ignoredWorkerId &&
        worker.name.trim().toLowerCase() === normalizedName,
    )
  }

  async function addWorker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = workerName.trim()

    if (!trimmedName) {
      setWorkerError('Worker name is required.')
      return
    }

    if (hasDuplicateWorkerName(trimmedName)) {
      setWorkerError('A worker with this name already exists.')
      return
    }

    const createdWorker = await onCreateWorker(trimmedName)

    if (!createdWorker) {
      setWorkerError('Could not add worker.')
      return
    }

    setWorkerName('')
    setWorkerError('')
    setIsAdding(false)
  }

  function startEditingWorker(worker: Worker) {
    setWorkerError('')
    setConfirmingDeleteWorkerId(null)
    setEditingWorkerId(worker.id)
    setEditingWorkerName(worker.name)
  }

  async function saveWorkerEdit(worker: Worker) {
    const trimmedName = editingWorkerName.trim()

    if (!trimmedName) {
      setWorkerError('Worker name is required.')
      return
    }

    if (hasDuplicateWorkerName(trimmedName, worker.id)) {
      setWorkerError('A worker with this name already exists.')
      return
    }

    const didSave = await onSaveWorker({ ...worker, name: trimmedName })

    if (!didSave) {
      setWorkerError('Could not save worker.')
      return
    }

    setEditingWorkerId(null)
    setEditingWorkerName('')
    setWorkerError('')
  }

  async function deleteWorker(workerId: string) {
    const didDelete = await onDeleteWorker(workerId)

    if (!didDelete) {
      setWorkerError('Could not hide worker.')
      return
    }

    setConfirmingDeleteWorkerId(null)
    setWorkerError('')
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-[#6F6A63]">
          {workers.length} staff member{workers.length === 1 ? '' : 's'}
        </p>
        {!isAdding ? (
          <PrimaryButton onClick={() => setIsAdding(true)}>Add Worker</PrimaryButton>
        ) : null}
      </div>

      {isAdding ? (
        <form
          className="grid gap-3 rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
          onSubmit={addWorker}
        >
          <label className="grid gap-2 text-lg font-bold text-[#1F1D1A]">
            Worker name
            <input
              className={inputClass}
              onChange={(event) => setWorkerName(event.target.value)}
              placeholder="Worker name"
              value={workerName}
            />
          </label>
          <PrimaryButton type="submit">Save</PrimaryButton>
          <button
            className={secondaryButtonClass}
            onClick={() => {
              setIsAdding(false)
              setWorkerName('')
              setWorkerError('')
            }}
            type="button"
          >
            Cancel
          </button>
        </form>
      ) : null}

      {workerError ? <StatusMessage tone="warning">{workerError}</StatusMessage> : null}

      <ul className="grid gap-3">
        {workers.length === 0 ? (
          <li className="rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4 text-base font-semibold text-[#6F6A63]">
            No workers yet.
          </li>
        ) : null}

        {workers.map((worker) => {
          const isEditingWorker = editingWorkerId === worker.id
          const isConfirmingDelete = confirmingDeleteWorkerId === worker.id

          return (
            <li
              className="rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4"
              key={worker.id}
            >
              {isEditingWorker ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <label className="grid gap-2 text-lg font-bold text-[#1F1D1A]">
                    Worker name
                    <input
                      className={inputClass}
                      onChange={(event) =>
                        setEditingWorkerName(event.target.value)
                      }
                      value={editingWorkerName}
                    />
                  </label>
                  <button
                    className={darkButtonClass}
                    onClick={() => void saveWorkerEdit(worker)}
                    type="button"
                  >
                    Save
                  </button>
                  <button
                    className={secondaryButtonClass}
                    onClick={() => {
                      setEditingWorkerId(null)
                      setEditingWorkerName('')
                      setWorkerError('')
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <p className="text-xl font-semibold text-[#1F1D1A]">
                    {worker.name}
                  </p>
                  <button
                    className={secondaryButtonClass}
                    onClick={() => startEditingWorker(worker)}
                    type="button"
                  >
                    Edit
                  </button>
                  {isConfirmingDelete ? (
                    <div className="grid gap-3 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] p-3 sm:col-span-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <p className="text-lg font-bold text-[#1F1D1A]">
                        Hide this worker?
                      </p>
                      <button
                        className={secondaryButtonClass}
                        onClick={() => setConfirmingDeleteWorkerId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className={darkButtonClass}
                        onClick={() => void deleteWorker(worker.id)}
                        type="button"
                      >
                        Hide Worker
                      </button>
                    </div>
                  ) : (
                    <button
                      className={secondaryButtonClass}
                      onClick={() => {
                        setWorkerError('')
                        setEditingWorkerId(null)
                        setConfirmingDeleteWorkerId(worker.id)
                      }}
                      type="button"
                    >
                      Hide
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default WorkersManager
