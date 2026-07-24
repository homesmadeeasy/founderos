/**
 * Gym specialist adapter for the Intelligence Pipeline.
 * Builds domain evidence from existing GymSnapshot — does not reimplement planning.
 */

import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'
import { GYM_GOAL_LABELS, MUSCLE_GROUP_LABELS } from '@/lib/specialists/gym/gymTypes'
import type {
  DeclaredProfileField,
  GymReadinessLevel,
  IntelligenceEvidenceHit,
  IntelligenceIntent,
  IntelligenceResponsePartial,
  ObservedIdentityField,
} from '@/lib/intelligence-pipeline/intelligenceTypes'
import type { IdentitySpecialistView } from '@/lib/identity/identityTypes'
import type { GymProfile } from '@/lib/specialists/gym/gymStorage/gymStorageTypes'

const GYM_IDENTITY_KEYS = [
  'training_goal',
  'training_experience',
  'training_equipment',
  'training_days_per_week',
  'preferred_session_duration',
  'injury_limitations',
  'exercise_preferences',
  'exercise_dislikes',
  'training_structure',
] as const

export function inferGymIntent(message: string): IntelligenceIntent {
  const lower = message.toLowerCase()
  if (lower.includes('train today') || lower.includes('what should i train')) return 'train_today'
  if (lower.includes('recover')) return 'recovery'
  if (lower.includes('progress') || lower.includes('maintain or increase')) return 'progression'
  return 'general_question'
}

export function gymReadinessFromSources(input: {
  profile?: GymProfile | null
  identity?: IdentitySpecialistView | null
  hasStructuredHistory: boolean
  completedWorkoutCount?: number
}): GymReadinessLevel {
  const declaredKeys = new Set([
    ...(input.identity?.declared.map(f => f.key) ?? []),
  ])
  const fromProfile = Boolean(input.profile?.complete)
  const hasGoal = fromProfile || declaredKeys.has('training_goal')
  const hasExperience = fromProfile || declaredKeys.has('training_experience')
  const hasEquipment = fromProfile || declaredKeys.has('training_equipment')
  const hasDays = fromProfile || declaredKeys.has('training_days_per_week')
  const minReady = hasGoal && (hasExperience || hasEquipment || hasDays)
  if (!minReady && !fromProfile) return 'not_ready'
  const count = input.completedWorkoutCount
    ?? (input.hasStructuredHistory ? 3 : 0)
  if (count >= 5 && minReady) return 'evidence_rich'
  if (minReady && (hasEquipment && hasDays)) return 'personalized'
  return 'minimum_ready'
}

export function declaredProfileFromGymIdentity(
  identity: IdentitySpecialistView | null | undefined,
  profile?: GymProfile | null,
): DeclaredProfileField[] {
  const fields: DeclaredProfileField[] = []
  for (const fact of identity?.declared ?? []) {
    if (!GYM_IDENTITY_KEYS.includes(fact.key as typeof GYM_IDENTITY_KEYS[number]) && !fact.relevanceTags?.includes('gym')) {
      continue
    }
    fields.push({
      key: fact.key,
      label: fact.label,
      value: fact.displayValue,
      source: 'identity_declared',
    })
  }
  if (profile?.complete) {
    const ensure = (key: string, label: string, value: string) => {
      if (!fields.some(f => f.key === key) && value) {
        fields.push({ key, label, value, source: 'gym_profile' })
      }
    }
    ensure('training_goal', 'Training goal', GYM_GOAL_LABELS[profile.primaryGoal as keyof typeof GYM_GOAL_LABELS] ?? String(profile.primaryGoal))
    ensure('training_experience', 'Experience', profile.experience)
    ensure('training_days_per_week', 'Training days', String(profile.trainingDaysPerWeek))
    ensure('preferred_session_duration', 'Session duration', `${profile.sessionDurationMinutes} min`)
    ensure('training_equipment', 'Equipment', profile.equipment.join(', '))
    if (profile.injuryLimitations.length) {
      ensure('injury_limitations', 'Injuries / limitations', profile.injuryLimitations.join('; '))
    }
  }
  return fields
}

export function observedIdentityFromGym(
  identity: IdentitySpecialistView | null | undefined,
): ObservedIdentityField[] {
  return (identity?.observed ?? [])
    .filter(f => f.relevanceTags?.includes('gym') || GYM_IDENTITY_KEYS.includes(f.key as typeof GYM_IDENTITY_KEYS[number]))
    .map(f => ({
      key: f.key,
      label: f.label,
      value: f.displayValue,
      confidence: f.confidence,
      contradictionNote: f.contradictionNote,
    }))
}

