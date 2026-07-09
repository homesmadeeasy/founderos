'use client'

import { useState, useMemo } from 'react'
import {
  Brain, BookOpen, Radio, Target, Layers, Lightbulb, Box, ChevronDown, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ConversationEvidence } from '@/lib/conversation/conversationTypes'

interface EvidenceChipsProps {
  evidence: ConversationEvidence[]
  compact?: boolean
  max?: number
  grouped?: boolean
}

const SOURCE_META: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  object: { label: 'Object', icon: Box, className: 'conv-evidence-object' },
  memory: { label: 'Memory', icon: Brain, className: 'conv-evidence-memory' },
  knowledge: { label: 'Knowledge', icon: BookOpen, className: 'conv-evidence-knowledge' },
  signal: { label: 'Signal', icon: Radio, className: 'conv-evidence-signal' },
  outcome: { label: 'Outcome', icon: Target, className: 'conv-evidence-outcome' },
  domain: { label: 'Domain', icon: Layers, className: 'conv-evidence-domain' },
  decision: { label: 'Decision', icon: Lightbulb, className: 'conv-evidence-decision' },
  founder: { label: 'Founder', icon: Sparkles, className: 'conv-evidence-founder' },
}

function dedupeEvidence(items: ConversationEvidence[]): ConversationEvidence[] {
  const seen = new Set<string>()
  return items.filter(e => {
    const key = `${e.sourceType}:${e.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function EvidenceChips({
  evidence,
  compact = false,
  max = 6,
  grouped = false,
}: EvidenceChipsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const items = useMemo(() => dedupeEvidence(evidence).slice(0, max), [evidence, max])

  if (items.length === 0) return null

  if (grouped) {
    const groups = new Map<string, ConversationEvidence[]>()
    for (const e of items) {
      const list = groups.get(e.sourceType) ?? []
      list.push(e)
      groups.set(e.sourceType, list)
    }
    return (
      <div className={`conv-evidence-grouped ${compact ? 'mt-2' : 'mt-3'}`}>
        {[...groups.entries()].map(([source, group]) => {
          const meta = SOURCE_META[source] ?? SOURCE_META.founder
          const Icon = meta.icon
          return (
            <div key={source} className="conv-evidence-group">
              <p className="conv-evidence-group-label">
                <Icon size={11} />
                {meta.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.map(e => (
                  <EvidenceChipButton
                    key={e.id}
                    evidence={e}
                    meta={meta}
                    expanded={expandedId === e.id}
                    onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-2.5' : 'mt-3'}`}>
      {items.map(e => {
        const meta = SOURCE_META[e.sourceType] ?? SOURCE_META.founder
        return (
          <EvidenceChipButton
            key={e.id}
            evidence={e}
            meta={meta}
            expanded={expandedId === e.id}
            onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)}
          />
        )
      })}
    </div>
  )
}

function EvidenceChipButton({
  evidence: e,
  meta,
  expanded,
  onToggle,
}: {
  evidence: ConversationEvidence
  meta: { label: string; icon: LucideIcon; className: string }
  expanded: boolean
  onToggle: () => void
}) {
  const Icon = meta.icon
  return (
    <div className="conv-evidence-chip-wrap">
      <button
        type="button"
        onClick={onToggle}
        className={`conv-evidence-chip ${meta.className} ${expanded ? 'conv-evidence-chip-active' : ''}`}
        aria-expanded={expanded}
      >
        <Icon size={11} aria-hidden />
        <span>{e.title}</span>
        <ChevronDown size={10} className={`conv-evidence-chevron ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <p className="conv-evidence-detail">{e.summary}</p>
      )}
    </div>
  )
}
