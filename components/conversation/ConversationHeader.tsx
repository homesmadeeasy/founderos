'use client'

import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'

interface ConversationHeaderProps {
  snapshot: FounderSnapshot
}

export default function ConversationHeader({ snapshot }: ConversationHeaderProps) {
  return (
    <header className="conv-header">
      <p className="conv-header-eyebrow">Founder AI</p>
      <h1 className="conv-header-title">Strategic conversation</h1>
      <p className="conv-header-insight">{snapshot.mainInsight}</p>
      <div className="conv-header-pills">
        <span className="conv-pill">
          Stage <strong>{snapshot.currentStage}</strong>
        </span>
        <span className="conv-pill">
          Momentum <strong className="text-violet-700">{snapshot.momentumScore}</strong>
        </span>
        <span className="conv-pill">
          Bottleneck <strong className="text-amber-800">{snapshot.mainBottleneck}</strong>
        </span>
      </div>
    </header>
  )
}
