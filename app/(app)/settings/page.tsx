'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  User, Bot, Bell, Shield, AlertTriangle, ChevronRight, Mail, Brain, Loader2, RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ConnectedSourcesSection from '@/components/settings/ConnectedSourcesSection'
import CognitiveStorageSection from '@/components/settings/CognitiveStorageSection'
import FounderAISettingsSection from '@/components/settings/FounderAISettingsSection'
import FounderReliabilitySection from '@/components/settings/FounderReliabilitySection'
import GymSettingsSection from '@/components/settings/GymSettingsSection'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { isStagingEnvironment } from '@/lib/env/public'
import type { MemoryIndexStatus } from '@/lib/types'

const sections = [
  {
    id: 'profile',
    label: 'Profile',
    desc: 'Your name, avatar, and account details',
    icon: User,
    fields: [
      { label: 'Display name', placeholder: 'Your name', type: 'text' },
      { label: 'Email', placeholder: 'you@example.com', type: 'email', readOnly: true },
    ],
  },
  {
    id: 'ai',
    label: 'AI preferences',
    desc: 'How FounderOS thinks and responds',
    icon: Bot,
    toggles: [
      { label: 'Detailed responses', desc: 'More context in chat and reviews', defaultOn: true },
      { label: 'Auto-extract from chat', desc: 'Suggest tasks and notes from conversations', defaultOn: true },
      { label: 'Proactive suggestions', desc: 'Surface ideas and risks without asking', defaultOn: false },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    desc: 'Choose what alerts you receive',
    icon: Bell,
    toggles: [
      { label: 'Weekly review reminder', desc: 'Sunday evening nudge to reflect', defaultOn: true },
      { label: 'Project activity', desc: 'When tasks or risks change', defaultOn: false },
      { label: 'Idea follow-ups', desc: 'Remind you about unexplored ideas', defaultOn: true },
    ],
  },
  {
    id: 'privacy',
    label: 'Data & privacy',
    desc: 'Export, retention, and how your data is used',
    icon: Shield,
    links: [
      { label: 'Export all data', desc: 'Download projects, ideas, and notes as JSON' },
      { label: 'Data retention', desc: 'Your data stays until you delete it' },
      { label: 'Privacy policy', desc: 'How FounderOS handles your information' },
    ],
  },
  {
    id: 'danger',
    label: 'Danger zone',
    desc: 'Irreversible account actions',
    icon: AlertTriangle,
    danger: true,
    actions: [
      { label: 'Delete all projects', desc: 'Remove every project and its data' },
      { label: 'Delete account', desc: 'Permanently remove your FounderOS account' },
    ],
  },
] as const

function PlaceholderToggle({ label, desc, defaultOn }: { label: string; desc: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm text-zinc-800">{label}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled
        onClick={() => setOn(v => !v)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-not-allowed opacity-60 ${
          on ? 'bg-zinc-900' : 'bg-zinc-200'
        }`}
        title="Coming soon"
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            on ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [indexStatus, setIndexStatus] = useState<MemoryIndexStatus | null>(null)
  const [reindexing, setReindexing] = useState(false)
  const [memoryMessage, setMemoryMessage] = useState<string | null>(null)

  const loadMemoryStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/memory/status')
      if (res.ok) setIndexStatus(await res.json() as MemoryIndexStatus)
    } catch {
      // Non-blocking
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      setLoading(false)
    })
    void loadMemoryStatus()
  }, [loadMemoryStatus])

  async function handleReindex() {
    setReindexing(true)
    setMemoryMessage(null)
    try {
      const res = await fetch('/api/memory/reindex', { method: 'POST' })
      const data = await res.json() as MemoryIndexStatus & { indexed?: number; error?: string }
      if (!res.ok) {
        setMemoryMessage(data.error ?? 'Reindex failed.')
        return
      }
      setIndexStatus({ indexedCount: data.indexedCount, lastIndexedAt: data.lastIndexedAt })
      setMemoryMessage(`Indexed ${data.indexed ?? data.indexedCount} items.`)
    } catch {
      setMemoryMessage('Reindex failed. Try again.')
    } finally {
      setReindexing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingScreen label="Loading settings…" />
      </div>
    )
  }

  const showStagingBadge = isStagingEnvironment()

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>
          {showStagingBadge && (
            <span
              className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800"
              title="Private staging environment"
            >
              Staging
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-zinc-500">
          Manage your account and how FounderOS works for you.
        </p>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs text-zinc-500">
        <span className="font-medium text-zinc-600">Preview</span>
        <span>Most sections below are placeholders — Memory Search and Connected Sources are live.</span>
      </div>

      <section className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 text-zinc-500">
              <Brain size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Semantic memory</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Vector index for Memory Search and Ask Memory</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-800">{indexStatus?.indexedCount ?? '—'}</span>
            {' '}indexed items
            {indexStatus?.lastIndexedAt && (
              <span className="text-zinc-400">
                {' '}· last updated {new Date(indexStatus.lastIndexedAt).toLocaleString()}
              </span>
            )}
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Rebuilding may take a moment and uses AI embedding calls.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleReindex()}
              disabled={reindexing}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50"
            >
              {reindexing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Rebuild Memory Index
            </button>
            <Link
              href="/memory-search"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Open Memory Search →
            </Link>
          </div>
          {memoryMessage && (
            <p className="text-xs text-zinc-500">{memoryMessage}</p>
          )}
        </div>
      </section>

      <FounderAISettingsSection />

      <FounderReliabilitySection />

      <CognitiveStorageSection />

      <ConnectedSourcesSection />

      <GymSettingsSection />

      <div className="space-y-4">
        {sections.map(section => {
          const Icon = section.icon
          const isDanger = 'danger' in section && section.danger

          return (
            <section
              key={section.id}
              className={`bg-white rounded-xl border overflow-hidden ${
                isDanger ? 'border-red-100' : 'border-zinc-100'
              }`}
            >
              <div className={`px-5 py-4 border-b ${isDanger ? 'border-red-50 bg-red-50/30' : 'border-zinc-100'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isDanger ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    <Icon size={15} />
                  </div>
                  <div>
                    <h2 className={`text-sm font-semibold ${isDanger ? 'text-red-800' : 'text-zinc-900'}`}>
                      {section.label}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">{section.desc}</p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-1">
                {'fields' in section && section.fields && (
                  <div className="divide-y divide-zinc-50 py-1">
                    {section.fields.map(field => (
                      <div key={field.label} className="py-3">
                        <label className="block text-xs font-medium text-zinc-500 mb-1.5">{field.label}</label>
                        <div className="relative">
                          {field.type === 'email' && (
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          )}
                          <input
                            type={field.type}
                            defaultValue={field.type === 'email' ? email ?? '' : ''}
                            placeholder={field.placeholder}
                            readOnly={'readOnly' in field && field.readOnly}
                            disabled
                            className={`w-full py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-500 cursor-not-allowed ${
                              field.type === 'email' ? 'pl-9 pr-3' : 'px-3'
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {'toggles' in section && section.toggles && (
                  <div className="divide-y divide-zinc-50">
                    {section.toggles.map(t => (
                      <PlaceholderToggle key={t.label} {...t} />
                    ))}
                  </div>
                )}

                {'links' in section && section.links && (
                  <div className="divide-y divide-zinc-50">
                    {section.links.map(link => (
                      <button
                        key={link.label}
                        type="button"
                        disabled
                        className="w-full flex items-center justify-between py-3.5 text-left opacity-60 cursor-not-allowed"
                      >
                        <div>
                          <p className="text-sm text-zinc-800">{link.label}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{link.desc}</p>
                        </div>
                        <ChevronRight size={14} className="text-zinc-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {'actions' in section && section.actions && (
                  <div className="divide-y divide-red-50 py-1">
                    {section.actions.map(action => (
                      <button
                        key={action.label}
                        type="button"
                        disabled
                        className="w-full flex items-center justify-between py-3.5 text-left opacity-60 cursor-not-allowed"
                      >
                        <div>
                          <p className="text-sm font-medium text-red-700">{action.label}</p>
                          <p className="text-xs text-red-400/80 mt-0.5">{action.desc}</p>
                        </div>
                        <ChevronRight size={14} className="text-red-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
