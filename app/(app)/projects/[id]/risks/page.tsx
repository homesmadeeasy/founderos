'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Trash2, AlertTriangle } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import LinkButton from '@/components/memory/LinkButton'
import type { Risk, RiskStatus } from '@/lib/types'

const STATUS_CYCLE: Record<RiskStatus, RiskStatus> = {
  open: 'mitigated',
  mitigated: 'closed',
  closed: 'open',
}

const STATUS_ACTION: Record<RiskStatus, string> = {
  open: 'Mark mitigated',
  mitigated: 'Mark closed',
  closed: 'Reopen',
}

export default function RisksPage() {
  const { project, risks }  = useProjectContext()
  const { updateRisk, deleteRisk } = useAppContext()
  const [pendingDelete, setPendingDelete] = useState<Risk | null>(null)

  const cycleStatus = (risk: Risk) =>
    void updateRisk(risk.id, { status: STATUS_CYCLE[risk.status] }).catch(() => {})

  const open      = risks.filter(r => r.status === 'open')
  const mitigated = risks.filter(r => r.status === 'mitigated')
  const closed    = risks.filter(r => r.status === 'closed')

  if (risks.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-zinc-100 py-20 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-zinc-300" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">No risks identified</p>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">Identify risks early so you can avoid problems.</p>
          <Link href={`/projects/${project.id}/chat`} className="mt-2 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors flex items-center gap-1.5">
            <MessageSquare size={12} /> Open chat
          </Link>
        </div>
      </div>
    )
  }

  function RiskCard({ risk }: { risk: typeof risks[0] }) {
    return (
      <div className={`bg-white rounded-xl border px-5 py-4 group relative transition-colors ${risk.status === 'closed' ? 'border-zinc-100 opacity-60' : 'border-zinc-100 hover:border-zinc-200'}`}>
        <button
          onClick={() => setPendingDelete(risk)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
          title="Delete risk"
        >
          <Trash2 size={11} />
        </button>
        <div className="flex items-start gap-2 pr-6 mb-2">
          <h3 className="text-sm font-semibold text-zinc-800 flex-1">{risk.title}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={risk.severity} />
            <StatusBadge status={risk.status} />
          </div>
        </div>
        {risk.description && (
          <p className="text-xs text-zinc-500 leading-relaxed mb-2">{risk.description}</p>
        )}
        {risk.mitigation && (
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2 mb-3">
            <p className="text-xs font-medium text-zinc-400 mb-0.5">Mitigation</p>
            <p className="text-xs text-zinc-600 leading-relaxed">{risk.mitigation}</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => cycleStatus(risk)}
            className="text-xs text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 px-2 py-1 rounded-md transition-colors"
          >
            {STATUS_ACTION[risk.status]}
          </button>
          <LinkButton type="risk" id={risk.id} label={risk.title} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">Risks <span className="text-zinc-400 font-normal">({risks.length})</span></h2>
          {open.length > 0 && <span className="text-xs font-medium text-red-500">{open.length} open</span>}
          {mitigated.length > 0 && <span className="text-xs font-medium text-yellow-600">{mitigated.length} mitigated</span>}
        </div>
        <Link href={`/projects/${project.id}/chat`} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
          <MessageSquare size={11} /> Add via chat
        </Link>
      </div>

      {open.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider">Open</h3>
          {open.map(r => <RiskCard key={r.id} risk={r} />)}
        </div>
      )}

      {mitigated.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">Mitigated</h3>
          {mitigated.map(r => <RiskCard key={r.id} risk={r} />)}
        </div>
      )}

      {closed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Closed</h3>
          {closed.map(r => <RiskCard key={r.id} risk={r} />)}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this risk?"
        description={pendingDelete ? `“${pendingDelete.title}” will be permanently removed.` : ''}
        confirmLabel="Delete risk"
        onConfirm={async () => { if (pendingDelete) { await deleteRisk(pendingDelete.id); setPendingDelete(null) } }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
