'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  Zap, MessageCircle, Focus, Dumbbell, BookOpen, Rocket,
} from 'lucide-react'
import { useUniversalCapture } from '@/contexts/UniversalCaptureContext'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import { useCommandBar } from '@/components/command/CommandBarProvider'

const actions: {
  id: string
  icon: LucideIcon
  color: string
  bg: string
  href?: string
}[] = [
  { id: 'capture', icon: Zap, color: 'text-amber-600', bg: 'hover:bg-amber-50/80' },
  { id: 'ask', icon: MessageCircle, color: 'text-indigo-600', bg: 'hover:bg-indigo-50/80' },
  { id: 'focus', icon: Focus, color: 'text-violet-600', bg: 'hover:bg-violet-50/80', href: '/morning' },
  { id: 'workout', icon: Dumbbell, color: 'text-emerald-600', bg: 'hover:bg-emerald-50/80', href: '/evening' },
  { id: 'study', icon: BookOpen, color: 'text-amber-700', bg: 'hover:bg-amber-50/80', href: '/morning' },
  { id: 'founder', icon: Rocket, color: 'text-violet-700', bg: 'hover:bg-violet-50/80', href: '/domains' },
]

export default function QuickActionsDock() {
  const { openCapture } = useUniversalCapture()
  const { askAssistant } = useCommandCenter()
  const { openCommandBar } = useCommandBar()

  function handleAction(id: string, href?: string) {
    if (id === 'capture') openCapture()
    else if (id === 'ask') askAssistant('What matters right now?')
    else if (href) return
    else openCommandBar()
  }

  return (
    <div
      className="flex justify-center -mt-5 mb-1 relative z-20 pointer-events-none animate-fade-in-up"
      style={{ animationDelay: '480ms' }}
    >
      <div className="pointer-events-auto flex items-center gap-0.5 px-2 py-2 rounded-2xl border border-white/90 bg-white/75 backdrop-blur-2xl shadow-[0_8px_32px_rgba(99,102,241,0.12),0_2px_8px_rgba(15,15,20,0.06)]">
        {actions.map(({ id, icon: Icon, color, bg, href }) => {
          const btnClass = `p-2.5 rounded-xl transition-all duration-200 ${bg} ${color}`

          if (href) {
            return (
              <Link key={id} href={href} className={btnClass} aria-label={id}>
                <Icon size={17} strokeWidth={1.8} />
              </Link>
            )
          }

          return (
            <button
              key={id}
              type="button"
              onClick={() => handleAction(id, href)}
              className={btnClass}
              aria-label={id}
            >
              <Icon size={17} strokeWidth={1.8} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
