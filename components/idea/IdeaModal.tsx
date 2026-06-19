'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import { IDEA_STATUSES } from '@/lib/types'
import type { Idea, IdeaStatus } from '@/lib/types'

interface FormState {
  title: string
  description: string
  targetUser: string
  problem: string
  solution: string
  potentialScore: number
  difficultyScore: number
  status: IdeaStatus
  tags: string
}

const inputCls    = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors'
const selectCls   = `${inputCls} bg-white`
const textareaCls = `${inputCls} resize-none`

function toForm(idea?: Idea): FormState {
  return {
    title: idea?.title ?? '',
    description: idea?.description ?? '',
    targetUser: idea?.targetUser ?? '',
    problem: idea?.problem ?? '',
    solution: idea?.solution ?? '',
    potentialScore: idea?.potentialScore ?? 5,
    difficultyScore: idea?.difficultyScore ?? 5,
    status: idea?.status ?? 'Raw',
    tags: (idea?.tags ?? []).join(', '),
  }
}

interface Props {
  idea?: Idea
  onClose: () => void
  onSaved?: (idea: Idea) => void
}

export default function IdeaModal({ idea, onClose, onSaved }: Props) {
  const { createIdea, updateIdea } = useAppContext()
  const [form, setForm]       = useState<FormState>(() => toForm(idea))
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const isEdit = !!idea

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    setError(null)
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const payload = {
      title: form.title.trim(),
      description: form.description,
      targetUser: form.targetUser,
      problem: form.problem,
      solution: form.solution,
      potentialScore: form.potentialScore,
      difficultyScore: form.difficultyScore,
      status: form.status,
      tags,
    }
    try {
      if (isEdit && idea) {
        await updateIdea(idea.id, payload)
        onSaved?.({ ...idea, ...payload })
      } else {
        const created = await createIdea(payload)
        onSaved?.(created)
      }
      onClose()
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : 'Could not save the idea. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">{isEdit ? 'Edit idea' : 'Capture a new idea'}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Don&apos;t overthink it — you can refine it later.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Title <span className="text-red-400">*</span></label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. FounderOS Browser Extension" required />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Description</label>
            <textarea className={textareaCls} rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What's the idea?" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Target user</label>
            <input className={inputCls} value={form.targetUser} onChange={e => set('targetUser', e.target.value)} placeholder="Who is this for?" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Problem</label>
            <textarea className={textareaCls} rows={2} value={form.problem} onChange={e => set('problem', e.target.value)} placeholder="What problem does it solve?" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Possible solution</label>
            <textarea className={textareaCls} rows={2} value={form.solution} onChange={e => set('solution', e.target.value)} placeholder="How might it work?" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Potential <span className="text-zinc-400">({form.potentialScore}/10)</span></label>
              <input type="range" min={1} max={10} value={form.potentialScore} onChange={e => set('potentialScore', Number(e.target.value))} className="w-full accent-zinc-900" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Difficulty <span className="text-zinc-400">({form.difficultyScore}/10)</span></label>
              <input type="range" min={1} max={10} value={form.difficultyScore} onChange={e => set('difficultyScore', Number(e.target.value))} className="w-full accent-zinc-900" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Status</label>
              <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value as IdeaStatus)}>
                {IDEA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Tags <span className="text-zinc-400">(comma separated)</span></label>
              <input className={inputCls} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="saas, tool, b2b" />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
              <p className="text-xs text-red-600 leading-relaxed">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !form.title.trim()} className="flex items-center gap-2 px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {loading && <Loader2 size={13} className="animate-spin" />}
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
