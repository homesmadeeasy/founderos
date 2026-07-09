'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useAppContext } from '@/contexts/AppContext'
import type { ConversationSession } from '@/lib/conversation/conversationTypes'
import { VALIDATION_SPRINT_PROJECT_TITLE } from '@/lib/conversation/conversationActions'
import EvidenceChips from './EvidenceChips'
import Card from '@/components/home/Card'

interface ConversationSidebarProps {
  session: ConversationSession | null
}

export default function ConversationSidebar({ session }: ConversationSidebarProps) {
  const { getRecentMemories } = useMemoryEngine()
  const { appState } = useAppContext()
  const [evidenceOpen, setEvidenceOpen] = useState(true)
  const recentMemories = getRecentMemories(4)

  const sprintProject = appState.projects.find(
    p => p.title.toLowerCase() === VALIDATION_SPRINT_PROJECT_TITLE.toLowerCase(),
  )

  if (!session) {
    return (
      <Card className="conv-sidebar p-5 h-full">
        <p className="conv-sidebar-label">Intelligence</p>
        <p className="text-sm text-zinc-500 leading-relaxed mt-2">
          Start a conversation and recommendations, evidence, and memories will appear here.
        </p>
      </Card>
    )
  }

  const domains = [
    ...new Set([
      ...(session.nextQuestion?.relatedDomains ?? []),
      ...session.activeQuestions.flatMap(q => q.relatedDomains),
    ]),
  ].slice(0, 5)

  return (
    <Card className="conv-sidebar p-5 h-full space-y-5">
      {session.recommendation && (
        <section>
          <p className="conv-sidebar-label">Current recommendation</p>
          <p className="text-sm text-zinc-700 leading-relaxed mt-1.5">
            {session.recommendation.action}
          </p>
        </section>
      )}

      <section>
        <p className="conv-sidebar-label">Confidence</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-violet-100/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 transition-all duration-500"
              style={{ width: `${session.confidence}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-violet-700">{session.confidence}%</span>
        </div>
      </section>

      {domains.length > 0 && (
        <section>
          <p className="conv-sidebar-label">Domains</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {domains.map(d => (
              <span key={d} className="conv-domain-chip capitalize">{d}</span>
            ))}
          </div>
        </section>
      )}

      <section>
        <button
          type="button"
          onClick={() => setEvidenceOpen(v => !v)}
          className="conv-sidebar-toggle"
          aria-expanded={evidenceOpen}
        >
          <span className="conv-sidebar-label mb-0">Evidence</span>
          <ChevronDown size={14} className={`transition-transform ${evidenceOpen ? 'rotate-180' : ''}`} />
        </button>
        {evidenceOpen && session.evidence.length > 0 && (
          <EvidenceChips evidence={session.evidence} max={12} grouped />
        )}
      </section>

      {recentMemories.length > 0 && (
        <section>
          <p className="conv-sidebar-label">Recent memories</p>
          <ul className="mt-1.5 space-y-2">
            {recentMemories.map(m => (
              <li key={m.id} className="text-xs text-zinc-600 leading-snug line-clamp-2">
                {m.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sprintProject && (
        <section>
          <p className="conv-sidebar-label">Active sprint</p>
          <p className="text-sm font-medium text-zinc-800 mt-1">{sprintProject.title}</p>
          <p className="text-xs text-zinc-500 mt-0.5 capitalize">{sprintProject.status}</p>
        </section>
      )}
    </Card>
  )
}
