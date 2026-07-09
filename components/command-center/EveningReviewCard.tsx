'use client'

import { Moon, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useEveningReview } from '@/contexts/EveningReviewContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import CardShell from './CardShell'

export default function EveningReviewCard() {
  const { ready, eveningReview } = useEveningReview()
  const { morningPlan } = useMorningExecution()

  if (!ready) {
    return (
      <CardShell title="Evening Review" icon={Moon}>
        <p className="text-sm text-zinc-500">Preparing evening review…</p>
      </CardShell>
    )
  }

  const completed = eveningReview?.completed ?? false
  const hasMorningPlan = !!morningPlan
  const pending = hasMorningPlan && !completed

  return (
    <CardShell
      title="Evening Review"
      icon={Moon}
      action={
        <Link
          href="/evening"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          Open
        </Link>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Close the loop for today
        </p>

        {completed ? (
          <div className="flex items-start gap-2 rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
            <CheckCircle2 size={16} className="text-violet-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-zinc-900">Review completed</p>
              <p className="text-xs text-zinc-500 mt-1">
                FounderOS learned from today. Tomorrow&apos;s morning plan will use carry-over context.
              </p>
            </div>
          </div>
        ) : pending ? (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900">
              Evening Review pending — FounderOS has not learned from today yet.
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Start your morning plan first, then close the day with an evening review.
          </p>
        )}

        {!completed && (
          <Link
            href="/evening"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-900"
          >
            <ArrowRight size={14} />
            Go to Evening Review
          </Link>
        )}
      </div>
    </CardShell>
  )
}
