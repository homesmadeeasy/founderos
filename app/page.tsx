import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="px-8 h-16 flex items-center justify-between border-b border-zinc-100 max-w-6xl mx-auto w-full">
        <span className="text-sm font-bold tracking-tight text-zinc-900">FounderOS</span>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          Open app →
        </Link>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-xs font-medium text-zinc-500 mb-6">
          V1 — Work in progress
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900 max-w-3xl leading-tight">
          Your personal AI <br />operating system
        </h1>

        <p className="mt-6 text-lg text-zinc-500 max-w-xl leading-relaxed">
          FounderOS helps builders, founders, and students turn ideas, chats, and notes
          into structured projects — with AI doing the heavy lifting.
        </p>

        <div className="mt-10 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Get started →
          </Link>
          <Link
            href="/projects/founderos"
            className="px-6 py-3 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            See a demo project
          </Link>
        </div>

        {/* Feature list */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl text-left">
          {[
            {
              title: 'Chat inside projects',
              desc: 'Every project has its own AI chat with full context of your goals and progress.',
            },
            {
              title: 'Extract structured outputs',
              desc: 'Convert AI responses into tasks, notes, decisions, and risks with one click.',
            },
            {
              title: 'Capture → Review loop',
              desc: 'Weekly summaries keep you on track. Nothing falls through the cracks.',
            },
          ].map(({ title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-zinc-200 bg-white">
              <p className="text-sm font-semibold text-zinc-800">{title}</p>
              <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
