import { CalendarCheck2 } from 'lucide-react'

export default function WeeklyReviewPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Weekly Review</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Reflect on the week. Set direction for the next.</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
          <CalendarCheck2 size={22} className="text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700">No reviews yet</p>
          <p className="text-sm text-zinc-400 mt-1">Weekly review coming soon.</p>
        </div>
      </div>
    </div>
  )
}
