/**
 * FounderOS — Central mock data store
 *
 * This file is the single source of truth for all mock data used across the app.
 * When Supabase is connected, these will be replaced with real database queries.
 *
 * Structure:
 *   projects       → top-level containers for all work
 *   tasks          → action items belonging to a project
 *   notes          → free-form notes captured inside a project
 *   decisions      → logged decisions with reasoning
 *   risks          → identified risks with severity + mitigation
 *   roadmapItems   → milestones/phases for a project
 *   chatMessages   → per-project AI conversation history
 */

import type {
  Project, Task, Note, Decision, Risk, RoadmapItem, Message,
} from './types'

// ─── Projects ────────────────────────────────────────────────────────────────

export const projects: Project[] = [
  {
    id: 'founderos',
    title: 'FounderOS',
    description: 'A personal AI operating system for builders, founders, coders and ambitious students.',
    goal: 'Launch V1 where users can create projects, chat with AI, and extract structured outputs like tasks, notes, and decisions.',
    status: 'active',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-18T00:00:00Z',
  },
  {
    id: 'pitch-deck',
    title: 'Pitch Deck',
    description: 'Seed-stage investor pitch deck for FounderOS.',
    goal: 'Create a compelling 10-slide deck that communicates the vision, problem, solution, and funding ask clearly to pre-seed angels.',
    status: 'active',
    createdAt: '2026-06-10T00:00:00Z',
    updatedAt: '2026-06-16T00:00:00Z',
  },
  {
    id: 'launch-plan',
    title: 'Launch Plan',
    description: 'Public launch strategy for FounderOS V1.',
    goal: 'Reach 500 waitlist signups before launch and convert 20% into active users in the first week.',
    status: 'paused',
    createdAt: '2026-06-12T00:00:00Z',
    updatedAt: '2026-06-14T00:00:00Z',
  },
]

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id)
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasks: Task[] = [
  // FounderOS
  {
    id: 't1', projectId: 'founderos',
    title: 'Set up Supabase schema',
    description: 'Create tables for projects, tasks, notes, decisions, risks, roadmap items and messages. Enable RLS.',
    status: 'done', priority: 'high',
    createdAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 't2', projectId: 'founderos',
    title: 'Build sidebar and app layout',
    description: 'Sidebar navigation, topbar, route group layout with (app) wrapper.',
    status: 'done', priority: 'high',
    createdAt: '2026-06-02T00:00:00Z',
  },
  {
    id: 't3', projectId: 'founderos',
    title: 'Implement AI chat with streaming',
    description: 'Integrate OpenAI API with streaming responses in the project chat page. Store messages in Supabase.',
    status: 'in_progress', priority: 'high',
    dueDate: '2026-06-22',
    createdAt: '2026-06-05T00:00:00Z',
  },
  {
    id: 't4', projectId: 'founderos',
    title: 'Structured extraction from AI output',
    description: 'Let users save AI responses as tasks, notes, decisions or risks with one click. Link via source_message_id.',
    status: 'in_progress', priority: 'high',
    dueDate: '2026-06-24',
    createdAt: '2026-06-06T00:00:00Z',
  },
  {
    id: 't5', projectId: 'founderos',
    title: 'Add Supabase Auth',
    description: 'Email + password login. Session handling in Next.js middleware. Protected routes.',
    status: 'todo', priority: 'medium',
    dueDate: '2026-06-28',
    createdAt: '2026-06-07T00:00:00Z',
  },
  {
    id: 't6', projectId: 'founderos',
    title: 'Write user onboarding flow',
    description: 'First-time user experience: create first project, start a chat, save first task.',
    status: 'todo', priority: 'medium',
    createdAt: '2026-06-08T00:00:00Z',
  },
  {
    id: 't7', projectId: 'founderos',
    title: 'Deploy to Vercel',
    description: 'Set up production environment, env vars, and CI/CD via GitHub.',
    status: 'todo', priority: 'low',
    createdAt: '2026-06-09T00:00:00Z',
  },

  // Pitch Deck
  {
    id: 't8', projectId: 'pitch-deck',
    title: 'Write problem and solution slides',
    status: 'done', priority: 'high',
    createdAt: '2026-06-10T00:00:00Z',
  },
  {
    id: 't9', projectId: 'pitch-deck',
    title: 'Add market size (TAM/SAM/SOM)',
    status: 'done', priority: 'high',
    createdAt: '2026-06-11T00:00:00Z',
  },
  {
    id: 't10', projectId: 'pitch-deck',
    title: 'Build product demo section',
    description: 'Record a 60-second screen walkthrough showing the core loop: create project → chat → extract task.',
    status: 'in_progress', priority: 'high',
    dueDate: '2026-06-20',
    createdAt: '2026-06-12T00:00:00Z',
  },
  {
    id: 't11', projectId: 'pitch-deck',
    title: 'Add competition / positioning slide',
    status: 'in_progress', priority: 'medium',
    createdAt: '2026-06-13T00:00:00Z',
  },
  {
    id: 't12', projectId: 'pitch-deck',
    title: 'Write team + ask slides',
    status: 'todo', priority: 'high',
    dueDate: '2026-06-22',
    createdAt: '2026-06-14T00:00:00Z',
  },
  {
    id: 't13', projectId: 'pitch-deck',
    title: 'Get feedback from 3 founders',
    status: 'todo', priority: 'medium',
    dueDate: '2026-06-25',
    createdAt: '2026-06-15T00:00:00Z',
  },

  // Launch Plan
  {
    id: 't14', projectId: 'launch-plan',
    title: 'Define launch channels',
    description: 'Decide which platforms: Twitter/X, Product Hunt, IndieHackers, LinkedIn, email list.',
    status: 'todo', priority: 'high',
    createdAt: '2026-06-12T00:00:00Z',
  },
  {
    id: 't15', projectId: 'launch-plan',
    title: 'Write launch post and thread',
    status: 'todo', priority: 'high',
    createdAt: '2026-06-13T00:00:00Z',
  },
  {
    id: 't16', projectId: 'launch-plan',
    title: 'Set up waitlist landing page',
    status: 'todo', priority: 'medium',
    createdAt: '2026-06-14T00:00:00Z',
  },
]

