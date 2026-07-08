'use client'

import { Activity } from 'lucide-react'
import { useCommandCenter } from '@/contexts/CommandCenterContext'
import CardShell from './CardShell'

const inputClass =
  'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10'

export default function HealthSnapshotCard() {
  const { todayLog, upsertTodayLog } = useCommandCenter()
  const log = todayLog

  function num(field: 'sleepHours' | 'weight' | 'proteinGrams' | 'waterLitres', value: string) {
    const parsed = value === '' ? null : Number(value)
    upsertTodayLog({ [field]: Number.isFinite(parsed) ? parsed : null })
  }

  return (
    <CardShell title="Health Snapshot" icon={Activity}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sleep (hours)">
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            value={log?.sleepHours ?? ''}
            onChange={e => num('sleepHours', e.target.value)}
            className={inputClass}
            placeholder="7.5"
          />
        </Field>
        <Field label="Weight (kg)">
          <input
            type="number"
            step="0.1"
            min="0"
            value={log?.weight ?? ''}
            onChange={e => num('weight', e.target.value)}
            className={inputClass}
            placeholder="—"
          />
        </Field>
        <Field label="Protein (g)">
          <input
            type="number"
            step="1"
            min="0"
            value={log?.proteinGrams ?? ''}
            onChange={e => num('proteinGrams', e.target.value)}
            className={inputClass}
            placeholder="150"
          />
        </Field>
        <Field label="Water (L)">
          <input
            type="number"
            step="0.1"
            min="0"
            value={log?.waterLitres ?? ''}
            onChange={e => num('waterLitres', e.target.value)}
            className={inputClass}
            placeholder="2.5"
          />
        </Field>
      </div>

      <label className="mt-4 flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={log?.workoutCompleted ?? false}
          onChange={e => upsertTodayLog({ workoutCompleted: e.target.checked })}
          className="w-4 h-4 rounded border-zinc-300"
        />
        <span className="text-sm text-zinc-700">Workout completed</span>
      </label>

      <div className="mt-3 space-y-2">
        <input
          value={log?.mood ?? ''}
          onChange={e => upsertTodayLog({ mood: e.target.value })}
          placeholder="Mood (optional)"
          className={inputClass}
        />
        <textarea
          value={log?.reflection ?? ''}
          onChange={e => upsertTodayLog({ reflection: e.target.value })}
          placeholder="Quick reflection (optional)"
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>
    </CardShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
