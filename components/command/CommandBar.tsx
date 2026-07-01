'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Search, Loader2, ArrowRight, Plus, LayoutDashboard, FolderKanban, Lightbulb,
  Settings, MessageSquare, CheckSquare, FileText, GitFork, AlertTriangle, Map,
  Sparkles, Network, AlertCircle, File, CalendarCheck2, Dna, GitBranch, HelpCircle, Target,
} from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import { createClient } from '@/lib/supabase/client'
import { loadWeeklyReviews, loadLatestProjectDnaForAllProjects, loadPatternAnalyses } from '@/lib/db'
import type { WeeklyReview, ProjectDna, PatternAnalysis } from '@/lib/types'
import {
  parseProjectIdFromPath, buildProjectMap, buildRecentSearchResults,
  filterCommandPalette, createDraftFromParsed, emptyCreateDraft, parseAskMemoryCommand,
  OBJECT_TYPE_LABEL, CREATE_TYPE_LABEL,
  type CommandAction, type CommandSearchResult, type CreateDraft,
} from '@/lib/command'

type PaletteRow =
  | { kind: 'action'; action: CommandAction }
  | { kind: 'result'; result: CommandSearchResult }
  | { kind: 'parsed'; label: string; draft: CreateDraft }
  | { kind: 'askMemory'; question: string }

