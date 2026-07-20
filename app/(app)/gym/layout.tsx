'use client'

import type { ReactNode } from 'react'
import { GymDataProvider } from '@/contexts/GymDataContext'

export default function GymLayout({ children }: { children: ReactNode }) {
  return <GymDataProvider>{children}</GymDataProvider>
}
