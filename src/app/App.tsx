import { useEffect, useMemo, useRef, useState } from 'react'
import AppShell from '../components/AppShell'
import type { NavItem } from '../components/BottomNav'
import { mockWorkers } from '../lib/mockData'
import {
  getActiveTasksByType,
  loadTasks,
  saveTasks,
} from '../lib/taskStorage'
import ManageTasksPage from '../pages/ManageTasksPage'
import ThisWeekPage from '../pages/ThisWeekPage'
import TodayPage from '../pages/TodayPage'
import WeeklyCleaningPage from '../pages/WeeklyCleaningPage'
import { formatReadableDate, getBarDate } from '../lib/date'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  deleteTaskFromSupabase,
  fetchTasksFromSupabase,
  saveTasksToSupabase,
  seedTasksToSupabaseIfEmpty,
} from '../lib/supabaseTasks'
import {
  createWorkerInSupabase,
  fetchWorkersFromSupabase,
  syncWorkersToSupabase,
} from '../lib/supabaseWorkers'
import type { ChecklistTask, Worker } from '../types'

type ScreenKey = 'today' | 'this-week' | 'weekly-cleaning' | 'manage-tasks'

const workersStorageKey = 'closelist_workers'
const selectedWorkerStorageKey = 'closelist_selected_worker_id'

const navItems: NavItem<ScreenKey>[] = [
  { key: 'today', label: 'Today' },
  { key: 'this-week', label: 'Closes' },
  { key: 'weekly-cleaning', label: 'Weekly Cleaning' },
  { key: 'manage-tasks', label: 'Manage' },
]

function getStorageItem(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function setStorageItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // State remains usable in memory if browser storage is unavailable.
  }
}

function removeStorageItem(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}

function loadStoredWorkers() {
  const storedWorkers = getStorageItem(workersStorageKey)

  if (!storedWorkers) {
    return mockWorkers
  }

  try {
    const parsedWorkers = JSON.parse(storedWorkers) as Worker[]

    if (!Array.isArray(parsedWorkers) || parsedWorkers.length === 0) {
      return mockWorkers
    }

    return parsedWorkers
  } catch {
    return mockWorkers
  }
}

function createWorkerId(name: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `worker-${slug || 'new'}-${Date.now()}`
}

