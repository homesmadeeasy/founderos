'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Target } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import GoalModal from '@/components/goals/GoalModal'
import LoadingScreen, { ErrorScreen } from '@/components/ui/LoadingScreen'
import EmptyState from '@/components/ui/EmptyState'
import type { Goal } from '@/lib/types'

function GoalCard({ goal }: { goal: Goal }) {
  return (
    <Link
      href={`/goals/${goal.id}`}
      className="block bg-white rounded-xl border border-zinc-100 p-4 hover:border-zinc-200 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate">{goal.title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{goal.category} · {goal.priority}</p>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5 shrink-0">
          {goal.status}
        </span>
      </div>
      {goal.description && (
        <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{goal.description}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${goal.progress}%` }} />
        </div>
        <span className="text-[10px] text-zinc-400">{goal.progress}%</span>
      </div>
    </Link>
  )
}

function GoalSection({ title, goals }: { title: string; goals: Goal[] }) {
  if (!goals.length) return null
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {goals.map(g => <GoalCard key={g.id} goal={g} />)}
      </div>
    </section>
  )
}

export default function GoalsPage() {
  const { appState, isHydrated, loadError } = useAppContext()
  const [showCreate, setShowCreate] = useState(false)

  const grouped = useMemo(() => ({
    active: appState.goals.filter(g => g.status === 'Active'),
    paused: appState.goals.filter(g => g.status === 'Paused'),
    completed: appState.goals.filter(g => g.status === 'Completed'),
  }), [appState.goals])

  if (!isHydrated) return <div className="p-6"><LoadingScreen label="Loading goals…" /></div>
  if (loadError) return <div className="p-6"><ErrorScreen message={loadError} /></div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Goals</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Top-level outcomes that span worlds — what you are working toward over time.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <Plus size={13} /> Create goal
        </button>
      </div>

      {appState.goals.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-100">
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Goals help FounderOS connect your worlds, reviews and weekly focus to what actually matters."
            action={{ label: 'Create your first goal', onClick: () => setShowCreate(true) }}
          />
        </div>
      ) : (
        <div className="space-y-8">
          <GoalSection title="Active" goals={grouped.active} />
          <GoalSection title="Paused" goals={grouped.paused} />
          <GoalSection title="Completed" goals={grouped.completed} />
        </div>
      )}

      <GoalModal open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
