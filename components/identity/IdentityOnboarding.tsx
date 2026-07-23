'use client'

import { useMemo, useState } from 'react'
import { useIdentity } from '@/contexts/IdentityContext'
import {
  declareInputFromStep,
  stepsForSpecialists,
  type OnboardingStep,
} from '@/lib/identity/identityOnboarding'
import { DEFAULT_SPECIALIST_IDS, type SpecialistId } from '@/lib/identity/identityTypes'

const SPECIALIST_OPTIONS: { id: SpecialistId; label: string }[] = [
  { id: 'founder', label: 'Founder' },
  { id: 'gym', label: 'Gym' },
  { id: 'school', label: 'School' },
  { id: 'finance', label: 'Finance' },
  { id: 'health', label: 'Health' },
  { id: 'travel', label: 'Travel' },
]

export default function IdentityOnboarding() {
  const { store, setEnabledSpecialists, declareFact, markOnboardingComplete } = useIdentity()
  const [enabled, setEnabled] = useState<SpecialistId[]>(
    store.enabledSpecialists.length
      ? store.enabledSpecialists
      : ['founder', 'gym'],
  )
  const [phase, setPhase] = useState<'specialists' | 'steps'>('specialists')
  const [stepIndex, setStepIndex] = useState(0)
  const [textValue, setTextValue] = useState('')
  const [multiValue, setMultiValue] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const steps = useMemo(() => stepsForSpecialists(enabled), [enabled])
  const step: OnboardingStep | undefined = steps[stepIndex]

  const toggleSpecialist = (id: SpecialistId) => {
    setEnabled(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const startSteps = async () => {
    if (enabled.length === 0) {
      setError('Enable at least one specialist.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await setEnabledSpecialists(enabled)
      setPhase('steps')
      setStepIndex(0)
    } finally {
      setBusy(false)
    }
  }

  const submitStep = async () => {
    if (!step) return
    let value: string | string[] = textValue.trim()
    if (step.inputType === 'multi') value = multiValue
    if (step.inputType === 'single' && !value) {
      setError('Choose an option to continue.')
      return
    }
    if (step.inputType === 'multi' && multiValue.length === 0) {
      setError('Select at least one option.')
      return
    }
    if (step.inputType === 'text' && !String(value).trim()) {
      setError('Add a short answer.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await declareFact(declareInputFromStep(step, value))
      setTextValue('')
      setMultiValue([])
      if (stepIndex >= steps.length - 1) {
        await markOnboardingComplete(true)
      } else {
        setStepIndex(i => i + 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-700">Day one</p>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Know you in under 5 minutes</h1>
        <p className="text-sm text-zinc-600">
          Only high-value questions for the specialists you enable. You can refine identity anytime.
        </p>
      </header>

      {phase === 'specialists' && (
        <section className="rounded-2xl border border-zinc-200 bg-white/80 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Which specialists should FounderOS use?</h2>
          <div className="flex flex-wrap gap-2">
            {SPECIALIST_OPTIONS.filter(s => (DEFAULT_SPECIALIST_IDS as readonly string[]).includes(s.id)).map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSpecialist(s.id)}
                className={`text-xs px-3 py-2 rounded-xl border min-h-11 ${
                  enabled.includes(s.id)
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : 'border-zinc-200 text-zinc-600'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void startSteps()}
            className="w-full rounded-xl bg-zinc-900 text-white font-semibold py-3 min-h-12 text-sm disabled:opacity-50"
          >
            Continue
          </button>
        </section>
      )}

      {phase === 'steps' && step && (
        <section className="rounded-2xl border border-zinc-200 bg-white/80 p-5 space-y-4">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <h2 className="text-base font-semibold text-zinc-900">{step.label}</h2>
          <p className="text-sm text-zinc-600">{step.prompt}</p>

          {step.inputType === 'text' && (
            <input
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm min-h-12"
              aria-label={step.label}
            />
          )}

          {step.inputType === 'single' && (
            <div className="flex flex-col gap-2">
              {(step.options ?? []).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTextValue(opt.value)}
                  className={`text-left text-sm px-3 py-3 rounded-xl border min-h-11 ${
                    textValue === opt.value ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {step.inputType === 'multi' && (
            <div className="flex flex-col gap-2">
              {(step.options ?? []).map(opt => {
                const selected = multiValue.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMultiValue(prev =>
                      selected ? prev.filter(v => v !== opt.value) : [...prev, opt.value],
                    )}
                    className={`text-left text-sm px-3 py-3 rounded-xl border min-h-11 ${
                      selected ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}

          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitStep()}
            className="w-full rounded-xl bg-emerald-600 text-white font-semibold py-3 min-h-12 text-sm disabled:opacity-50"
          >
            {stepIndex >= steps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </section>
      )}
    </div>
  )
}