export function collectGymDomainEvidence(snapshot: GymSnapshot): {
  evidence: IntelligenceEvidenceHit[]
  constraints: string[]
  goals: string[]
  missing: string[]
  followUpQuestion?: string
  recoveryFreshness: 'fresh' | 'stale' | 'unknown'
} {
  const evidence: IntelligenceEvidenceHit[] = []
  const constraints: string[] = []
  const missing: string[] = []
  const goals = [
    GYM_GOAL_LABELS[snapshot.goalProfile.primaryGoal] ?? snapshot.goalProfile.primaryGoal,
  ]

  evidence.push({
    id: 'gym_plan_today',
    title: `Today's plan: ${snapshot.todaysWorkout.title}`,
    summary: `${snapshot.todaysWorkout.exercises.length} exercises · ~${snapshot.todaysWorkout.estimatedMinutes} min · ${snapshot.todaysWorkout.rationale}`,
    weight: 0.9,
    source: 'gym',
    kind: 'domain',
    freshness: 'fresh',
  })

  evidence.push({
    id: 'gym_recovery',
    title: `Recovery: ${snapshot.recoveryStatus.replace(/_/g, ' ')}`,
    summary: `Score ${snapshot.recoveryScore}. ${snapshot.mainInsight}`,
    weight: 0.75,
    source: 'gym',
    kind: 'domain',
    freshness: snapshot.recoveryStatus === 'recover' || snapshot.recoveryStatus === 'deload' ? 'fresh' : 'unknown',
  })

  if (snapshot.hasStructuredHistory) {
    evidence.push({
      id: 'gym_history',
      title: 'Completed workout history available',
      summary: `${snapshot.recentSessions.length} recent session(s) in snapshot. Planner uses logged sessions only.`,
      weight: 0.85,
      source: 'gym',
      kind: 'domain',
      freshness: 'fresh',
    })
  } else {
    missing.push('completed workout history')
    evidence.push({
      id: 'gym_no_history',
      title: 'No completed history yet',
      summary: 'Baseline plan only until the first logged session.',
      weight: 0.5,
      source: 'gym',
      kind: 'domain',
      freshness: 'unknown',
    })
  }

  if (snapshot.equipmentProfile?.available?.length) {
    evidence.push({
      id: 'gym_equipment',
      title: 'Available equipment',
      summary: snapshot.equipmentProfile.available.join(', '),
      weight: 0.8,
      source: 'gym',
      kind: 'declared',
      freshness: 'fresh',
    })
  } else {
    missing.push('equipment profile')
  }

  const injuryNotes = [
    ...(snapshot.injuryProfile?.restrictions ?? []),
    ...(snapshot.injuryProfile?.areas ?? []).map(a => `Area: ${a}`),
  ].filter(Boolean)
  for (const injury of injuryNotes) {
    constraints.push(`Avoid / modify around: ${injury}`)
    evidence.push({
      id: `gym_injury_${injury.slice(0, 24)}`,
      title: 'Movement restriction (user-declared)',
      summary: injury,
      weight: 0.95,
      source: 'gym',
      kind: 'declared',
      freshness: 'fresh',
    })
  }

  if (snapshot.weaknesses?.length) {
    const labels = snapshot.weaknesses
      .slice(0, 3)
      .map(w => w.title || (w.muscle ? (MUSCLE_GROUP_LABELS[w.muscle] ?? w.muscle) : w.description))
    evidence.push({
      id: 'gym_weaknesses',
      title: 'Relative volume gaps',
      summary: labels.join(', '),
      weight: 0.7,
      source: 'gym',
      kind: 'observed',
      freshness: 'fresh',
    })
  }

  const recoveryFreshness: 'fresh' | 'stale' | 'unknown' =
    snapshot.hasStructuredHistory ? 'fresh' : 'unknown'

  let followUpQuestion: string | undefined
  if (!snapshot.hasStructuredHistory) {
    followUpQuestion = 'After you log your first session, should we bias the next plan toward more upper or lower body work?'
  } else if (!injuryNotes.length) {
    followUpQuestion = 'Any injuries or movement restrictions I should respect?'
  }

  return {
    evidence,
    constraints,
    goals,
    missing,
    followUpQuestion,
    recoveryFreshness,
  }
}

/**
 * User-facing Gym answer grounded in IntelligenceContext.
 * Never invents workouts, injuries, sleep, or history.
 */
