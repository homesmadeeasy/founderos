/**
 * FounderOS — Central mock data store
 * Single source of truth for initial app state.
 * When Supabase is connected, replace getInitialAppState() with a real DB query.
 */

import type {
  Project, Task, Note, Decision, Risk, RoadmapItem, Message, AppState,
} from './types'

// ─── Projects ────────────────────────────────────────────────────────────────

export const projects: Project[] = [
  {
    id: 'founderos',
    title: 'FounderOS',
    description: 'A personal AI operating system for builders, founders, coders and ambitious students.',
    goal: 'Launch V1 where users can create projects, chat with AI, and extract structured outputs like tasks, notes, and decisions.',
    status: 'building',
    priority: 'high',
    progress: 28,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-18T00:00:00Z',
  },
  {
    id: 'pitch-deck',
    title: 'Pitch Deck',
    description: 'Seed-stage investor pitch deck for FounderOS.',
    goal: 'Create a compelling 10-slide deck that communicates the vision, problem, solution, and funding ask clearly to pre-seed angels.',
    status: 'planning',
    priority: 'high',
    progress: 40,
    createdAt: '2026-06-10T00:00:00Z',
    updatedAt: '2026-06-16T00:00:00Z',
  },
  {
    id: 'launch-plan',
    title: 'Launch Plan',
    description: 'Public launch strategy for FounderOS V1.',
    goal: 'Reach 500 waitlist signups before launch and convert 20% into active users in the first week.',
    status: 'paused',
    priority: 'medium',
    progress: 0,
    createdAt: '2026-06-12T00:00:00Z',
    updatedAt: '2026-06-14T00:00:00Z',
  },
]

