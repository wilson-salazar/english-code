'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ExplanationPhase from '@/components/phases/ExplanationPhase'
import ImmersionPhase from '@/components/phases/ImmersionPhase'
import ComprehensionPhase from '@/components/phases/ComprehensionPhase'
import PracticePhase from '@/components/phases/PracticePhase'
import ChapterExpressionPhase from '@/components/phases/ChapterExpressionPhase'

interface Chapter {
  id: string
  title: string
  description: string
}

interface Phase {
  id: string
  phase_type: 'explanation' | 'immersion' | 'comprehension' | 'practice' | 'expression'
  content: Record<string, unknown>
  order_index: number
}

export default function ChapterPage() {
  const router = useRouter()
  const params = useParams()
  const chapterId = params.id as string

  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const loadChapter = useCallback(async (cid: string, uid: string) => {
    try {
      const [{ data: chapterData, error: chapterError }, { data: phasesData, error: phasesError }, { data: progressData }] =
        await Promise.all([
          supabase.from('chapters').select('id, title, description').eq('id', cid).single(),
          supabase.from('chapter_phases').select('id, phase_type, content, order_index').eq('chapter_id', cid).order('order_index'),
          supabase.from('user_chapter_progress').select('status').eq('user_id', uid).eq('chapter_id', cid).single(),
        ])

      if (chapterError || !chapterData) { setLoading(false); router.replace('/dashboard'); return }
      if (phasesError) throw phasesError

      setChapter(chapterData)
      setPhases((phasesData ?? []) as Phase[])

      // If already completed start from the expression phase so they can review
      if (progressData?.status === 'completed') {
        setCurrentPhaseIndex((phasesData?.length ?? 1) - 1)
      }

      // Mark as in_progress if not already tracked
      if (!progressData) {
        await supabase.from('user_chapter_progress').upsert({
          user_id: uid,
          chapter_id: cid,
          status: 'in_progress',
        }, { onConflict: 'user_id,chapter_id' })
      }

      setLoading(false)
    } catch (err) {
      console.error('loadChapter failed:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    let cancelled = false

    async function initializeChapter() {
      const resolvedId = chapterId || window.location.pathname.split('/').pop()
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
      await loadChapter(resolvedId, profile.id)
    }

    void initializeChapter()
    return () => { cancelled = true }
  }, [loadChapter, router, chapterId])

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
        <p className="text-slate-400 text-sm">Loading chapter...</p>
      </div>
    )
  }

  if (!chapter || phases.length === 0) {
    return (
      <div className="learning-theme min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-sm">Could not load this chapter.</p>
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
            <div className="text-sm font-semibold text-slate-100">{chapter.title}</div>
            <div className="flex items-center justify-center gap-1 mt-0.5">
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
        {currentPhase.phase_type === 'explanation' && (
          <ExplanationPhase
            content={currentPhase.content}
            onComplete={handlePhaseComplete}
          />
        )}
        {currentPhase.phase_type === 'immersion' && (
          <ImmersionPhase
            content={currentPhase.content}
            vocabulary={[]}
            onComplete={handlePhaseComplete}
          />
        )}
        {currentPhase.phase_type === 'comprehension' && (
          <ComprehensionPhase
            content={currentPhase.content}
            onComplete={handlePhaseComplete}
          />
        )}
        {currentPhase.phase_type === 'practice' && (
          <PracticePhase
            content={currentPhase.content}
            onComplete={handlePhaseComplete}
          />
        )}
        {currentPhase.phase_type === 'expression' && (
          <ChapterExpressionPhase
            content={currentPhase.content}
            chapterTitle={chapter.title}
            phaseId={currentPhase.id}
            userId={userId!}
            chapterId={chapterId}
            onComplete={handlePhaseComplete}
          />
        )}
      </main>
    </div>
  )
}
