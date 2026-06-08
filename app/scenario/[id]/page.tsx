'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ImmersionPhase from '@/components/phases/ImmersionPhase'
import ComprehensionPhase from '@/components/phases/ComprehensionPhase'
import ExpressionPhase from '@/components/phases/ExpressionPhase'

interface Scenario {
  id: string
  title: string
  context: string
}

interface Phase {
  id: string
  phase_type: 'immersion' | 'comprehension' | 'expression'
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

  useEffect(() => {
    const id = localStorage.getItem('user_id')
    if (!id) { router.replace('/'); return }
    setUserId(id)
    loadScenario(id)
  }, [router, scenarioId])

  async function loadScenario(uid: string) {
    const [{ data: scenarioData }, { data: phasesData }, { data: vocabData }, { data: progressData }] =
      await Promise.all([
        supabase.from('scenarios').select('id, title, context').eq('id', scenarioId).single(),
        supabase.from('scenario_phases').select('id, phase_type, content, order_index').eq('scenario_id', scenarioId).order('order_index'),
        supabase.from('vocabulary').select('id, word, definition, example_sentence').eq('scenario_id', scenarioId).order('order_index'),
        supabase.from('user_progress').select('status').eq('user_id', uid).eq('scenario_id', scenarioId).single(),
      ])

    if (!scenarioData) { router.replace('/dashboard'); return }

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
        scenario_id: scenarioId,
        status: 'in_progress',
      })
    }

    setLoading(false)
  }

  async function handlePhaseComplete() {
    const isLast = currentPhaseIndex === phases.length - 1
    if (isLast) {
      router.push('/dashboard')
    } else {
      setCurrentPhaseIndex(i => i + 1)
    }
  }

  if (loading || !scenario || phases.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading scenario...</p>
      </div>
    )
  }

  const currentPhase = phases[currentPhaseIndex]
  const progress = ((currentPhaseIndex) / phases.length) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
          >
            ← Dashboard
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">{scenario.title}</div>
            <div className="text-xs text-gray-400 mt-0.5 capitalize">{currentPhase.phase_type}</div>
          </div>
          <div className="text-xs text-gray-400 font-mono">
            {currentPhaseIndex + 1} / {phases.length}
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
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
        {currentPhase.phase_type === 'comprehension' && (
          <ComprehensionPhase
            content={currentPhase.content}
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
