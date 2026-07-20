'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const LEVELS = [
  { code: 'A2', name: 'Elementary', description: 'I know basic words and phrases' },
  { code: 'B1', name: 'Pre-Intermediate', description: 'I can handle simple conversations' },
  { code: 'B2', name: 'Intermediate', description: 'I can discuss most topics with confidence' },
  { code: 'C1', name: 'Advanced', description: 'I communicate fluently but want to sharpen IT vocabulary' },
]

const IS_LOCAL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1')
  || process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')

type AuthMode = 'login' | 'signup' | 'forgot'
type SignupStep = 'account' | 'level'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [signupStep, setSignupStep] = useState<SignupStep>('account')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
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
    setSignupStep('account')
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

  function continueSignup(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || password.length < 8) {
      setError('Enter your name, a valid email, and a password of at least 8 characters.')
      return
    }

    setSignupStep('level')
  }

  async function handleSignup() {
    if (!selectedLevel) return

    setLoading(true)
    setError('')
    setNotice('')

    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          level_code: selectedLevel,
        },
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setNotice('Account created. Check your email to confirm it, then sign in.')
      setMode('login')
      setSignupStep('account')
      setPassword('')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading your profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      <div className="hidden lg:flex w-2/5 bg-indigo-600 flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <span className="text-white font-mono text-lg font-bold">{'</>'}</span>
          <span className="text-indigo-200 font-mono text-sm">English Code</span>
        </div>
        <div>
          <h2 className="text-white text-3xl font-bold leading-snug mb-4">
            Real English for<br />real tech work.
          </h2>
          <p className="text-indigo-200 text-sm leading-relaxed">
            Learn the vocabulary, expressions, and conversation skills you actually use in standups, code reviews, bug reports, and technical interviews.
          </p>
          <div className="mt-10 space-y-3">
            {['Bug reports & tickets', 'Code review conversations', 'Technical interviews', 'Daily standups'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                <span className="text-indigo-100 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-indigo-300 text-xs">Built for QA engineers & developers</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-indigo-600 font-mono text-lg font-bold">{'</>'}</span>
            <span className="text-gray-400 font-mono text-sm">English Code</span>
          </div>

          {mode === 'signup' && signupStep === 'level' ? (
            <>
              <button
                onClick={() => { setSignupStep('account'); setError('') }}
                className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Where do you start?</h1>
                <p className="mt-1 text-sm text-gray-500">Pick the level that matches where you are right now.</p>
              </div>

              <div className="space-y-2">
                {LEVELS.map(level => (
                  <button
                    key={level.code}
                    type="button"
                    onClick={() => setSelectedLevel(level.code)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                      selectedLevel === level.code
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-bold w-6 ${
                        selectedLevel === level.code ? 'text-indigo-600' : 'text-gray-400'
                      }`}>
                        {level.code}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{level.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{level.description}</div>
                      </div>
                    </div>
                  </button>
                ))}

                {error && <p className="text-sm text-red-500 pt-2" role="alert">{error}</p>}

                <button
                  onClick={handleSignup}
                  disabled={!selectedLevel || loading}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors"
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">
                  {mode === 'login'
                    ? 'Welcome back'
                    : mode === 'forgot'
                      ? 'Reset your password'
                      : 'Create your account'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {mode === 'login'
                    ? 'Sign in to continue your learning path.'
                    : mode === 'forgot'
                      ? 'Enter your email and we will send you a recovery link.'
                      : 'Save your progress and continue anytime.'}
                </p>
              </div>

              <form
                onSubmit={mode === 'login' ? handleLogin : mode === 'forgot' ? handleForgotPassword : continueSignup}
                className="space-y-4"
              >
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-gray-600 mb-1.5">Name</label>
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Your name"
                      value={name}
                      onChange={event => setName(event.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      autoFocus
                    />
                  </div>
                )}

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

                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-1.5">
                      <label htmlFor="password" className="block text-xs font-semibold text-gray-600">Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      id="password"
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'}
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
                  disabled={loading || !email.trim() || (mode !== 'forgot' && !password) || (mode === 'signup' && !name.trim())}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors"
                >
                  {loading
                    ? 'Please wait...'
                    : mode === 'login'
                      ? 'Sign in'
                      : mode === 'forgot'
                        ? 'Send reset link'
                        : 'Continue'}
                </button>
              </form>

              <p className="text-sm text-gray-500 text-center mt-6">
                {mode === 'login'
                  ? "Don't have an account?"
                  : mode === 'forgot'
                    ? 'Remembered your password?'
                    : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  {mode === 'login' ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
