import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import ChecklistDetailModal from '../components/ChecklistDetailModal'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import PrimaryButton from '../components/PrimaryButton'
import SectionCard from '../components/SectionCard'
import StatusMessage from '../components/StatusMessage'
import WeeklyCleaningDetailModal from '../components/WeeklyCleaningDetailModal'
import {
  getDailyChecklistsForRange,
  getWeeklyCleaningStats,
  loadWeeklyCleaningDraft,
  reconcileDailyChecklistWithTasks,
  reconcileWeeklyCleaningWithTasks,
  saveDailyChecklist,
  saveWeeklyCleaningDraft,
} from '../lib/checklistStorage'
import { getBarDate, getCurrentWeekRange } from '../lib/date'
import { getDailyChecklistStats } from '../lib/checklistStats'
import { fetchClosingChecklistsForRangeFromSupabase } from '../lib/supabaseDailyChecklists'
import { fetchWeeklyCleaningDraft } from '../lib/supabaseWeeklyCleaning'
import { getWorkerName } from '../lib/workers'
import type {
  ChecklistTask,
  DailyChecklistDraft,
  WeeklyCleaningDraft,
  Worker,
} from '../types'

type ThisWeekPageProps = {
  isCloudSyncEnabled: boolean
  tasks: ChecklistTask[]
  workers: Worker[]
}