export function getTasksForProject(projectId: string): Task[] {
  return tasks.filter((t) => t.projectId === projectId)
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export const notes: Note[] = [
  {
    id: 'n1', projectId: 'founderos',
    title: 'Core loop insight',
    content: 'The magic of FounderOS is the Capture → Organise → Plan → Execute → Review → Improve loop. Every feature should serve one of these stages. If a feature doesn\'t fit the loop, cut it.',
    createdAt: '2026-06-03T00:00:00Z',
  },
  {
    id: 'n2', projectId: 'founderos',
    title: 'Target user profile',
    content: 'Primary user: 18–28 year old solo founder or student builder. They have many ideas, limited time, and struggle to stay organised without a team. They already use ChatGPT but lose context between sessions. FounderOS gives them a persistent, project-aware AI co-founder.',
    createdAt: '2026-06-04T00:00:00Z',
  },
  {
    id: 'n3', projectId: 'founderos',
    title: 'V1 scope constraint',
    content: 'V1 is NOT about perfect AI. It\'s about the habit loop. Get users to open it daily, capture something, and feel like they made progress. AI quality can improve after retention is proven. Ship simple, learn fast.',
    createdAt: '2026-06-05T00:00:00Z',
  },
  {
    id: 'n4', projectId: 'pitch-deck',
    title: 'Investor angle',
    content: 'Lead with the behaviour change, not the technology. "Every founder I know uses 5+ tools and still feels disorganised" is more compelling than "we use AI to structure your workflow". Make them feel the pain first.',
    createdAt: '2026-06-11T00:00:00Z',
  },
  {
    id: 'n5', projectId: 'pitch-deck',
    title: 'Comparable companies',
    content: 'Notion (personal knowledge management) + Linear (task management) + ChatGPT (AI assistant) — but all three in one, AI-native, and built specifically for solo founders. The unique insight is that the AI has full project context.',
    createdAt: '2026-06-12T00:00:00Z',
  },
  {
    id: 'n6', projectId: 'launch-plan',
    title: 'Launch strategy principle',
    content: 'Don\'t launch to everyone at once. Launch to the most relevant 100 people first — solo founders who are already frustrated with their current tools. Get them to talk about it. Let word of mouth compound.',
    createdAt: '2026-06-12T00:00:00Z',
  },
]

export function getNotesForProject(projectId: string): Note[] {
  return notes.filter((n) => n.projectId === projectId)
}

// ─── Decisions ───────────────────────────────────────────────────────────────

export const decisions: Decision[] = [
  {
    id: 'd1', projectId: 'founderos',
    decision: 'Use Next.js App Router over Pages Router',
    reasoning: 'App Router supports server components, async layouts, and streaming natively. It\'s the direction Next.js is heading and aligns with our goal of clean, scalable architecture.',
    createdAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'd2', projectId: 'founderos',
    decision: 'Use Supabase over a custom Postgres + auth setup',
    reasoning: 'Supabase gives us auth, database, realtime, and RLS out of the box. Speed matters more than custom control at this stage. We can migrate later if needed.',
    createdAt: '2026-06-02T00:00:00Z',
  },
  {
    id: 'd3', projectId: 'founderos',
    decision: 'No mobile app in V1',
    reasoning: 'The use case — planning, writing, reviewing — is better suited for desktop. Building mobile now would split focus. Revisit in V2 after retention is validated.',
    createdAt: '2026-06-06T00:00:00Z',
  },
  {
    id: 'd4', projectId: 'founderos',
    decision: 'Charge per project or per seat, not per AI token',
    reasoning: 'Token-based pricing is confusing and unpredictable for users. A flat monthly fee (e.g. $12/month for 10 projects) is simple and aligns with how builders think.',
    createdAt: '2026-06-09T00:00:00Z',
  },
  {
    id: 'd5', projectId: 'pitch-deck',
    decision: 'Target pre-seed angels, not institutional VCs',
    reasoning: 'The product is too early for institutional VCs who need traction data. Angels move faster, need less proof, and can provide relevant intros and advice as founders themselves.',
    createdAt: '2026-06-10T00:00:00Z',
  },
  {
    id: 'd6', projectId: 'pitch-deck',
    decision: 'Ask for $150k at $1.5M cap SAFE',
    reasoning: 'Enough to fund 6 months of focused building without a team. $1.5M cap is fair pre-product and keeps future rounds uncomplicated.',
    createdAt: '2026-06-13T00:00:00Z',
  },
  {
    id: 'd7', projectId: 'launch-plan',
    decision: 'Launch on Product Hunt first, then Twitter/X',
    reasoning: 'Product Hunt gives credibility and a concentrated burst of relevant traffic. Twitter/X amplifies it with a personal story post. Doing both on the same day maximises momentum.',
    createdAt: '2026-06-12T00:00:00Z',
  },
]

export function getDecisionsForProject(projectId: string): Decision[] {
  return decisions.filter((d) => d.projectId === projectId)
}

// ─── Risks ───────────────────────────────────────────────────────────────────

export const risks: Risk[] = [
  {
    id: 'r1', projectId: 'founderos',
    title: 'OpenAI API cost at scale',
    description: 'If users chat heavily, API costs could become unsustainable before we have revenue to offset them.',
    severity: 'high',
    mitigation: 'Implement per-user rate limiting early. Cache repeated queries. Plan a paid tier before costs become a problem.',
    status: 'open',
    createdAt: '2026-06-05T00:00:00Z',
  },
  {
    id: 'r2', projectId: 'founderos',
    title: 'Low Day-7 retention if habit loop is weak',
    description: 'If users don\'t feel clear value in the first session, they won\'t return. The product lives or dies on forming a daily check-in habit.',
    severity: 'high',
    mitigation: 'Design onboarding to create a meaningful win in under 2 minutes. Track Day-1 and Day-7 retention from the start.',
    status: 'open',
    createdAt: '2026-06-06T00:00:00Z',
  },
  {
    id: 'r3', projectId: 'founderos',
    title: 'Scope creep delays V1 launch',
    description: 'New feature ideas keep getting added. If unchecked, V1 never ships.',
    severity: 'medium',
    mitigation: 'Hard scope freeze after core loop works. All new ideas go to a V2 backlog list, not the V1 board.',
    status: 'mitigated',
    createdAt: '2026-06-07T00:00:00Z',
  },
  {
    id: 'r4', projectId: 'pitch-deck',
    title: 'Deck is too technical for non-technical angels',
    description: 'Leading with the AI tech stack could lose investors who care more about the market and founder than the technology.',
    severity: 'medium',
    mitigation: 'Lead with pain, user story, and vision. Mention the tech stack in one slide only, as proof of feasibility.',
    status: 'mitigated',
    createdAt: '2026-06-11T00:00:00Z',
  },
  {
    id: 'r5', projectId: 'launch-plan',
    title: 'Low Product Hunt ranking due to lack of upvoters',
    description: 'Without an existing audience, the PH launch could flop and damage early credibility.',
    severity: 'high',
    mitigation: 'Build a pre-launch list of 50+ engaged people who will upvote on day one. Warm them up in the week before launch.',
    status: 'open',
    createdAt: '2026-06-12T00:00:00Z',
  },
]

export function getRisksForProject(projectId: string): Risk[] {
  return risks.filter((r) => r.projectId === projectId)
}

// ─── Roadmap ─────────────────────────────────────────────────────────────────

export const roadmapItems: RoadmapItem[] = [
  // FounderOS
  {
    id: 'rm1', projectId: 'founderos',
    title: 'Foundation',
    description: 'Database schema, auth, project CRUD, and core layout. The skeleton everything else is built on.',
    stage: 'Phase 1',
    status: 'done',
    sortOrder: 1,
    createdAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'rm2', projectId: 'founderos',
    title: 'AI Chat',
    description: 'OpenAI-powered chat inside each project. Streaming responses. Full project context in the system prompt.',
    stage: 'Phase 2',
    status: 'in_progress',
    sortOrder: 2,
    createdAt: '2026-06-05T00:00:00Z',
  },
  {
    id: 'rm3', projectId: 'founderos',
    title: 'Structured Extraction',
    description: 'Convert AI responses into tasks, notes, decisions, and risks with one click. Each item traces back to the message that created it.',
    stage: 'Phase 2',
    status: 'in_progress',
    sortOrder: 3,
    createdAt: '2026-06-06T00:00:00Z',
  },
  {
    id: 'rm4', projectId: 'founderos',
    title: 'Weekly Review',
    description: 'AI-generated weekly summary across all projects. What did you ship? What\'s blocked? What\'s next?',
    stage: 'Phase 3',
    status: 'planned',
    sortOrder: 4,
    createdAt: '2026-06-07T00:00:00Z',
  },
  {
    id: 'rm5', projectId: 'founderos',
    title: 'Public Launch',
    description: 'Polished landing page, waitlist, streamlined onboarding, and first 100 paying users.',
    stage: 'Phase 4',
    status: 'planned',
    sortOrder: 5,
    createdAt: '2026-06-08T00:00:00Z',
  },

  // Pitch Deck
  {
    id: 'rm6', projectId: 'pitch-deck',
    title: 'First draft complete',
    description: 'All 10 slides written. Problem, solution, market, product, competition, traction, team, roadmap, financials, ask.',
    stage: 'Draft',
    status: 'in_progress',
    sortOrder: 1,
    createdAt: '2026-06-10T00:00:00Z',
  },
  {
    id: 'rm7', projectId: 'pitch-deck',
    title: 'Founder feedback round',
    description: 'Share with 3–5 trusted founders for honest feedback. Revise based on what\'s unclear or unconvincing.',
    stage: 'Review',
    status: 'planned',
    sortOrder: 2,
    createdAt: '2026-06-11T00:00:00Z',
  },
  {
    id: 'rm8', projectId: 'pitch-deck',
    title: 'Investor outreach begins',
    description: 'Send to 20 target angels. Track opens, responses, and meeting requests.',
    stage: 'Outreach',
    status: 'planned',
    sortOrder: 3,
    createdAt: '2026-06-12T00:00:00Z',
  },

  // Launch Plan
  {
    id: 'rm9', projectId: 'launch-plan',
    title: 'Pre-launch prep',
    description: 'Waitlist landing page live. 50+ people primed to support launch day.',
    stage: 'Pre-launch',
    status: 'planned',
    sortOrder: 1,
    createdAt: '2026-06-12T00:00:00Z',
  },
  {
    id: 'rm10', projectId: 'launch-plan',
    title: 'Launch day',
    description: 'Product Hunt post live. Twitter/X thread published. Email sent to waitlist.',
    stage: 'Launch',
    status: 'planned',
    sortOrder: 2,
    createdAt: '2026-06-13T00:00:00Z',
  },
]

export function getRoadmapForProject(projectId: string): RoadmapItem[] {
  return roadmapItems
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export const chatMessages: Record<string, Message[]> = {
  founderos: [
    {
      id: 'm1', role: 'user',
      content: 'Help me plan the first sprint for FounderOS. What should I focus on?',
      createdAt: '2026-06-05T10:00:00Z',
    },
    {
      id: 'm2', role: 'assistant',
      content: `Great question. Based on your V1 goal, here's what I'd focus on for Sprint 1:

**Core infrastructure (must-have)**
- Supabase schema and auth setup
- Project CRUD API routes
- App layout: sidebar, topbar, route groups

**AI chat (the core value)**
- Chat UI with message history per project
- OpenAI API with streaming responses
- Store messages in Supabase

**Structured extraction (the differentiator)**
- Let users save AI responses as tasks, notes, or decisions
- Link each extracted item back to the source message

**What to skip in Sprint 1**
- Weekly Review, Idea Vault — these can wait
- Mobile — desktop only for now
- Team / collaboration features

Want me to turn these into formal tasks, or identify the biggest risks in this plan?`,
      createdAt: '2026-06-05T10:01:00Z',
    },
    {
      id: 'm3', role: 'user',
      content: 'Yes, create tasks for the core infrastructure items.',
      createdAt: '2026-06-05T10:03:00Z',
    },
    {
      id: 'm4', role: 'assistant',
      content: `Here are 5 tasks I'd suggest for core infrastructure — ordered by dependency:

1. **Set up Supabase schema** — projects, messages, tasks, notes, decisions, risks tables with RLS
2. **Add Supabase Auth** — email/password login, session handling in middleware
3. **Project CRUD API routes** — POST, GET, PATCH, DELETE for /api/projects
4. **Build app layout** — sidebar, topbar, (app) route group wrapper
5. **Project detail layout** — tabs: Chat, Tasks, Notes, Decisions, Risks, Roadmap

These are in dependency order. You can't build project pages without the layout, and you can't test auth without the schema.

Shall I also draft the Supabase SQL schema for all these tables?`,
      createdAt: '2026-06-05T10:04:00Z',
    },
  ],
  'pitch-deck': [
    {
      id: 'pm1', role: 'user',
      content: 'What should be on slide 1 of my pitch deck?',
      createdAt: '2026-06-11T09:00:00Z',
    },
    {
      id: 'pm2', role: 'assistant',
      content: `Slide 1 is your title slide — but it's also your first impression, so make it count.

**What to include:**
- Company name: FounderOS
- One-liner that makes them want to see slide 2
- Your name + contact
- Logo if you have one

**What makes a great one-liner for pre-seed angels:**
- Lead with the user and outcome, not the technology
- Avoid buzzwords: "AI-powered", "next-gen", "disruptive"
- Example: "FounderOS turns scattered ideas into structured projects — with AI doing the organising"

The goal of slide 1 is just to make them curious enough to keep watching. Don't over-explain.

Want me to help sharpen your one-liner, or move to the problem slide?`,
      createdAt: '2026-06-11T09:01:00Z',
    },
  ],
  'launch-plan': [],
}

export function getChatMessages(projectId: string): Message[] {
  return chatMessages[projectId] ?? []
}
