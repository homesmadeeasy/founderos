import type { ActionHistoryEntry } from './actionTypes'
import { newConversationId, nowISO } from '@/lib/conversation/conversationUtils'

const STORAGE_KEY = 'founderos-action-history-v1'

function readAll(): ActionHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ActionHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: ActionHistoryEntry[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 300)))
}

export function recordActionHistory(entry: Omit<ActionHistoryEntry, 'id' | 'executedAt'>): ActionHistoryEntry {
  const full: ActionHistoryEntry = {
    ...entry,
    id: newConversationId(),
    executedAt: nowISO(),
  }
  const items = readAll()
  items.unshift(full)
  writeAll(items)
  return full
}

export function listActionHistory(limit = 50): ActionHistoryEntry[] {
  return readAll().slice(0, limit)
}

export function getLastReversibleAction(): ActionHistoryEntry | undefined {
  return readAll().find((e) => e.status === 'executed' && e.undoPayload)
}

export function markActionUndone(id: string): void {
  const items = readAll()
  const idx = items.findIndex((e) => e.id === id)
  if (idx < 0) return
  items[idx] = { ...items[idx], status: 'undone' }
  writeAll(items)
}
