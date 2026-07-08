'use client'

import { useMemo, useState } from 'react'
import { Brain, Plus, Search, Trash2 } from 'lucide-react'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import {
  LIFE_AREAS, MEMORY_IMPORTANCES, MEMORY_TYPES,
  MEMORY_IMPORTANCE_LABEL, MEMORY_TYPE_LABEL,
  type LifeArea, type MemoryImportance, type MemoryRecord, type MemoryType,
} from '@/lib/memory-engine/memoryTypes'

const inputClass =
  'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10'

export default function MemoryPage() {
  const {
    memories, searchMemories, createMemory, updateMemory, deleteMemory,
    generateSummary, getRecentMemories,
  } = useMemoryEngine()
  const { objects } = useObjectEngine()

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<MemoryType | ''>('')
  const [areaFilter, setAreaFilter] = useState<LifeArea | ''>('')
  const [importanceFilter, setImportanceFilter] = useState<MemoryImportance | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<MemoryType>('reflection')

  const filtered = useMemo(
    () => searchMemories(query, {
      type: typeFilter || null,
      area: areaFilter || null,
      importance: importanceFilter || null,
    }),
    [searchMemories, query, typeFilter, areaFilter, importanceFilter],
  )

  const recent = useMemo(() => getRecentMemories(5), [getRecentMemories, memories])
  const selected = selectedId ? memories.find(m => m.id === selectedId) ?? null : null

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const mem = createMemory({
      type: newType,
      title: newTitle.trim(),
      content: newTitle.trim(),
      importance: 'medium',
      source: 'manual',
      relatedObjectIds: [],
      tags: [],
    })
    setNewTitle('')
    setShowAdd(false)
    setSelectedId(mem.id)
  }

  function resolveObjectTitle(id: string): string {
    return objects.find(o => o.id === id)?.title ?? id.slice(0, 8) + '…'
  }

  return (
    <div className="min-h-full bg-zinc-50/80">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Sprint 4</p>
            <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">Memory Engine</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Historical context — {memories.length} memor{memories.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(v => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800"
          >
            <Plus size={16} /> Add memory
          </button>
        </header>

        {recent.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-5">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent</p>
            <ul className="space-y-2">
              {recent.map(m => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className="text-sm text-zinc-700 hover:text-zinc-900 text-left w-full truncate"
                  >
                    <span className="text-zinc-400">{MEMORY_TYPE_LABEL[m.type]} · </span>
                    {m.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showAdd && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col sm:flex-row gap-3">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Memory title / content"
              className={inputClass}
              autoFocus
            />
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as MemoryType)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              {MEMORY_TYPES.map(t => (
                <option key={t} value={t}>{MEMORY_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <button type="submit" className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold shrink-0">
              Create
            </button>
          </form>
        )}

        <div className="flex flex-col lg:flex-row gap-5">
          <div className="lg:w-[380px] shrink-0 space-y-3">
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-4 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search memories…"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as MemoryType | '')}
                  className="text-xs rounded-lg border border-zinc-200 px-2 py-1.5"
                >
                  <option value="">All types</option>
                  {MEMORY_TYPES.map(t => (
                    <option key={t} value={t}>{MEMORY_TYPE_LABEL[t]}</option>
                  ))}
                </select>
                <select
                  value={areaFilter}
                  onChange={e => setAreaFilter(e.target.value as LifeArea | '')}
                  className="text-xs rounded-lg border border-zinc-200 px-2 py-1.5"
                >
                  <option value="">All areas</option>
                  {LIFE_AREAS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <select
                  value={importanceFilter}
                  onChange={e => setImportanceFilter(e.target.value as MemoryImportance | '')}
                  className="text-xs rounded-lg border border-zinc-200 px-2 py-1.5"
                >
                  <option value="">All importance</option>
                  {MEMORY_IMPORTANCES.map(i => (
                    <option key={i} value={i}>{MEMORY_IMPORTANCE_LABEL[i]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden max-h-[520px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-5 text-sm text-zinc-400">No memories match your filters.</p>
              ) : (
                <ul className="divide-y divide-zinc-50">
                  {filtered.map(m => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors ${
                          selectedId === m.id ? 'bg-zinc-50 border-l-2 border-zinc-900' : ''
                        }`}
                      >
                        <p className="text-sm font-medium text-zinc-900 truncate">{m.title}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {MEMORY_TYPE_LABEL[m.type]} · {MEMORY_IMPORTANCE_LABEL[m.importance]}
                          {m.area ? ` · ${m.area}` : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {!selected ? (
              <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-10 text-center">
                <Brain size={32} className="mx-auto text-zinc-300 mb-3" />
                <p className="text-sm text-zinc-500">Select a memory to view details.</p>
              </div>
            ) : (
              <MemoryDetail
                memory={selected}
                summary={generateSummary(selected)}
                resolveObjectTitle={resolveObjectTitle}
                onUpdate={patch => updateMemory(selected.id, patch)}
                onDelete={() => { deleteMemory(selected.id); setSelectedId(null) }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MemoryDetail({
  memory, summary, resolveObjectTitle, onUpdate, onDelete,
}: {
  memory: MemoryRecord
  summary: string
  resolveObjectTitle: (id: string) => string
  onUpdate: (patch: Partial<MemoryRecord>) => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3 min-w-0">
          <input
            value={memory.title}
            onChange={e => onUpdate({ title: e.target.value })}
            className="w-full text-lg font-semibold text-zinc-900 bg-transparent border-none p-0 focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={memory.type}
              onChange={e => onUpdate({ type: e.target.value as MemoryType })}
              className="text-xs rounded-lg border border-zinc-200 px-2 py-1"
            >
              {MEMORY_TYPES.map(t => (
                <option key={t} value={t}>{MEMORY_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <select
              value={memory.importance}
              onChange={e => onUpdate({ importance: e.target.value as MemoryImportance })}
              className="text-xs rounded-lg border border-zinc-200 px-2 py-1"
            >
              {MEMORY_IMPORTANCES.map(i => (
                <option key={i} value={i}>{MEMORY_IMPORTANCE_LABEL[i]}</option>
              ))}
            </select>
            <select
              value={memory.area ?? ''}
              onChange={e => onUpdate({ area: (e.target.value || undefined) as LifeArea })}
              className="text-xs rounded-lg border border-zinc-200 px-2 py-1"
            >
              <option value="">No area</option>
              {LIFE_AREAS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50"
          aria-label="Delete memory"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Summary</p>
          <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 rounded-xl p-3 border border-zinc-100">{summary}</p>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Content</label>
          <textarea
            value={memory.content}
            onChange={e => onUpdate({ content: e.target.value })}
            rows={4}
            className={`${inputClass} mt-1 resize-none`}
          />
        </div>
        {memory.relatedObjectIds.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Related objects</p>
            <ul className="space-y-1">
              {memory.relatedObjectIds.map(id => (
                <li key={id} className="text-sm text-zinc-600">• {resolveObjectTitle(id)}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[11px] text-zinc-400">
          Source: {memory.source} · {new Date(memory.occurredAt).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
