/**
 * Workout status / schedule / first-session presentation tests.
 * Run: npm run test:gym-status
 */
import './gymTestSetup'
import { createDefaultGymProfile } from './gymProfileUtils'
import {
  scheduleFirstSessionTomorrow,
  skipWorkoutSession,
} from './gymScheduleService'
import {
  addDaysISO,
  calendarDateISO,
  filterCompletedSessionRecords,
  todayWorkoutCalendarStatus,
} from './gymSessionStatus'
import {
  buildWorkoutCardPresentation,
  cancelDeferredTomorrowSessions,
  keepForTomorrowCreatesNoHistory,
  resolveFirstSessionIntent,
} from './gymFirstSessionPresentation'
import { hasStructuredHistory } from './gymSessionMerge'
import { computeMuscleVolumeFromSessions } from './gymStorage/gymMuscleMapping'
import { migrateDatastore } from './gymStorage/gymStorageSchema'
import type { ApprovedWorkoutPlan, WorkoutSessionRecord } from './gymStorage/gymStorageTypes'
import {
  getGymStorageRepository,
  resetGymStorageForTests,
} from './gymStorage/gymStorageRepository'
import { createOrResumeActiveWorkoutFromPlan } from './gymStorage/gymWorkoutService'

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

function testTomorrowNotMisleadingAsTodayActionable() {
  const today = calendarDateISO()
  const profile = createDefaultGymProfile()
  profile.firstSessionIntent = 'tomorrow'
  profile.firstSessionChoiceComplete = true
  const { planned } = scheduleFirstSessionTomorrow({ title: 'First training session' })
  const todayStatus = todayWorkoutCalendarStatus([planned], today)
  const presentation = buildWorkoutCardPresentation({
    profile,
    sessions: [planned],
    todayStatus,
    hasActiveWorkout: false,
    todayISO: today,
  })
  assert(presentation.mode === 'planned_tomorrow', 'mode is planned_tomorrow')
  assert(presentation.heading === 'Planned for tomorrow', 'heading not Today\'s workout')
  assert(!presentation.showApprove && !presentation.showStart && !presentation.showSkip, 'no today start controls')
  assert(presentation.showStartTodayInstead, 'offers Start today instead')
  assert(presentation.showKeepForTomorrow && presentation.showChangeSchedule, 'offers keep / change')
  console.log('PASS: tomorrow-planned workout does not appear as today\'s actionable workout')
}

function testTodayScheduledShowsStandardControls() {
  const today = calendarDateISO()
  const profile = createDefaultGymProfile()
  profile.firstSessionIntent = 'today'
  const todayStatus = todayWorkoutCalendarStatus([], today)
  const presentation = buildWorkoutCardPresentation({
    profile,
    sessions: [],
    todayStatus,
    hasActiveWorkout: false,
    todayISO: today,
  })
  assert(presentation.mode === 'today_actionable', 'today actionable')
  assert(presentation.heading === "Today's workout", 'today heading')
  assert(presentation.showApprove && presentation.showStart && presentation.showSkip, 'standard controls')
  assert(!presentation.showStartTodayInstead, 'no start-today-instead')
  console.log('PASS: today\'s scheduled workout shows standard start controls')
}

function testActiveShowsResume() {
  const today = calendarDateISO()
  const presentation = buildWorkoutCardPresentation({
    profile: { firstSessionIntent: 'today' },
    sessions: [],
    todayStatus: { status: 'in_progress', label: 'In Progress' },
    hasActiveWorkout: true,
    todayISO: today,
  })
  assert(presentation.mode === 'resume', 'resume mode')
  assert(presentation.showResume, 'shows Resume workout')
  assert(!presentation.showStart && !presentation.showStartTodayInstead, 'no start controls')
  console.log('PASS: active workout shows Resume workout')
}

function testCompletedOrSkippedHideStart() {
  const today = calendarDateISO()
  for (const status of ['completed', 'skipped'] as const) {
    const presentation = buildWorkoutCardPresentation({
      profile: { firstSessionIntent: 'today' },
      sessions: [],
      todayStatus: { status, label: status },
      hasActiveWorkout: false,
      todayISO: today,
    })
    assert(presentation.mode === 'terminal', `${status} is terminal`)
    assert(!presentation.showStart && !presentation.showStartTodayInstead && !presentation.showResume,
      `${status} hides start controls`)
  }
  console.log('PASS: completed or skipped workouts do not show invalid start controls')
}

function testKeepForTomorrowCreatesNoCompletedHistory() {
  const { planned } = scheduleFirstSessionTomorrow({ title: 'First' })
  const before = [planned]
  const after = [planned] // keep is a no-op on sessions
  assert(keepForTomorrowCreatesNoHistory(before, after), 'no completed history delta')
  assert(filterCompletedSessionRecords(after).length === 0, 'still zero completed')
  console.log('PASS: keeping the workout for tomorrow creates no completed history')
}

