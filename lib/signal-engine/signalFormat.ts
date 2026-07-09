/** Deterministic UTC formatting — safe for SSR hydration (no locale / Date.now). */

export function formatSignalTimestamp(timestamp?: string): string {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toISOString().replace('T', ' ').slice(0, 16)
}
