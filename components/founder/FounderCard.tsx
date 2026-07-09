'use client'

import type { ReactNode } from 'react'

interface FounderCardProps {
  children: ReactNode
  className?: string
  delay?: number
}

export default function FounderCard({ children, className = '', delay = 0 }: FounderCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/90 bg-white/55 backdrop-blur-2xl shadow-[0_2px_16px_rgba(99,102,241,0.05),0_1px_4px_rgba(15,15,20,0.03)] transition-all duration-300 hover:shadow-[0_4px_24px_rgba(99,102,241,0.08)] animate-fade-in-up h-full ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
