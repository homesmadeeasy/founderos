import { Plus, FileText } from 'lucide-react'

export default function ProjectNotesPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
          <Plus size={14} />
          New Note
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
          <FileText size={18} className="text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700">No notes yet</p>
          <p className="text-sm text-zinc-400 mt-1">Capture ideas, meeting notes, anything.</p>
        </div>
      </div>
    </div>
  )
}
