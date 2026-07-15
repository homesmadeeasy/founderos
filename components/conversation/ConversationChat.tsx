'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useConversation } from '@/contexts/ConversationContext'
import ConversationMessage from './ConversationMessage'
import ReplyChoices from './ReplyChoices'
import ConversationComposer from './ConversationComposer'
import ConversationTypingIndicator from './ConversationTypingIndicator'
import ConversationEmptyState from './ConversationEmptyState'
import FounderAIThinkingIndicator from './FounderAIThinkingIndicator'
import { getActiveAnswerOptions } from '@/lib/conversation/conversationAdaptive'
import Card from '@/components/home/Card'

export default function ConversationChat() {
  const {
    session,
    isTyping,
    reasoningMode,
    getProposalForTurn,
    start,
    continueSession,
    reply,
    questionChips,
    ready,
    handleActionCard,
    composerFocusRef,
    approveActionProposal,
    approveBeliefProposal,
    dismissAIProposal,
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
  const answerOptions = activeSession ? getActiveAnswerOptions(activeSession) : []
  const lastTurn = activeSession?.turns[activeSession.turns.length - 1]
  const showReplyChoices = Boolean(
    activeSession?.status === 'active'
    && activeSession.activeQuestionId
    && answerOptions.length > 0
    && !isTyping
    && lastTurn?.role === 'founder_ai',
  )

  const onReply = useCallback((answer: string) => {
    void reply(answer, activeSession?.activeQuestionId ?? activeSession?.nextQuestion?.id)
  }, [reply, activeSession?.activeQuestionId, activeSession?.nextQuestion?.id])
  const onCustomFocus = useCallback(() => {
    composerFocusRef.current?.focus()
  }, [composerFocusRef])

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
              {activeSession.realityChanges && activeSession.realityChanges.length > 0 && (
                <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-indigo-500/[0.06] border border-indigo-200/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600/80 mb-1">Reality change</p>
                  <ul className="space-y-0.5">
                    {activeSession.realityChanges.slice(0, 2).map(rc => (
                      <li key={rc.id} className="text-[11px] text-zinc-600 leading-snug">
                        {rc.previous && rc.previous !== '(none)'
                          ? `${rc.previous} → ${rc.next}`
                          : rc.next}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activeSession.turns.map(turn => (
                <ConversationMessage
                  key={turn.id}
                  turn={turn}
                  showEvidence={turn.role === 'founder_ai'}
                  onAction={handleActionCard}
                  proposal={getProposalForTurn(turn.id)}
                  onApproveAction={approveActionProposal}
                  onApproveBeliefs={approveBeliefProposal}
                  onDismissProposal={dismissAIProposal}
                />
              ))}
              {isTyping && reasoningMode !== 'idle' ? (
                <FounderAIThinkingIndicator mode={reasoningMode} />
              ) : isTyping ? (
                <ConversationTypingIndicator />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {activeSession?.status === 'active' && (
        <div className="conv-panel-footer">
          <ReplyChoices
            key={activeSession.activeQuestionId ?? 'no-question'}
            visible={showReplyChoices}
            disabled={isTyping}
            onReply={onReply}
            onCustomFocus={onCustomFocus}
            answerOptions={answerOptions}
          />

          <ConversationComposer
            onSend={text => void reply(text, activeSession.activeQuestionId ?? activeSession.nextQuestion?.id)}
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
