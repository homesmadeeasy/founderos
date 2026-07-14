import { z } from 'zod'

const emptyArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).optional().default([])

export const ProposedBeliefUpdateSchema = z.object({
  beliefId: z.string().optional(),
  proposition: z.string().max(280),
  operation: z.enum(['create', 'update', 'challenge', 'confirm']),
  confidenceDelta: z.number().min(-50).max(50).default(0),
  rationale: z.string().max(400),
  evidenceIds: emptyArray(z.string()),
})

export const ProposedContradictionSchema = z.object({
  beliefAId: z.string(),
  beliefBId: z.string(),
  description: z.string().max(280),
})

export const ProposedQuestionSchema = z.object({
  text: z.string().max(280),
  purpose: z.string().max(200),
  answerType: z.enum(['yes_no', 'short_text', 'open_text', 'multiple_choice']).default('open_text'),
  options: z.array(z.string().max(80)).max(6).optional(),
  targetBeliefId: z.string().optional(),
})

export const FounderActionTypeSchema = z.enum([
  'create_task',
  'create_sprint',
  'defer_item',
  'create_capture',
  'create_memory_draft',
  'create_knowledge_draft',
  'update_mission',
  'schedule_placeholder',
])

export const ProposedActionSchema = z.object({
  id: z.string(),
  type: FounderActionTypeSchema,
  title: z.string().max(120),
  description: z.string().max(400),
  rationale: z.string().max(400),
  confidence: z.number().min(0).max(100),
  domain: z.string().max(40),
  reversible: z.boolean().default(true),
  requiresApproval: z.literal(true).default(true),
  payload: z.record(z.string(), z.unknown()).default({}),
})

export const MemoryDraftSchema = z.object({
  id: z.string(),
  title: z.string().max(120),
  content: z.string().max(600),
  tags: z.array(z.string().max(40)).max(8).optional(),
})

export const KnowledgeDraftSchema = z.object({
  id: z.string(),
  title: z.string().max(120),
  principle: z.string().max(400),
  domain: z.string().max(40),
})

export const FounderAIResponseSchema = z.object({
  message: z.string().max(2_500),
  reasoningSummary: z.string().max(600),
  confidence: z.number().min(0).max(100),
  evidenceIds: emptyArray(z.string()),
  beliefsToUpdate: emptyArray(ProposedBeliefUpdateSchema),
  contradictionsToCreate: emptyArray(ProposedContradictionSchema),
  nextQuestion: ProposedQuestionSchema.optional(),
  suggestedActions: emptyArray(ProposedActionSchema),
  memoryDrafts: emptyArray(MemoryDraftSchema),
  knowledgeDrafts: emptyArray(KnowledgeDraftSchema),
})

export const CompactTurnRefSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'founder_ai', 'system']),
  content: z.string().max(2_000),
  questionId: z.string().optional(),
  createdAt: z.string(),
})

export const CompactEvidenceRefSchema = z.object({
  id: z.string(),
  sourceType: z.string(),
  sourceId: z.string().optional(),
  title: z.string().max(120),
  summary: z.string().max(300),
  weight: z.number().min(0).max(1),
  supports: z.boolean(),
  evidenceKind: z.string().optional(),
})

export const CompactFounderContextSchema = z.object({
  userMessage: z.string().min(1).max(2_000),
  conversationSummary: z.string().max(600),
  worldModel: z.object({
    mission: z.string().max(200),
    currentStage: z.string().max(80),
    overallConfidence: z.number().min(0).max(100),
    mainBottleneck: z.string().max(120),
    topRisks: z.array(z.string().max(120)).max(6),
    hypotheses: z.array(z.string().max(200)).max(6),
  }),
  founderSnapshot: z.object({
    currentStage: z.string().max(80),
    mainInsight: z.string().max(300),
    mainBottleneck: z.string().max(120),
    momentumScore: z.number(),
    validationScore: z.number(),
    executionScore: z.number(),
    topRecommendation: z.string().max(300),
    risks: z.array(z.string().max(120)).max(6),
  }),
  activeBeliefs: z.array(z.object({
    id: z.string(),
    statement: z.string().max(280),
    topic: z.string(),
    status: z.string(),
    confidence: z.number(),
    source: z.string(),
    importance: z.string(),
  })).max(20),
  unknowns: z.array(z.object({
    id: z.string(),
    statement: z.string().max(280),
    topic: z.string(),
    importance: z.string(),
  })).max(12),
  contradictions: z.array(z.object({
    id: z.string(),
    description: z.string().max(280),
    beliefAId: z.string(),
    beliefBId: z.string(),
    resolved: z.boolean(),
  })).max(8),
  activeQuestion: z.object({
    id: z.string(),
    text: z.string().max(280),
    topic: z.string(),
  }).optional(),
  recentTurns: z.array(CompactTurnRefSchema).max(12),
  evidence: z.array(CompactEvidenceRefSchema).max(20),
  availableActionTypes: z.array(FounderActionTypeSchema).max(12),
})

export const FounderAIRequestBodySchema = z.object({
  context: CompactFounderContextSchema,
  sessionId: z.string().min(1).max(80),
  turnId: z.string().min(1).max(80),
})

export type FounderAIResponseParsed = z.infer<typeof FounderAIResponseSchema>