type WeekOverview = {
  endDate: string
  startDate: string
  weeklyCleaning: WeeklyCleaningDraft
}

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function parseDateString(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(dateString: string, days: number) {
  const date = parseDateString(dateString)
  date.setDate(date.getDate() + days)

  return toDateString(date)
}

function getFourWeeks(weekOffset = 0) {
  const currentWeek = getCurrentWeekRange()

  return Array.from({ length: 4 }, (_, index) => {
    const startDate = addDays(currentWeek.startDate, (index + weekOffset) * -7)

    return {
      startDate,
      endDate: addDays(startDate, 6),
    }
  })
}

function formatShortDate(dateString: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(parseDateString(dateString))
}

function getDayStatus(checklist: DailyChecklistDraft | undefined) {
  if (!checklist) {
    return 'No close'
  }

  if (checklist.submittedAt) {
    return 'Submitted'
  }

  const stats = getDailyChecklistStats(checklist)
  const hasProgress = Boolean(
    checklist.workerId || checklist.notes.trim() || stats.resolved > 0,
  )

  return hasProgress ? 'In progress' : 'Incomplete'
}

function ThisWeekPage({
  isCloudSyncEnabled,
  tasks,
  workers,
}: ThisWeekPageProps) {
  const [selectedChecklist, setSelectedChecklist] =
    useState<DailyChecklistDraft | null>(null)
  const [selectedWeeklyCleaning, setSelectedWeeklyCleaning] =
    useState<WeeklyCleaningDraft | null>(null)
  const [checklists, setChecklists] = useState<DailyChecklistDraft[]>([])
  const [weeks, setWeeks] = useState<WeekOverview[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [warning, setWarning] = useState('')
  const currentBarDate = useMemo(() => getBarDate(), [])
  const workWeeks = useMemo(() => getFourWeeks(weekOffset), [weekOffset])
  const rangeEndDate = workWeeks[0].endDate
  const rangeStartDate = workWeeks[workWeeks.length - 1].startDate
  const pageSubtitle =
    weekOffset === 0
      ? 'Recent closes'
      : `${formatShortDate(rangeStartDate)} - ${formatShortDate(rangeEndDate)}`
  const selectedWorkerName = getWorkerName(
    workers,
    selectedChecklist?.workerId,
  )
  const checklistsByDate = useMemo(
    () => new Map(checklists.map((checklist) => [checklist.barDate, checklist])),
    [checklists],
  )

  const loadHistory = useCallback(async () => {
    setIsLoading(isCloudSyncEnabled)
    setWarning('')

    try {
      let nextChecklists: DailyChecklistDraft[]

      if (isCloudSyncEnabled) {
        const cloudChecklists = await fetchClosingChecklistsForRangeFromSupabase(
          rangeStartDate,
          rangeEndDate,
        )
        nextChecklists = cloudChecklists.map((checklist) =>
          reconcileDailyChecklistWithTasks(checklist, tasks),
        )

        for (const checklist of nextChecklists) {
          saveDailyChecklist(checklist)
        }
      } else {
        nextChecklists = getDailyChecklistsForRange(rangeStartDate, rangeEndDate).map(
          (checklist) => reconcileDailyChecklistWithTasks(checklist, tasks),
        )
      }

      const nextWeeks = await Promise.all(
        workWeeks.map(async (week) => {
          const cloudDraft = isCloudSyncEnabled
            ? await fetchWeeklyCleaningDraft(week.startDate)
            : null
          const localDraft = loadWeeklyCleaningDraft(week.startDate, tasks)
          const weeklyCleaning = reconcileWeeklyCleaningWithTasks(
            cloudDraft ?? localDraft,
            tasks,
          )

          if (cloudDraft) {
            saveWeeklyCleaningDraft(weeklyCleaning)
          }

          return {
            ...week,
            weeklyCleaning,
          }
        }),
      )

      setChecklists(nextChecklists)
      setWeeks(nextWeeks)
    } catch {
      setWarning('Showing local history. Cloud sync failed.')
      setChecklists(
        getDailyChecklistsForRange(rangeStartDate, rangeEndDate).map(
          (checklist) => reconcileDailyChecklistWithTasks(checklist, tasks),
        ),
      )
      setWeeks(
        workWeeks.map((week) => ({
          ...week,
          weeklyCleaning: reconcileWeeklyCleaningWithTasks(
            loadWeeklyCleaningDraft(week.startDate, tasks),
            tasks,
          ),
        })),
      )
    } finally {
      setIsLoading(false)
    }
  }, [isCloudSyncEnabled, rangeEndDate, rangeStartDate, tasks, workWeeks])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHistory()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadHistory])

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="text-left sm:[&>div]:mb-0 sm:[&>div]:text-left">
          <PageHeader title="Previous closes" description={pageSubtitle} />
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            className="min-h-12 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] px-4 text-base font-bold text-[#1F1D1A] active:bg-[#EFE8DD] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset(0)}
            type="button"
          >
            Recent
          </button>
          <button
            className="min-h-12 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] px-4 text-base font-bold text-[#1F1D1A] active:bg-[#EFE8DD] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((currentOffset) => Math.max(0, currentOffset - 4))}
            type="button"
          >
            Newer
          </button>
          <button
            className="min-h-12 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] px-4 text-base font-bold text-[#1F1D1A] active:bg-[#EFE8DD]"
            onClick={() => setWeekOffset((currentOffset) => currentOffset + 4)}
            type="button"
          >
            Older
          </button>
          <PrimaryButton
            className="col-span-2 inline-flex items-center justify-center gap-2 sm:col-span-1"
            onClick={() => void loadHistory()}
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Refresh
          </PrimaryButton>
        </div>
      </div>

      {isLoading ? (
        <StatusMessage>Loading history...</StatusMessage>
      ) : null}
      {warning ? (
        <StatusMessage tone="warning">{warning}</StatusMessage>
      ) : null}

      <div className="grid gap-3">
        {!isLoading && checklists.length === 0 ? (
          <EmptyState message="No closes found. Submitted and in-progress closes will appear here." />
        ) : null}
        {weeks.map((week) => {
          const cleaningStats = getWeeklyCleaningStats(week.weeklyCleaning)

          return (
            <SectionCard key={week.startDate}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-[#1F1D1A]">
                    {formatShortDate(week.startDate)} - {formatShortDate(week.endDate)}
                  </h2>
                </div>
                <div className="flex items-center justify-end gap-2 text-right">
                  <p className="text-sm font-extrabold text-[#1F1D1A]">
                    Cleaning {cleaningStats.completed} / {cleaningStats.total}
                  </p>
                  <button
                    className="min-h-9 rounded-lg border border-[#DED8CF] bg-[#FFFCF7] px-3 text-sm font-bold text-[#1F1D1A] active:bg-[#EFE8DD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1D1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF7]"
                    onClick={() => setSelectedWeeklyCleaning(week.weeklyCleaning)}
                    type="button"
                  >
                    View cleaning
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {weekdayLabels.map((weekday, index) => {
                  const date = addDays(week.startDate, index)
                  const checklist = checklistsByDate.get(date)
                  const stats = checklist
                    ? getDailyChecklistStats(checklist, tasks)
                    : null
                  const workerName = checklist
                    ? getWorkerName(workers, checklist.workerId)
                    : 'No close'
                  const status = getDayStatus(checklist)
                  const hasData = Boolean(checklist)
                  const hasProgress =
                    status === 'In progress' || status === 'Incomplete'
                  const isCurrentBarDate = date === currentBarDate

                  return (
                    <button
                      className={[
                        'flex min-h-[132px] flex-col justify-between rounded-xl border p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1D1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF7]',
                        isCurrentBarDate
                          ? 'border-[#B79E79] bg-[#EFE4D2] shadow-[inset_0_0_0_1px_rgba(183,158,121,0.45)]'
                          : hasData
                          ? hasProgress
                            ? 'border-[#CFC7BC] bg-[#FFFCF7] active:bg-[#EFE8DD]'
                            : 'border-[#DED8CF] bg-[#FFFCF7] active:bg-[#EFE8DD]'
                          : 'cursor-default border-[#E8E1D7] bg-[#F7F4EF] text-[#6F6A63] opacity-80',
                      ].join(' ')}
                      disabled={!hasData}
                      key={date}
                      onClick={() => {
                        if (checklist) {
                          setSelectedChecklist(checklist)
                        }
                      }}
                      type="button"
                    >
                      <div>
                        <p className="text-base font-bold text-[#1F1D1A]">
                          {weekday}
                        </p>
                        <p className="whitespace-nowrap text-sm font-semibold text-[#6F6A63]">
                          {formatShortDate(date)}
                        </p>
                      </div>

                      {hasData ? (
                        <div className="grid gap-1">
                          <p
                            className={[
                              'text-sm font-extrabold leading-tight',
                              status === 'Submitted'
                                ? 'text-[#1F1D1A]'
                                : 'text-[#5C5147]',
                            ].join(' ')}
                          >
                            {status}
                          </p>
                          <p className="truncate text-sm font-semibold text-[#6F6A63]">
                            {workerName}
                          </p>
                          <p className="text-sm font-bold text-[#1F1D1A]">
                            {stats?.resolved ?? 0} / {stats?.total ?? 0} resolved
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-[#6F6A63]">
                          No close
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </SectionCard>
          )
        })}
      </div>

      <ChecklistDetailModal
        checklist={selectedChecklist}
        onClose={() => setSelectedChecklist(null)}
        tasks={tasks}
        workerName={selectedWorkerName}
      />
      <WeeklyCleaningDetailModal
        draft={selectedWeeklyCleaning}
        onClose={() => setSelectedWeeklyCleaning(null)}
        tasks={tasks}
        workers={workers}
      />
    </div>
  )
}

export default ThisWeekPage
