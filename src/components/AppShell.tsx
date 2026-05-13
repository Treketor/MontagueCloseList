import type { ReactNode } from 'react'
import BottomNav, { type NavItem } from './BottomNav'
import SyncStatus from './SyncStatus'

type AppShellProps<T extends string> = {
  activeScreen: T
  barDate: string
  children: ReactNode
  syncDetail?: string
  lastSyncErrorAt?: string | null
  lastSyncErrorMessage?: string
  lastSuccessfulSyncAt?: string | null
  onRefreshCloudData?: () => Promise<void> | void
  syncStatus?: 'ready' | 'syncing' | 'issue'
  navItems: NavItem<T>[]
  onNavigate: (screen: T) => void
}

function AppShell<T extends string>({
  activeScreen,
  barDate,
  children,
  syncDetail,
  lastSyncErrorAt,
  lastSyncErrorMessage,
  lastSuccessfulSyncAt,
  onRefreshCloudData,
  syncStatus = 'ready',
  navItems,
  onNavigate,
}: AppShellProps<T>) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#F7F4EF] text-[#1F1D1A]">
      <header className="sticky top-0 z-20 shrink-0 border-b border-[#DED8CF] bg-[#FFFCF7] pt-[var(--safe-area-top)]">
        <div className="mx-auto flex min-h-16 max-w-[1040px] items-center justify-between gap-4 px-5 py-3 pl-[max(1.25rem,var(--safe-area-left))] pr-[max(1.25rem,var(--safe-area-right))] sm:px-6">
          <div>
            <p className="text-xl font-extrabold leading-none tracking-normal">
              CloseList
            </p>
            <p className="mt-1 text-sm font-semibold text-[#6F6A63]">
              {barDate}
            </p>
          </div>
          <div className="text-right">
            <SyncStatus
              detail={syncDetail}
              lastSyncErrorAt={lastSyncErrorAt}
              lastSyncErrorMessage={lastSyncErrorMessage}
              lastSuccessfulSyncAt={lastSuccessfulSyncAt}
              onRefreshCloudData={onRefreshCloudData}
              status={syncStatus}
            />
            {syncDetail ? (
              <p className="mt-1 text-xs font-semibold text-[#6F6A63]">
                {syncDetail}
              </p>
            ) : null}
          </div>
        </div>
        <BottomNav
          activeKey={activeScreen}
          items={navItems}
          onSelect={onNavigate}
        />
      </header>

      <main
        className="mx-auto w-full max-w-[1040px] flex-1 px-5 py-4 pb-8 pl-[max(1.25rem,var(--safe-area-left))] pr-[max(1.25rem,var(--safe-area-right))] sm:px-6"
        key={String(activeScreen)}
      >
        <div className="animate-rise-in motion-reduce:animate-none">
        {children}
        </div>
      </main>
    </div>
  )
}

export default AppShell