export function answerGymWithIntelligence(
  snapshot: GymSnapshot,
  prompt: string,
  partial: IntelligenceResponsePartial,
): string {
  const lower = prompt.trim().toLowerCase()
  const ctx = partial.responseContext
  const sections: string[] = []

  // Known facts (declared + domain) — not inferences
  const known: string[] = []
  for (const d of ctx.declaredProfile.slice(0, 6)) {
    known.push(`${d.label}: ${d.value}`)
  }
  if (ctx.constraints.length) {
    known.push(...ctx.constraints.slice(0, 3))
  }
  if (known.length) {
    sections.push(`**Known about you (declared / profile)**\n${known.map(k => `• ${k}`).join('\n')}`)
  }

  const observed = ctx.observedIdentity.slice(0, 4)
  if (observed.length) {
    sections.push(
      `**Observed patterns (not overwriting declared)**\n${
        observed.map(o => {
          const conf = Math.round(o.confidence * 100)
          const note = o.contradictionNote ? ` — ${o.contradictionNote}` : ''
          return `• ${o.label}: ${o.value} (~${conf}%)${note}`
        }).join('\n')
      }`,
    )
  }

  if (ctx.realitySnapshot.summary && ctx.realitySnapshot.summary !== 'No reality summary available.') {
    sections.push(`**What is happening now**\n• ${ctx.realitySnapshot.summary}`)
  }

  // Core deterministic answer from snapshot (source of truth for the plan)
  const core = answerGymQuestionCore(snapshot, lower, prompt)
  sections.push(core)

  // Explicit missing data
  if (ctx.missingInformation.length) {
    sections.push(
      `**Missing information (not invented)**\n${
        ctx.missingInformation.slice(0, 5).map(m => `• ${m}`).join('\n')
      }`,
    )
  }

  // One high-value follow-up
  if (ctx.followUpQuestion) {
    sections.push(`**One question that would improve this**\n${ctx.followUpQuestion}`)
  }

  // Confidence note for weak evidence
  if (partial.confidence < 0.55 || ctx.readiness === 'not_ready' || ctx.readiness === 'minimum_ready') {
    sections.push(
      `**Confidence note**\nThis is a **safe baseline** (${Math.round(partial.confidence * 100)}% pipeline confidence, readiness: ${ctx.readiness ?? 'unknown'}). It uses only declared profile + current plan — not fabricated history.`,
    )
  }

  return sections.filter(Boolean).join('\n\n')
}

function answerGymQuestionCore(snapshot: GymSnapshot, lower: string, prompt: string): string {
  void prompt
  if (lower.includes('train today') || lower.includes('what should i train')) {
    if (!snapshot.hasStructuredHistory) {
      return [
        `**Today's proposal: ${snapshot.todaysWorkout.title}** (~${snapshot.todaysWorkout.estimatedMinutes} min)`,
        'This is a **plan**, not a completed workout. Log real sets when you train.',
        '**Basis:** declared goal/equipment/schedule when available. No completed history yet — volume and progression stay at baseline.',
        snapshot.todaysWorkout.exercises.map(e => `• ${e.exerciseName} — ${e.sets}×${e.reps}`).join('\n') || '• No exercises planned — check equipment and constraints.',
        `**Why this plan:** ${snapshot.todaysWorkout.rationale}`,
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
      `**Why (from logged evidence):** ${snapshot.todaysWorkout.rationale}`,
      `**Recovery used:** ${snapshot.recoveryStatus.replace(/_/g, ' ')} (score ${snapshot.recoveryScore})`,
    ].filter(Boolean).join('\n\n')
  }

  if (lower.includes('recover')) {
    return [
      `**Recovery status:** ${snapshot.recoveryStatus.replace(/_/g, ' ')} (score ${snapshot.recoveryScore})`,
      snapshot.mainInsight,
      'This reflects logged training load signals available in Gym — not a medical assessment.',
    ].join('\n\n')
  }

  // Fall back to legacy core for other chips — imported dynamically to avoid circular deps
  return legacyCore(snapshot, lower, prompt)
}

function legacyCore(snapshot: GymSnapshot, lower: string, prompt: string): string {
  // Minimal subset for non-train-today questions without re-importing full module
  if (lower.includes('last workout') || lower.includes('last time')) {
    if (!snapshot.hasStructuredHistory) {
      return 'No **completed** workouts logged yet. Planned or skipped sessions do not create history.'
    }
    return `Recent training evidence is available in your Gym history. Open **Gym → History** for the authoritative log — I will not invent sets.`
  }
  if (lower.includes('progress')) {
    if (!snapshot.hasStructuredHistory) {
      return 'Progression needs at least one **logged** session. Nothing is invented until you complete and save a workout.'
    }
    return `Progression signals are derived from completed sessions only. Recovery: **${snapshot.recoveryStatus.replace(/_/g, ' ')}**.`
  }
  void prompt
  return [
    `**Today's plan remains:** ${snapshot.todaysWorkout.title}`,
    `Goal: ${GYM_GOAL_LABELS[snapshot.goalProfile.primaryGoal] ?? snapshot.goalProfile.primaryGoal}`,
    'Ask “What should I train today?” for the full grounded prescription.',
  ].join('\n')
}
