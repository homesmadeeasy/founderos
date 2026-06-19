'use client'

import {
  FileText, Users, AlertCircle, TrendingUp, Gauge, ShieldAlert,
  Rocket, FlaskConical, ArrowRightCircle, FolderPlus, CheckSquare, Map,
} from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import type { IdeaAnalysis } from '@/lib/types'

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

export default function IdeaAnalysisCard({ analysis }: { analysis: IdeaAnalysis }) {
  const sp = analysis.suggestedProject

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/60">
        <p className="text-xs font-medium text-zinc-500">
          Analysed {new Date(analysis.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="p-5 space-y-5">
        <Section icon={FileText}         title="Summary"          text={analysis.summary} />
        <Section icon={Users}            title="Target User"      text={analysis.targetUserAnalysis} />
        <Section icon={AlertCircle}      title="Problem"          text={analysis.problemAnalysis} />
        <Section icon={TrendingUp}       title="Market Potential" text={analysis.marketPotential} />
        <Section icon={Gauge}            title="Difficulty"       text={analysis.difficultyAnalysis} />
        <Section icon={ShieldAlert}      title="Risks"            text={analysis.risks} />
        <Section icon={Rocket}           title="MVP Suggestion"   text={analysis.mvpSuggestion} />
        <Section icon={FlaskConical}     title="Validation Plan"  text={analysis.validationPlan} />
        <Section icon={ArrowRightCircle} title="Next Steps"       text={analysis.nextSteps} />

        {/* Suggested project */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FolderPlus size={13} className="text-zinc-400" />
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Suggested Project</h4>
          </div>
          {sp ? (
            <div className="border border-zinc-100 rounded-lg p-4 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-zinc-800">{sp.title}</p>
                <StatusBadge status={sp.status.toLowerCase()} />
                <StatusBadge status={sp.priority.toLowerCase()} />
              </div>
              {sp.description && <p className="text-xs text-zinc-600 leading-relaxed">{sp.description}</p>}
              {sp.goal && <p className="text-xs text-zinc-500 leading-relaxed"><span className="font-medium text-zinc-600">Goal:</span> {sp.goal}</p>}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No project suggestion.</p>
          )}
        </div>

        {/* Suggested tasks */}
        <SuggestionList
          icon={CheckSquare}
          title="Suggested Tasks"
          count={analysis.suggestedTasks.length}
          empty="No task suggestions."
        >
          {analysis.suggestedTasks.map((t, i) => (
            <div key={i} className="flex items-start gap-2 py-2">
              <StatusBadge status={t.priority.toLowerCase()} />
              <div className="min-w-0">
                <p className="text-sm text-zinc-700">{t.title}</p>
                {t.description && <p className="text-xs text-zinc-400 leading-relaxed">{t.description}</p>}
              </div>
            </div>
          ))}
        </SuggestionList>

        {/* Suggested risks */}
        <SuggestionList
          icon={ShieldAlert}
          title="Suggested Risks"
          count={analysis.suggestedRisks.length}
          empty="No risk suggestions."
        >
          {analysis.suggestedRisks.map((r, i) => (
            <div key={i} className="flex items-start gap-2 py-2">
              <StatusBadge status={r.severity.toLowerCase()} />
              <div className="min-w-0">
                <p className="text-sm text-zinc-700">{r.title}</p>
                {r.description && <p className="text-xs text-zinc-400 leading-relaxed">{r.description}</p>}
                {r.mitigation && <p className="text-xs text-zinc-400 leading-relaxed"><span className="font-medium text-zinc-500">Mitigation:</span> {r.mitigation}</p>}
              </div>
            </div>
          ))}
        </SuggestionList>

        {/* Suggested roadmap items */}
        <SuggestionList
          icon={Map}
          title="Suggested Roadmap Items"
          count={analysis.suggestedRoadmapItems.length}
          empty="No roadmap suggestions."
        >
          {analysis.suggestedRoadmapItems.map((r, i) => (
            <div key={i} className="flex items-start gap-2 py-2">
              {r.stage && <span className="text-[11px] font-medium text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5 shrink-0">{r.stage}</span>}
              <div className="min-w-0">
                <p className="text-sm text-zinc-700">{r.title}</p>
                {r.description && <p className="text-xs text-zinc-400 leading-relaxed">{r.description}</p>}
              </div>
            </div>
          ))}
        </SuggestionList>
      </div>
    </div>
  )
}

function SuggestionList({ icon: Icon, title, count, empty, children }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  count: number
  empty: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-zinc-400" />
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          {title} <span className="text-zinc-300">({count})</span>
        </h4>
      </div>
      {count === 0 ? (
        <p className="text-sm text-zinc-400">{empty}</p>
      ) : (
        <div className="divide-y divide-zinc-50">{children}</div>
      )}
    </div>
  )
}
