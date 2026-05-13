import { useState } from 'react'
import PrimaryButton from '../PrimaryButton'
import StatusMessage from '../StatusMessage'
import { getDiagnostics } from '../../lib/diagnostics'
import { secondaryButtonClass, darkButtonClass } from './manageStyles'

type DiagnosticsPanelProps = {
  onRefreshCloudData: () => Promise<void> | void
  setupDataStatus: string
}

function DiagnosticsPanel({
  onRefreshCloudData,
  setupDataStatus,
}: DiagnosticsPanelProps) {
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false)
  const [isConfirmingCacheClear, setIsConfirmingCacheClear] = useState(false)
  const diagnostics = getDiagnostics()

  function getDiagnosticsText() {
    return [
      `App version: ${diagnostics.appVersion}`,
      `Environment: ${diagnostics.environment}`,
      `Cloud sync ready: ${diagnostics.supabaseConfigured ? 'yes' : 'no'}`,
      `Supabase config status: ${diagnostics.supabaseConfigStatus}`,
      `Local workers cache: ${diagnostics.hasLocalWorkers ? 'yes' : 'no'}`,
      `Local tasks cache: ${diagnostics.hasLocalTasks ? 'yes' : 'no'}`,
      `Local daily checklist cache count: ${diagnostics.localDailyChecklistKeys}`,
      `Local weekly cleaning cache count: ${diagnostics.localWeeklyCleaningKeys}`,
    ].join('\n')
  }

  async function handleCopyDiagnostics() {
    try {
      await window.navigator.clipboard.writeText(getDiagnosticsText())
      setDiagnosticsCopied(true)
    } catch {
      setDiagnosticsCopied(false)
    }
  }

  function clearLocalCache() {
    try {
      const keysToRemove: string[] = []

      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index)

        if (key?.startsWith('closelist_')) {
          keysToRemove.push(key)
        }
      }

      for (const key of keysToRemove) {
        window.localStorage.removeItem(key)
      }
    } catch {
      // Reload anyway; the app will fall back to in-memory state if storage is unavailable.
    }

    window.location.reload()
  }

  return (
    <div className="grid gap-4">
      <dl className="grid gap-3 text-base">
        {[
          ['App version', diagnostics.appVersion],
          ['Environment', diagnostics.environment],
          ['Cloud sync ready', diagnostics.supabaseConfigured ? 'yes' : 'no'],
          ['Supabase config', diagnostics.supabaseConfigStatus],
          ['Local workers cache', diagnostics.hasLocalWorkers ? 'yes' : 'no'],
          ['Local tasks cache', diagnostics.hasLocalTasks ? 'yes' : 'no'],
          ['Daily checklist cache', diagnostics.localDailyChecklistKeys],
          ['Weekly cleaning cache', diagnostics.localWeeklyCleaningKeys],
        ].map(([label, value]) => (
          <div
            className="flex justify-between gap-4 border-b border-[#DED8CF] pb-2"
            key={label}
          >
            <dt className="text-[#6F6A63]">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {setupDataStatus ? (
        <StatusMessage
          tone={setupDataStatus.startsWith('Could not') ? 'warning' : 'neutral'}
        >
          {setupDataStatus}
        </StatusMessage>
      ) : null}

      {diagnosticsCopied ? (
        <StatusMessage tone="success">Diagnostics copied.</StatusMessage>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <PrimaryButton onClick={() => void onRefreshCloudData()}>
          Refresh cloud data
        </PrimaryButton>
        <button
          className={secondaryButtonClass}
          onClick={() => void handleCopyDiagnostics()}
          type="button"
        >
          Copy diagnostics
        </button>
      </div>

      {isConfirmingCacheClear ? (
        <div className="grid gap-3 rounded-xl border border-[#DED8CF] bg-[#F7F4EF] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <p className="text-lg font-bold text-[#1F1D1A]">
            Clear CloseList local cache on this device?
          </p>
          <button
            className={secondaryButtonClass}
            onClick={() => setIsConfirmingCacheClear(false)}
            type="button"
          >
            Cancel
          </button>
          <button className={darkButtonClass} onClick={clearLocalCache} type="button">
            Clear cache
          </button>
        </div>
      ) : (
        <button
          className={secondaryButtonClass}
          onClick={() => setIsConfirmingCacheClear(true)}
          type="button"
        >
          Clear local cache on this device
        </button>
      )}
    </div>
  )
}

export default DiagnosticsPanel
