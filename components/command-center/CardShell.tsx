import type { ReactNode } from 'react'

interface Props {
  title: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  action?: ReactNode
  children: ReactNode
  className?: string
}

export default function CardShell({ title, icon: Icon, action, children, className = '' }: Props) {
  return (
    <section className={`bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden flex flex-col ${className}`}>
      <header className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon size={15} className="text-zinc-400 shrink-0" />}
          <h2 className="text-sm font-semibold text-zinc-900 truncate">{title}</h2>
        </div>
        {action}
      </header>
      <div className="p-5 flex-1">{children}</div>
    </section>
  )
}
