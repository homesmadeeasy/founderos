'use client'

import { Sparkles } from 'lucide-react'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import CardShell from './CardShell'

export default function DailyBriefingCard() {
  const { briefing } = useCommandCenter()

  return (
    <CardShell title="Daily Briefing" icon={Sparkles}>
      <p className="text-sm text-zinc-600 leading-relaxed">{briefing}</p>
    </CardShell>
  )
}
