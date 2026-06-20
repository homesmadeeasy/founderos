'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Trash2, GitFork } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import LinkButton from '@/components/memory/LinkButton'
import type { Decision } from '@/lib/types'

export default function DecisionsPage() {
  const { project, decisions } = useProjectContext()
  const { deleteDecision }      = useAppContext()
  const [pendingDelete, setPendingDelete] = useState<Decision | null>(null)

  if (decisions.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-zinc-100 py-20 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
            <GitFork size={20} className="text-zinc-300" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">No decisions logged</p>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">Track important choices so the project has memory.</p>
          <Link href={`/projects/${project.id}/chat`} className="mt-2 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors flex items-center gap-1.5">
            <MessageSquare size={12} /> Open chat
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Decisions <span className="text-zinc-400 font-normal">({decisions.length})</span></h2>
        <Link href={`/projects/${project.id}/chat`} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
          <MessageSquare size={11} /> Add via chat
        </Link>
      </div>

      <div className="space-y-3">
        {decisions.map((d, i) => (
          <div key={d.id} className="bg-white rounded-xl border border-zinc-100 p-5 hover:border-zinc-200 transition-colors group relative">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
              <LinkButton type="decision" id={d.id} label={d.decision} />
              <button
                onClick={() => setPendingDelete(d)}
                className="w-6 h-6 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Delete decision"
              >
                <Trash2 size={11} />
              </button>
            </div>

            <div className="flex items-start gap-3 pr-6">
              <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-zinc-800 leading-snug">{d.decision}</p>
                {d.reasoning && (
                  <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
                    <p className="text-xs font-medium text-zinc-400 mb-1">Reasoning</p>
                    <p className="text-xs text-zinc-600 leading-relaxed">{d.reasoning}</p>
                  </div>
                )}
                <p className="text-xs text-zinc-300">{new Date(d.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this decision?"
        description={pendingDelete ? `“${pendingDelete.decision}” will be permanently removed.` : ''}
        confirmLabel="Delete decision"
        onConfirm={async () => { if (pendingDelete) { await deleteDecision(pendingDelete.id); setPendingDelete(null) } }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
