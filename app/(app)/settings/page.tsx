export default function SettingsPage() {
  const sections = [
    { label: 'Profile',       desc: 'Name, avatar, and account details' },
    { label: 'Notifications', desc: 'Choose what alerts you receive' },
    { label: 'AI Settings',   desc: 'Model preferences and API keys' },
    { label: 'Danger Zone',   desc: 'Delete account or data' },
  ]

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Manage your account and preferences.</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
        {sections.map(({ label, desc }) => (
          <button
            key={label}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-zinc-800">{label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
            </div>
            <span className="text-zinc-400 text-sm">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
