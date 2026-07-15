import type { WorldModel } from '@/lib/cognitive-model/beliefTypes'
import type { GymInput } from './gymTypes'

export type GymBaseInput = Omit<GymInput, 'worldModel'>

export function mergeGymInputWithWorldModel(
  base: GymBaseInput,
  worldModel: WorldModel | null | undefined,
  hydrated = true,
): GymInput {
  return {
    ...base,
    worldModel: hydrated ? (worldModel ?? null) : null,
  }
}
