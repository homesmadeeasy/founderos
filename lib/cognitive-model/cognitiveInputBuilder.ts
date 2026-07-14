import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import type { RawCognitiveInput } from './beliefTypes'
import { buildFounderSnapshot } from '@/lib/specialists/founder/founderUtils'

export function buildRawCognitiveInputFromFounder(
  founderInput?: FounderInput | null,
  extras?: RawCognitiveInput,
): RawCognitiveInput {
  if (!founderInput) return extras ?? {}

  const snap = buildFounderSnapshot(founderInput)
  return {
    ...extras,
    founderSnapshot: {
      mainInsight: snap.mainInsight,
      mainBottleneck: snap.mainBottleneck,
      momentumScore: snap.momentumScore,
      validationScore: snap.validationScore,
      architectureScore: snap.architectureScore,
      executionScore: snap.executionScore,
      currentStage: snap.currentStage,
      topRecommendation: snap.topRecommendation,
      risks: snap.risks,
    },
    mission: founderInput.dailyContext?.mission,
    memories: founderInput.memories,
    signals: founderInput.signals,
    outcomes: founderInput.outcomes,
    knowledge: founderInput.knowledge,
    decisionSummary: founderInput.decisionOutput?.primaryDecision?.title,
  }
}
