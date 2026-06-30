'use client'

import { Suspense } from 'react'
import MemorySearchPanel from '@/components/memory/MemorySearchPanel'
import { useAppContext } from '@/contexts/AppContext'
import LoadingScreen from '@/components/ui/LoadingScreen'

function MemorySearchContent() {
  const { appState, isHydrated } = useAppContext()

  if (!isHydrated) {
    return <LoadingScreen label="Loading memory search…" />
  }

  return (
    <MemorySearchPanel
      projects={appState.projects.map(p => ({ id: p.id, title: p.title }))}
    />
  )
}

export default function MemorySearchPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Suspense fallback={<LoadingScreen label="Loading…" />}>
        <MemorySearchContent />
      </Suspense>
    </div>
  )
}
