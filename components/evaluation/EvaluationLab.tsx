'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Play, RotateCcw, Download, AlertTriangle, CheckCircle2, XCircle, ChevronRight, FlaskConical, Clock,
} from 'lucide-react'
import Card from '@/components/home/Card'
import { runAllEvaluations, runFailedEvaluations } from '@/lib/evaluation/founder-ai/evaluationRunner'
import { ALL_EVALUATION_SCENARIOS, resetEvaluationFixtures } from '@/lib/evaluation/founder-ai/evaluationScenarios'
import {
  saveEvaluationSummary,
  setActiveEvaluationReport,
  getActiveEvaluationReport,
  clearEvaluationSummaries,
} from '@/lib/evaluation/founder-ai/evaluationStorage'
import { exportReportJson } from '@/lib/evaluation/founder-ai/evaluationReport'
import { DIMENSION_LABELS } from '@/lib/evaluation/founder-ai/evaluationScoring'
import { EVALUATION_DIMENSIONS } from '@/lib/evaluation/founder-ai/evaluationTypes'
import type { EvaluationReport, EvaluationScenarioResult } from '@/lib/evaluation/founder-ai/evaluationTypes'
import EvaluationScenarioDetail from './EvaluationScenarioDetail'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import { setEvaluationKernelEmitter } from '@/lib/evaluation/founder-ai/evaluationKernelEvents'
import type { FounderEventType } from '@/lib/founder-kernel/kernelTypes'

function statusIcon(passed: boolean, critical: boolean) {
  if (critical && !passed) return <AlertTriangle size={14} className="text-rose-500" />
  return passed
    ? <CheckCircle2 size={14} className="text-emerald-500" />
    : <XCircle size={14} className="text-amber-500" />
}

