import type { CommandCenterState } from './types'
import { generateDailyBriefing } from './briefingLogic'
import { isDueToday, isOverdue, todayISO } from './utils'
import type { FounderObject } from '@/lib/object-engine/objectTypes'
import { OBJECT_TYPE_LABEL } from '@/lib/object-engine/objectTypes'
import {
  findObjectByTitle, getObjectsSupporting, getRelatedObjects,
} from '@/lib/object-engine/objectRelationships'
import { generateObjectSummary } from '@/lib/object-engine/objectSummaries'
import type { MemoryRecord } from '@/lib/memory-engine/memoryTypes'
import {
  generateRecentMemoryDigest, summarizeMemoriesByType,
} from '@/lib/memory-engine/memorySummaries'
import { sortMemoriesByOccurred } from '@/lib/memory-engine/memorySearch'
import type { ExecutiveBriefing, ExecutiveRecommendation } from '@/lib/executive-engine/executiveTypes'
import type { KnowledgeRecord } from '@/lib/knowledge-engine/knowledgeTypes'
import {
  explainMemoryVsKnowledge,
  summarizeKnowledgeByDomain,
  summarizeTopPrinciples,
} from '@/lib/knowledge-engine/knowledgeSummaries'
import { SEED_KNOWLEDGE_IDS } from '@/lib/knowledge-engine/knowledgeSeedData'
import type { MorningExecutionPlan } from '@/lib/morning-execution/morningTypes'
import type { DailyReasoningOutput } from '@/lib/reasoning-engine/reasoningTypes'
import type { RecommendedPlanItem } from '@/lib/reasoning-engine/reasoningTypes'
import type { EveningReview } from '@/lib/evening-review/eveningTypes'
import type { DailyLearningLoopOutput, TomorrowContextData } from '@/lib/daily-learning-loop/dailyLoopTypes'
import type { CaptureSignal } from '@/lib/capture-engine/captureTypes'
import type { Signal } from '@/lib/signal-engine/signalTypes'
import type { SignalSummary } from '@/lib/signal-engine/signalSearch'
import type { AdapterConnectionState } from '@/lib/source-adapters/adapterTypes'
import type { DecisionOutput } from '@/lib/decision-engine/decisionTypes'
import type { OutcomeStats } from '@/lib/outcome-engine/outcomeTypes'
import type { OutcomeHistoryEntry } from '@/lib/outcome-engine/outcomeTypes'
import { getOutcomeHistory } from '@/lib/outcome-engine/outcomeEngine'
import { formatSignalTimestamp, getCalendarProviderLabel } from '@/lib/signal-engine/signalFormat'
import { tomorrowISO } from '@/lib/signal-engine/signalUtils'
export interface MorningAssistantSnapshot {
  morningPlan: MorningExecutionPlan | null
  reasoningOutput: DailyReasoningOutput | null
  firstAction: RecommendedPlanItem | null
  decisionOutput?: DecisionOutput | null
  outcomeStats?: OutcomeStats | null
  yesterdayOutcome?: OutcomeHistoryEntry | null
  regenerate?: () => void
}

export interface EveningAssistantSnapshot {
  eveningReview: EveningReview | null
  dailyLearningLoop: DailyLearningLoopOutput | null
  tomorrowContext: TomorrowContextData | null
}

export interface CaptureAssistantSnapshot {
  todaySignals: CaptureSignal[]
  unprocessedCount: number
}

export interface SignalAssistantSnapshot {
  signals: Signal[]
  todaySignals: Signal[]
  morningNotes: string[]
  summary: SignalSummary
}

export interface SyncAssistantSnapshot {
  adapters: AdapterConnectionState[]
  lastGlobalSyncLabel: string
  connectedCount: number
}

export interface ExecutiveAssistantSnapshot {
  topFocus: { title: string; summary: string; score?: number }
  briefing: ExecutiveBriefing | null
  recommendations: ExecutiveRecommendation[]
  warnings: string[]
}

export interface AssistantContext {
  commandCenter: CommandCenterState
  objects: FounderObject[]
  memories: MemoryRecord[]
  knowledge: KnowledgeRecord[]
  executive?: ExecutiveAssistantSnapshot | null
  morning?: MorningAssistantSnapshot | null
  evening?: EveningAssistantSnapshot | null
  capture?: CaptureAssistantSnapshot | null
  signals?: SignalAssistantSnapshot | null
  sync?: SyncAssistantSnapshot | null
}

function formatMorningPlanResponse(morning: MorningAssistantSnapshot): string {
  const plan = morning.morningPlan
  const reasoning = morning.reasoningOutput
  if (!plan) return 'Morning plan is still compiling. Open /morning or wait a moment.'

  const lines: string[] = ['**Morning Execution**', plan.summary]

  lines.push(`**Mission:** ${plan.primaryMission}`)

  if (plan.topPriorities.length > 0) {
    lines.push('**Priorities:**')
    plan.topPriorities.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.title}${p.completed ? ' ✓' : ''} — ${p.reason}`)
    })
  }

  if (morning.firstAction && !morning.firstAction.completed) {
    lines.push(`**Start here:** ${morning.firstAction.title}`)
    lines.push(morning.firstAction.reason)
  }

  if (plan.warnings.length > 0) {
    lines.push(`**Warnings:**\n${plan.warnings.slice(0, 2).map(w => `• ${w}`).join('\n')}`)
  }

  if (plan.deferList.length > 0) {
    lines.push(`**Defer:** ${plan.deferList.slice(0, 3).join(' · ')}`)
  }

  if (reasoning?.rationale) {
    lines.push(`**Why:** ${reasoning.rationale}`)
  }

  lines.push('Full plan: /morning')
  return lines.join('\n\n')
}

function formatDecisionResponse(decision?: DecisionOutput | null, mode: 'full' | 'ignore' | 'why' | 'tradeoff' = 'full'): string {
  if (!decision) {
    return 'Decision Engine needs more context. Open **/morning** or **/dashboard** after your morning plan compiles, then ask again.'
  }

  if (mode === 'ignore') {
    if (decision.ignoreToday.length === 0) return 'No explicit ignore list — focus on the primary decision.'
    return `**Ignore today:**\n${decision.ignoreToday.map(i => `• ${i}`).join('\n')}`
  }

  if (mode === 'why') {
    const top = decision.evidence.filter(e => e.supports).slice(0, 4)
    const lines = [
      `**Why ${decision.primaryDecision.title}:** ${decision.primaryDecision.reason}`,
      decision.explanation,
    ]
    if (top.length > 0) {
      lines.push(`**Evidence:**\n${top.map(e => `• [${e.sourceType}] ${e.title}: ${e.summary.slice(0, 100)}`).join('\n')}`)
    }
    lines.push(`Confidence: ${decision.confidence}% (${decision.confidenceLabel})`)
    return lines.join('\n\n')
  }

  if (mode === 'tradeoff') {
    if (decision.tradeoffs.length === 0) {
      return `No major tradeoffs detected. Primary: **${decision.primaryDecision.action}**.`
    }
    return decision.tradeoffs.map(t =>
      `**${t.optionA}** vs **${t.optionB}**\n→ Choose **${t.recommendation}**\n${t.reason}`,
    ).join('\n\n')
  }

  const lines = [
    `**Today's decision:** ${decision.primaryDecision.action}`,
    decision.primaryDecision.reason,
    decision.explanation,
  ]
  if (decision.secondaryDecisions.length > 0) {
    lines.push(`**If time allows:**\n${decision.secondaryDecisions.map(d => `• ${d.action}`).join('\n')}`)
  }
  if (decision.ignoreToday.length > 0) {
    lines.push(`**Ignore:** ${decision.ignoreToday.slice(0, 2).join('; ')}`)
  }
  return lines.join('\n\n')
}

