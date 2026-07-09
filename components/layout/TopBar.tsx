'use client'

import { usePathname } from 'next/navigation'
import { useUniversalCapture } from '@/contexts/UniversalCaptureContext'
import { Bell, Command, Zap } from 'lucide-react'
import { useCommandBar, commandShortcutLabel } from '@/components/command/CommandBarProvider'

export default function TopBar() {
  const pathname = usePathname()
  const { openCommandBar } = useCommandBar()
  const { openCapture, unprocessedCount } = useUniversalCapture()

  if (pathname === '/home' || pathname.startsWith('/home/') || pathname === '/founder' || pathname.startsWith('/founder/')) {
    return null
  }

  return (
    <header className="h-14 shrink-0 bg-white border-b border-zinc-200 px-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        <button
          type="button"
          onClick={openCapture}
          className="hidden sm:flex items-center gap-2 flex-1 px-3 py-1.5 text-sm text-zinc-500 border border-zinc-200 rounded-lg hover:text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
        >
          <Zap size={14} className="text-amber-500 shrink-0" />
          <span className="truncate">Capture anything…</span>
          <kbd className="text-[10px] font-medium text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5 ml-auto shrink-0">
            {commandShortcutLabel()}
          </kbd>
        </button>
        <button
          type="button"
          onClick={openCommandBar}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 border border-zinc-200 rounded-lg hover:text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-colors shrink-0"
        >
          <Command size={14} />
          <span>Search</span>
        </button>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button
          type="button"
          onClick={openCapture}
          className="sm:hidden w-8 h-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
          title="Capture"
        >
          <Zap size={15} />
        </button>
        {unprocessedCount > 0 && (
          <span className="hidden sm:inline text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
            {unprocessedCount} inbox
          </span>
        )}
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
