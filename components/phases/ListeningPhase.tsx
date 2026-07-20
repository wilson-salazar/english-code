'use client'

import { useState, useRef } from 'react'
import { parseJsonArray } from '@/lib/content'

interface DialogueLine {
  speaker: string
  text: string
}

interface ListeningContent {
  dialogue: DialogueLine[]
  questions: { question: string; expected_keywords: string[] }[]
}

interface Props {
  content: Record<string, unknown>
  onComplete: () => void
}

// Alternate voices by speaker index so every new speaker gets a different gender
function getGender(speakerIndex: number): 'female' | 'male' {
  return speakerIndex % 2 === 0 ? 'female' : 'male'
}

async function fetchAudio(text: string, speaker: 'female' | 'male'): Promise<HTMLAudioElement | null> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speaker }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('TTS fetch failed:', err)
    return null
  }
  const blob = await res.blob()
  if (blob.size === 0) {
    console.error('TTS returned empty audio')
    return null
  }
  const url = URL.createObjectURL(blob)
  return new Audio(url)
}

function playAudio(audio: HTMLAudioElement, onProgress?: (fraction: number) => void): Promise<void> {
  return new Promise(res => {
    audio.ontimeupdate = () => {
      if (audio.duration) onProgress?.(audio.currentTime / audio.duration)
    }
    audio.onended = () => {
      onProgress?.(1)
      res()
    }
    audio.play()
  })
}

