import Link from 'next/link'
import {
  Lightbulb, FolderKanban, MessageSquare, CheckSquare, FileText, GitFork,
  AlertTriangle, Map, Network, Sparkles, CalendarCheck2, Dna, GitBranch, Command,
} from 'lucide-react'

const LOOP = ['Capture', 'Organise', 'Plan', 'Execute', 'Review', 'Improve'] as const

const FEATURES = [
  {
    icon: Lightbulb,
    title: 'Idea Vault',
    desc: 'Capture raw ideas, analyse them with AI, and convert the best ones into projects.',
  },
  {
    icon: FolderKanban,
    title: 'Projects',
    desc: 'Each project is an execution system with chat, tasks, notes, decisions, risks, roadmap and files.',
  },
  {
    icon: MessageSquare,
    title: 'AI Chat',
    desc: 'Chat with AI in full project context — goals, tasks, risks and linked memory.',
  },
  {
    icon: CheckSquare,
    title: 'Structured Objects',
    desc: 'Convert AI responses into tasks, notes, decisions, risks and roadmap items in one click.',
  },
  {
    icon: FileText,
    title: 'Files',
    desc: 'Upload documents, get AI summaries, and connect files to project memory.',
  },
  {
    icon: Network,
    title: 'Memory Graph',
    desc: 'See how ideas, chats, files, decisions and tasks connect across your workspace.',
  },
  {
    icon: Sparkles,
    title: 'Project Reviews',
    desc: 'Generate structured reviews with next steps, risks and focus areas for one project.',
  },
  {
    icon: CalendarCheck2,
    title: 'Weekly Reviews',
    desc: 'Review your whole workspace and decide what to focus on next week.',
  },
  {
    icon: Dna,
    title: 'Project DNA',
    desc: 'A living profile of each project\'s identity, evolution and strategic direction.',
  },
  {
    icon: GitBranch,
    title: 'Pattern Detection',
    desc: 'Cross-project insights about recurring strengths, bottlenecks and how you work.',
  },
  {
    icon: Command,
    title: 'Command Bar',
    desc: 'Search everything and navigate fast with ⌘K from anywhere in the app.',
  },
] as const

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <nav className="px-8 h-16 flex items-center justify-between border-b border-zinc-100 max-w-5xl mx-auto w-full">
        <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900">FounderOS</Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium text-white bg-zinc-900 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      <div className="flex-1 px-6 py-16 max-w-5xl mx-auto w-full space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900">How FounderOS works</h1>
          <p className="text-zinc-500 leading-relaxed">
            FounderOS is an AI operating system that turns your ideas, chats, notes and files into structured
            projects — then helps you review, learn and improve over time.
          </p>
        </div>

        <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-8 text-center">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">The core loop</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {LOOP.map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-800">
                  {step}
                </span>
                {i < LOOP.length - 1 && <span className="text-zinc-300 hidden sm:inline">→</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-50 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{title}</p>
                  <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </div>
    </main>
  )
}