interface Props {
  onClose: () => void
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors'

export default function CommandBar({ onClose }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { appState, isHydrated, loadError, createProject, createGoal, createIdea, addTask, addNote, addDecision, addRisk, addRoadmapItem } = useAppContext()

  const projectId = parseProjectIdFromPath(pathname)
  const projectMap = useMemo(() => buildProjectMap(appState), [appState])
  const currentProject = projectId ? appState.projects.find(p => p.id === projectId) : undefined

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [mode, setMode] = useState<'palette' | 'create'>('palette')
  const [draft, setDraft] = useState<CreateDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([])
  const [projectDnaRecords, setProjectDnaRecords] = useState<ProjectDna[]>([])
  const [patternAnalyses, setPatternAnalyses] = useState<PatternAnalysis[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!isHydrated) return
    const supabase = createClient()
    void Promise.all([
      loadWeeklyReviews(supabase).then(setWeeklyReviews),
      loadLatestProjectDnaForAllProjects(supabase).then(setProjectDnaRecords),
      loadPatternAnalyses(supabase).then(setPatternAnalyses),
    ]).catch(err => console.error('[CommandBar] failed to load search data:', err))
  }, [isHydrated])

  const { actions, results, parsed, askMemory } = useMemo(
    () => filterCommandPalette(appState, query, projectId, weeklyReviews, projectDnaRecords, patternAnalyses),
    [appState, query, projectId, weeklyReviews, projectDnaRecords, patternAnalyses],
  )

  const recent = useMemo(
    () => (!query.trim() ? buildRecentSearchResults(appState, projectMap) : []),
    [appState, projectMap, query],
  )

  const rows: PaletteRow[] = useMemo(() => {
    if (mode === 'create') return []

    const list: PaletteRow[] = []

    if (parsed) {
      list.push({
        kind: 'parsed',
        label: `${CREATE_TYPE_LABEL[parsed.createType]} — "${parsed.text}"`,
        draft: createDraftFromParsed(parsed),
      })
    }

    if (askMemory) {
      list.push({
        kind: 'askMemory',
        question: askMemory.question,
      })
    }

    for (const action of actions) list.push({ kind: 'action', action })
    for (const result of results) list.push({ kind: 'result', result })

    if (!query.trim()) {
      for (const result of recent) list.push({ kind: 'result', result })
    }

    return list
  }, [mode, parsed, askMemory, actions, results, recent, query])

  useEffect(() => { setSelected(0) }, [query, mode])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selected}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const close = useCallback(() => onClose(), [onClose])

  const openCreate = useCallback((d: CreateDraft) => {
    setMode('create')
    setDraft(d)
    setSaveError(null)
  }, [])

  const runAction = useCallback((action: CommandAction) => {
    if (action.kind === 'navigate' && action.href) {
      close()
      router.push(action.href)
      return
    }
    if (action.kind === 'create' && action.createType) {
      openCreate(emptyCreateDraft(action.createType))
    }
  }, [close, router, openCreate])

  const runAskMemory = useCallback((question: string) => {
    close()
    const base = projectId ? `/projects/${projectId}/memory-search` : '/memory-search'
    router.push(`${base}?q=${encodeURIComponent(question)}&mode=ask`)
  }, [close, router, projectId])

  const runRow = useCallback((row: PaletteRow) => {
    if (row.kind === 'action') runAction(row.action)
    else if (row.kind === 'parsed') openCreate(row.draft)
    else if (row.kind === 'askMemory') runAskMemory(row.question)
    else if (row.kind === 'result') {
      close()
      router.push(row.result.href)
    }
  }, [runAction, openCreate, runAskMemory, close, router])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (mode === 'create') {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (draft) { setMode('palette'); setDraft(null) }
        else close()
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(i => Math.min(i + 1, Math.max(rows.length - 1, 0)))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(i => Math.max(i - 1, 0))
      return
    }

    if (e.key === 'Enter' && rows.length > 0) {
      e.preventDefault()
      runRow(rows[selected])
    }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return
    setSaving(true)
    setSaveError(null)

    try {
      switch (draft.createType) {
        case 'project': {
          if (!draft.title.trim()) throw new Error('Project name is required.')
          const p = await createProject({
            title: draft.title.trim(),
            description: draft.description,
            goal: '',
            status: 'idea',
            priority: 'medium',
            progress: 0,
          })
          close()
          router.push(`/projects/${p.id}`)
          break
        }
        case 'goal': {
          if (!draft.title.trim()) throw new Error('Goal title is required.')
          const goal = await createGoal({
            title: draft.title.trim(),
            description: draft.description,
          })
          close()
          router.push(`/goals/${goal.id}`)
          break
        }
        case 'idea': {
          if (!draft.title.trim()) throw new Error('Idea title is required.')
          const idea = await createIdea({
            title: draft.title.trim(),
            description: draft.description,
            targetUser: '',
            problem: '',
            solution: '',
            potentialScore: 5,
            difficultyScore: 5,
            status: 'Raw',
            tags: [],
          })
          close()
          router.push(`/ideas/${idea.id}`)
          break
        }
        case 'task': {
          if (!projectId) throw new Error('Open a project to create a task.')
          if (!draft.title.trim()) throw new Error('Task title is required.')
          await addTask({
            projectId,
            title: draft.title.trim(),
            description: draft.description,
            priority: 'medium',
            status: 'todo',
          })
          close()
          router.push(`/projects/${projectId}/tasks`)
          break
        }
        case 'note': {
          if (!projectId) throw new Error('Open a project to create a note.')
          if (!draft.title.trim()) throw new Error('Note title is required.')
          await addNote({
            projectId,
            title: draft.title.trim(),
            content: draft.content ?? draft.description,
          })
          close()
          router.push(`/projects/${projectId}/notes`)
          break
        }
        case 'decision': {
          if (!projectId) throw new Error('Open a project to log a decision.')
          if (!draft.decision?.trim()) throw new Error('Decision text is required.')
          await addDecision({
            projectId,
            decision: draft.decision.trim(),
            reasoning: draft.reasoning ?? '',
          })
          close()
          router.push(`/projects/${projectId}/decisions`)
          break
        }
        case 'risk': {
          if (!projectId) throw new Error('Open a project to add a risk.')
          if (!draft.title.trim()) throw new Error('Risk title is required.')
          await addRisk({
            projectId,
            title: draft.title.trim(),
            description: draft.description,
            severity: 'medium',
            mitigation: '',
            status: 'open',
          })
          close()
          router.push(`/projects/${projectId}/risks`)
          break
        }
        case 'roadmap_item': {
          if (!projectId) throw new Error('Open a project to add a roadmap item.')
          if (!draft.title.trim()) throw new Error('Roadmap item title is required.')
          const count = appState.roadmapItems.filter(r => r.projectId === projectId).length
          await addRoadmapItem({
            projectId,
            title: draft.title.trim(),
            description: draft.description,
            stage: draft.stage ?? 'Next',
            status: 'planned',
            sortOrder: count + 1,
          })
          close()
          router.push(`/projects/${projectId}/roadmap`)
          break
        }
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <Search size={16} className="text-zinc-400 shrink-0" />
          {mode === 'create' ? (
            <span className="text-sm font-medium text-zinc-700">
              {draft ? CREATE_TYPE_LABEL[draft.createType] : 'Create'}
            </span>
          ) : (
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or create anything…"
              className="flex-1 text-sm outline-none placeholder:text-zinc-400"
              autoComplete="off"
              spellCheck={false}
            />
          )}
          <kbd className="hidden sm:inline text-[10px] font-medium text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">esc</kbd>
        </div>

        {/* Project context banner */}
        {currentProject && mode === 'palette' && (
          <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100 text-xs text-zinc-500">
            In project: <span className="font-medium text-zinc-700">{currentProject.title}</span>
          </div>
        )}

        {/* Create form */}
        {mode === 'create' && draft && (
          <form onSubmit={handleCreateSubmit} className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {draft.createType === 'decision' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Decision</label>
                  <input
                    autoFocus
                    className={inputCls}
                    value={draft.decision ?? ''}
                    onChange={e => setDraft({ ...draft, decision: e.target.value, title: e.target.value })}
                    placeholder="What did you decide?"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Reasoning</label>
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={2}
                    value={draft.reasoning ?? ''}
                    onChange={e => setDraft({ ...draft, reasoning: e.target.value })}
                    placeholder="Why?"
                  />
                </div>
              </>
            ) : draft.createType === 'note' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Title</label>
                  <input
                    autoFocus
                    className={inputCls}
                    value={draft.title}
                    onChange={e => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Note title"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Content</label>
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={3}
                    value={draft.content ?? ''}
                    onChange={e => setDraft({ ...draft, content: e.target.value })}
                    placeholder="Note content"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Title</label>
                  <input
                    autoFocus
                    className={inputCls}
                    value={draft.title}
                    onChange={e => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Title"
                  />
                </div>
                {(draft.createType === 'project' || draft.createType === 'idea' || draft.createType === 'task' || draft.createType === 'risk' || draft.createType === 'roadmap_item') && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-600">Description</label>
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={2}
                      value={draft.description}
                      onChange={e => setDraft({ ...draft, description: e.target.value })}
                      placeholder="Optional details"
                    />
                  </div>
                )}
                {draft.createType === 'roadmap_item' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-600">Stage</label>
                    <select
                      className={`${inputCls} bg-white`}
                      value={draft.stage ?? 'Next'}
                      onChange={e => setDraft({ ...draft, stage: e.target.value })}
                    >
                      <option value="Now">Now</option>
                      <option value="Next">Next</option>
                      <option value="Later">Later</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {saveError && (
              <p className="text-xs text-red-600 flex items-center gap-1.5">
                <AlertCircle size={12} /> {saveError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setMode('palette'); setDraft(null); setSaveError(null) }}
                className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 disabled:opacity-50"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                Save
              </button>
            </div>
          </form>
        )}

        {/* Palette list */}
        {mode === 'palette' && (
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
            {!isHydrated ? (
              <div className="flex items-center justify-center gap-2 py-10 text-zinc-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading your data…</span>
              </div>
            ) : loadError ? (
              <div className="px-4 py-8 text-center">
                <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-600">{loadError}</p>
              </div>
            ) : rows.length === 0 ? (
              <p className="px-4 py-8 text-sm text-zinc-400 text-center">
                {query.trim() ? 'No results found.' : 'Start typing to search or create.'}
              </p>
            ) : (
              <>
                {!query.trim() && (
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Quick actions &amp; recent
                  </p>
                )}
                {query.trim() && results.length > 0 && (
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Search results
                  </p>
                )}
                {rows.map((row, index) => (
                  <PaletteRowItem
                    key={rowKey(row, index)}
                    row={row}
                    index={index}
                    selected={selected === index}
                    onSelect={() => setSelected(index)}
                    onRun={() => runRow(row)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Footer hints */}
        {mode === 'palette' && (
          <div className="px-4 py-2 border-t border-zinc-100 flex items-center gap-4 text-[10px] text-zinc-400">
            <span><kbd className="font-medium">↑↓</kbd> navigate</span>
            <span><kbd className="font-medium">↵</kbd> select</span>
            <span><kbd className="font-medium">esc</kbd> close</span>
            <span className="ml-auto hidden sm:inline">Try: new task: …</span>
          </div>
        )}
      </div>
    </div>
  )
}

function rowKey(row: PaletteRow, index: number): string {
  if (row.kind === 'action') return row.action.id
  if (row.kind === 'result') return `${row.result.objectType}-${row.result.id}`
  if (row.kind === 'askMemory') return `ask-memory-${index}`
  return `parsed-${index}`
}

function PaletteRowItem({
  row, index, selected, onSelect, onRun,
}: {
  row: PaletteRow
  index: number
  selected: boolean
  onSelect: () => void
  onRun: () => void
}) {
  const Icon = row.kind === 'action'
    ? actionIcon(row.action)
    : row.kind === 'parsed'
      ? Plus
      : row.kind === 'askMemory'
        ? Sparkles
        : objectIcon(row.result.objectType)

  const label = row.kind === 'action'
    ? row.action.label
    : row.kind === 'parsed'
      ? row.label
      : row.kind === 'askMemory'
        ? `Ask Memory — "${row.question}"`
        : row.result.title

  const description = row.kind === 'action'
    ? row.action.description ?? (row.action.kind === 'create' ? 'Create' : 'Go to page')
    : row.kind === 'parsed'
      ? 'Press Enter to open create form'
      : row.kind === 'askMemory'
        ? 'Press Enter to ask using your workspace memory'
        : row.result.preview

  const badge = row.kind === 'result'
    ? OBJECT_TYPE_LABEL[row.result.objectType]
    : row.kind === 'askMemory'
      ? 'Ask Memory'
      : row.kind === 'action' && row.action.kind === 'create'
        ? 'Create'
        : row.kind === 'parsed'
          ? 'Create'
          : 'Navigate'

  const meta = row.kind === 'result' && row.result.projectName
    ? row.result.projectName
    : undefined

  return (
    <button
      type="button"
      data-index={index}
      onMouseEnter={onSelect}
      onClick={onRun}
      className={[
        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
        selected ? 'bg-zinc-100' : 'hover:bg-zinc-50',
      ].join(' ')}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-white border border-zinc-200' : 'bg-zinc-50'}`}>
        <Icon size={14} className="text-zinc-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">{label}</p>
        <p className="text-xs text-zinc-400 truncate">{description}{meta ? ` · ${meta}` : ''}</p>
      </div>
      <span className="shrink-0 text-[10px] font-medium text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">
        {badge}
      </span>
      {selected && <ArrowRight size={14} className="text-zinc-400 shrink-0" />}
    </button>
  )
}

function actionIcon(action: CommandAction) {
  if (action.kind === 'create') return Plus
  const href = action.href ?? ''
  if (href.includes('/chat')) return MessageSquare
  if (href.includes('/tasks')) return CheckSquare
  if (href.includes('/notes')) return FileText
  if (href.includes('/decisions')) return GitFork
  if (href.includes('/risks')) return AlertTriangle
  if (href.includes('/roadmap')) return Map
  if (href.includes('/dna')) return Dna
  if (href.includes('/patterns')) return GitBranch
  if (href.includes('/goals')) return Target
  if (href.includes('/how-it-works')) return HelpCircle
  if (href.includes('/weekly-review')) return CalendarCheck2
  if (href.includes('/review')) return Sparkles
  if (href.includes('/memory')) return Network
  if (href.includes('/ideas')) return Lightbulb
  if (href.includes('/settings')) return Settings
  if (href.includes('/projects')) return FolderKanban
  return LayoutDashboard
}

function objectIcon(type: CommandSearchResult['objectType']) {
  switch (type) {
    case 'project': return FolderKanban
    case 'idea': return Lightbulb
    case 'goal': return Target
    case 'task': return CheckSquare
    case 'note': return FileText
    case 'decision': return GitFork
    case 'risk': return AlertTriangle
    case 'roadmap_item': return Map
    case 'project_file': return File
    case 'weekly_review': return CalendarCheck2
    case 'project_dna': return Dna
    case 'pattern_analysis': return GitBranch
  }
}
