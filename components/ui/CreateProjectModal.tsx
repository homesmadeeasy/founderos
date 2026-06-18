'use client'

import { useState } from 'react'
import { Plus, X, Check, Loader2 } from 'lucide-react'

type Status = 'active' | 'paused'

interface FormState {
  title: string
  description: string
  goal: string
  status: Status
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  goal: '',
  status: 'active',
}

export default function CreateProjectModal() {
  const [open, setOpen]         = useState(false)
  const [form, setForm]         = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)

  function close() {
    setOpen(false)
    setForm(EMPTY_FORM)
    setSuccess(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    // Simulate async save — replace with Supabase call later
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    setSuccess(true)
    setTimeout(close, 1400)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
      >
        <Plus size={13} />
        New Project
      </button>

      {/* Backdrop + modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Create new project</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Start with a name and a goal.</p>
              </div>
              <button
                onClick={close}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {success ? (
              /* Success state */
              <div className="px-6 py-14 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Check size={22} className="text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-zinc-800">Project created!</p>
                <p className="text-xs text-zinc-400">"{form.title}" is ready. Connect Supabase to save permanently.</p>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600" htmlFor="title">
                    Project name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. FounderOS, My SaaS, Pitch Deck"
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors placeholder:text-zinc-400"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={2}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="What is this project about?"
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors resize-none placeholder:text-zinc-400"
                  />
                </div>

                {/* Goal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600" htmlFor="goal">
                    V1 Goal
                  </label>
                  <textarea
                    id="goal"
                    name="goal"
                    rows={2}
                    value={form.goal}
                    onChange={handleChange}
                    placeholder="What does success look like for V1?"
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors resize-none placeholder:text-zinc-400"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600" htmlFor="status">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !form.title.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading && <Loader2 size={13} className="animate-spin" />}
                    {loading ? 'Creating…' : 'Create project'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
