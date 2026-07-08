'use client'

import { useMemo, useState } from 'react'
import { Boxes, Plus, Search, Trash2 } from 'lucide-react'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import {
  FOUNDER_OBJECT_TYPES, LIFE_AREAS, OBJECT_PRIORITIES, OBJECT_STATUSES,
  OBJECT_TYPE_LABEL, LIFE_AREA_LABEL, RELATIONSHIP_TYPES, RELATIONSHIP_TYPE_LABEL,
  type FounderObject, type FounderObjectType, type LifeArea,
} from '@/lib/object-engine/objectTypes'
import { getRelationshipsForObject } from '@/lib/object-engine/objectRelationships'

const inputClass =
  'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10'

export default function ObjectsPage() {
  const {
    objects, searchObjects, createObject, updateObject, deleteObject,
    createRelationship, deleteRelationship, generateSummary,
  } = useObjectEngine()

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<FounderObjectType | ''>('')
  const [areaFilter, setAreaFilter] = useState<LifeArea | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<FounderObjectType>('note')

  const filtered = useMemo(
    () => searchObjects(query, {
      type: typeFilter || null,
      area: areaFilter || null,
    }),
    [searchObjects, query, typeFilter, areaFilter],
  )

  const selected = selectedId ? objects.find(o => o.id === selectedId) ?? null : null

  const selectedRels = useMemo(() => {
    if (!selected) return []
    return getRelationshipsForObject(selected, objects)
  }, [selected, objects])

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const obj = createObject({
      type: newType,
      title: newTitle.trim(),
      tags: [],
      source: 'manual',
      metadata: {},
      status: 'active',
    })
    setNewTitle('')
    setShowAdd(false)
    setSelectedId(obj.id)
  }

  return (
    <div className="min-h-full bg-zinc-50/80">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Sprint 3</p>
            <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">Object Engine</h1>
            <p className="text-sm text-zinc-500 mt-1">
              FounderOS memory layer — {objects.length} object{objects.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(v => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800"
          >
            <Plus size={16} /> Add object
          </button>
        </header>

        {showAdd && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col sm:flex-row gap-3">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Object title"
              className={inputClass}
              autoFocus
            />
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as FounderObjectType)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              {FOUNDER_OBJECT_TYPES.map(t => (
                <option key={t} value={t}>{OBJECT_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <button type="submit" className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold shrink-0">
              Create
            </button>
          </form>
        )}

        <div className="flex flex-col lg:flex-row gap-5">
          {/* List panel */}
          <div className="lg:w-[380px] shrink-0 space-y-3">
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-4 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search objects…"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as FounderObjectType | '')}
                  className="text-xs rounded-lg border border-zinc-200 px-2 py-1.5"
                >
                  <option value="">All types</option>
                  {FOUNDER_OBJECT_TYPES.map(t => (
                    <option key={t} value={t}>{OBJECT_TYPE_LABEL[t]}</option>
                  ))}
                </select>
                <select
                  value={areaFilter}
                  onChange={e => setAreaFilter(e.target.value as LifeArea | '')}
                  className="text-xs rounded-lg border border-zinc-200 px-2 py-1.5"
                >
                  <option value="">All areas</option>
                  {LIFE_AREAS.map(a => (
                    <option key={a} value={a}>{LIFE_AREA_LABEL[a]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden max-h-[520px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-5 text-sm text-zinc-400">No objects match your filters.</p>
              ) : (
                <ul className="divide-y divide-zinc-50">
                  {filtered.map(obj => (
                    <li key={obj.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(obj.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors ${
                          selectedId === obj.id ? 'bg-zinc-50 border-l-2 border-zinc-900' : ''
                        }`}
                      >
                        <p className="text-sm font-medium text-zinc-900 truncate">{obj.title}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {OBJECT_TYPE_LABEL[obj.type]}
                          {obj.area ? ` · ${LIFE_AREA_LABEL[obj.area]}` : ''}
                          {obj.status ? ` · ${obj.status}` : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex-1 min-w-0">
            {!selected ? (
              <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-10 text-center">
                <Boxes size={32} className="mx-auto text-zinc-300 mb-3" />
                <p className="text-sm text-zinc-500">Select an object to view details and relationships.</p>
              </div>
            ) : (
              <ObjectDetailPanel
                object={selected}
                allObjects={objects}
                relationships={selectedRels}
                summary={generateSummary(selected)}
                onUpdate={(patch) => updateObject(selected.id, patch)}
                onDelete={() => { deleteObject(selected.id); setSelectedId(null) }}
                onAddRelationship={(toId, type) => createRelationship(selected.id, toId, type)}
                onDeleteRelationship={deleteRelationship}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ObjectDetailPanel({
  object, allObjects, relationships, summary,
  onUpdate, onDelete, onAddRelationship, onDeleteRelationship,
}: {
  object: FounderObject
  allObjects: FounderObject[]
  relationships: ReturnType<typeof getRelationshipsForObject>
  summary: string
  onUpdate: (patch: Partial<FounderObject>) => void
  onDelete: () => void
  onAddRelationship: (toId: string, type: typeof RELATIONSHIP_TYPES[number]) => void
  onDeleteRelationship: (id: string) => void
}) {
  const [relToId, setRelToId] = useState('')
  const [relType, setRelType] = useState<typeof RELATIONSHIP_TYPES[number]>('related_to')

  const others = allObjects.filter(o => o.id !== object.id)

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <input
            value={object.title}
            onChange={e => onUpdate({ title: e.target.value })}
            className="w-full text-lg font-semibold text-zinc-900 bg-transparent border-none p-0 focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={object.type}
              onChange={e => onUpdate({ type: e.target.value as FounderObjectType })}
              className="text-xs rounded-lg border border-zinc-200 px-2 py-1"
            >
              {FOUNDER_OBJECT_TYPES.map(t => (
                <option key={t} value={t}>{OBJECT_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <select
              value={object.area ?? ''}
              onChange={e => onUpdate({ area: (e.target.value || undefined) as LifeArea })}
              className="text-xs rounded-lg border border-zinc-200 px-2 py-1"
            >
              <option value="">No area</option>
              {LIFE_AREAS.map(a => (
                <option key={a} value={a}>{LIFE_AREA_LABEL[a]}</option>
              ))}
            </select>
            <select
              value={object.status ?? 'active'}
              onChange={e => onUpdate({ status: e.target.value as typeof OBJECT_STATUSES[number] })}
              className="text-xs rounded-lg border border-zinc-200 px-2 py-1"
            >
              {OBJECT_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={object.priority ?? ''}
              onChange={e => onUpdate({ priority: (e.target.value || undefined) as typeof OBJECT_PRIORITIES[number] })}
              className="text-xs rounded-lg border border-zinc-200 px-2 py-1"
            >
              <option value="">No priority</option>
              {OBJECT_PRIORITIES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50"
          aria-label="Delete object"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Summary</p>
          <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 rounded-xl p-3 border border-zinc-100">
            {summary}
          </p>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
          <textarea
            value={object.summary ?? ''}
            onChange={e => onUpdate({ summary: e.target.value })}
            rows={2}
            className={`${inputClass} mt-1 resize-none`}
            placeholder="Short summary…"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Content</label>
          <textarea
            value={object.content ?? ''}
            onChange={e => onUpdate({ content: e.target.value })}
            rows={3}
            className={`${inputClass} mt-1 resize-none`}
            placeholder="Full content…"
          />
        </div>

        <div>
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Relationships ({relationships.length})
          </p>
          {relationships.length === 0 ? (
            <p className="text-sm text-zinc-400">No relationships yet.</p>
          ) : (
            <ul className="space-y-2 mb-3">
              {relationships.map(rel => {
                const from = allObjects.find(o => o.id === rel.fromObjectId)
                const to = allObjects.find(o => o.id === rel.toObjectId)
                const other = rel.fromObjectId === object.id ? to : from
                return (
                  <li key={rel.id} className="flex items-center justify-between text-sm bg-zinc-50 rounded-lg px-3 py-2">
                    <span className="text-zinc-700">
                      <span className="text-zinc-400">{RELATIONSHIP_TYPE_LABEL[rel.type]}</span>
                      {' → '}
                      {other?.title ?? 'Unknown'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteRelationship(rel.id)}
                      className="text-zinc-400 hover:text-red-500 text-xs"
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={relToId}
              onChange={e => setRelToId(e.target.value)}
              className="flex-1 text-xs rounded-lg border border-zinc-200 px-2 py-2"
            >
              <option value="">Link to object…</option>
              {others.map(o => (
                <option key={o.id} value={o.id}>{o.title} ({OBJECT_TYPE_LABEL[o.type]})</option>
              ))}
            </select>
            <select
              value={relType}
              onChange={e => setRelType(e.target.value as typeof RELATIONSHIP_TYPES[number])}
              className="text-xs rounded-lg border border-zinc-200 px-2 py-2"
            >
              {RELATIONSHIP_TYPES.map(t => (
                <option key={t} value={t}>{RELATIONSHIP_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!relToId}
              onClick={() => { onAddRelationship(relToId, relType); setRelToId('') }}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white disabled:opacity-40"
            >
              Add link
            </button>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400">
          Source: {object.source ?? 'manual'} · Updated {new Date(object.updatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
