/**
 * Onboarding helpers — start-here steps and project guidance.
 * Safe for the client — no secrets.
 */

import type { AppState, Project, Task, Risk, ProjectReview, ProjectDna, Message } from './types'

export const DEMO_PROJECT_TITLE = '[Demo] AI Study Planner'

export const ONBOARDING_STEPS = [
  { step: 1, title: 'Capture an idea', body: 'Save raw ideas in Idea Vault before they become projects.' },
  { step: 2, title: 'Analyse it with AI', body: 'Use AI idea analysis to validate problem, solution and fit.' },
  { step: 3, title: 'Turn it into a project', body: 'Convert the best ideas into structured execution systems.' },
  { step: 4, title: 'Chat inside the project', body: 'Plan with AI that knows your goal, tasks and progress.' },
  { step: 5, title: 'Convert AI into objects', body: 'Turn chat responses into tasks, notes, decisions, risks or roadmap items.' },
  { step: 6, title: 'Review progress', body: 'Use Project Review and Weekly Review to stay focused.' },
  { step: 7, title: 'Improve over time', body: 'Project DNA and Patterns learn how you work across projects.' },
] as const

export interface StartHereStep {
  id: string
  title: string
  description: string
  href?: string
  complete: boolean
}

export interface StartHereContext {
  analysedIdeaIds: Set<string>
  hasProjectReview: boolean
}

export function computeStartHereSteps(state: AppState, ctx: StartHereContext): StartHereStep[] {
  const { ideas, projects, tasks, chatMessages } = state
  const hasMessages = Object.values(chatMessages).some(msgs => msgs.length > 0)
  const firstProject = projects.find(p => p.status !== 'archived')

  return [
    {
      id: 'idea',
      title: 'Create your first idea',
      description: 'Capture a raw idea in Idea Vault before it becomes a project.',
      href: '/ideas',
      complete: ideas.length > 0,
    },
    {
      id: 'analyse',
      title: 'Analyse the idea',
      description: 'Run AI analysis to shape problem, solution and next steps.',
      href: ideas[0] ? `/ideas/${ideas[0].id}` : '/ideas',
      complete: ctx.analysedIdeaIds.size > 0 || ideas.some(i => i.status !== 'Raw'),
    },
    {
      id: 'project',
      title: 'Turn it into a project',
      description: 'Convert a validated idea into a project with chat, tasks and reviews.',
      href: '/projects',
      complete: projects.filter(p => p.status !== 'archived').length > 0,
    },
    {
      id: 'chat',
      title: 'Open project chat',
      description: 'Plan inside a project with full AI context.',
      href: firstProject ? `/projects/${firstProject.id}/chat` : '/projects',
      complete: hasMessages,
    },
    {
      id: 'tasks',
      title: 'Convert AI into tasks',
      description: 'Create tasks manually or extract them from chat responses.',
      href: firstProject ? `/projects/${firstProject.id}/chat` : '/projects',
      complete: tasks.length > 0,
    },
    {
      id: 'review',
      title: 'Generate your first project review',
      description: 'Get AI-powered next steps for a project you are building.',
      href: firstProject ? `/projects/${firstProject.id}/review` : '/projects',
      complete: ctx.hasProjectReview,
    },
  ]
}

export function shouldShowStartHere(steps: StartHereStep[], state: AppState): boolean {
  const complete = steps.filter(s => s.complete).length
  if (complete >= steps.length) return false
  const { projects, ideas, tasks } = state
  return projects.length <= 1 && ideas.length <= 2 && tasks.length <= 4
}

export interface RecommendedNextStep {
  title: string
  description: string
  href: string
  actionLabel: string
}

export function getRecommendedNextStep(input: {
  project: Project
  tasks: Task[]
  risks: Risk[]
  reviews: ProjectReview[]
  latestDna: ProjectDna | null
  messages: Message[]
}): RecommendedNextStep | null {
  const { project, tasks, risks, reviews, latestDna, messages } = input
  const openTasks = tasks.filter(t => t.status !== 'done')
  const openRisks = risks.filter(r => r.status === 'open')
  const unmitigated = openRisks.filter(r => !r.mitigation?.trim())

  if (tasks.length === 0 && messages.length === 0) {
    return {
      title: 'Start in Chat',
      description: 'Open project chat and plan your first move with AI.',
      href: `/projects/${project.id}/chat`,
      actionLabel: 'Open chat',
    }
  }

  if (openTasks.length === 0 && tasks.length > 0) {
    return {
      title: 'Plan your next tasks',
      description: 'All tasks are done. Use chat to identify what to build next.',
      href: `/projects/${project.id}/chat`,
      actionLabel: 'Open chat',
    }
  }

  if (tasks.length === 0 && messages.length > 0) {
    return {
      title: 'Create your first tasks',
      description: 'Convert useful AI responses into structured tasks.',
      href: `/projects/${project.id}/chat`,
      actionLabel: 'Open chat',
    }
  }

  if (unmitigated.length > 0) {
    return {
      title: 'Review open risks',
      description: `${unmitigated.length} open risk${unmitigated.length === 1 ? '' : 's'} need mitigation plans.`,
      href: `/projects/${project.id}/risks`,
      actionLabel: 'View risks',
    }
  }

  if (reviews.length === 0) {
    return {
      title: 'Generate a Project Review',
      description: 'Identify next steps, bottlenecks and focus areas for this project.',
      href: `/projects/${project.id}/review`,
      actionLabel: 'Generate review',
    }
  }

  const historyCount = tasks.length + risks.length + messages.length
  if (!latestDna && historyCount >= 3) {
    return {
      title: 'Generate Project DNA',
      description: 'Summarise this project\'s identity and evolution once it has more history.',
      href: `/projects/${project.id}/dna`,
      actionLabel: 'Open DNA',
    }
  }

  return null
}
