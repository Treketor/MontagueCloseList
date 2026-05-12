import {
  isSupabaseConfigured,
  supabaseConfigMessage,
  supabaseConfigStatus,
} from '../lib/supabase'
import { CloudCheck, CloudOff, HardDrive, LoaderCircle } from 'lucide-react'

type SyncStatusProps = {
  status?: 'ready' | 'syncing' | 'issue'
}

function SyncStatus({ status = 'ready' }: SyncStatusProps) {
  const isLocalOnly = !isSupabaseConfigured
  const label = status === 'syncing'
    ? 'Syncing...'
    : status === 'issue'
      ? 'Cloud issue'
    : isLocalOnly
        ? supabaseConfigMessage
        : 'Cloud sync ready'
  const dotClass = status === 'syncing'
    ? 'bg-[#B8A56E]'
    : status === 'issue'
      ? 'bg-[#7D6556]'
    : isLocalOnly
        ? supabaseConfigStatus === 'secret_key'
          ? 'bg-[#8A4D3D]'
          : 'bg-[#6F6A63]'
        : 'bg-[#5E6B58]'
  const Icon = status === 'syncing'
    ? LoaderCircle
    : status === 'issue'
      ? CloudOff
      : isLocalOnly
        ? HardDrive
        : CloudCheck

  return (
    <p className="inline-flex items-center justify-end gap-2 text-sm font-semibold text-[#6F6A63]">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`}
      />
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </p>
  )
}

export default SyncStatus
