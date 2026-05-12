import { Check } from 'lucide-react'
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
      className="flex min-h-14 w-full items-start gap-3 border-b border-[#DED8CF] py-3 text-left active:bg-[#EFE8DD] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]"
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden="true"
        className={[
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
          isCompleted
            ? 'border-[#1F1D1A] bg-[#1F1D1A] text-[#FFFCF7]'
            : 'border-[#DED8CF] bg-[#FFFCF7] text-transparent',
        ].join(' ')}
      >
        {isCompleted ? <Check className="h-4 w-4" /> : null}
      </span>
      <span className="min-w-0">
        <span
          className={[
            'block text-base font-bold leading-tight',
            isCompleted ? 'text-[#6F6A63] line-through' : 'text-[#1F1D1A]',
          ].join(' ')}
        >
          {task.title}
        </span>
        {task.description ? (
          <span
            className={[
              'mt-1 block text-sm leading-relaxed',
              isCompleted ? 'text-[#8B857C]' : 'text-[#6F6A63]',
            ].join(' ')}
          >
            {task.description}
          </span>
        ) : null}
        {isCompleted && completedAt ? (
          <span className="mt-2 block text-sm font-semibold text-[#6F6A63]">
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
