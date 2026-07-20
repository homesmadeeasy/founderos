'use client'

import { useMemo } from 'react'
import { useGymInput } from './useGymInput'
import { useGymData } from '@/contexts/GymDataContext'
import { buildGymSnapshot } from '@/lib/specialists/gym/gymSnapshot'
import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'

export function useGymSnapshot(): GymSnapshot {
  const input = useGymInput()
  const { sessions, profile, ready } = useGymData()
  return useMemo(() => buildGymSnapshot({
    ...input,
    structuredSessions: ready ? sessions : [],
    storedProfile: ready ? profile : null,
  }), [input, sessions, profile, ready])
}
