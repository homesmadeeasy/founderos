/**
 * Server-only research ingestion architecture.
 * Adapters must not run in the browser; API keys stay server-side.
 */

export interface ResearchSearchResult {
  externalId: string
  title: string
  authors: string[]
  year?: number
  doi?: string
  url?: string
  abstractSnippet?: string
}

export interface ResearchIngestionAdapter {
  id: string
  name: string
  search(query: string, options?: { limit?: number }): Promise<ResearchSearchResult[]>
}

export interface IngestionComparison {
  existingSourceId: string
  candidate: ResearchSearchResult
  similarityScore: number
  recommendation: 'review' | 'ignore' | 'potential_update'
  notes: string
}

export interface ResearchUpdateProposal {
  id: string
  adapterId: string
  candidate: ResearchSearchResult
  status: 'pending_admin_review' | 'approved' | 'rejected'
  createdAt: string
}

/** Crossref adapter stub — requires server-side fetch with polite pool email in production. */
export function createCrossrefAdapter(): ResearchIngestionAdapter {
  return {
    id: 'crossref',
    name: 'Crossref',
    async search(query, options) {
      void query
      void options
      return []
    },
  }
}

/** PubMed adapter stub — requires NCBI API key server-side in production. */
export function createPubMedAdapter(): ResearchIngestionAdapter {
  return {
    id: 'pubmed',
    name: 'PubMed',
    async search(query, options) {
      void query
      void options
      return []
    },
  }
}

export function compareCandidateWithExisting(
  existingTitle: string,
  candidate: ResearchSearchResult,
): IngestionComparison {
  const similarity = candidate.title.toLowerCase().includes(existingTitle.toLowerCase().slice(0, 20))
    ? 0.7
    : 0.2
  return {
    existingSourceId: '',
    candidate,
    similarityScore: similarity,
    recommendation: similarity >= 0.6 ? 'potential_update' : 'ignore',
    notes: 'Automated comparison only — administrator approval required before affecting prescriptions.',
  }
}

export function createResearchUpdateProposal(
  adapterId: string,
  candidate: ResearchSearchResult,
): ResearchUpdateProposal {
  return {
    id: `ingest-${candidate.externalId}`,
    adapterId,
    candidate,
    status: 'pending_admin_review',
    createdAt: new Date().toISOString(),
  }
}
