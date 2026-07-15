'use client'

import { useEffect, useRef } from 'react'
import { useGymSnapshot } from '@/components/gym/useGymSnapshot'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import GymHero from '@/components/gym/GymHero'
import GymSnapshotPanel from '@/components/gym/GymSnapshot'
import TodaysWorkoutCard from '@/components/gym/TodaysWorkoutCard'
import RecoveryCard from '@/components/gym/RecoveryCard'
import MuscleVolumeCard from '@/components/gym/MuscleVolumeCard'
import ProgressionCard from '@/components/gym/ProgressionCard'
import WeaknessCard from '@/components/gym/WeaknessCard'
import ExerciseRecommendationsCard from '@/components/gym/ExerciseRecommendationsCard'
import WorkoutHistoryCard from '@/components/gym/WorkoutHistoryCard'
import GymGoalsCard from '@/components/gym/GymGoalsCard'
import ExerciseLibraryCard from '@/components/gym/ExerciseLibraryCard'
import GymConversationCard from '@/components/gym/GymConversationCard'

export default function GymPage() {
  const snapshot = useGymSnapshot()
  const { publish } = useFounderKernel()
  const publishedRef = useRef(false)

  useEffect(() => {
    if (publishedRef.current) return
    publishedRef.current = true
    void publish({
      type: 'RoutineGenerated',
      source: 'gym-ai',
      payload: {
        title: snapshot.todaysWorkout.title,
        exerciseCount: snapshot.todaysWorkout.exercises.length,
      },
    })
    void publish({
      type: 'RecoveryUpdated',
      source: 'gym-ai',
      payload: { status: snapshot.recoveryStatus, score: snapshot.recoveryScore },
    })
  }, [snapshot.todaysWorkout.title, snapshot.todaysWorkout.exercises.length, snapshot.recoveryStatus, snapshot.recoveryScore, publish])

  return (
    <div className="home-page min-h-screen">
      <div className="home-canvas max-w-[1120px] mx-auto px-4 sm:px-5 py-5 sm:py-6 pb-20">
        <GymHero snapshot={snapshot} />

        <div className="mt-6">
          <GymSnapshotPanel snapshot={snapshot} />
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
          <div className="space-y-5">
            <TodaysWorkoutCard snapshot={snapshot} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <RecoveryCard snapshot={snapshot} />
              <MuscleVolumeCard snapshot={snapshot} />
              <ProgressionCard snapshot={snapshot} />
              <WeaknessCard snapshot={snapshot} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ExerciseRecommendationsCard snapshot={snapshot} />
              <WorkoutHistoryCard snapshot={snapshot} />
              <GymGoalsCard snapshot={snapshot} />
              <ExerciseLibraryCard />
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
