export function newMemoryId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase()
}

export function isSameDay(iso: string, day = todayISO()): boolean {
  return iso.slice(0, 10) === day
}
