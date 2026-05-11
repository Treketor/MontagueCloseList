import { isSupabaseConfigured } from '../lib/supabase'

type SyncStatusProps = {
  status?: 'ready' | 'syncing' | 'issue'
}

function SyncStatus({ status = 'ready' }: SyncStatusProps) {
  const label =
    status === 'syncing'
      ? 'Syncing...'
      : status === 'issue'
        ? 'Cloud issue'
        : isSupabaseConfigured
          ? 'Cloud sync ready'
          : 'Local only'

  return (
    <p className="mt-2 text-sm font-medium text-neutral-500">
      {label}
    </p>
  )
}

export default SyncStatus
