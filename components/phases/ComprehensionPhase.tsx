'use client'

import { useState, useRef } from 'react'
import { parseJsonArray } from '@/lib/content'

interface Question {
  question: string
  expected_keywords: string[]
}

interface ComprehensionContent {
  questions: Question[]
}

interface Props {
  content: Record<string, unknown>
  onComplete: () => void
}

export default function ComprehensionPhase({ content, onComplete }: Props) {
  const { questions } = content as unknown as ComprehensionContent
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ''))
  const [results, setResults] = useState<boolean[] | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null)
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null)
  const audioCache = useRef<Map<number, HTMLAudioElement>>(new Map())
  const currentAudio = useRef<HTMLAudioElement | null>(null)

  async function speakQuestion(i: number) {
    // Tapping the speaker of the line already playing stops it
    if (speakingIdx === i) {
      currentAudio.current?.pause()
      setSpeakingIdx(null)
      return
    }
    currentAudio.current?.pause()
    setSpeakingIdx(null)

    let audio = audioCache.current.get(i) ?? null
    if (!audio) {
      setLoadingIdx(i)
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: questions[i].question, speaker: 'female' }),
        })
        if (!res.ok) {
          console.error('TTS fetch failed:', await res.json().catch(() => ({})))
          return
        }
        const blob = await res.blob()
        if (blob.size === 0) return
        audio = new Audio(URL.createObjectURL(blob))
        audioCache.current.set(i, audio)
      } finally {
        setLoadingIdx(null)
      }
    }

    audio.currentTime = 0
    audio.onended = () => setSpeakingIdx(cur => (cur === i ? null : cur))
    currentAudio.current = audio
    setSpeakingIdx(i)
    audio.play()
  }

  function checkAnswers() {
    const checked = questions.map((q, i) => {
      const answer = answers[i].toLowerCase()
      const keywords = parseJsonArray<string>(q.expected_keywords)
      return keywords.some(kw => answer.includes(kw.toLowerCase()))
    })
    setResults(checked)
    setSubmitted(true)
  }

  const allAnswered = answers.every(a => a.trim().length > 0)
  const score = results ? results.filter(Boolean).length : 0

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Comprehension</span>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Answer in English</h2>
        <p className="text-sm text-gray-500 mt-1">
          Answer based on what you read. Write in English — short answers are fine.
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className={`bg-white rounded-2xl border p-5 transition-colors ${
            results
              ? results[i] ? 'border-green-200' : 'border-red-200'
              : 'border-gray-100'
          }`}>
            <div className="flex items-start gap-2 mb-3">
              <label className="flex-1 text-sm font-semibold text-gray-900">
                {i + 1}. {q.question}
              </label>
              <button
                onClick={() => speakQuestion(i)}
                disabled={loadingIdx !== null && loadingIdx !== i}
                aria-label={speakingIdx === i ? 'Stop audio' : 'Listen to this question'}
                title={speakingIdx === i ? 'Stop' : 'Listen'}
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
                  speakingIdx === i
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-500'
                }`}
              >
                {loadingIdx === i ? (
                  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : speakingIdx === i ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 animate-pulse">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z"/>
                    <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z"/>
                    <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z"/>
                  </svg>
                )}
              </button>
            </div>
            <textarea
              value={answers[i]}
              onChange={e => {
                const next = [...answers]
                next[i] = e.target.value
                setAnswers(next)
              }}
              disabled={submitted}
              rows={2}
              placeholder="Your answer..."
              className="w-full text-sm text-gray-700 placeholder-gray-300 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none disabled:bg-gray-50 transition"
            />
            {results && (
              <div className={`mt-2 text-xs font-medium ${results[i] ? 'text-green-600' : 'text-red-500'}`}>
                {results[i]
                  ? '✓ Good answer'
                  : `✗ Look for: ${parseJsonArray<string>(q.expected_keywords).join(', ')}`}
              </div>
            )}
          </div>
        ))}
      </div>

      {submitted && results && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{score}/{questions.length}</div>
          <div className="text-sm text-gray-600 mt-1">
            {score === questions.length
              ? 'Perfect! You understood everything.'
              : score >= questions.length / 2
              ? 'Good effort. Review the hints above.'
              : "That's okay — go back and re-read the text."}
          </div>
        </div>
      )}

      {!submitted ? (
        <button
          onClick={checkAnswers}
          disabled={!allAnswered}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors"
        >
          Check answers
        </button>
      ) : (
        <button
          onClick={onComplete}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-3 transition-colors"
        >
          Continue →
        </button>
      )}
    </div>
  )
}
