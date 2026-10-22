'use client'

import { useState } from 'react'
import { parseJsonArray } from '@/lib/content'

interface FillBlankItem {
  type: 'fill_blank'
  sentence: string
  answer: string
}

interface MultipleChoiceItem {
  type: 'multiple_choice'
  question: string
  options: string[]
  answer_index: number
}

type PracticeItem = FillBlankItem | MultipleChoiceItem

interface PracticeContent {
  instructions: string
  items: PracticeItem[]
}

interface Props {
  content: Record<string, unknown>
  onComplete: () => void
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export default function PracticePhase({ content, onComplete }: Props) {
  const raw = content as unknown as PracticeContent
  const items = parseJsonArray<PracticeItem>(raw.items)

  const [answers, setAnswers] = useState<(string | number | null)[]>(
    items.map(item => (item.type === 'fill_blank' ? '' : null))
  )
  const [results, setResults] = useState<boolean[] | null>(null)

  function setAnswer(i: number, value: string | number) {
    setAnswers(prev => {
      const next = [...prev]
      next[i] = value
      return next
    })
    setResults(null)
  }

  function checkAnswers() {
    const checked = items.map((item, i) => {
      if (item.type === 'fill_blank') {
        return normalize(String(answers[i] ?? '')) === normalize(item.answer)
      }
      return answers[i] === item.answer_index
    })
    setResults(checked)
  }

  const allAnswered = answers.every(a => a !== null && a !== '')
  const allCorrect = results?.every(Boolean) ?? false

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold text-teal-600 uppercase tracking-widest">Practice</span>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Test yourself</h2>
        <p className="text-sm text-gray-500 mt-1">{raw.instructions} You need every answer correct to continue.</p>
      </div>

      <div className="space-y-4">
        {items.map((item, i) => {
          const result = results?.[i]
          const borderClass = result === undefined
            ? 'border-gray-100'
            : result
              ? 'border-green-300'
              : 'border-red-300'

          if (item.type === 'fill_blank') {
            const parts = item.sentence.split('___')
            return (
              <div key={i} className={`bg-white rounded-2xl border p-5 shadow-sm transition-colors ${borderClass}`}>
                <p className="text-sm font-semibold text-gray-800 mb-3">{i + 1}. Fill in the blank</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {parts[0]}
                  <input
                    type="text"
                    value={(answers[i] as string) ?? ''}
                    onChange={e => setAnswer(i, e.target.value)}
                    className={`mx-1 w-36 border-b-2 bg-transparent px-1 text-center text-sm font-semibold focus:outline-none ${
                      result === undefined ? 'border-gray-300' : result ? 'border-green-400 !text-green-400' : 'border-red-400 !text-red-400'
                    }`}
                  />
                  {parts[1]}
                </p>
                {result === false && (
                  <p className="text-xs text-red-500 mt-2">Correct answer: {item.answer}</p>
                )}
              </div>
            )
          }

          return (
            <div key={i} className={`bg-white rounded-2xl border p-5 shadow-sm transition-colors ${borderClass}`}>
              <p className="text-sm font-semibold text-gray-800 mb-3">{i + 1}. {item.question}</p>
              <div className="space-y-2">
                {item.options.map((option, optIndex) => {
                  const isSelected = answers[i] === optIndex
                  const showAsCorrect = results && optIndex === item.answer_index
                  const showAsWrong = results && isSelected && optIndex !== item.answer_index
                  return (
                    <button
                      key={optIndex}
                      onClick={() => setAnswer(i, optIndex)}
                      className={`w-full text-left text-sm rounded-xl border px-4 py-2.5 transition-colors ${
                        showAsCorrect
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : showAsWrong
                            ? 'border-red-300 bg-red-50 text-red-600'
                            : isSelected
                              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {!allCorrect && (
        <button
          onClick={checkAnswers}
          disabled={!allAnswered}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors"
        >
          {results ? 'Check again' : 'Check answers'}
        </button>
      )}

      {allCorrect && (
        <button
          onClick={onComplete}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-3 transition-colors"
        >
          Perfect! Continue →
        </button>
      )}
    </div>
  )
}
