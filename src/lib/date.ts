function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function fromDateString(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(year, month - 1, day)
}

export function getBarDate(date = new Date()) {
  const barDate = new Date(date)

  if (barDate.getHours() < 6) {
    barDate.setDate(barDate.getDate() - 1)
  }

  return toDateString(barDate)
}

export function formatReadableDate(dateString: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(fromDateString(dateString))
}

export function getCurrentWeekRange(date = new Date()) {
  const barDate = fromDateString(getBarDate(date))
  const day = barDate.getDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  const startDate = new Date(barDate)
  startDate.setDate(barDate.getDate() - daysSinceMonday)

  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)

  return {
    startDate: toDateString(startDate),
    endDate: toDateString(endDate),
  }
}
