import type { Signal, SignalSource, SignalType } from './signalTypes'
import { getSignals, getRecentSignals, searchSignals as storageSearch } from './signalStorage'
import { todayISO, tomorrowISO } from './signalUtils'
import { SIGNAL_SOURCE_LABEL, SIGNAL_TYPE_LABEL } from './signalTypes'

export interface SignalSummary {
  total: number
  today: number
  bySource: Partial<Record<SignalSource, number>>
  byType: Partial<Record<SignalType, number>>
  highlights: string[]
}

export function searchSignals(
  query: string,
  filters?: { source?: SignalSource | null; type?: SignalType | null },
  limit = 40,
): Signal[] {
  let results = query.trim() ? storageSearch(query, limit) : getRecentSignals(limit)

  if (filters?.source) {
    results = results.filter(s => s.source === filters.source)
  }
  if (filters?.type) {
    results = results.filter(s => s.type === filters.type)
  }

  return results.slice(0, limit)
}

export function buildSignalSummary(signals: Signal[] = getSignals()): SignalSummary {
  const today = todayISO()
  const todaySignals = signals.filter(s => s.timestamp.slice(0, 10) === today)

  const bySource: SignalSummary['bySource'] = {}
  const byType: SignalSummary['byType'] = {}

  for (const s of signals) {
    bySource[s.source] = (bySource[s.source] ?? 0) + 1
    byType[s.type] = (byType[s.type] ?? 0) + 1
  }

  const highlights: string[] = []
  const sleep = todaySignals.find(s => s.content.toLowerCase().includes('sleep'))
  if (sleep) highlights.push(`Sleep: ${sleep.content}`)
  const calendar = signals.find(s => s.source === 'calendar')
  if (calendar) highlights.push(`Calendar: ${calendar.title}`)
  const coding = todaySignals.find(s => s.type === 'coding_session')
  if (coding) highlights.push(`Coding: ${coding.title}`)
  const workoutGap = todaySignals.find(s => s.content.toLowerCase().includes('workout not logged'))
  if (workoutGap) highlights.push('Workout not logged today')

  return {
    total: signals.length,
    today: todaySignals.length,
    bySource,
    byType,
    highlights,
  }
}

export function buildMorningSignalNotes(signals: Signal[]): string[] {
  const notes: string[] = []
  const today = todayISO()
  const tomorrow = tomorrowISO()
  const todaySignals = signals.filter(s => s.timestamp.slice(0, 10) === today)
  const recent = signals.filter(s => {
    const age = Date.now() - new Date(s.timestamp).getTime()
    return age < 48 * 60 * 60 * 1000
  })

  const calendarSignals = signals.filter(s => s.source === 'calendar' || s.type === 'event' || s.type === 'reminder')
  const calendarToday = calendarSignals.filter(s => s.timestamp.slice(0, 10) === today)
  const calendarTomorrow = calendarSignals.filter(s => s.timestamp.slice(0, 10) === tomorrow)

  const sleep = recent.find(s =>
    s.type === 'health' && (s.content.toLowerCase().includes('sleep') || s.metadata?.sleepHours),
  )
  if (sleep) {
    const hrs = Number(sleep.metadata?.sleepHours ?? sleep.content.match(/([\d.]+)\s*hours?/)?.[1])
    if (hrs && hrs < 7) {
      notes.push(`Low sleep (${hrs}h) — reduce morning intensity.`)
    } else if (hrs) {
      notes.push(`Sleep signal: ${hrs}h logged.`)
    } else {
      notes.push(`Sleep signal: ${sleep.title}.`)
    }
    if (sleep.metadata?.lowRecovery) {
      notes.push('Recovery signal low — protect energy for priority work only.')
    }
  }

  if (calendarToday.length > 0) {
    calendarToday.forEach(ev => {
      notes.push(`Calendar today: ${ev.title} — ${ev.content}`)
    })
  }

  if (calendarTomorrow.length > 0) {
    calendarTomorrow.forEach(ev => {
      notes.push(`Upcoming tomorrow: ${ev.title} — plan around this block.`)
    })
  }

  const studyBlock = calendarSignals.find(s => {
    const text = `${s.title} ${s.content}`.toLowerCase()
    return text.includes('study') || text.includes('class') || text.includes('lecture')
      || s.metadata?.domain === 'school'
  })
  if (studyBlock) {
    notes.push('School/study priority: study block on calendar — protect focus time.')
  }

  const gymSession = calendarSignals.find(s => {
    const text = `${s.title} ${s.content}`.toLowerCase()
    return text.includes('gym') || text.includes('workout') || text.includes('train')
      || s.metadata?.workout === true
  })
  if (gymSession) {
    notes.push(`Workout priority: ${gymSession.title} scheduled — fit training into the day.`)
  }

  const coding = todaySignals.find(s => s.type === 'coding_session')
    ?? recent.find(s => s.type === 'coding_session')
  if (coding) {
    const synced = coding.metadata?.synced ? ' (synced)' : ''
    notes.push(`Coding signal${synced}: ${coding.content}`)
  }

  const yesterdayCoding = signals.find(s => {
    if (s.type !== 'coding_session') return false
    const age = Date.now() - new Date(s.timestamp).getTime()
    return age > 12 * 60 * 60 * 1000 && age < 36 * 60 * 60 * 1000
  })
  if (yesterdayCoding && !coding) {
    notes.push(`FounderOS momentum: coding session yesterday — ${yesterdayCoding.title}.`)
  }

  const workoutGap = todaySignals.find(s =>
    s.content.toLowerCase().includes('workout not logged')
    || s.content.toLowerCase().includes('workout not completed')
    || s.metadata?.workoutLogged === false,
  )
  if (workoutGap) notes.push('Health priority: workout not logged today.')

  const email = recent.find(s => s.source === 'email')
  if (email) notes.push(`Reminder: ${email.title}`)

  return notes
}

export function formatSignalLine(signal: Signal): string {
  return `[${SIGNAL_SOURCE_LABEL[signal.source]} · ${SIGNAL_TYPE_LABEL[signal.type]}] ${signal.title}`
}
