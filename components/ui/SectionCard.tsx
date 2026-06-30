import type { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  icon?: LucideIcon
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/** White card section wrapper used across dashboard and detail pages. */
export default function SectionCard({
  title, icon: Icon, description, action, children, className = '',
}: Props) {
  return (
    <div className={`bg-white rounded-xl border border-zinc-100 overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon size={14} className="text-zinc-400" />}
            <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          </div>
          {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
