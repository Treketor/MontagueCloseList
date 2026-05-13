import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  ClipboardCheck,
  ClipboardList,
  Sparkles,
  Stethoscope,
  UsersRound,
} from 'lucide-react'
import AppModal from '../components/AppModal'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import SettingsCard from '../components/SettingsCard'
import StatusMessage from '../components/StatusMessage'
import DiagnosticsPanel from '../components/manage/DiagnosticsPanel'
import TaskCleanupManager from '../components/manage/TaskCleanupManager'
import TaskTypeManager from '../components/manage/TaskTypeManager'
import WorkersManager from '../components/manage/WorkersManager'
import { verifyManagerCodeStatus } from '../lib/managerAccess'
import type { ChecklistTask, TaskSection, TaskType, Worker } from '../types'

type ManageTasksPageProps = {
  onCreateWorker: (name: string) => Promise<Worker | null> | Worker | null
  onDeleteTask: (taskId: string) => Promise<void> | void
  onDeleteWorker: (workerId: string) => Promise<boolean> | boolean
  onRefreshCloudData: () => Promise<void> | void
  onSaveTasks: (tasks: ChecklistTask[]) => Promise<void> | void
  onSaveWorker: (worker: Worker) => Promise<boolean> | boolean
  setupDataStatus: string
  tasks: ChecklistTask[]
  workers: Worker[]
}

type ManageModal =
  | 'workers'
  | 'daily'
  | 'weekly'
  | 'cleanup'
  | 'diagnostics'
  | null

const sections: TaskSection[] = [
  'Bar',
  'Floor',
  'Stock',
  'Cleaning',
  'Admin',
  'Other',
]
const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Delete']
const managerCodeLength = 4

