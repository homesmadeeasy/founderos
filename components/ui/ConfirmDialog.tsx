'use client'

import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Async work to run on confirm. The dialog shows a spinner while it runs and
   *  surfaces any thrown error instead of closing. */
  onConfirm: () => Promise<void> | void
  onCancel: () => void
  destructive?: boolean
}

export default function ConfirmDialog({
  open, title, description,
  confirmLabel = 'Delete', cancelLabel = 'Cancel',
  onConfirm, onCancel, destructive = true,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      // Parent is responsible for closing on success.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    if (loading) return
    setError(null)
    onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleCancel() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
          )}
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
            {description && <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>}
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-xs text-red-600 leading-relaxed">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={[
              'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50',
              destructive ? 'bg-red-500 hover:bg-red-600' : 'bg-zinc-900 hover:bg-zinc-700',
            ].join(' ')}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
