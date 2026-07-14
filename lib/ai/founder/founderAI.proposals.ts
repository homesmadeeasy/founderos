import { FOUNDER_AI_LIMITS } from './founderAI.config'
import type { FounderProposalBundle } from './founderAI.types'

const STORAGE_KEY = 'founderos-founder-ai-proposals-v1'

interface ProposalStore {
  version: 1
  pending: FounderProposalBundle[]
  resolved: FounderProposalBundle[]
}

function emptyStore(): ProposalStore {
  return { version: 1, pending: [], resolved: [] }
}

export function loadProposalStore(): ProposalStore {
  if (typeof window === 'undefined') return emptyStore()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as ProposalStore
    return {
      version: 1,
      pending: parsed.pending ?? [],
      resolved: (parsed.resolved ?? []).slice(0, FOUNDER_AI_LIMITS.MAX_PROPOSAL_HISTORY),
    }
  } catch {
    return emptyStore()
  }
}

export function saveProposalStore(store: ProposalStore): boolean {
  if (typeof window === 'undefined') return true
  try {
    const compact: ProposalStore = {
      version: 1,
      pending: store.pending.slice(0, FOUNDER_AI_LIMITS.MAX_PROPOSALS_STORED),
      resolved: store.resolved.slice(0, FOUNDER_AI_LIMITS.MAX_PROPOSAL_HISTORY),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compact))
    return true
  } catch (err) {
    const name = (err as { name?: string })?.name ?? ''
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      const minimal: ProposalStore = {
        version: 1,
        pending: store.pending.slice(0, 10),
        resolved: store.resolved.slice(0, 20),
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal))
        return true
      } catch {
        return false
      }
    }
    return false
  }
}

export function upsertProposal(bundle: FounderProposalBundle): ProposalStore {
  const store = loadProposalStore()
  const pending = store.pending.filter((p) => p.id !== bundle.id && p.turnId !== bundle.turnId)
  pending.unshift(bundle)
  const next = { ...store, pending: pending.slice(0, FOUNDER_AI_LIMITS.MAX_PROPOSALS_STORED) }
  saveProposalStore(next)
  return next
}

export function getProposalByTurnId(turnId: string): FounderProposalBundle | null {
  const store = loadProposalStore()
  return store.pending.find((p) => p.turnId === turnId)
    ?? store.resolved.find((p) => p.turnId === turnId)
    ?? null
}

export function getPendingProposals(): FounderProposalBundle[] {
  return loadProposalStore().pending
}

export function resolveProposal(
  proposalId: string,
  status: FounderProposalBundle['status'],
): ProposalStore {
  const store = loadProposalStore()
  const item = store.pending.find((p) => p.id === proposalId)
  if (!item) return store
  const updated: FounderProposalBundle = { ...item, status }
  const pending = store.pending.filter((p) => p.id !== proposalId)
  const resolved = [updated, ...store.resolved.filter((p) => p.id !== proposalId)]
  const next = {
    version: 1 as const,
    pending,
    resolved: resolved.slice(0, FOUNDER_AI_LIMITS.MAX_PROPOSAL_HISTORY),
  }
  saveProposalStore(next)
  return next
}

export function clearPendingProposals(): ProposalStore {
  const store = loadProposalStore()
  const next = { ...store, pending: [] }
  saveProposalStore(next)
  return next
}

export function isProposalDismissed(proposal: FounderProposalBundle): boolean {
  return proposal.status === 'dismissed'
}

export function wasActionDismissed(actionId: string): boolean {
  const store = loadProposalStore()
  return store.resolved.some(
    (p) => p.status === 'dismissed'
      && p.response.suggestedActions.some((a) => a.id === actionId),
  )
}
