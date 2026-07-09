export function newKnowledgeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `know-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase()
}
