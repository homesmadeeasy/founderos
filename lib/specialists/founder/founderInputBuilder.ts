import type { WorldModel } from '@/lib/cognitive-model/beliefTypes'
import type { FounderInput } from './founderTypes'

/** Founder input gathered from source engines only — no cognitive model dependency. */
export type FounderBaseInput = Omit<FounderInput, 'worldModel'>

export function mergeFounderInputWithWorldModel(
  base: FounderBaseInput,
  worldModel: WorldModel | null | undefined,
  hydrated = true,
): FounderInput {
  return {
    ...base,
    worldModel: hydrated ? (worldModel ?? null) : null,
  }
}
