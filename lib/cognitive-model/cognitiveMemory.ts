import type { CognitiveStore } from './beliefTypes'

let activeStore: CognitiveStore | null = null
let lastPersistedSnapshot: string | null = null
let storageWarning: string | null = null
let persistDisabled = false

let persistInvocationCount = 0

export function trackPersistInvocation(): void {
  persistInvocationCount += 1
}

export function getPersistInvocationCount(): number {
  return persistInvocationCount
}

export function resetPersistInvocationCount(): void {
  persistInvocationCount = 0
}

export function getActiveMemoryStore(): CognitiveStore | null {
  return activeStore
}

export function setActiveMemoryStore(store: CognitiveStore): void {
  activeStore = store
}

export function clearActiveMemoryStore(): void {
  activeStore = null
}

export function getLastPersistedSnapshot(): string | null {
  return lastPersistedSnapshot
}

export function setLastPersistedSnapshot(snapshot: string | null): void {
  lastPersistedSnapshot = snapshot
}

export function getStorageWarning(): string | null {
  return storageWarning
}

export function setStorageWarning(message: string | null): void {
  storageWarning = message
}

export function isPersistDisabled(): boolean {
  return persistDisabled
}

export function setPersistDisabled(disabled: boolean): void {
  persistDisabled = disabled
}
