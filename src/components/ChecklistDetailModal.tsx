import { formatReadableDate } from '../lib/date'
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

function getSubmittedTime(submittedAt: string) {
  return new Date(submittedAt).toLocaleString([], {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-4 sm:p-8">
      <div className="mx-auto flex max-h-full max-w-4xl flex-col rounded-md bg-white text-black">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-5">
          <div>
            <p className="text-3xl font-semibold leading-tight">
              {formatReadableDate(checklist.barDate)}
            </p>
            <p className="mt-2 text-xl text-neutral-700">{workerName}</p>
            {checklist.submittedAt ? (
              <p className="mt-1 text-lg text-neutral-600">
                Submitted {getSubmittedTime(checklist.submittedAt)}
              </p>
            ) : (
              <p className="mt-1 text-lg text-neutral-600">Not submitted</p>
            )}
          </div>
          <button
            className="min-h-14 shrink-0 rounded-md border border-black bg-black px-6 text-lg font-semibold text-white active:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="grid gap-6 overflow-y-auto p-5">
          {checklist.notes.trim() ? (
            <section className="rounded-md border border-neutral-200 p-4">
              <h3 className="text-2xl font-semibold">Close notes</h3>
              <p className="mt-3 whitespace-pre-wrap text-xl leading-relaxed text-neutral-700">
                {checklist.notes}
              </p>
            </section>
          ) : null}

          {groupedTasks.map((group) => (
            <section key={group.section}>
              <h3 className="mb-3 text-2xl font-semibold">{group.section}</h3>
              <ul className="grid gap-3">
                {group.tasks.map((task) => {
                  const isCompleted =
                    itemStates.get(task.id)?.isCompleted ?? false

                  return (
                    <li
                      className="flex gap-4 rounded-md border border-neutral-200 p-4"
                      key={task.id}
                    >
                      <span
                        className={[
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border text-lg font-semibold',
                          isCompleted
                            ? 'border-black bg-black text-white'
                            : 'border-neutral-400 bg-white text-black',
                        ].join(' ')}
                      >
                        {isCompleted ? 'X' : '-'}
                      </span>
                      <div>
                        <p className="text-xl font-semibold leading-tight">
                          {task.title}
                        </p>
                        {task.description ? (
                          <p className="mt-2 text-lg leading-relaxed text-neutral-700">
                            {task.description}
                          </p>
                        ) : null}
                        <p
                          className={[
                            'mt-2 text-lg font-semibold',
                            isCompleted ? 'text-neutral-700' : 'text-black',
                          ].join(' ')}
                        >
                          {isCompleted ? 'Completed' : 'Missed'}
                        </p>
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

export default ChecklistDetailModal
