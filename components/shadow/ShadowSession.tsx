'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/navigation/Breadcrumbs'
import { postJson } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { splitIntoWords } from '@/lib/shadow'
import { useUnsavedWork } from '@/components/navigation/NavigationGuard'
import WordRepeatStep from './WordRepeatStep'
import FinalSentenceStep from './FinalSentenceStep'

interface ShadowExercise {
  sentence: string
  words: string[]
  topicCategory: string
  level: string
}

interface ShadowGenerateResponse {
  sentence?: string
  topic_category?: string
  error?: string
}

type Stage = 'loading' | 'intro' | 'words' | 'final' | 'done' | 'error'

const GENERATE_TIMEOUT_MS = 20000
const HISTORY_LIMIT = 20

export default function ShadowSession() {
  const router = useRouter()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [level, setLevel] = useState('B1')
  const [exercise, setExercise] = useState<ShadowExercise | null>(null)
  const [stage, setStage] = useState<Stage>('loading')
  const [error, setError] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [exercisesCompleted, setExercisesCompleted] = useState(0)
  const [saveFailed, setSaveFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const usedSentencesRef = useRef<string[]>([])
  const lastTopicRef = useRef('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const initializedRef = useRef(false)

  useUnsavedWork(stage === 'words' || stage === 'final' || saving)

  const playSentence = useCallback(async (text: string) => {
    try {
      const response = await postJson('/api/tts', { text, speaker: 'female' })
      if (!response.ok) throw new Error('TTS unavailable')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      await new Promise<void>(resolve => {
        audio.onended = () => resolve()
        audio.onerror = () => resolve()
        audio.play().catch(() => resolve())
      })
      URL.revokeObjectURL(url)
    } catch {
      // Audio is a convenience; the sentence text is always visible on screen.
    }
  }, [])

  const loadExercise = useCallback(async (userLevel: string) => {
    audioRef.current?.pause()
    setStage('loading')
    setError('')
    setSaveFailed(false)

    // A network failure or a server that never answers must end in the error
    // screen with a retry, not in an endless "Preparing a new sentence...".
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS)

    try {
      const response = await postJson('/api/shadow/generate', {
        level: userLevel,
        recentSentences: usedSentencesRef.current,
        previousTopic: lastTopicRef.current,
      }, { signal: controller.signal })
      const data = await response.json().catch(() => ({})) as ShadowGenerateResponse
      const words = data.sentence ? splitIntoWords(data.sentence) : []

      if (!response.ok || !data.sentence || !data.topic_category || words.length === 0) {
        setError(data.error ?? 'A new sentence could not be generated. Please try again.')
        setStage('error')
        return
      }

      usedSentencesRef.current = [...usedSentencesRef.current, data.sentence].slice(-50)
      lastTopicRef.current = data.topic_category
      setExercise({ sentence: data.sentence, words, topicCategory: data.topic_category, level: userLevel })
      setWordIndex(0)
      setStage('intro')
      void playSentence(data.sentence)
    } catch {
      setError(
        controller.signal.aborted
          ? 'Generating the sentence took too long. Please try again.'
          : 'Could not reach the server. Check your connection and try again.'
      )
      setStage('error')
    } finally {
      clearTimeout(timeout)
    }
  }, [playSentence])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    async function initialize() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('id, levels(code)')
        .eq('auth_user_id', authUser.id)
        .single()

      if (!profile) {
        router.replace('/')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userLevel = (profile.levels as any)?.code ?? 'B1'
      setProfileId(profile.id)
      setLevel(userLevel)

      // Seed the "recent" lists from the saved history so a new visit does not
      // repeat the last sentence or topic (SC-002). If this read fails the
      // session simply starts without history.
      const { data: history } = await supabase
        .from('shadow_sessions')
        .select('sentence, topic_category')
        .eq('user_id', profile.id)
        .order('completed_at', { ascending: false })
        .limit(HISTORY_LIMIT)
      if (history && history.length > 0) {
        usedSentencesRef.current = history.map(row => row.sentence).reverse()
        lastTopicRef.current = history[0].topic_category
      }

      await loadExercise(userLevel)
    }

    void initialize()

    return () => {
      audioRef.current?.pause()
    }
  }, [loadExercise, router])

  function startShadowing() {
    audioRef.current?.pause()
    setWordIndex(0)
    setStage('words')
  }

  function handleWordResolved() {
    if (!exercise) return
    if (wordIndex + 1 >= exercise.words.length) {
      setStage('final')
    } else {
      setWordIndex(index => index + 1)
    }
  }

  async function saveExercise(): Promise<boolean> {
    if (!exercise || !profileId) return false
    const { error: insertError } = await supabase.from('shadow_sessions').insert({
      user_id: profileId,
      sentence: exercise.sentence,
      topic_category: exercise.topicCategory,
      level: exercise.level,
    })
    return !insertError
  }

  async function finishExercise() {
    if (saving) return
    setSaving(true)
    const saved = await saveExercise()
    if (saved) setExercisesCompleted(count => count + 1)
    setSaveFailed(!saved)
    setSaving(false)
    setStage('done')
  }

  async function retrySave() {
    setSaving(true)
    const saved = await saveExercise()
    if (saved) {
      setExercisesCompleted(count => count + 1)
      setSaveFailed(false)
    }
    setSaving(false)
  }

  async function practiceAgain() {
    await loadExercise(level)
  }

  return (
    <div className="bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <Breadcrumbs section="shadow" current="Practice" />
          <div className="text-center">
            <div className="text-sm font-semibold">Shadowing</div>
            <div className="text-xs text-indigo-300">Pronunciation shadowing practice</div>
          </div>
          <span className="text-xs text-slate-500">{exercisesCompleted} done this session</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-5 py-8">
        {stage === 'loading' && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />
            Preparing a new sentence...
          </div>
        )}

        {stage === 'error' && (
          <div className="space-y-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-sm text-red-200">
            <p>{error}</p>
            <button
              onClick={() => void loadExercise(level)}
              className="rounded-lg bg-red-300/15 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-300/25"
            >
              Try again
            </button>
          </div>
        )}

        {stage === 'intro' && exercise && (
          <section className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-600/30 via-violet-600/15 to-cyan-500/10 p-6 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{exercise.topicCategory}</div>
              <p className="mt-3 text-xl font-bold text-white">&ldquo;{exercise.sentence}&rdquo;</p>
              <button
                type="button"
                onClick={() => void playSentence(exercise.sentence)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/20"
              >
                🔊 Listen again
              </button>
            </div>
            <button
              onClick={startShadowing}
              className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Start shadowing →
            </button>
          </section>
        )}

        {stage === 'words' && exercise && (
          <WordRepeatStep
            key={wordIndex}
            word={exercise.words[wordIndex]}
            wordIndex={wordIndex}
            totalWords={exercise.words.length}
            onResolved={handleWordResolved}
          />
        )}

        {stage === 'final' && exercise && (
          <FinalSentenceStep sentence={exercise.sentence} onFinished={finishExercise} />
        )}

        {stage === 'done' && (
          <section className="space-y-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-6 text-center">
            <div className="text-sm font-semibold text-emerald-300">Exercise complete 🎉</div>
            <p className="text-sm text-slate-200">Great shadowing! Ready for another sentence on a new topic?</p>
            {saveFailed && (
              <div className="space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200" role="alert">
                <p>We could not save this exercise to your progress.</p>
                <button
                  type="button"
                  onClick={() => void retrySave()}
                  disabled={saving}
                  className="rounded-lg bg-amber-300/15 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-300/25 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Try saving again'}
                </button>
              </div>
            )}
            <button
              onClick={() => void practiceAgain()}
              className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Practice again →
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
