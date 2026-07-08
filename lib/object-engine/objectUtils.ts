export function newObjectId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `obj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}
