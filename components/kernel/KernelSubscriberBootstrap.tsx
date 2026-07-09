'use client'

import { useEffect } from 'react'
import { useFounderKernel } from '@/contexts/FounderKernelContext'
import { useSignalEngine } from '@/contexts/SignalEngineContext'
import { useObjectEngine } from '@/contexts/ObjectEngineContext'
import { useMorningExecution } from '@/contexts/MorningExecutionContext'
import { useEveningReview } from '@/contexts/EveningReviewContext'
import { createPredictionFromDecision } from '@/lib/outcome-engine/outcomeEngine'
import type { DecisionOutput } from '@/lib/decision-engine/decisionTypes'

/**
 * Wires engine reactions to Kernel subscribers.
 * Handlers coordinate execution only — business logic stays in each engine.
 */
export default function KernelSubscriberBootstrap() {
  const { registerSubscriber } = useFounderKernel()
  const { ingestFromCapture } = useSignalEngine()
  const { refresh: refreshObjects } = useObjectEngine()
  const { refresh: refreshMorning } = useMorningExecution()
  const { refresh: refreshEvening } = useEveningReview()

  useEffect(() => {
    const unsubs = [
      registerSubscriber({
        id: 'signal-engine',
        name: 'Signal Engine',
        priority: 10,
        subscribedEvents: ['CaptureCreated'],
        handler: (event) => {
          if (event.type !== 'CaptureCreated') return
          const capture = event.payload.capture as Parameters<typeof ingestFromCapture>[0] | undefined
          if (capture) ingestFromCapture(capture)
        },
      }),
      registerSubscriber({
        id: 'object-engine',
        name: 'Object Engine',
        priority: 20,
        subscribedEvents: ['CaptureCreated', 'ObjectCreated', 'ObjectUpdated'],
        handler: (event) => {
          if (['CaptureCreated', 'ObjectCreated', 'ObjectUpdated'].includes(event.type)) {
            refreshObjects()
          }
        },
      }),
      registerSubscriber({
        id: 'outcome-engine',
        name: 'Outcome Engine',
        priority: 50,
        subscribedEvents: ['DecisionGenerated'],
        handler: (event) => {
          if (event.type !== 'DecisionGenerated') return
          const decision = event.payload.decision as DecisionOutput | undefined
          if (decision) createPredictionFromDecision(decision)
        },
      }),
      registerSubscriber({
        id: 'morning-execution',
        name: 'Morning Execution',
        priority: 70,
        subscribedEvents: ['CaptureCreated', 'EveningCompleted', 'SignalProcessed', 'OutcomeRecorded'],
        handler: (event) => {
          if (['CaptureCreated', 'EveningCompleted', 'SignalProcessed', 'OutcomeRecorded'].includes(event.type)) {
            refreshMorning()
          }
        },
      }),
      registerSubscriber({
        id: 'evening-review',
        name: 'Evening Review',
        priority: 80,
        subscribedEvents: ['EveningCompleted'],
        handler: () => {
          refreshEvening()
        },
      }),
      registerSubscriber({
        id: 'decision-engine',
        name: 'Decision Engine',
        priority: 60,
        subscribedEvents: ['CaptureCreated', 'SignalProcessed', 'OutcomeRecorded', 'MorningStarted', 'EveningCompleted'],
        handler: (event) => {
          if (['CaptureCreated', 'SignalProcessed', 'OutcomeRecorded', 'MorningStarted', 'EveningCompleted'].includes(event.type)) {
            refreshMorning()
          }
        },
      }),
      registerSubscriber({
        id: 'domain-intelligence',
        name: 'Domain Intelligence',
        priority: 55,
        subscribedEvents: ['MorningStarted', 'CaptureCreated', 'EveningCompleted'],
        handler: (event) => {
          if (['MorningStarted', 'CaptureCreated', 'EveningCompleted'].includes(event.type)) {
            refreshMorning()
          }
        },
      }),
      registerSubscriber({
        id: 'assistant',
        name: 'Assistant',
        priority: 90,
        subscribedEvents: ['CaptureCreated', 'DecisionGenerated', 'EveningCompleted', 'UserAskedQuestion'],
        handler: () => {
          // Assistant reads kernel history on demand — no state mutation needed.
        },
      }),
    ]

    return () => {
      for (const unsub of unsubs) unsub()
    }
  }, [
    registerSubscriber, ingestFromCapture, refreshObjects,
    refreshMorning, refreshEvening,
  ])

  return null
}
