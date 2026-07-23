import type { DeclareFactInput, IdentityFact, IdentityValue, ReviewFactInput } from './identityTypes'

export function validateDeclareFactInput(input: DeclareFactInput): string | null {
  if (!input.category) return 'Category is required.'
  if (!input.key?.trim()) return 'Fact key is required.'
  if (!input.label?.trim()) return 'Label is required.'
  if (input.value === undefined) return 'Value is required.'
  if (!isSupportedValue(input.value)) return 'Unsupported value type.'
  return null
}

export function validateReviewFactInput(input: ReviewFactInput): string | null {
  if (!input.factId?.trim()) return 'Fact id is required.'
  if (!['confirm', 'reject', 'dismiss', 'edit'].includes(input.action)) {
    return 'Invalid review action.'
  }
  if (input.action === 'edit') {
    if (input.editedValue === undefined) return 'Edited value is required.'
    if (!isSupportedValue(input.editedValue)) return 'Unsupported edited value.'
  }
  return null
}

export function assertConfidenceRange(confidence: number): string | null {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return 'Confidence must be between 0 and 1.'
  }
  return null
}

export function isActiveFact(fact: IdentityFact): boolean {
  return fact.status === 'active'
}

function isSupportedValue(value: IdentityValue): boolean {
  if (value === null) return true
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return true
  if (Array.isArray(value)) return value.every(v => typeof v === 'string')
  if (t === 'object') return true
  return false
}
