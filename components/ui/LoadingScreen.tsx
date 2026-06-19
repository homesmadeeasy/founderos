import { Loader2 } from 'lucide-react'

export default function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Loader2 size={22} className="animate-spin text-zinc-400" />
      <p className="text-sm text-zinc-400">{label}</p>
    </div>
  )
}

export function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <p className="text-sm font-semibold text-red-600">Couldn’t load your data</p>
      <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">{message}</p>
    </div>
  )
}
