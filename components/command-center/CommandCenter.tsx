'use client'

import MissionHeader from './MissionHeader'
import EveningReviewCard from './EveningReviewCard'
import MorningExecutionBriefingCard from './MorningExecutionBriefingCard'
import TodayDecisionCard from './TodayDecisionCard'
import DailyBriefingCard from './DailyBriefingCard'
import TodayPrioritiesCard from './TodayPrioritiesCard'
import ActiveProjectsCard from './ActiveProjectsCard'
import HealthSnapshotCard from './HealthSnapshotCard'
import UniversalCaptureCard from './UniversalCaptureCard'
import AIAssistantPanel from './AIAssistantPanel'

export default function CommandCenter() {
  return (
    <div className="min-h-full bg-zinc-50/80">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <MissionHeader />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <MorningExecutionBriefingCard />
            <TodayDecisionCard />
            <EveningReviewCard />
            <DailyBriefingCard />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <TodayPrioritiesCard />
              <HealthSnapshotCard />
            </div>
            <ActiveProjectsCard />
            <UniversalCaptureCard />
          </div>

          <div className="lg:col-span-1">
            <AIAssistantPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
