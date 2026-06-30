import { AlertCircle } from 'lucide-react'

interface Props {
  title?: string
  message: string
  onRetry?: () => void
}

/** Consistent inline error panel for pages and sections. */
export default function ErrorState({ title = 'Something went wrong', message, onRetry }: Props) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 flex items-start gap-3">
      <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-800">{title}</p>
        <p className="text-sm text-red-700 mt-1 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-xs font-medium text-red-700 underline hover:text-red-900"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
