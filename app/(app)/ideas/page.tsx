import { Plus, Lightbulb } from 'lucide-react'

export default function IdeasPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Idea Vault</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Capture everything. Filter later.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
          <Plus size={14} />
          New Idea
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
          <Lightbulb size={22} className="text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700">No ideas yet</p>
          <p className="text-sm text-zinc-400 mt-1">Dump your raw ideas here. Don't overthink it.</p>
        </div>
      </div>
    </div>
  )
}
