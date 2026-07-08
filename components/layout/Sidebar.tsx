'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  Target,
  Lightbulb,
  CalendarCheck2,
  GitBranch,
  Brain,
  Boxes,
  History,
  Crown,
  Settings,
  LogOut,
  Command,
  HelpCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCommandBar, commandShortcutLabel } from '@/components/command/CommandBarProvider'

const nav = [
  { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Object Engine', href: '/objects', icon: Boxes },
  { label: 'Memory Engine', href: '/memory', icon: History },
  { label: 'Executive Engine', href: '/executive', icon: Crown },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'Worlds',  href: '/projects',  icon: FolderKanban },
  { label: 'Idea Vault', href: '/ideas',    icon: Lightbulb },
  { label: 'Weekly Review', href: '/weekly-review', icon: CalendarCheck2 },
  { label: 'Patterns', href: '/patterns', icon: GitBranch },
  { label: 'Memory Search', href: '/memory-search', icon: Brain },
  { label: 'Settings', href: '/settings',   icon: Settings },
]

export default function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { openCommandBar } = useCommandBar()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = (userEmail?.[0] ?? 'Y').toUpperCase()

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen sticky top-0 bg-white border-r border-zinc-200">
      {/* Logo */}
      <div className="h-14 px-5 flex items-center border-b border-zinc-100">
        <span className="text-sm font-bold tracking-tight text-zinc-900">FounderOS</span>
      </div>

      {/* Command */}
      <div className="px-2 pt-3 pb-1">
        <button
          type="button"
          onClick={openCommandBar}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 border border-zinc-200 transition-colors"
        >
          <Command size={15} strokeWidth={1.8} />
          <span className="flex-1 text-left">Command</span>
          <kbd className="text-[10px] font-medium text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">
            {commandShortcutLabel()}
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50',
              ].join(' ')}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          )
        })}
        <Link
          href="/how-it-works"
          target="_blank"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors"
        >
          <HelpCircle size={15} strokeWidth={1.8} />
          How it works
        </Link>
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-zinc-100">
        <div className="flex items-center gap-2.5 px-1 mb-2">
          <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-semibold text-white select-none shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-800 truncate">{userEmail ?? 'You'}</p>
            <p className="text-xs text-zinc-400 truncate">Free plan</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors disabled:opacity-50"
        >
          <LogOut size={15} strokeWidth={1.8} />
          {loggingOut ? 'Signing out…' : 'Log out'}
        </button>
      </div>
    </aside>
  )
}
