'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, Loader2, FileUp, AlertCircle } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import { useAppContext } from '@/contexts/AppContext'
import { createClient } from '@/lib/supabase/client'
import FileCard from '@/components/files/FileCard'
import {
  STORAGE_BUCKET, ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, buildStoragePath,
  isAcceptedFile, readTextFile,
} from '@/lib/file'
import type { ProjectFile } from '@/lib/types'

export default function ProjectFilesPage() {
  const { project } = useProjectContext()
  const { appState, createProjectFile, createLink } = useAppContext()
  const supabase = createClient()

  const files = appState.projectFiles
    .filter(f => f.projectId === project.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList)
    if (arr.length === 0) return

    setUploading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be signed in to upload files.')
      setUploading(false)
      return
    }

    for (const file of arr) {
      if (!isAcceptedFile(file.name)) {
        setError(`Unsupported file type: ${file.name}. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name} is too large (max 10 MB).`)
        continue
      }

      try {
        let extractedText = ''
        if (file.name.match(/\.(txt|md)$/i)) {
          extractedText = await readTextFile(file)
        }

        const filePath = buildStoragePath(user.id, project.id, file.name)
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file, { upsert: false })

        if (uploadErr) throw new Error(uploadErr.message)

        const record = await createProjectFile({
          projectId: project.id,
          fileName: file.name,
          filePath,
          fileType: file.type || file.name.split('.').pop() || 'unknown',
          fileSize: file.size,
          extractedText: extractedText || undefined,
        })

        try {
          await createLink({
            sourceType: 'project', sourceId: project.id,
            targetType: 'project_file', targetId: record.id,
            relationshipType: 'part_of',
            description: 'File uploaded to this project',
          })
        } catch (linkErr) {
          console.error('[FounderOS] failed to create project→file link:', linkErr)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.')
      }
    }

    setUploading(false)
  }, [supabase, project.id, createProjectFile, createLink])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    void processFiles(e.dataTransfer.files)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-zinc-900">Project Files</h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
            Upload research, notes and documents. FounderOS stores them securely and can summarise text files for your project memory.
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Upload File
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          multiple
          onChange={e => { if (e.target.files) void processFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragOver ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50',
        ].join(' ')}
      >
        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-2">
          <FileUp size={18} className="text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-700">Drop files here or click to upload</p>
        <p className="text-xs text-zinc-400 mt-1">
          .txt, .md, .pdf, .png, .jpg · max 10 MB · text files can be summarised
        </p>
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 size={14} className="animate-spin" /> Uploading…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600 leading-relaxed">{error}</p>
        </div>
      )}

      {files.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-100 py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
            <FileUp size={20} className="text-zinc-300" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">No files uploaded yet</p>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
            Upload a .txt or .md file to try AI summarisation and connect it to your project memory.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Files <span className="text-zinc-300">({files.length})</span>
          </p>
          {files.map(f => (
            <FileCard key={f.id} file={f} projectId={project.id} />
          ))}
        </div>
      )}
    </div>
  )
}
