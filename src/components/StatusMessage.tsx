import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

type StatusMessageProps = {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

const toneClasses = {
  neutral: 'border-[#DED8CF] bg-[#FFFCF7] text-[#6F6A63]',
  success: 'border-[#CFC7BC] bg-[#F7F4EF] text-[#1F1D1A]',
  warning: 'border-[#D7B8AA] bg-[#F4E7E0] text-[#5F3529]',
  danger: 'border-[#CFA99B] bg-[#F0DDD5] text-[#4C2A22]',
}

const toneIcons = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  danger: AlertCircle,
}

function StatusMessage({ children, tone = 'neutral' }: StatusMessageProps) {
  const Icon = toneIcons[tone]

  return (
    <div
      className={[
        'flex items-start gap-3 rounded-xl border p-4 text-base font-semibold leading-relaxed',
        toneClasses[tone],
      ].join(' ')}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export default StatusMessage
