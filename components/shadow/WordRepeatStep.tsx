'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { wordMatches } from '@/lib/shadow'

interface WordAttemptRecord {
  recognizedText: string | null
  accepted: boolean
  skipped: boolean
}

interface Props {
  word: string
  wordIndex: number
  totalWords: number
  onResolved: (skipped: boolean) => void
}

type ListenState = 'idle' | 'listening' | 'evaluating'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any
const MAX_ATTEMPTS = 3

export default function WordRepeatStep({ word, wordIndex, totalWords, onResolved }: Props) {
  const [attempts, setAttempts] = useState<WordAttemptRecord[]>([])
  const [listenState, setListenState] = useState<ListenState>('idle')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [speechUnsupported, setSpeechUnsupported] = useState(false)
  const [micError, setMicError] = useState('')
  const [slow, setSlow] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionType>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playWord = useCallback(async (playbackRate: number) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word, speaker: 'female' }),
      })
      if (!response.ok) throw new Error('TTS unavailable')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.playbackRate = playbackRate
      audioRef.current = audio
      await new Promise<void>(resolve => {
        audio.onended = () => resolve()
        audio.onerror = () => resolve()
        audio.play().catch(() => resolve())
      })
      URL.revokeObjectURL(url)
    } catch {
      // Audio is a convenience; the word text is always visible on screen.
    }
  }, [word])

  useEffect(() => {
    // A fresh `key={wordIndex}` mount (see ShadowSession) means state above
    // already starts clean for each word — this effect only plays the audio.
    void playWord(1)
    return () => {
      recognitionRef.current?.stop()
      audioRef.current?.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function evaluateAttempt(recognizedText: string | null) {
    const accepted = recognizedText ? wordMatches(recognizedText, word) : false
    setAttempts(previous => {
      const next = [...previous, { recognizedText, accepted, skipped: false }]
      return next
    })
    setListenState('idle')
    if (accepted) {
      onResolved(false)
    }
  }

  function startListening() {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionType }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechUnsupported(true)
      return
    }

    setMicError('')
    setLiveTranscript('')
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    let heard = ''
    recognition.onresult = (event: SpeechRecognitionType) => {
      let text = ''
      for (let index = 0; index < event.results.length; index++) {
        text += `${event.results[index][0].transcript} `
      }
      heard = text.trim()
      setLiveTranscript(heard)
    }
    recognition.onerror = (event: SpeechRecognitionType) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicError('Microphone access was denied. Please allow microphone access and try again.')
      }
    }
    recognition.onend = () => {
      setListenState('evaluating')
      evaluateAttempt(heard || null)
    }

    recognitionRef.current = recognition
    setListenState('listening')
    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
  }

  async function listenMoreSlowly() {
    setSlow(true)
    await playWord(0.7)
    startListening()
  }

  function skipWord() {
    setAttempts(previous => [...previous, { recognizedText: null, accepted: false, skipped: true }])
    onResolved(true)
  }

  const failedAttempts = attempts.filter(attempt => !attempt.accepted && !attempt.skipped).length
  const offerSkip = failedAttempts >= MAX_ATTEMPTS

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Word {wordIndex + 1} of {totalWords}</span>
        {slow && <span className="text-amber-300">Playing slowly</span>}
      </div>

      <div className="rounded-2xl border border-indigo-400/20 bg-white/5 p-6 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Repeat this word</div>
        <div className="mt-2 text-3xl font-bold text-white">{word}</div>
        <button
          type="button"
          onClick={() => void playWord(slow ? 0.7 : 1)}
          className="mt-3 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
        >
          🔊 Listen again
        </button>
      </div>

      {speechUnsupported ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Voice recognition is unavailable in this browser. Please use Google Chrome to practice Shadow.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {listenState === 'idle' && !offerSkip && (
            <button
              type="button"
              onClick={startListening}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
            >
              🎙 {attempts.length === 0 ? 'Your turn — repeat it' : 'Try again'}
            </button>
          )}

          {listenState === 'listening' && (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={stopListening}
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                Stop — I said it
              </button>
              {liveTranscript && <p className="text-xs text-slate-400">Hearing: &ldquo;{liveTranscript}&rdquo;</p>}
            </div>
          )}

          {micError && (
            <p className="text-center text-xs text-red-300" role="alert">{micError}</p>
          )}

          {offerSkip && listenState === 'idle' && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void listenMoreSlowly()}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                🐢 Hear it slower & retry
              </button>
              <button
                type="button"
                onClick={skipWord}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Skip this word →
              </button>
            </div>
          )}
        </div>
      )}

      {attempts.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
            What we heard {attempts.length > 1 && `(${attempts.length} attempts)`}
          </p>
          <ul className="space-y-2.5">
            {attempts.map((attempt, index) => (
              <li key={index} className="space-y-1 text-sm">
                <p className="text-slate-300"><span className="text-cyan-300">AI: </span>{word}</p>
                <p className={
                  attempt.skipped ? 'text-slate-400' : attempt.accepted ? 'text-emerald-300' : 'text-red-300'
                }>
                  <span className="text-slate-400">You: </span>
                  {attempt.skipped
                    ? 'Skipped this word'
                    : attempt.recognizedText || '(no speech detected)'}
                  {!attempt.skipped && (attempt.accepted ? ' ✓' : ' ✗')}
                </p>
                {index < attempts.length - 1 && <hr className="border-white/5" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
