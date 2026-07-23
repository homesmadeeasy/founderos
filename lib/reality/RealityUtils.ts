export function nowISO(): string {
  return new Date().toISOString()
}

export function newRealityId(prefix = 'ry'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export function startOfDayISO(iso: string): string {
  const d = new Date(iso)
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return local.toISOString()
}

export function dayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function hoursAgoISO(hours: number, now = nowISO()): string {
  return new Date(new Date(now).getTime() - hours * 3600_000).toISOString()
}

export function daysAgoISO(days: number, now = nowISO()): string {
  return addDaysISO(now, -days)
}

export function formatDayLabel(dateKey: string, now = new Date()): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((today.getTime() - target.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) {
    return target.toLocaleDateString(undefined, { weekday: 'long' })
  }
  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function average(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}
