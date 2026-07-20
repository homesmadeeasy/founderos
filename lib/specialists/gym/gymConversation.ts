import type { GymSnapshot, GymQuestionId } from './gymTypes'
import { MUSCLE_GROUP_LABELS, GYM_GOAL_LABELS } from './gymTypes'
import { buildPushPullLegsRoutine } from './gymWorkoutPlanner'

export const GYM_QUESTION_CHIPS: { id: GymQuestionId; label: string; prompt: string }[] = [
  { id: 'train_today', label: 'What should I train today?', prompt: 'What should I train today?' },
  { id: 'what_weight', label: 'What weight?', prompt: 'What weight should I use?' },
  { id: 'last_time', label: 'Last time?', prompt: 'What did I do last time?' },
  { id: 'progressing', label: 'Am I progressing?', prompt: 'Am I progressing?' },
  { id: 'maintain_increase', label: 'Maintain or increase?', prompt: 'Should I maintain or increase the weight?' },
  { id: 'muscles_behind', label: 'Least work recently?', prompt: 'Which muscles have received the least work recently?' },
  { id: 'last_workout', label: 'Last workout', prompt: 'Show my last workout' },
  { id: 'short_session', label: '45 min workout', prompt: "Change today's workout to 45 minutes." },
  { id: 'recovery', label: 'Am I recovering?', prompt: 'Am I recovering?' },
  { id: 'chest_volume', label: 'Chest volume', prompt: 'How much chest volume am I doing?' },
]