function formatFounderOSvsStudyResponse(decision?: DecisionOutput | null): string {
  if (!decision) return formatDecisionResponse(null)
  const tradeoff = decision.tradeoffs.find(t =>
    t.optionA.toLowerCase().includes('study') || t.optionB.toLowerCase().includes('study')
    || t.optionA.toLowerCase().includes('founderos') || t.optionB.toLowerCase().includes('founderos'),
  )
  if (tradeoff) {
    return `**${tradeoff.optionA}** vs **${tradeoff.optionB}**\n→ **${tradeoff.recommendation}**\n${tradeoff.reason}\n\nConfidence: ${decision.confidence}%`
  }
  const study = decision.primaryDecision.area === 'knowledge'
    || decision.primaryDecision.title.toLowerCase().includes('study')
    || decision.primaryDecision.title.toLowerCase().includes('economics')
  if (study) {
    return `**Study wins today.** ${decision.primaryDecision.reason} FounderOS can wait unless study block is complete.`
  }
  return `**FounderOS can lead today.** ${decision.primaryDecision.reason} No urgent study deadline detected in signals.`
}

function formatTrainVsRecoverResponse(decision?: DecisionOutput | null): string {
  if (!decision) return formatDecisionResponse(null)
  const tradeoff = decision.tradeoffs.find(t =>
    t.optionA.toLowerCase().includes('workout') || t.optionB.toLowerCase().includes('recover')
    || t.optionA.toLowerCase().includes('train') || t.optionB.toLowerCase().includes('recover'),
  )
  if (tradeoff) {
    return `**${tradeoff.optionA}** vs **${tradeoff.optionB}**\n→ **${tradeoff.recommendation}**\n${tradeoff.reason}`
  }
  if (decision.primaryDecision.area === 'recovery' || decision.primaryDecision.title.toLowerCase().includes('recover')) {
    return `**Recover first.** ${decision.primaryDecision.reason}`
  }
  if (decision.primaryDecision.area === 'health') {
    return `**Train today.** ${decision.primaryDecision.reason}`
  }
  return 'No strong train vs recover conflict. Check health signals in **/signals** or log sleep in Health Snapshot.'
}

function formatEveningReviewResponse(evening: EveningAssistantSnapshot): string {
  const review = evening.eveningReview
  const loop = evening.dailyLearningLoop

  if (!review) {
    return 'No evening review yet. Open **/evening** to close the loop for today.'
  }

  if (!review.completed) {
    return [
      'Your evening review is in progress but not completed.',
      `Completed priorities: ${review.completedPriorities.length}`,
      `Incomplete: ${review.incompletePriorities.length}`,
      review.wins.length > 0 ? `Wins so far: ${review.wins.join(', ')}` : null,
      'Finish at **/evening** and tap **Complete review** so FounderOS can learn from today.',
    ].filter(Boolean).join('\n\n')
  }

  const lines: string[] = ['**Evening Review**', loop?.summary ?? `Review completed for ${review.date}.`]

  if (review.wins.length > 0) {
    lines.push(`**Wins:**\n${review.wins.map(w => `• ${w}`).join('\n')}`)
  }
  if (review.blockers.length > 0) {
    lines.push(`**Blockers:**\n${review.blockers.map(b => `• ${b}`).join('\n')}`)
  }
  if (loop?.lessons.length) {
    lines.push(`**Lessons:**\n${loop.lessons.map(l => `• ${l}`).join('\n')}`)
  }
  if (review.reflection) {
    lines.push(`**Reflection:** ${review.reflection}`)
  }

  lines.push('Full review: /evening')
  return lines.join('\n\n')
}

function formatTomorrowCarryResponse(evening: EveningAssistantSnapshot): string {
  const ctx = evening.dailyLearningLoop?.tomorrowContext ?? evening.tomorrowContext
  const review = evening.eveningReview

  if (!review?.completed) {
    return 'Complete your evening review first at **/evening** — tomorrow context is generated when you close the loop.'
  }

  if (!ctx) {
    return 'No tomorrow context saved yet. Complete tonight\'s review at /evening.'
  }

  const lines: string[] = ['**Carry into tomorrow**']
  if (ctx.recommendedMission) lines.push(`Mission: ${ctx.recommendedMission}`)
  if (ctx.suggestedFocus) lines.push(`Focus: ${ctx.suggestedFocus}`)
  if (ctx.carryOverPriorities.length > 0) {
    lines.push(`Priorities:\n${ctx.carryOverPriorities.map(p => `• ${p}`).join('\n')}`)
  }
  if (ctx.warnings.length > 0) {
    lines.push(`Warnings:\n${ctx.warnings.map(w => `• ${w}`).join('\n')}`)
  }
  if (ctx.notes) lines.push(`Notes: ${ctx.notes}`)
  lines.push('Tomorrow\'s Morning Execution will use this context automatically.')
  return lines.join('\n\n')
}

