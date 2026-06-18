export default function ProjectOverviewPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Status', value: 'Active' },
          { label: 'Open Tasks', value: '0' },
          { label: 'Last Updated', value: 'Today' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-zinc-400">{label}</p>
            <p className="text-lg font-semibold text-zinc-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700">Description</h2>
        <p className="text-sm text-zinc-400 italic">No description yet.</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700">Recent Activity</h2>
        <p className="text-sm text-zinc-400 italic">Nothing here yet.</p>
      </div>
    </div>
  )
}
