'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const IS_LOCAL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1')
  || process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')

type AuthMode = 'login' | 'forgot'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      if (session) {
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle()

        if (cancelled) return
        if (profile) {
          router.replace('/dashboard')
          return
        }

        await supabase.auth.signOut()
      }

      setChecking(false)
    }

    checkSession()
    return () => { cancelled = true }
  }, [router])

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setNotice('')
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (loginError) {
      const isInvalidCredentials = loginError.code === 'invalid_credentials'
        || loginError.message.toLowerCase().includes('invalid login credentials')

      if (isInvalidCredentials) {
        setError('Incorrect email or password.')
      } else if (loginError.status === 429) {
        setError('Too many sign-in attempts. Wait a moment and try again.')
      } else {
        setError('We could not connect to the authentication service. Please try again.')
        console.error('Supabase sign-in error:', loginError)
      }
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  async function handleForgotPassword(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')
    setNotice('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setNotice(
      IS_LOCAL_SUPABASE
        ? 'Recovery email created. Open the local inbox to continue.'
        : 'If an account exists for this email, you will receive a password reset link.'
    )
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="learning-theme min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading your profile...</div>
      </div>
    )
  }

  return (
    <div className="learning-theme min-h-screen bg-white flex">
      <div className="hidden lg:flex w-2/5 flex-col justify-between border-r border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-12 text-white">
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-[#41c300]">{'</>'}</span>
          <span className="font-mono text-sm text-slate-300">English Code</span>
        </div>
        <div>
          <h2 className="text-white text-3xl font-bold leading-snug mb-4">
            Real English for<br />real tech work.
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Learn the vocabulary, expressions, and conversation skills you actually use in standups, code reviews, bug reports, and technical interviews.
          </p>
          <div className="mt-10 space-y-3">
            {['Bug reports & tickets', 'Code review conversations', 'Technical interviews', 'Daily standups'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                <span className="text-sm text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400">Built for QA engineers & developers</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="font-mono text-lg font-bold text-[#41c300]">{'</>'}</span>
            <span className="text-gray-400 font-mono text-sm">English Code</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? 'Welcome back' : 'Reset your password'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {mode === 'login'
                ? 'Sign in to continue your learning path.'
                : 'Enter your email and we will send you a recovery link.'}
            </p>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleForgotPassword} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                autoFocus={mode === 'login'}
              />
            </div>

            {mode === 'login' && (
              <div>
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-600">Password</label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
            {notice && <p className="text-sm text-green-600" role="status">{notice}</p>}
            {mode === 'forgot' && notice && IS_LOCAL_SUPABASE && (
              <a
                href="http://127.0.0.1:54324"
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Open local email inbox →
              </a>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || (mode === 'login' && !password)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Send reset link'}
            </button>
          </form>

          {mode === 'forgot' && (
            <p className="text-sm text-gray-500 text-center mt-6">
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
