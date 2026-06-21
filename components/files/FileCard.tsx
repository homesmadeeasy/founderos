'use client'

import { useState } from 'react'
import { Sparkles, FileText, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatFileSize, summariseHint, isPdf, isImage } from '@/lib/file'
import type { ProjectFile } from '@/lib/types'

interface Props {
  file: ProjectFile
  projectId: string
}

export default function FileCard({ file, projectId }: Props) {
  const { updateProjectFile, deleteProjectFile, addNote, createLink } = useAppContext()
  const [summarising, setSummarising] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noteSaved, setNoteSaved] = useState(false)

  const hint = summariseHint(file)
  const canSummarise = !hint && file.status !== 'Processing'

  async function handleSummarise() {
    if (!canSummarise) return
    setSummarising(true)
    setError(null)
    await updateProjectFile(file.id, { status: 'Processing' })
    try {
      const res = await fetch('/api/file-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          file_id: file.id,
          extracted_text: file.extractedText,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Summarisation failed.')
      }
      const data = await res.json() as { file: ProjectFile }
      await updateProjectFile(file.id, {
        summary: data.file.summary,
        extractedText: data.file.extractedText,
        status: data.file.status,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summarisation failed.')
      await updateProjectFile(file.id, { status: 'Failed' }).catch(() => {})
    } finally {
      setSummarising(false)
    }
  }

  async function handleSaveNote() {
    if (!file.summary.trim()) return
    setSavingNote(true)
    setError(null)
    try {
      const note = await addNote({
        projectId,
        title: `Summary of ${file.fileName}`,
        content: file.summary,
      })
      try {
        await createLink({
          sourceType: 'project_file', sourceId: file.id,
          targetType: 'note', targetId: note.id,
          relationshipType: 'created_from',
          description: 'Note created from uploaded file summary',
        })
      } catch (linkErr) {
        console.error('[FounderOS] failed to create file→note link:', linkErr)
      }
      setNoteSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note.')
    } finally {
      setSavingNote(false)
    }
  }

  async function handleDelete() {
    setPendingDelete(false)
    try {
      await deleteProjectFile(file.id, file.filePath)
    } catch {
      setError('Could not delete the file.')
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-zinc-100 p-5 hover:border-zinc-200 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-800 truncate">{file.fileName}</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {file.fileType || 'file'} · {formatFileSize(file.fileSize)} · {new Date(file.createdAt).toLocaleString()}
            </p>
          </div>
          <span className={`shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5 ${
            file.status === 'Summarised' ? 'bg-emerald-50 text-emerald-600' :
            file.status === 'Processing' ? 'bg-blue-50 text-blue-600' :
            file.status === 'Failed' ? 'bg-red-50 text-red-600' :
            'bg-zinc-100 text-zinc-500'
          }`}>
            {file.status}
          </span>
        </div>

        {(isPdf(file.fileName) || isImage(file.fileName)) && (
          <p className="text-xs text-zinc-400 mb-3 italic">{hint}</p>
        )}

        {file.summary ? (
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2 mb-3">
            <p className="text-xs font-medium text-zinc-400 mb-1">Summary</p>
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line line-clamp-6">{file.summary}</p>
          </div>
        ) : file.extractedText && !file.summary && file.status !== 'Processing' ? (
          <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{file.extractedText.slice(0, 160)}…</p>
        ) : null}

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1 mb-3">
            <AlertCircle size={12} /> {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void handleSummarise()}
            disabled={!canSummarise || summarising || file.status === 'Processing'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-40 transition-colors"
          >
            {summarising || file.status === 'Processing'
              ? <><Loader2 size={12} className="animate-spin" /> Summarising…</>
              : <><Sparkles size={12} /> Summarise</>}
          </button>

          {file.summary && (
            <button
              onClick={() => void handleSaveNote()}
              disabled={savingNote || noteSaved}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            >
              {noteSaved
                ? 'Saved as note'
                : savingNote
                  ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                  : <><FileText size={12} /> Save Summary as Note</>}
            </button>
          )}

          <button
            onClick={() => setPendingDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-white border border-zinc-200 rounded-lg hover:bg-red-50 transition-colors ml-auto"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete}
        title="Delete this file?"
        description={`“${file.fileName}” will be permanently removed from storage.`}
        confirmLabel="Delete file"
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(false)}
      />
    </>
  )
}
