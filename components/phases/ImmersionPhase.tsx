'use client'

import { useState } from 'react'

interface VocabWord {
  id: string
  word: string
  definition: string
  example_sentence: string
}

interface ImmersionContent {
  source: string
  text: string
  highlighted_words: string[]
}

interface Props {
  content: Record<string, unknown>
  vocabulary: VocabWord[]
  onComplete: () => void
}

export default function ImmersionPhase({ content, vocabulary, onComplete }: Props) {
  const { source, text, highlighted_words } = content as unknown as ImmersionContent
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  function highlightText(raw: string) {
    const words = highlighted_words ?? []
    let result = raw

    // Replace markdown bold
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // Highlight vocabulary words
    words.forEach(w => {
      const regex = new RegExp(`\\b(${w})\\b`, 'gi')
      result = result.replace(
        regex,
        `<mark class="bg-indigo-100 text-indigo-800 rounded px-0.5 cursor-pointer vocab-word" data-word="${w}">$1</mark>`
      )
    })

    // Line breaks
    result = result.replace(/\n/g, '<br />')

    return result
  }

  function handleTextClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.classList.contains('vocab-word')) {
      const wordText = target.dataset.word?.toLowerCase()
      const match = vocabulary.find(v => v.word.toLowerCase() === wordText)
      if (match) {
        setSelectedWord(match)
        setRevealed(prev => new Set(prev).add(match.word))
      }
    }
  }

  const allRevealed = highlighted_words?.every(w => revealed.has(w))

  return (
    <div className="space-y-6">
      {/* Context label */}
      <div>
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Immersion</span>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Read and explore</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tap the <span className="bg-indigo-100 text-indigo-700 px-1 rounded text-xs">highlighted words</span> to see their meaning.
        </p>
      </div>

      {/* Document */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-300" />
            <div className="w-3 h-3 rounded-full bg-yellow-300" />
            <div className="w-3 h-3 rounded-full bg-green-300" />
          </div>
          <span className="text-xs text-gray-400 ml-2 font-mono">{source}</span>
        </div>
        <div
          className="px-6 py-5 text-sm text-gray-700 leading-7 cursor-default"
          dangerouslySetInnerHTML={{ __html: highlightText(text) }}
          onClick={handleTextClick}
        />
      </div>

      {/* Word tooltip */}
      {selectedWord && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-indigo-700">{selectedWord.word}</div>
              <div className="text-sm text-gray-700 mt-1">{selectedWord.definition}</div>
              <div className="text-xs text-gray-500 mt-2 italic">"{selectedWord.example_sentence}"</div>
            </div>
            <button onClick={() => setSelectedWord(null)} className="text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0">×</button>
          </div>
        </div>
      )}

      {/* Vocabulary chips */}
      <div>
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Words in this scenario</p>
        <div className="flex flex-wrap gap-2">
          {vocabulary.map(v => (
            <button
              key={v.id}
              onClick={() => setSelectedWord(v)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                revealed.has(v.word)
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {v.word}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-3 transition-colors"
      >
        {allRevealed ? 'Continue →' : 'Continue anyway →'}
      </button>
    </div>
  )
}
