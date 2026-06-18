import { Plus, CheckSquare } from 'lucide-react'

const columns = ['To Do', 'In Progress', 'Done']

export default function ProjectTasksPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
          <Plus size={14} />
          Add Task
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{col}</h3>
              <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">0</span>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 min-h-40 flex flex-col items-center justify-center gap-2 p-4">
              <CheckSquare size={16} className="text-zinc-300" />
              <p className="text-xs text-zinc-400">No tasks</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
