import type { CandidateAction, DecisionInput, DecisionTradeoff } from './decisionTypes'

function hasLowSleep(input: DecisionInput): boolean {
  const sleep = input.executiveState?.healthSignals?.sleepHours
  return sleep != null && sleep < 6.5
}

function hasStudyPressure(input: DecisionInput): boolean {
  const signals = input.signals ?? []
  return signals.some(s => {
    const text = `${s.title} ${s.content}`.toLowerCase()
    return text.includes('study') || text.includes('exam') || text.includes('assignment')
      || text.includes('economics')
  })
}

export function detectConflicts(
  ranked: CandidateAction[],
  input: DecisionInput,
): { risks: string[]; tradeoffs: DecisionTradeoff[] } {
  const warnings = input.executiveState?.warnings ?? []
  const tradeoffStrings = input.executiveState?.tradeoffs ?? []
  const signals = input.signals ?? []
  const risks: string[] = [...warnings]
  const tradeoffs: DecisionTradeoff[] = []

  const study = ranked.find(c => c.tags.includes('study') || c.tags.includes('exam'))
  const founder = ranked.find(c => c.tags.includes('founderos'))
  const workout = ranked.find(c => c.tags.includes('workout'))
  const recovery = ranked.find(c => c.tags.includes('recovery'))
  const inbox = ranked.find(c => c.area === 'inbox')
  const deepWork = ranked.find(c => c.tags.includes('deep-work') || c.tags.includes('founderos'))

  if (study && founder) {
    tradeoffs.push({
      optionA: study.title,
      optionB: founder.title,
      recommendation: hasStudyPressure(input) ? study.title : founder.title,
      reason: hasStudyPressure(input)
        ? 'Exam or study deadline pressure outweighs FounderOS momentum today.'
        : 'No urgent school pressure — FounderOS deep work can lead.',
    })
    risks.push('Study and FounderOS both want focus blocks — pick one primary window.')
  }

  if (workout && recovery && hasLowSleep(input)) {
    tradeoffs.push({
      optionA: workout.title,
      optionB: recovery.title,
      recommendation: recovery.title,
      reason: 'Low sleep raises injury and burnout risk — protect recovery first.',
    })
    risks.push('Workout planned but recovery signals are weak.')
  }

  const highCount = ranked.filter(c => c.urgency === 'critical' || c.urgency === 'high').length
  if (highCount >= 4) {
    risks.push(`${highCount} high-urgency items — overload risk if you try to do everything.`)
  }

  if (hasLowSleep(input) && deepWork) {
    risks.push('Low sleep — avoid stacking heavy cognitive work without a recovery block.')
  }

  if (signals.some(s => s.source === 'calendar') && deepWork) {
    const cal = signals.find(s => s.source === 'calendar')
    if (cal) {
      tradeoffs.push({
        optionA: `Calendar: ${cal.title}`,
        optionB: deepWork.title,
        recommendation: cal.title,
        reason: 'Scheduled block should anchor the day; deep work fits around it.',
      })
    }
  }

  if (inbox && founder && (input.unresolvedCaptureCount ?? 0) >= 5) {
    tradeoffs.push({
      optionA: inbox.title,
      optionB: founder.title,
      recommendation: (input.unresolvedCaptureCount ?? 0) >= 8 ? inbox.title : founder.title,
      reason: (input.unresolvedCaptureCount ?? 0) >= 8
        ? 'Capture pile is blocking clarity — process inbox before building.'
        : 'Enough captures to triage, but implementation still matters.',
    })
  }

  for (const t of tradeoffStrings) {
    if (!risks.includes(t)) risks.push(t)
  }

  return { risks: risks.slice(0, 6), tradeoffs: tradeoffs.slice(0, 4) }
}

export function buildIgnoreList(
  ranked: CandidateAction[],
  primary: CandidateAction,
  input: DecisionInput,
): string[] {
  const ignore: string[] = []

  for (const c of ranked.slice(3, 8)) {
    ignore.push(`${c.title} — lower score today (${c.reason})`)
  }

  if (primary.tags.includes('study') || primary.tags.includes('exam')) {
    const founder = ranked.find(c => c.tags.includes('founderos'))
    if (founder) ignore.push(`Defer ${founder.title} until study block is protected.`)
    ignore.push('Ignore non-urgent FounderOS ideas and extra planning.')
  }

  if (primary.tags.includes('founderos')) {
    ignore.push('Ignore low-value captures and speculative feature ideas until deep work block ends.')
  }

  if (primary.area === 'inbox') {
    ignore.push('Ignore new feature work until inbox is below 3 unprocessed captures.')
  }

  if (hasLowSleep(input)) {
    ignore.push('Ignore gym intensity or long heavy sessions — favor recovery.')
  }

  if ((input.unresolvedCaptureCount ?? 0) < 3) {
    ignore.push('Ignore bulk inbox processing — capture volume is manageable.')
  }

  ignore.push('Ignore extra planning loops — execute the primary decision first.')
  ignore.push('Ignore low-value admin until primary work is complete.')

  return [...new Set(ignore)].slice(0, 6)
}
