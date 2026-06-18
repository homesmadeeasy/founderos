const styles: Record<string, string> = {
  // Project status
  idea:      'bg-purple-50  text-purple-700',
  planning:  'bg-blue-50    text-blue-700',
  building:  'bg-orange-50  text-orange-700',
  testing:   'bg-yellow-50  text-yellow-700',
  launched:  'bg-emerald-50 text-emerald-700',
  paused:    'bg-zinc-100   text-zinc-600',
  archived:  'bg-zinc-100   text-zinc-400',
  // Task status
  todo:        'bg-zinc-100  text-zinc-600',
  in_progress: 'bg-blue-50   text-blue-700',
  done:        'bg-emerald-50 text-emerald-700',
  // Priority
  low:      'bg-zinc-100   text-zinc-500',
  medium:   'bg-yellow-50  text-yellow-700',
  high:     'bg-orange-50  text-orange-700',
  critical: 'bg-red-50     text-red-700',
  // Risk status
  open:      'bg-red-50     text-red-600',
  mitigated: 'bg-yellow-50  text-yellow-700',
  closed:    'bg-emerald-50 text-emerald-700',
  // Roadmap
  planned: 'bg-zinc-100 text-zinc-600',
}

const labels: Record<string, string> = {
  in_progress: 'In Progress',
  todo: 'To Do',
}

interface Props {
  status: string
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const style   = styles[status] ?? 'bg-zinc-100 text-zinc-600'
  const label   = labels[status] ?? status.replace(/_/g, ' ')
  const padding = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center font-medium rounded-full capitalize ${padding} ${style}`}>
      {label}
    </span>
  )
}
