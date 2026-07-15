'use client'

import Link from 'next/link'
import GymResearchLibrary from '@/components/gym/GymResearchLibrary'

export default function GymResearchPage() {
  return (
    <div className="home-page min-h-screen">
      <div className="home-canvas max-w-[800px] mx-auto px-4 sm:px-5 py-5 sm:py-6 pb-20">
        <Link href="/gym" className="text-xs text-emerald-700 hover:underline mb-4 inline-block">← Back to Gym</Link>
        <h1 className="text-xl font-semibold text-zinc-900 mb-1">Gym research library</h1>
        <p className="text-sm text-zinc-500 mb-6">Approved sources and atomic claims used by the prescription engine.</p>
        <GymResearchLibrary />
      </div>
    </div>
  )
}
