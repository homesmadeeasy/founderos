'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCognitiveModel } from '@/contexts/CognitiveModelContext'
import { mergeFounderInputWithWorldModel } from '@/lib/specialists/founder/founderInputBuilder'
import type { FounderInput } from '@/lib/specialists/founder/founderTypes'
import { useFounderBaseInput } from '@/components/founder/useFounderBaseInput'

/**
 * Full FounderInput for descendants inside CognitiveModelProvider.
 * Merges engine-sourced base data with the reconciled cognitive world model.
 */
export function useFounderInput(): FounderInput {
  const base = useFounderBaseInput()
  const { worldModel } = useCognitiveModel()

  return useMemo(
    () => mergeFounderInputWithWorldModel(base, worldModel, true),
    [base, worldModel],
  )
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
