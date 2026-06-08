'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const LEVELS = [
  { code: 'A1', name: 'Beginner', description: 'I know very little English' },
  { code: 'A2', name: 'Elementary', description: 'I know basic words and phrases' },
  { code: 'B1', name: 'Pre-Intermediate', description: 'I can handle simple conversations' },
  { code: 'B2', name: 'Intermediate', description: 'I can discuss most topics with confidence' },
  { code: 'C1', name: 'Advanced', description: 'I communicate fluently but want to sharpen IT vocabulary' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<'name' | 'level'>('name')
  const [name, setName] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (userId) router.replace('/dashboard')
    else setChecking(false)
  }, [router])

  async function handleStart() {
    if (!name.trim() || !selectedLevel) return
    setLoading(true)

    const { data: level } = await supabase
      .from('levels')
      .select('id')
      .eq('code', selectedLevel)
      .single()

    const { data: user, error } = await supabase
      .from('users')
      .insert({ full_name: name.trim(), level_id: level?.id })
      .select()
      .single()

    if (!error && user) {
      localStorage.setItem('user_id', user.id)
      router.push('/dashboard')
    }

    setLoading(false)
  }

  if (checking) return null

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-2/5 bg-indigo-600 flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <span className="text-white font-mono text-lg font-bold">{'</>'}</span>
          <span className="text-indigo-200 font-mono text-sm">English for IT</span>
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

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-indigo-600 font-mono text-lg font-bold">{'</>'}</span>
            <span className="text-gray-400 font-mono text-sm">English for IT</span>
          </div>

          <div className="mb-8">
            {step === 'level' && (
              <button
                onClick={() => setStep('name')}
                className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 'name' ? "What's your name?" : 'Where do you start?'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {step === 'name'
                ? 'We\'ll personalize your experience.'
                : 'Pick the level that matches where you are right now.'}
            </p>
          </div>

          {step === 'name' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('level')}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                autoFocus
              />
              <button
                onClick={() => setStep('level')}
                disabled={!name.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 'level' && (
            <div className="space-y-2">
              {LEVELS.map(level => (
                <button
                  key={level.code}
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

              <button
                onClick={handleStart}
                disabled={!selectedLevel || loading}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors"
              >
                {loading ? 'Setting up...' : "Start learning"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
