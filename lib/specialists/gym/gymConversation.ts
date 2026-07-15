import type { GymSnapshot, GymQuestionId } from './gymTypes'
import { MUSCLE_GROUP_LABELS, GYM_GOAL_LABELS } from './gymTypes'
import { buildPushPullLegsRoutine } from './gymWorkoutPlanner'
import { buildProgressionAdvice } from './gymProgression'
import { neglectedMuscles } from './gymMuscleAnalysis'

export const GYM_QUESTION_CHIPS: { id: GymQuestionId; label: string; prompt: string }[] = [
  { id: 'train_today', label: 'What should I train today?', prompt: 'What should I train today?' },
  { id: 'routine', label: 'Build PPL routine', prompt: 'Build me a push pull legs routine.' },
  { id: 'muscles_behind', label: 'Lagging muscles', prompt: 'Which muscle is falling behind?' },
  { id: 'what_weight', label: 'Increase weight?', prompt: 'Should I increase weight?' },
  { id: 'recovery', label: 'Am I recovering?', prompt: 'Am I recovering?' },
  { id: 'bench_stuck', label: 'Bench stuck', prompt: 'Why is my bench stuck?' },
  { id: 'chest_volume', label: 'Chest volume', prompt: 'How much chest volume am I doing?' },
  { id: 'deload', label: 'Should I deload?', prompt: 'Should I deload?' },
  { id: 'improve', label: 'What to improve?', prompt: 'What should I improve?' },
  { id: 'progressing', label: 'Am I progressing?', prompt: 'Am I progressing?' },
]

