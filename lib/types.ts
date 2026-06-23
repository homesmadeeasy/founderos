// ─── Project ──────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | 'idea'
  | 'planning'
  | 'building'
  | 'testing'
  | 'launched'
  | 'paused'
  | 'archived'

export type ProjectPriority = 'low' | 'medium' | 'high'

export interface Project {
  id: string
  title: string
  description: string
  goal: string
  status: ProjectStatus
  priority: ProjectPriority
  /** Manual progress override: 0–100. Falls back to task completion if 0. */
  progress: number
  createdAt: string
  updatedAt: string
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskStatus   = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low'  | 'medium'      | 'high'

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  createdAt: string
}

// ─── Note ─────────────────────────────────────────────────────────────────────

export interface Note {
  id: string
  projectId: string
  title: string
  content: string
  createdAt: string
}

// ─── Decision ─────────────────────────────────────────────────────────────────

export interface Decision {
  id: string
  projectId: string
  decision: string
  reasoning: string
  createdAt: string
}

// ─── Risk ─────────────────────────────────────────────────────────────────────

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical'
export type RiskStatus   = 'open' | 'mitigated' | 'closed'

export interface Risk {
  id: string
  projectId: string
  title: string
  description: string
  severity: RiskSeverity
  mitigation: string
  status: RiskStatus
  createdAt: string
}

// ─── Roadmap ──────────────────────────────────────────────────────────────────

export type RoadmapStatus = 'planned' | 'in_progress' | 'done'

export interface RoadmapItem {
  id: string
  projectId: string
  title: string
  description: string
  stage: string
  status: RoadmapStatus
  sortOrder: number
  createdAt: string
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: string
}

// ─── Project Review ─────────────────────────────────────────────────────────

/** A task suggested by the Project Review Engine. Priority uses the
 *  human-readable casing returned by the model ("Low" | "Medium" | "High"). */
export interface SuggestedReviewTask {
  title: string
  description: string
  priority: 'Low' | 'Medium' | 'High'
}

/** A roadmap item suggested by the Project Review Engine. */
export interface SuggestedReviewRoadmapItem {
  title: string
  description: string
  stage: string   // e.g. "Now" | "Next" | "Later"
  status: string  // e.g. "Planned"
}

export interface ProjectReview {
  id: string
  projectId: string
  summary: string
  progressReview: string
  completedWork: string
  blockers: string
  keyRisks: string
  keyDecisions: string
  next7DayPlan: string
  suggestedTasks: SuggestedReviewTask[]
  suggestedRoadmapItems: SuggestedReviewRoadmapItem[]
  createdAt: string
}

// ─── Global Weekly Review ─────────────────────────────────────────────────────

/** A task suggested by the Weekly Review Engine. May include a project id. */
export interface SuggestedWeeklyTask {
  projectId?: string
  title: string
  description: string
  priority: 'Low' | 'Medium' | 'High'
}

/** A project the Weekly Review Engine recommends reviewing. */
export interface SuggestedProjectReviewRef {
  projectId: string
  reason: string
}

export interface WeeklyReview {
  id: string
  weekStart: string
  weekEnd: string
  summary: string
  completedWork: string
  activeProjects: string
  stuckProjects: string
  keyDecisions: string
  keyRisks: string
  ideasToRevisit: string
  filesAdded: string
  memoryInsights: string
  nextWeekFocus: string
  suggestedTasks: SuggestedWeeklyTask[]
  suggestedProjectReviews: SuggestedProjectReviewRef[]
  createdAt: string
}

// ─── Idea Vault ─────────────────────────────────────────────────────────────

export type IdeaStatus =
  | 'Raw'
  | 'Exploring'
  | 'Validated'
  | 'Turned Into Project'
  | 'Archived'

export const IDEA_STATUSES: IdeaStatus[] = [
  'Raw', 'Exploring', 'Validated', 'Turned Into Project', 'Archived',
]

export interface Idea {
  id: string
  title: string
  description: string
  targetUser: string
  problem: string
  solution: string
  potentialScore: number   // 1–10
  difficultyScore: number  // 1–10
  status: IdeaStatus
  tags: string[]
  createdAt: string
  updatedAt: string
}

/** A project suggested by the Idea Architect (human-readable casing). */
export interface SuggestedProject {
  title: string
  description: string
  goal: string
  status: string    // e.g. "Planning"
  priority: string  // e.g. "Medium"
  progress: number
}

export interface SuggestedIdeaTask {
  title: string
  description: string
  priority: 'Low' | 'Medium' | 'High'
}

export interface SuggestedIdeaRisk {
  title: string
  description: string
  severity: 'Low' | 'Medium' | 'High'
  mitigation: string
  status: string  // e.g. "Open"
}

export interface SuggestedIdeaRoadmapItem {
  title: string
  description: string
  stage: string   // e.g. "Now" | "Next" | "Later"
  status: string  // e.g. "Planned"
}

export interface IdeaAnalysis {
  id: string
  ideaId: string
  summary: string
  targetUserAnalysis: string
  problemAnalysis: string
  marketPotential: string
  difficultyAnalysis: string
  risks: string
  mvpSuggestion: string
  validationPlan: string
  nextSteps: string
  suggestedProject: SuggestedProject | null
  suggestedTasks: SuggestedIdeaTask[]
  suggestedRisks: SuggestedIdeaRisk[]
  suggestedRoadmapItems: SuggestedIdeaRoadmapItem[]
  createdAt: string
}

// ─── Project Files ────────────────────────────────────────────────────────────

export type FileStatus = 'Uploaded' | 'Processing' | 'Summarised' | 'Failed'

export interface ProjectFile {
  id: string
  projectId: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
  summary: string
  extractedText: string
  status: FileStatus
  createdAt: string
  updatedAt: string
}

// ─── Knowledge Graph / Linked Memory ────────────────────────────────────────

export type EntityType =
  | 'idea'
  | 'idea_analysis'
  | 'project'
  | 'conversation'
  | 'message'
  | 'task'
  | 'note'
  | 'decision'
  | 'risk'
  | 'roadmap_item'
  | 'project_review'
  | 'project_file'
  | 'weekly_review'

export type RelationshipType =
  | 'created_from'
  | 'converted_to'
  | 'suggested_by'
  | 'supports'
  | 'blocks'
  | 'relates_to'
  | 'caused_by'
  | 'resolves'
  | 'depends_on'
  | 'part_of'

export interface Link {
  id: string
  sourceType: EntityType
  sourceId: string
  targetType: EntityType
  targetId: string
  relationshipType: RelationshipType
  description: string
  createdAt: string
}

/** A resolved endpoint of a link — its type, id and a human-readable label. */
export interface LinkedEntity {
  type: EntityType
  id: string
  label: string
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface AppState {
  projects: Project[]
  tasks: Task[]
  notes: Note[]
  decisions: Decision[]
  risks: Risk[]
  roadmapItems: RoadmapItem[]
  ideas: Idea[]
  projectFiles: ProjectFile[]
  links: Link[]
  chatMessages: Record<string, Message[]>
}
