'use client'

import { useState } from 'react'
import { Inbox, Zap } from 'lucide-react'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import { CAPTURE_TYPES, CAPTURE_TYPE_LABEL } from '@/lib/command-center/types'
import type { CaptureType } from '@/lib/command-center/types'
import CardShell from './CardShell'

export default function QuickCaptureCard() {
  const { state, addCapture, updateCapture, deleteCapture } = useCommandCenter()
  const [type, setType] = useState<CaptureType>('idea')
  const [content, setContent] = useState('')

  const inbox = state.captureItems.filter(c => c.status === 'inbox')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    addCapture(type, content.trim())
    setContent('')
  }

  return (
    <CardShell title="Quick Capture" icon={Zap}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {CAPTURE_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                type === t
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {CAPTURE_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Capture an idea, task, note, decision or question…"
          rows={2}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
        >
          Capture
        </button>
      </form>

      {inbox.length > 0 && (
        <div className="mt-5 pt-4 border-t border-zinc-100">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Inbox size={12} /> Inbox ({inbox.length})
          </p>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {inbox.slice(0, 8).map(item => (
              <li key={item.id} className="flex items-start gap-2 text-xs group">
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">
                  {CAPTURE_TYPE_LABEL[item.type]}
                </span>
                <span className="flex-1 text-zinc-700 leading-relaxed">{item.content}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateCapture(item.id, { status: 'processed' })}
                    className="text-zinc-400 hover:text-emerald-600"
                    title="Mark processed"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCapture(item.id)}
                    className="text-zinc-400 hover:text-red-500"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardShell>
  )
}
