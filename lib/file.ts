/**
 * Project file helpers.
 *
 * Safe for the client — contains NO secrets.
 */

import type { ProjectFile } from './types'

export const STORAGE_BUCKET = 'project-files'

export const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.png', '.jpg', '.jpeg'] as const

export const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_EXTRACT_CHARS = 50_000

export const FILE_SYSTEM_PROMPT = `You are the File Memory Assistant inside FounderOS.

FounderOS is a personal AI operating system for young builders, founders, coders and ambitious students.

Your job is to summarise uploaded project files and explain how they relate to the project.

Be practical, concise and structured.

Do not invent content that is not in the file.
If the file content is unclear or too short, say so.

Return a useful summary with:
- short overview
- key points
- possible tasks
- possible risks
- possible decisions
- how this file relates to the project`

/** Build a storage path: {userId}/{projectId}/{timestamp}-{safeName} */
export function buildStoragePath(userId: string, projectId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${userId}/${projectId}/${Date.now()}-${safe}`
}

export function getFileExtension(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

export function isAcceptedFile(name: string): boolean {
  return ACCEPTED_EXTENSIONS.includes(getFileExtension(name) as typeof ACCEPTED_EXTENSIONS[number])
}

export function isTextExtractable(name: string): boolean {
  const ext = getFileExtension(name)
  return ext === '.txt' || ext === '.md'
}

export function isPdf(name: string): boolean {
  return getFileExtension(name) === '.pdf'
}

export function isImage(name: string): boolean {
  const ext = getFileExtension(name)
  return ext === '.png' || ext === '.jpg' || ext === '.jpeg'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function summariseHint(file: ProjectFile): string {
  if (isPdf(file.fileName)) return 'PDF summarisation coming soon'
  if (isImage(file.fileName)) return 'Image understanding coming later'
  if (!file.extractedText.trim()) return 'No text content to summarise'
  return ''
}

/** Read plain text from a .txt or .md File in the browser. */
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? '').slice(0, MAX_EXTRACT_CHARS))
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsText(file)
  })
}

/** Concise file summaries for AI chat/review context. */
export function summarizeProjectFiles(files: ProjectFile[], limit = 10): string[] {
  return files
    .slice(0, limit)
    .map(f => {
      if (f.summary.trim()) return `${f.fileName}: ${f.summary.replace(/\s+/g, ' ').slice(0, 280)}`
      return `${f.fileName} [${f.status}]`
    })
}
