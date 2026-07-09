'use client'

import { useEffect, useRef, useState } from 'react'
import { Zap, X, CheckCircle2 } from 'lucide-react'
import { useUniversalCapture } from '@/contexts/UniversalCaptureContext'
import { CAPTURE_CLASSIFICATION_LABEL } from '@/lib/capture-engine/captureTypes'

const inputClass =
  'w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 placeholder:text-zinc-400'

interface Props {
  variant?: 'inline' | 'compact' | 'modal'
  placeholder?: string
  autoFocus?: boolean
  onCaptured?: () => void
}

export default function UniversalCaptureInput({
  variant = 'inline',
  placeholder = 'Capture anything — task: Call accountant, idea: Better AI memory…',
  autoFocus = false,
  onCaptured,
}: Props) {
  const { capture, lastResult, captureOpen, closeCapture } = useUniversalCapture()
  const [value, setValue] = useState('')
  const [showResult, setShowResult] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus || captureOpen) {
      inputRef.current?.focus()
    }
  }, [autoFocus, captureOpen])

  useEffect(() => {
    if (lastResult) {
      setShowResult(true)
      const t = setTimeout(() => setShowResult(false), 4000)
      return () => clearTimeout(t)
    }
  }, [lastResult])

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    capture(trimmed, variant === 'modal' ? 'command_palette' : 'manual')
    setValue('')
    onCaptured?.()
    if (variant === 'modal') closeCapture()
  }

  const InputTag = variant === 'compact' ? 'input' : 'textarea'

  const form = (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative">
        <InputTag
          ref={inputRef as never}
          className={inputClass}
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && variant !== 'inline') {
              e.preventDefault()
              handleSubmit()
            }
          }}
          rows={variant === 'compact' ? undefined : 2}
        />
        {variant !== 'modal' && (
          <button
            type="submit"
            disabled={!value.trim()}
            className="absolute right-2 top-2 p-1.5 rounded-lg bg-zinc-900 text-white disabled:opacity-30 hover:bg-zinc-800"
            title="Capture (Enter)"
          >
            <Zap size={14} />
          </button>
        )}
      </div>
      {variant === 'modal' && (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={closeCapture} className="px-3 py-2 text-sm text-zinc-500">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-semibold disabled:opacity-40"
          >
            Capture
          </button>
        </div>
      )}
      {showResult && lastResult && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Captured
          </p>
          <p className="text-xs mt-1 text-emerald-800">
            Type: {CAPTURE_CLASSIFICATION_LABEL[lastResult.classification]}
            {lastResult.objectCreated && lastResult.objectType ? ` · Object: ${lastResult.objectType}` : ''}
            {lastResult.memoryCreated ? ' · Memory created' : ''}
            {lastResult.knowledgeSuggestion ? ' · Knowledge suggestion pending' : ''}
          </p>
        </div>
      )}
    </form>
  )

  if (variant === 'modal') {
    if (!captureOpen) return null
    return (
      <div
        className="fixed inset-0 z-[110] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) closeCapture() }}
      >
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-zinc-200 p-5" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              Universal Capture
            </h2>
            <button type="button" onClick={closeCapture} className="text-zinc-400 hover:text-zinc-600">
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-zinc-500 mb-3">FounderOS classifies — you just capture.</p>
          {form}
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="px-3 py-2 border-b border-zinc-100 bg-white">
        {form}
      </div>
    )
  }

  return form
}
