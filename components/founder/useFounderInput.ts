'use client'

import { useMemo } from 'react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppContext } from '@/contexts/AppContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { useMemoryEngine } from '@/contexts/MemoryEngineContext'
import { useKnowledgeEngine } from '@/contexts/KnowledgeEngineContext'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import { useUniversalCapture } from '@/contexts/UniversalCaptureContext'
import { useEveningReview } from '@/contexts/EveningReviewContext'
import { getOutcomeHistory } from '@/lib/outcome-engine/outcomeEngine'
import type { FounderInput } from '@/lib/specialists/founder/founderTypes'

export function useFounderInput(): FounderInput {
  const { appState } = useAppContext()
  const { objects } = useObjectEngine()
  const { memories } = useMemoryEngine()
  const { knowledge } = useKnowledgeEngine()
  const { signals } = useSignalEngine()
  const { unprocessedCount } = useUniversalCapture()
  const { eveningReview } = useEveningReview()
  const {
    dailyContext,
    morningPlan,
    decisionOutput,
    domainIntelligence,
  } = useMorningExecution()

  const outcomes = useMemo(() => getOutcomeHistory(12), [])

  return useMemo(() => ({
    objects,
    memories,
    knowledge,
    signals,
    outcomes,
    tasks: appState.tasks,
    projects: appState.projects,
    decisionOutput,
    domainIntelligence,
    morningPlan,
    dailyContext,
    eveningReview,
    unprocessedCaptureCount: unprocessedCount,
  }), [
    objects, memories, knowledge, signals, outcomes,
    appState.tasks, appState.projects,
    decisionOutput, domainIntelligence, morningPlan,
    dailyContext, eveningReview, unprocessedCount,
  ])
}

export function useUserDisplayName(): string {
  const [name, setName] = useState('there')
  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email
      if (!email) return
      const local = email.split('@')[0] ?? ''
      const part = local.split(/[._-]/)[0] ?? local
      if (part) setName(part.charAt(0).toUpperCase() + part.slice(1))
    })
  }, [])
  return name
}
