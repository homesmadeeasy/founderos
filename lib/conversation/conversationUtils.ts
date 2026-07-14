import { greetingForHour } from '@/lib/command-center/utils'

export function newConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function displayNameFromEmail(email?: string | null): string {
  if (!email) return 'there'
  const local = email.split('@')[0] ?? ''
  const name = local.split(/[._-]/)[0] ?? local
  if (!name) return 'there'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function buildGreeting(hour = new Date().getHours()): string {
  return greetingForHour(hour)
}

export function clampConfidence(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function formatChipAnswer(chip: string): string {
  const map: Record<string, string> = {
    yes: 'Yes',
    no: 'No',
    maybe: 'Maybe',
    later: 'Later',
    'tell me more': 'Tell me more',
    "i don't know": "I don't know",
  }
  return map[chip.toLowerCase()] ?? chip
}

export const REPLY_CHIPS = [
  'Yes',
  'No',
  'Maybe',
  'Later',
  'Tell me more',
  "I don't know",
] as const

export const SUGGESTED_QUESTION_CHIPS = [
  'What should I build next?',
  'Am I overengineering?',
  'What is my bottleneck?',
  'What would YC tell me?',
  'What evidence supports this?',
  'What should I validate first?',
  'What changed?',
] as const

export const QUESTION_CHIPS = SUGGESTED_QUESTION_CHIPS

/** Deterministic 12-hour time — avoids locale hydration mismatch */
export function formatConversationTime(iso: string, _timezone?: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const h12 = hours % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  } catch {
    return ''
  }
}
