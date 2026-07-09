'use client'

import { Zap, Inbox } from 'lucide-react'
import Link from 'next/link'
import { useUniversalCapture } from '@/contexts/UniversalCaptureContext'
import UniversalCaptureInput from '@/components/capture/UniversalCaptureInput'
import CardShell from './CardShell'

export default function UniversalCaptureCard() {
  const { unprocessedCount } = useUniversalCapture()

  return (
    <CardShell
      title="Universal Capture"
      icon={Zap}
      action={
        <Link href="/inbox" className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          <Inbox size={12} />
          Inbox{unprocessedCount > 0 ? ` (${unprocessedCount})` : ''}
        </Link>
      }
    >
      <p className="text-xs text-zinc-500 mb-3">
        Capture anything — FounderOS classifies. No page, engine, or domain selection.
      </p>
      <UniversalCaptureInput variant="inline" />
    </CardShell>
  )
}
