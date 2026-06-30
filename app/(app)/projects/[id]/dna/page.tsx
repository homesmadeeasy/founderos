'use client'

import { useState } from 'react'
import { Dna, AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import DnaCard from '@/components/dna/DnaCard'
import StatusBadge from '@/components/ui/StatusBadge'
import type { ProjectDna } from '@/lib/types'

export default function ProjectDnaPage() {
  const {
    project, tasks, notes, decisions, risks, roadmapItems, messages,
    dnaProfiles, dnaLoading, dnaError, prependDna, reloadDna,
  } = useProjectContext()
  const { reload } = useAppContext()

  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState<string | null>(null)

  async function generate() {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/project-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Could not generate Project DNA. Please try again.')
      }
      const data = await res.json() as { dna: ProjectDna }
      prependDna(data.dna)
      await reload()
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const [latest, ...previous] = dnaProfiles
  const hasHistory = tasks.length + notes.length + decisions.length + risks.length + messages.length > 0

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-zinc-900">Project DNA</h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
            Living profile of this project — identity, evolution and strategic direction over time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Dna size={14} />}
          {generating ? 'Generating…' : latest ? 'Update DNA' : 'Generate DNA'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">What informs DNA</p>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <StatusBadge status={project.status} size="md" />
          <StatusBadge status={project.priority} size="md" />
          <span className="text-xs text-zinc-400">{project.progress}% progress</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
          <Stat label="Tasks" value={tasks.length} />
          <Stat label="Notes" value={notes.length} />
          <Stat label="Decisions" value={decisions.length} />
          <Stat label="Risks" value={risks.length} />
          <Stat label="Roadmap" value={roadmapItems.length} />
          <Stat label="Messages" value={messages.length} />
        </div>
      </div>

      {generating && (
        <div className="bg-white rounded-xl border border-zinc-100 py-14 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center">
            <Dna size={20} className="text-violet-400 animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">FounderOS is building your Project DNA…</p>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
            Analysing origin, decisions, risks, reviews, files and memory links.
          </p>
        </div>
      )}

      {genError && !generating && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700 leading-relaxed">{genError}</p>
            <button
              type="button"
              onClick={() => void generate()}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <RotateCcw size={11} /> Try again
            </button>
          </div>
        </div>
      )}

      {dnaLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-zinc-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading Project DNA…</span>
        </div>
      ) : dnaError ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700 leading-relaxed">{dnaError}</p>
            <button
              type="button"
              onClick={() => void reloadDna()}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <RotateCcw size={11} /> Retry
            </button>
          </div>
        </div>
      ) : dnaProfiles.length === 0 ? (
        !generating && (
          <div className="bg-white rounded-xl border border-zinc-100 py-16 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center">
              <Dna size={20} className="text-violet-300" />
            </div>
            <p className="text-sm font-semibold text-zinc-700">No Project DNA yet</p>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              {hasHistory
                ? 'Project DNA becomes more useful as your project gains history through tasks, decisions, risks, files and reviews.'
                : 'Project DNA becomes more useful as your project gains history through tasks, decisions, risks, files and reviews.'}
            </p>
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Latest DNA</h2>
            <DnaCard dna={latest} />
          </div>
          {previous.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Previous versions ({previous.length})
              </h2>
              {previous.map(d => <DnaCard key={d.id} dna={d} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-zinc-50 rounded-lg py-2">
      <p className="text-sm font-bold text-zinc-800">{value}</p>
      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</p>
    </div>
  )
}
