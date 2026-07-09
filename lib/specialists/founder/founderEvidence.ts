import type { FounderEvidence } from './founderTypes'
import type { FilteredFounderData } from './founderSignals'
import type { FounderInput } from './founderTypes'
import { textMatchesArchitecture, textMatchesValidation } from './founderSignals'

export function buildFounderEvidence(
  data: FilteredFounderData,
  input: FounderInput,
): FounderEvidence[] {
  const evidence: FounderEvidence[] = []

  const founderEval = input.domainIntelligence?.evaluations.find(e => e.domainId === 'founder')
  if (founderEval) {
    evidence.push({
      id: `domain-${founderEval.id}`,
      sourceType: 'domain',
      title: `Founder domain score: ${founderEval.score}`,
      summary: founderEval.recommendation,
      weight: 0.9,
      supports: founderEval.score >= 55,
    })
  }

  for (const m of data.technicalMemories.slice(0, 3)) {
    evidence.push({
      id: `mem-${m.id}`,
      sourceType: 'memory',
      title: m.title,
      summary: (m.summary ?? m.content).slice(0, 120),
      weight: textMatchesArchitecture(m.content) ? 0.75 : 0.6,
      supports: !textMatchesArchitecture(m.content) || data.validationMemories.length > 0,
    })
  }

  for (const m of data.validationMemories.slice(0, 2)) {
    evidence.push({
      id: `val-${m.id}`,
      sourceType: 'memory',
      title: m.title,
      summary: (m.summary ?? m.content).slice(0, 120),
      weight: 0.85,
      supports: true,
    })
  }

  for (const s of data.codingSignals.slice(0, 2)) {
    evidence.push({
      id: `sig-${s.id}`,
      sourceType: 'signal',
      title: s.title || 'Coding session',
      summary: s.content.slice(0, 100),
      weight: 0.7,
      supports: true,
    })
  }

  if (input.decisionOutput) {
    const d = input.decisionOutput.primaryDecision
    const isFounder = d.area === 'systems' || d.title.toLowerCase().includes('founder')
    if (isFounder) {
      evidence.push({
        id: `dec-${input.decisionOutput.id}`,
        sourceType: 'decision',
        title: d.action,
        summary: d.reason.slice(0, 120),
        weight: 0.8,
        supports: true,
      })
    }
  }

  for (const o of input.outcomes.filter(x => x.record).slice(0, 2)) {
    evidence.push({
      id: `out-${o.prediction.id}`,
      sourceType: 'outcome',
      title: o.prediction.decisionTitle,
      summary: `${o.record!.completed} · ${o.record!.outcomeQuality}`,
      weight: 0.65,
      supports: o.record!.outcomeQuality === 'good' || o.record!.outcomeQuality === 'excellent',
    })
  }

  if (data.activeTasks.length > 0) {
    evidence.push({
      id: 'tasks-open',
      sourceType: 'task',
      title: `${data.activeTasks.length} active founder tasks`,
      summary: data.activeTasks.slice(0, 2).map(t => t.title).join(' · '),
      weight: 0.55,
      supports: data.activeTasks.length <= 5,
    })
  }

  for (const k of data.knowledge.slice(0, 2)) {
    evidence.push({
      id: `know-${k.id}`,
      sourceType: 'knowledge',
      title: k.title,
      summary: k.principle.slice(0, 100),
      weight: 0.5,
      supports: !textMatchesArchitecture(k.principle),
    })
  }

  return evidence
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
}