function formatExecutiveFocusResponse(executive: ExecutiveAssistantSnapshot): string {
  const lines: string[] = ['**Executive Engine**']

  if (executive.briefing) {
    lines.push(executive.briefing.summary)
    if (executive.briefing.priorities.length > 0) {
      lines.push(`Priorities:\n${executive.briefing.priorities.map(p => `• ${p}`).join('\n')}`)
    }
  }

  lines.push(`**Top focus:** ${executive.topFocus.title}`)
  lines.push(executive.topFocus.summary)
  if (executive.topFocus.score != null) {
    lines.push(`Attention score: ${executive.topFocus.score}/100`)
  }

  const primary = executive.recommendations.find(r => r.priority === 'high')
  if (primary && !primary.title.includes(executive.topFocus.title)) {
    lines.push(`Recommendation: ${primary.title} — ${primary.rationale}`)
  }

  if (executive.warnings.length > 0) {
    lines.push(`Warnings:\n${executive.warnings.slice(0, 2).map(w => `• ${w}`).join('\n')}`)
  }

  lines.push('Open Executive Engine (/executive) for full attention scores and decisions.')
  return lines.join('\n\n')
}

function filterCalendarSignals(signals?: Signal[]): Signal[] {
  return signals?.filter(s => s.source === 'calendar' || s.type === 'event' || s.type === 'reminder') ?? []
}

function formatCalendarSignalLine(signal: Signal): string {
  const provider = getCalendarProviderLabel(signal.metadata)
  const start = (signal.metadata?.start as string | undefined) ?? signal.timestamp
  return `• ${formatSignalTimestamp(start)} — ${signal.title} (${provider})`
}

function googleCalendarStatusMessage(sync?: SyncAssistantSnapshot | null): string {
  const google = sync?.adapters?.find(a => a.adapterId === 'google-calendar')
  const mock = sync?.adapters?.find(a => a.adapterId === 'calendar')
  const mockOn = mock?.status === 'mock'
  const googleOn = google?.status === 'connected'

  if (googleOn) {
    const mode = google?.connectionMode === 'manual_token' ? 'manual token mode' : 'connected'
    return `**Google Calendar** is connected (${mode}). Last sync: ${google?.lastSyncedAt ? formatSignalTimestamp(google.lastSyncedAt) : 'never'}.`
  }
  if (mockOn) {
    return '**Google Calendar** live sync is prepared but not connected. You are using **mock calendar** data. Connect in **/settings** → Connected Sources.'
  }
  return '**Google Calendar** live sync is prepared but not connected. Connect mock calendar or add a manual token in **/settings**.'
}

