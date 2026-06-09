'use client'

import { useState } from 'react'

interface VocabWord {
  id: string
  word: string
  definition: string
  example_sentence: string
  phonetic?: string
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

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const preferred = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Serena', 'Victoria', 'Zira']
  for (const name of preferred) {
    const match = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'))
    if (match) return match
  }
  const enhanced = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Enhanced') || v.name.includes('Premium')))
  if (enhanced) return enhanced
  return voices.find(v => v.lang === 'en-US') ?? null
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.85
    utterance.pitch = 1.05
    const voice = getBestVoice()
    if (voice) utterance.voice = voice
    window.speechSynthesis.speak(utterance)
  }, 100)
}

export default function ImmersionPhase({ content, vocabulary, onComplete }: Props) {
  const { source, text, highlighted_words } = content as unknown as ImmersionContent
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  function highlightText(raw: string) {
    const words = highlighted_words ?? []
    let result = raw

    result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    words.forEach(w => {
      const regex = new RegExp(`\\b(${w})\\b`, 'gi')
      result = result.replace(
        regex,
        `<mark class="bg-indigo-100 text-indigo-800 rounded px-0.5 cursor-pointer vocab-word" data-word="${w}">$1</mark>`
      )
    })

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
        speak(match.word)
      }
    }
  }

  const allRevealed = highlighted_words?.every(w => revealed.has(w))

  return (
    <div className="space-y-6">
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

      {/* Word card */}
      {selectedWord && (
        <div className="bg-white border border-indigo-100 rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-indigo-700">{selectedWord.word}</span>

                <button
                  onClick={() => speak(selectedWord.word)}
                  className="flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 bg-gray-50 text-gray-400 hover:text-indigo-500 transition-colors"
                  title="Hear pronunciation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 0 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
                    <path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
                  </svg>
                </button>

                {selectedWord.phonetic && (
                  <span className="text-xs text-gray-400 font-mono">{selectedWord.phonetic}</span>
                )}
              </div>
              <div className="text-sm text-gray-700 mt-2">{selectedWord.definition}</div>
              <div className="text-xs text-gray-400 mt-2 italic">"{selectedWord.example_sentence}"</div>
            </div>
            <button
              onClick={() => setSelectedWord(null)}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0 mt-0.5"
            >
              ×
            </button>
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
              onClick={() => { setSelectedWord(v); setRevealed(prev => new Set(prev).add(v.word)); speak(v.word) }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                revealed.has(v.word)
                  ? 'border-indigo-300 bg-white text-indigo-700 shadow-sm'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 shadow-sm'
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
