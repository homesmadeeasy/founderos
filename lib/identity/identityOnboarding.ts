/**
 * Modular identity onboarding — only ask steps relevant to enabled specialists.
 * Max ~5 minutes: keep step count bounded.
 */

import type { DeclareFactInput, SpecialistId } from './identityTypes'

export interface OnboardingStepOption {
  value: string
  label: string
}

export interface OnboardingStep {
  id: string
  specialistIds: SpecialistId[] | 'always'
  category: DeclareFactInput['category']
  key: string
  label: string
  prompt: string
  inputType: 'single' | 'multi' | 'text'
  options?: OnboardingStepOption[]
  relevanceTags?: string[]
}

export const IDENTITY_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'display_name',
    specialistIds: 'always',
    category: 'personal',
    key: 'display_name',
    label: 'What should FounderOS call you?',
    prompt: 'A short name is enough.',
    inputType: 'text',
    relevanceTags: ['personal'],
  },
  {
    id: 'primary_life_focus',
    specialistIds: 'always',
    category: 'goals',
    key: 'primary_life_focus',
    label: 'Primary focus right now',
    prompt: 'What should FounderOS optimise for first?',
    inputType: 'single',
    options: [
      { value: 'building', label: 'Building a product / company' },
      { value: 'learning', label: 'Learning / school' },
      { value: 'health', label: 'Health & training' },
      { value: 'career', label: 'Career growth' },
      { value: 'balance', label: 'Life balance' },
    ],
    relevanceTags: ['goals'],
  },
  // Gym
  {
    id: 'training_goal',
    specialistIds: ['gym', 'health'],
    category: 'goals',
    key: 'training_goal',
    label: 'Training goal',
    prompt: 'What are you training toward?',
    inputType: 'single',
    options: [
      { value: 'muscle_growth', label: 'Build muscle' },
      { value: 'strength', label: 'Get stronger' },
      { value: 'fat_loss', label: 'Lose fat' },
      { value: 'general_fitness', label: 'General fitness' },
      { value: 'consistency', label: 'Just stay consistent' },
    ],
    relevanceTags: ['gym', 'health', 'goals'],
  },
  {
    id: 'training_experience',
    specialistIds: ['gym'],
    category: 'experience',
    key: 'training_experience',
    label: 'Training experience',
    prompt: 'How experienced are you in the gym?',
    inputType: 'single',
    options: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
    ],
    relevanceTags: ['gym', 'experience'],
  },
  {
    id: 'training_equipment',
    specialistIds: ['gym'],
    category: 'capabilities',
    key: 'training_equipment',
    label: 'Available equipment',
    prompt: 'What can you train with?',
    inputType: 'multi',
    options: [
      { value: 'full_gym', label: 'Full gym' },
      { value: 'dumbbells', label: 'Dumbbells' },
      { value: 'barbell', label: 'Barbell' },
      { value: 'bodyweight', label: 'Bodyweight only' },
      { value: 'machines', label: 'Machines' },
    ],
    relevanceTags: ['gym', 'capabilities'],
  },
  {
    id: 'training_days',
    specialistIds: ['gym'],
    category: 'lifestyle',
    key: 'training_days_per_week',
    label: 'Training days per week',
    prompt: 'How many days can you realistically train?',
    inputType: 'single',
    options: [
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5+' },
    ],
    relevanceTags: ['gym', 'lifestyle'],
  },
  {
    id: 'injuries',
    specialistIds: ['gym', 'health'],
    category: 'health',
    key: 'injury_limitations',
    label: 'Injuries or limitations',
    prompt: 'Anything specialists should avoid recommending around?',
    inputType: 'text',
    relevanceTags: ['gym', 'health'],
  },
  // Founder
  {
    id: 'current_project',
    specialistIds: ['founder'],
    category: 'work',
    key: 'current_project',
    label: 'Current project',
    prompt: 'What are you building right now?',
    inputType: 'text',
    relevanceTags: ['founder', 'work'],
  },
  {
    id: 'business_stage',
    specialistIds: ['founder'],
    category: 'work',
    key: 'business_stage',
    label: 'Business stage',
    prompt: 'Where are you in the journey?',
    inputType: 'single',
    options: [
      { value: 'idea', label: 'Idea' },
      { value: 'building', label: 'Building' },
      { value: 'launched', label: 'Launched' },
      { value: 'growing', label: 'Growing' },
    ],
    relevanceTags: ['founder', 'work'],
  },
  {
    id: 'founder_primary_goal',
    specialistIds: ['founder'],
    category: 'goals',
    key: 'founder_primary_goal',
    label: 'Founder primary goal',
    prompt: 'What does a win look like in the next 90 days?',
    inputType: 'text',
    relevanceTags: ['founder', 'goals'],
  },
  // School
  {
    id: 'subjects',
    specialistIds: ['school'],
    category: 'education',
    key: 'subjects',
    label: 'Subjects',
    prompt: 'What are you studying?',
    inputType: 'text',
    relevanceTags: ['school', 'education'],
  },
  {
    id: 'year_level',
    specialistIds: ['school'],
    category: 'education',
    key: 'year_level',
    label: 'Year level',
    prompt: 'What stage of study are you in?',
    inputType: 'text',
    relevanceTags: ['school', 'education'],
  },
  {
    id: 'exam_dates',
    specialistIds: ['school'],
    category: 'education',
    key: 'upcoming_exams',
    label: 'Upcoming exams',
    prompt: 'Any important exam dates we should remember?',
    inputType: 'text',
    relevanceTags: ['school', 'education'],
  },
  // Finance (light)
  {
    id: 'finance_focus',
    specialistIds: ['finance'],
    category: 'finance',
    key: 'finance_focus',
    label: 'Finance focus',
    prompt: 'What money topic matters most right now?',
    inputType: 'single',
    options: [
      { value: 'runway', label: 'Runway' },
      { value: 'budgeting', label: 'Budgeting' },
      { value: 'saving', label: 'Saving' },
      { value: 'revenue', label: 'Revenue' },
    ],
    relevanceTags: ['finance'],
  },
  // Travel (light)
  {
    id: 'travel_intent',
    specialistIds: ['travel'],
    category: 'travel',
    key: 'travel_intent',
    label: 'Travel intent',
    prompt: 'Any trips you want FounderOS to help plan?',
    inputType: 'text',
    relevanceTags: ['travel'],
  },
]

export function stepsForSpecialists(enabled: SpecialistId[]): OnboardingStep[] {
  const set = new Set(enabled)
  const steps = IDENTITY_ONBOARDING_STEPS.filter(step => {
    if (step.specialistIds === 'always') return true
    return step.specialistIds.some(id => set.has(id))
  })
  // Hard cap for ~5 minute flow
  return steps.slice(0, 10)
}

export function declareInputFromStep(
  step: OnboardingStep,
  value: string | string[],
): DeclareFactInput {
  const display = Array.isArray(value) ? value.join(', ') : value
  return {
    category: step.category,
    key: step.key,
    label: step.label,
    value: Array.isArray(value) ? value : value,
    displayValue: display,
    source: { kind: 'onboarding', label: 'Identity onboarding' },
    relevanceTags: step.relevanceTags,
  }
}