export default function EvaluationLab() {
  const { publish } = useFounderKernel()
  const [report, setReport] = useState<EvaluationReport | null>(() => getActiveEvaluationReport())
  const [running, setRunning] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setEvaluationKernelEmitter((type, payload) => {
      void publish({
        type: type as FounderEventType,
        source: 'evaluation',
        payload: payload ?? {},
      })
    })
    return () => setEvaluationKernelEmitter(null)
  }, [publish])

  const selected = useMemo(
    () => report?.scenarioResults.find(r => r.scenarioId === selectedId) ?? null,
    [report, selectedId],
  )

  const runEval = useCallback(async (mode: 'all' | 'failed') => {
    setRunning(true)
    try {
      const next = mode === 'failed' && report
        ? runFailedEvaluations(report, { emitKernelEvents: true })
        : runAllEvaluations({ emitKernelEvents: true })
      setActiveEvaluationReport(next)
      saveEvaluationSummary(next)
      setReport(next)
      if (!selectedId && next.scenarioResults[0]) {
        setSelectedId(next.scenarioResults[0].scenarioId)
      }
    } finally {
      setRunning(false)
    }
  }, [report, selectedId])

  const handleReset = useCallback(() => {
    resetEvaluationFixtures()
    clearEvaluationSummaries()
    setActiveEvaluationReport(null)
    setReport(null)
    setSelectedId(null)
  }, [])

  const handleExport = useCallback(() => {
    if (!report) return
    const blob = new Blob([exportReportJson(report)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `founder-ai-evaluation-${report.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [report])

  const categories = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of ALL_EVALUATION_SCENARIOS) {
      map.set(s.category, (map.get(s.category) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [])

  return (
    <div className="home-page min-h-screen">
      <div className="home-canvas max-w-[1120px] mx-auto px-4 sm:px-5 py-5 sm:py-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-violet-600 mb-1">
              <FlaskConical size={18} />
              <span className="text-xs font-semibold uppercase tracking-wider">Development only</span>
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900">Evaluation Lab</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Founder AI intelligence and reliability — multi-turn structural checks, not prose matching.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={running}
              onClick={() => void runEval('all')}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Play size={14} />
              Run All
            </button>
            <button
              type="button"
              disabled={running || !report?.failed}
              onClick={() => void runEval('failed')}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Run Failed
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
              <RotateCcw size={14} />
              Reset Fixtures
            </button>
            <button
              type="button"
              disabled={!report}
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              <Download size={14} />
              Export Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
          <div className="space-y-5">
            <Card className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Overall score</p>
                  <p className="text-3xl font-semibold text-zinc-900 mt-1">
                    {report ? report.overallScore : '—'}
                    <span className="text-base text-zinc-400 font-normal">/100</span>
                  </p>
                  {report?.previousRunComparison && (
                    <p className={`text-xs mt-1 ${report.previousRunComparison.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {report.previousRunComparison.delta >= 0 ? '+' : ''}{report.previousRunComparison.delta} vs last run
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Scenarios</p>
                  <p className="text-lg font-medium text-zinc-800 mt-1">
                    <span className="text-emerald-600">{report?.passed ?? 0}</span>
                    {' / '}
                    <span className="text-amber-600">{report?.failed ?? 0}</span>
                    {' failed'}
                  </p>
                  <p className="text-xs text-rose-600 mt-1">{report?.criticalFailures ?? 0} critical</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Duration</p>
                  <p className="text-lg font-medium text-zinc-800 mt-1 flex items-center gap-1">
                    <Clock size={14} className="text-zinc-400" />
                    {report ? `${report.durationMs}ms` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Scenarios defined</p>
                  <p className="text-lg font-medium text-zinc-800 mt-1">{ALL_EVALUATION_SCENARIOS.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-semibold text-zinc-900 mb-3">Dimension scores</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EVALUATION_DIMENSIONS.map(d => (
                  <div key={d} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg bg-zinc-50/80">
                    <span className="text-zinc-600">{DIMENSION_LABELS[d]}</span>
                    <span className="font-medium text-zinc-900">{report?.dimensionScores[d] ?? '—'}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">Scenarios</h2>
                <span className="text-xs text-zinc-400">{categories.length} categories</span>
              </div>
              <div className="divide-y divide-zinc-50 max-h-[420px] overflow-y-auto">
                {(report?.scenarioResults ?? ALL_EVALUATION_SCENARIOS.map(s => ({
                  scenarioId: s.id,
                  title: s.title,
                  category: s.category,
                  passed: false,
                  criticalFailed: s.severity === 'critical',
                  score: 0,
                  durationMs: 0,
                } as Partial<EvaluationScenarioResult>))).map((row) => {
                  const id = row.scenarioId!
                  const full = report?.scenarioResults.find(r => r.scenarioId === id)
                  const scenario = ALL_EVALUATION_SCENARIOS.find(s => s.id === id)
                  const active = selectedId === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedId(id)}
                      className={`w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-violet-50/50 transition-colors ${active ? 'bg-violet-50/80' : ''}`}
                    >
                      {full ? statusIcon(full.passed, full.criticalFailed) : <span className="w-3.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 truncate">{row.title ?? scenario?.title}</p>
                        <p className="text-xs text-zinc-400">{row.category ?? scenario?.category}</p>
                      </div>
                      <span className="text-xs font-medium text-zinc-500">{full ? full.score : '—'}</span>
                      <span className="text-xs text-zinc-400">{full ? `${full.durationMs}ms` : ''}</span>
                      <ChevronRight size={14} className="text-zinc-300" />
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          <div className="lg:sticky lg:top-6">
            {selected ? (
              <EvaluationScenarioDetail
                scenario={ALL_EVALUATION_SCENARIOS.find(s => s.id === selected.scenarioId)!}
                result={selected}
              />
            ) : (
              <Card className="p-5">
                <p className="text-sm text-zinc-500">Run evaluations or select a scenario to inspect expected vs actual state, traces, and assertion failures.</p>
                <Link href="/settings" className="inline-block mt-3 text-sm text-violet-600 hover:underline">
                  Settings → Reliability summary
                </Link>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
