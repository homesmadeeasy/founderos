import type { ConversationActionCard } from './conversationTypes'
import { newConversationId } from './conversationUtils'

export const VALIDATION_SPRINT_PROJECT_TITLE = 'FounderOS Validation Sprint'

export const VALIDATION_SPRINT_TASKS = [
  'Recruit 3 test users',
  'Run first-impression test',
  'Record confusing elements',
  'Record most valuable feature',
  'Record willingness-to-pay feedback',
  'Review findings with Founder AI',
] as const

export const VALIDATION_SPRINT_CARD: ConversationActionCard = {
  id: 'action-validation-sprint',
  type: 'validation_sprint',
  title: 'Validation Sprint',
  steps: [
    'Show FounderOS Home to 3 people',
    'Ask: "What do you think this does?"',
    'Record the exact answers',
    'Ask what they would use first',
    'Ask what they would pay for',
    'Return the findings to Founder AI',
  ],
}

export function findValidationSprintProject(
  projects: readonly { id: string; title: string }[],
): { id: string; title: string } | undefined {
  return projects.find(p =>
    p.title.toLowerCase() === VALIDATION_SPRINT_PROJECT_TITLE.toLowerCase(),
  )
}

export function sprintConfirmationMessage(tasksCreated: number, reused: boolean): string {
  if (reused && tasksCreated === 0) {
    return 'Your validation sprint project already exists. Open it from Projects to continue.'
  }
  const verb = reused ? 'Added' : 'Created'
  return `${verb} **${VALIDATION_SPRINT_PROJECT_TITLE}** with ${tasksCreated} task${tasksCreated === 1 ? '' : 's'}. Start with recruiting 3 test users.`
}

export function newSprintTurnId(): string {
  return newConversationId()
}
