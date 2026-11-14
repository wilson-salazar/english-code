'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/navigation/Breadcrumbs'
import { postJson } from '@/lib/api'
import { loadChecker, SpellChecker } from '@/lib/spelling/checker'
import { supabase } from '@/lib/supabase'
import { useUnsavedWork } from '@/components/navigation/NavigationGuard'
import SpellCheckedTextarea from './SpellCheckedTextarea'

const MAX_TEXT_LENGTH = 5000
const WORD_IN_PROGRESS_MS = 700
const TOO_LONG_MESSAGE = 'This text is too long. Please shorten it and try again.'
const REVIEW_FAILED_MESSAGE = 'Your text could not be reviewed. Please try again.'
const OFFLINE_MESSAGE = 'Could not reach the server. Check your connection and try again.'

type Review =
  | { status: 'natural' | 'not_english'; reviewedText: string }
  | { status: 'improved'; reviewedText: string; recommendation: string }
  | { status: 'error'; message: string }

type CopyState = 'idle' | 'copied' | 'failed'

function countSentences(text: string) {
  return text.split(/(?<=[.!?…])\s+|\n+/).filter(sentence => sentence.trim()).length
}

export default function WritingAssistant() {
  const router = useRouter()
  const [level, setLevel] = useState<string | null>(null)

  useEffect(() => {
    async function initialize() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('levels(code)')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile) {
        router.replace('/')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLevel((profile.levels as any)?.code ?? 'B1')
    }

    initialize()
  }, [router])

  return (
    <div className="bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Breadcrumbs section="tools" current="Writing Assistant" />
          <div className="text-center">
            <div className="text-sm font-semibold">Writing Assistant</div>
            <div className="text-xs text-indigo-300">Check your spelling and wording</div>
          </div>
          <span className="w-20" />
        </div>
      </header>

      {level && <WritingAssistantForm level={level} />}
    </div>
  )
}

export function WritingAssistantForm({ level }: { level: string }) {
  const [text, setText] = useState('')
  const [typingCaret, setTypingCaret] = useState<number | null>(null)
  const [checker, setChecker] = useState<SpellChecker | null>(null)
  const [checkerFailed, setCheckerFailed] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [review, setReview] = useState<Review | null>(null)
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [fixAll, setFixAll] = useState<{ before: string; after: string } | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useUnsavedWork(text.trim() !== '' || isChecking)

  useEffect(() => {
    loadChecker()
      .then(setChecker)
      .catch(error => {
        console.error('Spell checker error:', error)
        setCheckerFailed(true)
      })

    return () => {
      abortRef.current?.abort()
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [])

  const misspellings = useMemo(
    () => checker?.findMisspellings(text, typingCaret) ?? [],
    [checker, text, typingCaret]
  )

  const isTooLong = text.length > MAX_TEXT_LENGTH
  const fixable = misspellings.filter(({ word }) => checker?.suggest(word).length)

  function handleTextChange(nextText: string, caret: number | null) {
    setText(nextText)
    setCopyState('idle')
    setTypingCaret(caret)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    if (caret !== null) {
      typingTimerRef.current = setTimeout(() => setTypingCaret(null), WORD_IN_PROGRESS_MS)
    }
  }

  async function checkMeaning() {
    if (isChecking || !text.trim() || isTooLong) return

    const reviewedText = text
    const controller = new AbortController()
    abortRef.current = controller
    setIsChecking(true)
    setCopyState('idle')

    try {
      const response = await postJson('/api/writing-assistant', { text: reviewedText, level }, { signal: controller.signal })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setReview({ status: 'error', message: result?.error ?? REVIEW_FAILED_MESSAGE })
      } else if (result?.status === 'improved' && typeof result.recommendation === 'string' && result.recommendation) {
        setReview({ status: 'improved', reviewedText, recommendation: result.recommendation })
      } else if (result?.status === 'natural' || result?.status === 'not_english') {
        setReview({ status: result.status, reviewedText })
      } else {
        setReview({ status: 'error', message: REVIEW_FAILED_MESSAGE })
      }
    } catch (error) {
      if (controller.signal.aborted) return
      console.error('Writing Assistant request failed:', error)
      setReview({ status: 'error', message: OFFLINE_MESSAGE })
    } finally {
      if (!controller.signal.aborted) setIsChecking(false)
    }
  }

  async function copyRecommendation() {
    if (review?.status !== 'improved') return
    try {
      await navigator.clipboard.writeText(review.recommendation)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  function fixAllWords() {
    if (!checker || fixable.length === 0) return
    // From last to first, so each replacement leaves the earlier positions valid.
    const fixed = [...fixable].reverse().reduce((current, { start, end, word }) => (
      current.slice(0, start) + checker.suggest(word)[0] + current.slice(end)
    ), text)
    setFixAll({ before: text, after: fixed })
    handleTextChange(fixed, null)
  }

  function undoFixAll() {
    if (!fixAll) return
    handleTextChange(fixAll.before, null)
    setFixAll(null)
  }

  const canUndo = fixAll?.after === text
  const isOutdated = review !== null && review.status !== 'error' && review.reviewedText !== text

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-5 pb-24 pt-8">
      <section className="space-y-3">
        <SpellCheckedTextarea
          value={text}
          misspellings={misspellings}
          label="Your text"
          placeholder="Write or paste your text in English…"
          suggest={word => checker?.suggest(word) ?? []}
          onChange={handleTextChange}
        />

        {isTooLong && <p role="alert" className="text-sm text-red-300">{TOO_LONG_MESSAGE}</p>}
        {checkerFailed && (
          <p role="status" className="text-sm text-amber-300">
            The spell checker is not available right now. You can still check the sentence meaning.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={checkMeaning}
            disabled={isChecking || !text.trim() || isTooLong}
            className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isChecking ? 'Checking…' : 'Check sentence meaning'}
          </button>
          <button
            type="button"
            onClick={fixAllWords}
            disabled={fixable.length === 0}
            className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Fix all
          </button>
          {canUndo && (
            <button
              type="button"
              onClick={undoFixAll}
              className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/5"
            >
              Undo
            </button>
          )}
        </div>
      </section>

      <section aria-live="polite" className="min-h-28 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Recommendation</h2>

        <div className="mt-3 text-base leading-7 text-slate-100">
          {!review && isChecking && <p className="text-slate-400">Checking…</p>}
          {!review && !isChecking && <p className="text-slate-500">Your recommendation will appear here.</p>}
          {review?.status === 'improved' && <p className="whitespace-pre-wrap break-words">{review.recommendation}</p>}
          {review?.status === 'natural' && (
            <p>{countSentences(review.reviewedText) > 1 ? 'This paragraph looks good.' : 'This sentence looks good.'}</p>
          )}
          {review?.status === 'not_english' && <p>Writing Assistant only reviews English.</p>}
          {review?.status === 'error' && <p role="alert" className="text-red-300">{review.message}</p>}
        </div>

        {isOutdated && (
          <p className="mt-3 text-sm text-amber-300">
            {review.status === 'improved'
              ? 'This recommendation is for an earlier version of your text.'
              : 'This result is for an earlier version of your text.'}
          </p>
        )}

        {review?.status === 'improved' && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyRecommendation}
              disabled={isChecking}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copyState === 'copied' ? 'Copied' : 'Copy recommendation'}
            </button>
            {copyState === 'failed' && (
              <p role="alert" className="text-sm text-red-300">Could not copy. Select the text and copy it manually.</p>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
