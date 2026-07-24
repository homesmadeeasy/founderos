/**
 * Thin Intelligence Orchestrator — collects/normalizes context from existing engines.
 * Does not recreate Identity, Reality, Memory, Belief, or Decision logic.
 */

import {
  CANONICAL_STAGE_ORDER,
  STAGE_LABELS,
  INTELLIGENCE_PIPELINE_VERSION,
  type IntelligenceContext,
  type IntelligenceRequest,
  type IntelligenceResult,
  type IntelligenceSources,
  type IntelligenceStageId,
  type IntelligenceStageTrace,
  type IntelligenceTrace,
  type ProposedUpdate,
  type StageStatus,
} from './intelligenceTypes'

function nowISO(): string {
  return new Date().toISOString()
}

function newId(prefix = 'intel'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function average(nums: number[]): number {
  if (!nums.length) return 0.5
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function normalizeRequest(request: IntelligenceRequest): Required<
  Pick<IntelligenceRequest, 'specialist' | 'userMessage' | 'requestId' | 'timestamp'>
> & IntelligenceRequest {
  const specialist = request.specialist || request.specialistId || 'unknown'
  const userMessage = (request.userMessage || request.question || '').trim()
  return {
    ...request,
    specialist,
    specialistId: request.specialistId ?? specialist,
    userMessage,
    question: request.question ?? userMessage,
    requestId: request.requestId || newId('req'),
    timestamp: request.timestamp || nowISO(),
  }
}

class StageRunner {
  private readonly seen = new Set<IntelligenceStageId>()
  readonly stages: IntelligenceStageTrace[] = []

  run(
    id: IntelligenceStageId,
    fn: () => { status: StageStatus; detail?: string; sourceSystem?: string; recordsRetrieved?: number },
  ): void {
    const started = performance.now()
    if (this.seen.has(id)) {
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: 'skipped',
        detail: 'Duplicate stage call blocked',
        durationMs: 0,
        duplicateBlocked: true,
      })
      return
    }
    this.seen.add(id)
    try {
      const result = fn()
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: result.status,
        detail: result.detail,
        sourceSystem: result.sourceSystem,
        recordsRetrieved: result.recordsRetrieved,
        durationMs: Math.round(performance.now() - started),
      })
    } catch (err) {
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: 'failed',
        detail: err instanceof Error ? err.message : 'stage failed',
        durationMs: Math.round(performance.now() - started),
      })
    }
  }

  async runAsync(
    id: IntelligenceStageId,
    fn: () => Promise<{ status: StageStatus; detail?: string; sourceSystem?: string; recordsRetrieved?: number }>,
  ): Promise<void> {
    const started = performance.now()
    if (this.seen.has(id)) {
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: 'skipped',
        detail: 'Duplicate stage call blocked',
        durationMs: 0,
        duplicateBlocked: true,
      })
      return
    }
    this.seen.add(id)
    try {
      const result = await fn()
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: result.status,
        detail: result.detail,
        sourceSystem: result.sourceSystem,
        recordsRetrieved: result.recordsRetrieved,
        durationMs: Math.round(performance.now() - started),
      })
    } catch (err) {
      this.stages.push({
        id,
        label: STAGE_LABELS[id],
        status: 'failed',
        detail: err instanceof Error ? err.message : 'stage failed',
        durationMs: Math.round(performance.now() - started),
      })
    }
  }
}

function buildSanitizedReport(trace: Omit<IntelligenceTrace, 'sanitizedReport'>, ctx: IntelligenceContext): string {
  const lines = [
    `requestId=${trace.requestId}`,
    `specialist=${trace.specialistId}`,
    `confidence=${Math.round(trace.overallConfidence * 100)}%`,
    `durationMs=${trace.durationMs}`,
    `sources=${trace.sourceSystemsUsed.join(',') || 'none'}`,
    `records=${trace.recordsRetrieved}`,
    `skipped=${trace.skippedStages.join(',') || 'none'}`,
    `degraded=${trace.degradedStages.join(',') || 'none'}`,
    `declared=${ctx.declaredProfile.map(d => d.key).join(',') || 'none'}`,
    `observed=${ctx.observedIdentity.map(o => o.key).join(',') || 'none'}`,
    `missing=${ctx.missingInformation.join('; ') || 'none'}`,
    `warnings=${trace.warnings.join('; ') || 'none'}`,
    ...trace.stages.map(s => `${s.id}:${s.status}:${s.durationMs}ms`),
  ]
  return lines.join('\n')
}

