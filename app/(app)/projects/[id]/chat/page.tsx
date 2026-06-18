import { getChatMessages } from '@/lib/mock-data'
import { Sparkles, MessageSquare } from 'lucide-react'

export default async function ProjectChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const messages = getChatMessages(id)

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 260px)', minHeight: '420px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-zinc-200 p-5 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Sparkles size={20} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700">Start a conversation</p>
              <p className="text-sm text-zinc-400 mt-1.5 max-w-xs leading-relaxed">
                Ask anything about this project — planning, risks, tasks, decisions. AI has full context of your goal.
              </p>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {[
                'Help me plan my first sprint',
                'What are the biggest risks?',
                'Draft a roadmap for V1',
              ].map((prompt) => (
                <button
                  key={prompt}
                  className="px-3 py-1.5 text-xs text-zinc-600 border border-zinc-200 rounded-full hover:border-zinc-400 hover:text-zinc-800 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={[
                'w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5',
                msg.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600',
              ].join(' ')}>
                {msg.role === 'user' ? 'Y' : <MessageSquare size={12} />}
              </div>
              <div className={[
                'max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-zinc-900 text-white rounded-tr-sm'
                  : 'bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-tl-sm',
              ].join(' ')}>
                {msg.content.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="font-semibold mt-2.5 first:mt-0">{line.replace(/\*\*/g, '')}</p>
                  }
                  if (line.match(/^\d+\.\s/)) return <p key={i} className="ml-2 mt-0.5">{line}</p>
                  if (line.startsWith('- '))   return <p key={i} className="ml-2 mt-0.5">• {line.slice(2)}</p>
                  if (line === '')             return <div key={i} className="h-1.5" />
                  return <p key={i}>{line}</p>
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 bg-white rounded-xl border border-zinc-200 p-3 flex items-end gap-3">
        <textarea
          rows={2}
          placeholder="Ask anything about this project…"
          className="flex-1 text-sm text-zinc-800 placeholder:text-zinc-400 resize-none outline-none leading-relaxed"
        />
        <button className="shrink-0 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors">
          Send
        </button>
      </div>
    </div>
  )
}
