import Link from 'next/link'
import { FolderKanban, CheckSquare, Lightbulb, TrendingUp } from 'lucide-react'

const stats = [
  { label: 'Active Projects', value: '0', icon: FolderKanban, href: '/projects' },
  { label: 'Open Tasks', value: '0', icon: CheckSquare, href: '/projects' },
  { label: 'Ideas', value: '0', icon: Lightbulb, href: '/ideas' },
  { label: 'This Week', value: '0', icon: TrendingUp, href: '/review' },
]

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Good morning 👋</h1>
        <p className="mt-1 text-sm text-zinc-500">Here's what's going on with your projects.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col gap-3 hover:border-zinc-300 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
              <Icon size={15} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-700">Recent Projects</h2>
          <Link href="/projects" className="text-xs text-zinc-400 hover:text-zinc-600">
            View all →
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          <div className="px-5 py-10 text-center text-sm text-zinc-400">
            No projects yet.{' '}
            <Link href="/projects" className="text-zinc-600 underline underline-offset-2">
              Create your first one.
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
