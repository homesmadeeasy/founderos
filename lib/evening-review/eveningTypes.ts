/**
 * Evening Review — core types.
 */

export type EnergyLevel = 'low' | 'medium' | 'high'

export interface EveningReview {
  id: string
  date: string
  morningPlanId?: string
  completedPriorities: string[]
  incompletePriorities: string[]
  wins: string[]
  blockers: string[]
  lessons: string[]
  energyLevel?: EnergyLevel
  mood?: string
  reflection: string
  tomorrowNotes: string
  generatedMemories: string[]
  suggestedKnowledgeIds: string[]
  matteredSignalIds: string[]
  ignoredSignalIds: string[]
  memoriesWritten: boolean
  completed: boolean
  createdAt: string
  updatedAt: string
}

export type CreateEveningReviewInput = Omit<
  EveningReview,
  'id' | 'generatedMemories' | 'suggestedKnowledgeIds' | 'matteredSignalIds' | 'ignoredSignalIds' | 'memoriesWritten' | 'completed' | 'createdAt' | 'updatedAt'
> & {
  id?: string
  generatedMemories?: string[]
  suggestedKnowledgeIds?: string[]
  matteredSignalIds?: string[]
  ignoredSignalIds?: string[]
  memoriesWritten?: boolean
  completed?: boolean
}

export type UpdateEveningReviewInput = Partial<Omit<EveningReview, 'id' | 'date' | 'createdAt'>>

export interface EveningReviewStore {
  reviews: EveningReview[]
}
