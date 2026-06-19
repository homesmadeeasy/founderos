'use client'

import { useState } from 'react'
import { CheckSquare, StickyNote, GitBranch, AlertTriangle, Map } from 'lucide-react'
import ConversionModal from './ConversionModal'
import type { ConversionType } from './ConversionModal'

const buttons: { type: ConversionType; label: string; icon: typeof CheckSquare }[] = [
  { type: 'task',     label: 'Task',     icon: CheckSquare  },
  { type: 'note',     label: 'Note',     icon: StickyNote   },
  { type: 'decision', label: 'Decision', icon: GitBranch    },
  { type: 'risk',     label: 'Risk',     icon: AlertTriangle },
  { type: 'roadmap',  label: 'Roadmap',  icon: Map          },
]

interface Props {
  messageContent: string
  sourceMessageId?: string
}

export default function ConversionButtons({ messageContent, sourceMessageId }: Props) {
  const [activeType, setActiveType] = useState<ConversionType | null>(null)

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {buttons.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-500 border border-zinc-200 rounded-full hover:border-zinc-400 hover:text-zinc-700 hover:bg-white transition-colors"
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {activeType && (
        <ConversionModal
          type={activeType}
          sourceContent={messageContent}
          sourceMessageId={sourceMessageId}
          onClose={() => setActiveType(null)}
        />
      )}
    </>
  )
}
