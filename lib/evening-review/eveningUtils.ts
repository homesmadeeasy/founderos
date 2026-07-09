export function newEveningId(prefix = 'eve'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function tomorrowISO(from = todayISO()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}
