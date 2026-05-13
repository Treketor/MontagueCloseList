import {
  BrushCleaning,
  ClipboardCheck,
  History,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type NavItem<T extends string = string> = {
  key: T
  label: string
}

type BottomNavProps<T extends string> = {
  activeKey: T
  items: NavItem<T>[]
  onSelect: (key: T) => void
}

const navIcons: Record<string, LucideIcon> = {
  today: ClipboardCheck,
  'this-week': History,
  'weekly-cleaning': BrushCleaning,
  'manage-tasks': Settings,
}

function BottomNav<T extends string>({
  activeKey,
  items,
  onSelect,
}: BottomNavProps<T>) {
  return (
    <nav className="bg-[#FFFCF7] px-5 pb-3 pl-[max(1.25rem,var(--safe-area-left))] pr-[max(1.25rem,var(--safe-area-right))] sm:px-6">
      <div className="mx-auto grid max-w-[1040px] grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => {
          const isActive = item.key === activeKey
          const Icon = navIcons[item.key] ?? ClipboardCheck

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={[
                'interactive-press flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold leading-none sm:text-base',
                'focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#F7F4EF]',
                isActive
                  ? 'border-[#1F1D1A] bg-[#1F1D1A] text-[#FFFCF7]'
                  : 'border-[#DED8CF] bg-[#FFFCF7] text-[#1F1D1A] active:bg-[#EFE8DD]',
              ].join(' ')}
              key={item.key}
              onClick={() => onSelect(item.key)}
              type="button"
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
