import { CalendarCheck2 } from 'lucide-react'

export default function WeeklyReviewPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Weekly Review</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Reflect on the week. Plan the next one.</p>
      </div>
      <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
          <CalendarCheck2 size={22} className="text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700">Coming in Phase 3</p>
          <p className="text-sm text-zinc-400 mt-1 max-w-xs">AI-generated weekly summaries across all your projects.</p>
        </div>
      </div>
    </div>
  )
}
