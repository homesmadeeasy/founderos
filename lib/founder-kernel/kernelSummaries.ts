import { EVENT_TYPE_LABELS } from './kernelEvents'
import { getKernelHistory } from './kernelHistory'
import type { KernelHistoryEntry } from './kernelTypes'
import { todayISO } from './kernelUtils'

export function getTodayKernelEvents(limit = 30): KernelHistoryEntry[] {
  const today = todayISO()
  return getKernelHistory(200).filter(e => e.timestamp.slice(0, 10) === today).slice(0, limit)
}

export function formatTodayKernelEvents(): string {
  const events = getTodayKernelEvents(15)
  if (events.length === 0) {
    return 'No kernel events recorded today yet. Capture something, run Morning, or complete Evening to generate activity.'
  }
  return `**Today's kernel activity:**\n${events.map(e =>
    `• ${e.timestamp.slice(11, 16)} — ${EVENT_TYPE_LABELS[e.eventType]} (${e.source})${e.payloadSummary ? `: ${e.payloadSummary}` : ''}`,
  ).join('\n')}`
}

export function formatKernelWhatChanged(): string {
  const recent = getKernelHistory(8)
  if (recent.length === 0) return 'No recent changes tracked by the kernel.'
  return `**Recent changes:**\n${recent.map(e =>
    `• ${EVENT_TYPE_LABELS[e.eventType]} from **${e.source}** — ${e.payloadSummary ?? 'updated'}`,
  ).join('\n')}`
}

export function formatLastImportantKernelEvent(): string {
  const important = getKernelHistory(50).find(e =>
    ['DecisionGenerated', 'EveningCompleted', 'CaptureCreated', 'OutcomeRecorded', 'MorningStarted'].includes(e.eventType),
  )
  if (!important) return 'No important kernel events yet.'
  return `**Last important event:** ${EVENT_TYPE_LABELS[important.eventType]} at ${important.timestamp.slice(11, 16)} from **${important.source}** — ${important.payloadSummary ?? ''}`
}

export function formatDecisionTriggerFromKernel(decisionTitle?: string): string {
  const events = getKernelHistory(30)
  const decisionEvent = events.find(e => e.eventType === 'DecisionGenerated')
  const precursors = events.filter(e =>
    e.timestamp >= (decisionEvent?.timestamp ?? '')
    && ['CaptureCreated', 'SignalProcessed', 'OutcomeRecorded', 'MorningStarted', 'EveningCompleted'].includes(e.eventType),
  ).slice(0, 5)

  const lines = ['**Decision trigger chain (from kernel history):**']
  if (decisionEvent) {
    lines.push(`• Decision generated: ${decisionEvent.payloadSummary ?? decisionTitle ?? 'today\'s decision'}`)
  }
  if (precursors.length > 0) {
    lines.push('**Upstream events:**')
    for (const e of precursors) {
      lines.push(`• ${EVENT_TYPE_LABELS[e.eventType]} (${e.source})`)
    }
  } else {
    lines.push('Morning context and domain evaluations shaped the decision. Open **/dashboard/kernel** for full event log.')
  }
  return lines.join('\n')
}
