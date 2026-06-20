'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import CommandBar from './CommandBar'

interface CommandBarContextValue {
  open: boolean
  openCommandBar: () => void
  closeCommandBar: () => void
  toggleCommandBar: () => void
}

const CommandBarContext = createContext<CommandBarContextValue | null>(null)

export function useCommandBar(): CommandBarContextValue {
  const ctx = useContext(CommandBarContext)
  if (!ctx) throw new Error('useCommandBar must be used inside <CommandBarProvider>')
  return ctx
}

/** Returns shortcut label for UI (⌘K on Mac, Ctrl+K elsewhere). */
export function commandShortcutLabel(): string {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform)) {
    return '⌘K'
  }
  return 'Ctrl+K'
}

export default function CommandBarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const openCommandBar = useCallback(() => setOpen(true), [])
  const closeCommandBar = useCallback(() => setOpen(false), [])
  const toggleCommandBar = useCallback(() => setOpen(o => !o), [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo(
    () => ({ open, openCommandBar, closeCommandBar, toggleCommandBar }),
    [open, openCommandBar, closeCommandBar, toggleCommandBar],
  )

  return (
    <CommandBarContext.Provider value={value}>
      {children}
      {open && <CommandBar onClose={closeCommandBar} />}
    </CommandBarContext.Provider>
  )
}
