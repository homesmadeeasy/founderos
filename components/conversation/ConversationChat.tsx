'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useConversation } from '@/contexts/ConversationContext'
import ConversationMessage from './ConversationMessage'
import ReplyChoices from './ReplyChoices'
import ConversationComposer from './ConversationComposer'
import ConversationTypingIndicator from './ConversationTypingIndicator'
import ConversationEmptyState from './ConversationEmptyState'
import Card from '@/components/home/Card'

export default function ConversationChat() {
  const {
    session,
    isTyping,
    start,
    continueSession,
    reply,
    questionChips,
    ready,
    handleActionCard,
    composerFocusRef,
  } = useConversation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!ready || initialized.current) return
    initialized.current = true
    if (!session) continueSession()
  }, [ready, session, continueSession])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [session?.turns.length, isTyping])

  const activeSession = session
  const lastTurn = activeSession?.turns[activeSession.turns.length - 1]
  const showReplyChoices = Boolean(
    activeSession?.status === 'active'
    && activeSession.nextQuestion
    && activeSession.nextQuestion.answerType === 'yes_no'
    && !isTyping
    && lastTurn?.role === 'founder_ai',
  )

  const onCustomFocus = useCallback(() => {
    composerFocusRef.current?.focus()
  }, [composerFocusRef])

  const onReply = useCallback((answer: string) => {
    void reply(answer, activeSession?.nextQuestion?.id)
  }, [reply, activeSession?.nextQuestion?.id])

  return (
    <Card className="conv-panel p-0 overflow-hidden flex flex-col">
      <div className="conv-messages-wrap">
        <div
          ref={scrollRef}
          className="conv-messages scrollbar-hide"
        >
          {!activeSession ? (
            <ConversationEmptyState onStart={() => start()} />
          ) : (
            <div className="conv-messages-inner">
              {activeSession.turns.map(turn => (
                <ConversationMessage
                  key={turn.id}
                  turn={turn}
                  showEvidence={turn.role === 'founder_ai'}
                  onAction={handleActionCard}
                />
              ))}
              {isTyping && <ConversationTypingIndicator />}
            </div>
          )}
        </div>
      </div>

      {activeSession?.status === 'active' && (
        <div className="conv-panel-footer">
          <ReplyChoices
            key={activeSession.nextQuestion?.id ?? 'no-question'}
            visible={showReplyChoices}
            disabled={isTyping}
            onReply={onReply}
            onCustomFocus={onCustomFocus}
          />

          <ConversationComposer
            onSend={text => void reply(text, activeSession.nextQuestion?.id)}
            disabled={isTyping}
            inputRef={composerFocusRef}
          />

          <div className="conv-suggested">
            <p className="conv-suggested-label">Suggested questions</p>
            <div className="conv-suggested-chips">
              {questionChips.map(chip => (
                <button
                  key={chip}
                  type="button"
                  disabled={isTyping}
                  onClick={() => void reply(chip)}
                  className="conv-suggested-chip"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
