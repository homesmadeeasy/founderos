import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppProvider } from '@/contexts/AppContext'
import { ExecutiveEngineProvider } from '@/contexts/ExecutiveEngineContext'
import { KnowledgeEngineProvider } from '@/contexts/KnowledgeEngineContext'
import { MemoryEngineProvider } from '@/contexts/MemoryEngineContext'
import { IdentityProvider } from '@/contexts/IdentityContext'
import { RealityProvider } from '@/contexts/RealityContext'
import { EveningReviewProvider } from '@/contexts/EveningReviewContext'
import { MorningExecutionProvider } from '@/contexts/MorningExecutionContext'
import { ObjectEngineProvider } from '@/contexts/ObjectEngineContext'
import { SignalEngineProvider } from '@/contexts/SignalEngineContext'
import { SyncEngineProvider } from '@/contexts/SyncEngineContext'
import { FounderKernelProvider } from '@/contexts/FounderKernelContext'
import { CognitiveModelProvider } from '@/contexts/CognitiveModelContext'
import { IntelligencePipelineProvider } from '@/contexts/IntelligencePipelineContext'
import { ActionEngineProvider } from '@/contexts/ActionEngineContext'
import { ConversationProvider } from '@/contexts/ConversationContext'
import { UniversalCaptureProvider } from '@/contexts/UniversalCaptureContext'
import KernelSubscriberBootstrap from '@/components/kernel/KernelSubscriberBootstrap'
import CommandBarProvider from '@/components/command/CommandBarProvider'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth guard (middleware also protects these routes).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <AppProvider userId={user.id}>
      <MemoryEngineProvider>
        <IdentityProvider>
        <ObjectEngineProvider>
          <KnowledgeEngineProvider>
            <ExecutiveEngineProvider>
              <SignalEngineProvider>
                <SyncEngineProvider>
                  <UniversalCaptureProvider>
                    <FounderKernelProvider>
                      <RealityProvider>
                      <MorningExecutionProvider>
                        <EveningReviewProvider>
                          <CognitiveModelProvider>
                            <IntelligencePipelineProvider>
                            <ActionEngineProvider>
                            <ConversationProvider>
                            <CommandBarProvider>
                              <KernelSubscriberBootstrap />
                              <div className="flex h-screen overflow-hidden bg-zinc-50">
                                <Sidebar userEmail={user.email} />
                                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                                  <TopBar />
                                  <main className="flex-1 overflow-y-auto">
                                    {children}
                                  </main>
                                </div>
                              </div>
                            </CommandBarProvider>
                            </ConversationProvider>
                            </ActionEngineProvider>
                            </IntelligencePipelineProvider>
                          </CognitiveModelProvider>
                        </EveningReviewProvider>
                      </MorningExecutionProvider>
                      </RealityProvider>
                    </FounderKernelProvider>
                  </UniversalCaptureProvider>
                </SyncEngineProvider>
              </SignalEngineProvider>
            </ExecutiveEngineProvider>
          </KnowledgeEngineProvider>
        </ObjectEngineProvider>
        </IdentityProvider>
      </MemoryEngineProvider>
    </AppProvider>
  )
}
