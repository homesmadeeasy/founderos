import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'

export type ConversationTopic =
  | 'founder'
  | 'strategy'
  | 'sprint'
  | 'validation'
  | 'architecture'
  | 'execution'
  | 'product'
  | 'users'
  | 'school'
  | 'health'
  | 'relationships'
  | 'finance'
  | 'reflection'
  | 'ideas'
  | 'general'

export type ConversationMood = 'calm' | 'curious' | 'direct' | 'supportive' | 'strategic'

export type ConversationIntent =
  | 'observe'
  | 'question'
  | 'recommend'
  | 'reflect'
  | 'validate'
  | 'summarize'

export type ConversationAnswerType =
  | 'short_text'
  | 'paragraph'
  | 'multiple_choice'
  | 'yes_no'
  | 'rating'
  | 'number'
  | 'single_selection'
  | 'multiple_selection'

export type ConversationSuggestionAction =
  | 'ask_now'
  | 'ask_tonight'
  | 'ask_tomorrow'
  | 'ignore'
  | 'already_answered'
  | 'requires_external_data'

export type ConversationStatus = 'active' | 'paused' | 'finished' | 'abandoned'

export type ConversationRole = 'founder_ai' | 'user' | 'system'

export interface ConversationEvidence {
  id: string
  sourceType: 'memory' | 'signal' | 'outcome' | 'decision' | 'domain' | 'knowledge' | 'founder' | 'object'
  title: string
  summary: string
  weight: number
  supports: boolean
}

export interface ConversationQuestion {
  id: string
  topic: ConversationTopic
  title: string
  reason: string
  importance: 'low' | 'medium' | 'high' | 'critical'
  answerType: ConversationAnswerType
  choices?: string[]
  relatedObjectIds: string[]
  relatedMemoryIds: string[]
  relatedSignalIds: string[]
  relatedDomains: string[]
  suggestion: ConversationSuggestionAction
  confidence: number
}

export interface ConversationSuggestion {
  id: string
  questionId: string
  action: ConversationSuggestionAction
  reason: string
  confidence: number
}

export interface ConversationTurn {
  id: string
  role: ConversationRole
  content: string
  intent: ConversationIntent
  mood: ConversationMood
  topic: ConversationTopic
  evidence: ConversationEvidence[]
  questionId?: string
  createdAt: string
  isTyping?: boolean
  followUpQuestion?: ConversationQuestion
  actionCard?: ConversationActionCard
}

export interface ConversationActionCard {
  id: string
  type: 'validation_sprint' | 'generic'
  title: string
  steps: string[]
}

export interface ConversationMemoryWrite {
  id: string
  memoryId?: string
  title: string
  content: string
  confidence: number
  createdAt: string
}

export interface ConversationRecommendation {
  id: string
  action: string
  reason: string
  evidence: ConversationEvidence[]
  confidence: number
}

export interface ConversationSummary {
  id: string
  sessionId: string
  topic: ConversationTopic
  summary: string
  keyInsights: string[]
  createdAt: string
}

export interface Conversation {
  id: string
  topic: ConversationTopic
  turns: ConversationTurn[]
  evidence: ConversationEvidence[]
  createdAt: string
}

export interface ConversationSession {
  id: string
  startedAt: string
  updatedAt: string
  topic: ConversationTopic
  status: ConversationStatus
  turns: ConversationTurn[]
  evidence: ConversationEvidence[]
  activeQuestions: ConversationQuestion[]
  confidence: number
  summary?: ConversationSummary
  memoryWrites: ConversationMemoryWrite[]
  knowledgeSuggestions: string[]
  nextQuestion?: ConversationQuestion
  recommendation?: ConversationRecommendation
}

export interface ConversationContext {
  founderSnapshot: FounderSnapshot
  greeting: string
  userName: string
  topDomain: string | null
  recoveryScore: number
  validationScore: number
  architectureScore: number
  schoolPressure: boolean
  healthSlipping: boolean
  recentQuestionIds: string[]
  answeredToday: string[]
  hour: number
}

export interface ConversationTimelineEntry {
  id: string
  sessionId: string
  type: 'question' | 'answer' | 'memory' | 'knowledge' | 'decision' | 'outcome' | 'kernel'
  title: string
  detail: string
  timestamp: string
  relatedIds: string[]
}

export interface ConversationStore {
  sessions: ConversationSession[]
  timeline: ConversationTimelineEntry[]
  lastSessionId: string | null
  proactiveDismissedAt: string | null
}

export interface SubmitAnswerInput {
  sessionId: string
  answer: string
  questionId?: string
  chip?: string
}

export interface SubmitAnswerResult {
  session: ConversationSession
  reply: ConversationTurn
  memoryWrite?: ConversationMemoryWrite
  knowledgeSuggestion?: string
}
