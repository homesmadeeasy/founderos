import type { ConversationReasoner } from '@/lib/conversation/conversationEngine'
import { ruleReasoner } from '@/lib/conversation/conversationEngine'
import type {
  ConversationContext,
  ConversationEvidence,
  ConversationSession,
  ConversationTopic,
  ConversationTurn,
} from '@/lib/conversation/conversationTypes'
import type { BeliefTopic, WorldModel } from './beliefTypes'
import { processAdaptiveAnswer } from '@/lib/conversation/conversationAdaptive'
import { getCognitiveStore, processConversationAnswer, syncCognitiveModel } from './cognitiveOrchestrator'
import { selectHighestValueQuestion } from './beliefQuestions'
import { buildCognitiveInsight } from './cognitiveSummary'
import { epistemicPhrase } from './cognitiveUtils'
import { topBelief } from './worldModel'
import { newConversationId, nowISO } from '@/lib/conversation/conversationUtils'
import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import { buildRawCognitiveInputFromFounder } from './cognitiveInputBuilder'

function toConversationTopic(topic: BeliefTopic): ConversationTopic {
  const map: Partial<Record<BeliefTopic, ConversationTopic>> = {
    founder: 'founder',
    strategy: 'strategy',
    validation: 'validation',
    execution: 'execution',
    product: 'product',
    health: 'health',
    relationships: 'relationships',
    finance: 'finance',
    vision: 'strategy',
    mission: 'strategy',
    learning: 'school',
    general: 'founder',
  }
  return map[topic] ?? 'founder'
}

/** Pure read — never reconciles or persists. */
export function buildCognitiveOpeningFromStore(
  ctx: ConversationContext,
  evidence: ConversationEvidence[],
  worldModel: WorldModel,
): ConversationTurn {
  const insight = buildCognitiveInsight(worldModel)
  const question = selectHighestValueQuestion(worldModel)
  const belief = topBelief(worldModel)

  const paragraphs = [
    `${ctx.greeting} ${ctx.userName}.`,
    belief
      ? `${epistemicPhrase(belief.status, belief.confidence)} ${belief.statement}`
      : insight.currentBelief,
  ]
  if (worldModel.contradictions.some((c) => !c.resolved)) {
    paragraphs.push("I'm holding a few conflicting beliefs — I'll surface them as we talk.")
  }
  paragraphs.push(question?.text ?? insight.topQuestion)

  return {
    id: newConversationId(),
    role: 'founder_ai',
    content: paragraphs.join('\n\n'),
    intent: 'observe',
    mood: 'strategic',
    topic: toConversationTopic(question?.topic ?? 'founder'),
    evidence: evidence.slice(0, 4),
    questionId: question?.id,
    createdAt: nowISO(),
  }
}

export function createCognitiveReasoner(getInput: () => FounderInput): ConversationReasoner {
  return {
    generateOpening(ctx, evidence) {
      const store = getCognitiveStore()
      return buildCognitiveOpeningFromStore(ctx, evidence, store.worldModel)
    },

    generateReply(ctx, session, answer, questionId, userTurnId) {
      const adaptive = processAdaptiveAnswer(ctx, session, answer, questionId, userTurnId ?? newConversationId())
      processConversationAnswer(answer, questionId)
      syncCognitiveModel(buildRawCognitiveInputFromFounder(getInput()))

      const store = getCognitiveStore()
      const nextQ = selectHighestValueQuestion(store.worldModel)
      let content = adaptive.reply.content
      if (nextQ && !content.includes('?')) {
        content = `${content}\n\n${nextQ.text}`
      }

      return {
        turn: { ...adaptive.reply, content },
        adaptive,
      }
    },

    generateRecommendation(ctx) {
      return ruleReasoner.generateRecommendation(ctx)
    },

    answerChipQuestion(ctx, prompt) {
      return ruleReasoner.answerChipQuestion(ctx, prompt)
    },
  }
}
