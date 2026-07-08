export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `cc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function formatDisplayDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function isDueToday(dueDate: string | null, today = todayISO()): boolean {
  if (!dueDate) return false
  return dueDate.slice(0, 10) === today
}

export function isOverdue(dueDate: string | null, today = todayISO()): boolean {
  if (!dueDate) return false
  return dueDate.slice(0, 10) < today
}
