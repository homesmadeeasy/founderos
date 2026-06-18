'use client'

import { MessageSquare } from 'lucide-react'
import type { Message } from '@/lib/types'
import ConversionButtons from './ConversionButtons'

interface Props {
  message: Message
}

/** Render markdown-lite content: **bold**, numbered lists, bullet points */
function MessageContent({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (line === '') return <div key={i} className="h-2" />

        // **bold heading**
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={i} className="font-semibold mt-3 first:mt-0">
              {line.slice(2, -2)}
            </p>
          )
        }

        // Bold inline — **text** anywhere in line
        if (line.includes('**')) {
          const parts = line.split(/(\*\*[^*]+\*\*)/)
          return (
            <p key={i}>
              {parts.map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={j}>{part.slice(2, -2)}</strong>
                  : part
              )}
            </p>
          )
        }

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          return <p key={i} className="ml-3">{line}</p>
        }

        // Bullet
        if (line.startsWith('- ')) {
          return <p key={i} className="ml-3">• {line.slice(2)}</p>
        }

        return <p key={i}>{line}</p>
      })}
    </div>
  )
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={[
        'w-7 h-7 shrink-0 rounded-full flex items-center justify-center mt-0.5 text-xs font-semibold',
        isUser ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500',
      ].join(' ')}>
        {isUser ? 'Y' : <MessageSquare size={12} />}
      </div>

      {/* Bubble + conversion buttons */}
      <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'} max-w-[78%]`}>
        <div className={[
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-zinc-900 text-white rounded-tr-sm'
            : 'bg-white text-zinc-800 border border-zinc-200 rounded-tl-sm shadow-sm',
        ].join(' ')}>
          <MessageContent text={message.content} />
        </div>

        {/* Conversion buttons — only on assistant messages */}
        {!isUser && <ConversionButtons messageContent={message.content} />}
      </div>
    </div>
  )
}
