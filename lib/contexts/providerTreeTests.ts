/**
 * Provider tree render regression tests.
 * Run: npm run test:providers (via providerTests.ts)
 */
import assert from 'node:assert'
import { createElement, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'

// Stub Supabase env so AppProvider can mount in Node tests.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'

import { AppProvider } from '@/contexts/AppContext'
import { MemoryEngineProvider } from '@/contexts/MemoryEngineContext'
import { ObjectEngineProvider } from '@/contexts/ObjectEngineContext'
import { KnowledgeEngineProvider } from '@/contexts/KnowledgeEngineContext'
import { ExecutiveEngineProvider } from '@/contexts/ExecutiveEngineContext'
import { SignalEngineProvider } from '@/contexts/SignalEngineContext'
import { SyncEngineProvider } from '@/contexts/SyncEngineContext'
import { UniversalCaptureProvider } from '@/contexts/UniversalCaptureContext'
import { FounderKernelProvider } from '@/contexts/FounderKernelContext'
import { MorningExecutionProvider } from '@/contexts/MorningExecutionContext'
import { EveningReviewProvider } from '@/contexts/EveningReviewContext'
import { CognitiveModelProvider } from '@/contexts/CognitiveModelContext'
import { ActionEngineProvider } from '@/contexts/ActionEngineContext'
import { ConversationProvider } from '@/contexts/ConversationContext'
import { useFounderInput } from '@/components/founder/useFounderInput'
import type { FounderInput } from '@/lib/specialists/founder/founderTypes'

function nest(Component: React.ComponentType<{ children?: ReactNode }>, child: ReactNode): ReactNode {
  const El = Component as React.ComponentType<{ children: ReactNode }>
  return createElement(El, { children: child })
}

function AppProviderTree({ children }: { children: ReactNode }) {
  return createElement(AppProvider, {
    userId: 'provider-tree-test-user',
    children: nest(MemoryEngineProvider,
      nest(ObjectEngineProvider,
        nest(KnowledgeEngineProvider,
          nest(ExecutiveEngineProvider,
            nest(SignalEngineProvider,
              nest(SyncEngineProvider,
                nest(UniversalCaptureProvider,
                  nest(FounderKernelProvider,
                    nest(MorningExecutionProvider,
                      nest(EveningReviewProvider, children),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  })
}

function testCognitiveProviderMountsWithoutContextError() {
  let threw: Error | null = null
  try {
    renderToString(
      createElement(AppProviderTree, {
        children: createElement(CognitiveModelProvider, {
          children: createElement('span', null, 'mounted'),
        }),
      }),
    )
  } catch (error) {
    threw = error as Error
  }
  assert.strictEqual(threw, null, `CognitiveModelProvider mount threw: ${threw?.message ?? ''}`)
  console.log('PASS: CognitiveModelProvider mounts without useCognitiveModel context error')
}

function testFounderInputReceivesWorldModelUnderProvider() {
  let captured: FounderInput | null = null

  function Capture() {
    captured = useFounderInput()
    return null
  }

  renderToString(
    createElement(AppProviderTree, {
      children: createElement(CognitiveModelProvider, {
        children: createElement(Capture),
      }),
    }),
  )

  assert.ok(captured, 'useFounderInput should return input')
  assert.ok(captured!.worldModel, 'useFounderInput should include worldModel beneath CognitiveModelProvider')
  assert.ok(Array.isArray(captured!.worldModel!.beliefs), 'worldModel should be a real WorldModel')
  console.log('PASS: useFounderInput receives cognitive world model under provider')
}

function testActionAndConversationProvidersMount() {
  let threw: Error | null = null
  try {
    renderToString(
      createElement(AppProviderTree, {
        children: createElement(CognitiveModelProvider, {
          children: createElement(ActionEngineProvider, {
            children: createElement(ConversationProvider, {
              children: createElement('span', null, 'mounted'),
            }),
          }),
        }),
      }),
    )
  } catch (error) {
    threw = error as Error
  }
  assert.strictEqual(threw, null, `ActionEngine/Conversation mount threw: ${threw?.message ?? ''}`)
  console.log('PASS: ActionEngineProvider and ConversationProvider mount without hook errors')
}

function run() {
  console.log('Provider tree render tests\n')
  testCognitiveProviderMountsWithoutContextError()
  testFounderInputReceivesWorldModelUnderProvider()
  testActionAndConversationProvidersMount()
  console.log('\nAll provider tree render tests passed.')
}

run()
