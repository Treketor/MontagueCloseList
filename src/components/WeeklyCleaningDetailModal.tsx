import { Check } from 'lucide-react'
import { formatReadableDate } from '../lib/date'
import { getWorkerName } from '../lib/workers'
import type {
  ChecklistTask,
  TaskSection,
  WeeklyCleaningDraft,
  Worker,
} from '../types'

type WeeklyCleaningDetailModalProps = {
  draft: WeeklyCleaningDraft | null
  onClose: () => void
  tasks: ChecklistTask[]
  workers: Worker[]
}

const sectionOrder: TaskSection[] = [
  'Bar',
  'Floor',
  'Stock',
  'Cleaning',
  'Admin',
  'Other',
]

function getGroupedTasks(
  tasks: ChecklistTask[],
  itemStates: Map<string, WeeklyCleaningDraft['items'][number]>,
) {
  const knownTaskIds = new Set(tasks.map((task) => task.id))
  const unknownTasks: ChecklistTask[] = Array.from(itemStates.keys())
    .filter((taskId) => !knownTaskIds.has(taskId))
    .map((taskId, index) => ({
      id: taskId,
      title: 'Unknown task',
      section: 'Other',
      taskType: 'weekly_cleaning',
      sortOrder: 100000 + index,
      isActive: false,
    }))
  const displayTasks = [...tasks, ...unknownTasks]

  return sectionOrder
    .map((section) => ({
      section,
      tasks: displayTasks
        .filter((task) => task.section === section && itemStates.has(task.id))
        .sort((firstTask, secondTask) => firstTask.sortOrder - secondTask.sortOrder),
    }))
    .filter((group) => group.tasks.length > 0)
}

function formatCompletedTime(completedAt: string) {
  return new Date(completedAt).toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function WeeklyCleaningDetailModal({
  draft,
  onClose,
  tasks,
  workers,
}: WeeklyCleaningDetailModalProps) {
  if (!draft) {
    return null
  }

  const itemStates = new Map(draft.items.map((item) => [item.taskId, item]))
  const groupedTasks = getGroupedTasks(tasks, itemStates)
  const weekEndDate = new Date(`${draft.weekStartDate}T00:00:00`)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekEndDateString = weekEndDate.toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 bg-[#1F1D1A]/70 p-4 sm:p-8">
      <div className="mx-auto flex max-h-full max-w-4xl flex-col rounded-2xl bg-[#FFFCF7] text-[#1F1D1A]">
        <div className="flex items-start justify-between gap-4 border-b border-[#DED8CF] p-5">
          <div>
            <p className="text-3xl font-extrabold leading-tight">
              Weekly cleaning
            </p>
            <p className="mt-2 text-xl font-semibold text-[#6F6A63]">
              {formatReadableDate(draft.weekStartDate)} - {formatReadableDate(weekEndDateString)}
            </p>
          </div>
          <button
            className="min-h-12 shrink-0 rounded-xl border border-[#1F1D1A] bg-[#1F1D1A] px-6 text-lg font-bold text-[#FFFCF7] active:bg-[#3A352F] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="grid gap-6 overflow-y-auto p-5">
          {groupedTasks.map((group) => (
            <section key={group.section}>
              <h3 className="mb-2 text-2xl font-extrabold">{group.section}</h3>
              <ul>
                {group.tasks.map((task) => {
                  const itemState = itemStates.get(task.id)
                  const isCompleted = itemState?.isCompleted ?? false

                  return (
                    <li
                      className="flex gap-4 border-b border-[#DED8CF] py-4"
                      key={task.id}
                    >
                      <span
                        className={[
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                          isCompleted
                            ? 'border-[#1F1D1A] bg-[#1F1D1A] text-[#FFFCF7]'
                            : 'border-[#DED8CF] bg-[#FFFCF7] text-[#6F6A63]',
                        ].join(' ')}
                      >
                        {isCompleted ? <Check className="h-5 w-5" /> : '-'}
                      </span>
                      <div>
                        <p className="text-xl font-bold leading-tight">
                          {task.title}
                        </p>
                        {task.description ? (
                          <p className="mt-2 text-lg leading-relaxed text-[#6F6A63]">
                            {task.description}
                          </p>
                        ) : null}
                        <p className="mt-2 text-lg font-semibold text-[#6F6A63]">
                          {isCompleted
                            ? `Completed by ${getWorkerName(workers, itemState?.workerId)}`
                            : 'Not completed'}
                        </p>
                        {isCompleted && itemState?.completedAt ? (
                          <p className="mt-1 text-base font-semibold text-[#6F6A63]">
                            {formatCompletedTime(itemState.completedAt)}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WeeklyCleaningDetailModal