/**
 * Canonical intelligence orchestration.
 */
export async function runIntelligencePipeline(
  requestInput: IntelligenceRequest,
  sources: IntelligenceSources = {},
): Promise<IntelligenceResult> {
  const request = normalizeRequest(requestInput)
  const startedAt = nowISO()
  const t0 = performance.now()
  const runner = new StageRunner()
  const missing: string[] = []
  const warnings: string[] = []
  const proposedUpdates: ProposedUpdate[] = []
  const readOnly = Boolean(sources.readOnly || request.readOnly)

  let identitySummary = ''
  let realitySummary = ''
  const relevantMemories = sources.memories?.slice(0, 8) ?? []
  const knowledge = sources.knowledge?.slice(0, 6) ?? []
  const relevantBeliefs = sources.beliefs?.slice(0, 8) ?? []
  const goals = sources.goals?.slice(0, 6) ?? []
  const constraints = sources.constraints?.slice(0, 8) ?? []
  let supportingEvidence = [...(sources.evidence ?? []), ...(sources.domainEvidence ?? [])].slice(0, 16)
  const declaredProfile = sources.declaredProfile ?? []
  const observedIdentity = sources.observedIdentity ?? []
  let reasoning = ''
  let decisionNote = ''
  let recommendedActions = (sources.executiveRecommendations ?? []).slice(0, 5).map((label, i) => ({
    id: `rec_${i}`,
    label,
    rationale: 'From executive / morning recommendations',
    confidence: 0.7,
    bounded: true,
  }))
  let response = ''
  let followUp = sources.followUpQuestion

  for (const stageId of CANONICAL_STAGE_ORDER) {
    if (stageId === 'conversation_context') {
      runner.run(stageId, () => {
        if (!request.conversationContext?.trim() && !request.userMessage) {
          missing.push('conversation context')
          return { status: 'degraded', detail: 'Empty conversation context' }
        }
        return {
          status: 'ok',
          detail: request.conversationContext?.slice(0, 120) || `Message: ${request.userMessage.slice(0, 80)}`,
          sourceSystem: 'conversation',
        }
      })
      continue
    }

    if (stageId === 'specialist_intent') {
      runner.run(stageId, () => ({
        status: 'ok',
        detail: `${request.specialist}:${request.intent ?? 'unspecified'}`,
        sourceSystem: 'orchestrator',
      }))
      continue
    }

    if (stageId === 'identity') {
      runner.run(stageId, () => {
        const hints = sources.identityHints ?? []
        identitySummary = sources.identitySummary
          ?? (hints.length ? hints.slice(0, 6).join('; ') : '')
          ?? declaredProfile.map(d => `${d.label}: ${d.value}`).join('; ')
        if (!identitySummary && !declaredProfile.length && !observedIdentity.length) {
          missing.push('identity facts')
          return { status: 'skipped', detail: 'No identity source', sourceSystem: 'identity' }
        }
        return {
          status: 'ok',
          detail: identitySummary.slice(0, 160) || `${declaredProfile.length} declared / ${observedIdentity.length} observed`,
          sourceSystem: 'identity',
          recordsRetrieved: declaredProfile.length + observedIdentity.length + hints.length,
        }
      })
      continue
    }

    if (stageId === 'declared_profile') {
      runner.run(stageId, () => {
        if (!declaredProfile.length) {
          missing.push('declared profile fields')
          return { status: 'skipped', detail: 'No declared profile', sourceSystem: 'identity' }
        }
        return {
          status: 'ok',
          detail: declaredProfile.map(d => d.key).slice(0, 6).join(', '),
          sourceSystem: 'identity',
          recordsRetrieved: declaredProfile.length,
        }
      })
      continue
    }

    if (stageId === 'observed_identity') {
      runner.run(stageId, () => {
        if (!observedIdentity.length) {
          return { status: 'skipped', detail: 'No observed identity', sourceSystem: 'identity' }
        }
        const contradicted = observedIdentity.filter(o => o.contradictionNote)
        if (contradicted.length) {
          warnings.push('Declared and observed identity differ for some keys — both retained.')
        }
        return {
          status: contradicted.length ? 'degraded' : 'ok',
          detail: `${observedIdentity.length} observed (${contradicted.length} contradictions)`,
          sourceSystem: 'identity',
          recordsRetrieved: observedIdentity.length,
        }
      })
      continue
    }

    if (stageId === 'reality') {
      runner.run(stageId, () => {
        const hints = sources.realityHints ?? []
        realitySummary = sources.realitySummary
          ?? (hints.length ? hints.slice(0, 6).join('; ') : '')
        if (!realitySummary) {
          missing.push('reality snapshot')
          return { status: 'skipped', detail: 'No reality source', sourceSystem: 'reality' }
        }
        return {
          status: 'ok',
          detail: realitySummary.slice(0, 160),
          sourceSystem: 'reality',
          recordsRetrieved: hints.length || 1,
        }
      })
      continue
    }

    if (stageId === 'memory') {
      runner.run(stageId, () => {
        if (!relevantMemories.length) {
          missing.push('relevant memories')
          return { status: 'skipped', detail: 'No memory hits', sourceSystem: 'memory-engine' }
        }
        return {
          status: 'ok',
          detail: `${relevantMemories.length} memories`,
          sourceSystem: 'memory-engine',
          recordsRetrieved: relevantMemories.length,
        }
      })
      continue
    }

    if (stageId === 'knowledge') {
      runner.run(stageId, () => {
        if (!knowledge.length) {
          return { status: 'skipped', detail: 'No knowledge source', sourceSystem: 'knowledge-engine' }
        }
        for (const k of knowledge) {
          supportingEvidence.push({
            id: `know_${k.id}`,
            title: k.title,
            summary: k.summary,
            weight: 0.6,
            source: 'knowledge',
            kind: 'domain',
          })
        }
        return {
          status: 'ok',
          detail: `${knowledge.length} knowledge items`,
          sourceSystem: 'knowledge-engine',
          recordsRetrieved: knowledge.length,
        }
      })
      continue
    }

    if (stageId === 'beliefs') {
      runner.run(stageId, () => {
        if (!relevantBeliefs.length) {
          missing.push('beliefs')
          return { status: 'skipped', detail: 'No world-model beliefs', sourceSystem: 'cognitive-model' }
        }
        return {
          status: 'ok',
          detail: `${relevantBeliefs.length} beliefs`,
          sourceSystem: 'cognitive-model',
          recordsRetrieved: relevantBeliefs.length,
        }
      })
      continue
    }

    if (stageId === 'goals') {
      runner.run(stageId, () => {
        if (!goals.length) {
          missing.push('goals')
          return { status: 'skipped', detail: 'No goals provided' }
        }
        return { status: 'ok', detail: goals.slice(0, 3).join('; ') }
      })
      continue
    }

    if (stageId === 'domain_evidence') {
      runner.run(stageId, () => {
        const domain = sources.domainEvidence ?? []
        if (!domain.length) {
          missing.push('specialist domain evidence')
          return { status: 'skipped', detail: 'No specialist domain evidence', sourceSystem: request.specialist }
        }
        supportingEvidence = [...domain, ...supportingEvidence].slice(0, 20)
        const stale = domain.filter(d => d.freshness === 'stale')
        if (stale.length) warnings.push('Some domain evidence is stale.')
        return {
          status: stale.length ? 'degraded' : 'ok',
          detail: `${domain.length} domain evidence items`,
          sourceSystem: request.specialist,
          recordsRetrieved: domain.length,
        }
      })
      continue
    }

    if (stageId === 'evidence') {
      runner.run(stageId, () => {
        if (!supportingEvidence.length) {
          if (identitySummary) {
            supportingEvidence.push({
              id: 'ev_identity',
              title: 'Identity',
              summary: identitySummary.slice(0, 200),
              weight: 0.85,
              source: 'identity',
              kind: 'declared',
            })
          }
          if (realitySummary) {
            supportingEvidence.push({
              id: 'ev_reality',
              title: 'Reality',
              summary: realitySummary.slice(0, 200),
              weight: 0.8,
              source: 'reality',
              kind: 'observed',
            })
          }
          for (const m of relevantMemories.slice(0, 3)) {
            supportingEvidence.push({
              id: `ev_mem_${m.id}`,
              title: m.title,
              summary: m.summary,
              weight: 0.65,
              source: 'memory',
              kind: 'domain',
            })
          }
        }
        if (!supportingEvidence.length) {
          missing.push('supporting evidence')
          return { status: 'degraded', detail: 'No evidence assembled' }
        }
        return {
          status: 'ok',
          detail: `${supportingEvidence.length} evidence items`,
          recordsRetrieved: supportingEvidence.length,
        }
      })
      continue
    }

    if (stageId === 'missing_information') {
      runner.run(stageId, () => {
        const uniq = [...new Set(missing)]
        missing.length = 0
        missing.push(...uniq)
        if (!followUp && missing.includes('declared profile fields')) {
          followUp = 'What is your primary training goal, and how many days can you train this week?'
        }
        return {
          status: missing.length ? 'degraded' : 'ok',
          detail: missing.length ? missing.join('; ') : 'No critical gaps',
        }
      })
      continue
    }

    if (stageId === 'reasoning') {
      runner.run(stageId, () => {
        reasoning = sources.reasoningSummary?.trim()
          || [
            identitySummary && `Identity: ${identitySummary}`,
            realitySummary && `Reality: ${realitySummary}`,
            declaredProfile[0] && `Declared: ${declaredProfile[0].label}=${declaredProfile[0].value}`,
            supportingEvidence[0] && `Evidence: ${supportingEvidence[0].title}`,
            goals[0] && `Goal: ${goals[0]}`,
          ].filter(Boolean).join('\n')
          || 'Insufficient structured context; ask for missing information rather than inventing facts.'
        if (!sources.reasoningSummary) {
          return {
            status: supportingEvidence.length || identitySummary || realitySummary ? 'degraded' : 'skipped',
            detail: 'Synthesized from available sources',
            sourceSystem: 'orchestrator',
          }
        }
        return { status: 'ok', detail: reasoning.slice(0, 160), sourceSystem: 'reasoning-engine' }
      })
      continue
    }

    if (stageId === 'decision') {
      runner.run(stageId, () => {
        decisionNote = sources.decisionSummary?.trim() || ''
        if (!decisionNote) {
          return { status: 'skipped', detail: 'No decision engine output', sourceSystem: 'decision-engine' }
        }
        return { status: 'ok', detail: decisionNote.slice(0, 160), sourceSystem: 'decision-engine' }
      })
      continue
    }

    if (stageId === 'recommendation') {
      runner.run(stageId, () => {
        if (!recommendedActions.length && decisionNote) {
          recommendedActions = [{
            id: 'rec_decision',
            label: decisionNote.slice(0, 120),
            rationale: 'Primary decision summary',
            confidence: 0.75,
            bounded: true,
          }]
        }
        if (!recommendedActions.length && supportingEvidence.some(e => e.source === 'gym' || e.id.includes('workout'))) {
          recommendedActions = [{
            id: 'rec_domain',
            label: 'Follow today’s specialist plan using declared constraints',
            rationale: 'Bounded to available gym evidence; no invented history',
            confidence: 0.7,
            bounded: true,
          }]
        }
        if (!recommendedActions.length) {
          return { status: 'skipped', detail: 'No recommendations' }
        }
        return { status: 'ok', detail: `${recommendedActions.length} actions` }
      })
      continue
    }

    if (stageId === 'response') {
      await runner.runAsync(stageId, async () => {
        const responseContext = buildContextSnapshot()
        const narrativeHints = [
          ...((sources.identityHints ?? []).slice(0, 4)),
          ...((sources.realityHints ?? []).slice(0, 4)),
          ...relevantMemories.slice(0, 2).map(m => m.title),
        ]
        const partial = {
          responseContext,
          identitySummary: identitySummary || 'No identity summary.',
          realitySummary: realitySummary || 'No reality summary.',
          relevantMemories,
          relevantBeliefs,
          supportingEvidence,
          reasoning,
          confidence: 0,
          recommendedActions,
          explanation: '',
          missingInformation: [...missing],
          warnings: [...warnings],
          narrativeHints,
          identityHints: sources.identityHints ?? declaredProfile.map(d => `${d.label}: ${d.value}`),
          realityHints: sources.realityHints ?? [],
        }
        if (sources.produceResponse) {
          response = await sources.produceResponse(partial)
          return { status: 'ok', detail: `Response ${response.length} chars`, sourceSystem: request.specialist }
        }
        response = [
          identitySummary && `**Identity:** ${identitySummary}`,
          realitySummary && `**Reality:** ${realitySummary}`,
          reasoning && `**Reasoning:** ${reasoning}`,
          decisionNote && `**Decision:** ${decisionNote}`,
          recommendedActions.length && `**Next:** ${recommendedActions.map(a => a.label).join('; ')}`,
          missing.length && `**Missing:** ${missing.join(', ')}`,
        ].filter(Boolean).join('\n\n') || 'No specialist response producer was provided.'
        return { status: 'degraded', detail: 'Default response composer', sourceSystem: 'orchestrator' }
      })
      continue
    }

    if (stageId === 'memory_update') {
      await runner.runAsync(stageId, async () => {
        if (readOnly) return { status: 'skipped', detail: 'Read-only run' }
        if (!sources.onMemoryUpdate) return { status: 'skipped', detail: 'No memory update hook' }
        await sources.onMemoryUpdate(await buildPartialResult())
        proposedUpdates.push({ kind: 'memory', summary: 'Memory update hook invoked', applied: true })
        return { status: 'ok', detail: 'Memory update hook invoked', sourceSystem: 'memory-engine' }
      })
      continue
    }

    if (stageId === 'reality_update') {
      await runner.runAsync(stageId, async () => {
        if (readOnly) return { status: 'skipped', detail: 'Read-only run' }
        if (!sources.onRealityUpdate) return { status: 'skipped', detail: 'No reality update hook' }
        await sources.onRealityUpdate(await buildPartialResult())
        proposedUpdates.push({ kind: 'reality_event', summary: 'Reality update hook invoked', applied: true })
        return { status: 'ok', detail: 'Reality update hook invoked', sourceSystem: 'reality' }
      })
      continue
    }

    if (stageId === 'identity_observation') {
      await runner.runAsync(stageId, async () => {
        if (readOnly) return { status: 'skipped', detail: 'Read-only run' }
        if (!sources.onIdentityObservation) return { status: 'skipped', detail: 'No identity observation hook' }
        await sources.onIdentityObservation(await buildPartialResult())
        proposedUpdates.push({ kind: 'identity_observation', summary: 'Identity observation hook invoked', applied: true })
        return { status: 'ok', detail: 'Identity observation hook invoked', sourceSystem: 'identity' }
      })
      continue
    }

    if (stageId === 'post_response_updates') {
      runner.run(stageId, () => ({
        status: proposedUpdates.some(p => p.applied) ? 'ok' : 'skipped',
        detail: proposedUpdates.length
          ? proposedUpdates.map(p => p.kind).join(', ')
          : 'No post-response updates',
      }))
      continue
    }
  }

  function buildContextSnapshot(): IntelligenceContext {
    return {
      declaredProfile,
      observedIdentity,
      realitySnapshot: {
        summary: realitySummary || 'No reality summary available.',
        hints: sources.realityHints ?? [],
        momentumLabel: sources.realityMomentumLabel,
        eventCountToday: sources.realityEventCountToday,
      },
      relevantMemories,
      relevantBeliefs,
      domainEvidence: sources.domainEvidence ?? supportingEvidence.filter(e => e.source === request.specialist || e.kind === 'domain'),
      goals,
      constraints,
      dataFreshness: sources.dataFreshness ?? {},
      missingInformation: [...new Set(missing)],
      readiness: sources.readiness,
      followUpQuestion: followUp,
    }
  }

  async function buildPartialResult(): Promise<IntelligenceResult> {
    return finalize(Math.round(performance.now() - t0))
  }

  function finalize(durationMs: number): IntelligenceResult {
    const responseContext = buildContextSnapshot()
    const beliefConf = relevantBeliefs.map(b => b.confidence)
    const actionConf = recommendedActions.map(a => a.confidence)
    const stageOk = runner.stages.filter(s => s.status === 'ok').length
    const stageTotal = runner.stages.length || 1
    const coverage = stageOk / stageTotal
    const stalePenalty = warnings.some(w => w.toLowerCase().includes('stale')) ? 0.12 : 0
    const confidence = clamp01(
      average([
        coverage,
        beliefConf.length ? average(beliefConf) : 0.5,
        actionConf.length ? average(actionConf) : 0.55,
        declaredProfile.length ? 0.85 : 0.45,
        realitySummary ? 0.8 : 0.45,
        supportingEvidence.length ? 0.75 : 0.4,
      ]) - stalePenalty,
    )

    const explanation = [
      declaredProfile.length ? `Grounded in ${declaredProfile.length} declared profile field(s)` : '',
      observedIdentity.length ? `Includes ${observedIdentity.length} observed identity field(s)` : '',
      realitySummary ? `Current reality considered` : '',
      supportingEvidence.length ? `${supportingEvidence.length} evidence item(s)` : '',
      missing.length ? `Gaps: ${missing.join(', ')}` : '',
    ].filter(Boolean).join('. ') || 'Limited context; treat recommendations cautiously.'

    const narrativeHints = [
      ...(sources.identityHints ?? []).slice(0, 4),
      ...(sources.realityHints ?? []).slice(0, 4),
      ...relevantMemories.slice(0, 2).map(m => `Memory: ${m.title}`),
    ]

    const skippedStages = runner.stages.filter(s => s.status === 'skipped').map(s => s.id)
    const degradedStages = runner.stages.filter(s => s.status === 'degraded').map(s => s.id)
    const sourceSystemsUsed = [...new Set(runner.stages.map(s => s.sourceSystem).filter(Boolean) as string[])]
    const recordsRetrieved = runner.stages.reduce((n, s) => n + (s.recordsRetrieved ?? 0), 0)

    const finishedAt = nowISO()
    const traceBase = {
      id: newId('trace'),
      requestId: request.requestId!,
      version: INTELLIGENCE_PIPELINE_VERSION,
      specialistId: String(request.specialist),
      question: request.userMessage,
      startedAt,
      finishedAt,
      durationMs,
      stages: runner.stages,
      sourceSystemsUsed,
      recordsRetrieved,
      skippedStages,
      degradedStages,
      overallConfidence: confidence,
      warnings: [...warnings],
      notes: [],
    }
    const trace: IntelligenceTrace = {
      ...traceBase,
      sanitizedReport: buildSanitizedReport(traceBase, responseContext),
    }

    return {
      responseContext,
      recommendations: recommendedActions,
      evidence: supportingEvidence,
      confidence,
      explanation,
      missingInformation: responseContext.missingInformation,
      warnings,
      proposedUpdates,
      trace,
      response,
      identitySummary: identitySummary || 'No identity summary available.',
      realitySummary: realitySummary || 'No reality summary available.',
      relevantMemories,
      relevantBeliefs,
      supportingEvidence,
      reasoning: reasoning || 'No reasoning available.',
      recommendedActions,
      narrativeHints,
    }
  }

  const result = finalize(Math.round(performance.now() - t0))
  rememberLastResult(result)
  return result
}

