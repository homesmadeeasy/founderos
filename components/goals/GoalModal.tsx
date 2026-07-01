'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import { GOAL_CATEGORIES, GOAL_PRIORITIES, GOAL_STATUSES } from '@/lib/goal'
import type { GoalCategory, GoalPriority, GoalStatus } from '@/lib/types'

export interface GoalFormState {
  title: string
  description: string
  category: GoalCategory
  priority: GoalPriority
  status: GoalStatus
  progress: number
  timeframe: string
  successCriteria: string
  whyItMatters: string
  constraints: string
}

const EMPTY: GoalFormState = {
  title: '', description: '', category: 'Other', priority: 'Medium', status: 'Active',
  progress: 0, timeframe: '', successCriteria: '', whyItMatters: '', constraints: '',
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors'
const selectCls = `${inputCls} bg-white`

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Partial<GoalFormState>
  goalId?: string
  onSaved?: () => void
}

export default function GoalModal({ open, onOpenChange, initial, goalId, onSaved }: Props) {
  const { createGoal, updateGoal } = useAppContext()
  const [form, setForm] = useState<GoalFormState>({ ...EMPTY, ...initial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(k: keyof GoalFormState, v: string | number) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function close() {
    onOpenChange(false)
    setForm({ ...EMPTY, ...initial })
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    setError(null)
    try {
      if (goalId) {
        await updateGoal(goalId, form)
      } else {
        await createGoal(form)
      }
      onSaved?.()
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save goal.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-8">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">{goalId ? 'Edit goal' : 'Create goal'}</h2>
          <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Title *</label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Description</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Category</label>
              <select className={selectCls} value={form.category} onChange={e => set('category', e.target.value)}>
                {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Priority</label>
              <select className={selectCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {GOAL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Status</label>
              <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {GOAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Progress %</label>
              <input type="number" min={0} max={100} className={inputCls} value={form.progress} onChange={e => set('progress', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600">Timeframe</label>
              <input className={inputCls} value={form.timeframe} onChange={e => set('timeframe', e.target.value)} placeholder="e.g. Q2 2026" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Success criteria</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.successCriteria} onChange={e => set('successCriteria', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Why it matters</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.whyItMatters} onChange={e => set('whyItMatters', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600">Constraints</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.constraints} onChange={e => set('constraints', e.target.value)} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={close} className="px-4 py-2 text-sm text-zinc-600 rounded-lg hover:bg-zinc-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg disabled:opacity-50">
              {loading && <Loader2 size={13} className="animate-spin" />}
              Save goal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
