'use client'

import { useMemo, useState } from 'react'
import { X, Link2, Loader2, Check } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import { ENTITY_LABEL, RELATIONSHIP_TYPES, RELATIONSHIP_LABEL } from '@/lib/links'
import type { EntityType, RelationshipType } from '@/lib/types'

type SourceRef = { type: EntityType; id: string; label: string }

// Target types the user can link to within a project.
const TARGET_TYPES: EntityType[] = ['task', 'risk', 'decision', 'note', 'roadmap_item', 'project']

export default function CreateLinkModal({ source, onClose }: { source: SourceRef; onClose: () => void }) {
  const { project, tasks, risks, decisions, notes, roadmapItems } = useProjectContext()
  const { createLink } = useAppContext()

  const [targetType, setTargetType]   = useState<EntityType>('risk')
  const [targetId, setTargetId]       = useState('')
  const [relationship, setRelationship] = useState<RelationshipType>('relates_to')
  const [description, setDescription] = useState('')
  const [saving, setSaving]           = useState(false)
  const [done, setDone]               = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Build the list of selectable targets for the chosen type (excluding the source itself).
  const options = useMemo<{ id: string; label: string }[]>(() => {
    const pick = (arr: { id: string }[], label: (x: never) => string) =>
      arr.filter(x => x.id !== source.id).map(x => ({ id: x.id, label: label(x as never) }))
    switch (targetType) {
      case 'task':         return pick(tasks,        (t: { title: string }) => t.title)
      case 'risk':         return pick(risks,        (r: { title: string }) => r.title)
      case 'decision':     return pick(decisions,    (d: { decision: string }) => d.decision)
      case 'note':         return pick(notes,        (n: { title: string }) => n.title)
      case 'roadmap_item': return pick(roadmapItems, (r: { title: string }) => r.title)
      case 'project':      return project.id === source.id ? [] : [{ id: project.id, label: project.title }]
      default:             return []
    }
  }, [targetType, tasks, risks, decisions, notes, roadmapItems, project, source.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetId) { setError('Choose an item to link to.'); return }
    setSaving(true)
    setError(null)
    try {
      await createLink({
        sourceType: source.type, sourceId: source.id,
        targetType, targetId,
        relationshipType: relationship,
        description: description.trim() || undefined,
      })
      setDone(true)
      setTimeout(onClose, 900)
    } catch {
      setError('Could not create the link. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-zinc-200 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 size={15} className="text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-900">Create link</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-zinc-500">
            Linking from <span className="font-medium text-zinc-700">{ENTITY_LABEL[source.type]} “{source.label}”</span>
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-600">Relationship</label>
            <select
              value={relationship}
              onChange={e => setRelationship(e.target.value as RelationshipType)}
              className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            >
              {RELATIONSHIP_TYPES.map(r => <option key={r} value={r}>{RELATIONSHIP_LABEL[r]}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600">Target type</label>
              <select
                value={targetType}
                onChange={e => { setTargetType(e.target.value as EntityType); setTargetId('') }}
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                {TARGET_TYPES.map(t => <option key={t} value={t}>{ENTITY_LABEL[t]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600">Target item</label>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <option value="">Select…</option>
                {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {options.length === 0 && (
            <p className="text-xs text-zinc-400">No {ENTITY_LABEL[targetType].toLowerCase()}s available to link to yet.</p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-600">Description <span className="text-zinc-400">(optional)</span></label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Why are these connected?"
              className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-800 px-3 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving || done}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-lg px-4 py-2 transition-colors"
            >
              {done ? <><Check size={13} /> Linked</> : saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Create link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
