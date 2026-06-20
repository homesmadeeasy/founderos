'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Overview',  slug: '' },
  { label: 'Chat',      slug: 'chat' },
  { label: 'Tasks',     slug: 'tasks' },
  { label: 'Notes',     slug: 'notes' },
  { label: 'Decisions', slug: 'decisions' },
  { label: 'Risks',     slug: 'risks' },
  { label: 'Roadmap',   slug: 'roadmap' },
  { label: 'Project Review', slug: 'review' },
  { label: 'Memory Graph', slug: 'memory' },
]

export default function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  return (
    <div className="flex border-b border-zinc-200 bg-white px-6 overflow-x-auto">
      {tabs.map(({ label, slug }) => {
        const href = slug ? `${base}/${slug}` : base
        const active = slug === '' ? pathname === base : pathname === `${base}/${slug}`
        return (
          <Link
            key={slug}
            href={href}
            className={[
              'shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
              active
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300',
            ].join(' ')}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
