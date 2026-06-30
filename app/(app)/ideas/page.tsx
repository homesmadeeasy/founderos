'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Lightbulb, Search, Pencil, Trash2, TrendingUp, Gauge, Sparkles, FolderKanban, ExternalLink } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import { createClient } from '@/lib/supabase/client'
import IdeaModal from '@/components/idea/IdeaModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'
import EmptyState from '@/components/ui/EmptyState'
import { IDEA_STATUSES } from '@/lib/types'
import type { Idea } from '@/lib/types'

export default function IdeasPage() {
  const { appState, isHydrated, loadError, deleteIdea } = useAppContext()
  const [showCreate, setShowCreate] = useState(false)
  const [editIdea, setEditIdea]     = useState<Idea | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Idea | null>(null)
  const [query, setQuery]   = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [analysedIds, setAnalysedIds] = useState<Set<string>>(new Set())

  const ideas = appState.ideas

  useEffect(() => {
    if (!isHydrated) return
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase.from('idea_analyses').select('idea_id')
      if (data) setAnalysedIds(new Set(data.map(r => r.idea_id)))
    })()
  }, [isHydrated])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ideas.filter(i => {
      if (filter !== 'all' && i.status !== filter) return false
      if (!q) return true
      return (
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      )
    })
  }, [ideas, query, filter])

  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading your ideas…" /></div>
  if (loadError)   return <div className="p-6"><ErrorScreen message={loadError} /></div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Idea Vault</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Capture ideas before they become projects.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <Plus size={13} /> Create Idea
        </button>
      </div>

      {ideas.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search ideas or tags…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors"
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white outline-none focus:border-zinc-400 transition-colors"
          >
            <option value="all">All statuses</option>
            {IDEA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {ideas.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-100">
          <EmptyState
            icon={Lightbulb}
            title="No ideas yet"
            description="Capture raw ideas here. FounderOS can analyse them and turn the best ones into structured projects."
            action={{ label: 'Create Idea', onClick: () => setShowCreate(true) }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-100">
          <EmptyState icon={Search} title="No matches" description="Try a different search term or status filter." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(idea => {
            const hasAnalysis = analysedIds.has(idea.id)
            const turnedIntoProject = idea.status === 'Turned Into Project'
            const canTurnIntoProject = hasAnalysis && !turnedIntoProject

            return (
              <div key={idea.id} className="group relative bg-white rounded-xl border border-zinc-100 hover:border-zinc-300 hover:shadow-sm transition-all flex flex-col">
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => setEditIdea(idea)}
                    className="w-6 h-6 flex items-center justify-center text-zinc-300 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                    title="Edit idea"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => setPendingDelete(idea)}
                    className="w-6 h-6 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete idea"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                <Link href={`/ideas/${idea.id}`} className="block p-5 space-y-3 flex-1">
                  <p className="text-sm font-semibold text-zinc-800 pr-8 line-clamp-2">{idea.title}</p>
                  {idea.description ? (
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{idea.description}</p>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No description yet</p>
                  )}

                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-emerald-600" title="Potential">
                      <TrendingUp size={12} /> {idea.potentialScore}/10
                    </span>
                    <span className="flex items-center gap-1 text-orange-600" title="Difficulty">
                      <Gauge size={12} /> {idea.difficultyScore}/10
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={idea.status} />
                    {hasAnalysis && (
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">Analysed</span>
                    )}
                    {turnedIntoProject && (
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">→ Project</span>
                    )}
                    {idea.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] font-medium text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5">{tag}</span>
                    ))}
                  </div>
                </Link>

                <div className="flex items-center gap-1.5 px-4 pb-4 pt-2 border-t border-zinc-100">
                  <Link
                    href={`/ideas/${idea.id}`}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                  >
                    <ExternalLink size={10} /> Open
                  </Link>
                  {!hasAnalysis && (
                    <Link
                      href={`/ideas/${idea.id}`}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                    >
                      <Sparkles size={10} /> Analyse
                    </Link>
                  )}
                  {canTurnIntoProject && (
                    <Link
                      href={`/ideas/${idea.id}`}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-md hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                    >
                      <FolderKanban size={10} /> Turn into Project
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && <IdeaModal onClose={() => setShowCreate(false)} />}
      {editIdea && <IdeaModal idea={editIdea} onClose={() => setEditIdea(null)} />}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this idea?"
        description={pendingDelete ? `“${pendingDelete.title}” and its analyses will be permanently removed.` : ''}
        confirmLabel="Delete idea"
        onConfirm={async () => { if (pendingDelete) { await deleteIdea(pendingDelete.id); setPendingDelete(null) } }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
