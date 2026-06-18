'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Lightbulb,
  CalendarCheck2,
  Settings,
} from 'lucide-react'

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects',  href: '/projects',  icon: FolderKanban },
  { label: 'Idea Vault', href: '/ideas',    icon: Lightbulb },
  { label: 'Weekly Review', href: '/review', icon: CalendarCheck2 },
  { label: 'Settings', href: '/settings',   icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen sticky top-0 bg-white border-r border-zinc-200">
      {/* Logo */}
      <div className="h-14 px-5 flex items-center border-b border-zinc-100">
        <span className="text-sm font-bold tracking-tight text-zinc-900">FounderOS</span>
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
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-semibold text-white select-none">
            Y
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-800 truncate">You</p>
            <p className="text-xs text-zinc-400 truncate">Free plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
