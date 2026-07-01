/**
 * World types and labels — client-safe.
 */

import type { WorldType } from '@/lib/types'

export const WORLD_TYPES: WorldType[] = [
  'Business', 'Learning', 'Health', 'Career', 'Finance', 'Creative',
  'Personal', 'Life Admin', 'Research', 'Relationship', 'Custom',
]

export const WORLD_TYPE_EXAMPLES: Record<WorldType, string> = {
  Business: 'Build a business',
  Learning: 'Study for exams',
  Health: 'Improve my fitness',
  Career: 'Plan my career',
  Finance: 'Organise my finances',
  Creative: 'Write a novel',
  Personal: 'Build better habits',
  'Life Admin': 'Manage life admin',
  Research: 'Research an idea',
  Relationship: 'Plan a wedding',
  Custom: 'Custom goal or area',
}

/** Short badge colour hint for UI */
export const WORLD_TYPE_COLOUR: Record<WorldType, string> = {
  Business: 'bg-blue-50 text-blue-700',
  Learning: 'bg-violet-50 text-violet-700',
  Health: 'bg-emerald-50 text-emerald-700',
  Career: 'bg-amber-50 text-amber-700',
  Finance: 'bg-lime-50 text-lime-700',
  Creative: 'bg-pink-50 text-pink-700',
  Personal: 'bg-indigo-50 text-indigo-700',
  'Life Admin': 'bg-zinc-100 text-zinc-700',
  Research: 'bg-cyan-50 text-cyan-700',
  Relationship: 'bg-rose-50 text-rose-700',
  Custom: 'bg-zinc-100 text-zinc-600',
}
