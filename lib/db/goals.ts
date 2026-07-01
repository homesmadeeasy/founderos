/**
 * Supabase data access: goals, goal links, goal reviews
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Goal, GoalLink, GoalReview } from '@/lib/types'
import type { NewGoal } from './input-types'
import type { NormalizedGoalReviewFields } from '@/lib/goal'
import {
  toGoal, toGoalLink, toGoalReview,
  type GoalRow, type GoalLinkRow, type GoalReviewRow,
} from './mappers'

export async function loadGoals(supabase: SupabaseClient): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toGoal(r as GoalRow))
}

export async function loadGoal(supabase: SupabaseClient, goalId: string): Promise<Goal | null> {
  const { data, error } = await supabase.from('goals').select('*').eq('id', goalId).maybeSingle()
  if (error) throw error
  return data ? toGoal(data as GoalRow) : null
}

export async function createGoal(supabase: SupabaseClient, userId: string, d: NewGoal): Promise<Goal> {
  const { data, error } = await supabase.from('goals').insert({
    user_id: userId,
    title: d.title,
    description: d.description ?? '',
    category: d.category ?? 'Other',
    priority: d.priority ?? 'Medium',
    status: d.status ?? 'Active',
    progress: d.progress ?? 0,
    timeframe: d.timeframe ?? '',
    success_criteria: d.successCriteria ?? '',
    why_it_matters: d.whyItMatters ?? '',
    constraints: d.constraints ?? '',
  }).select('*').single()
  if (error) throw error
  return toGoal(data as GoalRow)
}

export async function updateGoal(
  supabase: SupabaseClient,
  id: string,
  d: Partial<Omit<Goal, 'id' | 'createdAt'>>,
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.title            !== undefined) patch.title = d.title
  if (d.description      !== undefined) patch.description = d.description
  if (d.category         !== undefined) patch.category = d.category
  if (d.priority         !== undefined) patch.priority = d.priority
  if (d.status           !== undefined) patch.status = d.status
  if (d.progress         !== undefined) patch.progress = d.progress
  if (d.timeframe        !== undefined) patch.timeframe = d.timeframe
  if (d.successCriteria  !== undefined) patch.success_criteria = d.successCriteria
  if (d.whyItMatters     !== undefined) patch.why_it_matters = d.whyItMatters
  if (d.constraints      !== undefined) patch.constraints = d.constraints
  const { error } = await supabase.from('goals').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteGoal(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

export async function loadGoalLinks(supabase: SupabaseClient, goalId: string): Promise<GoalLink[]> {
  const { data, error } = await supabase
    .from('goal_links')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toGoalLink(r as GoalLinkRow))
}

export async function loadGoalLinksForEntity(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
): Promise<GoalLink[]> {
  const { data, error } = await supabase
    .from('goal_links')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
  if (error) throw error
  return (data ?? []).map(r => toGoalLink(r as GoalLinkRow))
}

export async function createGoalLink(
  supabase: SupabaseClient,
  userId: string,
  goalId: string,
  entityType: string,
  entityId: string,
  relationshipType = 'supports',
): Promise<GoalLink> {
  const { data, error } = await supabase.from('goal_links').insert({
    user_id: userId,
    goal_id: goalId,
    entity_type: entityType,
    entity_id: entityId,
    relationship_type: relationshipType,
  }).select('*').single()
  if (error) throw error
  return toGoalLink(data as GoalLinkRow)
}

export async function deleteGoalLink(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('goal_links').delete().eq('id', id)
  if (error) throw error
}

export async function loadGoalReviews(supabase: SupabaseClient, goalId: string): Promise<GoalReview[]> {
  const { data, error } = await supabase
    .from('goal_reviews')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => toGoalReview(r as GoalReviewRow))
}

export async function loadLatestGoalReviews(supabase: SupabaseClient, limit = 3): Promise<GoalReview[]> {
  const { data, error } = await supabase
    .from('goal_reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(r => toGoalReview(r as GoalReviewRow))
}

export async function createGoalReview(
  supabase: SupabaseClient,
  userId: string,
  goalId: string,
  fields: NormalizedGoalReviewFields,
): Promise<GoalReview> {
  const { data, error } = await supabase.from('goal_reviews').insert({
    user_id: userId,
    goal_id: goalId,
    progress_review: fields.progressReview,
    blockers: fields.blockers,
    conflicts: fields.conflicts,
    next_actions: fields.nextActions,
    recommended_focus: fields.recommendedFocus,
    confidence_score: fields.confidenceScore,
    suggested_tasks: fields.suggestedTasks,
  }).select('*').single()
  if (error) throw error
  return toGoalReview(data as GoalReviewRow)
}

export async function loadGoalReviewContext(
  supabase: SupabaseClient,
  goalId: string,
): Promise<{ goal: Goal; links: GoalLink[] } | null> {
  const goal = await loadGoal(supabase, goalId)
  if (!goal) return null
  const links = await loadGoalLinks(supabase, goalId)
  return { goal, links }
}
