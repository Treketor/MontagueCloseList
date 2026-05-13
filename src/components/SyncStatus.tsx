import {
  isSupabaseConfigured,
  supabaseConfigMessage,
  supabaseConfigStatus,
} from '../lib/supabase'
import { CloudCheck, CloudOff, HardDrive, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import AppModal from './AppModal'
import PrimaryButton from './PrimaryButton'

type SyncStatusProps = {
  detail?: string
  lastSyncErrorAt?: string | null
  lastSyncErrorMessage?: string
  lastSuccessfulSyncAt?: string | null
  onRefreshCloudData?: () => Promise<void> | void
  status?: 'ready' | 'syncing' | 'issue'
}

function formatTime(value?: string | null) {
  if (!value) {
    return 'Not yet'
  }

  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function SyncStatus({
  detail,
  lastSyncErrorAt,
  lastSyncErrorMessage,
  lastSuccessfulSyncAt,
  onRefreshCloudData,
  status = 'ready',
}: SyncStatusProps) {
  const [isOpen, setIsOpen] = useState(false)
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
    <>
      <button
        className="interactive-press inline-flex items-center justify-end gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-[#6F6A63] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1D1A]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`}
        />
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </button>

      <AppModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="sm"
        title="Sync details"
      >
        <div className="grid gap-4">
          <dl className="grid gap-3 rounded-2xl border border-[#DED8CF] bg-[#F7F4EF] p-4">
            <div>
              <dt className="text-sm font-bold text-[#6F6A63]">Cloud sync ready</dt>
              <dd className="text-base font-extrabold text-[#1F1D1A]">
                {isSupabaseConfigured ? 'Yes' : 'No'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-[#6F6A63]">Last successful sync</dt>
              <dd className="text-base font-extrabold text-[#1F1D1A]">
                {formatTime(lastSuccessfulSyncAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-[#6F6A63]">Last sync issue</dt>
              <dd className="text-base font-extrabold text-[#1F1D1A]">
                {lastSyncErrorAt ? formatTime(lastSyncErrorAt) : 'None'}
              </dd>
              {lastSyncErrorMessage ? (
                <p className="mt-1 text-sm font-semibold text-[#6F6A63]">
                  {lastSyncErrorMessage}
                </p>
              ) : null}
            </div>
            <div>
              <dt className="text-sm font-bold text-[#6F6A63]">Local cache</dt>
              <dd className="text-base font-extrabold text-[#1F1D1A]">Available</dd>
            </div>
            {detail ? (
              <div>
                <dt className="text-sm font-bold text-[#6F6A63]">Current page</dt>
                <dd className="text-base font-extrabold text-[#1F1D1A]">{detail}</dd>
              </div>
            ) : null}
          </dl>
          {onRefreshCloudData ? (
            <PrimaryButton onClick={onRefreshCloudData}>Refresh cloud data</PrimaryButton>
          ) : null}
        </div>
      </AppModal>
    </>
  )
}

export default SyncStatus
