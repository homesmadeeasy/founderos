import assert from 'node:assert/strict'
import { validateActionPayload } from './actionValidation'
import { extractWorkoutFromMessage } from './actionUtils'
import { buildActionPreview } from './actionProposal'
import { ensureActionHandlersRegistered, resetActionHandlersForTests } from './registerActionHandlers'
import { canExecuteActionType } from './actionDispatcher'
import { runActionHandler } from './actionExecution'
import type { ActionExecutionContext } from './actionTypes'

function mockCtx(events: { type: string; payload: Record<string, unknown> }[]): ActionExecutionContext {
  const created = {
    memories: [] as { id: string; title: string }[],
    objects: [] as { id: string }[],
  }
  let memCounter = 0
  let objCounter = 0
  return {
    recordMemory: (input) => {
      memCounter += 1
      const rec = { id: `mem-${memCounter}`, title: String(input.title ?? 'memory') }
      created.memories.push(rec)
      return rec
    },
    createKnowledge: async () => ({ id: 'know-1' }),
    createObject: (input) => {
      objCounter += 1
      const rec = { id: `obj-${objCounter}`, object: input }
      created.objects.push(rec)
      return rec
    },
    addTask: async () => {},
    createProject: async () => ({ id: 'proj-1' }),
    updateMission: () => {},
    startValidationSprint: async () => {},
    publish: async (event) => {
      events.push({ type: event.type, payload: event.payload })
    },
  }
}

function testWorkoutValidation() {
  const valid = validateActionPayload('WorkoutLogged', {
    exerciseName: 'Bench Press',
    weight: 80,
    reps: 8,
    sets: 3,
  })
  assert.equal(valid.valid, true)

  const invalid = validateActionPayload('WorkoutLogged', { exerciseName: 'Bench' })
  assert.equal(invalid.valid, false)
}

function testWorkoutExtraction() {
  const parsed = extractWorkoutFromMessage('I benched 80kg for 8 reps')
  assert.ok(parsed)
  assert.equal(parsed!.exerciseName, 'Bench Press')
  assert.equal(parsed!.weight, 80)
  assert.equal(parsed!.reps, 8)
}

function testWorkoutPreview() {
  const preview = buildActionPreview('WorkoutLogged', {
    exerciseName: 'Bench Press',
    weight: 80,
    reps: 8,
    sets: 3,
  })
  assert.match(preview, /WorkoutLogged/)
  assert.match(preview, /Bench Press/)
  assert.match(preview, /80/)
}

async function testWorkoutExecution() {
  resetActionHandlersForTests()
  ensureActionHandlersRegistered()
  assert.equal(canExecuteActionType('WorkoutLogged'), true)

  const events: { type: string; payload: Record<string, unknown> }[] = []
  const ctx = mockCtx(events)
  const result = await runActionHandler(
    'WorkoutLogged',
    { exerciseName: 'Bench Press', weight: 80, reps: 8, sets: 3 },
    ctx,
    { proposalId: 'prop-1', source: 'test', preview: 'preview' },
  )

  assert.equal(result.success, true)
  assert.ok(result.createdIds?.memoryId)
  assert.ok(result.createdIds?.objectId)
  assert.ok(events.some(e => e.type === 'WorkoutLogged'))
  assert.ok(events.some(e => e.type === 'WeeklyVolumeUpdated'))
  assert.ok(events.some(e => e.type === 'ActionExecuted'))
  assert.ok(events.some(e => e.type === 'MemoryCreated'))
}

async function run() {
  testWorkoutValidation()
  testWorkoutExtraction()
  testWorkoutPreview()
  await testWorkoutExecution()
  console.log('actionEngineTests: all passed')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
