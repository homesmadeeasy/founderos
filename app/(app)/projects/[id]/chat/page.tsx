'use client'

import { useEffect, useRef } from 'react'
import { Sparkles, AlertCircle, RotateCcw, X } from 'lucide-react'
import { useProjectContext } from '@/contexts/ProjectContext'
import ChatMessage from '@/components/chat/ChatMessage'
import ChatInput from '@/components/chat/ChatInput'
import ProjectContextPanel from '@/components/project/ProjectContextPanel'

export default function ProjectChatPage() {
  const { messages, isAiTyping, aiError, sendMessage, retryLastMessage, dismissError } = useProjectContext()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAiTyping, aiError])

  return (
    /* -m-6 cancels the layout's p-6 so the chat fills edge-to-edge */
    <div className="-m-6 flex" style={{ height: 'calc(100vh - 210px)', minHeight: '520px' }}>

      {/* ── Left: Chat column ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 p-6 gap-4">

        {/* Message list */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                <Sparkles size={20} className="text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-700">Start a conversation</p>
                <p className="text-sm text-zinc-400 mt-1.5 max-w-xs leading-relaxed">
                  Ask anything about this project. AI has full context of your goal and can help you plan, identify risks, and more.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* AI typing indicator */}
              {isAiTyping && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 shrink-0 rounded-full bg-zinc-100 flex items-center justify-center mt-0.5">
                    <Sparkles size={12} className="text-zinc-400" />
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2.5">
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-xs text-zinc-400">FounderOS is thinking…</span>
                  </div>
                </div>
              )}

              {/* Error banner with retry */}
              {aiError && !isAiTyping && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 shrink-0 rounded-full bg-red-50 flex items-center justify-center mt-0.5">
                    <AlertCircle size={13} className="text-red-500" />
                  </div>
                  <div className="flex-1 bg-red-50 border border-red-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-red-700 leading-relaxed">{aiError}</p>
                      <button onClick={dismissError} className="shrink-0 text-red-300 hover:text-red-500 transition-colors" title="Dismiss">
                        <X size={13} />
                      </button>
                    </div>
                    <button
                      onClick={retryLastMessage}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <RotateCcw size={11} /> Try again
                    </button>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0">
          <ChatInput onSend={sendMessage} disabled={isAiTyping} />
        </div>
      </div>

      {/* ── Right: Context panel ────────────────────────────────────────── */}
      <div className="border-l border-zinc-200 bg-zinc-50 p-4 overflow-y-auto hidden lg:block">
        <ProjectContextPanel />
      </div>
    </div>
  )
}
