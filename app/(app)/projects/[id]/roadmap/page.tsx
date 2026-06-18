import Link from 'next/link'
import { getRoadmapForProject } from '@/lib/mock-data'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { Plus, Map } from 'lucide-react'

const statusDot: Record<string, string> = {
  planned:     'bg-zinc-300',
  in_progress: 'bg-blue-400',
  done:        'bg-emerald-400',
}

export default async function ProjectRoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const items = getRoadmapForProject(id)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roadmap"
        description="Phases and milestones for this project."
        action={
          <button className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
            <Plus size={13} />
            Add Milestone
          </button>
        }
      />

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Map size={22} className="text-zinc-300" />
          <div>
            <p className="text-sm font-medium text-zinc-700">No milestones planned yet</p>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Use{' '}
              <Link href={`/projects/${id}/chat`} className="text-zinc-600 underline underline-offset-2 hover:text-zinc-800">
                Chat
              </Link>{' '}
              to plan your roadmap with AI, then add milestones here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.id} className="flex gap-4">
              <div className="flex flex-col items-center pt-4">
                <div className={`w-3 h-3 rounded-full shrink-0 ${statusDot[item.status]}`} />
                {i < items.length - 1 && <div className="w-px flex-1 bg-zinc-200 mt-1" />}
              </div>
              <div className="flex-1 bg-white rounded-xl border border-zinc-200 p-4 mb-3 space-y-2 hover:border-zinc-300 transition-colors">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {item.stage && (
                      <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                        {item.stage}
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-zinc-800">{item.title}</h3>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                {item.description && (
                  <p className="text-sm text-zinc-500 leading-relaxed">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
