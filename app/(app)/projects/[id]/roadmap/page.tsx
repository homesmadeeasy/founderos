'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Trash2, Map } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { RoadmapItem, RoadmapStatus } from '@/lib/types'

const STATUS_CYCLE: Record<RoadmapStatus, RoadmapStatus> = {
  planned: 'in_progress',
  in_progress: 'done',
  done: 'planned',
}

const STATUS_ACTION: Record<RoadmapStatus, string> = {
  planned: '→ Start',
  in_progress: '→ Mark done',
  done: '↩ Reopen',
}

const STATUS_DOT: Record<RoadmapStatus, string> = {
  planned:     'bg-zinc-300',
  in_progress: 'bg-blue-400',
  done:        'bg-emerald-400',
}

export default function RoadmapPage() {
  const { project, roadmapItems } = useProjectContext()
  const { updateRoadmapItem, deleteRoadmapItem } = useAppContext()
  const [pendingDelete, setPendingDelete] = useState<RoadmapItem | null>(null)

  const cycleStatus = (item: RoadmapItem) =>
    void updateRoadmapItem(item.id, { status: STATUS_CYCLE[item.status] }).catch(() => {})

  if (roadmapItems.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-zinc-100 py-20 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
            <Map size={20} className="text-zinc-300" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">No roadmap yet</p>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">Roadmap items help you plan what comes now, next and later.</p>
          <Link href={`/projects/${project.id}/chat`} className="mt-2 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors flex items-center gap-1.5">
            <MessageSquare size={12} /> Open chat
          </Link>
        </div>
      </div>
    )
  }

  // Group by stage
  const stages = Array.from(new Set(roadmapItems.map(r => r.stage)))

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Roadmap <span className="text-zinc-400 font-normal">({roadmapItems.length} items)</span></h2>
        <Link href={`/projects/${project.id}/chat`} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
          <MessageSquare size={11} /> Add via chat
        </Link>
      </div>

      {stages.map(stage => {
        const items = roadmapItems.filter(r => r.stage === stage)
        return (
          <div key={stage} className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{stage}</h3>
            <div className="relative pl-5">
              {/* Timeline line */}
              <div className="absolute left-2 top-0 bottom-0 w-px bg-zinc-100" />

              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className={`relative bg-white rounded-xl border px-5 py-4 group transition-colors ${item.status === 'done' ? 'border-zinc-100 opacity-70' : 'border-zinc-100 hover:border-zinc-200'}`}>
                    {/* Timeline dot */}
                    <div className={`absolute -left-[11px] top-5 w-3 h-3 rounded-full border-2 border-white ${STATUS_DOT[item.status]}`} />

                    <button
                      onClick={() => setPendingDelete(item)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                      title="Delete roadmap item"
                    >
                      <Trash2 size={11} />
                    </button>

                    <div className="flex items-start gap-2 mb-1.5 pr-6">
                      <p className={`text-sm font-semibold text-zinc-800 flex-1 ${item.status === 'done' ? 'line-through text-zinc-400' : ''}`}>{item.title}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.description && (
                      <p className="text-xs text-zinc-500 leading-relaxed mb-2">{item.description}</p>
                    )}
                    <button
                      onClick={() => cycleStatus(item)}
                      className="text-xs text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 px-2 py-1 rounded-md transition-colors"
                    >
                      {STATUS_ACTION[item.status]}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this roadmap item?"
        description={pendingDelete ? `“${pendingDelete.title}” will be permanently removed.` : ''}
        confirmLabel="Delete item"
        onConfirm={async () => { if (pendingDelete) { await deleteRoadmapItem(pendingDelete.id); setPendingDelete(null) } }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