function mergeWorkers(localWorkers: Worker[], cloudWorkers: Worker[]) {
  const workersById = new Map<string, Worker>()

  for (const worker of localWorkers) {
    workersById.set(worker.id, worker)
  }

  for (const worker of cloudWorkers) {
    workersById.set(worker.id, worker)
  }

  return Array.from(workersById.values()).sort((firstWorker, secondWorker) =>
    firstWorker.name.localeCompare(secondWorker.name),
  )
}

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('today')
  const [workers, setWorkers] = useState<Worker[]>(loadStoredWorkers)
  const [tasks, setTasks] = useState<ChecklistTask[]>(loadTasks)
  const startupTasks = useRef(tasks)
  const startupWorkers = useRef(workers)
  const [isInitialSyncing, setIsInitialSyncing] = useState(isSupabaseConfigured)
  const [hasCloudIssue, setHasCloudIssue] = useState(false)
  const [headerSyncDetail, setHeaderSyncDetail] = useState('')
  const [setupDataStatus, setSetupDataStatus] = useState('')
  const [selectedWorkerId, setSelectedWorkerId] = useState(
    () => getStorageItem(selectedWorkerStorageKey) ?? '',
  )
  const barDate = useMemo(() => getBarDate(), [])
  const readableBarDate = useMemo(() => formatReadableDate(barDate), [barDate])
  const selectedWorkerExists = workers.some(
    (worker) => worker.id === selectedWorkerId,
  )
  const activeWorkerId = selectedWorkerExists ? selectedWorkerId : ''
  const dailyClosingTasks = useMemo(
    () => getActiveTasksByType(tasks, 'daily_closing'),
    [tasks],
  )
  const weeklyCleaningTasks = useMemo(
    () => getActiveTasksByType(tasks, 'weekly_cleaning'),
    [tasks],
  )

  useEffect(() => {
    if (activeScreen !== 'today' && activeScreen !== 'weekly-cleaning') {
      setHeaderSyncDetail('')
    }
  }, [activeScreen])

  useEffect(() => {
    setStorageItem(workersStorageKey, JSON.stringify(workers))
  }, [workers])

  useEffect(() => {
    if (activeWorkerId) {
      setStorageItem(selectedWorkerStorageKey, selectedWorkerId)
      return
    }

    removeStorageItem(selectedWorkerStorageKey)
  }, [activeWorkerId, selectedWorkerId])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    let isCancelled = false

    async function hydrateFromSupabase() {
      try {
        setIsInitialSyncing(true)

        const [syncedWorkers, syncedTasks] = await Promise.all([
          syncWorkersToSupabase(startupWorkers.current),
          seedTasksToSupabaseIfEmpty(startupTasks.current),
        ])

        if (isCancelled) {
          return
        }

        if (syncedWorkers.length > 0) {
          setWorkers(syncedWorkers)
          setStorageItem(
            workersStorageKey,
            JSON.stringify(syncedWorkers),
          )
        }

        if (syncedTasks.length > 0) {
          saveTasks(syncedTasks)
          setTasks(syncedTasks)
        }
      } catch (error) {
        console.warn('Supabase startup sync failed. Continuing locally.', error)
        setHasCloudIssue(true)
      } finally {
        if (!isCancelled) {
          setIsInitialSyncing(false)
        }
      }
    }

    void hydrateFromSupabase()

    return () => {
      isCancelled = true
    }
  }, [])

  async function handleCreateWorker(name: string): Promise<Worker | null> {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return null
    }

    const duplicateWorker = workers.find(
      (worker) => worker.name.toLowerCase() === trimmedName.toLowerCase(),
    )

    if (duplicateWorker) {
      return duplicateWorker
    }

    if (isSupabaseConfigured) {
      const createdWorker = await createWorkerInSupabase(trimmedName)

      if (!createdWorker) {
        return null
      }

      const nextWorkers = mergeWorkers(workers, [createdWorker])
      setWorkers(nextWorkers)
      setStorageItem(workersStorageKey, JSON.stringify(nextWorkers))

      return createdWorker
    }

    const newWorker = {
      id: createWorkerId(trimmedName),
      name: trimmedName,
    }
    const nextWorkers = mergeWorkers(workers, [newWorker])

    setWorkers(nextWorkers)
    setStorageItem(workersStorageKey, JSON.stringify(nextWorkers))

    return newWorker
  }

  function handleSelectWorker(workerId: string | null) {
    setSelectedWorkerId(workerId ?? '')
  }

  async function handleSaveTasks(nextTasks: ChecklistTask[]) {
    saveTasks(nextTasks)
    setTasks(nextTasks)

    if (!isSupabaseConfigured) {
      return
    }

    try {
      const syncedTasks = await saveTasksToSupabase(nextTasks)

      if (syncedTasks.length > 0) {
        saveTasks(syncedTasks)
        setTasks(syncedTasks)
      }
    } catch (error) {
      console.warn('Unable to save tasks to Supabase. Keeping local cache.', error)
      setHasCloudIssue(true)
    }
  }

  async function handleDeleteTask(taskId: string) {
    const nextTasks = tasks.filter((task) => task.id !== taskId)

    saveTasks(nextTasks)
    setTasks(nextTasks)

    if (!isSupabaseConfigured) {
      return
    }

    try {
      const didDelete = await deleteTaskFromSupabase(taskId)

      if (!didDelete) {
        setHasCloudIssue(true)
        return
      }

      const cloudTasks = await fetchTasksFromSupabase()

      if (cloudTasks.length > 0) {
        saveTasks(cloudTasks)
        setTasks(cloudTasks)
      }
    } catch (error) {
      console.warn('Unable to delete task from Supabase. Keeping local cache.', error)
      setHasCloudIssue(true)
    }
  }

  async function refreshCloudSetupData() {
    if (!isSupabaseConfigured) {
      setSetupDataStatus('Cloud sync is not configured.')
      return
    }

    setSetupDataStatus('Refreshing cloud data...')
    setIsInitialSyncing(true)

    try {
      const [cloudWorkers, cloudTasks] = await Promise.all([
        fetchWorkersFromSupabase(),
        fetchTasksFromSupabase(),
      ])

      if (cloudWorkers.length > 0) {
        setWorkers(cloudWorkers)
        setStorageItem(workersStorageKey, JSON.stringify(cloudWorkers))
      }

      if (cloudTasks.length > 0) {
        setTasks(cloudTasks)
        saveTasks(cloudTasks)
      }

      setHasCloudIssue(false)
      setSetupDataStatus('Setup data refreshed.')
    } catch (error) {
      console.warn('Unable to refresh setup data from Supabase.', error)
      setHasCloudIssue(true)
      setSetupDataStatus('Could not refresh setup data.')
    } finally {
      setIsInitialSyncing(false)
    }
  }

  const page = {
    today: (
      <TodayPage
        barDate={barDate}
        dailyClosingTasks={dailyClosingTasks}
        isCloudSyncEnabled={isSupabaseConfigured}
        onCreateWorker={handleCreateWorker}
        onHeaderStatusChange={setHeaderSyncDetail}
        onSelectWorker={handleSelectWorker}
        selectedWorkerId={activeWorkerId}
        workers={workers}
      />
    ),
    'this-week': (
      <ThisWeekPage
        isCloudSyncEnabled={isSupabaseConfigured}
        tasks={tasks}
        workers={workers}
      />
    ),
    'weekly-cleaning': (
      <WeeklyCleaningPage
        isCloudSyncEnabled={isSupabaseConfigured}
        onCreateWorker={handleCreateWorker}
        onHeaderStatusChange={setHeaderSyncDetail}
        weeklyCleaningTasks={weeklyCleaningTasks}
        workers={workers}
      />
    ),
    'manage-tasks': (
      <ManageTasksPage
        onDeleteTask={handleDeleteTask}
        onRefreshCloudData={refreshCloudSetupData}
        onSaveTasks={handleSaveTasks}
        setupDataStatus={setupDataStatus}
        tasks={tasks}
      />
    ),
  }[activeScreen]

  return (
    <AppShell
      activeScreen={activeScreen}
      barDate={readableBarDate}
      syncDetail={headerSyncDetail}
      syncStatus={isInitialSyncing ? 'syncing' : hasCloudIssue ? 'issue' : 'ready'}
      navItems={navItems}
      onNavigate={setActiveScreen}
    >
      {page}
    </AppShell>
  )
}

export default App
