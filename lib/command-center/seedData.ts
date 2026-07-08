import type { CommandCenterState } from './types'
import { newId, nowISO, todayISO } from './utils'

export function createSeedState(): CommandCenterState {
  const now = nowISO()
  const today = todayISO()

  const founderId = newId()
  const ascendId = newId()
  const modelId = newId()
  const year12Id = newId()

  return {
    mission: '',
    missionDate: today,
    projects: [
      {
        id: founderId,
        name: 'FounderOS',
        status: 'active',
        area: 'systems',
        outcome: 'Build the AI operating system for life and work execution.',
        nextAction: 'Ship Sprint 2 Command Center',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ascendId,
        name: 'AscendOS',
        status: 'active',
        area: 'systems',
        outcome: 'Evolve the personal OS vision into a daily command centre.',
        nextAction: 'Define daily execution loop',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: modelId,
        name: 'Model Protocol',
        status: 'active',
        area: 'health',
        outcome: 'Consistent training, nutrition and recovery system.',
        nextAction: 'Complete today\'s workout',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: year12Id,
        name: 'Year 12',
        status: 'active',
        area: 'knowledge',
        outcome: 'Strong academic results with sustainable study habits.',
        nextAction: 'Read 20 pages',
        createdAt: now,
        updatedAt: now,
      },
    ],
    tasks: [
      {
        id: newId(),
        title: 'Complete today\'s Daily Log',
        status: 'not_started',
        priority: 'high',
        area: 'health',
        dueDate: today,
        projectId: modelId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: newId(),
        title: 'Complete workout',
        status: 'not_started',
        priority: 'high',
        area: 'health',
        dueDate: today,
        projectId: modelId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: newId(),
        title: 'Read 20 pages',
        status: 'not_started',
        priority: 'medium',
        area: 'knowledge',
        dueDate: today,
        projectId: year12Id,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: newId(),
        title: 'Move FounderOS forward',
        status: 'in_progress',
        priority: 'high',
        area: 'systems',
        dueDate: today,
        projectId: founderId,
        createdAt: now,
        updatedAt: now,
      },
    ],
    dailyLogs: [],
    captureItems: [],
    aiMessages: [],
  }
}
