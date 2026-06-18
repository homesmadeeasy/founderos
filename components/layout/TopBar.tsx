import { Bell } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="h-14 shrink-0 bg-white border-b border-zinc-200 px-6 flex items-center justify-end gap-3">
      <button className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors">
        <Bell size={15} />
      </button>
      <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-semibold text-white select-none">
        Y
      </div>
    </header>
  )
}
