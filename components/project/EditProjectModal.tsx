'use client'

import { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import type { Project, ProjectStatus, ProjectPriority } from '@/lib/types'

interface Props {
  project: Project
  onClose: () => void
}

const inputCls    = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors'
const selectCls   = `${inputCls} bg-white`
const textareaCls = `${inputCls} resize-none`

export default function EditProjectModal({ project, onClose }: Props) {
  const { updateProject } = useAppContext()

  const [form, setForm] = useState({
    title:       project.title,
    description: project.description,
    goal:        project.goal,
    status:      project.status as ProjectStatus,
    priority:    project.priority as ProjectPriority,
    progress:    project.progress,
  })
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    updateProject(project.id, form)
    setLoading(false)
    setSaved(true)
    setTimeout(onClose, 900)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-900">Edit project</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <X size={14} />
          </button>
        </div>

        {saved ? (
          <div className="px-6 py-14 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <Check size={22} className="text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-zinc-800">Changes saved.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">Project name <span className="text-red-400">*</span></label>
                <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} required />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">Description</label>
                <textarea className={textareaCls} rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
              </div>

              {/* Goal */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">V1 Goal</label>
                <textarea className={textareaCls} rows={2} value={form.goal} onChange={e => set('goal', e.target.value)} />
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
                    <option value="archived">Archived</option>
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

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-600">Progress</label>
                  <span className="text-xs font-semibold text-zinc-700">{form.progress}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={form.progress}
                  onChange={e => set('progress', parseInt(e.target.value))}
                  className="w-full h-2 accent-zinc-900 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-end gap-3 shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={loading || !form.title.trim()} className="flex items-center gap-2 px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {loading && <Loader2 size={13} className="animate-spin" />}
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
