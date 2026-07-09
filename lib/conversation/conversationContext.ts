import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import { buildFounderSnapshot } from '@/lib/specialists/founder/founderUtils'
import type { ConversationContext } from './conversationTypes'
import { buildGreeting } from './conversationUtils'
import { loadConversationStore } from './conversationSession'

export function buildConversationContext(
  input: FounderInput,
  userName = 'there',
): ConversationContext {
  const snapshot = buildFounderSnapshot(input)
  const store = loadConversationStore()
  const hour = new Date().getHours()

  const schoolEval = input.domainIntelligence?.evaluations.find(e => e.domainId === 'school')
  const healthEval = input.domainIntelligence?.evaluations.find(e => e.domainId === 'health')

  const schoolPressure = schoolEval
    ? schoolEval.priority === 'critical' || schoolEval.priority === 'high'
    : false

  const healthSlipping = healthEval
    ? healthEval.score < 50 || healthEval.status === 'at_risk'
    : snapshot.momentumScore < 55

  const recoveryScore = input.dailyContext?.healthSignals
    ? (input.dailyContext.healthSignals.sleepHours ?? 0) >= 7 ? 78 : 52
    : 65

  const recentQuestionIds = store.sessions
    .flatMap(s => s.activeQuestions.map(q => q.id))
    .slice(0, 20)

  const answeredToday = store.timeline
    .filter(t => t.type === 'answer' && t.timestamp.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .map(t => t.title)

  return {
    founderSnapshot: snapshot,
    greeting: buildGreeting(hour),
    userName,
    topDomain: input.domainIntelligence?.coordinator?.topDomain ?? null,
    recoveryScore,
    validationScore: snapshot.validationScore,
    architectureScore: snapshot.architectureScore,
    schoolPressure,
    healthSlipping,
    recentQuestionIds,
    answeredToday,
    hour,
  }
}
