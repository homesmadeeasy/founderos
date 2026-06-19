import { Suspense } from 'react'
import type { Metadata } from 'next'
import AuthForm from '@/components/auth/AuthForm'

export const metadata: Metadata = { title: 'Log in' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold tracking-tight text-zinc-900">FounderOS</h1>
          <p className="text-sm text-zinc-500 mt-1">Welcome back. Log in to continue.</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <Suspense fallback={<div className="h-64" />}>
            <AuthForm mode="login" />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
