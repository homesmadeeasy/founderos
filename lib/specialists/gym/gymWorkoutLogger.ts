import type {
  WorkoutSession,
  ExercisePerformance,
  SetPerformance,
  GymInput,
} from './gymTypes'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { Signal } from '@/lib/signal-engine/signalTypes'
import type { CreateObjectInput } from '@/lib/object-engine/objectTypes'
import type { CreateMemoryInput } from '@/lib/memory-engine/memoryTypes'
import { findExerciseByName, getExerciseById } from './gymExerciseLibrary'
import { gatherGymData } from './gymUtils'

const SET_PATTERN = /(\d+)\s*[x×]\s*(\d+)(?:\s*@\s*(\d+(?:\.\d+)?)\s*(?:kg|lb)?)?/gi
const EXERCISE_SET_LINE = /^([a-zA-Z\s-]+)\s*[:\-]?\s*(.+)$/i

function parseSetsFromText(text: string): SetPerformance[] {
  const sets: SetPerformance[] = []
  let match: RegExpExecArray | null
  let setNum = 0
  const re = new RegExp(SET_PATTERN.source, 'gi')
  while ((match = re.exec(text)) !== null) {
    setNum += 1
    sets.push({
      setNumber: setNum,
      reps: parseInt(match[2], 10),
      weight: match[3] ? parseFloat(match[3]) : 0,
      completed: true,
    })
  }
  return sets
}

function parseExercisesFromContent(content: string): ExercisePerformance[] {
  const lines = content.split(/[\n;]+/).map(l => l.trim()).filter(Boolean)
  const performances: ExercisePerformance[] = []

  for (const line of lines) {
    const exerciseMatch = line.match(EXERCISE_SET_LINE)
    if (!exerciseMatch) continue
    const name = exerciseMatch[1].trim()
    const setsText = exerciseMatch[2]
    const exercise = findExerciseByName(name)
    const sets = parseSetsFromText(setsText)
    if (sets.length === 0 && !exercise) continue
    performances.push({
      exerciseId: exercise?.id ?? `custom-${name.toLowerCase().replace(/\s+/g, '-')}`,
      exerciseName: exercise?.name ?? name,
      sets,
    })
  }

  if (performances.length === 0) {
    const known = findExerciseByName(content)
    if (known) {
      const sets = parseSetsFromText(content)
      if (sets.length > 0) {
        performances.push({ exerciseId: known.id, exerciseName: known.name, sets })
      }
    }
  }

  return performances
}

function sessionFromWorkoutObject(obj: FounderObject): WorkoutSession | null {
  const meta = obj.metadata ?? {}
  const exercises = Array.isArray(meta.exercises)
    ? (meta.exercises as ExercisePerformance[])
    : parseExercisesFromContent(`${obj.content ?? ''} ${obj.summary ?? ''}`)

  if (exercises.length === 0 && !meta.completed && obj.status !== 'completed') {
    if (!/workout|train|gym/i.test(obj.title)) return null
  }

  return {
    id: obj.id,
    date: obj.updatedAt ?? obj.createdAt,
    title: obj.title,
    exercises,
    durationMinutes: typeof meta.durationMinutes === 'number' ? meta.durationMinutes : undefined,
    completed: obj.status === 'completed' || Boolean(meta.completed),
    notes: obj.summary,
    sourceType: 'object',
    sourceId: obj.id,
  }
}

function sessionFromHealthLog(mem: MemoryRecord): WorkoutSession | null {
  if (!/workout|train|gym|bench|squat|deadlift|press/i.test(mem.content)) return null
  const exercises = parseExercisesFromContent(mem.content)
  return {
    id: mem.id,
    date: mem.occurredAt,
    title: mem.title,
    exercises,
    completed: /completed|finished|done/i.test(mem.content),
    notes: mem.content,
    sourceType: 'memory',
    sourceId: mem.id,
  }
}

function sessionFromSignal(sig: Signal): WorkoutSession | null {
  if (sig.type !== 'workout' && !/workout|gym|train/i.test(`${sig.title} ${sig.content}`)) return null
  return {
    id: sig.id,
    date: sig.timestamp,
    title: sig.title,
    exercises: [],
    completed: !/not logged|not completed|gap/i.test(sig.content),
    notes: sig.content,
    sourceType: 'signal',
    sourceId: sig.id,
  }
}

export function parseWorkoutSessions(input: GymInput): WorkoutSession[] {
  const data = gatherGymData(input)
  const sessions: WorkoutSession[] = []

  for (const obj of data.workoutObjects) {
    const s = sessionFromWorkoutObject(obj)
    if (s) sessions.push(s)
  }
  for (const mem of data.healthLogs) {
    const s = sessionFromHealthLog(mem)
    if (s) sessions.push(s)
  }
  for (const sig of data.workoutSignals) {
    const s = sessionFromSignal(sig)
    if (s) sessions.push(s)
  }

  const seen = new Set<string>()
  return sessions
    .filter(s => {
      const key = `${s.date.slice(0, 10)}-${s.title}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)
}

export function buildWorkoutSessionObject(input: {
  title: string
  exercises: ExercisePerformance[]
  durationMinutes?: number
  notes?: string
}): CreateObjectInput {
  return {
    type: 'workout',
    title: input.title,
    summary: input.notes,
    area: 'health',
    status: 'completed',
    tags: ['gym', 'workout', 'strength'],
    source: 'manual',
    metadata: {
      exercises: input.exercises,
      durationMinutes: input.durationMinutes,
      completed: true,
    },
    relationships: [],
  }
}

export function buildWorkoutLogMemory(input: {
  exercises: ExercisePerformance[]
  notes?: string
}): CreateMemoryInput {
  const lines = input.exercises.map(ex => {
    const setStr = ex.sets.map(s =>
      s.weight > 0 ? `${s.reps}@${s.weight}kg` : `${s.reps}`,
    ).join(', ')
    return `${ex.exerciseName}: ${ex.sets.length}x sets (${setStr})`
  })
  return {
    type: 'health_log',
    title: 'Workout logged',
    content: [...lines, input.notes].filter(Boolean).join(' · ') || 'Workout completed',
    importance: 'medium',
    area: 'health',
    source: 'manual',
    relatedObjectIds: [],
    tags: ['gym', 'workout', 'health'],
    occurredAt: new Date().toISOString(),
  }
}

export function buildSetPerformance(
  exerciseId: string,
  reps: number,
  weight: number,
  rpe?: number,
): ExercisePerformance {
  const exercise = getExerciseById(exerciseId)
  return {
    exerciseId,
    exerciseName: exercise?.name ?? exerciseId,
    sets: [{
      setNumber: 1,
      reps,
      weight,
      rpe,
      completed: true,
    }],
  }
}
