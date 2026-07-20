'use client'

import Link from 'next/link'
import { useGymSnapshot } from '@/components/gym/useGymSnapshot'
import { useGymData } from '@/contexts/GymDataContext'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import { useEffect, useRef } from 'react'
import GymHero from '@/components/gym/GymHero'
import GymOnboarding from '@/components/gym/GymOnboarding'
import GymSetupChecklist from '@/components/gym/GymSetupChecklist'
import TodaysWorkoutCard from '@/components/gym/TodaysWorkoutCard'
import RecoveryCard from '@/components/gym/RecoveryCard'
import MuscleVolumeCard from '@/components/gym/MuscleVolumeCard'
import ProgressionCard from '@/components/gym/ProgressionCard'
import GymConversationCard from '@/components/gym/GymConversationCard'

export default function GymPage() {
  const snapshot = useGymSnapshot()
  const { ready, onboardingComplete } = useGymData()
  const { publish } = useFounderKernel()
  const publishedRef = useRef(false)

  useEffect(() => {
    if (publishedRef.current || !ready) return
    publishedRef.current = true
    void publish({
      type: 'RoutineGenerated',
      source: 'gym-ai',
      payload: {
        title: snapshot.todaysWorkout.title,
        exerciseCount: snapshot.todaysWorkout.exercises.length,
      },
    })
  }, [ready, snapshot.todaysWorkout.title, snapshot.todaysWorkout.exercises.length, publish])

  const handleExplain = (exerciseId: string) => {
    const ex = snapshot.todaysWorkout.exercises.find(e => e.exerciseId === exerciseId)
    if (!ex) return
    void publish({
      type: 'GymPrescriptionExplained',
      source: 'gym-ai',
      payload: {
        exerciseId,
        exerciseName: ex.exerciseName,
        mode: ex.prescription.prescriptionMode,
        confidence: ex.prescription.prescriptionConfidence,
        claimIds: ex.prescription.researchClaimIds,
      },
    })
  }

  if (!ready) {
    return (
      <div className="home-page min-h-screen flex items-center justify-center">
        <p className="text-sm text-zinc-500">Loading gym data…</p>
      </div>
    )
  }

  if (!onboardingComplete) {
    return (
      <div className="home-page min-h-screen">
        <div className="home-canvas max-w-[1120px] mx-auto px-4 py-6">
          <GymOnboarding />
        </div>
      </div>
    )
  }

  return (
    <div className="home-page min-h-screen">
      <div className="home-canvas max-w-[1120px] mx-auto px-4 sm:px-5 py-5 sm:py-6 pb-20">
        <GymHero snapshot={snapshot} />

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
          <div className="space-y-5">
            <TodaysWorkoutCard snapshot={snapshot} onExplainPrescription={handleExplain} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RecoveryCard snapshot={snapshot} />
              <MuscleVolumeCard snapshot={snapshot} />
              <ProgressionCard snapshot={snapshot} />
              <GymSetupChecklist />
            </div>
            <div className="flex gap-3 text-xs">
              <Link href="/gym/history" className="text-emerald-700 hover:underline">History →</Link>
              <Link href="/gym/research" className="text-emerald-700 hover:underline">Research library →</Link>
            </div>
          </div>
          <div className="lg:sticky lg:top-6">
            <GymConversationCard snapshot={snapshot} />
          </div>
        </div>
      </div>
    </div>
  )
}
