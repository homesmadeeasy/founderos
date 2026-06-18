import Link from 'next/link'
import { getDecisionsForProject } from '@/lib/mock-data'
import PageHeader from '@/components/ui/PageHeader'
import { Plus, GitBranch } from 'lucide-react'

export default async function ProjectDecisionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const decisions = getDecisionsForProject(id)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Decisions"
        description="Log key choices and the reasoning behind them."
        action={
          <button className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
            <Plus size={13} />
            Log Decision
          </button>
        }
      />

      {decisions.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 gap-3 text-center">
          <GitBranch size={22} className="text-zinc-300" />
          <div>
            <p className="text-sm font-medium text-zinc-700">No decisions logged yet</p>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Use{' '}
              <Link href={`/projects/${id}/chat`} className="text-zinc-600 underline underline-offset-2 hover:text-zinc-800">
                Chat
              </Link>{' '}
              to think through decisions with AI, then log the outcome and reasoning here.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {decisions.map((d, i) => (
            <div key={d.id} className="px-5 py-5 flex gap-4">
              <span className="shrink-0 mt-0.5 text-xs font-semibold text-zinc-300 w-6 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-zinc-800">{d.decision}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{d.reasoning}</p>
                <p className="text-xs text-zinc-400">
                  {new Date(d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
