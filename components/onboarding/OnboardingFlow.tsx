'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Lightbulb, FolderKanban, MessageSquare, Sparkles, Dna, GitBranch,
  ArrowRight, Check, Loader2, Zap, Target,
} from 'lucide-react'
import { ONBOARDING_STEPS } from '@/lib/onboarding'

const STEP_ICONS = [Target, FolderKanban, Lightbulb, MessageSquare, Zap, Sparkles, Dna] as const

export default function OnboardingFlow() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isIntro = step === 0
  const isFinal = step === ONBOARDING_STEPS.length

  async function finish() {
    setCompleting(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/complete', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not complete onboarding.')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setCompleting(false)
    }
  }

  async function loadDemo() {
    setLoadingDemo(true)
    setError(null)
    try {
      const res = await fetch('/api/demo-workspace', { method: 'POST' })
      const data = await res.json() as { projectId?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not load demo workspace.')
      await finish()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoadingDemo(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Welcome to FounderOS</p>
          <h1 className="text-2xl font-bold text-zinc-900">
            {isIntro ? 'Your AI operating system for goals and worlds' : isFinal ? 'You\'re ready to build' : ONBOARDING_STEPS[step - 1].title}
          </h1>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {isIntro ? (
            <div className="p-8 space-y-6">
              <p className="text-sm text-zinc-600 leading-relaxed text-center">
                FounderOS helps you create AI worlds for goals, ideas, projects, learning, business, personal
                systems and life areas. Each world can remember, plan, review and evolve — with you in control.
              </p>
              <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 text-center">The core loop</p>
                <p className="text-sm font-medium text-zinc-800 text-center leading-relaxed">
                  Capture → Organise → Plan → Execute → Review → Improve
                </p>
              </div>
              <p className="text-xs text-zinc-400 text-center">
                This takes about one minute. You can also load a demo workspace to explore immediately.
              </p>
            </div>
          ) : isFinal ? (
            <div className="p-8 space-y-5 text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto">
                <Check size={22} className="text-emerald-600" />
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Start with Goals or Idea Vault, create a world, use AI chat to plan, and run reviews to stay
                focused. World DNA, Patterns and semantic memory get smarter as you build.
              </p>
              <button
                type="button"
                onClick={() => void loadDemo()}
                disabled={loadingDemo || completing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-zinc-100 disabled:opacity-50 transition-colors"
              >
                {loadingDemo ? <Loader2 size={14} className="animate-spin" /> : <FolderKanban size={14} />}
                Load Demo Workspace
              </button>
              <p className="text-[11px] text-zinc-400">Creates sample idea, project, tasks and more — clearly marked as demo data.</p>
            </div>
          ) : (
            <div className="p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0">
                  {(() => {
                    const Icon = STEP_ICONS[step - 1] ?? Lightbulb
                    return <Icon size={18} className="text-white" />
                  })()}
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Step {step} of {ONBOARDING_STEPS.length}</p>
                  <p className="text-sm font-semibold text-zinc-900">{ONBOARDING_STEPS[step - 1].title}</p>
                </div>
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed">{ONBOARDING_STEPS[step - 1].body}</p>
              <div className="flex gap-1">
                {ONBOARDING_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i < step ? 'bg-zinc-900' : 'bg-zinc-100'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="px-8 pb-4">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <div className="px-8 py-4 border-t border-zinc-100 flex items-center justify-between gap-3 bg-zinc-50/50">
            <div className="flex items-center gap-3">
              <Link href="/how-it-works" target="_blank" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
                How FounderOS works
              </Link>
              {!isFinal && (
                <button
                  type="button"
                  onClick={() => void finish()}
                  disabled={completing}
                  className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-50"
                >
                  Skip for now
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isIntro && !isFinal && (
                <button
                  type="button"
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                  className="px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Back
                </button>
              )}
              {isFinal ? (
                <button
                  type="button"
                  onClick={() => void finish()}
                  disabled={completing || loadingDemo}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 disabled:opacity-50"
                >
                  {completing ? <Loader2 size={14} className="animate-spin" /> : null}
                  Go to dashboard
                  {!completing && <ArrowRight size={14} />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700"
                >
                  {isIntro ? 'Start tour' : 'Next'}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
