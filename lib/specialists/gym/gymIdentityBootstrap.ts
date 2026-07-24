/**
 * Sync GymProfile → Identity declared facts (no parallel profile DB).
 * Never overwrites observed with declared; uses IdentityEngine.declareFact only.
 */

import type { GymProfile } from '@/lib/specialists/gym/gymStorage/gymStorageTypes'
import { GYM_GOAL_LABELS } from '@/lib/specialists/gym/gymTypes'
import type { DeclareFactInput } from '@/lib/identity/identityTypes'
import {
  IDENTITY_ONBOARDING_STEPS,
  type OnboardingStep,
} from '@/lib/identity/identityOnboarding'

/** Extra Gym bootstrap steps beyond the shared identity onboarding list. */
export const GYM_BOOTSTRAP_EXTRA_STEPS: OnboardingStep[] = [
  {
    id: 'preferred_session_duration',
    specialistIds: ['gym'],
    category: 'preferences',
    key: 'preferred_session_duration',
    label: 'Preferred session length',
    prompt: 'How long do you usually want to train?',
    inputType: 'single',
    options: [
      { value: '30', label: '≤30 min' },
      { value: '45', label: '45 min' },
      { value: '60', label: '60 min' },
      { value: '75', label: '75+ min' },
    ],
    relevanceTags: ['gym', 'preferences'],
  },
  {
    id: 'training_structure',
    specialistIds: ['gym'],
    category: 'preferences',
    key: 'training_structure',
    label: 'Current training structure',
    prompt: 'What split are you running (or want)?',
    inputType: 'single',
    options: [
      { value: 'auto', label: 'Not sure / auto' },
      { value: 'push_pull_legs', label: 'Push / Pull / Legs' },
      { value: 'upper_lower', label: 'Upper / Lower' },
      { value: 'full_body', label: 'Full body' },
    ],
    relevanceTags: ['gym', 'preferences'],
  },
  {
    id: 'exercise_preferences',
    specialistIds: ['gym'],
    category: 'preferences',
    key: 'exercise_preferences',
    label: 'Exercise preferences',
    prompt: 'Anything you especially like? (optional)',
    inputType: 'text',
    relevanceTags: ['gym', 'preferences'],
  },
  {
    id: 'exercise_dislikes',
    specialistIds: ['gym'],
    category: 'preferences',
    key: 'exercise_dislikes',
    label: 'Exercise dislikes',
    prompt: 'Anything you want to avoid when possible? (optional)',
    inputType: 'text',
    relevanceTags: ['gym', 'preferences'],
  },
]

export function gymBootstrapSteps(): OnboardingStep[] {
  const base = IDENTITY_ONBOARDING_STEPS.filter(
    s => s.specialistIds === 'always' || (Array.isArray(s.specialistIds) && s.specialistIds.includes('gym')),
  )
  const keys = new Set(base.map(s => s.key))
  return [...base, ...GYM_BOOTSTRAP_EXTRA_STEPS.filter(s => !keys.has(s.key))]
}

export function declareInputsFromGymProfile(profile: GymProfile): DeclareFactInput[] {
  const inputs: DeclareFactInput[] = [
    {
      category: 'goals',
      key: 'training_goal',
      label: 'Training goal',
      value: profile.primaryGoal,
      displayValue: GYM_GOAL_LABELS[profile.primaryGoal as keyof typeof GYM_GOAL_LABELS] ?? String(profile.primaryGoal),
      source: { kind: 'onboarding', label: 'Gym onboarding' },
      relevanceTags: ['gym', 'goals'],
    },
    {
      category: 'experience',
      key: 'training_experience',
      label: 'Training experience',
      value: profile.experience,
      displayValue: profile.experience,
      source: { kind: 'onboarding', label: 'Gym onboarding' },
      relevanceTags: ['gym', 'experience'],
    },
    {
      category: 'capabilities',
      key: 'training_equipment',
      label: 'Available equipment',
      value: profile.equipment,
      displayValue: profile.equipment.join(', ') || 'Unspecified',
      source: { kind: 'onboarding', label: 'Gym onboarding' },
      relevanceTags: ['gym', 'capabilities'],
    },
    {
      category: 'lifestyle',
      key: 'training_days_per_week',
      label: 'Training days per week',
      value: profile.trainingDaysPerWeek,
      displayValue: String(profile.trainingDaysPerWeek),
      source: { kind: 'onboarding', label: 'Gym onboarding' },
      relevanceTags: ['gym', 'lifestyle'],
    },
    {
      category: 'preferences',
      key: 'preferred_session_duration',
      label: 'Preferred session length',
      value: profile.sessionDurationMinutes,
      displayValue: `${profile.sessionDurationMinutes} min`,
      source: { kind: 'onboarding', label: 'Gym onboarding' },
      relevanceTags: ['gym', 'preferences'],
    },
    {
      category: 'preferences',
      key: 'training_structure',
      label: 'Training structure',
      value: profile.preferredSplit,
      displayValue: profile.preferredSplit,
      source: { kind: 'onboarding', label: 'Gym onboarding' },
      relevanceTags: ['gym', 'preferences'],
    },
  ]
  if (profile.injuryLimitations.length) {
    inputs.push({
      category: 'health',
      key: 'injury_limitations',
      label: 'Injuries or limitations',
      value: profile.injuryLimitations,
      displayValue: profile.injuryLimitations.join('; '),
      source: { kind: 'onboarding', label: 'Gym onboarding' },
      relevanceTags: ['gym', 'health'],
    })
  }
  if (profile.exercisesEnjoy.length) {
    inputs.push({
      category: 'preferences',
      key: 'exercise_preferences',
      label: 'Exercise preferences',
      value: profile.exercisesEnjoy,
      displayValue: profile.exercisesEnjoy.join(', '),
      source: { kind: 'onboarding', label: 'Gym onboarding' },
      relevanceTags: ['gym', 'preferences'],
    })
  }
  if (profile.exercisesDislike.length) {
    inputs.push({
      category: 'preferences',
      key: 'exercise_dislikes',
      label: 'Exercise dislikes',
      value: profile.exercisesDislike,
      displayValue: profile.exercisesDislike.join(', '),
      source: { kind: 'onboarding', label: 'Gym onboarding' },
      relevanceTags: ['gym', 'preferences'],
    })
  }
  if (profile.age != null) {
    inputs.push({
      category: 'personal',
      key: 'age_range',
      label: 'Age',
      value: profile.age,
      displayValue: String(profile.age),
      source: { kind: 'onboarding', label: 'Gym onboarding' },
      relevanceTags: ['gym', 'personal'],
    })
  }
  return inputs
}
