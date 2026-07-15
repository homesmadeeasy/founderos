'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Home,
  Rocket,
  Sun,
  Moon,
  Zap,
  LayoutGrid,
  Boxes,
  History,
  BookOpen,
  Crown,
  Dumbbell,
  Settings,
  LogOut,
  Command,
  HelpCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCommandBar, commandShortcutLabel } from '@/components/command/CommandBarProvider'
import { useUniversalCapture } from '@/contexts/UniversalCaptureContext'

const nav = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Founder', href: '/founder', icon: Rocket },
  { label: 'Gym', href: '/gym', icon: Dumbbell },
  { label: 'Morning', href: '/morning', icon: Sun },
  { label: 'Evening', href: '/evening', icon: Moon },
  { label: 'Domains', href: '/domains', icon: LayoutGrid },
  { label: 'Objects', href: '/objects', icon: Boxes },
  { label: 'Memory', href: '/memory', icon: History },
  { label: 'Knowledge', href: '/knowledge', icon: BookOpen },
  { label: 'Executive', href: '/executive', icon: Crown },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { openCommandBar } = useCommandBar()
  const { openCapture, unprocessedCount } = useUniversalCapture()
  const [loggingOut, setLoggingOut] = useState(false)
  const isHome = pathname === '/home' || pathname.startsWith('/home/')
  const isFounder = pathname === '/founder' || pathname.startsWith('/founder/')
  const isPremiumSurface = isHome || isFounder

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = (userEmail?.[0] ?? 'Y').toUpperCase()

  return (
    <aside className={[
      'w-[168px] shrink-0 flex flex-col h-screen sticky top-0 border-r transition-colors',
      isPremiumSurface
        ? 'bg-white/70 backdrop-blur-xl border-indigo-100/60'
        : 'bg-white border-zinc-200',
    ].join(' ')}>
      {/* Logo */}
      <div className="h-11 px-3.5 flex items-center border-b border-zinc-100/80">
        <span className="text-xs font-bold tracking-tight text-zinc-900">FounderOS</span>
      </div>

      {/* Command */}
      <div className="px-1.5 pt-2 pb-0.5">
        <button
          type="button"
          onClick={openCommandBar}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:bg-white/80 border border-zinc-200/60 transition-colors"
        >
          <Command size={13} strokeWidth={1.8} />
          <span className="flex-1 text-left">Command</span>
          <kbd className="text-[9px] font-medium text-zinc-400 bg-zinc-100/80 rounded px-1 py-0.5">
            {commandShortcutLabel()}
          </kbd>
        </button>
      </div>

      {/* Capture */}
      <div className="px-1.5 pb-0.5">
        <button
          type="button"
          onClick={openCapture}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-700 hover:text-amber-900 hover:bg-amber-50/70 border border-amber-200/50 transition-colors"
        >
          <Zap size={13} strokeWidth={1.8} />
          <span className="flex-1 text-left">Capture</span>
          {unprocessedCount > 0 && (
            <span className="text-[9px] font-semibold bg-amber-100 text-amber-800 rounded-full px-1">
              {unprocessedCount}
            </span>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                active
                  ? isPremiumSurface
                    ? 'bg-indigo-50/90 text-indigo-900 shadow-[0_1px_4px_rgba(99,102,241,0.08)]'
                    : 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/60',
              ].join(' ')}
            >
              <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          )
        })}
        <Link
          href="/how-it-works"
          target="_blank"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:bg-white/60 transition-colors"
        >
          <HelpCircle size={14} strokeWidth={1.8} />
          How it works
        </Link>
      </nav>

      {/* User */}
      <div className="px-2 py-2 border-t border-zinc-100/80">
        <div className="flex items-center gap-2 px-0.5 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-semibold text-white select-none shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-zinc-800 truncate">{userEmail ?? 'You'}</p>
            <p className="text-[9px] text-zinc-400 truncate">Free plan</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:bg-white/60 transition-colors disabled:opacity-50"
        >
          <LogOut size={13} strokeWidth={1.8} />
          {loggingOut ? 'Signing out…' : 'Log out'}
        </button>
      </div>
    </aside>
  )
}
