'use client'

import { useState } from 'react'
import { useGymData } from '@/contexts/GymDataContext'
import { createDefaultGymProfile } from '@/lib/specialists/gym/gymProfileUtils'
import { useIdentity } from '@/contexts/IdentityContext'
import type {
  FirstSessionIntent,
  GymProfile,
  TrackingMode,
  ExperienceLevel,
  PreferredSplit,
} from '@/lib/specialists/gym/gymStorage/gymStorageTypes'
import type { Equipment } from '@/lib/specialists/gym/gymTypes'
import GymCard from './GymCard'

const GOALS: { id: GymProfile['primaryGoal']; label: string }[] = [
  { id: 'muscle_growth', label: 'Muscle growth' },
  { id: 'strength', label: 'Strength' },
  { id: 'fat_loss_maintain_muscle', label: 'Fat loss (maintain muscle)' },
  { id: 'general_fitness', label: 'General fitness' },
]

const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'bands']
const SPLITS: { id: PreferredSplit; label: string }[] = [
  { id: 'auto', label: 'Auto (recommended)' },
  { id: 'push_pull_legs', label: 'Push / Pull / Legs' },
  { id: 'upper_lower', label: 'Upper / Lower' },
  { id: 'full_body', label: 'Full body' },
]

export default function GymOnboarding() {
  const { saveProfile, chooseFirstSession, profile, onboardingComplete } = useGymData()
  const { declareFact, setEnabledSpecialists } = useIdentity()
  const needsFirstChoice = Boolean(profile?.complete) && !profile?.firstSessionChoiceComplete && !onboardingComplete
  const [step, setStep] = useState(needsFirstChoice ? 4 : 0)
  const [form, setForm] = useState<GymProfile>(profile ?? createDefaultGymProfile())
  const [ack, setAck] = useState<string | null>(null)

  const update = (patch: Partial<GymProfile>) => setForm(prev => ({ ...prev, ...patch }))

  const finishProfile = async () => {
    const next = { ...form, complete: true }
    saveProfile(next)
    try {
      const { declareInputsFromGymProfile } = await import('@/lib/specialists/gym/gymIdentityBootstrap')
      for (const input of declareInputsFromGymProfile(next)) {
        await declareFact(input)
      }
      await setEnabledSpecialists(['gym'])
    } catch {
      // Identity sync is best-effort; GymProfile remains planner source of truth.
    }
    setStep(4)
  }

  const pickStart = (intent: FirstSessionIntent) => {
    chooseFirstSession(intent, 'First training session')
    if (intent === 'tomorrow') {
      setAck('No problem — we\'ll start tomorrow. Today stays Not Started. Your first logged workout will become the baseline for all future recommendations.')
    } else {
      setAck('Great — you can approve and start today\'s workout when ready. Until you complete it, nothing will count toward volume or progression.')
    }
  }

  if (ack) {
    return (
      <GymCard className="p-5 sm:p-6 max-w-xl mx-auto">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80 mb-1">Gym setup</p>
        <h2 className="text-lg font-semibold text-zinc-900">You&apos;re set</h2>
        <p className="text-sm text-zinc-600 mt-3 leading-relaxed">{ack}</p>
        <p className="text-xs text-zinc-400 mt-4">FounderOS only records what you actually log — we never invent completed sets.</p>
      </GymCard>
    )
  }

  return (
    <GymCard className="p-5 sm:p-6 max-w-xl mx-auto">
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80 mb-1">Gym setup</p>
      <h2 className="text-lg font-semibold text-zinc-900">
        {step === 4 ? 'When do you start?' : 'Build your training profile'}
      </h2>
      <p className="text-xs text-zinc-500 mt-1 mb-4">
        {step === 4
          ? 'No fabricated history. Choose when your first real session begins.'
          : 'Required for personalised workouts. We do not invent completed workouts or prescribe through pain.'}
      </p>

      {step === 0 && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-zinc-600">Primary goal</label>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map(g => (
              <button key={g.id} type="button" onClick={() => update({ primaryGoal: g.id })}
                className={`text-sm px-3 py-2 rounded-lg border ${form.primaryGoal === g.id ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200'}`}>
                {g.label}
              </button>
            ))}
          </div>
          <label className="text-xs font-medium text-zinc-600 block mt-2">Experience</label>
          <select value={form.experience} onChange={e => update({ experience: e.target.value as ExperienceLevel })}
            className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500">Age</label>
              <input type="number" value={form.age ?? ''} onChange={e => update({ age: Number(e.target.value) || undefined })}
                className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Weight (kg)</label>
              <input type="number" value={form.weightKg ?? ''} onChange={e => update({ weightKg: Number(e.target.value) || undefined })}
                className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2 mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Height (cm)</label>
            <input type="number" value={form.heightCm ?? ''} onChange={e => update({ heightCm: Number(e.target.value) || undefined })}
              className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500">Days per week</label>
              <input type="number" min={1} max={7} value={form.trainingDaysPerWeek}
                onChange={e => update({ trainingDaysPerWeek: Number(e.target.value) })}
                className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Session length (min)</label>
              <input type="number" min={15} max={180} value={form.sessionDurationMinutes}
                onChange={e => update({ sessionDurationMinutes: Number(e.target.value) })}
                className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2 mt-1" />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-zinc-600">Available equipment</label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map(eq => (
              <button key={eq} type="button"
                onClick={() => update({
                  equipment: form.equipment.includes(eq)
                    ? form.equipment.filter(e => e !== eq)
                    : [...form.equipment, eq],
                })}
                className={`text-xs px-2 py-1 rounded-full border capitalize ${form.equipment.includes(eq) ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200'}`}>
                {eq}
              </button>
            ))}
          </div>
          <label className="text-xs font-medium text-zinc-600 block">Preferred split</label>
          <select value={form.preferredSplit} onChange={e => update({ preferredSplit: e.target.value as PreferredSplit })}
            className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2">
            {SPLITS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div>
            <label className="text-xs text-zinc-500">Smallest plate/dumbbell increment (kg)</label>
            <input type="number" step={0.5} value={form.smallestLoadIncrementKg}
              onChange={e => update({ smallestLoadIncrementKg: Number(e.target.value) || 2.5 })}
              className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2 mt-1" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500">Injuries or pain limitations (optional)</label>
            <textarea value={form.injuryLimitations.join(', ')}
              onChange={e => update({ injuryLimitations: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. left knee, lower back"
              className="w-full text-sm rounded-lg border border-zinc-200 px-3 py-2 mt-1 min-h-[60px]" />
          </div>
          <label className="text-xs font-medium text-zinc-600">Effort tracking</label>
          <div className="flex gap-2">
            {(['rpe', 'rir', 'simple'] as TrackingMode[]).map(mode => (
              <button key={mode} type="button" onClick={() => update({ trackingMode: mode })}
                className={`text-xs px-3 py-1.5 rounded-lg border uppercase ${form.trackingMode === mode ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200'}`}>
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600 leading-relaxed">
            Do you want to train <span className="font-medium text-zinc-900">today</span> or schedule your first session for{' '}
            <span className="font-medium text-zinc-900">tomorrow</span>?
          </p>
          <button type="button" onClick={() => pickStart('today')}
            className="w-full text-left text-sm px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-50">
            <span className="font-semibold text-zinc-900">Start today</span>
            <span className="block text-xs text-zinc-500 mt-0.5">Approve and log sets when you train. Incomplete plans do not count.</span>
          </button>
          <button type="button" onClick={() => pickStart('tomorrow')}
            className="w-full text-left text-sm px-4 py-3 rounded-xl border border-zinc-200 hover:bg-zinc-50">
            <span className="font-semibold text-zinc-900">Start tomorrow</span>
            <span className="block text-xs text-zinc-500 mt-0.5">Today stays Not Started. A Planned workout is created for tomorrow.</span>
          </button>
        </div>
      )}

      {step < 4 && (
        <div className="flex justify-between mt-6">
          <button type="button" disabled={step === 0} onClick={() => setStep(s => s - 1)}
            className="text-sm text-zinc-500 disabled:opacity-40">Back</button>
          {step < 3 ? (
            <button type="button" onClick={() => setStep(s => s + 1)}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white">Continue</button>
          ) : (
            <button type="button" onClick={() => { void finishProfile() }}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white">Continue</button>
          )}
        </div>
      )}
      {step < 4 && <p className="text-[10px] text-zinc-400 mt-3 text-center">Step {step + 1} of 5</p>}
    </GymCard>
  )
}
