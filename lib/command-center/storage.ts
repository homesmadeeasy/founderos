import type { CommandCenterState } from './types'
import { createSeedState } from './seedData'
import { todayISO } from './utils'

const STORAGE_KEY = 'founderos-command-center-v1'

export function loadCommandCenterState(): CommandCenterState {
  if (typeof window === 'undefined') {
    return createSeedState()
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = createSeedState()
      saveCommandCenterState(seeded)
      return seeded
    }

    const parsed = JSON.parse(raw) as CommandCenterState
    return normalizeState(parsed)
  } catch {
    const seeded = createSeedState()
    saveCommandCenterState(seeded)
    return seeded
  }
}

export function saveCommandCenterState(state: CommandCenterState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function normalizeState(state: CommandCenterState): CommandCenterState {
  const today = todayISO()
  return {
    mission: state.mission ?? '',
    missionDate: state.missionDate === today ? state.missionDate : today,
    projects: state.projects ?? [],
    tasks: state.tasks ?? [],
    dailyLogs: state.dailyLogs ?? [],
    captureItems: state.captureItems ?? [],
    aiMessages: state.aiMessages ?? [],
  }
}
