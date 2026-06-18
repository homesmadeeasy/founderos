'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import type { ProjectStatus, ProjectPriority } from '@/lib/types'

interface FormState {
  title: string
  description: string
  goal: string
  status: ProjectStatus
  priority: ProjectPriority
  progress: number
}

const EMPTY: FormState = {
  title: '', description: '', goal: '',
  status: 'idea', priority: 'medium', progress: 0,
}

const inputCls  = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors'
const selectCls = `${inputCls} bg-white`

export default function CreateProjectModal() {
  const router = useRouter()
  const { createProject } = useAppContext()
  const [open, setOpen]     = useState(false)
  const [form, setForm]     = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)

  function close() { setOpen(false); setForm(EMPTY) }

  function set(k: keyof FormState, v: string | number) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const project = createProject(form)
    close()
    router.push(`/projects/${project.id}`)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
      >
        <Plus size={13} /> New Project
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) close() }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Create new project</h2>
                <p className="text-xs text-zinc-400 mt-0.5">You'll be taken to the project page after creating.</p>
              </div>
              <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">Project name <span className="text-red-400">*</span></label>
                <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. My SaaS, Pitch Deck, Landing Page" required />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">Description</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What is this project about?" />
              </div>

              {/* Goal */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">V1 Goal</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.goal} onChange={e => set('goal', e.target.value)} placeholder="What does success look like?" />
              </div>

              {/* Status + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Status</label>
                  <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value as ProjectStatus)}>
                    <option value="idea">Idea</option>
                    <option value="planning">Planning</option>
                    <option value="building">Building</option>
                    <option value="testing">Testing</option>
                    <option value="launched">Launched</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Priority</label>
                  <select className={selectCls} value={form.priority} onChange={e => set('priority', e.target.value as ProjectPriority)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={loading || !form.title.trim()} className="flex items-center gap-2 px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  {loading ? 'Creating…' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