export function answerGymQuestion(snapshot: GymSnapshot, prompt: string): string {
  const lower = prompt.trim().toLowerCase()

  if (lower.includes('train today') || lower.includes('what should i train')) {
    const ex = snapshot.todaysWorkout.exercises
      .map(e => `${e.order}. **${e.exerciseName}** — ${e.sets}×${e.reps} @ RPE ${e.targetRpe}`)
      .join('\n')
    return [
      `**Today's session: ${snapshot.todaysWorkout.title}** (~${snapshot.todaysWorkout.estimatedMinutes} min)`,
      ex || 'No exercises planned — check equipment and recovery constraints.',
      `**Muscles:** ${snapshot.todaysWorkout.musclesTrained.map(m => MUSCLE_GROUP_LABELS[m]).join(', ') || '—'}`,
      `**Why:** ${snapshot.todaysWorkout.rationale}`,
      snapshot.evidence.length > 0
        ? `**Evidence:** ${snapshot.evidence.slice(0, 2).map(e => e.title).join(' · ')}`
        : '',
    ].filter(Boolean).join('\n\n')
  }

  if (lower.includes('push pull legs') || lower.includes('ppl') || lower.includes('routine')) {
    const ppl = buildPushPullLegsRoutine(snapshot.goalProfile)
    return [
      `**${ppl.name}** (goal: ${GYM_GOAL_LABELS[snapshot.goalProfile.primaryGoal]})`,
      ...ppl.days.map(d => `• ${d}`),
      `Align intensity with recovery status: **${snapshot.recoveryStatus.replace('_', ' ')}**.`,
    ].join('\n\n')
  }

  if (lower.includes('falling behind') || lower.includes('muscles behind') || lower.includes('lagging')) {
    const neglected = neglectedMuscles(snapshot.weeklyVolume)
    if (neglected.length === 0) {
      return 'No major muscle groups are clearly lagging from logged volume this week.'
    }
    return [
      '**Muscles behind this week:**',
      neglected.slice(0, 5).map(m => `• ${MUSCLE_GROUP_LABELS[m]}`).join('\n'),
      snapshot.weaknesses[0] ? `**Focus:** ${snapshot.weaknesses[0].description}` : '',
    ].filter(Boolean).join('\n\n')
  }

  if (lower.includes('increase weight') || lower.includes('what weight')) {
    const advice = buildProgressionAdvice(snapshot.strengthEstimates)[0]
    if (!advice) {
      return 'Log exercises with weight and reps to get load recommendations.'
    }
    return `**${advice.exerciseName}:** ${advice.recommendation}`
  }

  if (lower.includes('recover')) {
    return [
      `**Recovery: ${snapshot.recoveryStatus.replace('_', ' ')}** (score ${snapshot.recoveryScore})`,
      snapshot.topRecommendation,
      snapshot.evidence.filter(e => e.sourceType === 'health' || e.sourceType === 'signal').slice(0, 2)
        .map(e => `• ${e.title}: ${e.summary}`).join('\n') || '',
    ].filter(Boolean).join('\n\n')
  }

  if (lower.includes('bench stuck') || lower.includes('bench press')) {
    const bench = snapshot.strengthEstimates.find(e => e.exerciseId === 'barbell-bench-press')
    if (!bench || !bench.lastWeight) {
      return 'No logged bench press data — log sets to diagnose plateaus.'
    }
    return [
      `**Bench:** last ${bench.lastWeight}kg × ${bench.lastReps} (trend: ${bench.trend})`,
      bench.trend === 'plateau'
        ? 'Plateau likely — add paused reps, volume on incline press, or a small deload week.'
        : bench.trend === 'up'
          ? 'Bench is progressing — keep adding reps before load.'
          : 'Load trending down — check sleep, recovery, and pressing volume balance.',
      snapshot.weaknesses.find(w => w.id === 'push-pull-imbalance')
        ? '**Also:** Push/pull imbalance may limit bench progress.'
        : '',
    ].filter(Boolean).join('\n\n')
  }

  if (lower.includes('chest volume')) {
    const chest = snapshot.weeklyVolume.find(v => v.muscle === 'chest')
    if (!chest || chest.sets === 0) {
      return 'No logged chest volume this week — complete and log a push session.'
    }
    return `**Chest volume:** ${chest.sets} sets this week (${chest.status}). ${snapshot.weaknesses.find(w => w.muscle === 'chest')?.description ?? ''}`
  }

  if (lower.includes('deload')) {
    if (snapshot.recoveryStatus === 'deload' || snapshot.recoveryScore < 50) {
      return '**Yes — deload recommended.** Reduce sets by ~40%, keep technique sharp, prioritise sleep.'
    }
    return '**Not yet.** Recovery score supports normal training. Deload if sleep drops or performance stalls 2+ weeks.'
  }

  if (lower.includes('improve') || lower.includes('what should i')) {
    return [
      `**Improve:** ${snapshot.topRecommendation}`,
      snapshot.weaknesses.slice(0, 2).map(w => `• ${w.title}: ${w.description}`).join('\n'),
    ].join('\n\n')
  }

  if (lower.includes('progressing') || lower.includes('progress')) {
    const up = snapshot.strengthEstimates.filter(e => e.trend === 'up').length
    const plateau = snapshot.strengthEstimates.filter(e => e.trend === 'plateau').length
    if (snapshot.strengthEstimates.length === 0) {
      return 'Insufficient logged performance data to assess progression.'
    }
    return [
      `**Progression score:** ${snapshot.progressionScore}/100`,
      `**Trends:** ${up} improving · ${plateau} plateau · ${snapshot.strengthEstimates.length} tracked lifts`,
      snapshot.progressionScore >= 60
        ? 'You are progressing on logged lifts.'
        : 'Progress is flat — address recovery, volume balance, or exercise selection.',
    ].join('\n\n')
  }

  if (lower.includes('replace') && lower.includes('squat')) {
    return '**Barbell squat alternatives:** Leg press (machine), Romanian deadlift (posterior chain), or leg extension (quad isolation) — choose based on equipment and knee comfort.'
  }

  if (lower.includes('tomorrow')) {
    const split = snapshot.todaysWorkout.title.toLowerCase().includes('push') ? 'pull'
      : snapshot.todaysWorkout.title.toLowerCase().includes('pull') ? 'legs'
        : 'push'
    return `After today's **${snapshot.todaysWorkout.title}**, tomorrow likely fits a **${split}** emphasis — confirm after logging today's session.`
  }

  return [
    `**Gym AI** (${GYM_GOAL_LABELS[snapshot.goalProfile.primaryGoal]})`,
    snapshot.mainInsight,
    `**Today:** ${snapshot.todaysWorkout.title} — ${snapshot.topRecommendation}`,
  ].join('\n\n')
}

export function matchGymQuestion(prompt: string): GymQuestionId | null {
  const lower = prompt.toLowerCase()
  const chip = GYM_QUESTION_CHIPS.find(c => lower.includes(c.prompt.toLowerCase().slice(0, 12)) || lower.includes(c.label.toLowerCase()))
  return chip?.id ?? null
}
