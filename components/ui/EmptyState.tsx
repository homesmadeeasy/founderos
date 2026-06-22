import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
        <Icon size={18} className="text-zinc-300" />
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-700">{title}</p>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm leading-relaxed">{description}</p>
      </div>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
