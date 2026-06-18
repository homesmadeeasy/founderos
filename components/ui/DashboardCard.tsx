import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: number | string
  icon: LucideIcon
  href?: string
  trend?: string
}

export default function DashboardCard({ label, value, icon: Icon, href, trend }: Props) {
  const inner = (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col gap-3 hover:border-zinc-300 transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
        <Icon size={15} className="text-zinc-600" />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
        {trend && <p className="text-xs text-zinc-400 mt-1">{trend}</p>}
      </div>
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}
