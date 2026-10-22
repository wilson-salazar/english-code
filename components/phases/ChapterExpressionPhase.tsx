'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ExpressionContent {
  prompt: string
  evaluation_criteria: string[]
}

interface AIFeedback {
  summary: string
  grammar_accuracy: string
  clarity: string
  naturalness: string
  improved_version: string
  scores: {
    grammar_accuracy: number
    clarity: number
    naturalness: number
  }
}

interface Props {
  content: Record<string, unknown>
  chapterTitle: string
  phaseId: string
  userId: string
  chapterId: string
  onComplete: () => void
}

export default function ChapterExpressionPhase({ content, chapterTitle, phaseId, userId, chapterId, onComplete }: Props) {
  const { prompt } = content as unknown as ExpressionContent
  const [response, setResponse] = useState('')
  const [feedback, setFeedback] = useState<AIFeedback | null>(null)
  const [loading, setLoading] = useState(false)
  const [attempt, setAttempt] = useState(1)

  async function handleSubmit() {
    if (!response.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/evaluate-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, chapterTitle, prompt }),
      })

      const data = await res.json()
      setFeedback(data)

      await supabase.from('user_chapter_responses').insert({
        user_id: userId,
        phase_id: phaseId,
        response_text: response,
        ai_feedback: data,
        score_grammar: data.scores.grammar_accuracy,
        score_clarity: data.scores.clarity,
        score_naturalness: data.scores.naturalness,
        attempt_number: attempt,
      })

      await supabase.from('user_chapter_progress').upsert({
        user_id: userId,
        chapter_id: chapterId,
        status: 'completed',
        score_grammar: data.scores.grammar_accuracy,
        score_clarity: data.scores.clarity,
        score_naturalness: data.scores.naturalness,
      }, { onConflict: 'user_id,chapter_id' })

    } catch {
      // silently fail — user can retry
    }

    setLoading(false)
  }

  function handleRetry() {
    setFeedback(null)
    setResponse('')
    setAttempt(a => a + 1)
  }

  const avgScore = feedback
    ? Math.round((feedback.scores.grammar_accuracy + feedback.scores.clarity + feedback.scores.naturalness) / 3)
    : null

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Expression</span>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Now you write</h2>
        <p className="text-sm text-gray-500 mt-1">
          Apply the grammar point from this chapter. AI will give you feedback on your response.
        </p>
      </div>

      {/* Prompt */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
        <p className="text-sm text-indigo-900 leading-relaxed">{prompt}</p>
      </div>

      {/* Text area */}
      {!feedback && (
        <div className="space-y-3">
          <textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            rows={8}
            placeholder="Write your response here in English..."
            className="w-full text-sm text-gray-700 placeholder-gray-300 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!response.trim() || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors"
          >
            {loading ? 'Evaluating...' : 'Submit for feedback'}
          </button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="space-y-4">
          {/* Score summary */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700">Your score</span>
              <span className="text-2xl font-bold text-indigo-600">{avgScore}%</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Grammar', value: feedback.scores.grammar_accuracy },
                { label: 'Clarity', value: feedback.scores.clarity },
                { label: 'Naturalness', value: feedback.scores.naturalness },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24">{label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-500 w-8 text-right">{value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Written feedback */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-sm text-gray-700">{feedback.summary}</p>
            <div className="space-y-2 pt-2 border-t border-gray-50">
              {[
                { label: 'Grammar', text: feedback.grammar_accuracy },
                { label: 'Clarity', text: feedback.clarity },
                { label: 'Naturalness', text: feedback.naturalness },
              ].map(({ label, text }) => (
                <div key={label}>
                  <span className="text-xs font-semibold text-indigo-600">{label}: </span>
                  <span className="text-xs text-gray-600">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Improved version */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">How a native speaker might write it</p>
            <p className="text-sm text-gray-700 leading-relaxed">{feedback.improved_version}</p>
          </div>

          {/* Your original */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Your response</p>
            <p className="text-sm text-gray-600 leading-relaxed">{response}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 border border-gray-200 text-gray-600 hover:border-gray-300 font-semibold rounded-xl px-4 py-3 text-sm transition-colors"
            >
              Try again
            </button>
            <button
              onClick={onComplete}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-3 text-sm transition-colors"
            >
              Finish →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
