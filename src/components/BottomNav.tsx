export type NavItem<T extends string = string> = {
  key: T
  label: string
}

type BottomNavProps<T extends string> = {
  activeKey: T
  items: NavItem<T>[]
  onSelect: (key: T) => void
}

function BottomNav<T extends string>({
  activeKey,
  items,
  onSelect,
}: BottomNavProps<T>) {
  return (
    <nav className="border-t border-neutral-800 bg-black pb-[max(1rem,var(--safe-area-bottom))] pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pt-3">
      <div className="mx-auto grid max-w-5xl grid-cols-4 gap-3">
        {items.map((item) => {
          const isActive = item.key === activeKey

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={[
                'min-h-16 rounded-md border px-2 text-lg font-semibold transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black',
                isActive
                  ? 'border-white bg-white text-black'
                  : 'border-neutral-700 bg-black text-white active:bg-neutral-900',
              ].join(' ')}
              key={item.key}
              onClick={() => onSelect(item.key)}
              type="button"
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
