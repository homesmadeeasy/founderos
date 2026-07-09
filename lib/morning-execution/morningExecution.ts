import type { DailyContext } from '@/lib/context-builder/contextTypes'
import type { DailyReasoningOutput } from '@/lib/reasoning-engine/reasoningTypes'
import type { TomorrowContextData } from '@/lib/daily-learning-loop/dailyLoopTypes'
import { newReasoningId } from '@/lib/reasoning-engine/reasoningUtils'
import type { MorningExecutionPlan, ScheduleBlock } from './morningTypes'
import { newMorningId, nowISO } from './morningStorage'

function buildScheduleBlocks(
  reasoning: DailyReasoningOutput,
): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = []
  const primary = reasoning.recommendedPlan[0]

  if (primary) {
    blocks.push({
      id: newReasoningId('block'),
      type: 'Deep Work',
      label: primary.title,
      durationMinutes: primary.estimatedMinutes ?? 90,
      planItemId: primary.id,
    })
  }

  const healthItem = reasoning.recommendedPlan.find(
    p => p.area === 'health' || p.title.toLowerCase().includes('health'),
  )
  if (healthItem) {
    blocks.push({
      id: newReasoningId('block'),
      type: 'Health',
      label: healthItem.title,
      durationMinutes: healthItem.estimatedMinutes ?? 30,
      planItemId: healthItem.id,
    })
  } else {
    blocks.push({
      id: newReasoningId('block'),
      type: 'Health',
      label: 'Movement & nutrition check',
      durationMinutes: 30,
    })
  }

  const learning = reasoning.recommendedPlan.find(p => p.area === 'knowledge')
  if (learning) {
    blocks.push({
      id: newReasoningId('block'),
      type: 'Learning',
      label: learning.title,
      durationMinutes: 45,
      planItemId: learning.id,
    })
  }

  blocks.push({
    id: newReasoningId('block'),
    type: 'Admin',
    label: 'Inbox & quick captures',
    durationMinutes: 20,
  })

  if (reasoning.risks.some(r => r.includes('health'))) {
    blocks.push({
      id: newReasoningId('block'),
      type: 'Recovery',
      label: 'Recovery buffer',
      durationMinutes: 30,
    })
  }

  return blocks
}

export function generateMorningExecutionPlan(input: {
  dailyContext: DailyContext
  reasoningOutput: DailyReasoningOutput
  tomorrowContext?: TomorrowContextData | null
}): MorningExecutionPlan {
  const { dailyContext, reasoningOutput, tomorrowContext } = input
  const now = nowISO()

  const warnings = [
    ...(tomorrowContext?.warnings ?? []),
    ...reasoningOutput.risks,
    ...reasoningOutput.blockers.slice(0, 2),
  ]

  const mission = tomorrowContext?.recommendedMission
    || dailyContext.mission
    || reasoningOutput.primaryFocus

  return {
    id: newMorningId('plan'),
    date: dailyContext.date,
    contextId: dailyContext.id,
    reasoningId: reasoningOutput.id,
    title: `Morning Execution — ${dailyContext.date}`,
    summary: reasoningOutput.summary,
    primaryMission: mission,
    topPriorities: reasoningOutput.recommendedPlan.slice(0, 3),
    scheduleBlocks: buildScheduleBlocks(reasoningOutput),
    warnings,
    deferList: reasoningOutput.deferList,
    completed: false,
    memoryWritten: false,
    generatedAt: now,
    updatedAt: now,
  }
}
