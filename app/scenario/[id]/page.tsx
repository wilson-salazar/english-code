'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ImmersionPhase from '@/components/phases/ImmersionPhase'
import ListeningPhase from '@/components/phases/ListeningPhase'
import ComprehensionPhase from '@/components/phases/ComprehensionPhase'
import SpeakingPhase from '@/components/phases/SpeakingPhase'
import ExpressionPhase from '@/components/phases/ExpressionPhase'

interface Scenario {
  id: string
  title: string
  context: string
}

interface Phase {
  id: string
  phase_type: 'immersion' | 'listening' | 'comprehension' | 'speaking' | 'expression'
  content: Record<string, unknown>
  order_index: number
}

interface VocabWord {
  id: string
  word: string
  definition: string
  example_sentence: string
}

export default function ScenarioPage() {
  const router = useRouter()
  const params = useParams()
  const scenarioId = params.id as string

  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [vocabulary, setVocabulary] = useState<VocabWord[]>([])
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const loadScenario = useCallback(async (sid: string, uid: string) => {
    try {
    const [{ data: scenarioData, error: scenarioError }, { data: phasesData, error: phasesError }, { data: vocabData }, { data: progressData }] =
      await Promise.all([
        supabase.from('scenarios').select('id, title, context').eq('id', sid).single(),
        supabase.from('scenario_phases').select('id, phase_type, content, order_index').eq('scenario_id', sid).order('order_index'),
        supabase.from('vocabulary').select('id, word, definition, example_sentence, phonetic').eq('scenario_id', sid).order('order_index'),
        supabase.from('user_progress').select('status').eq('user_id', uid).eq('scenario_id', sid).single(),
      ])

    if (scenarioError || !scenarioData) { setLoading(false); router.replace('/dashboard'); return }
    if (phasesError) throw phasesError

    setScenario(scenarioData)
    setPhases((phasesData ?? []) as Phase[])
    setVocabulary(vocabData ?? [])

    // If already completed start from expression phase so they can review
    if (progressData?.status === 'completed') {
      setCurrentPhaseIndex((phasesData?.length ?? 1) - 1)
    }

    // Mark as in_progress if not already tracked
    if (!progressData) {
      await supabase.from('user_progress').upsert({
        user_id: uid,
        scenario_id: sid,
        status: 'in_progress',
      }, { onConflict: 'user_id,scenario_id' })
    }

    setLoading(false)
    } catch (err) {
      console.error('loadScenario failed:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    let cancelled = false

    async function initializeScenario() {
      // In Next.js App Router, params may not be ready on first render.
      const resolvedId = scenarioId || window.location.pathname.split('/').pop()
      if (!resolvedId) return

      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        if (!cancelled) router.replace('/')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()

      if (cancelled) return
      if (!profile) {
        await supabase.auth.signOut()
        router.replace('/')
        return
      }

      setUserId(profile.id)
      await loadScenario(resolvedId, profile.id)
    }

    void initializeScenario()
    return () => { cancelled = true }
  }, [loadScenario, router, scenarioId])

  async function handlePhaseComplete() {
    const isLast = currentPhaseIndex === phases.length - 1
    if (isLast) {
      router.push('/dashboard')
    } else {
      setCurrentPhaseIndex(i => i + 1)
    }
  }

  if (loading) {
    return (
      <div className="learning-theme min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading scenario...</p>
      </div>
    )
  }

  if (!scenario || phases.length === 0) {
    return (
      <div className="learning-theme min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-sm">Could not load this scenario.</p>
        <button onClick={() => router.push('/dashboard')} className="text-indigo-600 text-sm underline">
          Back to dashboard
        </button>
      </div>
    )
  }

  const currentPhase = phases[currentPhaseIndex]
  const progress = ((currentPhaseIndex) / phases.length) * 100

  return (
    <div className="learning-theme min-h-screen bg-slate-950 text-slate-100 [&_.bg-white]:!bg-white/5 [&_.bg-gray-50]:!bg-white/5 [&_.bg-gray-100]:!bg-white/10 [&_.bg-indigo-50]:!bg-indigo-400/10 [&_.bg-indigo-100]:!bg-indigo-400/15 [&_.bg-teal-50]:!bg-cyan-400/10 [&_.bg-orange-50]:!bg-amber-400/10 [&_.bg-orange-100]:!bg-amber-400/15 [&_.text-gray-900]:!text-slate-100 [&_.text-gray-800]:!text-slate-100 [&_.text-gray-700]:!text-slate-200 [&_.text-gray-600]:!text-slate-300 [&_.text-gray-500]:!text-slate-400 [&_.text-gray-400]:!text-slate-400 [&_.text-gray-300]:!text-slate-500 [&_.border-gray-50]:!border-white/10 [&_.border-gray-100]:!border-white/10 [&_.border-gray-200]:!border-white/10 [&_.border-indigo-100]:!border-indigo-400/25 [&_.border-teal-50]:!border-cyan-300/15 [&_.border-teal-100]:!border-cyan-300/20 [&_.border-orange-100]:!border-amber-300/20 [&_input]:!bg-white/5 [&_textarea]:!bg-white/5">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/90 px-6 py-4 backdrop-blur">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (currentPhaseIndex === 0) {
                router.push('/dashboard')
              } else {
                setCurrentPhaseIndex(i => i - 1)
              }
            }}
            className="flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white"
          >
            {currentPhaseIndex === 0 ? '← Dashboard' : '← Back'}
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-100">{scenario.title}</div>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              {currentPhase.phase_type === 'immersion' && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-400">
                  <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>
                  <path fillRule="evenodd" d="M1.38 8a6.585 6.585 0 0 1 1.56-2.724A6.5 6.5 0 0 1 8 3.5a6.5 6.5 0 0 1 5.06 1.776A6.585 6.585 0 0 1 14.62 8a6.585 6.585 0 0 1-1.56 2.724A6.5 6.5 0 0 1 8 12.5a6.5 6.5 0 0 1-5.06-1.776A6.585 6.585 0 0 1 1.38 8Z" clipRule="evenodd"/>
                </svg>
              )}
              {currentPhase.phase_type === 'listening' && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-400">
                  <path d="M7.557 2.066A.75.75 0 0 1 8 2.75v10.5a.75.75 0 0 1-1.248.56L3.59 11H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.59l3.162-2.81a.75.75 0 0 1 .805-.124ZM12.95 3.05a.75.75 0 1 0-1.06 1.06 5.5 5.5 0 0 1 0 7.78.75.75 0 1 0 1.06 1.06 7 7 0 0 0 0-9.9ZM10.828 5.172a.75.75 0 1 0-1.06 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 1 0 1.06 1.06 4 4 0 0 0 0-5.656Z"/>
                </svg>
              )}
              {currentPhase.phase_type === 'comprehension' && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-400">
                  <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd"/>
                </svg>
              )}
              {currentPhase.phase_type === 'speaking' && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-400">
                  <path d="M4 6a4 4 0 1 1 8 0v3a4 4 0 0 1-8 0V6ZM1.5 9.482a.75.75 0 0 1 .75.75 5.75 5.75 0 0 0 11.5 0 .75.75 0 0 1 1.5 0 7.25 7.25 0 0 1-6.5 7.21V14.5h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-7.257A7.251 7.251 0 0 1 .75 10.232a.75.75 0 0 1 .75-.75Z"/>
                </svg>
              )}
              {currentPhase.phase_type === 'expression' && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-400">
                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM4.75 3.5A2.25 2.25 0 0 0 2.5 5.75v5.5A2.25 2.25 0 0 0 4.75 13.5h5.5a2.25 2.25 0 0 0 2.25-2.25v-2a.75.75 0 0 0-1.5 0v2a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75v-5.5a.75.75 0 0 1 .75-.75h2a.75.75 0 0 0 0-1.5h-2Z"/>
                </svg>
              )}
              <span className="text-xs capitalize text-slate-400">{currentPhase.phase_type}</span>
            </div>
          </div>
          <div className="font-mono text-xs text-slate-400">
            {currentPhaseIndex + 1} / {phases.length}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mx-auto mt-3 h-1 max-w-2xl overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Phase content */}
      <main className="max-w-2xl mx-auto px-6 py-10">
        {currentPhase.phase_type === 'immersion' && (
          <ImmersionPhase
            content={currentPhase.content}
            vocabulary={vocabulary}
            onComplete={handlePhaseComplete}
          />
        )}
        {currentPhase.phase_type === 'listening' && (
          <ListeningPhase
            content={currentPhase.content}
            onComplete={handlePhaseComplete}
          />
        )}
        {currentPhase.phase_type === 'comprehension' && (
          <ComprehensionPhase
            content={currentPhase.content}
            onComplete={handlePhaseComplete}
          />
        )}
        {currentPhase.phase_type === 'speaking' && (
          <SpeakingPhase
            content={currentPhase.content}
            scenarioTitle={scenario.title}
            onComplete={handlePhaseComplete}
          />
        )}
        {currentPhase.phase_type === 'expression' && (
          <ExpressionPhase
            content={currentPhase.content}
            scenarioTitle={scenario.title}
            phaseId={currentPhase.id}
            userId={userId!}
            scenarioId={scenarioId}
            onComplete={handlePhaseComplete}
          />
        )}
      </main>
    </div>
  )
}
