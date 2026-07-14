import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/auth'
import { FounderAIRequestBodySchema } from '@/lib/ai/founder/founderAI.schema'
import { runFounderAIService, isFounderAIAvailableOnServer } from '@/lib/ai/founder/founderAI.service'
import { buildDeterministicFounderAIResponse } from '@/lib/ai/founder/founderAI.fallback'
import { checkFounderAIRateLimit } from '@/lib/ai/founder/founderAI.rateLimit'
import { FOUNDER_AI_LIMITS } from '@/lib/ai/founder/founderAI.config'
import type { CompactFounderContext, FounderAIApiEnvelope } from '@/lib/ai/founder/founderAI.types'

export const runtime = 'nodejs'

function newRequestId(): string {
  return `fai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function POST(req: Request) {
  const requestId = newRequestId()

  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const rate = checkFounderAIRateLimit(auth.user.id)
  if (!rate.allowed) {
    return NextResponse.json({
      requestId,
      mode: 'deterministic',
      errorCode: 'rate_limit',
      warning: 'Too many Founder AI requests. Try again shortly.',
    } satisfies Partial<FounderAIApiEnvelope>, { status: 429 })
  }

  let rawBody: unknown
  try {
    const text = await req.text()
    if (text.length > FOUNDER_AI_LIMITS.MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large.', requestId }, { status: 413 })
    }
    rawBody = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.', requestId }, { status: 400 })
  }

  const parsed = FounderAIRequestBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Invalid request.',
      requestId,
      errorCode: 'invalid_request',
    }, { status: 400 })
  }

  const { context, sessionId, turnId } = parsed.data

  try {
    if (!isFounderAIAvailableOnServer()) {
      const { response } = buildDeterministicFounderAIResponse({
        userMessage: context.userMessage,
        session: {
          id: sessionId,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          topic: 'founder',
          status: 'active',
          turns: context.recentTurns.map((t) => ({
            id: t.id,
            role: t.role,
            content: t.content,
            intent: 'reflect',
            mood: 'calm',
            topic: 'founder',
            evidence: [],
            questionId: t.questionId,
            createdAt: t.createdAt,
          })),
          evidence: [],
          activeQuestions: [],
          confidence: context.worldModel.overallConfidence,
          memoryWrites: [],
          knowledgeSuggestions: [],
        },
        input: {
          objects: [],
          memories: [],
          knowledge: [],
          signals: [],
          outcomes: [],
          tasks: [],
          projects: [],
          decisionOutput: null,
          domainIntelligence: null,
          morningPlan: null,
          dailyContext: null,
          eveningReview: null,
          unprocessedCaptureCount: 0,
        },
        userName: 'there',
        worldModel: {
          mission: context.worldModel.mission,
          values: [],
          vision: '',
          currentStage: context.worldModel.currentStage,
          momentum: { label: 'Momentum', score: 50, confidence: 50, summary: '' },
          execution: { label: 'Execution', score: 50, confidence: 50, summary: '' },
          validation: { label: 'Validation', score: 50, confidence: 50, summary: '' },
          health: { label: 'Health', score: 50, confidence: 50, summary: '' },
          learning: { label: 'Learning', score: 50, confidence: 50, summary: '' },
          relationships: { label: 'Relationships', score: 50, confidence: 50, summary: '' },
          finance: { label: 'Finance', score: 50, confidence: 50, summary: '' },
          unknowns: context.unknowns.map((u) => ({
            id: u.id,
            statement: u.statement,
            topic: u.topic as 'founder',
            importance: u.importance as 'medium',
            relatedBeliefIds: [],
            createdAt: new Date().toISOString(),
          })),
          openQuestions: [],
          currentRisks: context.worldModel.topRisks,
          currentHypotheses: context.worldModel.hypotheses.map((h, i) => ({
            id: `hyp-${i}`,
            statement: h,
            topic: 'validation' as const,
            confidence: 45,
            status: 'open' as const,
            evidenceFor: [],
            evidenceAgainst: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          currentBottlenecks: [context.worldModel.mainBottleneck],
          confidenceLevels: { overall: context.worldModel.overallConfidence },
          beliefs: context.activeBeliefs.map((b) => ({
            id: b.id,
            topic: b.topic as 'founder',
            statement: b.statement,
            confidence: b.confidence,
            status: b.status as 'likely',
            importance: b.importance as 'medium',
            source: b.source as 'conversation',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastReferenced: new Date().toISOString(),
            supportingEvidence: [],
            contradictingEvidence: [],
            history: [],
          })),
          contradictions: context.contradictions.map((c) => ({
            id: c.id,
            beliefAId: c.beliefAId,
            beliefBId: c.beliefBId,
            description: c.description,
            detectedAt: new Date().toISOString(),
            resolved: c.resolved,
          })),
          updatedAt: new Date().toISOString(),
        },
        userTurnId: turnId,
        questionId: context.activeQuestion?.id,
      })

      const envelope: FounderAIApiEnvelope = {
        requestId,
        mode: 'deterministic',
        response,
        errorCode: 'missing_key',
        warning: 'External AI unavailable; using built-in reasoning.',
      }
      return NextResponse.json(envelope)
    }

    const result = await runFounderAIService(context as CompactFounderContext)
    if (!result.ok || !result.response) {
      const { response } = buildDeterministicFounderAIResponse({
        userMessage: context.userMessage,
        session: {
          id: sessionId,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          topic: 'founder',
          status: 'active',
          turns: [],
          evidence: [],
          activeQuestions: [],
          confidence: 50,
          memoryWrites: [],
          knowledgeSuggestions: [],
        },
        input: {
          objects: [],
          memories: [],
          knowledge: [],
          signals: [],
          outcomes: [],
          tasks: [],
          projects: [],
          decisionOutput: null,
          domainIntelligence: null,
          morningPlan: null,
          dailyContext: null,
          eveningReview: null,
          unprocessedCaptureCount: 0,
        },
        userName: 'there',
        worldModel: {
          mission: context.worldModel.mission,
          values: [],
          vision: '',
          currentStage: context.worldModel.currentStage,
          momentum: { label: 'Momentum', score: 50, confidence: 50, summary: '' },
          execution: { label: 'Execution', score: 50, confidence: 50, summary: '' },
          validation: { label: 'Validation', score: 50, confidence: 50, summary: '' },
          health: { label: 'Health', score: 50, confidence: 50, summary: '' },
          learning: { label: 'Learning', score: 50, confidence: 50, summary: '' },
          relationships: { label: 'Relationships', score: 50, confidence: 50, summary: '' },
          finance: { label: 'Finance', score: 50, confidence: 50, summary: '' },
          unknowns: [],
          openQuestions: [],
          currentRisks: [],
          currentHypotheses: [],
          currentBottlenecks: [],
          confidenceLevels: { overall: 50 },
          beliefs: [],
          contradictions: [],
          updatedAt: new Date().toISOString(),
        },
        userTurnId: turnId,
      })

      const envelope: FounderAIApiEnvelope = {
        requestId,
        mode: 'deterministic',
        response,
        errorCode: result.errorCode ?? 'provider_error',
        warning: 'Fell back to built-in reasoning.',
      }
      return NextResponse.json(envelope)
    }

    const envelope: FounderAIApiEnvelope = {
      requestId,
      mode: 'llm',
      response: result.response,
    }
    return NextResponse.json(envelope)
  } catch {
    return NextResponse.json({
      requestId,
      error: 'Founder AI request failed.',
      errorCode: 'provider_error',
    }, { status: 500 })
  }
}
