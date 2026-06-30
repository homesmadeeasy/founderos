import Link from 'next/link'
import {
  Lightbulb, MessageSquare, Sparkles, ArrowRight, GitBranch, FolderKanban,
} from 'lucide-react'

const TAGLINE =
  'FounderOS is an AI operating system that turns your ideas, chats, notes and files into structured projects, tasks, decisions, risks, roadmaps and progress.'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <nav className="px-8 h-16 flex items-center justify-between border-b border-zinc-100 max-w-6xl mx-auto w-full">
        <span className="text-sm font-bold tracking-tight text-zinc-900">FounderOS</span>
        <div className="flex items-center gap-4">
          <Link href="/how-it-works" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors hidden sm:inline">
            How it works
          </Link>
          <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
            Log in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="px-6 py-20 max-w-6xl mx-auto w-full">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-xs font-medium text-zinc-500 mb-6">
            For builders, founders & ambitious students
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 leading-tight">
            Your personal AI operating system
          </h1>

          <p className="mt-6 text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            {TAGLINE}
          </p>

          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/signup"
              className="px-6 py-3 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>

        {/* What / How / Who / Why */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Section
            title="What FounderOS does"
            icon={FolderKanban}
            items={[
              'Captures ideas before they disappear',
              'Turns AI chat into tasks, notes, decisions and risks',
              'Tracks projects with reviews, DNA and cross-project patterns',
            ]}
          />
          <Section
            title="How it works"
            icon={ArrowRight}
            items={[
              'Capture → Organise → Plan → Execute → Review → Improve',
              'Ideas live in Idea Vault until you convert them to projects',
              'Project chat + extraction keeps structure and momentum',
            ]}
          />
          <Section
            title="Who it is for"
            icon={Lightbulb}
            items={[
              'Young founders shipping their first product',
              'Students building side projects and learning fast',
              'Builders who want more than a blank ChatGPT window',
            ]}
          />
          <Section
            title="Why it is different"
            icon={GitBranch}
            items={[
              'Normal AI chat forgets context — FounderOS remembers across projects',
              'Structured objects, memory links and reviews create compounding progress',
              'Pattern detection learns how you work across your whole workspace',
            ]}
          />
        </div>

        {/* Feature highlights */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: MessageSquare,
              title: 'Chat inside projects',
              desc: 'Every project has AI chat with full context of goals, tasks and progress.',
            },
            {
              icon: Sparkles,
              title: 'Extract structured outputs',
              desc: 'Convert AI responses into tasks, notes, decisions, risks and roadmap items.',
            },
            {
              icon: GitBranch,
              title: 'Review & improve',
              desc: 'Project reviews, weekly reviews, DNA and patterns help you get sharper over time.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-zinc-200 bg-white">
              <div className="w-9 h-9 rounded-lg bg-zinc-50 flex items-center justify-center mb-3">
                <Icon size={16} className="text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-800">{title}</p>
              <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/how-it-works"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Learn how FounderOS works →
          </Link>
        </div>
      </div>
    </main>
  )
}

function Section({
  title, icon: Icon, items,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  items: string[]
}) {
  return (
    <div className="p-6 rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-zinc-500" />
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      </div>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item} className="flex items-start gap-2 text-sm text-zinc-600 leading-relaxed">
            <span className="mt-2 w-1 h-1 rounded-full bg-zinc-300 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
