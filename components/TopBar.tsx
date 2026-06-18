'use client'

import { usePathname } from 'next/navigation'

function getTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/projects') return 'Projects'
  if (pathname === '/ideas') return 'Idea Vault'
  if (pathname === '/review') return 'Weekly Review'
  if (pathname === '/settings') return 'Settings'
  if (pathname.includes('/chat')) return 'AI Chat'
  if (pathname.includes('/tasks')) return 'Tasks'
  if (pathname.includes('/notes')) return 'Notes'
  if (pathname.includes('/decisions')) return 'Decisions'
  if (pathname.includes('/risks')) return 'Risks'
  if (pathname.includes('/roadmap')) return 'Roadmap'
  if (/\/projects\/[^/]+$/.test(pathname)) return 'Project Overview'
  return 'FounderOS'
}

export default function TopBar() {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="h-14 border-b border-zinc-200 bg-white px-6 flex items-center justify-between shrink-0">
      <span className="text-sm font-semibold text-zinc-800">{title}</span>
      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-white">
        Y
      </div>
    </header>
  )
}
