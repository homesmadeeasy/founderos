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

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Idea Vault', href: '/ideas', icon: Lightbulb },
  { label: 'Weekly Review', href: '/review', icon: CalendarCheck2 },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="px-5 h-14 flex items-center border-b border-zinc-100">
        <span className="text-base font-bold tracking-tight text-black">FounderOS</span>
      </div>

      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-white">
            Y
          </div>
          <span className="text-sm text-zinc-600 font-medium">You</span>
        </div>
      </div>
    </aside>
  )
}
