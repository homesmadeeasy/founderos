'use client'

import { useMemo, useState } from 'react'
import { Network, Trash2, Filter } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import {
  collectProjectEntityIds, getProjectLinks, buildLabelResolver, describeLink,
  ENTITY_LABEL, RELATIONSHIP_LABEL, ENTITY_TYPES, RELATIONSHIP_TYPES,
} from '@/lib/links'
import type { EntityType, RelationshipType, Link } from '@/lib/types'

export default function ProjectMemoryPage() {
  const { project } = useProjectContext()
  const { appState, deleteLink } = useAppContext()

  const [entityFilter, setEntityFilter]       = useState<EntityType | 'all'>('all')
  const [relationFilter, setRelationFilter]   = useState<RelationshipType | 'all'>('all')

  const resolve = useMemo(() => buildLabelResolver(appState), [appState])

  const projectLinks = useMemo(() => {
    const ids = collectProjectEntityIds(appState, project.id)
    return getProjectLinks(appState.links, ids)
  }, [appState, project.id])

  const filtered = useMemo(() => projectLinks.filter(l => {
    const entityOk = entityFilter === 'all' || l.sourceType === entityFilter || l.targetType === entityFilter
    const relOk = relationFilter === 'all' || l.relationshipType === relationFilter
    return entityOk && relOk
  }), [projectLinks, entityFilter, relationFilter])

  // Group filtered links by relationship type (for the grouped view).
  const grouped = useMemo(() => {
    const map = new Map<RelationshipType, Link[]>()
    filtered.forEach(l => {
      const arr = map.get(l.relationshipType) ?? []
      arr.push(l)
      map.set(l.relationshipType, arr)
    })
    return Array.from(map.entries())
  }, [filtered])

  // Entity types present in this project's links (for filter dropdown relevance).
  const presentEntityTypes = useMemo(() => {
    const set = new Set<EntityType>()
    projectLinks.forEach(l => { set.add(l.sourceType); set.add(l.targetType) })
    return ENTITY_TYPES.filter(t => set.has(t))
  }, [projectLinks])

  const presentRelTypes = useMemo(() => {
    const set = new Set<RelationshipType>()
    projectLinks.forEach(l => set.add(l.relationshipType))
    return RELATIONSHIP_TYPES.filter(t => set.has(t))
  }, [projectLinks])

  if (projectLinks.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-zinc-100 py-20 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
            <Network size={20} className="text-zinc-300" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">No linked memory yet</p>
          <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
            No linked memory yet. As you convert AI responses, review projects, and turn ideas into projects, FounderOS will build a memory graph automatically.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Network size={18} className="text-teal-500" />
          <h1 className="text-xl font-bold text-zinc-900">Memory Graph</h1>
        </div>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
          How this project&apos;s ideas, messages, tasks, notes, decisions, risks, roadmap items and reviews are connected.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-zinc-100 p-4 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
          <Filter size={12} /> Filter
        </span>
        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value as EntityType | 'all')}
          className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-200"
        >
          <option value="all">All entity types</option>
          {presentEntityTypes.map(t => <option key={t} value={t}>{ENTITY_LABEL[t]}</option>)}
        </select>
        <select
          value={relationFilter}
          onChange={e => setRelationFilter(e.target.value as RelationshipType | 'all')}
          className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-200"
        >
          <option value="all">All relationships</option>
          {presentRelTypes.map(t => <option key={t} value={t}>{RELATIONSHIP_LABEL[t]}</option>)}
        </select>
        {(entityFilter !== 'all' || relationFilter !== 'all') && (
          <button
            onClick={() => { setEntityFilter('all'); setRelationFilter('all') }}
            className="text-xs text-zinc-400 hover:text-zinc-700"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-zinc-400">{filtered.length} of {projectLinks.length} links</span>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Memory timeline</h2>
        <div className="bg-white rounded-xl border border-zinc-100 p-5">
          {filtered.length === 0 ? (
            <p className="text-xs text-zinc-400 py-2">No links match the current filters.</p>
          ) : (
            <ol className="relative border-l border-zinc-100 ml-1.5 space-y-4">
              {filtered.map(l => (
                <li key={l.id} className="ml-4 group">
                  <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-teal-400 border-2 border-white" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm text-zinc-700 leading-relaxed">{describeLink(l, resolve)}</p>
                      <p className="text-[11px] text-zinc-400">
                        {RELATIONSHIP_LABEL[l.relationshipType]} · {new Date(l.createdAt).toLocaleString()}
                        {l.description ? ` · ${l.description}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => void deleteLink(l.id).catch(() => {})}
                      title="Remove link"
                      className="opacity-0 group-hover:opacity-100 shrink-0 w-6 h-6 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Grouped by relationship */}
      {grouped.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">By relationship</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {grouped.map(([rel, links]) => (
              <div key={rel} className="bg-white rounded-xl border border-zinc-100 p-4">
                <p className="text-xs font-semibold text-zinc-500 mb-2">
                  {RELATIONSHIP_LABEL[rel]} <span className="text-zinc-300">({links.length})</span>
                </p>
                <ul className="space-y-1.5">
                  {links.map(l => (
                    <li key={l.id} className="text-sm text-zinc-600 leading-relaxed flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                      <span>{describeLink(l, resolve)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
