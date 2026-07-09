import type { ConversationSession, ConversationStore, ConversationTimelineEntry } from './conversationTypes'
import { newConversationId, nowISO } from './conversationUtils'

const STORAGE_KEY = 'founderos-conversation-v1'

function emptyStore(): ConversationStore {
  return {
    sessions: [],
    timeline: [],
    lastSessionId: null,
    proactiveDismissedAt: null,
  }
}

export function loadConversationStore(): ConversationStore {
  if (typeof window === 'undefined') return emptyStore()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as ConversationStore
    return {
      sessions: parsed.sessions ?? [],
      timeline: parsed.timeline ?? [],
      lastSessionId: parsed.lastSessionId ?? null,
      proactiveDismissedAt: parsed.proactiveDismissedAt ?? null,
    }
  } catch {
    return emptyStore()
  }
}

export function saveConversationStore(store: ConversationStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getActiveSession(store: ConversationStore): ConversationSession | null {
  if (!store.lastSessionId) return null
  const session = store.sessions.find(s => s.id === store.lastSessionId)
  return session?.status === 'active' ? session : null
}

export function upsertSession(store: ConversationStore, session: ConversationSession): ConversationStore {
  const sessions = store.sessions.filter(s => s.id !== session.id)
  sessions.unshift(session)
  return {
    ...store,
    sessions: sessions.slice(0, 40),
    lastSessionId: session.status === 'active' ? session.id : store.lastSessionId,
  }
}

export function addTimelineEntry(
  store: ConversationStore,
  entry: Omit<ConversationTimelineEntry, 'id' | 'timestamp'> & { timestamp?: string },
): ConversationStore {
  const timelineEntry: ConversationTimelineEntry = {
    id: newConversationId(),
    timestamp: entry.timestamp ?? nowISO(),
    ...entry,
  }
  return {
    ...store,
    timeline: [timelineEntry, ...store.timeline].slice(0, 200),
  }
}

export function dismissProactive(store: ConversationStore): ConversationStore {
  return { ...store, proactiveDismissedAt: nowISO() }
}

export function wasProactiveDismissedToday(store: ConversationStore): boolean {
  if (!store.proactiveDismissedAt) return false
  const today = new Date().toISOString().slice(0, 10)
  return store.proactiveDismissedAt.slice(0, 10) === today
}
