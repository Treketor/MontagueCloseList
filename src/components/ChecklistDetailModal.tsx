import { formatReadableDate } from '../lib/date'
import { Check } from 'lucide-react'
import { createPortal } from 'react-dom'
import { getItemStatus } from '../lib/checklistStats'
import type {
  ChecklistTask,
  DailyChecklistDraft,
  TaskSection,
} from '../types'

type ChecklistDetailModalProps = {
  checklist: DailyChecklistDraft | null
  onClose: () => void
  tasks: ChecklistTask[]
  workerName: string
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
  itemStates: Map<string, DailyChecklistDraft['items'][number]>,
) {
  const knownTaskIds = new Set(tasks.map((task) => task.id))
  const unknownTasks: ChecklistTask[] = Array.from(itemStates.keys())
    .filter((taskId) => !knownTaskIds.has(taskId))
    .map((taskId, index) => ({
      id: taskId,
      title: 'Unknown task',
      section: 'Other',
      taskType: 'daily_closing',
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

function ChecklistDetailModal({
  checklist,
  onClose,
  tasks,
  workerName,
}: ChecklistDetailModalProps) {
  if (!checklist) {
    return null
  }

  const itemStates = new Map(
    checklist.items.map((item) => [item.taskId, item]),
  )
  const groupedTasks = getGroupedTasks(tasks, itemStates)

  return createPortal(
    <div className="fixed inset-0 z-50 animate-fade-in bg-[#1F1D1A]/70 p-4 motion-reduce:animate-none sm:p-8">
      <div className="mx-auto flex max-h-full max-w-4xl animate-rise-in flex-col rounded-2xl bg-[#FFFCF7] text-[#1F1D1A] motion-reduce:animate-none">
        <div className="flex items-start justify-between gap-4 border-b border-[#DED8CF] p-5">
          <div>
            <p className="text-3xl font-extrabold leading-tight">
              {formatReadableDate(checklist.barDate)}
            </p>
            <p className="mt-2 text-xl font-semibold text-[#6F6A63]">{workerName}</p>
          </div>
          <button
            className="interactive-press min-h-12 shrink-0 rounded-xl border border-[#1F1D1A] bg-[#1F1D1A] px-6 text-lg font-bold text-[#FFFCF7] active:bg-[#3A352F] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="grid gap-6 overflow-y-auto p-5">
          {checklist.notes.trim() ? (
            <section className="rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-4">
              <h3 className="text-2xl font-extrabold">Close notes</h3>
              <p className="mt-3 whitespace-pre-wrap text-xl leading-relaxed text-[#6F6A63]">
                {checklist.notes}
              </p>
            </section>
          ) : null}

          {groupedTasks.map((group) => (
            <section key={group.section}>
              <h3 className="mb-2 text-2xl font-extrabold">{group.section}</h3>
              <ul>
                {group.tasks.map((task) => {
                  const itemState = itemStates.get(task.id)
                  const status = getItemStatus(itemState)
                  const isCompleted = status === 'completed'
                  const isSkipped = status === 'skipped'

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
                          {task.isCritical ? (
                            <span className="ml-2 inline-flex rounded-full border border-[#DED8CF] bg-[#EFE8DD] px-2 py-0.5 align-middle text-xs font-extrabold text-[#6F6A63]">
                              Important
                            </span>
                          ) : null}
                        </p>
                        {task.description ? (
                          <p className="mt-2 text-lg leading-relaxed text-[#6F6A63]">
                            {task.description}
                          </p>
                        ) : null}
                        <p
                          className={[
                            'mt-2 text-lg font-semibold',
                            isCompleted ? 'text-[#6F6A63]' : 'text-[#1F1D1A]',
                          ].join(' ')}
                        >
                          {isCompleted ? 'Completed' : isSkipped ? 'Skipped' : 'Pending'}
                        </p>
                        {isSkipped && itemState?.skipReason ? (
                          <p className="mt-1 text-base font-semibold leading-relaxed text-[#6F6A63]">
                            {itemState.skipReason}
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
    </div>,
    document.body,
  )
}

export default ChecklistDetailModal
