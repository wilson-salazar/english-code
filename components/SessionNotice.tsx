'use client'

import { FormEvent, useEffect, useState } from 'react'
import { SESSION_PROBLEM_EVENT, SessionProblem } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export default function SessionNotice() {
  const [problem, setProblem] = useState<SessionProblem | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function handleProblem(event: Event) {
      const next = (event as CustomEvent<SessionProblem>).detail
      setProblem(current => (current === 'session_expired' ? current : next))
    }

    window.addEventListener(SESSION_PROBLEM_EVENT, handleProblem)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_IN') {
        setProblem(null)
        setPassword('')
        setError('')
      }
    })

    return () => {
      window.removeEventListener(SESSION_PROBLEM_EVENT, handleProblem)
      subscription.unsubscribe()
    }
  }, [])

  // Signing in here rather than on the login page keeps the current screen mounted, and with it
  // whatever the learner has written.
  async function signIn(event: FormEvent) {
    event.preventDefault()
    setSigningIn(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError) setError('Those details did not work. Please try again.')
    setSigningIn(false)
  }

  if (!problem) return null

  return (
    <div
      role="alert"
      className="fixed top-4 left-4 right-4 z-[60] mx-auto max-w-md bg-white border border-gray-200 rounded-2xl shadow-lg p-4"
    >
      {problem === 'session_unverified' ? (
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-gray-700">We couldn&apos;t verify your session. Please try again.</p>
          <button
            type="button"
            onClick={() => setProblem(null)}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <form onSubmit={signIn} className="space-y-3">
          <p className="text-sm font-medium text-gray-800">
            Your session has expired. Sign in to continue — your work on this page is safe.
          </p>
          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="Email"
            required
            className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Password"
            required
            className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={signingIn}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
          >
            {signingIn ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      )}
    </div>
  )
}
