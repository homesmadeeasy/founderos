import { Plus, GitBranch } from 'lucide-react'

export default function ProjectDecisionsPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
          <Plus size={14} />
          Log Decision
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-700">Decision Log</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Track key decisions and the reasoning behind them.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
            <GitBranch size={18} className="text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-400">No decisions logged yet.</p>
        </div>
      </div>
    </div>
  )
}
