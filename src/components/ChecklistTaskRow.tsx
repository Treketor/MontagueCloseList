import { Check } from 'lucide-react'
import type { ChecklistTask } from '../types'

type ChecklistTaskRowProps = {
  completedAt?: string
  disabled?: boolean
  isCompleted: boolean
  isSkipped?: boolean
  onMarkPending?: () => void
  onSkip?: () => void
  onToggle: () => void
  skipReason?: string
  task: ChecklistTask
}

function ChecklistTaskRow({
  completedAt,
  disabled = false,
  isCompleted,
  isSkipped = false,
  onMarkPending,
  onSkip,
  onToggle,
  skipReason,
  task,
}: ChecklistTaskRowProps) {
  return (
    <div
      className={[
        'interactive-press flex min-h-14 w-full items-start gap-3 border-b border-[#DED8CF] py-3 text-left',
        disabled ? 'opacity-55' : 'active:bg-[#EFE8DD]',
      ].join(' ')}
    >
      <button
        aria-pressed={isCompleted}
        className={[
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1D1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF7]',
          isCompleted
            ? 'border-[#1F1D1A] bg-[#1F1D1A] text-[#FFFCF7]'
            : isSkipped
              ? 'border-[#B8A56E] bg-[#EFE8DD] text-[#6F6A63]'
              : 'border-[#DED8CF] bg-[#FFFCF7] text-transparent',
        ].join(' ')}
        disabled={disabled}
        onClick={onToggle}
        type="button"
      >
        {isCompleted ? (
          <Check className="h-4 w-4 animate-rise-in motion-reduce:animate-none" />
        ) : isSkipped ? (
          <span className="text-sm font-extrabold">-</span>
        ) : null}
      </button>
      <span className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
        <span className="min-w-0">
        <span
          className={[
            'block text-base font-bold leading-tight transition-colors duration-150 ease-out',
            isCompleted ? 'text-[#6F6A63] line-through' : 'text-[#1F1D1A]',
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
          <span
            className={[
              'mt-1 block text-sm leading-relaxed transition-colors duration-150 ease-out',
              isCompleted ? 'text-[#8B857C]' : 'text-[#6F6A63]',
            ].join(' ')}
          >
            {task.description}
          </span>
        ) : null}
        {isSkipped && skipReason ? (
          <span className="mt-1 block text-sm font-semibold leading-relaxed text-[#6F6A63]">
            Skipped: {skipReason}
          </span>
        ) : null}
        </span>
        <span className="flex flex-wrap justify-start gap-2 sm:justify-end">
          {isCompleted && completedAt ? (
            <span className="block whitespace-nowrap text-right text-sm font-semibold text-[#6F6A63]">
              Completed {new Date(completedAt).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          ) : null}
          {!isCompleted && onSkip ? (
            <button
              className="min-h-9 rounded-lg border border-[#DED8CF] px-3 text-sm font-bold text-[#6F6A63] transition-colors active:bg-[#EFE8DD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1D1A]"
              disabled={disabled}
              onClick={onSkip}
              type="button"
            >
              {isSkipped ? 'Edit reason' : 'Skip'}
            </button>
          ) : null}
          {isSkipped && onMarkPending ? (
            <button
              className="min-h-9 rounded-lg border border-[#DED8CF] px-3 text-sm font-bold text-[#6F6A63] transition-colors active:bg-[#EFE8DD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1D1A]"
              disabled={disabled}
              onClick={onMarkPending}
              type="button"
            >
              Mark pending
            </button>
          ) : null}
        </span>
      </span>
    </div>
  )
}

export default ChecklistTaskRow