export function getProject(id: string) {
  return projects.find((p) => p.id === id)
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasks: Task[] = [
  { id: 't1', projectId: 'founderos', title: 'Set up Supabase schema', description: 'Create tables for all entities with RLS.', status: 'done', priority: 'high', createdAt: '2026-06-01T00:00:00Z' },
  { id: 't2', projectId: 'founderos', title: 'Build sidebar and app layout', description: 'Sidebar navigation, topbar, route group layout.', status: 'done', priority: 'high', createdAt: '2026-06-02T00:00:00Z' },
  { id: 't3', projectId: 'founderos', title: 'Implement AI chat with streaming', description: 'Integrate OpenAI API with streaming responses. Store messages in Supabase.', status: 'in_progress', priority: 'high', dueDate: '2026-06-22', createdAt: '2026-06-05T00:00:00Z' },
  { id: 't4', projectId: 'founderos', title: 'Structured extraction from AI output', description: 'Let users save AI responses as tasks, notes, decisions or risks with one click.', status: 'in_progress', priority: 'high', dueDate: '2026-06-24', createdAt: '2026-06-06T00:00:00Z' },
  { id: 't5', projectId: 'founderos', title: 'Add Supabase Auth', description: 'Email + password login. Session handling in middleware.', status: 'todo', priority: 'medium', dueDate: '2026-06-28', createdAt: '2026-06-07T00:00:00Z' },
  { id: 't6', projectId: 'founderos', title: 'Write user onboarding flow', description: 'First-time experience: create project, start chat, save first task.', status: 'todo', priority: 'medium', createdAt: '2026-06-08T00:00:00Z' },
  { id: 't7', projectId: 'founderos', title: 'Deploy to Vercel', description: 'Set up production environment, env vars, CI/CD via GitHub.', status: 'todo', priority: 'low', createdAt: '2026-06-09T00:00:00Z' },
  { id: 't8', projectId: 'pitch-deck', title: 'Write problem and solution slides', status: 'done', priority: 'high', createdAt: '2026-06-10T00:00:00Z' },
  { id: 't9', projectId: 'pitch-deck', title: 'Add market size (TAM/SAM/SOM)', status: 'done', priority: 'high', createdAt: '2026-06-11T00:00:00Z' },
  { id: 't10', projectId: 'pitch-deck', title: 'Build product demo section', description: 'Record a 60-second walkthrough showing the core loop.', status: 'in_progress', priority: 'high', dueDate: '2026-06-20', createdAt: '2026-06-12T00:00:00Z' },
  { id: 't11', projectId: 'pitch-deck', title: 'Add competition / positioning slide', status: 'in_progress', priority: 'medium', createdAt: '2026-06-13T00:00:00Z' },
  { id: 't12', projectId: 'pitch-deck', title: 'Write team + ask slides', status: 'todo', priority: 'high', dueDate: '2026-06-22', createdAt: '2026-06-14T00:00:00Z' },
  { id: 't13', projectId: 'pitch-deck', title: 'Get feedback from 3 founders', status: 'todo', priority: 'medium', dueDate: '2026-06-25', createdAt: '2026-06-15T00:00:00Z' },
  { id: 't14', projectId: 'launch-plan', title: 'Define launch channels', description: 'Twitter/X, Product Hunt, IndieHackers, LinkedIn, email list.', status: 'todo', priority: 'high', createdAt: '2026-06-12T00:00:00Z' },
  { id: 't15', projectId: 'launch-plan', title: 'Write launch post and thread', status: 'todo', priority: 'high', createdAt: '2026-06-13T00:00:00Z' },
  { id: 't16', projectId: 'launch-plan', title: 'Set up waitlist landing page', status: 'todo', priority: 'medium', createdAt: '2026-06-14T00:00:00Z' },
]

// ─── Notes ───────────────────────────────────────────────────────────────────

export const notes: Note[] = [
  { id: 'n1', projectId: 'founderos', title: 'Core loop insight', content: 'The magic of FounderOS is the Capture → Organise → Plan → Execute → Review → Improve loop. Every feature should serve one of these stages. If a feature doesn\'t fit the loop, cut it.', createdAt: '2026-06-03T00:00:00Z' },
  { id: 'n2', projectId: 'founderos', title: 'Target user profile', content: 'Primary user: 18–28 year old solo founder or student builder. They have many ideas, limited time, and struggle to stay organised without a team. They already use ChatGPT but lose context between sessions.', createdAt: '2026-06-04T00:00:00Z' },
  { id: 'n3', projectId: 'founderos', title: 'V1 scope constraint', content: 'V1 is NOT about perfect AI. It\'s about the habit loop. Get users to open it daily, capture something, and feel like they made progress. Ship simple, learn fast.', createdAt: '2026-06-05T00:00:00Z' },
  { id: 'n4', projectId: 'pitch-deck', title: 'Investor angle', content: 'Lead with the behaviour change, not the technology. "Every founder I know uses 5+ tools and still feels disorganised" is more compelling than "we use AI to structure your workflow".', createdAt: '2026-06-11T00:00:00Z' },
  { id: 'n5', projectId: 'pitch-deck', title: 'Comparable companies', content: 'Notion + Linear + ChatGPT — but all three in one, AI-native, and built specifically for solo founders. The unique insight is that the AI has full project context.', createdAt: '2026-06-12T00:00:00Z' },
  { id: 'n6', projectId: 'launch-plan', title: 'Launch strategy principle', content: 'Don\'t launch to everyone at once. Launch to the most relevant 100 people first. Get them to talk about it. Let word of mouth compound.', createdAt: '2026-06-12T00:00:00Z' },
]

// ─── Decisions ───────────────────────────────────────────────────────────────

export const decisions: Decision[] = [
  { id: 'd1', projectId: 'founderos', decision: 'Use Next.js App Router over Pages Router', reasoning: 'App Router supports server components, async layouts, and streaming natively. It\'s the future of Next.js.', createdAt: '2026-06-01T00:00:00Z' },
  { id: 'd2', projectId: 'founderos', decision: 'Use Supabase over a custom Postgres + auth setup', reasoning: 'Supabase gives us auth, database, realtime, and RLS out of the box. Speed matters more than custom control at this stage.', createdAt: '2026-06-02T00:00:00Z' },
  { id: 'd3', projectId: 'founderos', decision: 'No mobile app in V1', reasoning: 'Desktop-first. The use case is better suited for desktop. Revisit in V2 after retention is validated.', createdAt: '2026-06-06T00:00:00Z' },
  { id: 'd4', projectId: 'founderos', decision: 'Flat monthly pricing, not per-token', reasoning: 'Token-based pricing is confusing. A flat fee (e.g. $12/month) is simple and predictable.', createdAt: '2026-06-09T00:00:00Z' },
  { id: 'd5', projectId: 'pitch-deck', decision: 'Target pre-seed angels, not institutional VCs', reasoning: 'Too early for VCs. Angels move faster, need less traction, and provide better introductions.', createdAt: '2026-06-10T00:00:00Z' },
  { id: 'd6', projectId: 'pitch-deck', decision: 'Ask for $150k at $1.5M cap SAFE', reasoning: 'Enough for 6 months of focused building. $1.5M cap is fair pre-product.', createdAt: '2026-06-13T00:00:00Z' },
  { id: 'd7', projectId: 'launch-plan', decision: 'Launch on Product Hunt first, then Twitter/X', reasoning: 'Product Hunt gives credibility and concentrated traffic. Twitter/X amplifies with a personal story post.', createdAt: '2026-06-12T00:00:00Z' },
]

// ─── Risks ───────────────────────────────────────────────────────────────────

export const risks: Risk[] = [
  { id: 'r1', projectId: 'founderos', title: 'OpenAI API cost at scale', description: 'API costs could become unsustainable before we have revenue.', severity: 'high', mitigation: 'Rate limiting per user. Cache repeated queries. Paid tier before costs become a problem.', status: 'open', createdAt: '2026-06-05T00:00:00Z' },
  { id: 'r2', projectId: 'founderos', title: 'Low Day-7 retention', description: 'If users don\'t see value in the first session, they won\'t return.', severity: 'high', mitigation: 'Design for a "first win" in under 2 minutes. Track Day-1 and Day-7 retention from launch.', status: 'open', createdAt: '2026-06-06T00:00:00Z' },
  { id: 'r3', projectId: 'founderos', title: 'Scope creep delays V1', description: 'New feature ideas keep getting added.', severity: 'medium', mitigation: 'Hard scope freeze. All new ideas go to a V2 backlog list.', status: 'mitigated', createdAt: '2026-06-07T00:00:00Z' },
  { id: 'r4', projectId: 'pitch-deck', title: 'Deck too technical for angels', description: 'Leading with AI tech stack could lose investors.', severity: 'medium', mitigation: 'Lead with pain and user story. Mention tech in one slide only.', status: 'mitigated', createdAt: '2026-06-11T00:00:00Z' },
  { id: 'r5', projectId: 'launch-plan', title: 'Low Product Hunt ranking', description: 'Without an existing audience, the PH launch could flop.', severity: 'high', mitigation: 'Build a pre-launch list of 50+ engaged supporters for day one.', status: 'open', createdAt: '2026-06-12T00:00:00Z' },
]

// ─── Roadmap ─────────────────────────────────────────────────────────────────

export const roadmapItems: RoadmapItem[] = [
  { id: 'rm1', projectId: 'founderos', title: 'Foundation', description: 'Schema, auth, project CRUD, core layout.', stage: 'Phase 1', status: 'done', sortOrder: 1, createdAt: '2026-06-01T00:00:00Z' },
  { id: 'rm2', projectId: 'founderos', title: 'AI Chat', description: 'OpenAI-powered chat with streaming and full project context.', stage: 'Phase 2', status: 'in_progress', sortOrder: 2, createdAt: '2026-06-05T00:00:00Z' },
  { id: 'rm3', projectId: 'founderos', title: 'Structured Extraction', description: 'Convert AI responses into tasks, notes, decisions, and risks.', stage: 'Phase 2', status: 'in_progress', sortOrder: 3, createdAt: '2026-06-06T00:00:00Z' },
  { id: 'rm4', projectId: 'founderos', title: 'Weekly Review', description: 'AI-generated weekly summary across all projects.', stage: 'Phase 3', status: 'planned', sortOrder: 4, createdAt: '2026-06-07T00:00:00Z' },
  { id: 'rm5', projectId: 'founderos', title: 'Public Launch', description: 'Landing page, waitlist, onboarding, first 100 paying users.', stage: 'Phase 4', status: 'planned', sortOrder: 5, createdAt: '2026-06-08T00:00:00Z' },
  { id: 'rm6', projectId: 'pitch-deck', title: 'First draft complete', description: 'All 10 slides written.', stage: 'Draft', status: 'in_progress', sortOrder: 1, createdAt: '2026-06-10T00:00:00Z' },
  { id: 'rm7', projectId: 'pitch-deck', title: 'Founder feedback round', description: 'Share with 3–5 trusted founders.', stage: 'Review', status: 'planned', sortOrder: 2, createdAt: '2026-06-11T00:00:00Z' },
  { id: 'rm8', projectId: 'pitch-deck', title: 'Investor outreach begins', description: 'Send to 20 target angels.', stage: 'Outreach', status: 'planned', sortOrder: 3, createdAt: '2026-06-12T00:00:00Z' },
  { id: 'rm9', projectId: 'launch-plan', title: 'Pre-launch prep', description: 'Waitlist landing page. 50+ people primed.', stage: 'Pre-launch', status: 'planned', sortOrder: 1, createdAt: '2026-06-12T00:00:00Z' },
  { id: 'rm10', projectId: 'launch-plan', title: 'Launch day', description: 'Product Hunt post, Twitter thread, email to waitlist.', stage: 'Launch', status: 'planned', sortOrder: 2, createdAt: '2026-06-13T00:00:00Z' },
]

// ─── Chat Messages ────────────────────────────────────────────────────────────

export const chatMessages: Record<string, Message[]> = {
  founderos: [
    { id: 'm1', role: 'user', content: 'Help me plan the first sprint for FounderOS. What should I focus on?', createdAt: '2026-06-05T10:00:00Z' },
    { id: 'm2', role: 'assistant', content: `Based on your V1 goal, here's what I'd focus on for Sprint 1:\n\n**Core infrastructure (must-have)**\n- Supabase schema and auth setup\n- Project CRUD API routes\n- App layout: sidebar, topbar, route groups\n\n**AI chat (the core value)**\n- Chat UI with message history per project\n- OpenAI API with streaming responses\n- Store messages in Supabase\n\n**Structured extraction (the differentiator)**\n- Let users save AI responses as tasks, notes, or decisions\n- Link each extracted item back to the source message\n\nWant me to turn these into formal tasks, or identify the biggest risks?`, createdAt: '2026-06-05T10:01:00Z' },
    { id: 'm3', role: 'user', content: 'Yes, create tasks for the core infrastructure items.', createdAt: '2026-06-05T10:03:00Z' },
    { id: 'm4', role: 'assistant', content: `Here are 5 tasks for core infrastructure — ordered by dependency:\n\n1. **Set up Supabase schema** — projects, messages, tasks, notes, decisions, risks tables with RLS\n2. **Add Supabase Auth** — email/password login, session handling in middleware\n3. **Project CRUD API routes** — POST, GET, PATCH, DELETE for /api/projects\n4. **Build app layout** — sidebar, topbar, (app) route group wrapper\n5. **Project detail layout** — tabs: Chat, Tasks, Notes, Decisions, Risks, Roadmap\n\nShall I also draft the Supabase SQL schema for all these tables?`, createdAt: '2026-06-05T10:04:00Z' },
  ],
  'pitch-deck': [
    { id: 'pm1', role: 'user', content: 'What should be on slide 1 of my pitch deck?', createdAt: '2026-06-11T09:00:00Z' },
    { id: 'pm2', role: 'assistant', content: `Slide 1 is your title slide — but it's also your first impression.\n\n**What to include:**\n- Company name: FounderOS\n- One-liner that makes them want to see slide 2\n- Your name + contact\n\n**What makes a great one-liner:**\n- Lead with the user and outcome, not the technology\n- Example: "FounderOS turns scattered ideas into structured projects — with AI doing the organising"\n\nWant me to help sharpen your one-liner?`, createdAt: '2026-06-11T09:01:00Z' },
  ],
  'launch-plan': [],
}

// ─── Initial App State ────────────────────────────────────────────────────────

export function getInitialAppState(): AppState {
  return {
    projects: [...projects],
    tasks: [...tasks],
    notes: [...notes],
    decisions: [...decisions],
    risks: [...risks],
    roadmapItems: [...roadmapItems],
    chatMessages: { ...chatMessages },
  }
}

// Helper functions (used by legacy code, now delegate to AppState)
export function getTasksForProject(projectId: string)    { return tasks.filter(t => t.projectId === projectId) }
export function getNotesForProject(projectId: string)    { return notes.filter(n => n.projectId === projectId) }
export function getDecisionsForProject(projectId: string){ return decisions.filter(d => d.projectId === projectId) }
export function getRisksForProject(projectId: string)    { return risks.filter(r => r.projectId === projectId) }
export function getRoadmapForProject(projectId: string)  { return roadmapItems.filter(r => r.projectId === projectId).sort((a, b) => a.sortOrder - b.sortOrder) }
export function getChatMessages(projectId: string)       { return chatMessages[projectId] ?? [] }
