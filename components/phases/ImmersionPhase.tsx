'use client'

import { useState, useRef } from 'react'
import { parseJsonArray } from '@/lib/content'

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

const audioCache = new Map<string, HTMLAudioElement>()

async function fetchAudio(text: string): Promise<HTMLAudioElement | null> {
  if (audioCache.has(text)) return audioCache.get(text)!
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speaker: 'female' }),
    })
    if (!res.ok) return null
    const blob = await res.blob()
    if (blob.size === 0) return null
    const audio = new Audio(URL.createObjectURL(blob))
    audioCache.set(text, audio)
    return audio
  } catch {
    return null
  }
}

function playAudio(audio: HTMLAudioElement): Promise<void> {
  return new Promise(res => {
    audio.currentTime = 0
    audio.onended = () => res()
    audio.play()
  })
}

const LOOP_REPS = 5
const LOOP_WAIT = 1

export default function ImmersionPhase({ content, vocabulary, onComplete }: Props) {
  const raw = content as unknown as ImmersionContent
  const { source, text } = raw
  const highlighted_words = parseJsonArray<string>(raw.highlighted_words)

  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [loopState, setLoopState] = useState<{ rep: number; countdown: number } | null>(null)
  const [loadingWord, setLoadingWord] = useState(false)
  const loopRef = useRef<{ cancelled: boolean }>({ cancelled: false })
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  async function speakWord(word: string) {
    setLoadingWord(true)
    const audio = await fetchAudio(word)
    setLoadingWord(false)
    if (!audio) return
    currentAudioRef.current = audio
    await playAudio(audio)
  }

  async function handleLoop(word: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (loopState) {
      loopRef.current.cancelled = true
      currentAudioRef.current?.pause()
      setLoopState(null)
      return
    }

    loopRef.current = { cancelled: false }
    const ctx = loopRef.current

    const audio = await fetchAudio(word)
    if (!audio || ctx.cancelled) return

    async function runLoop() {
      for (let rep = 1; rep <= LOOP_REPS; rep++) {
        if (ctx.cancelled) break
        setLoopState({ rep, countdown: 0 })
        currentAudioRef.current = audio!
        await playAudio(audio!)
        if (ctx.cancelled || rep === LOOP_REPS) break
        for (let t = LOOP_WAIT; t > 0; t--) {
          if (ctx.cancelled) break
          setLoopState({ rep, countdown: t })
          await new Promise(res => setTimeout(res, 1000))
        }
      }
      if (!ctx.cancelled) setLoopState(null)
    }

    runLoop()
  }

  function highlightText(raw: string) {
    const words = highlighted_words ?? []
    let result = raw
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    words.forEach(w => {
      const regex = new RegExp(`\\b(${w})\\b`, 'gi')
      result = result.replace(
        regex,
        `<mark class="cursor-pointer rounded bg-lime-400/20 px-0.5 text-lime-200 vocab-word" data-word="${w}">$1</mark>`
      )
    })
    result = result.replace(/\n/g, '<br />')
    return result
  }

  async function handleTextClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.classList.contains('vocab-word')) {
      const wordText = target.dataset.word?.toLowerCase()
      const match = vocabulary.find(v => v.word.toLowerCase() === wordText)
      if (match) {
        setSelectedWord(match)
        setRevealed(prev => new Set(prev).add(match.word))
        speakWord(match.word)
      }
    }
  }

  function handleSelectWord(v: VocabWord) {
    loopRef.current.cancelled = true
    currentAudioRef.current?.pause()
    setLoopState(null)
    setSelectedWord(v)
    setRevealed(prev => new Set(prev).add(v.word))
    speakWord(v.word)
  }

  const allRevealed = highlighted_words?.every(w => revealed.has(w))

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Immersion</span>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Read and explore</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tap the <span className="rounded bg-lime-400/20 px-1 text-xs text-lime-200">highlighted words</span> to see their meaning.
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
                <span className="text-base font-bold text-lime-200">{selectedWord.word}</span>

                {/* Speaker button */}
                <button
                  onClick={() => speakWord(selectedWord.word)}
                  disabled={loadingWord}
                  className="w-8 h-8 rounded-full bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center transition-colors disabled:opacity-40"
                  title="Hear pronunciation"
                >
                  {loadingWord ? (
                    <svg className="h-3.5 w-3.5 animate-spin text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-cyan-300">
                      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z"/>
                      <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z"/>
                    </svg>
                  )}
                </button>

                {/* Loop button */}
                <button
                  onClick={e => handleLoop(selectedWord.word, e)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    loopState
                      ? 'bg-rose-100 hover:bg-rose-200'
                      : 'bg-indigo-50 hover:bg-indigo-100'
                  }`}
                  title={loopState ? 'Stop loop' : `Repeat ${LOOP_REPS}× with ${LOOP_WAIT}s pause`}
                >
                  {loopState ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-rose-500">
                      <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-cyan-300">
                      <path fillRule="evenodd" d="M12 5.25c1.213 0 2.415.046 3.605.135a3.256 3.256 0 0 1 3.01 3.01c.044.583.077 1.17.1 1.759L17.03 8.47a.75.75 0 1 0-1.06 1.06l3 3a.75.75 0 0 0 1.06 0l3-3a.75.75 0 0 0-1.06-1.06l-1.752 1.751c-.023-.65-.06-1.296-.108-1.939a4.756 4.756 0 0 0-4.392-4.392 49.422 49.422 0 0 0-7.436 0A4.756 4.756 0 0 0 3.89 8.282c-.017.224-.033.447-.046.672a.75.75 0 1 0 1.497.092c.013-.217.028-.434.044-.651a3.256 3.256 0 0 1 3.01-3.01c1.19-.09 2.392-.135 3.605-.135Zm-6.97 6.22a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.752-1.751c.023.65.06 1.296.108 1.939a4.756 4.756 0 0 0 4.392 4.392 49.413 49.413 0 0 0 7.436 0 4.756 4.756 0 0 0 4.392-4.392c.017-.224.033-.447.046-.672a.75.75 0 0 0-1.497-.092c-.013.217-.028.434-.044.651a3.256 3.256 0 0 1-3.01 3.01 47.893 47.893 0 0 1-7.21 0 3.256 3.256 0 0 1-3.01-3.01 47.859 47.859 0 0 1-.1-1.759L6.97 18.53a.75.75 0 0 0 1.06-1.06l-3-3Z" clipRule="evenodd"/>
                    </svg>
                  )}
                </button>

                {selectedWord.phonetic && (
                  <span className="text-xs text-gray-400 font-mono">{selectedWord.phonetic}</span>
                )}
                {loopState && (
                  <span className="text-xs font-mono text-rose-400">
                    {loopState.countdown > 0
                      ? `${loopState.rep}/${LOOP_REPS} · ${loopState.countdown}s`
                      : `${loopState.rep}/${LOOP_REPS}`}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-700 mt-2">{selectedWord.definition}</div>
              <div className="text-xs text-gray-400 mt-2 italic">&ldquo;{selectedWord.example_sentence}&rdquo;</div>
            </div>
            <button
              onClick={() => {
                loopRef.current.cancelled = true
                currentAudioRef.current?.pause()
                setLoopState(null)
                setSelectedWord(null)
              }}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0 mt-0.5"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Vocabulary chips */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Words in this scenario</p>
        <div className="flex flex-wrap gap-2">
          {vocabulary.map(v => (
            <button
              key={v.id}
              onClick={() => handleSelectWord(v)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                revealed.has(v.word)
                  ? 'border-lime-300/40 bg-lime-400/10 text-lime-200 shadow-sm'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:border-cyan-300/40 hover:text-cyan-200 shadow-sm'
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
