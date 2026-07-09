'use client'

import { useMemo } from 'react'
import { buildFounderSnapshot } from '@/lib/specialists/founder/founderUtils'
import type { FounderSnapshot } from '@/lib/specialists/founder/founderTypes'
import { useFounderInput } from '@/components/founder/useFounderInput'

export function useFounderSnapshot(): FounderSnapshot {
  const input = useFounderInput()
  return useMemo(() => buildFounderSnapshot(input), [input])
}