export function getCanonicalStageOrder(): IntelligenceStageId[] {
  return [...CANONICAL_STAGE_ORDER]
}

export function createDuplicateStageGuard() {
  const seen = new Set<IntelligenceStageId>()
  return (id: IntelligenceStageId): boolean => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  }
}

let lastResult: IntelligenceResult | null = null
const listeners = new Set<(result: IntelligenceResult | null) => void>()

export function rememberLastResult(result: IntelligenceResult | null): void {
  lastResult = result
  for (const listener of listeners) listener(result)
}

export function getLastIntelligenceResult(): IntelligenceResult | null {
  return lastResult
}

export function subscribeIntelligenceResults(
  listener: (result: IntelligenceResult | null) => void,
): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function clearLastIntelligenceResult(): void {
  rememberLastResult(null)
}

/** Idempotency: same requestId within TTL returns cached result without re-running write hooks. */
const idempotencyCache = new Map<string, { at: number; result: IntelligenceResult }>()

export async function runIntelligencePipelineIdempotent(
  request: IntelligenceRequest,
  sources: IntelligenceSources = {},
  ttlMs = 15_000,
): Promise<IntelligenceResult> {
  const normalized = normalizeRequest(request)
  const key = normalized.requestId!
  const hit = idempotencyCache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) {
    return hit.result
  }
  const result = await runIntelligencePipeline(normalized, sources)
  idempotencyCache.set(key, { at: Date.now(), result })
  return result
}
