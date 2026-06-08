'use client'

import { useState } from 'react'

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

  function checkAnswers() {
    const checked = questions.map((q, i) => {
      const answer = answers[i].toLowerCase()
      return q.expected_keywords.some(kw => answer.includes(kw.toLowerCase()))
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
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {i + 1}. {q.question}
            </label>
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
                  : `✗ Look for: ${q.expected_keywords.join(', ')}`}
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
