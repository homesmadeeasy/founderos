'use client'

import { listResearchSources } from '@/lib/specialists/gym/evidence/gymEvidenceRegistry'
import { listEvidenceClaims } from '@/lib/specialists/gym/evidence/gymEvidenceRegistry'
import { isSourceOutdated, citationFromSource } from '@/lib/specialists/gym/evidence/gymEvidenceCitations'
import GymCard from './GymCard'

export default function GymResearchLibrary() {
  const sources = listResearchSources()
  const claims = listEvidenceClaims()

  return (
    <div className="space-y-5">
      <GymCard className="p-4 sm:p-5">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80 mb-2">Approved research library</p>
        <p className="text-sm text-zinc-600 mb-4">
          Metadata and paraphrased claims only — no copyrighted full text. Provisional sources are shown but do not override prescriptions.
        </p>
        <div className="space-y-4">
          {sources.map(source => {
            const outdated = isSourceOutdated(source)
            return (
              <div key={source.id} className="rounded-lg border border-zinc-100 p-3">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-zinc-900">{source.title}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${source.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {source.status}
                  </span>
                  {outdated && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">Review overdue</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">{source.authorsOrOrganisation} · {source.year} · {source.evidenceQuality}</p>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{source.summary}</p>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Reviewed {new Date(source.reviewedAt).toLocaleDateString()}
                  {source.doi ? ` · doi:${source.doi}` : ''}
                  {source.url ? ` · ${source.url}` : ''}
                </p>
              </div>
            )
          })}
        </div>
      </GymCard>

      <GymCard className="p-4 sm:p-5">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-600/80 mb-2">Evidence claims</p>
        <ul className="space-y-2">
          {claims.filter(c => c.status === 'approved').map(claim => (
            <li key={claim.id} className="text-xs text-zinc-600 border-b border-zinc-50 pb-2">
              <span className="font-medium text-zinc-800">{claim.variable}</span> — {claim.claim}
              <span className="text-zinc-400 block mt-0.5">Source: {claim.sourceId}</span>
            </li>
          ))}
        </ul>
      </GymCard>
    </div>
  )
}
