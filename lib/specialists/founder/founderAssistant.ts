import type { AssistantContext } from '@/lib/command-center/assistantLogic'
import { getOutcomeHistory } from '@/lib/outcome-engine/outcomeEngine'
import type { FounderInput } from './founderTypes'

export function buildFounderInputFromAssistant(ctx: AssistantContext): FounderInput {
  return {
    objects: ctx.objects,
    memories: ctx.memories,
    knowledge: ctx.knowledge,
    signals: ctx.signals?.signals ?? [],
    outcomes: getOutcomeHistory(12),
    tasks: [],
    projects: [],
    openTaskCount: ctx.commandCenter.tasks.filter(t => t.status !== 'done').length,
    activeProjectCount: ctx.commandCenter.projects.filter(p => p.status === 'active').length,
    decisionOutput: ctx.morning?.decisionOutput,
    domainIntelligence: ctx.morning?.domainIntelligence,
    morningPlan: ctx.morning?.morningPlan,
    eveningReview: ctx.evening?.eveningReview,
    unprocessedCaptureCount: ctx.capture?.unprocessedCount ?? 0,
  }
}
