type Variant =
  | 'active' | 'paused' | 'completed' | 'archived'
  | 'todo' | 'in_progress' | 'done'
  | 'low' | 'medium' | 'high' | 'critical'
  | 'open' | 'mitigated' | 'closed'
  | 'planned'

const styles: Record<string, string> = {
  // project status
  active:    'bg-emerald-50 text-emerald-700',
  paused:    'bg-yellow-50  text-yellow-700',
  completed: 'bg-blue-50    text-blue-700',
  archived:  'bg-zinc-100   text-zinc-500',
  // task status
  todo:        'bg-zinc-100  text-zinc-600',
  in_progress: 'bg-blue-50   text-blue-700',
  done:        'bg-emerald-50 text-emerald-700',
  // priority
  low:      'bg-zinc-100   text-zinc-500',
  medium:   'bg-yellow-50  text-yellow-700',
  high:     'bg-orange-50  text-orange-700',
  critical: 'bg-red-50     text-red-700',
  // risk status
  open:      'bg-red-50     text-red-600',
  mitigated: 'bg-yellow-50  text-yellow-700',
  closed:    'bg-emerald-50 text-emerald-700',
  // roadmap
  planned: 'bg-zinc-100 text-zinc-600',
}

const labels: Record<string, string> = {
  in_progress: 'In Progress',
}

interface Props {
  status: Variant | string
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const style = styles[status] ?? 'bg-zinc-100 text-zinc-600'
  const label = labels[status] ?? status.replace(/_/g, ' ')
  const padding = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center font-medium rounded-full capitalize ${padding} ${style}`}>
      {label}
    </span>
  )
}
