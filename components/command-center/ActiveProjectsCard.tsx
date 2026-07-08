'use client'

import { useState } from 'react'
import { FolderKanban, Plus } from 'lucide-react'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import {
  LIFE_AREAS, LIFE_AREA_LABEL, PROJECT_STATUSES,
} from '@/lib/command-center/types'
import type { LifeArea, ProjectStatus } from '@/lib/command-center/types'
import CardShell from './CardShell'

export default function ActiveProjectsCard() {
  const { state, addProject, updateProject } = useCommandCenter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [area, setArea] = useState<LifeArea>('systems')

  const active = state.projects.filter(p => p.status === 'active')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addProject({
      name: name.trim(),
      status: 'active',
      area,
      outcome: '',
      nextAction: '',
    })
    setName('')
    setShowForm(false)
  }

  return (
    <CardShell
      title="Active Projects"
      icon={FolderKanban}
      action={
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
        >
          <Plus size={14} /> Add
        </button>
      }
    >
      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Project name"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            autoFocus
          />
          <select
            value={area}
            onChange={e => setArea(e.target.value as LifeArea)}
            className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-xs"
          >
            {LIFE_AREAS.map(a => <option key={a} value={a}>{LIFE_AREA_LABEL[a]}</option>)}
          </select>
          <button type="submit" className="w-full py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold">
            Add project
          </button>
        </form>
      )}

      {active.length === 0 ? (
        <p className="text-sm text-zinc-400">No active projects. Create one to organise your work.</p>
      ) : (
        <ul className="space-y-3">
          {active.map(project => (
            <li key={project.id} className="p-3 rounded-xl border border-zinc-100 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <input
                  value={project.name}
                  onChange={e => updateProject(project.id, { name: e.target.value })}
                  className="text-sm font-semibold text-zinc-900 bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full"
                />
                <select
                  value={project.status}
                  onChange={e => updateProject(project.id, { status: e.target.value as ProjectStatus })}
                  className="text-[10px] rounded-md border border-zinc-200 px-1.5 py-0.5 shrink-0"
                >
                  {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <select
                value={project.area}
                onChange={e => updateProject(project.id, { area: e.target.value as LifeArea })}
                className="text-[11px] rounded-md border border-zinc-200 px-2 py-1"
              >
                {LIFE_AREAS.map(a => <option key={a} value={a}>{LIFE_AREA_LABEL[a]}</option>)}
              </select>
              <input
                value={project.outcome}
                onChange={e => updateProject(project.id, { outcome: e.target.value })}
                placeholder="Outcome"
                className="w-full text-xs text-zinc-500 rounded-lg border border-zinc-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-200"
              />
              <input
                value={project.nextAction}
                onChange={e => updateProject(project.id, { nextAction: e.target.value })}
                placeholder="Next action"
                className="w-full text-xs text-zinc-700 rounded-lg border border-zinc-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-200"
              />
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  )
}