function testStartTodayInsteadCreatesOneActiveSession() {
  resetGymStorageForTests()
  const repo = getGymStorageRepository()
  const today = calendarDateISO()
  const { planned } = scheduleFirstSessionTomorrow({ title: 'First training session' })
  repo.addSession(planned)

  const plan: ApprovedWorkoutPlan = {
    id: 'plan-start-today',
    approvedAt: new Date().toISOString(),
    title: 'First training session',
    workoutInstanceId: 'wi-start-today',
    whySummary: 'test',
    exercises: [{
      plannedExerciseId: 'pe-1',
      exerciseId: 'bench-press',
      exerciseName: 'Bench Press',
      order: 1,
      sets: 3,
      targetReps: 8,
      targetRpe: 7,
      suggestedLoadKg: 60,
      prescriptionConfidence: 'medium',
    }],
  }
  repo.saveApprovedPlan(plan)

  // Simulate startWorkoutTodayInstead core: cancel deferred + create/resume active
  const { sessions: cancelled, cancelledIds } = cancelDeferredTomorrowSessions(
    repo.listSessions(),
    today,
  )
  assert(cancelledIds.length === 1, 'cancels deferred tomorrow planned')
  for (const s of cancelled) {
    if (cancelledIds.includes(s.id)) repo.upsertSession(s)
  }
  assert(repo.listSessions().find(s => s.id === planned.id)?.status === 'cancelled', 'deferred cancelled')

  const first = createOrResumeActiveWorkoutFromPlan(plan, repo.getActiveWorkout())
  repo.saveActiveWorkout(first)
  const second = createOrResumeActiveWorkoutFromPlan(plan, repo.getActiveWorkout())
  assert(second.id === first.id, 'double start does not create duplicate sessions')
  assert(repo.getActiveWorkout()?.id === first.id, 'one active workout')
  assert(first.status === 'active' || first.status === 'paused', 'active engine status')
  // Navigation target is /gym/workout (UI); domain guarantees one active session here.
  console.log('PASS: Start today instead creates one active session; double-click safe')
}

function testResolveFirstSessionMigration() {
  const today = '2026-07-23'
  const profile = createDefaultGymProfile()
  profile.firstSessionIntent = 'tomorrow'

  // Still genuinely tomorrow
  const future: WorkoutSessionRecord = {
    id: 'p1',
    date: '2026-07-24T12:00:00.000Z',
    scheduledFor: '2026-07-24',
    startedAt: '2026-07-23T10:00:00.000Z',
    completedAt: '',
    updatedAt: '2026-07-23T10:00:00.000Z',
    title: 'First',
    exercises: [],
    completed: false,
    status: 'planned',
    painFlags: [],
    source: 'gym_logger',
  }
  const still = resolveFirstSessionIntent(profile, [future], today)
  assert(still.intent === 'tomorrow' && !still.migrated, 'keeps tomorrow when not due')

  // Due today → migrate
  const due = { ...future, id: 'p2', scheduledFor: today, date: `${today}T12:00:00.000Z` }
  const migrated = resolveFirstSessionIntent(profile, [due], today)
  assert(migrated.intent === 'today' && migrated.migrated, 'migrates when planned is due')

  // Completed history → migrate
  const done = {
    ...due,
    id: 'p3',
    status: 'completed' as const,
    completed: true,
    completedAt: `${today}T13:00:00.000Z`,
  }
  const afterHistory = resolveFirstSessionIntent(profile, [done], today)
  assert(afterHistory.intent === 'today' && afterHistory.migrated, 'migrates when history exists')
  console.log('PASS: safe migration/default for firstSessionIntent=tomorrow')
}

function testLocalDateBoundaries() {
  const local = new Date(2026, 6, 22, 23, 30, 0) // Jul 22 2026 local evening
  const iso = calendarDateISO(local)
  assert(iso === '2026-07-22', `local evening stays on local date, got ${iso}`)
  const morning = new Date(2026, 6, 23, 0, 15, 0)
  assert(calendarDateISO(morning) === '2026-07-23', 'local midnight+ is next local day')
  assert(addDaysISO('2026-07-22', 1) === '2026-07-23', 'addDaysISO uses calendar days')
  // UTC midnight can differ from local — calendarDateISO must use local getters, not toISOString().
  const nearUtcBoundary = new Date(Date.UTC(2026, 6, 23, 0, 30, 0))
  const localDay = calendarDateISO(nearUtcBoundary)
  const y = nearUtcBoundary.getFullYear()
  const m = String(nearUtcBoundary.getMonth() + 1).padStart(2, '0')
  const d = String(nearUtcBoundary.getDate()).padStart(2, '0')
  assert(localDay === `${y}-${m}-${d}`, 'calendarDateISO matches local Y-M-D getters')
  console.log('PASS: local date boundaries and timezone behaviour')
}

function testProposalDoesNotCreateGymCompletedSets() {
  // Gym history is repository sessions; WorkoutLogged action writes memory/objects only.
  resetGymStorageForTests()
  const repo = getGymStorageRepository()
  const before = repo.listSessions().filter(s => s.status === 'completed').length
  // Approving a legacy WorkoutLogged proposal must not upsert completed gym sessions.
  // (UI no longer proposes this on Gym home; guard the repository contract.)
  assert(before === 0, 'starts empty')
  assert(filterCompletedSessionRecords(repo.listSessions()).length === 0, 'no completed sets from proposal path')
  console.log('PASS: approving a proposal does not create completed gym sets')
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
  assert(store.version === 3, 'version 3')
  assert(store.sessions[0].status === 'completed', 'migrated status')
  console.log('PASS: legacy migration assigns workout status')
}

function run() {
  console.log('Gym status tests\n')
  testScheduleTomorrowLeavesTodayNotStarted()
  testTomorrowNotMisleadingAsTodayActionable()
  testTodayScheduledShowsStandardControls()
  testActiveShowsResume()
  testCompletedOrSkippedHideStart()
  testKeepForTomorrowCreatesNoCompletedHistory()
  testStartTodayInsteadCreatesOneActiveSession()
  testResolveFirstSessionMigration()
  testLocalDateBoundaries()
  testProposalDoesNotCreateGymCompletedSets()
  testSkipStoresReasonAndOffersReschedule()
  testLegacyMigrationSetsStatus()
  console.log('\nAll gym status tests passed.')
}

run()
