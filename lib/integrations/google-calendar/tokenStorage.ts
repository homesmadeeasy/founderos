/**
 * Client-side manual token storage for Google Calendar (developer / future OAuth bridge).
 * Access tokens only — never commit tokens to the repo.
 */

const STORAGE_KEY = 'founderos-google-calendar-v1'

interface GoogleCalendarTokenStore {
  accessToken?: string
  updatedAt?: string
}

function load(): GoogleCalendarTokenStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as GoogleCalendarTokenStore
  } catch {
    return {}
  }
}

function persist(store: GoogleCalendarTokenStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getGoogleCalendarToken(): string | null {
  const token = load().accessToken?.trim()
  return token || null
}

export function setGoogleCalendarToken(token: string): void {
  persist({
    accessToken: token.trim(),
    updatedAt: new Date().toISOString(),
  })
}

export function clearGoogleCalendarToken(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

export function hasGoogleCalendarToken(): boolean {
  return Boolean(getGoogleCalendarToken())
}
