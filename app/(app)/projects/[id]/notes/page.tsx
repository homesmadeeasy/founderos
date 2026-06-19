'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Trash2 } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { Note } from '@/lib/types'

export default function NotesPage() {
  const { project, notes } = useProjectContext()
  const { deleteNote }      = useAppContext()
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null)

  if (notes.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-zinc-100 py-20 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
            <MessageSquare size={20} className="text-zinc-300" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">No notes yet</p>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">Save useful AI responses or write your first note.</p>
          <Link href={`/projects/${project.id}/chat`} className="mt-2 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors flex items-center gap-1.5">
            <MessageSquare size={12} /> Open chat
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Notes <span className="text-zinc-400 font-normal">({notes.length})</span></h2>
        <Link href={`/projects/${project.id}/chat`} className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors">
          <MessageSquare size={11} /> Add via chat
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {notes.map(note => (
          <div key={note.id} className="bg-white rounded-xl border border-zinc-100 p-5 hover:border-zinc-200 transition-colors group relative">
            <button
              onClick={() => setPendingDelete(note)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
              title="Delete note"
            >
              <Trash2 size={11} />
            </button>
            <h3 className="text-sm font-semibold text-zinc-800 mb-2 pr-6">{note.title}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap">{note.content}</p>
            <p className="text-xs text-zinc-300 mt-3">{new Date(note.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this note?"
        description={pendingDelete ? `“${pendingDelete.title}” will be permanently removed.` : ''}
        confirmLabel="Delete note"
        onConfirm={async () => { if (pendingDelete) { await deleteNote(pendingDelete.id); setPendingDelete(null) } }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
