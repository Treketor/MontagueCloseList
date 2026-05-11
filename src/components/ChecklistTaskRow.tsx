import type { ChecklistTask } from '../types'

type ChecklistTaskRowProps = {
  completedAt?: string
  isCompleted: boolean
  onToggle: () => void
  task: ChecklistTask
}

function ChecklistTaskRow({
  completedAt,
  isCompleted,
  onToggle,
  task,
}: ChecklistTaskRowProps) {
  return (
    <button
      aria-pressed={isCompleted}
      className="flex min-h-20 w-full items-start gap-4 rounded-md border border-neutral-800 p-4 text-left active:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden="true"
        className={[
          'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border',
          isCompleted
            ? 'border-white bg-white text-black'
            : 'border-neutral-500 bg-black text-black',
        ].join(' ')}
      >
        {isCompleted ? 'X' : ''}
      </span>
      <span className="min-w-0">
        <span
          className={[
            'block text-xl font-semibold leading-tight',
            isCompleted ? 'text-neutral-400 line-through' : 'text-white',
          ].join(' ')}
        >
          {task.title}
        </span>
        {task.description ? (
          <span
            className={[
              'mt-2 block text-lg leading-relaxed',
              isCompleted ? 'text-neutral-500' : 'text-neutral-300',
            ].join(' ')}
          >
            {task.description}
          </span>
        ) : null}
        {isCompleted && completedAt ? (
          <span className="mt-2 block text-base text-neutral-500">
            Completed {new Date(completedAt).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        ) : null}
      </span>
    </button>
  )
}

export default ChecklistTaskRow
