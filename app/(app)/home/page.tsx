'use client'

import { CommandCenterProvider } from '@/contexts/CommandCenterContext'
import HomeHero from '@/components/home/HomeHero'
import MissionCard from '@/components/home/MissionCard'
import FounderConversationPrompt from '@/components/home/FounderConversationPrompt'
import TimelineCard from '@/components/home/TimelineCard'
import FocusCard from '@/components/home/FocusCard'
import DomainSnapshot from '@/components/home/DomainSnapshot'
import ConnectedReality from '@/components/home/ConnectedReality'
import RecentLearning from '@/components/home/RecentLearning'
import TodayDecision from '@/components/home/TodayDecision'
import QuickActionsDock from '@/components/home/QuickActionsDock'
import FounderInsightCard from '@/components/home/FounderInsightCard'
import CognitiveInsightCard from '@/components/home/CognitiveInsightCard'
import FounderStatus from '@/components/home/FounderStatus'

function HomeContent() {
  return (
    <div className="home-page">
      <div className="home-canvas max-w-[860px] mx-auto px-4 sm:px-5 py-4 sm:py-5 pb-16">
        <HomeHero />

        {/* Mission + Briefing */}
        <div className="home-grid home-grid-2 mt-4">
          <MissionCard />
          <FounderConversationPrompt />
        </div>

        <div className="mt-3.5">
          <CognitiveInsightCard />
        </div>

        {/* Today + Focus with dock floating between rows */}
        <div className="relative mt-3.5">
          <div className="home-grid home-grid-2">
            <TimelineCard />
            <FocusCard />
          </div>
          <QuickActionsDock />
        </div>

        {/* Domains + Connected Reality */}
        <div className="home-grid home-grid-2 mt-5">
          <DomainSnapshot />
          <ConnectedReality />
        </div>

        <div className="mt-3.5">
          <FounderInsightCard />
        </div>

        <div className="mt-4 space-y-3.5">
          <RecentLearning />
          <TodayDecision />
          <FounderStatus />
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <CommandCenterProvider>
      <HomeContent />
    </CommandCenterProvider>
  )
}
