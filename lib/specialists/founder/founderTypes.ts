import type { DecisionOutput } from '@/lib/decision-engine/decisionTypes'
import type { DailyContext } from '@/lib/context-builder/contextTypes'
import type { DomainIntelligenceOutput } from '@/lib/domain-intelligence/domainTypes'
import type { EveningReview } from '@/lib/evening-review/eveningTypes'
import type { KnowledgeRecord } from '@/lib/knowledge-engine/knowledgeTypes'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import type { MorningExecutionPlan } from '@/lib/morning-execution/morningTypes'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import type { OutcomeHistoryEntry } from '@/lib/outcome-engine/outcomeTypes'
import type { Signal } from '@/lib/signal-engine/signalTypes'
import type { Project, Task } from '@/lib/types'

export type FounderStage = 'idea' | 'prototype' | 'mvp' | 'validation' | 'growth'

export type FounderBottleneck =
  | 'Validation'
  | 'Overengineering'
  | 'UX clarity'
  | 'Distribution'
  | 'Product focus'
  | 'User trust'
  | 'Execution'
  | 'None'

export interface FounderRisk {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high'
  description: string
}

export interface FounderEvidence {
  id: string
  sourceType: 'memory' | 'signal' | 'outcome' | 'decision' | 'task' | 'domain' | 'capture' | 'knowledge'
  title: string
  summary: string
  weight: number
  supports: boolean
}

export interface FounderSprint {
  title: string
  why: string
  tasks: string[]
  ignore: string[]
  definitionOfDone: string
}

export interface FounderHealthMetric {
  id: string
  label: string
  score: number
  sentence: string
}

export interface FounderSnapshot {
  momentumScore: number
  productScore: number
  validationScore: number
  architectureScore: number
  executionScore: number
  riskScore: number
  uxScore: number
  currentStage: FounderStage
  mainBottleneck: FounderBottleneck
  mainInsight: string
  topRecommendation: string
  ignoreToday: string[]
  risks: FounderRisk[]
  suggestedSprint: FounderSprint
  evidence: FounderEvidence[]
  narrative: string
  healthMetrics: FounderHealthMetric[]
  roadmap: string[]
}

export interface FounderInput {
  objects: FounderObject[]
  memories: MemoryRecord[]
  knowledge: KnowledgeRecord[]
  signals: Signal[]
  outcomes: OutcomeHistoryEntry[]
  tasks: Task[]
  projects: Project[]
  decisionOutput?: DecisionOutput | null
  domainIntelligence?: DomainIntelligenceOutput | null
  morningPlan?: MorningExecutionPlan | null
  dailyContext?: DailyContext | null
  eveningReview?: EveningReview | null
  unprocessedCaptureCount?: number
  openTaskCount?: number
  activeProjectCount?: number
}

export type FounderQuestionId =
  | 'build_next'
  | 'overengineering'
  | 'first_users'
  | 'ignore'
  | 'biggest_risk'
  | 'more_useful'
  | 'validate_week'