export default function ListeningPhase({ content, onComplete }: Props) {
  const raw = content as unknown as ListeningContent
  const dialogue = parseJsonArray<DialogueLine>(raw.dialogue)
  const questions = parseJsonArray<ListeningContent['questions'][number]>(raw.questions)

  // Map each unique speaker name to a consistent gender without mutating refs during render.
  const speakers = [...new Set(dialogue.map(line => line.speaker))]
  function genderForSpeaker(name: string): 'female' | 'male' {
    const index = speakers.indexOf(name)
    return getGender(index < 0 ? 0 : index)
  }

  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [played, setPlayed] = useState(false)
  const [currentLine, setCurrentLine] = useState<number | null>(null)
  const [lineProgress, setLineProgress] = useState(0)
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ''))
  const [results, setResults] = useState<boolean[] | null>(null)
  const [showDialogue, setShowDialogue] = useState(false)
  const cancelRef = useRef(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  async function playDialogue() {
    if (playing) {
      cancelRef.current = true
      currentAudioRef.current?.pause()
      setPlaying(false)
      setCurrentLine(null)
      return
    }

    cancelRef.current = false
    setLoading(true)

    // Pre-fetch all lines
    const audios: (HTMLAudioElement | null)[] = []
    for (const line of dialogue) {
      const gender = genderForSpeaker(line.speaker)
      const audio = await fetchAudio(line.text, gender)
      audios.push(audio)
    }

    setLoading(false)
    if (cancelRef.current) return

    setPlaying(true)

    for (let i = 0; i < audios.length; i++) {
      if (cancelRef.current) break
      setCurrentLine(i)
      if (!audios[i]) {
        setLineProgress(1)
        continue
      }
      setLineProgress(0)
      currentAudioRef.current = audios[i]
      await playAudio(audios[i]!, f => setLineProgress(f))
      if (i < audios.length - 1 && !cancelRef.current) {
        await new Promise(res => setTimeout(res, 350))
      }
    }

    if (!cancelRef.current) {
      setPlayed(true)
    }
    setPlaying(false)
    setCurrentLine(null)
  }

  function handleCheck() {
    const scored = questions.map((q, i) => {
      const ans = answers[i].toLowerCase()
      const keywords = parseJsonArray<string>(q.expected_keywords)
      return keywords.some(kw => ans.includes(kw.toLowerCase()))
    })
    setResults(scored)
    setShowDialogue(true)
  }

  const allAnswered = answers.every(a => a.trim().length > 0)
  const allCorrect = results?.every(Boolean)

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold text-teal-600 uppercase tracking-widest">Listening</span>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Listen and understand</h2>
        <p className="text-sm text-gray-500 mt-1">
          Press play and listen to the conversation. Then answer the questions below.
        </p>
      </div>

      {/* Player */}
      <div className="bg-white border border-teal-100 rounded-2xl px-6 py-5 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            playing ? 'bg-teal-100' : 'bg-teal-50'
          }`}>
            {loading ? (
              <svg className="w-6 h-6 text-teal-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : playing ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-teal-500 animate-pulse">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM9 8.25a.75.75 0 0 0-.75.75v6c0 .414.336.75.75.75h.75a.75.75 0 0 0 .75-.75V9a.75.75 0 0 0-.75-.75H9Zm5.25 0a.75.75 0 0 0-.75.75v6c0 .414.336.75.75.75H15a.75.75 0 0 0 .75-.75V9a.75.75 0 0 0-.75-.75h-.5Z" clipRule="evenodd"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-teal-500">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm14.024-.983a1.125 1.125 0 0 1 0 1.966l-5.603 3.113A1.125 1.125 0 0 1 9 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113Z" clipRule="evenodd"/>
              </svg>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {loading ? 'Preparing audio...' : playing ? 'Playing...' : played ? 'Play again' : 'Play conversation'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{dialogue.length} lines · English</p>
          </div>

          <button
            onClick={playDialogue}
            disabled={loading}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-40 ${
              playing
                ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            {loading ? 'Loading...' : playing ? 'Stop' : played ? 'Play again' : 'Play'}
          </button>
        </div>

        {/* Live transcript: lines appear as they are spoken */}
        {playing && currentLine !== null && (
          <div className="mt-4 pt-4 border-t border-teal-50 space-y-2">
            {dialogue.slice(0, currentLine + 1).map((line, i) => {
              const isCurrent = i === currentLine
              const words = line.text.split(' ')
              const visibleText = isCurrent
                ? words.slice(0, Math.ceil(words.length * lineProgress)).join(' ')
                : line.text
              return (
                <div key={i} className="flex gap-2 items-start">
                  <span className={`text-xs font-semibold shrink-0 w-24 pt-0.5 ${
                    genderForSpeaker(line.speaker) === 'female' ? 'text-teal-600' : 'text-indigo-600'
                  }`}>{line.speaker}:</span>
                  <span className={`text-sm ${isCurrent ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {visibleText}
                    {isCurrent && lineProgress < 1 && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 bg-teal-400 rounded-sm animate-pulse align-text-bottom" />
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Comprehension questions</p>
        {questions.map((q, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-800 mb-2">{i + 1}. {q.question}</p>
            <textarea
              value={answers[i]}
              onChange={e => {
                const next = [...answers]
                next[i] = e.target.value
                setAnswers(next)
              }}
              rows={2}
              placeholder="Your answer..."
              className={`w-full text-sm placeholder-gray-300 border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:border-transparent resize-none transition ${
                results
                  ? results[i]
                    ? 'border-green-300 focus:ring-green-300 text-gray-700'
                    : 'border-red-300 focus:ring-red-300 text-gray-700'
                  : 'border-gray-200 focus:ring-teal-400 text-gray-700'
              }`}
            />
            {results && !results[i] && (
              <p className="text-xs text-red-500 mt-1">
                Try to include: {parseJsonArray<string>(q.expected_keywords).slice(0, 3).join(', ')}
              </p>
            )}
            {results && results[i] && (
              <p className="text-xs text-green-600 mt-1">Good answer ✓</p>
            )}
          </div>
        ))}
      </div>

      {/* Dialogue reveal */}
      {showDialogue && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Full conversation</p>
          <div className="space-y-2">
            {dialogue.map((line, i) => (
              <div key={i} className="flex gap-2">
                <span className={`text-xs font-semibold shrink-0 w-24 pt-0.5 ${
                  genderForSpeaker(line.speaker) === 'female' ? 'text-teal-600' : 'text-indigo-600'
                }`}>{line.speaker}:</span>
                <span className="text-sm text-gray-700">{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!results && (
        <button
          onClick={handleCheck}
          disabled={!allAnswered}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors"
        >
          Check answers
        </button>
      )}

      {results && (
        <button
          onClick={onComplete}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-3 transition-colors"
        >
          {allCorrect ? 'Perfect! Continue →' : 'Continue →'}
        </button>
      )}
    </div>
  )
}