const PROMPT_MATCHERS: { keywords: string[]; handler: (ctx: AssistantContext) => string }[] = [
  {
    keywords: ['did yesterday', 'yesterday recommendation', 'yesterday decision work', 'did the recommendation work'],
    handler: ({ morning }) => {
      const y = morning?.yesterdayOutcome
      if (!y?.prediction) {
        return 'No outcome recorded for yesterday yet. Complete **/evening** and log whether you followed the decision.'
      }
      if (!y.record) {
        return `Yesterday's decision was **${y.prediction.predictedAction}**, but no outcome was logged. Complete evening review to close the loop.`
      }
      const lines = [
        `**Yesterday:** ${y.prediction.predictedAction}`,
        `Followed: **${y.record.completed}** · Quality: **${y.record.outcomeQuality}**`,
        y.record.actualResult ? `Result: ${y.record.actualResult}` : null,
        y.evaluation ? `Accuracy: ${y.evaluation.accuracyScore}% — ${y.evaluation.whatWorked || y.evaluation.whatDidNotWork}` : null,
      ].filter(Boolean)
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['decisions work best', 'what decisions work', 'best decisions for me'],
    handler: ({ morning }) => {
      const history = getOutcomeHistory(12)
      const good = history.filter(h =>
        h.record && (h.record.outcomeQuality === 'good' || h.record.outcomeQuality === 'excellent'),
      )
      if (good.length === 0) {
        return 'Not enough outcome history yet. FounderOS learns after you complete evening reviews with decision outcomes.'
      }
      return `**Decisions that worked best:**\n${good.slice(0, 5).map(h =>
        `• ${h.prediction.decisionTitle} (${h.record!.outcomeQuality}, followed: ${h.record!.completed})`,
      ).join('\n')}`
    },
  },
  {
    keywords: ['learned from outcomes', 'founderos learned', 'what has founderos learned'],
    handler: ({ morning }) => {
      const stats = morning?.outcomeStats
      const history = getOutcomeHistory(8)
      const lessons = history
        .filter(h => h.record?.lessons)
        .map(h => `• ${h.record!.lessons}`)
      const lines = ['**Outcome learning**']
      if (stats) {
        lines.push(`Tracked: ${stats.totalPredictions} predictions, ${stats.evaluatedCount} evaluated.`)
        lines.push(`Success rate: ${stats.successRate}% · Follow rate: ${stats.followRate}% · Avg accuracy: ${stats.averageAccuracy}%`)
      }
      if (lessons.length > 0) {
        lines.push(`**Lessons:**\n${lessons.slice(0, 4).join('\n')}`)
      } else {
        lines.push('Log lessons in evening Decision Outcome to build personalised knowledge.')
      }
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['how accurate', 'accuracy of recommendations', 'recommendation accuracy'],
    handler: ({ morning }) => {
      const stats = morning?.outcomeStats
      if (!stats || stats.evaluatedCount === 0) {
        return 'No accuracy data yet. Complete evening reviews with decision outcomes to calibrate recommendations.'
      }
      return `**Recommendation accuracy:** ${stats.averageAccuracy}% across ${stats.evaluatedCount} evaluated decisions. Success rate (good/excellent when followed): ${stats.successRate}%.`
    },
  },
  {
    keywords: ['why are you confident', 'why confident', 'why is founderos confident'],
    handler: ({ morning }) => {
      const decision = morning?.decisionOutput
      if (!decision) return formatDecisionResponse(null, 'why')
      const stats = morning?.outcomeStats
      const lines = [formatDecisionResponse(decision, 'why')]
      if (stats && stats.evaluatedCount > 0) {
        lines.push(`Outcome history supports tuning: ${stats.successRate}% success on similar past decisions.`)
      }
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['what should i do next', 'should i do next', 'do next'],
    handler: ({ morning }) => formatDecisionResponse(morning?.decisionOutput),
  },
  {
    keywords: ['what should i ignore', 'should i ignore', 'ignore today'],
    handler: ({ morning }) => formatDecisionResponse(morning?.decisionOutput, 'ignore'),
  },
  {
    keywords: ['why is this the priority', 'why is this priority', 'why this priority'],
    handler: ({ morning }) => formatDecisionResponse(morning?.decisionOutput, 'why'),
  },
  {
    keywords: ['what is the tradeoff', 'what is the trade off', 'what tradeoff', 'the tradeoff'],
    handler: ({ morning }) => formatDecisionResponse(morning?.decisionOutput, 'tradeoff'),
  },
  {
    keywords: ['should i work on founderos or study', 'founderos or study', 'study or founderos', 'work on founderos or study'],
    handler: ({ morning }) => formatFounderOSvsStudyResponse(morning?.decisionOutput),
  },
  {
    keywords: ['should i train or recover', 'train or recover', 'workout or recover'],
    handler: ({ morning }) => formatTrainVsRecoverResponse(morning?.decisionOutput),
  },
  {
    keywords: ['sync my calendar', 'sync calendar'],
    handler: () => {
      return 'Syncing calendar sources… Check **/signals** for new calendar events.'
    },
  },
  {
    keywords: ['is google calendar connected', 'google calendar connected', 'google calendar status'],
    handler: ({ sync }) => googleCalendarStatusMessage(sync),
  },
  {
    keywords: ['sync my signal', 'sync signals', 'sync sources', 'run sync'],
    handler: () => {
      return 'Running sync for all connected sources… Check **/signals** for new entries and sync history.'
    },
  },
  {
    keywords: ['what sources are connected', 'sources connected', 'connected sources', 'which sources'],
    handler: ({ sync }) => {
      if (!sync?.adapters?.length) {
        return 'No source adapters configured. Open **/settings** → Connected Sources.'
      }
      const connected = sync.adapters.filter(a => a.status === 'mock' || a.status === 'connected')
      if (connected.length === 0) {
        return 'No sources connected yet. Open **/settings**, tap **Connect mock** on Calendar, Health, or Cursor, then sync.'
      }
      return `**Connected sources (${connected.length}):**\n${connected.map(a =>
        `• ${a.adapterId} (${a.status})${a.lastSyncedAt ? ` — last sync ${formatSignalTimestamp(a.lastSyncedAt)}` : ''}`,
      ).join('\n')}`
    },
  },
  {
    keywords: ['when did signals last sync', 'last sync', 'when last sync'],
    handler: ({ sync }) => {
      if (!sync) return 'Sync engine not loaded.'
      return `Last global sync: **${sync.lastGlobalSyncLabel}**. ${sync.connectedCount} source${sync.connectedCount === 1 ? '' : 's'} connected. Open **/signals** for history.`
    },
  },
  {
    keywords: ['what is on my calendar', 'on my calendar', 'my calendar today'],
    handler: ({ signals, sync }) => {
      const calendar = filterCalendarSignals(signals?.signals)
      if (calendar.length === 0) {
        return `${googleCalendarStatusMessage(sync)}\n\nNo calendar signals yet. Connect and sync in **/settings**, then ask again.`
      }
      return `**Your calendar:**\n${calendar.slice(0, 8).map(formatCalendarSignalLine).join('\n')}`
    },
  },
  {
    keywords: ['calendar events matter today', 'events matter today', 'what calendar events matter'],
    handler: ({ signals, sync }) => {
      const today = todayISO()
      const calendar = filterCalendarSignals(signals?.signals).filter(s => {
        const start = (s.metadata?.start as string | undefined) ?? s.timestamp
        return start.slice(0, 10) === today
      })
      if (calendar.length === 0) {
        return `No calendar events for today in signals. ${googleCalendarStatusMessage(sync)}`
      }
      return `**Today's calendar events:**\n${calendar.map(formatCalendarSignalLine).join('\n')}`
    },
  },
  {
    keywords: ['what happened today', 'happened today'],
    handler: ({ signals, memories, capture }) => {
      const parts: string[] = ['**Today so far**']
      const todaySigs = signals?.todaySignals ?? []
      if (todaySigs.length > 0) {
        parts.push(`**Signals (${todaySigs.length}):**\n${todaySigs.slice(0, 8).map(s =>
          `• [${s.source}] ${s.title}`,
        ).join('\n')}`)
      }
      const caps = capture?.todaySignals ?? []
      if (caps.length > 0) {
        parts.push(`**Captures (${caps.length}):**\n${caps.slice(0, 6).map(s =>
          `• ${s.parsedContent}`,
        ).join('\n')}`)
      }
      const today = todayISO()
      const memToday = memories.filter(m => m.occurredAt.slice(0, 10) === today).slice(0, 5)
      if (memToday.length > 0) {
        parts.push(`**Memories:**\n${memToday.map(m => `• ${m.title}`).join('\n')}`)
      }
      if (parts.length === 1) {
        return 'Nothing recorded yet today. Capture something or open **/signals** for Connected Reality data.'
      }
      return parts.join('\n\n')
    },
  },
  {
    keywords: ['what signals', 'signals came in', 'signals today', 'signal count'],
    handler: ({ signals }) => {
      if (!signals?.signals?.length) {
        return 'No signals in the Signal Engine yet. Open **/signals** — mock seeds load on first visit.'
      }
      const lines = [
        `**Signal Engine:** ${signals.summary.total} total, ${signals.summary.today} today.`,
      ]
      if (signals.summary.highlights.length > 0) {
        lines.push(`**Highlights:**\n${signals.summary.highlights.map(h => `• ${h}`).join('\n')}`)
      }
      if (signals.todaySignals.length > 0) {
        lines.push(`**Today:**\n${signals.todaySignals.slice(0, 8).map(s =>
          `• [${s.source}] ${s.title}`,
        ).join('\n')}`)
      }
      lines.push('Full feed: /signals')
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['did i code', 'code today', 'coding today', 'coding session', 'work on founder'],
    handler: ({ signals }) => {
      const today = todayISO()
      const coding = signals?.todaySignals?.find(s => s.type === 'coding_session')
        ?? signals?.signals?.find(s =>
          s.type === 'coding_session' && s.timestamp.slice(0, 10) === today,
        )
      if (coding) {
        return `**Yes — coding signal detected.**\n${coding.title}\n${coding.content}\n\nFounderOS progress is on the board today.`
      }
      return 'No coding session signal today. If you worked in Cursor, a future integration will log it automatically.'
    },
  },
  {
    keywords: ['did i train', 'workout today', 'did i workout', 'train today', 'did i work out'],
    handler: ({ signals, commandCenter: s }) => {
      const today = todayISO()
      const log = s.dailyLogs.find(l => l.date === today)
      if (log?.workoutCompleted) return '**Yes** — workout marked complete in today\'s health log.'
      const gap = signals?.todaySignals?.find(s =>
        s.content.toLowerCase().includes('workout not logged') || s.metadata?.workoutLogged === false,
      )
      if (gap) return `**Not yet** — ${gap.content}\nHealth is flagged as a priority in your morning plan.`
      const workout = signals?.todaySignals?.find(s => s.type === 'workout')
      if (workout) return `**Workout signal:** ${workout.title} — ${workout.content}`
      return 'No workout signal or health log entry today. Log training in Health Snapshot or wait for Apple Health integration.'
    },
  },
  {
    keywords: ['calendar suggest', 'what does my calendar', 'calendar today', 'calendar tomorrow', 'study block', 'do i have study blocks', 'study blocks'],
    handler: ({ signals, sync }) => {
      const calendar = filterCalendarSignals(signals?.signals)
      if (calendar.length === 0) {
        return `${googleCalendarStatusMessage(sync)}\n\nNo calendar signals yet.`
      }
      const today = todayISO()
      const tomorrow = tomorrowISO()
      const study = calendar.filter(s => {
        const text = `${s.title} ${s.content}`.toLowerCase()
        return text.includes('study') || text.includes('class') || text.includes('lecture')
          || s.metadata?.domain === 'school'
      })
      const todayEvents = calendar.filter(s => {
        const start = (s.metadata?.start as string | undefined) ?? s.timestamp
        return start.slice(0, 10) === today
      })
      const tomorrowEvents = calendar.filter(s => {
        const start = (s.metadata?.start as string | undefined) ?? s.timestamp
        return start.slice(0, 10) === tomorrow
      })
      const lines: string[] = ['**Calendar signals**']
      if (study.length > 0) {
        lines.push(`**Study blocks (${study.length}):**\n${study.slice(0, 4).map(formatCalendarSignalLine).join('\n')}`)
      } else {
        lines.push('No study blocks detected in calendar signals.')
      }
      if (todayEvents.length > 0) {
        lines.push(`**Today:**\n${todayEvents.slice(0, 4).map(formatCalendarSignalLine).join('\n')}`)
      }
      if (tomorrowEvents.length > 0) {
        lines.push(`**Tomorrow:**\n${tomorrowEvents.slice(0, 4).map(formatCalendarSignalLine).join('\n')}`)
      }
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['health signals', 'health signal matter', 'what health signals', 'sleep signal'],
    handler: ({ signals, morning }) => {
      const health = signals?.signals?.filter(s =>
        s.type === 'health' || s.type === 'workout' || s.source === 'health',
      ) ?? []
      const lines: string[] = ['**Health signals**']
      if (health.length === 0) {
        lines.push('No health signals in the engine yet.')
      } else {
        lines.push(health.slice(0, 6).map(s => `• ${s.title}: ${s.content}`).join('\n'))
      }
      if (morning?.reasoningOutput?.risks?.some(r => r.toLowerCase().includes('workout'))) {
        lines.push('Morning plan flagged workout as a health priority.')
      }
      if (signals?.morningNotes?.length) {
        lines.push(`**Morning notes:** ${signals.morningNotes.join(' ')}`)
      }
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['what did i capture today', 'captured today', 'capture today'],
    handler: ({ capture }) => {
      if (!capture?.todaySignals?.length) return 'No captures today yet. Press ⌘K and capture anything — FounderOS classifies it.'
      const lines = capture.todaySignals.slice(0, 8).map(s =>
        `• [${s.classification}] ${s.parsedContent}`,
      )
      return `**Today's captures (${capture.todaySignals.length}):**\n${lines.join('\n')}\n\nOpen /inbox to process.`
    },
  },
  {
    keywords: ['unanswered question', 'open question', 'show questions'],
    handler: ({ capture }) => {
      const questions = capture?.todaySignals?.filter(s => s.classification === 'question') ?? []
      if (questions.length === 0) return 'No question captures today. Capture with "question: …" or ask naturally.'
      return questions.map(q => `• ${q.parsedContent}`).join('\n')
    },
  },
  {
    keywords: ['show ideas', 'my ideas today', 'ideas today', 'business ideas'],
    handler: ({ capture, objects }) => {
      const ideaSignals = capture?.todaySignals?.filter(s => s.classification === 'idea') ?? []
      const ideaObjects = objects.filter(o => o.type === 'idea' && o.status === 'inbox')
      const lines: string[] = []
      if (ideaSignals.length > 0) {
        lines.push('**Captured today:**')
        ideaSignals.forEach(s => lines.push(`• ${s.parsedContent}`))
      }
      if (ideaObjects.length > 0) {
        lines.push('**Inbox ideas:**')
        ideaObjects.slice(0, 6).forEach(o => lines.push(`• ${o.title}`))
      }
      if (lines.length === 0) return 'No ideas captured recently. Try: idea: Better AI memory'
      return lines.join('\n')
    },
  },
  {
    keywords: ['close the loop', 'close loop', 'evening review'],
    handler: ({ evening }) => {
      if (!evening?.eveningReview) return 'Open **/evening** to close the loop for today.'
      if (!evening.eveningReview.completed) {
        return 'Your evening review is not complete yet. Go to **/evening**, add wins, blockers, and lessons, then tap **Complete review**.'
      }
      return formatEveningReviewResponse(evening)
    },
  },
  {
    keywords: ['review my day', 'review the day', 'how was my day'],
    handler: ({ evening }) => formatEveningReviewResponse(evening ?? { eveningReview: null, dailyLearningLoop: null, tomorrowContext: null }),
  },
  {
    keywords: ['what did i learn today', 'learn today', 'today lesson', 'lessons today'],
    handler: ({ evening, capture }) => {
      if (evening?.eveningReview?.lessons?.length) {
        return `**Today's lessons:**\n${evening.eveningReview.lessons.map(l => `• ${l}`).join('\n')}`
      }
      const reflections = capture?.todaySignals?.filter(s =>
        s.classification === 'reflection' || s.classification === 'memory',
      ) ?? []
      if (reflections.length > 0) {
        return `**Learning from captures:**\n${reflections.map(r => `• ${r.parsedContent}`).join('\n')}`
      }
      if (!evening?.eveningReview) return 'No evening review yet. Open **/evening** to capture what you learned today.'
      return 'No lessons captured in today\'s review yet.'
    },
  },
  {
    keywords: ['carry into tomorrow', 'carry to tomorrow', 'tomorrow context', 'what should i carry'],
    handler: ({ evening }) => formatTomorrowCarryResponse(evening ?? { eveningReview: null, dailyLearningLoop: null, tomorrowContext: null }),
  },
  {
    keywords: ['blockers today', 'blockers did i', 'what blockers', 'my blockers today'],
    handler: ({ evening }) => {
      if (!evening?.eveningReview) return 'No evening review yet. Open **/evening** to log blockers from today.'
      if (evening.eveningReview.blockers.length === 0) return 'No blockers logged in today\'s review.'
      return `**Today\'s blockers:**\n${evening.eveningReview.blockers.map(b => `• ${b}`).join('\n')}`
    },
  },
  {
    keywords: ['do first', 'first today', 'start with', 'start today'],
    handler: ({ morning }) => {
      if (morning?.morningPlan) return formatMorningPlanResponse(morning)
      return 'Open Command Center — your morning plan generates automatically on load.'
    },
  },
  {
    keywords: ['plan today', 'my plan', 'what is my plan'],
    handler: ({ morning }) => {
      if (morning?.morningPlan) return formatMorningPlanResponse(morning)
      morning?.regenerate?.()
      return 'Generating your morning plan… refresh and ask again.'
    },
  },
  {
    keywords: ['why is this the priority', 'why this priority', 'why is this priority'],
    handler: ({ morning, executive }) => {
      if (morning?.reasoningOutput?.rationale) {
        return `**Morning reasoning:** ${morning.reasoningOutput.rationale}`
      }
      if (executive?.topFocus?.summary) return executive.topFocus.summary
      return 'No reasoning output yet. Open /morning to generate a plan.'
    },
  },
  {
    keywords: ['ignore', 'defer', 'should i skip', 'what to skip'],
    handler: ({ morning, executive }) => {
      if (morning?.morningPlan?.deferList?.length) {
        return `**Defer today:**\n${morning.morningPlan.deferList.map(d => `• ${d}`).join('\n')}`
      }
      const deferRec = executive?.recommendations?.find(r =>
        r.title.toLowerCase().includes('defer'),
      )
      if (deferRec) return deferRec.summary
      return 'Defer low-priority tasks and inbox noise until primary work is done.'
    },
  },
  {
    keywords: ['remember', 'what do you remember', 'memories', 'recall'],
    handler: ({ memories }) => {
      if (memories.length === 0) return 'No memories recorded yet. Use the Memory Engine or take actions in Command Center to build history.'
      return `${generateRecentMemoryDigest(memories, 6)}\n\nOpen Memory Engine for the full timeline.`
    },
  },
  {
    keywords: ['happened recently', 'recently', 'recent history', 'what happened'],
    handler: ({ memories }) => {
      const recent = sortMemoriesByOccurred(memories).slice(0, 6)
      if (recent.length === 0) return 'Nothing recorded recently.'
      return recent.map(m =>
        `• ${m.title}${m.summary ? ` — ${m.summary}` : ''}`,
      ).join('\n')
    },
  },
  {
    keywords: ['changed in founder', 'founderos progress', 'what changed'],
    handler: ({ memories }) => {
      const updates = memories.filter(m =>
        ['project_update', 'object_change', 'insight', 'event'].includes(m.type),
      ).slice(0, 6)
      if (updates.length === 0) return 'No recent FounderOS change memories found.'
      return updates.map(m => `• ${m.title}: ${m.summary || m.content}`).join('\n')
    },
  },
  {
    keywords: ['object-first', 'object first', 'why object'],
    handler: ({ memories }) => {
      const match = memories.find(m =>
        m.title.toLowerCase().includes('object-first')
        || m.content.toLowerCase().includes('object-first'),
      )
      if (match) {
        return `${match.title}\n\n${match.content}${match.summary ? `\n\n${match.summary}` : ''}`
      }
      return 'FounderOS became object-first so every meaningful entity is a FounderObject with relationships — the foundation for memory, reasoning and planning.'
    },
  },
  {
    keywords: ['focus', 'today', 'priority', 'priorities', 'should i'],
    handler: ({ commandCenter: s, objects, memories, executive, morning }) => {
      if (morning?.decisionOutput) return formatDecisionResponse(morning.decisionOutput)
      if (morning?.morningPlan) return formatMorningPlanResponse(morning)
      if (executive?.topFocus?.title) return formatExecutiveFocusResponse(executive)

      const today = todayISO()
      const mission = s.missionDate === today ? s.mission.trim() : ''
      const open = s.tasks.filter(t => t.status !== 'done')
      const top = open.find(t => isDueToday(t.dueDate, today) && t.priority === 'high')
        ?? open.find(t => t.priority === 'high')
        ?? open[0]

      const lines = [generateDailyBriefing(s)]
      if (mission) lines.unshift(`Mission: ${mission}`)

      const missionMem = memories.find(m => m.tags.includes('mission') && m.occurredAt.slice(0, 10) === today)
      if (missionMem) lines.push(`Today's mission memory: "${missionMem.content}"`)

      const highPriorityObjects = objects.filter(o => o.priority === 'high' && o.status === 'active')
      if (highPriorityObjects.length > 0) {
        lines.push(`High-priority objects: ${highPriorityObjects.slice(0, 3).map(o => o.title).join(', ')}.`)
      }
      if (top) lines.push(`I'd start with: "${top.title}".`)
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['object', 'objects', 'what exist', 'what do i have'],
    handler: ({ objects }) => {
      if (objects.length === 0) return 'No objects in the Object Engine yet.'
      const byType = objects.reduce<Record<string, number>>((acc, o) => {
        acc[o.type] = (acc[o.type] ?? 0) + 1
        return acc
      }, {})
      const breakdown = Object.entries(byType)
        .map(([type, count]) => `${OBJECT_TYPE_LABEL[type as keyof typeof OBJECT_TYPE_LABEL] ?? type}: ${count}`)
        .join(', ')
      return `You have ${objects.length} objects. Breakdown: ${breakdown}. Open Object Engine to browse and filter them.`
    },
  },
  {
    keywords: ['project', 'projects', 'summar'],
    handler: ({ commandCenter: s, objects }) => {
      const activeProjects = objects.filter(o => o.type === 'project' && o.status === 'active')
      if (activeProjects.length > 0) {
        return activeProjects.map(p =>
          `• **${p.title}** (${p.area ?? 'general'}) — ${p.summary || 'No summary.'}`,
        ).join('\n')
      }
      const active = s.projects.filter(p => p.status === 'active')
      if (active.length === 0) return 'You have no active projects. Create one to organise your work.'
      return active.map(p =>
        `• **${p.name}** (${p.area}) — ${p.outcome || 'No outcome set.'} Next: ${p.nextAction || 'Define a next action.'}`,
      ).join('\n')
    },
  },
  {
    keywords: ['decision', 'decisions'],
    handler: ({ objects, memories }) => {
      const memoryDecisions = memories.filter(m => m.type === 'decision')
      if (memoryDecisions.length > 0) {
        return summarizeMemoriesByType(memories, 'decision')
      }
      const decisions = objects.filter(o => o.type === 'decision')
      if (decisions.length === 0) return 'No decisions recorded yet.'
      return decisions.map(d =>
        `• ${d.title}${d.summary ? ` — ${d.summary}` : ''}`,
      ).join('\n')
    },
  },
  {
    keywords: ['model physique', 'physique', 'supports my model', 'supports model'],
    handler: ({ objects }) => {
      const goal = findObjectByTitle(objects, 'model physique')
        ?? objects.find(o => o.type === 'goal' && o.title.toLowerCase().includes('physique'))
      if (!goal) return 'I could not find a Model Physique goal in your objects.'
      const supporters = getObjectsSupporting(goal, objects)
      if (supporters.length === 0) return `"${goal.title}" has no supporting objects linked yet.`
      return `"${goal.title}" is supported by:\n${supporters.map(o =>
        `• ${OBJECT_TYPE_LABEL[o.type]}: ${o.title}`,
      ).join('\n')}`
    },
  },
  {
    keywords: ['founderos', 'related to founder', 'about founder'],
    handler: ({ objects, memories }) => {
      const founder = findObjectByTitle(objects, 'founderos')
      const founderMemories = memories.filter(m =>
        m.relatedObjectIds.some(id => founder?.id === id)
        || m.title.toLowerCase().includes('founderos'),
      ).slice(0, 3)

      const lines: string[] = []
      if (founder) {
        const related = getRelatedObjects(founder, objects)
        lines.push(generateObjectSummary(founder, related, objects))
        if (related.length > 0) lines.push(`Related objects: ${related.map(o => o.title).join(', ')}.`)
      }
      if (founderMemories.length > 0) {
        lines.push('Recent FounderOS memories:')
        founderMemories.forEach(m => lines.push(`• ${m.title}`))
      }
      if (lines.length === 0) return 'FounderOS project not found in Object Engine.'
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['block', 'stuck', 'overdue', 'behind'],
    handler: ({ commandCenter: s, executive }) => {
      if (executive?.warnings?.length) {
        const lines = [
          '**Executive Engine blockers & warnings:**',
          ...executive.warnings.map(w => `• ${w}`),
        ]
        if (executive.topFocus.title) {
          lines.push(`\nSuggested focus instead: ${executive.topFocus.title}`)
        }
        return lines.join('\n')
      }

      const today = todayISO()
      const overdue = s.tasks.filter(t => t.status !== 'done' && isOverdue(t.dueDate, today))
      const paused = s.projects.filter(p => p.status === 'paused')
      const parts: string[] = []

      if (overdue.length === 0 && paused.length === 0) {
        return 'Nothing obvious is blocking you right now. Pick your highest-priority open task and execute for 25 minutes.'
      }

      if (overdue.length > 0) {
        parts.push(`Overdue tasks (${overdue.length}): ${overdue.map(t => `"${t.title}"`).join(', ')}.`)
      }
      if (paused.length > 0) {
        parts.push(`Paused projects: ${paused.map(p => p.name).join(', ')}.`)
      }
      const inbox = s.captureItems.filter(c => c.status === 'inbox')
      if (inbox.length > 5) {
        parts.push(`${inbox.length} inbox captures may be adding mental clutter — process or archive a few.`)
      }
      parts.push('Clear one blocker before adding new commitments.')
      return parts.join(' ')
    },
  },
  {
    keywords: ['health', 'sleep', 'workout', 'protein', 'water', 'weight'],
    handler: ({ commandCenter: s, memories }) => {
      const today = todayISO()
      const log = s.dailyLogs.find(l => l.date === today)
      const healthMem = memories.find(m => m.type === 'health_log' && m.occurredAt.slice(0, 10) === today)

      if (!log && !healthMem) {
        return 'No health data logged today. Open the Health Snapshot card and record sleep, nutrition and movement.'
      }

      const parts: string[] = ['Today\'s health snapshot:']
      if (log?.sleepHours != null) parts.push(`Sleep: ${log.sleepHours}h`)
      if (log?.proteinGrams != null) parts.push(`Protein: ${log.proteinGrams}g`)
      if (log?.waterLitres != null) parts.push(`Water: ${log.waterLitres}L`)
      if (log?.weight != null) parts.push(`Weight: ${log.weight}kg`)
      if (log) parts.push(log.workoutCompleted ? 'Workout: completed ✓' : 'Workout: not yet completed')
      if (log?.mood) parts.push(`Mood: ${log.mood}`)
      if (healthMem) parts.push(`Memory: ${healthMem.content}`)

      if (log && !log.workoutCompleted) {
        parts.push('Consider completing your workout to stay on track with Model Protocol.')
      }
      return parts.join('\n')
    },
  },
  {
    keywords: ['what have i learned', 'have i learned', 'what did i learn'],
    handler: ({ knowledge }) => {
      if (knowledge.length === 0) return 'No knowledge recorded yet. Open Knowledge Engine to add principles.'
      const lessons = knowledge.filter(k => k.type === 'lesson' || k.type === 'insight')
      const items = lessons.length > 0 ? lessons : knowledge
      return items.slice(0, 6).map(k => `• ${k.title}: ${k.principle}`).join('\n')
    },
  },
  {
    keywords: ['principles guide founder', 'principles guide founderos', 'founderos principles', 'guide founderos', 'principles guide'],
    handler: ({ knowledge }) => {
      const founder = knowledge.filter(k => k.domain === 'founder' || k.domain === 'systems')
      if (founder.length === 0) return summarizeTopPrinciples(knowledge)
      return founder.map(k => `• **${k.title}** — ${k.principle}`).join('\n')
    },
  },
  {
    keywords: ['knowledge about gym', 'about gym', 'gym knowledge', 'gym principles'],
    handler: ({ knowledge }) => summarizeKnowledgeByDomain(knowledge, 'gym'),
  },
  {
    keywords: ['difference between memory and knowledge', 'memory and knowledge', 'memory vs knowledge', 'memory versus knowledge'],
    handler: () => explainMemoryVsKnowledge(),
  },
  {
    keywords: ['rule should guide', 'rule guide today', 'what rule', 'principle today', 'guide today'],
    handler: ({ knowledge, executive }) => {
      const daily = knowledge.find(k => k.id === SEED_KNOWLEDGE_IDS.dailyFocus)
      const health = knowledge.find(k => k.id === SEED_KNOWLEDGE_IDS.healthProtects)
      const lines: string[] = []
      if (daily) lines.push(`**${daily.title}:** ${daily.principle}`)
      if (executive?.topFocus?.title) {
        lines.push(`Executive focus: ${executive.topFocus.title}`)
      }
      if (health && executive?.warnings?.some(w => w.toLowerCase().includes('health'))) {
        lines.push(`**${health.title}:** ${health.principle}`)
      }
      if (lines.length === 0) return summarizeTopPrinciples(knowledge, 3)
      return lines.join('\n\n')
    },
  },
  {
    keywords: ['knowledge', 'principle', 'principles', 'playbook', 'lesson learned'],
    handler: ({ knowledge }) => {
      if (knowledge.length === 0) return 'No knowledge in Knowledge Engine yet.'
      return summarizeTopPrinciples(knowledge, 5)
    },
  },
]

export function generateAssistantResponse(
  commandCenter: CommandCenterState,
  prompt: string,
  objects: FounderObject[] = [],
  memories: MemoryRecord[] = [],
  executive?: ExecutiveAssistantSnapshot | null,
  knowledge: KnowledgeRecord[] = [],
  morning?: MorningAssistantSnapshot | null,
  evening?: EveningAssistantSnapshot | null,
  capture?: CaptureAssistantSnapshot | null,
  signals?: SignalAssistantSnapshot | null,
  sync?: SyncAssistantSnapshot | null,
): string {
  const normalized = prompt.trim().toLowerCase()
  if (!normalized) {
    return 'Ask me about your focus, plan, captures, signals, sources, evening review, projects, objects, memories, knowledge, or health today.'
  }

  const ctx: AssistantContext = {
    commandCenter, objects, memories, knowledge, executive, morning, evening, capture, signals, sync,
  }

  for (const { keywords, handler } of PROMPT_MATCHERS) {
    if (keywords.some(k => normalized.includes(k))) {
      return handler(ctx)
    }
  }

  return [
    'I can help with:',
    '• "What should I focus on today?"',
    '• "Review my day."',
    '• "What did I learn today?"',
    '• "Close the loop."',
    '• "What do you remember?"',
    '• "What decisions have I made?"',
    '• "What happened today?"',
    '• "What signals came in?"',
    '• "Did I code today?"',
    '• "What health signals matter?"',
    '• "Why did we choose object-first?"',
    '• "What is related to FounderOS?"',
    '• "What is blocking me?"',
    '• "What principles guide FounderOS?"',
    '• "What is the difference between memory and knowledge?"',
    '',
    generateRecentMemoryDigest(memories, 3),
    '',
    generateDailyBriefing(commandCenter),
  ].join('\n')
}

/** Replace with OpenAI / Edge Function in a future sprint. */
export async function fetchAssistantResponse(
  commandCenter: CommandCenterState,
  prompt: string,
  objects: FounderObject[] = [],
  memories: MemoryRecord[] = [],
  executive?: ExecutiveAssistantSnapshot | null,
  knowledge: KnowledgeRecord[] = [],
  morning?: MorningAssistantSnapshot | null,
  evening?: EveningAssistantSnapshot | null,
  capture?: CaptureAssistantSnapshot | null,
  signals?: SignalAssistantSnapshot | null,
  sync?: SyncAssistantSnapshot | null,
): Promise<string> {
  return generateAssistantResponse(
    commandCenter, prompt, objects, memories, executive, knowledge, morning, evening, capture, signals, sync,
  )
}

export const SUGGESTED_PROMPTS = [
  'What should I focus on today?',
  'What do you remember?',
  'What decisions have I made?',
  'What happened recently?',
  'Why did we choose object-first?',
] as const
