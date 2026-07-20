/**
 * Workout status / schedule tests.
 * Run: npm run test:gym-status
 */
import './gymTestSetup'
import { createDefaultGymProfile } from './gymProfileUtils'
import {
  scheduleFirstSessionTomorrow,
  skipWorkoutSession,
} from './gymScheduleService'
import {
  calendarDateISO,
  filterCompletedSessionRecords,
  todayWorkoutCalendarStatus,
} from './gymSessionStatus'
import { hasStructuredHistory } from './gymSessionMerge'
import { computeMuscleVolumeFromSessions } from './gymStorage/gymMuscleMapping'
import { migrateDatastore } from './gymStorage/gymStorageSchema'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

function testScheduleTomorrowLeavesTodayNotStarted() {
  const { planned } = scheduleFirstSessionTomorrow({ title: 'First training session' })
  assert(planned.status === 'planned', 'tomorrow session is planned')
  assert(planned.exercises.every(e => e.sets.length === 0), 'planned session has no fabricated sets')
  const today = calendarDateISO()
  const status = todayWorkoutCalendarStatus([planned], today)
  assert(status.status === 'not_started', 'today remains Not Started when only tomorrow is planned')
  assert(!hasStructuredHistory([planned]), 'planned is not history')
  console.log('PASS: start tomorrow creates planned session; today not started')
}

function testSkipStoresReasonAndOffersReschedule() {
  const profile = createDefaultGymProfile()
  profile.trainingDaysPerWeek = 3
  const { skipped, rescheduled } = skipWorkoutSession({
    title: 'Push day',
    reason: 'illness',
    note: 'Felt off',
    profile,
  })
  assert(skipped.status === 'skipped', 'status skipped')
  assert(skipped.skipReason === 'illness', 'reason stored')
  assert(skipped.completed === false, 'not completed')
  assert(skipped.exercises.length === 0, 'no fake sets on skip')
  assert(rescheduled != null && rescheduled.status === 'planned', 'offers reschedule as planned')
  assert(filterCompletedSessionRecords([skipped, rescheduled!]).length === 0, 'neither is statistical')
  const vol = computeMuscleVolumeFromSessions([skipped], false)
  assert(vol.every(v => v.directSets === 0), 'skip adds zero volume')
  console.log('PASS: skip workout stores reason and offers reschedule')
}

function testLegacyMigrationSetsStatus() {
  const store = migrateDatastore({
    version: 1,
    sessions: [{
      id: 'a',
      date: '2026-07-01T10:00:00.000Z',
      startedAt: '2026-07-01T09:00:00.000Z',
      completedAt: '2026-07-01T10:00:00.000Z',
      title: 'Push',
      exercises: [],
      completed: true,
      painFlags: [],
      source: 'gym_logger',
    }],
  })
  assert(store.version === 2, 'version 2')
  assert(store.sessions[0].status === 'completed', 'migrated status')
  console.log('PASS: legacy migration assigns workout status')
}

function run() {
  console.log('Gym status tests\n')
  testScheduleTomorrowLeavesTodayNotStarted()
  testSkipStoresReasonAndOffersReschedule()
  testLegacyMigrationSetsStatus()
  console.log('\nAll gym status tests passed.')
}

run()
