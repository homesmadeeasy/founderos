/** Shared Identity Engine utilities. */

export function nowISO(): string {
  return new Date().toISOString()
}

export function newIdentityId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function displayValueFromUnknown(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(String).join(', ')
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
