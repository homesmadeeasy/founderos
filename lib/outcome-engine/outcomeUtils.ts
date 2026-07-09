export function newOutcomeId(prefix = 'out'): string {
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

export function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function normalizeDecisionTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function predictionKey(date: string, title: string): string {
  return `${date}::${normalizeDecisionTitle(title)}`
}

export function extractDecisionKeywords(title: string, area?: string): string[] {
  const text = `${title} ${area ?? ''}`.toLowerCase()
  const keywords: string[] = []
  if (text.includes('study') || text.includes('economics') || text.includes('exam') || text.includes('class')) {
    keywords.push('study')
  }
  if (text.includes('founderos') || text.includes('deep work') || text.includes('build') || text.includes('coding')) {
    keywords.push('founderos')
  }
  if (text.includes('workout') || text.includes('gym') || text.includes('train')) {
    keywords.push('workout')
  }
  if (text.includes('recover') || text.includes('rest') || text.includes('sleep')) {
    keywords.push('recovery')
  }
  if (text.includes('inbox') || text.includes('capture') || text.includes('process')) {
    keywords.push('inbox')
  }
  if (area) keywords.push(area)
  return [...new Set(keywords)]
}

export function titlesMatch(a: string, b: string): boolean {
  const na = normalizeDecisionTitle(a)
  const nb = normalizeDecisionTitle(b)
  if (na === nb) return true
  const ka = extractDecisionKeywords(a)
  const kb = extractDecisionKeywords(b)
  return ka.length > 0 && kb.length > 0 && ka.some(k => kb.includes(k))
}
