'use client'

import ConversationHeader from '@/components/conversation/ConversationHeader'
import ConversationChat from '@/components/conversation/ConversationChat'
import ConversationSidebar from '@/components/conversation/ConversationSidebar'
import { useFounderSnapshot } from '@/components/founder/useFounderSnapshot'
import { useConversation } from '@/contexts/ConversationContext'

export default function FounderPage() {
  const snapshot = useFounderSnapshot()
  const { session } = useConversation()

  return (
    <div className="home-page">
      <div className="home-canvas max-w-[1120px] mx-auto px-4 sm:px-5 py-5 sm:py-6 pb-20">
        <ConversationHeader snapshot={snapshot} />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
          <ConversationChat />
          <ConversationSidebar session={session} />
        </div>
      </div>
    </div>
  )
}
