import { isSupabaseConfigured, supabaseConfigStatus } from './supabase'

const appVersion = '0.1.0'

function getStorageItem(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function countStorageKeys(prefix: string) {
  try {
    let count = 0

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)

      if (key?.startsWith(prefix)) {
        count += 1
      }
    }

    return count
  } catch {
    return 0
  }
}

export function getDiagnostics() {
  return {
    appVersion,
    environment: import.meta.env.MODE,
    supabaseConfigured: isSupabaseConfigured,
    supabaseConfigStatus,
    hasLocalWorkers: Boolean(getStorageItem('closelist_workers')),
    hasLocalTasks: Boolean(getStorageItem('closelist_tasks')),
    localDailyChecklistKeys: countStorageKeys('closelist_daily_close_'),
    localWeeklyCleaningKeys: countStorageKeys('closelist_weekly_cleaning_'),
  }
}
