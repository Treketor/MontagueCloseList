import type { ReactNode } from 'react'

type StatusMessageProps = {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

const toneClasses = {
  neutral: 'border-neutral-800 bg-black text-neutral-300',
  success: 'border-neutral-700 bg-neutral-950 text-white',
  warning: 'border-neutral-600 bg-neutral-950 text-white',
  danger: 'border-neutral-500 bg-neutral-950 text-white',
}

function StatusMessage({ children, tone = 'neutral' }: StatusMessageProps) {
  return (
    <div
      className={[
        'rounded-md border p-4 text-lg font-medium leading-relaxed',
        toneClasses[tone],
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export default StatusMessage
