'use client'

import FounderHero from '@/components/founder/FounderHero'
import FounderNarrative from '@/components/founder/FounderNarrative'
import FounderHealthCard from '@/components/founder/FounderHealthCard'
import FounderBottleneckCard from '@/components/founder/FounderBottleneckCard'
import FounderSprintCard from '@/components/founder/FounderSprintCard'
import FounderRisksCard from '@/components/founder/FounderRisksCard'
import FounderEvidenceCard from '@/components/founder/FounderEvidenceCard'
import FounderQuestionsCard from '@/components/founder/FounderQuestionsCard'
import FounderRoadmapCard from '@/components/founder/FounderRoadmapCard'
import { useFounderSnapshot } from '@/components/founder/useFounderSnapshot'

export default function FounderPage() {
  const snapshot = useFounderSnapshot()

  return (
    <div className="home-page">
      <div className="home-canvas max-w-[860px] mx-auto px-4 sm:px-5 py-4 sm:py-5 pb-16">
        <FounderHero snapshot={snapshot} />

        <div className="mt-4">
          <FounderNarrative snapshot={snapshot} />
        </div>

        <div className="mt-4">
          <FounderHealthCard snapshot={snapshot} />
        </div>

        <div className="home-grid home-grid-2 mt-4">
          <FounderBottleneckCard snapshot={snapshot} />
          <FounderSprintCard snapshot={snapshot} />
        </div>

        <div className="home-grid home-grid-2 mt-3.5">
          <FounderRisksCard snapshot={snapshot} />
          <FounderEvidenceCard snapshot={snapshot} />
        </div>

        <div className="home-grid home-grid-2 mt-3.5">
          <FounderQuestionsCard snapshot={snapshot} />
          <FounderRoadmapCard snapshot={snapshot} />
        </div>
      </div>
    </div>
  )
}
