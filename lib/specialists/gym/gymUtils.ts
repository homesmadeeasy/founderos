import type { GymInput, GymGoal, GoalProfile, EquipmentProfile, InjuryProfile, MuscleGroup } from './gymTypes'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { Signal } from '@/lib/signal-engine/signalTypes'
import type { KnowledgeRecord } from '@/lib/knowledge-engine/knowledgeTypes'

const GYM_KEYWORDS = [
  'gym', 'workout', 'train', 'lifting', 'strength', 'muscle', 'bench', 'squat',
  'deadlift', 'press', 'pull', 'legs', 'chest', 'back', 'protein', 'recovery',
  'hypertrophy', 'powerlifting', 'cardio', 'reps', 'sets', 'rpe',
]

export function textMatchesGym(text: string): boolean {
  const lower = text.toLowerCase()
  return GYM_KEYWORDS.some(k => lower.includes(k))
}

export interface FilteredGymData {
  objects: FounderObject[]
  memories: MemoryRecord[]
  knowledge: KnowledgeRecord[]
  signals: Signal[]
  workoutObjects: FounderObject[]
  healthLogs: MemoryRecord[]
  workoutSignals: Signal[]
  healthSignals: Signal[]
  gymKnowledge: KnowledgeRecord[]
  goalObjects: FounderObject[]
}

export function gatherGymData(input: GymInput): FilteredGymData {
  const objects = input.objects.filter(o =>
    o.area === 'health' || o.type === 'workout' || o.type === 'habit'
    || textMatchesGym(`${o.title} ${o.summary ?? ''} ${o.content ?? ''} ${o.tags.join(' ')}`),
  )

  const memories = input.memories.filter(m =>
    m.area === 'health' || m.type === 'health_log'
    || textMatchesGym(`${m.title} ${m.content} ${m.summary ?? ''} ${m.tags.join(' ')}`),
  )

  const knowledge = input.knowledge.filter(k =>
    k.domain === 'gym' || k.domain === 'health'
    || textMatchesGym(`${k.title} ${k.principle} ${k.tags.join(' ')}`),
  )

  const signals = input.signals.filter(s =>
    s.type === 'workout' || s.type === 'health' || s.source === 'health' || s.source === 'watch'
    || textMatchesGym(`${s.title} ${s.content}`),
  )

  return {
    objects,
    memories,
    knowledge,
    signals,
    workoutObjects: objects.filter(o => o.type === 'workout'),
    healthLogs: memories.filter(m => m.type === 'health_log'),
    workoutSignals: signals.filter(s => s.type === 'workout' || /workout|gym|train/i.test(`${s.title} ${s.content}`)),
    healthSignals: signals.filter(s => s.type === 'health' || s.source === 'health'),
    gymKnowledge: knowledge.filter(k => k.domain === 'gym'),
    goalObjects: objects.filter(o =>
      (o.type === 'goal' || o.type === 'habit') && (o.area === 'health' || textMatchesGym(o.title)),
    ),
  }
}

export function inferGoalProfile(data: FilteredGymData, input: GymInput): GoalProfile {
  const goalText = [
    ...data.goalObjects.map(o => `${o.title} ${o.summary ?? ''}`),
    ...data.gymKnowledge.map(k => `${k.title} ${k.principle}`),
  ].join(' ').toLowerCase()

  let primaryGoal: GymGoal = 'general_fitness'
  if (/powerlift|squat.*bench.*deadlift/i.test(goalText)) primaryGoal = 'powerlifting'
  else if (/muscle|hypertrophy|growth|size/i.test(goalText)) primaryGoal = 'muscle_growth'
  else if (/strength|stronger|1rm|max/i.test(goalText)) primaryGoal = 'strength'
  else if (/athletic|sport|performance|speed/i.test(goalText)) primaryGoal = 'athletic_performance'
  else if (/weight loss|fat loss|cut|lean/i.test(goalText)) primaryGoal = 'weight_loss'

  const sessionCount = data.workoutObjects.length + data.healthLogs.filter(m => /workout completed/i.test(m.content)).length
  const experience = sessionCount >= 20 ? 'advanced' : sessionCount >= 5 ? 'intermediate' : 'beginner'

  return {
    primaryGoal,
    label: primaryGoal.replace(/_/g, ' '),
    trainingDaysPerWeek: experience === 'beginner' ? 3 : experience === 'intermediate' ? 4 : 5,
    experience,
  }
}

export function inferEquipmentProfile(data: FilteredGymData): EquipmentProfile {
  const text = [
    ...data.gymKnowledge.map(k => k.principle),
    ...data.memories.map(m => m.content),
  ].join(' ').toLowerCase()

  const available: EquipmentProfile['available'] = ['bodyweight']
  if (/barbell|squat rack/i.test(text)) available.push('barbell')
  if (/dumbbell/i.test(text)) available.push('dumbbell')
  if (/cable|pulley/i.test(text)) available.push('cable')
  if (/machine|leg press/i.test(text)) available.push('machine')
  if (/kettlebell/i.test(text)) available.push('kettlebell')
  if (available.length === 1) {
    available.push('barbell', 'dumbbell', 'cable', 'machine')
  }

  return {
    available: [...new Set(available)],
    limitations: [],
  }
}

export function inferInjuryProfile(data: FilteredGymData): InjuryProfile {
  const text = [
    ...data.memories.map(m => m.content),
    ...data.signals.map(s => s.content),
  ].join(' ').toLowerCase()

  const areas: string[] = []
  const restrictions: string[] = []
  if (/knee|patella/i.test(text)) {
    areas.push('knee')
    restrictions.push('Limit deep knee flexion under heavy load')
  }
  if (/lower back|lumbar/i.test(text)) {
    areas.push('lower back')
    restrictions.push('Prioritise hinge technique and moderate spinal loading')
  }
  if (/shoulder|rotator/i.test(text)) {
    areas.push('shoulder')
    restrictions.push('Use controlled pressing volume and warm-up sets')
  }

  return { areas, restrictions }
}

export function allMuscleGroups(): MuscleGroup[] {
  return [
    'chest', 'back', 'shoulders', 'front_delts', 'side_delts', 'rear_delts',
    'triceps', 'biceps', 'forearms', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'lower_back',
  ]
}

export function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export function startOfWeekISO(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
