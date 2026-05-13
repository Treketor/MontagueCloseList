import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

type SettingsCardProps = {
  description: string
  icon: ReactNode
  onClick: () => void
  title: string
}

function SettingsCard({ description, icon, onClick, title }: SettingsCardProps) {
  return (
    <button
      className="interactive-press grid min-h-24 grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-[#DED8CF] bg-[#FFFCF7] p-5 text-left hover:bg-[#F7F4EF] active:bg-[#EFE8DD] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#F7F4EF]"
      onClick={onClick}
      type="button"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] text-[#1F1D1A] transition-colors duration-150 ease-out">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-extrabold leading-tight text-[#1F1D1A]">
          {title}
        </span>
        <span className="mt-1 block text-base font-semibold leading-snug text-[#6F6A63]">
          {description}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="h-5 w-5 text-[#6F6A63]" />
    </button>
  )
}

export default SettingsCard
