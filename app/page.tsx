import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900">FounderOS</h1>
        <p className="text-lg text-zinc-500 max-w-sm mx-auto">
          Your personal AI operating system for building things that matter.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
        >
          Open Dashboard →
        </Link>
      </div>
    </main>
  )
}
