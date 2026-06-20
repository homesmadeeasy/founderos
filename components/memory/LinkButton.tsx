'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import CreateLinkModal from './CreateLinkModal'
import type { EntityType } from '@/lib/types'

/** Small icon button that opens the manual link modal for a given source entity. */
export default function LinkButton({ type, id, label }: { type: EntityType; id: string; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Link to another item"
        className="flex items-center justify-center w-6 h-6 text-zinc-300 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
      >
        <Link2 size={11} />
      </button>
      {open && <CreateLinkModal source={{ type, id, label }} onClose={() => setOpen(false)} />}
    </>
  )
}
