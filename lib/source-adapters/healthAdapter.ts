import type { SourceAdapter } from './adapterTypes'
import { buildAdapterSignal, hoursAgo } from './adapterUtils'

export function createHealthAdapter(getStatus: () => SourceAdapter['status'], getLastSync: () => string | undefined): SourceAdapter {
  return {
    id: 'health',
    name: 'Health',
    source: 'health',
    get status() { return getStatus() },
    get lastSyncedAt() { return getLastSync() },
    async testConnection() {
      return getStatus() === 'mock' || getStatus() === 'connected'
    },
    async sync() {
      return [
        buildAdapterSignal('health', 'health', {
          title: '6.2 hours sleep',
          content: 'Sleep duration: 6.2 hours. Recovery below target — consider lighter morning load.',
          timestamp: hoursAgo(8),
          syncKey: 'health-sleep-today',
          relatedObjectIds: [],
          metadata: { sleepHours: 6.2, lowRecovery: true },
        }),
        buildAdapterSignal('health', 'health', {
          title: 'Workout not completed today',
          content: 'No workout logged today. Training block is still open.',
          timestamp: hoursAgo(1),
          syncKey: 'health-workout-gap',
          relatedObjectIds: [],
          metadata: { workoutLogged: false, alert: true },
        }),
        buildAdapterSignal('health', 'health', {
          title: 'High energy window',
          content: 'HRV trend suggests high energy window 10:00–12:00. Good for deep work.',
          timestamp: hoursAgo(3),
          syncKey: 'health-energy-window',
          relatedObjectIds: [],
          metadata: { energyLevel: 'high', recoveryScore: 82 },
        }),
      ]
    },
  }
}

export function createWatchAdapter(getStatus: () => SourceAdapter['status'], getLastSync: () => string | undefined): SourceAdapter {
  return {
    id: 'watch',
    name: 'Watch',
    source: 'watch',
    get status() { return getStatus() },
    get lastSyncedAt() { return getLastSync() },
    async testConnection() {
      return getStatus() === 'mock' || getStatus() === 'connected'
    },
    async sync() {
      return [
        buildAdapterSignal('watch', 'watch', {
          title: 'Activity rings closing',
          content: 'Move ring at 78%, exercise ring at 45%. Stand hours: 8/12.',
          timestamp: hoursAgo(2),
          syncKey: 'watch-activity-rings',
          type: 'health',
          relatedObjectIds: [],
          metadata: { movePercent: 78, exercisePercent: 45 },
        }),
        buildAdapterSignal('watch', 'watch', {
          title: 'Step count on track',
          content: '8,420 steps so far today — on pace for 10k goal.',
          timestamp: hoursAgo(1),
          syncKey: 'watch-steps',
          type: 'activity',
          relatedObjectIds: [],
          metadata: { steps: 8420, goal: 10000 },
        }),
      ]
    },
  }
}
