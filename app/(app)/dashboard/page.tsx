'use client'

import { CommandCenterProvider } from '@/contexts/CommandCenterContext'
import CommandCenter from '@/components/command-center/CommandCenter'

export default function DashboardPage() {
  return (
    <CommandCenterProvider>
      <CommandCenter />
    </CommandCenterProvider>
  )
}
