'use client'

import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import type { TaskPriority, TaskStatus, RiskSeverity, RiskStatus, RoadmapStatus } from '@/lib/types'

export type ConversionType = 'task' | 'note' | 'decision' | 'risk' | 'roadmap'

// ─── Pre-fill helper ──────────────────────────────────────────────────────────

function extractTitle(content: string): string {
  const cleaned = content.replace(/\*\*/g, '').trim()
  const first = cleaned.split('\n').find((l) => l.trim().length > 3) ?? cleaned
  return first.length > 80 ? first.slice(0, 80) + '…' : first
}

function getInitialForm(type: ConversionType, content: string): Record<string, string> {
  const title = extractTitle(content)
  switch (type) {
    case 'task':
      return { title, description: content, priority: 'medium', status: 'todo' }
    case 'note':
      return { title, content }
    case 'decision':
      return { decision: title, reasoning: content }
    case 'risk':
      return { title, description: content, severity: 'medium', mitigation: '', status: 'open' }
    case 'roadmap':
      return { title, description: content, stage: '', status: 'planned' }
  }
}

// ─── Field configs ────────────────────────────────────────────────────────────

const MODAL_CONFIG: Record<ConversionType, { label: string; successMsg: string }> = {
  task:     { label: 'Create Task',       successMsg: 'Task created from AI message.' },
  note:     { label: 'Save Note',         successMsg: 'Note saved from AI message.' },
  decision: { label: 'Log Decision',      successMsg: 'Decision logged from AI message.' },
  risk:     { label: 'Risk added',        successMsg: 'Risk added from AI message.' },
  roadmap:  { label: 'Add Milestone',     successMsg: 'Milestone added from AI message.' },
}

// ─── Shared field components ──────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-zinc-600">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors'
const selectCls = `${inputCls} bg-white`
const textareaCls = `${inputCls} resize-none`

// ─── Form fields per type ─────────────────────────────────────────────────────

function TaskForm({ form, onChange }: { form: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Title *">
        <input className={inputCls} value={form.title} onChange={(e) => onChange('title', e.target.value)} placeholder="Task title" />
      </Field>
      <Field label="Description">
        <textarea className={textareaCls} rows={3} value={form.description} onChange={(e) => onChange('description', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <select className={selectCls} value={form.priority} onChange={(e) => onChange('priority', e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={(e) => onChange('status', e.target.value)}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
          </select>
        </Field>
      </div>
    </>
  )
}

function NoteForm({ form, onChange }: { form: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Title">
        <input className={inputCls} value={form.title} onChange={(e) => onChange('title', e.target.value)} placeholder="Note title" />
      </Field>
      <Field label="Content *">
        <textarea className={textareaCls} rows={5} value={form.content} onChange={(e) => onChange('content', e.target.value)} />
      </Field>
    </>
  )
}

function DecisionForm({ form, onChange }: { form: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Decision *">
        <input className={inputCls} value={form.decision} onChange={(e) => onChange('decision', e.target.value)} placeholder="What was decided?" />
      </Field>
      <Field label="Reasoning">
        <textarea className={textareaCls} rows={4} value={form.reasoning} onChange={(e) => onChange('reasoning', e.target.value)} placeholder="Why this decision?" />
      </Field>
    </>
  )
}

function RiskForm({ form, onChange }: { form: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Risk title *">
        <input className={inputCls} value={form.title} onChange={(e) => onChange('title', e.target.value)} placeholder="What could go wrong?" />
      </Field>
      <Field label="Description">
        <textarea className={textareaCls} rows={2} value={form.description} onChange={(e) => onChange('description', e.target.value)} />
      </Field>
      <Field label="Mitigation">
        <textarea className={textareaCls} rows={2} value={form.mitigation} onChange={(e) => onChange('mitigation', e.target.value)} placeholder="How will you address this?" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Severity">
          <select className={selectCls} value={form.severity} onChange={(e) => onChange('severity', e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={(e) => onChange('status', e.target.value)}>
            <option value="open">Open</option>
            <option value="mitigated">Mitigated</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
      </div>
    </>
  )
}

function RoadmapForm({ form, onChange }: { form: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <>
      <Field label="Milestone title *">
        <input className={inputCls} value={form.title} onChange={(e) => onChange('title', e.target.value)} placeholder="e.g. Launch V1" />
      </Field>
      <Field label="Description">
        <textarea className={textareaCls} rows={3} value={form.description} onChange={(e) => onChange('description', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stage / Phase">
          <input className={inputCls} value={form.stage} onChange={(e) => onChange('stage', e.target.value)} placeholder="e.g. Phase 1" />
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={(e) => onChange('status', e.target.value)}>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </Field>
      </div>
    </>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  type: ConversionType
  sourceContent: string
  onClose: () => void
}

export default function ConversionModal({ type, sourceContent, onClose }: Props) {
  const { addTask, addNote, addDecision, addRisk, addRoadmapItem, roadmapItems } = useProjectContext()
  const [form, setForm] = useState<Record<string, string>>(getInitialForm(type, sourceContent))
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const config = MODAL_CONFIG[type]

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Simulate async — replace with DB call later
    await new Promise((r) => setTimeout(r, 500))

    switch (type) {
      case 'task':
        addTask({
          title: form.title,
          description: form.description,
          priority: form.priority as TaskPriority,
          status: form.status as TaskStatus,
        })
        break
      case 'note':
        addNote({ title: form.title, content: form.content })
        break
      case 'decision':
        addDecision({ decision: form.decision, reasoning: form.reasoning })
        break
      case 'risk':
        addRisk({
          title: form.title,
          description: form.description,
          severity: form.severity as RiskSeverity,
          mitigation: form.mitigation,
          status: form.status as RiskStatus,
        })
        break
      case 'roadmap':
        addRoadmapItem({
          title: form.title,
          description: form.description,
          stage: form.stage,
          status: form.status as RoadmapStatus,
          sortOrder: roadmapItems.length + 1,
        })
        break
    }

    setLoading(false)
    setSuccess(true)
    setTimeout(onClose, 1200)
  }

  const isValid = type === 'task' ? !!form.title?.trim()
    : type === 'note' ? !!form.content?.trim()
    : type === 'decision' ? !!form.decision?.trim()
    : type === 'risk' ? !!form.title?.trim()
    : !!form.title?.trim()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">{config.label}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Edit before saving. Pre-filled from AI message.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <X size={14} />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-14 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <Check size={22} className="text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-zinc-800">{config.successMsg}</p>
            <p className="text-xs text-zinc-400">Check the corresponding tab to see it.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {type === 'task'     && <TaskForm     form={form} onChange={handleChange} />}
              {type === 'note'     && <NoteForm     form={form} onChange={handleChange} />}
              {type === 'decision' && <DecisionForm form={form} onChange={handleChange} />}
              {type === 'risk'     && <RiskForm     form={form} onChange={handleChange} />}
              {type === 'roadmap'  && <RoadmapForm  form={form} onChange={handleChange} />}
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-end gap-3 shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !isValid}
                className="flex items-center gap-2 px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
