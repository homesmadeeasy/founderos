'use client'

import { useState } from 'react'
import {
  GitBranch, FileText, TrendingUp, TrendingDown, Zap, Lightbulb, ShieldAlert,
  GitFork, Activity, AlertOctagon, Sparkles, Target, Plus, Check, Loader2,
} from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import StatusBadge from '@/components/ui/StatusBadge'
import type { PatternAnalysis, SuggestedPatternAction, TaskPriority } from '@/lib/types'

const PRIORITY_MAP: Record<string, TaskPriority> = { Low: 'low', Medium: 'medium', High: 'high' }

function Section({ icon: Icon, title, text }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  text: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-zinc-400" />
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</h4>
      </div>
      <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
        {text?.trim() || <span className="text-zinc-400">Not enough information yet.</span>}
      </p>
    </div>
  )
}

export default function PatternAnalysisCard({ analysis }: { analysis: PatternAnalysis }) {
  const { appState, addTask, addNote, createIdea } = useAppContext()
  const { projects } = appState
  const activeProjects = projects.filter(p => p.status !== 'archived')

  const [addedActions, setAddedActions] = useState<Record<number, 'loading' | 'done'>>({})
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjects[0]?.id ?? '')

  async function addAction(index: number, projectId: string) {
    const action = analysis.suggestedActions[index]
    if (!action || addedActions[index]) return
    setAddedActions(prev => ({ ...prev, [index]: 'loading' }))
    setPickerIndex(null)
    try {
      if (action.type === 'idea') {
        await createIdea({
          title: action.title,
          description: action.description,
          targetUser: '', problem: '', solution: '',
          potentialScore: 5, difficultyScore: 5,
          status: 'Raw', tags: ['pattern-analysis'],
        })
      } else if (action.type === 'task' || action.type === 'habit' || action.type === 'decision' || action.type === 'review') {
        if (!projectId) throw new Error('Project required')
        if (action.type === 'task' || action.type === 'habit') {
          await addTask({
            projectId,
            title: action.title,
            description: action.description,
            priority: PRIORITY_MAP[action.priority] ?? 'medium',
            status: 'todo',
          })
        } else {
          await addNote({
            projectId,
            title: action.title,
            content: action.description,
          })
        }
      }
      setAddedActions(prev => ({ ...prev, [index]: 'done' }))
    } catch {
      setAddedActions(prev => {
        const next = { ...prev }
        delete next[index]
        return next
      })
    }
  }

  function handleAddClick(index: number) {
    const action = analysis.suggestedActions[index]
    if (!action) return
    if (action.type === 'idea') {
      void addAction(index, '')
    } else if (activeProjects.length === 1) {
      void addAction(index, activeProjects[0].id)
    } else if (activeProjects.length > 1) {
      setPickerIndex(index)
      setSelectedProjectId(activeProjects[0]?.id ?? '')
    }
  }

  function actionLabel(type: SuggestedPatternAction['type']): string {
    if (type === 'idea') return 'Add to Idea Vault'
    if (type === 'task' || type === 'habit') return 'Add as Task'
    return 'Add as Note'
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/60">
        <p className="text-xs font-medium text-zinc-500">
          Generated {new Date(analysis.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="p-5 space-y-5">
        <Section icon={FileText} title="Summary" text={analysis.summary} />
        <Section icon={TrendingUp} title="Recurring Strengths" text={analysis.recurringStrengths} />
        <Section icon={TrendingDown} title="Recurring Weaknesses" text={analysis.recurringWeaknesses} />
        <Section icon={Zap} title="Execution Patterns" text={analysis.executionPatterns} />
        <Section icon={Lightbulb} title="Idea Patterns" text={analysis.ideaPatterns} />
        <Section icon={ShieldAlert} title="Risk Patterns" text={analysis.riskPatterns} />
        <Section icon={GitFork} title="Decision Patterns" text={analysis.decisionPatterns} />
        <Section icon={Activity} title="Project Momentum Patterns" text={analysis.projectMomentumPatterns} />
        <Section icon={AlertOctagon} title="Bottlenecks" text={analysis.bottlenecks} />
        <Section icon={Sparkles} title="Opportunities" text={analysis.opportunities} />
        <Section icon={Target} title="Recommended Changes" text={analysis.recommendedChanges} />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target size={13} className="text-zinc-400" />
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Suggested Actions <span className="text-zinc-300">({analysis.suggestedActions.length})</span>
            </h4>
          </div>
          {analysis.suggestedActions.length === 0 ? (
            <p className="text-sm text-zinc-400">No suggested actions.</p>
          ) : (
            <div className="space-y-2">
              {analysis.suggestedActions.map((a, i) => {
                const state = addedActions[i]
                const canAdd = a.type === 'idea' || activeProjects.length > 0
                return (
                  <div key={i}>
                    <div className="flex items-start gap-3 border border-zinc-100 rounded-lg p-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-zinc-800">{a.title}</p>
                          <StatusBadge status={a.priority.toLowerCase()} />
                          <span className="text-[10px] text-zinc-400 bg-zinc-50 rounded-full px-2 py-0.5">{a.type}</span>
                        </div>
                        {a.description && <p className="text-xs text-zinc-500 leading-relaxed">{a.description}</p>}
                      </div>
                      {canAdd && (
                        <AddButton
                          state={state}
                          label={actionLabel(a.type)}
                          onClick={() => handleAddClick(i)}
                        />
                      )}
                    </div>
                    {pickerIndex === i && (
                      <div className="mt-2 ml-3 p-3 border border-zinc-200 rounded-lg bg-zinc-50 space-y-2">
                        <p className="text-xs text-zinc-500">Choose a project:</p>
                        <select
                          value={selectedProjectId}
                          onChange={e => setSelectedProjectId(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
                        >
                          {activeProjects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={!selectedProjectId}
                            onClick={() => void addAction(i, selectedProjectId)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 disabled:opacity-40"
                          >
                            Confirm
                          </button>
                          <button type="button" onClick={() => setPickerIndex(null)} className="px-3 py-1.5 text-xs text-zinc-600">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AddButton({ state, label, onClick }: {
  state?: 'loading' | 'done'
  label: string
  onClick: () => void
}) {
  if (state === 'done') {
    return (
      <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg">
        <Check size={12} /> Added
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'loading'}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
    >
      {state === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
      {label}
    </button>
  )
}
