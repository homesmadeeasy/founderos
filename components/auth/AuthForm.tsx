'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

const inputCls = 'w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors'

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const search = useSearchParams()
  const redirectTo = search.get('redirect') || '/home'

  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  const isSignup = mode === 'signup'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        // If email confirmation is ON, there's no session yet.
        if (!data.session) {
          setCheckEmail(true)
          setLoading(false)
          return
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-6">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
          <Mail size={22} className="text-emerald-600" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-800">Check your email</h2>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-xs">
          We sent a confirmation link to <span className="font-medium text-zinc-700">{email}</span>.
          Click it to activate your account, then come back and log in.
        </p>
        <Link href="/login" className="mt-2 text-xs font-medium text-zinc-700 underline underline-offset-2">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignup && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-600">Full name</label>
          <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Lovelace" autoComplete="name" />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-600">Email</label>
        <input type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-600">Password</label>
        <input type="password" required minLength={6} className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={isSignup ? 'new-password' : 'current-password'} />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
          <p className="text-xs text-red-600 leading-relaxed">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading
          ? (isSignup ? 'Creating account…' : 'Signing in…')
          : (isSignup ? 'Create account' : 'Sign in')}
      </button>

      <p className="text-center text-xs text-zinc-500">
        {isSignup ? 'Already have an account? ' : "Don't have an account? "}
        <Link href={isSignup ? '/login' : '/signup'} className="font-medium text-zinc-800 underline underline-offset-2">
          {isSignup ? 'Log in' : 'Sign up'}
        </Link>
      </p>
    </form>
  )
}
