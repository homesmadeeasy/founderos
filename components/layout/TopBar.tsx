'use client'

import { Bell, Command } from 'lucide-react'
import { useCommandBar, commandShortcutLabel } from '@/components/command/CommandBarProvider'

export default function TopBar() {
  const { openCommandBar } = useCommandBar()

  return (
    <header className="h-14 shrink-0 bg-white border-b border-zinc-200 px-6 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={openCommandBar}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 border border-zinc-200 rounded-lg hover:text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
      >
        <Command size={14} />
        <span>Search / Command</span>
        <kbd className="text-[10px] font-medium text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5 ml-1">
          {commandShortcutLabel()}
        </kbd>
      </button>

      <div className="flex items-center gap-3 ml-auto">
        <button
          type="button"
          onClick={openCommandBar}
          className="sm:hidden w-8 h-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
          title="Command"
        >
          <Command size={15} />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors">
          <Bell size={15} />
        </button>
        <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-semibold text-white select-none">
          Y
        </div>
      </div>
    </header>
  )
}
