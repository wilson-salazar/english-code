'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [checking, setChecking] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    const isRecoveryUrl = window.location.hash.includes('type=recovery')
      || window.location.search.includes('type=recovery')

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || (isRecoveryUrl && session)) {
        setHasRecoverySession(true)
      }
      setChecking(false)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setHasRecoverySession(isRecoveryUrl && Boolean(session))
      setChecking(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleUpdatePassword(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Your password must contain at least 8 characters.')
      return
    }

    if (password !== confirmation) {
      setError('The passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setSuccess(true)
    setLoading(false)
  }

  return (
    <main className="learning-theme min-h-screen bg-yellow-50 flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-indigo-600 font-mono text-lg font-bold">{'</>'}</span>
          <span className="text-gray-400 font-mono text-sm">English Code</span>
        </div>

        {checking ? (
          <p className="text-sm text-gray-500">Checking your recovery link...</p>
        ) : success ? (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Password updated</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Your password was changed successfully. You can now sign in with your new password.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Return to sign in
            </Link>
          </div>
        ) : !hasRecoverySession ? (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invalid or expired link</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Request a new password recovery link from the sign-in page.
            </p>
            <Link href="/" className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              ← Return to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Choose a new password</h1>
              <p className="mt-1 text-sm text-gray-500">Use at least 8 characters.</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-xs font-semibold text-gray-600 mb-1.5">New password</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={event => setConfirmation(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {error && <p className="text-sm text-red-500" role="alert">{error}</p>}

              <button
                type="submit"
                disabled={loading || !password || !confirmation}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {loading ? 'Updating password...' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
