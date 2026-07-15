'use client'

import { useMemo } from 'react'
import { useCognitiveModel } from '@/contexts/CognitiveModelContext'
import { useGymBaseInput } from './useGymBaseInput'
import { mergeGymInputWithWorldModel } from '@/lib/specialists/gym/gymInputBuilder'
import type { GymInput } from '@/lib/specialists/gym/gymTypes'

export function useGymInput(): GymInput {
  const base = useGymBaseInput()
  const { worldModel, hydrated } = useCognitiveModel()
  return useMemo(
    () => mergeGymInputWithWorldModel(base, worldModel, hydrated),
    [base, worldModel, hydrated],
  )
}
