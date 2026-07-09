'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Plus, Search, Trash2, Sparkles } from 'lucide-react'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import {
  KNOWLEDGE_CONFIDENCES,
  KNOWLEDGE_CONFIDENCE_LABEL,
  KNOWLEDGE_DOMAINS,
  KNOWLEDGE_DOMAIN_LABEL,
  KNOWLEDGE_TYPES,
  KNOWLEDGE_TYPE_LABEL,
  type KnowledgeConfidence,
  type KnowledgeDomain,
  type KnowledgeRecord,
  type KnowledgeType,
} from '@/lib/knowledge-engine/knowledgeTypes'

const inputClass =
  'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10'

function confidenceBadge(confidence: KnowledgeConfidence) {
  const colors: Record<KnowledgeConfidence, string> = {
    high: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-blue-50 text-blue-700',
    low: 'bg-zinc-100 text-zinc-600',
  }
  return colors[confidence]
}

export default function KnowledgePage() {
  const {
    knowledge, searchKnowledge, createKnowledge, updateKnowledge, deleteKnowledge,
    generateSummary, getSuggestedFromMemories, createKnowledgeFromMemory,
  } = useKnowledgeEngine()
  const { memories } = useMemoryEngine()
  const { objects } = useObjectEngine()

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<KnowledgeType | ''>('')
  const [domainFilter, setDomainFilter] = useState<KnowledgeDomain | ''>('')
  const [confidenceFilter, setConfidenceFilter] = useState<KnowledgeConfidence | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPrinciple, setNewPrinciple] = useState('')
  const [newType, setNewType] = useState<KnowledgeType>('principle')
  const [newDomain, setNewDomain] = useState<KnowledgeDomain>('founder')

  const filtered = useMemo(
    () => searchKnowledge(query, {
      type: typeFilter || null,
      domain: domainFilter || null,
      confidence: confidenceFilter || null,
    }),
    [searchKnowledge, query, typeFilter, domainFilter, confidenceFilter],
  )

  const suggestions = useMemo(() => getSuggestedFromMemories(5), [getSuggestedFromMemories, memories])
  const selected = selectedId ? knowledge.find(k => k.id === selectedId) ?? null : null

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newPrinciple.trim()) return
    const rec = createKnowledge({
      type: newType,
      title: newTitle.trim(),
      principle: newPrinciple.trim(),
      domain: newDomain,
      confidence: 'medium',
      source: 'manual',
      relatedObjectIds: [],
      relatedMemoryIds: [],
      tags: [],
    })
    setNewTitle('')
    setNewPrinciple('')
    setShowAdd(false)
    setSelectedId(rec.id)
  }

  function resolveObjectTitle(id: string): string {
    return objects.find(o => o.id === id)?.title ?? id.slice(0, 8) + '…'
  }

  function resolveMemoryTitle(id: string): string {
    return memories.find(m => m.id === id)?.title ?? id.slice(0, 8) + '…'
  }

  function handleAcceptSuggestion(memoryId: string) {
    const created = createKnowledgeFromMemory(memoryId)
    if (created) setSelectedId(created.id)
  }

  return (
    <div className="min-h-full bg-zinc-50/80">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Sprint 6</p>
            <h1 className="text-2xl font-bold text-zinc-900 mt-0.5 flex items-center gap-2">
              <BookOpen size={24} className="text-indigo-600" />
              Knowledge Engine
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Durable principles — {knowledge.length} record{knowledge.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(v => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800"
          >
            <Plus size={16} /> Add knowledge
          </button>
        </header>

        {suggestions.length > 0 && (
          <section className="bg-indigo-50/60 rounded-2xl border border-indigo-100 p-5">
            <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles size={14} /> Suggested from recent memories
            </p>
            <ul className="space-y-3">
              {suggestions.map(s => (
                <li key={s.memoryId} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{s.suggestedTitle}</p>
                    <p className="text-xs text-zinc-500 truncate">{s.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAcceptSuggestion(s.memoryId)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                  >
                    Save as knowledge
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {showAdd && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
            <input
              className={inputClass}
              placeholder="Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <textarea
              className={inputClass}
              placeholder="Principle"
              rows={2}
              value={newPrinciple}
              onChange={e => setNewPrinciple(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <select
                className={inputClass + ' w-auto'}
                value={newType}
                onChange={e => setNewType(e.target.value as KnowledgeType)}
              >
                {KNOWLEDGE_TYPES.map(t => (
                  <option key={t} value={t}>{KNOWLEDGE_TYPE_LABEL[t]}</option>
                ))}
              </select>
              <select
                className={inputClass + ' w-auto'}
                value={newDomain}
                onChange={e => setNewDomain(e.target.value as KnowledgeDomain)}
              >
                {KNOWLEDGE_DOMAINS.map(d => (
                  <option key={d} value={d}>{KNOWLEDGE_DOMAIN_LABEL[d]}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-semibold">
              Create
            </button>
          </form>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  className={inputClass + ' pl-9'}
                  placeholder="Search knowledge…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <select
                className={inputClass + ' sm:w-36'}
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as KnowledgeType | '')}
              >
                <option value="">All types</option>
                {KNOWLEDGE_TYPES.map(t => (
                  <option key={t} value={t}>{KNOWLEDGE_TYPE_LABEL[t]}</option>
                ))}
              </select>
              <select
                className={inputClass + ' sm:w-36'}
                value={domainFilter}
                onChange={e => setDomainFilter(e.target.value as KnowledgeDomain | '')}
              >
                <option value="">All domains</option>
                {KNOWLEDGE_DOMAINS.map(d => (
                  <option key={d} value={d}>{KNOWLEDGE_DOMAIN_LABEL[d]}</option>
                ))}
              </select>
              <select
                className={inputClass + ' sm:w-32'}
                value={confidenceFilter}
                onChange={e => setConfidenceFilter(e.target.value as KnowledgeConfidence | '')}
              >
                <option value="">All confidence</option>
                {KNOWLEDGE_CONFIDENCES.map(c => (
                  <option key={c} value={c}>{KNOWLEDGE_CONFIDENCE_LABEL[c]}</option>
                ))}
              </select>
            </div>

            <ul className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <li className="p-8 text-center text-sm text-zinc-500">No knowledge matches your filters.</li>
              ) : filtered.map(k => (
                <li key={k.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(k.id)}
                    className={`w-full text-left px-5 py-4 hover:bg-zinc-50 transition-colors ${
                      selectedId === k.id ? 'bg-indigo-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-900">{k.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                        {KNOWLEDGE_TYPE_LABEL[k.type]}
                      </span>
                      {k.domain && (
                        <span className="text-[10px] text-zinc-400">
                          {KNOWLEDGE_DOMAIN_LABEL[k.domain]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{k.principle}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selected && (
            <aside className="lg:w-96 shrink-0 bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-5 space-y-4 h-fit sticky top-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-zinc-900">{selected.title}</h2>
                <button
                  type="button"
                  onClick={() => {
                    deleteKnowledge(selected.id)
                    setSelectedId(null)
                  }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                  {KNOWLEDGE_TYPE_LABEL[selected.type]}
                </span>
                {selected.domain && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                    {KNOWLEDGE_DOMAIN_LABEL[selected.domain]}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceBadge(selected.confidence)}`}>
                  {KNOWLEDGE_CONFIDENCE_LABEL[selected.confidence]}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase mb-1">Principle</p>
                <p className="text-sm text-zinc-800">{selected.principle}</p>
              </div>

              {selected.explanation && (
                <div>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase mb-1">Explanation</p>
                  <p className="text-sm text-zinc-600">{selected.explanation}</p>
                </div>
              )}

              <div>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase mb-1">Summary</p>
                <p className="text-xs text-zinc-500 whitespace-pre-wrap">{generateSummary(selected)}</p>
              </div>

              {selected.relatedObjectIds.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase mb-1">Related objects</p>
                  <ul className="text-xs text-zinc-600 space-y-1">
                    {selected.relatedObjectIds.map(id => (
                      <li key={id}>{resolveObjectTitle(id)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.relatedMemoryIds.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase mb-1">Source memories</p>
                  <ul className="text-xs text-zinc-600 space-y-1">
                    {selected.relatedMemoryIds.map(id => (
                      <li key={id}>{resolveMemoryTitle(id)}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-100 text-xs text-zinc-400">
                Used {selected.usageCount} time{selected.usageCount === 1 ? '' : 's'}
                {selected.source && ` · Source: ${selected.source}`}
              </div>

              <button
                type="button"
                onClick={() => updateKnowledge(selected.id, {
                  confidence: selected.confidence === 'high' ? 'high' : 'high',
                })}
                className="text-xs text-indigo-600 hover:underline"
              >
                Mark high confidence
              </button>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
