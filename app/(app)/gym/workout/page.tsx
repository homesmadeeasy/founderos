'use client'

import ActiveWorkoutLogger from '@/components/gym/ActiveWorkoutLogger'

export default function WorkoutPage() {
  return (
    <div className="home-page min-h-screen">
      <div className="home-canvas max-w-[640px] mx-auto px-4 py-5">
        <ActiveWorkoutLogger />
      </div>
    </div>
  )
}
