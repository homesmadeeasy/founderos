/**
 * Supabase data access: onboarding
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AppState, Project, Task, Note, Decision, Risk, RoadmapItem, Message,
  ProjectReview, Idea, IdeaAnalysis, Link, EntityType, ProjectFile,
  MessageRole, WeeklyReview, ProjectDna, PatternAnalysis, UserProfile,
} from '@/lib/types'
import type {
  NewProject, NewTask, NewNote, NewDecision, NewRisk, NewRoadmapItem,
  NewIdea, NewLink, NewProjectFile,
} from './input-types'
import {
  toProject, toTask, toNote, toDecision, toRisk, toRoadmap, toMessage,
  toIdea, toIdeaAnalysis, toLink, toProjectFile, toProjectReview,
  toWeeklyReview, toProjectDna, toPatternAnalysis,
  type ProjectRow, type TaskRow, type NoteRow, type DecisionRow, type RiskRow,
  type RoadmapRow, type MessageRow, type IdeaRow, type IdeaAnalysisRow,
  type LinkRow, type ProjectFileRow, type ProjectReviewRow, type WeeklyReviewRow,
  type ProjectDnaRow, type PatternAnalysisRow,
} from './mappers'
import { DEMO_PROJECT_TITLE } from '@/lib/onboarding'
import { createIdea } from './ideas'
import { createProject } from './projects'
import { createTask } from './tasks'
import { createDecision } from './decisions'
import { createRisk } from './risks'
import { createRoadmapItem } from './roadmap'
import { createNote } from './notes'
import { createLink } from './memory'


interface ProfileRow {
  id: string
  email: string | null
  full_name: string | null
  onboarding_completed: boolean | null
  demo_workspace_loaded: boolean | null
  created_at: string
}

function toProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    onboardingCompleted: row.onboarding_completed ?? false,
    demoWorkspaceLoaded: row.demo_workspace_loaded ?? false,
    createdAt: row.created_at,
  }
}

export async function loadProfile(supabase: SupabaseClient, userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, onboarding_completed, demo_workspace_loaded, created_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? toProfile(data as ProfileRow) : null
}

export async function completeOnboarding(supabase: SupabaseClient, userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', userId)
    .select('id, email, full_name, onboarding_completed, demo_workspace_loaded, created_at')
    .single()
  if (error) throw error
  return toProfile(data as ProfileRow)
}

export interface DemoWorkspaceResult {
  ideaId: string
  projectId: string
  alreadyLoaded: boolean
}

/** Create a small demo workspace for the current user (idempotent). */
export async function createDemoWorkspace(
  supabase: SupabaseClient,
  userId: string,
): Promise<DemoWorkspaceResult> {
  const profile = await loadProfile(supabase, userId)

  const { data: existingProject } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .eq('title', DEMO_PROJECT_TITLE)
    .maybeSingle()

  if (existingProject?.id) {
    if (profile && !profile.demoWorkspaceLoaded) {
      await supabase.from('profiles').update({ demo_workspace_loaded: true }).eq('id', userId)
    }
    const { data: linkedIdea } = await supabase
      .from('links')
      .select('source_id')
      .eq('user_id', userId)
      .eq('target_type', 'project')
      .eq('target_id', existingProject.id)
      .eq('relationship_type', 'converted_to')
      .limit(1)
      .maybeSingle()
    return {
      projectId: existingProject.id,
      ideaId: linkedIdea?.source_id ?? '',
      alreadyLoaded: true,
    }
  }

  if (profile?.demoWorkspaceLoaded) {
    throw new Error('Demo workspace was already loaded.')
  }

  const idea = await createIdea(supabase, userId, {
    title: 'AI-powered study planner for students',
    description: 'A demo idea showing how FounderOS captures raw concepts before they become projects.',
    targetUser: 'High school and university students',
    problem: 'Students struggle to plan study time across subjects.',
    solution: 'An AI planner that turns syllabus goals into weekly tasks.',
    potentialScore: 7,
    difficultyScore: 5,
    status: 'Exploring',
    tags: ['demo', 'education'],
  })

  const project = await createProject(supabase, userId, {
    title: DEMO_PROJECT_TITLE,
    description: 'Demo project — explore chat, tasks, decisions, risks and reviews in FounderOS.',
    goal: 'Ship a simple MVP that helps students plan one week of study.',
    status: 'planning',
    priority: 'medium',
    progress: 15,
  })

  await createLink(supabase, userId, {
    sourceType: 'idea',
    sourceId: idea.id,
    targetType: 'project',
    targetId: project.id,
    relationshipType: 'converted_to',
    description: 'Demo idea converted to demo project',
  })

  await Promise.all([
    createTask(supabase, userId, {
      projectId: project.id,
      title: 'Define MVP features',
      description: 'List the 3 core features for the first demo version.',
      priority: 'high',
      status: 'in_progress',
    }),
    createTask(supabase, userId, {
      projectId: project.id,
      title: 'Sketch onboarding flow',
      description: 'Map how a new student sets up their first study week.',
      priority: 'medium',
      status: 'todo',
    }),
  ])

  await createDecision(supabase, userId, {
    projectId: project.id,
    decision: 'Target high school and university students first',
    reasoning: 'They have the clearest pain around planning and the fastest feedback loops.',
  })

  await createRisk(supabase, userId, {
    projectId: project.id,
    title: 'Scope creep from too many features',
    description: 'Adding calendar sync, social features or AI tutoring could delay the MVP.',
    severity: 'medium',
    mitigation: 'Ship a single-week planner before expanding.',
    status: 'open',
  })

  await createRoadmapItem(supabase, userId, {
    projectId: project.id,
    title: 'Launch beta landing page',
    description: 'Collect emails from students who want early access.',
    stage: 'Next',
    status: 'planned',
    sortOrder: 0,
  })

  await createNote(supabase, userId, {
    projectId: project.id,
    title: 'Demo workspace note',
    content: 'This is demo data created by FounderOS. Explore chat, tasks, reviews and memory to see how the system works.',
  })

  await supabase.from('profiles').update({
    demo_workspace_loaded: true,
    onboarding_completed: true,
  }).eq('id', userId)

  return { ideaId: idea.id, projectId: project.id, alreadyLoaded: false }
}
