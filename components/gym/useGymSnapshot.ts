'use client'

import { useMemo } from 'react'
import { useGymInput } from './useGymInput'
import { buildGymSnapshot } from '@/lib/specialists/gym/gymSnapshot'
import type { GymSnapshot } from '@/lib/specialists/gym/gymTypes'

export function useGymSnapshot(): GymSnapshot {
  const input = useGymInput()
  return useMemo(() => buildGymSnapshot(input), [input])
}
