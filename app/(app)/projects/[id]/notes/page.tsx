'use client'

import Link from 'next/link'
import { useProjectContext } from '@/contexts/ProjectContext'
import PageHeader from '@/components/ui/PageHeader'
import { Plus, StickyNote } from 'lucide-react'

export default function ProjectNotesPage() {
  const { project, notes } = useProjectContext()

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notes"
        description="Capture ideas, context, and anything worth remembering."
        action={
          <button className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
            <Plus size={13} /> New Note
          </button>
        }
      />

      {notes.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-20 gap-3 text-center">
          <StickyNote size={22} className="text-zinc-300" />
          <div>
            <p className="text-sm font-medium text-zinc-700">No notes yet</p>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Use{' '}
              <Link href={`/projects/${project.id}/chat`} className="text-zinc-600 underline underline-offset-2">Chat</Link>
              {' '}to brainstorm ideas, then click <strong>Note</strong> under any AI message to save it here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl border border-zinc-200 p-5 space-y-2.5 hover:border-zinc-300 transition-colors cursor-pointer">
              <h3 className="text-sm font-semibold text-zinc-800">{note.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed line-clamp-4">{note.content}</p>
              <p className="text-xs text-zinc-400">
                {new Date(note.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
