'use client'

import Link from 'next/link'
import { useProjectContext } from '@/contexts/ProjectContext'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { Plus, AlertTriangle } from 'lucide-react'

export default function ProjectRisksPage() {
  const { project, risks } = useProjectContext()

  return (
    <div className="space-y-5">
      <PageHeader
        title="Risks"
        description="Identify, track, and mitigate what could go wrong."
        action={
          <button className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
            <Plus size={13} /> Add Risk
          </button>
        }
      />

      {risks.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 gap-3 text-center">
          <AlertTriangle size={22} className="text-zinc-300" />
          <div>
            <p className="text-sm font-medium text-zinc-700">No risks identified yet</p>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Ask AI in{' '}
              <Link href={`/projects/${project.id}/chat`} className="text-zinc-600 underline underline-offset-2">Chat</Link>
              {' '}to identify potential risks, then click <strong>Risk</strong> to add them here.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {risks.map((risk) => (
            <div key={risk.id} className="px-5 py-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold text-zinc-800">{risk.title}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={risk.severity} />
                  <StatusBadge status={risk.status} />
                </div>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">{risk.description}</p>
              {risk.mitigation && (
                <div className="bg-zinc-50 rounded-lg px-4 py-3 border border-zinc-200">
                  <p className="text-xs font-semibold text-zinc-500 mb-1">Mitigation</p>
                  <p className="text-sm text-zinc-600 leading-relaxed">{risk.mitigation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
