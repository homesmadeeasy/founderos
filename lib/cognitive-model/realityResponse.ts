import type { RealityChange, RealitySnapshot } from './realityTypes'
import type { RealityClaim } from './realityTypes'

export function buildResponseFromReconciliation(params: {
  idempotent: boolean
  changes: RealityChange[]
  snapshot: RealitySnapshot
  claims: RealityClaim[]
  nextQuestion?: string
}): string {
  if (params.idempotent) {
    return 'I already recorded that — my current view is unchanged. What new detail can you add?'
  }

  const parts: string[] = []
  const hasTesting = params.claims.some(c =>
    c.predicate === 'validation.users_tested' && c.value === true
    || c.predicate === 'validation.tester_count',
  )
  const hasPositioning = params.claims.some(c => c.predicate === 'product.positioning_weak')
  const countClaim = params.claims.find(c => c.predicate === 'validation.tester_count')
  const positiveClaim = params.claims.find(c => c.predicate === 'validation.comprehension_positive')
  const negativeClaim = params.claims.find(c => c.predicate === 'validation.comprehension_negative')

  if (hasTesting) {
    parts.push('That changes my view:')
    if (countClaim) {
      parts.push(`FounderOS has now been tested by ${countClaim.value} people, so validation is no longer absent.`)
    } else {
      parts.push('Real-user testing has been reported, so validation is no longer absent.')
    }
  }

  if (positiveClaim && negativeClaim) {
    parts.push(
      `${positiveClaim.value} understood the intended value, while ${negativeClaim.value} saw it as another productivity dashboard.`,
    )
  } else if (positiveClaim) {
    parts.push(`${positiveClaim.value} tester(s) understood the intended value.`)
  } else if (negativeClaim) {
    parts.push(`${negativeClaim.value} tester(s) interpreted it as a generic productivity dashboard.`)
  }

  if (hasPositioning) {
    parts.push('The main issue now appears to be positioning clarity rather than lack of testing.')
  }

  if (!parts.length && params.changes.length) {
    const top = params.changes[0]!
    parts.push(`Updated: ${top.newStatement}.`)
  }

  if (params.nextQuestion) {
    parts.push(params.nextQuestion)
  } else if (params.snapshot.biggestUnknowns[0]) {
    parts.push(params.snapshot.biggestUnknowns[0]!.statement)
  }

  return parts.join(' ')
}
