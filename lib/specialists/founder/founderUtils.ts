import type { FounderInput, FounderSnapshot, FounderHealthMetric } from './founderTypes'
import { gatherFounderData } from './founderSignals'
import { computeFounderScores, inferFounderStage } from './founderScoring'
import { buildFounderEvidence } from './founderEvidence'
import { detectFounderRisks, detectMainBottleneck, buildIgnoreToday } from './founderRisks'
import { buildTopRecommendation, buildMainInsight, buildRoadmap } from './founderStrategy'
import { buildFounderSprint } from './founderSprint'
import { generateFounderNarrative } from './founderNarrative'

function buildHealthMetrics(scores: ReturnType<typeof computeFounderScores>): FounderHealthMetric[] {
  const label = (score: number, high: string, mid: string, low: string) =>
    score >= 70 ? high : score >= 45 ? mid : low

  return [
    {
      id: 'product',
      label: 'Product Progress',
      score: scores.productScore,
      sentence: label(scores.productScore, 'User-facing surfaces are shipping.', 'Product is forming.', 'Still pre-product.'),
    },
    {
      id: 'architecture',
      label: 'Architecture',
      score: scores.architectureScore,
      sentence: label(scores.architectureScore, 'Strong technical foundation.', 'Building steadily.', 'Early infrastructure.'),
    },
    {
      id: 'ux',
      label: 'User Experience',
      score: scores.uxScore,
      sentence: label(scores.uxScore, 'Clarity is solid.', 'UX needs sharpening.', 'Hard to understand quickly.'),
    },
    {
      id: 'validation',
      label: 'Validation',
      score: scores.validationScore,
      sentence: label(scores.validationScore, 'External proof exists.', 'Some signal — needs more.', 'Weak — talk to users.'),
    },
    {
      id: 'execution',
      label: 'Execution',
      score: scores.executionScore,
      sentence: label(scores.executionScore, 'Shipping consistently.', 'Decent follow-through.', 'Execution is slipping.'),
    },
    {
      id: 'risk',
      label: 'Risk',
      score: 100 - scores.riskScore,
      sentence: scores.riskScore > 60 ? 'Elevated founder risk.' : scores.riskScore > 40 ? 'Manageable risk.' : 'Risk is low.',
    },
  ]
}

export function buildFounderSnapshot(input: FounderInput): FounderSnapshot {
  const data = gatherFounderData(input)
  const scores = computeFounderScores(data, input)
  const stage = inferFounderStage(scores, data)
  const risks = detectFounderRisks(data, scores, input.unprocessedCaptureCount ?? 0, input.worldModel)
  const mainBottleneck = detectMainBottleneck(scores, data, risks, input.worldModel)
  const ignoreToday = buildIgnoreToday(
    mainBottleneck,
    data,
    input.decisionOutput?.ignoreToday,
  )
  const topRecommendation = buildTopRecommendation(mainBottleneck, scores, stage, data)
  const mainInsight = buildMainInsight(mainBottleneck, scores)
  const suggestedSprint = buildFounderSprint(
    mainBottleneck,
    stage,
    data,
    topRecommendation,
    ignoreToday,
  )
  const evidence = buildFounderEvidence(data, input)
  const roadmap = buildRoadmap(stage, mainBottleneck)

  const partial = {
    currentStage: stage,
    mainBottleneck,
    architectureScore: scores.architectureScore,
    validationScore: scores.validationScore,
    productScore: scores.productScore,
    momentumScore: scores.momentumScore,
    topRecommendation,
    risks,
  }

  const narrative = generateFounderNarrative(partial, data)

  return {
    ...scores,
    currentStage: stage,
    mainBottleneck,
    mainInsight,
    topRecommendation,
    ignoreToday,
    risks,
    suggestedSprint,
    evidence,
    narrative,
    healthMetrics: buildHealthMetrics(scores),
    roadmap,
  }
}

export function getFounderInsightOneLiner(snapshot: FounderSnapshot): string {
  return snapshot.mainInsight
}
