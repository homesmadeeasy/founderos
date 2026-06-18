export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Manage your account and preferences.</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
        {[
          { label: 'Profile', desc: 'Name, avatar, and account details' },
          { label: 'Notifications', desc: 'Choose what alerts you receive' },
          { label: 'AI Settings', desc: 'Model preferences and API keys' },
          { label: 'Danger Zone', desc: 'Delete account or data' },
        ].map(({ label, desc }) => (
          <div key={label} className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">{label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
            </div>
            <span className="text-xs text-zinc-400">→</span>
          </div>
        ))}
      </div>
    </div>
  )
}