export function answerGymQuestion(snapshot: GymSnapshot, prompt: string): string {
  const lower = prompt.trim().toLowerCase()

  if (lower.includes('train today') || lower.includes('what should i train')) {
    if (!snapshot.hasStructuredHistory) {
      return [
        `**Today's proposal: ${snapshot.todaysWorkout.title}** (~${snapshot.todaysWorkout.estimatedMinutes} min)`,
        'This is a plan — not a completed workout. Approve and log real sets when you train.',
        'No completed history yet, so volume and progression stay at baseline until your first logged session.',
        snapshot.todaysWorkout.exercises.map(e => `• ${e.exerciseName} — ${e.sets}×${e.reps}`).join('\n'),
      ].join('\n\n')
    }
    const ex = snapshot.todaysWorkout.exercises
      .map(e => {
        const mode = e.prescription.prescriptionMode === 'evidence_informed' ? 'evidence-informed' : 'fallback'
        return `${e.order}. **${e.exerciseName}** — ${e.sets}×${e.reps} @ RPE ${e.targetRpe} (${mode}, ${e.prescription.prescriptionConfidence}% confidence)`
      })
      .join('\n')
    return [
      `**Today's session: ${snapshot.todaysWorkout.title}** (~${snapshot.todaysWorkout.estimatedMinutes} min)`,
      ex || 'No exercises planned — check equipment and recovery constraints.',
      `**Why:** ${snapshot.todaysWorkout.rationale}`,
    ].filter(Boolean).join('\n\n')
  }

  if (
    lower.includes('start tomorrow')
    || lower.includes('train tomorrow')
    || lower.includes('begin tomorrow')
    || lower.includes("we'll start tomorrow")
    || lower.includes('start later')
  ) {
    return 'No problem — we\'ll start tomorrow. Today stays **Not Started**. A planned session will be ready then. Your first **logged** workout will become the baseline for all future recommendations. Planned or skipped sessions never count as completed work.'
  }

  if (lower.includes('skip') && (lower.includes('workout') || lower.includes('today') || lower.includes('session'))) {
    return 'You can skip today from the workout card and pick a reason (time, illness, busy, recovery, travel, or other). That is stored as real metadata. Skipped workouts do **not** add volume, PRs, or progression — and we never invent sets. After a skip, I\'ll offer to reschedule to your next available training day.'
  }

  if (lower.includes('push pull legs') || lower.includes('ppl') || lower.includes('routine')) {
    const ppl = buildPushPullLegsRoutine(snapshot.goalProfile)
    return [
      `**${ppl.name}** (goal: ${GYM_GOAL_LABELS[snapshot.goalProfile.primaryGoal]})`,
      ...ppl.days.map(d => `• ${d}`),
      `Align intensity with recovery status: **${snapshot.recoveryStatus.replace('_', ' ')}**.`,
    ].join('\n\n')
  }

  if (lower.includes('falling behind') || lower.includes('muscles behind') || lower.includes('lagging') || lower.includes('least work')) {
    if (!snapshot.hasStructuredHistory) {
      return 'Insufficient data — complete at least one logged workout week before comparing muscle workload.'
    }
    const behind = snapshot.weeklyVolume
      .filter(v => v.status === 'below_baseline' || v.status === 'low')
      .sort((a, b) => a.sets - b.sets)
    if (behind.length === 0) {
      return 'No muscles are clearly below your recent baseline from logged volume.'
    }
    return [
      '**Muscles with least recent work (from logged sets):**',
      behind.slice(0, 5).map(m => `• ${MUSCLE_GROUP_LABELS[m.muscle]}: ${m.sets} weighted sets (${m.status})`).join('\n'),
    ].join('\n\n')
  }

  if (lower.includes('increase weight') || lower.includes('what weight') || lower.includes('maintain or increase')) {
    const rec = snapshot.progressionRecommendations[0]
    if (!rec) {
      return 'Insufficient logged performance data — complete a workout with working sets to get load recommendations.'
    }
    return `**${rec.exerciseName}** (${rec.action}): ${rec.recommendation}\n\n**Evidence:** ${rec.evidence}`
  }

  if (lower.includes('last time') || lower.includes('what did i do')) {
    const last = snapshot.recentSessions[0]
    if (!last) return 'No logged sessions found — uncertainty: high until you complete a structured workout.'
    const ex = last.exercises[0]
    const sets = ex?.sets.filter(s => s.completed).map(s => `${s.weight}kg×${s.reps}`).join(', ')
    return `**Last session:** ${last.title} (${last.date.slice(0, 10)})\n${ex ? `${ex.exerciseName}: ${sets}` : 'No exercise detail available.'}`
  }

  if (lower.includes('last workout') || lower.includes('show my last')) {
    const last = snapshot.recentSessions[0]
    if (!last) return 'No completed workouts in structured history.'
    const lines = last.exercises.map(e => {
      const working = e.sets.filter(s => s.completed)
      return `• ${e.exerciseName}: ${working.map(s => `${s.weight}kg×${s.reps}`).join(', ') || '—'}`
    })
    return `**${last.title}** — ${last.date.slice(0, 10)}\n${lines.join('\n')}`
  }

  if (lower.includes('45 min') || lower.includes('45 minutes') || lower.includes('shorter')) {
    return '**Proposal:** Shorten today\'s session to ~45 minutes by reducing accessories. Approve a modified workout from the workout card — I will not change your plan silently.'
  }

  if (lower.includes('why') && (lower.includes('exercise') || lower.includes('select'))) {
    const ex = snapshot.todaysWorkout.exercises[0]
    if (!ex) return 'No exercise selected in today\'s plan.'
    return `**${ex.exerciseName}:** ${ex.prescription.rationale}\n\n**Research:** ${ex.prescription.explanation.researchBasis}`
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
    if (!snapshot.hasStructuredHistory || !chest || chest.sets === 0) {
      return 'Insufficient data — no structured chest volume logged this week.'
    }
    const direct = chest.directSets ?? chest.sets
    return `**Chest volume:** ${direct} direct sets${chest.secondarySets ? ` (+${chest.secondarySets} secondary credit)` : ''} — ${chest.status.replace(/_/g, ' ')}.`
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
    if (!snapshot.hasStructuredHistory) {
      return 'Insufficient structured history to assess progression — log working sets with weight.'
    }
    const recs = snapshot.progressionRecommendations.slice(0, 3)
    if (recs.length === 0) {
      return 'No progression data from recent sessions.'
    }
    return [
      `**Progression score:** ${snapshot.progressionScore}/100`,
      ...recs.map(r => `• **${r.exerciseName}** (${r.action}): ${r.evidence}`),
    ].join('\n')
  }

  if (lower.includes('replace') && lower.includes('squat')) {
    return '**Barbell squat alternatives:** Leg press (machine), Romanian deadlift (posterior chain), or leg extension (quad isolation) — choose based on equipment and knee comfort.'
  }

  if (lower.includes('tomorrow')) {
    return 'After today\'s session (once completed and logged), tomorrow can emphasise the next split. Until then, today may be **Not Started**, **Planned**, or **Skipped** — none of those invent completed sets.'
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
