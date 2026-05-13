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
} from '../lib/supabaseTasks'
import {
  createWorkerInSupabase,
  deleteWorkerFromSupabase,
  fetchWorkersFromSupabase,
  syncWorkersToSupabase,
  updateWorkerInSupabase,
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

    if (!Array.isArray(parsedWorkers)) {
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
  const [tasks, setTasks] = useState<ChecklistTask[]>(() =>
    isSupabaseConfigured ? [] : loadTasks(),
  )
  const startupWorkers = useRef(workers)
  const [isInitialSyncing, setIsInitialSyncing] = useState(isSupabaseConfigured)
  const [hasCloudIssue, setHasCloudIssue] = useState(false)
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<string | null>(null)
  const [lastSyncErrorAt, setLastSyncErrorAt] = useState<string | null>(null)
  const [lastSyncErrorMessage, setLastSyncErrorMessage] = useState('')
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
          fetchTasksFromSupabase(),
        ])

        if (isCancelled) {
          return
        }

        setWorkers(syncedWorkers)
        setStorageItem(workersStorageKey, JSON.stringify(syncedWorkers))

        saveTasks(syncedTasks)
        setTasks(syncedTasks)
        setLastSuccessfulSyncAt(new Date().toISOString())
        setLastSyncErrorMessage('')
      } catch (error) {
        console.warn('Supabase startup sync failed. Continuing locally.', error)
        setHasCloudIssue(true)
        setLastSyncErrorAt(new Date().toISOString())
        setLastSyncErrorMessage('Startup sync failed.')
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

  async function handleSaveWorker(worker: Worker): Promise<boolean> {
    const trimmedName = worker.name.trim()

    if (!trimmedName) {
      return false
    }

    const hasDuplicate = workers.some(
      (existingWorker) =>
        existingWorker.id !== worker.id &&
        existingWorker.name.toLowerCase() === trimmedName.toLowerCase(),
    )

    if (hasDuplicate) {
      return false
    }

    const nextWorkers = mergeWorkers(
      workers.filter((existingWorker) => existingWorker.id !== worker.id),
      [{ ...worker, name: trimmedName }],
    )

    setWorkers(nextWorkers)
    setStorageItem(workersStorageKey, JSON.stringify(nextWorkers))

    if (!isSupabaseConfigured) {
      return true
    }

    const savedWorker = await updateWorkerInSupabase({ ...worker, name: trimmedName })

    if (!savedWorker) {
      setHasCloudIssue(true)
      setLastSyncErrorAt(new Date().toISOString())
      setLastSyncErrorMessage('Could not save worker.')
      return false
    }

    const cloudWorkers = await fetchWorkersFromSupabase()
    const syncedWorkers = cloudWorkers.length > 0 ? cloudWorkers : nextWorkers
    setWorkers(syncedWorkers)
    setStorageItem(workersStorageKey, JSON.stringify(syncedWorkers))

    return true
  }

  async function handleDeleteWorker(workerId: string): Promise<boolean> {
    const workerToDelete = workers.find((worker) => worker.id === workerId)
    const nextWorkers = workers.filter((worker) => worker.id !== workerId)

    setWorkers(nextWorkers)
    setStorageItem(workersStorageKey, JSON.stringify(nextWorkers))

    if (selectedWorkerId === workerId) {
      setSelectedWorkerId('')
    }

    if (!isSupabaseConfigured || !workerToDelete) {
      return true
    }

    const didDelete = await deleteWorkerFromSupabase(workerToDelete)

    if (!didDelete) {
      setHasCloudIssue(true)
      setLastSyncErrorAt(new Date().toISOString())
      setLastSyncErrorMessage('Could not delete worker.')
      return false
    }

    const cloudWorkers = await fetchWorkersFromSupabase()
    setWorkers(cloudWorkers)
    setStorageItem(workersStorageKey, JSON.stringify(cloudWorkers))

    return true
  }

  async function handleSaveTasks(nextTasks: ChecklistTask[]) {
    saveTasks(nextTasks)
    setTasks(nextTasks)

    if (!isSupabaseConfigured) {
      return
    }

    try {
      const syncedTasks = await saveTasksToSupabase(nextTasks)

      saveTasks(syncedTasks)
      setTasks(syncedTasks)
      setHasCloudIssue(false)
      setLastSuccessfulSyncAt(new Date().toISOString())
      setLastSyncErrorMessage('')
    } catch (error) {
      console.warn('Unable to save tasks to Supabase. Keeping local cache.', error)
      setHasCloudIssue(true)
      setLastSyncErrorAt(new Date().toISOString())
      setLastSyncErrorMessage('Could not save tasks.')
    }
  }

  async function handleDeleteTask(taskId: string) {
    const taskToDelete = tasks.find((task) => task.id === taskId)
    const nextTasks = tasks.filter((task) => task.id !== taskId)

    saveTasks(nextTasks)
    setTasks(nextTasks)

    if (!isSupabaseConfigured || !taskToDelete) {
      return
    }

    try {
      const didDelete = await deleteTaskFromSupabase(taskToDelete)

      if (!didDelete) {
        setHasCloudIssue(true)
        setLastSyncErrorAt(new Date().toISOString())
        setLastSyncErrorMessage('Could not delete task.')
        return
      }

      const cloudTasks = await fetchTasksFromSupabase()

      saveTasks(cloudTasks)
      setTasks(cloudTasks)
      setLastSuccessfulSyncAt(new Date().toISOString())
    } catch (error) {
      console.warn('Unable to delete task from Supabase. Keeping local cache.', error)
      setHasCloudIssue(true)
      setLastSyncErrorAt(new Date().toISOString())
      setLastSyncErrorMessage('Could not delete task.')
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

      setWorkers(cloudWorkers)
      setStorageItem(workersStorageKey, JSON.stringify(cloudWorkers))

      setTasks(cloudTasks)
      saveTasks(cloudTasks)

      setHasCloudIssue(false)
      setLastSuccessfulSyncAt(new Date().toISOString())
      setLastSyncErrorMessage('')
      setSetupDataStatus('Setup data refreshed.')
    } catch (error) {
      console.warn('Unable to refresh setup data from Supabase.', error)
      setHasCloudIssue(true)
      setLastSyncErrorAt(new Date().toISOString())
      setLastSyncErrorMessage('Could not refresh setup data.')
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
        isCloudSyncEnabled={isSupabaseConfigured}
        onCreateWorker={handleCreateWorker}
        onDeleteTask={handleDeleteTask}
        onDeleteWorker={handleDeleteWorker}
        onRefreshCloudData={refreshCloudSetupData}
        onSaveTasks={handleSaveTasks}
        onSaveWorker={handleSaveWorker}
        setupDataStatus={setupDataStatus}
        tasks={tasks}
        workers={workers}
      />
    ),
  }[activeScreen]

  return (
    <AppShell
      activeScreen={activeScreen}
      barDate={readableBarDate}
      lastSyncErrorAt={lastSyncErrorAt}
      lastSyncErrorMessage={lastSyncErrorMessage}
      lastSuccessfulSyncAt={lastSuccessfulSyncAt}
      onRefreshCloudData={refreshCloudSetupData}
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
