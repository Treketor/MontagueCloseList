import { Check } from 'lucide-react'
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
        'interactive-press flex min-h-16 w-full items-start gap-3 border-b border-[#DED8CF] py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1D1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF7]',
        disabled ? 'cursor-not-allowed opacity-55 active:scale-100' : 'active:bg-[#EFE8DD]',
      ].join(' ')}
      disabled={disabled}
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden="true"
        className={[
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150 ease-out',
          isCompleted
            ? 'border-[#1F1D1A] bg-[#1F1D1A] text-[#FFFCF7]'
            : 'border-[#DED8CF] bg-[#FFFCF7] text-transparent',
        ].join(' ')}
      >
        {isCompleted ? (
          <Check className="h-4 w-4 animate-rise-in motion-reduce:animate-none" />
        ) : null}
      </span>
      <span className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
        <span className="min-w-0">
          <span
            className={[
              'block text-base font-bold leading-tight transition-colors duration-150 ease-out',
              isCompleted ? 'text-[#6F6A63]' : 'text-[#1F1D1A]',
            ].join(' ')}
          >
            {task.title}
            {task.isCritical ? (
              <span className="ml-2 inline-flex rounded-full border border-[#DED8CF] bg-[#EFE8DD] px-2 py-0.5 align-middle text-xs font-extrabold text-[#6F6A63]">
                Important
              </span>
            ) : null}
          </span>
          {task.description ? (
            <span className="mt-1 block text-sm leading-relaxed text-[#6F6A63]">
              {task.description}
            </span>
          ) : null}
        </span>
        <span className="flex min-h-10 flex-col justify-start text-right text-sm font-semibold text-[#6F6A63]">
          {isCompleted && completedByName ? (
            <>
              <span className="block whitespace-nowrap">
                Completed by {completedByName}
              </span>
              {completedAt ? (
                <span className="mt-1 block whitespace-nowrap">
                  {formatCompletedTime(completedAt)}
                </span>
              ) : null}
            </>
          ) : (
            <span className="block whitespace-nowrap">Not completed</span>
          )}
        </span>
      </span>
    </button>
  )
}

export default WeeklyCleaningTaskRow
