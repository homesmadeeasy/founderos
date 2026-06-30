'use client'

import { Suspense } from 'react'
import MemorySearchPanel from '@/components/memory/MemorySearchPanel'
import { useProjectContext } from '@/contexts/ProjectContext'
import LoadingScreen from '@/components/ui/LoadingScreen'

function ProjectMemorySearchContent() {
  const { project } = useProjectContext()
  return (
    <MemorySearchPanel
      projectId={project.id}
      projectTitle={project.title}
    />
  )
}

export default function ProjectMemorySearchPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Suspense fallback={<LoadingScreen label="Loading…" />}>
        <ProjectMemorySearchContent />
      </Suspense>
    </div>
  )
}