function ManageTasksPage({
  onDeleteTask,
  onDeleteWorker,
  onCreateWorker,
  onRefreshCloudData,
  onSaveTasks,
  onSaveWorker,
  setupDataStatus,
  tasks,
  workers,
}: ManageTasksPageProps) {
  const [code, setCode] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [activeModal, setActiveModal] = useState<ManageModal>(null)

  const verifyCode = useCallback(async () => {
    if (isVerifyingCode || code.length !== managerCodeLength) {
      return
    }

    setIsVerifyingCode(true)
    setUnlockError('')

    try {
      const verificationResult = await verifyManagerCodeStatus(code)

      if (verificationResult === 'valid') {
        setIsUnlocked(true)
        setUnlockError('')
        return
      }

      setUnlockError(
        verificationResult === 'invalid'
          ? 'Incorrect manager code.'
          : 'Could not verify manager code.',
      )
      setCode('')
    } catch {
      setUnlockError('Could not verify manager code.')
      setCode('')
    } finally {
      setIsVerifyingCode(false)
    }
  }, [code, isVerifyingCode])

  useEffect(() => {
    if (code.length === managerCodeLength && !isVerifyingCode) {
      void verifyCode()
    }
  }, [code, isVerifyingCode, verifyCode])

  function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void verifyCode()
  }

  function handleKeypadInput(key: string) {
    if (isVerifyingCode) {
      return
    }

    setUnlockError('')

    if (key === 'Clear') {
      setCode('')
      return
    }

    if (key === 'Delete') {
      setCode((currentCode) => currentCode.slice(0, -1))
      return
    }

    setCode((currentCode) =>
      currentCode.length >= managerCodeLength ? currentCode : `${currentCode}${key}`,
    )
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void verifyCode()
      return
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      handleKeypadInput('Delete')
      return
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      handleKeypadInput(event.key)
    }
  }

  if (!isUnlocked) {
    return (
      <div className="grid gap-4">
        <div className="mx-auto w-full max-w-lg">
          <SectionCard>
            <form
              className="mx-auto grid max-w-xs gap-4 py-1"
              onKeyDown={handleKeyDown}
              onSubmit={handleUnlock}
            >
              <div>
                <p className="mb-3 text-center text-base font-bold text-[#6F6A63]">
                  Manager code
                </p>
                <div className="flex min-h-10 items-center justify-center px-4">
                  <p
                    aria-label={`${code.length} digits entered`}
                    className="sr-only"
                  >
                    {code ? '*'.repeat(code.length) : 'empty'}
                  </p>
                  <div className="flex gap-3" aria-hidden="true">
                    {Array.from({ length: managerCodeLength }, (_, index) => (
                      <span
                        className={[
                          'h-3.5 w-3.5 rounded-full border',
                          index < code.length
                            ? 'border-[#1F1D1A] bg-[#1F1D1A]'
                            : 'border-[#CFC7BC] bg-transparent',
                        ].join(' ')}
                        key={index}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {unlockError ? (
                <StatusMessage tone="warning">{unlockError}</StatusMessage>
              ) : isVerifyingCode ? (
                <div className="min-h-14 rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-4 text-center text-base font-semibold text-[#6F6A63]">
                  Checking...
                </div>
              ) : (
                <div className="min-h-14 rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-4 text-center text-base font-semibold text-[#6F6A63]">
                  Enter the manager code to edit tasks.
                </div>
              )}

              <div className="grid grid-cols-3 justify-items-center gap-3">
                {keypadKeys.map((key) => {
                  const isUtilityKey = key === 'Clear' || key === 'Delete'

                  return (
                    <button
                      className={[
                        'flex h-16 w-20 items-center justify-center rounded-2xl border font-extrabold focus:outline-none',
                        isUtilityKey
                          ? 'border-transparent bg-transparent text-sm text-[#6F6A63] active:bg-[#EFE8DD]'
                          : 'border-[#DED8CF] bg-[#F7F4EF] text-2xl text-[#1F1D1A] active:bg-[#EFE8DD]',
                      ].join(' ')}
                      disabled={isVerifyingCode}
                      key={key}
                      onClick={() => handleKeypadInput(key)}
                      type="button"
                    >
                      {key}
                    </button>
                  )
                })}
              </div>
            </form>
          </SectionCard>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        description="Update workers, checklist tasks, and sync tools."
        title="Manage"
      />

      <div className="grid gap-3 md:grid-cols-2">
        <SettingsCard
          description="Add, edit, or hide staff members."
          icon={<UsersRound aria-hidden="true" className="h-6 w-6" />}
          onClick={() => setActiveModal('workers')}
          title="Workers"
        />
        <SettingsCard
          description="Manage the daily closing checklist."
          icon={<ClipboardCheck aria-hidden="true" className="h-6 w-6" />}
          onClick={() => setActiveModal('daily')}
          title="Daily Close Tasks"
        />
        <SettingsCard
          description="Manage weekly cleaning tasks."
          icon={<Sparkles aria-hidden="true" className="h-6 w-6" />}
          onClick={() => setActiveModal('weekly')}
          title="Weekly Cleaning Tasks"
        />
        <SettingsCard
          description="Find duplicates and manage presets."
          icon={<ClipboardList aria-hidden="true" className="h-6 w-6" />}
          onClick={() => setActiveModal('cleanup')}
          title="Task Cleanup"
        />
        <SettingsCard
          description="Check sync status and local cache."
          icon={<Stethoscope aria-hidden="true" className="h-6 w-6" />}
          onClick={() => setActiveModal('diagnostics')}
          title="Diagnostics"
        />
      </div>

      <AppModal
        description="Add, edit, or hide staff members."
        isOpen={activeModal === 'workers'}
        onClose={() => setActiveModal(null)}
        title="Workers"
      >
        <WorkersManager
          onCreateWorker={onCreateWorker}
          onDeleteWorker={onDeleteWorker}
          onSaveWorker={onSaveWorker}
          workers={workers}
        />
      </AppModal>

      <AppModal
        description="Manage the daily closing checklist."
        isOpen={activeModal === 'daily'}
        onClose={() => setActiveModal(null)}
        size="lg"
        title="Daily Close Tasks"
      >
        <TaskTypeManager
          onDeleteTask={onDeleteTask}
          onSaveTasks={onSaveTasks}
          sections={sections}
          taskType={'daily_closing' as TaskType}
          tasks={tasks}
        />
      </AppModal>

      <AppModal
        description="Manage weekly cleaning tasks."
        isOpen={activeModal === 'weekly'}
        onClose={() => setActiveModal(null)}
        size="lg"
        title="Weekly Cleaning Tasks"
      >
        <TaskTypeManager
          onDeleteTask={onDeleteTask}
          onSaveTasks={onSaveTasks}
          sections={sections}
          taskType={'weekly_cleaning' as TaskType}
          tasks={tasks}
        />
      </AppModal>

      <AppModal
        description="Find duplicates and manage starter presets."
        isOpen={activeModal === 'cleanup'}
        onClose={() => setActiveModal(null)}
        size="lg"
        title="Task Cleanup"
      >
        <TaskCleanupManager onSaveTasks={onSaveTasks} tasks={tasks} />
      </AppModal>

      <AppModal
        description="Check sync status and local cache."
        isOpen={activeModal === 'diagnostics'}
        onClose={() => setActiveModal(null)}
        size="lg"
        title="Diagnostics"
      >
        <DiagnosticsPanel
          onRefreshCloudData={onRefreshCloudData}
          setupDataStatus={setupDataStatus}
        />
      </AppModal>
    </div>
  )
}

export default ManageTasksPage
