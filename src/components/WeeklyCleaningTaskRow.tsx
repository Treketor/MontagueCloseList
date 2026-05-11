import type { ChecklistTask } from '../types'

type WeeklyCleaningTaskRowProps = {
  completedAt?: string
  completedByName: string | null
  disabled?: boolean
  isCompleted: boolean
  onToggle: () => void
  task: ChecklistTask
}

function formatCompletedTime(completedAt: string) {
  return new Date(completedAt).toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function WeeklyCleaningTaskRow({
  completedAt,
  completedByName,
  disabled = false,
  isCompleted,
  onToggle,
  task,
}: WeeklyCleaningTaskRowProps) {
  return (
    <button
      aria-pressed={isCompleted}
      className={[
        'flex min-h-24 w-full items-start gap-4 rounded-md border border-neutral-800 p-4 text-left focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black',
        disabled ? 'cursor-not-allowed opacity-50' : 'active:bg-neutral-900',
      ].join(' ')}
      disabled={disabled}
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden="true"
        className={[
          'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border text-lg font-semibold',
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
            isCompleted ? 'text-neutral-300' : 'text-white',
          ].join(' ')}
        >
          {task.title}
        </span>
        {task.description ? (
          <span className="mt-2 block text-lg leading-relaxed text-neutral-300">
            {task.description}
          </span>
        ) : null}
        <span className="mt-3 block text-lg font-semibold text-neutral-300">
          {isCompleted && completedByName
            ? `Completed by ${completedByName}`
            : 'Not completed'}
        </span>
        {isCompleted && completedAt ? (
          <span className="mt-1 block text-base text-neutral-500">
            {formatCompletedTime(completedAt)}
          </span>
        ) : null}
      </span>
    </button>
  )
}

export default WeeklyCleaningTaskRow
