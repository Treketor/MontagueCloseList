import type { ReactNode } from 'react'
import BottomNav, { type NavItem } from './BottomNav'
import SyncStatus from './SyncStatus'

type AppShellProps<T extends string> = {
  activeScreen: T
  barDate: string
  children: ReactNode
  syncStatus?: 'ready' | 'syncing' | 'issue'
  navItems: NavItem<T>[]
  onNavigate: (screen: T) => void
}

function AppShell<T extends string>({
  activeScreen,
  barDate,
  children,
  syncStatus = 'ready',
  navItems,
  onNavigate,
}: AppShellProps<T>) {
  return (
    <div className="flex min-h-dvh flex-col bg-black text-white">
      <header className="sticky top-0 z-20 shrink-0 border-b border-neutral-800 bg-black pt-[var(--safe-area-top)]">
        <div className="mx-auto flex min-h-20 max-w-5xl items-center justify-between gap-6 px-6 py-4 pl-[max(1.5rem,var(--safe-area-left))] pr-[max(1.5rem,var(--safe-area-right))] sm:px-8">
          <div>
            <h1 className="text-3xl font-semibold leading-none tracking-normal">
              CloseList
            </h1>
            <SyncStatus status={syncStatus} />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium uppercase tracking-normal text-neutral-400">
              Bar Date
            </p>
            <p className="mt-1 text-xl font-semibold leading-tight">{barDate}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-6 pb-10 pl-[max(1.5rem,var(--safe-area-left))] pr-[max(1.5rem,var(--safe-area-right))] sm:px-8">
        {children}
      </main>

      <footer className="sticky bottom-0 z-20 shrink-0">
        <BottomNav
          activeKey={activeScreen}
          items={navItems}
          onSelect={onNavigate}
        />
      </footer>
    </div>
  )
}

export default AppShell
