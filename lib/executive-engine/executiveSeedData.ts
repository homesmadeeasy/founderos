import type { ExecutiveState } from './executiveTypes'

/** Empty initial store — briefings and recommendations are generated on first load. */
export function createSeedExecutiveState(): ExecutiveState {
  return {
    briefings: [],
    recommendations: [],
    decisions: [],
  }
}
