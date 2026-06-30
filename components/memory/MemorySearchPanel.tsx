'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Search, Sparkles, Loader2, RefreshCw, AlertCircle, ArrowRight, Brain,
} from 'lucide-react'
import type {
  AskMemoryResponse, MemoryEntityType, MemoryIndexStatus,
  MemorySearchResult, SemanticSearchResponse,
} from '@/lib/types'
import { MEMORY_ENTITY_LABEL, MEMORY_ENTITY_TYPES } from '@/lib/memory/routes'
import SectionCard from '@/components/ui/SectionCard'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'

type SearchMode = 'search' | 'ask'

interface ProjectOption {
  id: string
  title: string
}

interface Props {
  projectId?: string | null
  projectTitle?: string
  projects?: ProjectOption[]
}

export default function MemorySearchPanel({
  projectId = null,
  projectTitle,
  projects = [],
}: Props) {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const initialMode = searchParams.get('mode') === 'ask' ? 'ask' : 'search'

  const [mode, setMode] = useState<SearchMode>(initialMode)
  const [query, setQuery] = useState(initialQuery)
  const [filterProjectId, setFilterProjectId] = useState<string>(projectId ?? '')
  const [filterEntityType, setFilterEntityType] = useState<MemoryEntityType | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<MemorySearchResult[]>([])
  const [askResponse, setAskResponse] = useState<AskMemoryResponse | null>(null)
  const [indexStatus, setIndexStatus] = useState<MemoryIndexStatus | null>(null)
  const [reindexing, setReindexing] = useState(false)
  const [reindexMessage, setReindexMessage] = useState<string | null>(null)

  const effectiveProjectId = projectId ?? (filterProjectId || null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/memory/status')
      if (res.ok) {
        setIndexStatus(await res.json() as MemoryIndexStatus)
      }
    } catch {
      // Non-blocking
    }
  }, [])

  useEffect(() => { void loadStatus() }, [loadStatus])

  async function handleReindex() {
    setReindexing(true)
    setReindexMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/memory/reindex', { method: 'POST' })
      const data = await res.json() as MemoryIndexStatus & { indexed?: number; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Reindex failed.')
        return
      }
      setIndexStatus({ indexedCount: data.indexedCount, lastIndexedAt: data.lastIndexedAt })
      setReindexMessage(`Indexed ${data.indexed ?? data.indexedCount} items.`)
    } catch {
      setError('Reindex failed. Try again.')
    } finally {
      setReindexing(false)
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setAskResponse(null)
    setResults([])

    try {
      if (mode === 'ask') {
        const res = await fetch('/api/memory/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            project_id: effectiveProjectId,
            entity_type: filterEntityType || null,
          }),
        })
        const data = await res.json() as AskMemoryResponse & { error?: string; searchResults?: MemorySearchResult[] }
        if (!res.ok && !data.answer) {
          setError(data.error ?? 'Ask Memory failed.')
          if (data.searchResults) setResults(data.searchResults)
          return
        }
        if (data.error && data.answer) {
          setAskResponse(data)
          setError(data.error)
        } else {
          setAskResponse(data)
        }
      } else {
        const res = await fetch('/api/memory/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: q,
            project_id: effectiveProjectId,
            entity_type: filterEntityType || null,
            limit: 15,
          }),
        })
        const data = await res.json() as SemanticSearchResponse & { error?: string; message?: string }
        if (data.error && !data.results?.length) {
          setError(data.error)
          return
        }
        if (data.message && !data.results?.length) {
          setError(data.message)
          return
        }
        setResults(data.results ?? [])
      }
    } catch {
      setError(mode === 'ask' ? 'Ask Memory failed. Try again.' : 'Memory search failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const scopeLabel = projectId
    ? projectTitle ?? 'this project'
    : filterProjectId
      ? projects.find(p => p.id === filterProjectId)?.title ?? 'selected project'
      : 'all projects'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
          <Brain size={20} className="text-zinc-500" />
          {projectId ? 'Project Memory Search' : 'Memory Search'}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {projectId
            ? `Search and ask questions about ${scopeLabel} using semantic meaning — not just keywords.`
            : 'Search your entire FounderOS workspace by meaning. Ask questions across projects, notes, decisions, risks, and more.'}
        </p>
      </div>

      <SectionCard
        title="Memory index"
        icon={RefreshCw}
        action={
          <button
            type="button"
            onClick={() => void handleReindex()}
            disabled={reindexing}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50 flex items-center gap-1.5"
          >
            {reindexing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Rebuild Memory Index
          </button>
        }
      >
        <div className="px-5 py-4 text-sm text-zinc-600 space-y-1">
          <p>
            <span className="font-medium text-zinc-800">{indexStatus?.indexedCount ?? '—'}</span>
            {' '}indexed items
            {indexStatus?.lastIndexedAt && (
              <span className="text-zinc-400">
                {' '}· last updated {new Date(indexStatus.lastIndexedAt).toLocaleString()}
              </span>
            )}
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Rebuilding may take a moment and uses AI embedding calls. Run this after adding existing data or if search returns nothing.
          </p>
          {reindexMessage && (
            <p className="text-xs text-emerald-700">{reindexMessage}</p>
          )}
        </div>
      </SectionCard>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('search')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'search' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Search size={14} />
          Semantic Search
        </button>
        <button
          type="button"
          onClick={() => setMode('ask')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'ask' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Sparkles size={14} />
          Ask Memory
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              mode === 'ask'
                ? 'What decisions have I made about this project?'
                : 'scope creep, stuck projects, browser extension…'
            }
            className="w-full pl-10 pr-4 py-3 text-sm border border-zinc-200 rounded-xl outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {!projectId && projects.length > 0 && (
            <select
              value={filterProjectId}
              onChange={e => setFilterProjectId(e.target.value)}
              className="text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-700"
            >
              <option value="">All projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}

          <select
            value={filterEntityType}
            onChange={e => setFilterEntityType(e.target.value as MemoryEntityType | '')}
            className="text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-700"
          >
            <option value="">All types</option>
            {MEMORY_ENTITY_TYPES.map(t => (
              <option key={t} value={t}>{MEMORY_ENTITY_LABEL[t]}</option>
            ))}
          </select>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : mode === 'ask' ? <Sparkles size={14} /> : <Search size={14} />}
            {loading ? 'Searching…' : mode === 'ask' ? 'Ask' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <ErrorState message={error} onRetry={() => void handleSubmit()} />
      )}

      {askResponse && (
        <SectionCard title="Answer" icon={Sparkles}>
          <div className="px-5 py-4">
          <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">{askResponse.answer}</p>

          {askResponse.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Sources</p>
              <ul className="space-y-2">
                {askResponse.sources.map(s => (
                  <li key={`${s.entityType}-${s.entityId}`}>
                    <Link
                      href={s.href}
                      className="flex items-start gap-2 text-sm text-zinc-700 hover:text-zinc-900 group"
                    >
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">
                        {MEMORY_ENTITY_LABEL[s.entityType]}
                      </span>
                      <span className="group-hover:underline">{s.title ?? s.entityType}</span>
                      <ArrowRight size={12} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {askResponse.followUpActions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Suggested follow-ups</p>
              <ul className="space-y-1">
                {askResponse.followUpActions.map((action, i) => (
                  <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                    <AlertCircle size={12} className="shrink-0 mt-1 text-zinc-400" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
          </div>
        </SectionCard>
      )}

      {mode === 'search' && !loading && results.length === 0 && !error && query.trim() && (
        <EmptyState
          icon={Search}
          title="No results yet"
          description="Try a different query or rebuild your memory index."
        />
      )}

      {results.length > 0 && (
        <SectionCard title={`Results (${results.length})`} icon={Search}>
          <ul className="divide-y divide-zinc-50 px-2">
            {results.map(r => (
              <li key={r.id}>
                <Link
                  href={r.href}
                  className="flex items-start gap-3 py-3 group hover:bg-zinc-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">
                        {MEMORY_ENTITY_LABEL[r.entityType]}
                      </span>
                      {r.similarity > 0 && (
                        <span className="text-[10px] text-zinc-400">
                          {(r.similarity * 100).toFixed(0)}% match
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-zinc-900 mt-1 group-hover:underline truncate">
                      {r.title ?? r.entityType}
                    </p>
                    {r.contentPreview && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{r.contentPreview}</p>
                    )}
                  </div>
                  <ArrowRight size={14} className="shrink-0 mt-2 text-zinc-300 group-hover:text-zinc-500" />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}
