import ProjectTabs from '@/components/ProjectTabs'

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  return (
    <div className="-m-6 flex flex-col min-h-full">
      {/* Project header */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-zinc-200">
        <p className="text-xs text-zinc-400 mb-1">Project</p>
        <h1 className="text-lg font-semibold text-zinc-900 capitalize">
          {params.id.replace(/-/g, ' ')}
        </h1>
      </div>

      {/* Tabs */}
      <ProjectTabs projectId={params.id} />

      {/* Page content */}
      <div className="flex-1 bg-zinc-50 p-6">
        {children}
      </div>
    </div>
  )
}
