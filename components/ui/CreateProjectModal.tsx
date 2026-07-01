'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Sparkles } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import type { ProjectStatus, ProjectPriority, WorldType } from '@/lib/types'
import { WORLD_TYPES, WORLD_TYPE_EXAMPLES } from '@/lib/world'

interface FormState {
  title: string
  description: string
  worldType: WorldType
  worldPurpose: string
  lifeArea: string
  goal: string
  status: ProjectStatus
  priority: ProjectPriority
  progress: number
}

const EMPTY: FormState = {
  title: '', description: '', worldType: 'Custom', worldPurpose: '', lifeArea: '', goal: '',
  status: 'idea', priority: 'medium', progress: 0,
}

const inputCls  = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors'
const selectCls = `${inputCls} bg-white`

export default function CreateProjectModal({
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
} = {}) {
  const router = useRouter()
  const { createProject, reload } = useAppContext()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }
  const [form, setForm] = useState<FormState>(EMPTY)
  const [useAiSetup, setUseAiSetup] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setupSummary, setSetupSummary] = useState<string | null>(null)

  function close() {
    setOpen(false)
    setForm(EMPTY)
    setError(null)
    setSetupSummary(null)
    setUseAiSetup(true)
  }

  function set(k: keyof FormState, v: string | number) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    setError(null)
    setSetupSummary(null)
    try {
      const project = await createProject({
        title: form.title.trim(),
        description: form.description,
        goal: form.goal,
        worldType: form.worldType,
        worldPurpose: form.worldPurpose,
        lifeArea: form.lifeArea,
        status: form.status,
        priority: form.priority,
        progress: form.progress,
      })

      if (useAiSetup) {
        const res = await fetch('/api/world-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: project.id,
            title: form.title,
            description: form.description,
            world_type: form.worldType,
            world_purpose: form.worldPurpose,
            goal: form.goal,
            life_area: form.lifeArea,
          }),
        })
        const data = await res.json() as {
          setup?: { worldSummary?: string; nextBestStep?: string }
          created?: Record<string, number>
          error?: string
        }
        if (!res.ok && !data.setup) {
          throw new Error(data.error ?? 'AI world setup failed.')
        }
        await reload()
        if (data.setup?.worldSummary) {
          setSetupSummary(data.setup.worldSummary)
        }
        if (data.error) setError(data.error)
      }

      close()
      router.push(`/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the world. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <Plus size={13} /> Create World
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) close() }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-8">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Create a new world</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  What do you want FounderOS to help you manage, build, understand or improve?
                </p>
              </div>
              <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2 text-xs text-zinc-500">
                Examples: {WORLD_TYPES.slice(0, 6).map(t => WORLD_TYPE_EXAMPLES[t]).join(' · ')}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">World name <span className="text-red-400">*</span></label>
                <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Exam prep, Side business, Fitness plan" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600">World type</label>
                  <select className={selectCls} value={form.worldType} onChange={e => set('worldType', e.target.value)}>
                    {WORLD_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Life area</label>
                  <input className={inputCls} value={form.lifeArea} onChange={e => set('lifeArea', e.target.value)} placeholder="e.g. School, Startup" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">Purpose</label>
                <input className={inputCls} value={form.worldPurpose} onChange={e => set('worldPurpose', e.target.value)} placeholder="Why this world exists" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">Description</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What is this world about?" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-600">Primary goal</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.goal} onChange={e => set('goal', e.target.value)} placeholder="What does success look like?" />
              </div>

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

              <div className="rounded-lg border border-zinc-100 p-3 space-y-2">
                <p className="text-xs font-semibold text-zinc-600">Starting structure</p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" checked={!useAiSetup} onChange={() => setUseAiSetup(false)} className="mt-0.5" />
                  <span className="text-sm text-zinc-700">Create blank world</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" checked={useAiSetup} onChange={() => setUseAiSetup(true)} className="mt-0.5" />
                  <span className="text-sm text-zinc-700 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-violet-500" />
                    Create with AI setup — generates starter tasks, risks, decisions and path items
                  </span>
                </label>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                  <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={loading || !form.title.trim()} className="flex items-center gap-2 px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  {loading ? 'Creating…' : useAiSetup ? 'Create world with AI' : 'Create world'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
