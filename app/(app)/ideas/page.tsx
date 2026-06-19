'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Lightbulb, Search, Pencil, Trash2, TrendingUp, Gauge } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import IdeaModal from '@/components/idea/IdeaModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'
import { IDEA_STATUSES } from '@/lib/types'
import type { Idea } from '@/lib/types'

export default function IdeasPage() {
  const { appState, isHydrated, loadError, deleteIdea } = useAppContext()
  const [showCreate, setShowCreate] = useState(false)
  const [editIdea, setEditIdea]     = useState<Idea | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Idea | null>(null)
  const [query, setQuery]   = useState('')
  const [filter, setFilter] = useState<string>('all')

  const ideas = appState.ideas

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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Idea Vault</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Capture raw ideas, then let FounderOS help shape the best ones.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <Plus size={13} /> Create Idea
        </button>
      </div>

      {/* Search + filter */}
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

      {/* List */}
      {ideas.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
            <Lightbulb size={22} className="text-zinc-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-700">No ideas yet</p>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs leading-relaxed">No ideas yet. Capture your first idea and let FounderOS help shape it.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <Plus size={13} /> Create Idea
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-100 py-16 text-center text-sm text-zinc-400">
          No ideas match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(idea => (
            <div key={idea.id} className="group relative bg-white rounded-xl border border-zinc-100 hover:border-zinc-300 hover:shadow-sm transition-all">
              {/* Edit / delete */}
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

              <Link href={`/ideas/${idea.id}`} className="block p-5 space-y-3">
                <div className="flex items-center gap-2 pr-12">
                  <p className="text-sm font-semibold text-zinc-800 truncate">{idea.title}</p>
                </div>
                {idea.description && <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{idea.description}</p>}

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600" title="Potential">
                    <TrendingUp size={12} /> {idea.potentialScore}/10
                  </span>
                  <span className="flex items-center gap-1 text-orange-600" title="Difficulty">
                    <Gauge size={12} /> {idea.difficultyScore}/10
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={idea.status} />
                  {idea.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[11px] font-medium text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5">{tag}</span>
                  ))}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
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
