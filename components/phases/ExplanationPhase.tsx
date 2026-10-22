'use client'

import { useRef, useState } from 'react'
import { parseJsonArray } from '@/lib/content'

interface Rule {
  title: string
  structure: string
  explanation: string
  examples: string[]
}

interface ExplanationContent {
  topic: string
  summary: string
  rules: Rule[]
  common_mistakes: string[]
}

interface Props {
  content: Record<string, unknown>
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

export default function ExplanationPhase({ content, onComplete }: Props) {
  const raw = content as unknown as ExplanationContent
  const rules = parseJsonArray<Rule>(raw.rules)
  const commonMistakes = parseJsonArray<string>(raw.common_mistakes)

  const [speakingKey, setSpeakingKey] = useState<string | null>(null)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  async function speak(key: string, text: string) {
    if (speakingKey === key) {
      currentAudioRef.current?.pause()
      setSpeakingKey(null)
      return
    }
    currentAudioRef.current?.pause()
    setSpeakingKey(null)

    setLoadingKey(key)
    const audio = await fetchAudio(text)
    setLoadingKey(null)
    if (!audio) return

    currentAudioRef.current = audio
    setSpeakingKey(key)
    await playAudio(audio)
    setSpeakingKey(cur => (cur === key ? null : cur))
  }

  function SpeakerButton({ id, text }: { id: string; text: string }) {
    const isLoading = loadingKey === id
    const isSpeaking = speakingKey === id
    return (
      <button
        onClick={() => speak(id, text)}
        disabled={isLoading}
        aria-label={isSpeaking ? 'Stop audio' : 'Listen'}
        title={isSpeaking ? 'Stop' : 'Listen'}
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
          isSpeaking ? 'bg-indigo-400/15 text-cyan-300' : 'bg-white/5 text-slate-400 hover:bg-indigo-400/10 hover:text-cyan-300'
        }`}
      >
        {isLoading ? (
          <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`}>
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z"/>
            <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z"/>
          </svg>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Explanation</span>
        <h2 className="text-xl font-bold text-gray-900 mt-1">{raw.topic}</h2>
        <p className="text-sm text-gray-500 mt-1">{raw.summary}</p>
      </div>

      <div className="space-y-4">
        {rules.map((rule, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900">{rule.title}</span>
              <SpeakerButton id={`rule-${i}`} text={rule.examples.join('. ')} />
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="text-xs font-mono text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 inline-block">
                {rule.structure}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{rule.explanation}</p>
              <div className="space-y-1.5 pt-1">
                {rule.examples.map((ex, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <span className="text-xs text-gray-300 mt-0.5">›</span>
                    <span className="text-sm text-gray-600 italic">{ex}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {commonMistakes.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest mb-2">Common mistakes</p>
          <div className="space-y-1.5">
            {commonMistakes.map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-orange-400 text-xs mt-0.5">✗</span>
                <span className="text-sm text-orange-900">{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onComplete}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-3 transition-colors"
      >
        Continue →
      </button>
    </div>
  )
}
