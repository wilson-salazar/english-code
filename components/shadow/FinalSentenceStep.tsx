'use client'

import { useRef, useState } from 'react'
import { sentenceMatches } from '@/lib/shadow'

interface Props {
  sentence: string
  onFinished: () => void
}

type RecordState = 'idle' | 'recording' | 'done'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any

export default function FinalSentenceStep({ sentence, onFinished }: Props) {
  const [recordState, setRecordState] = useState<RecordState>('idle')
  const [transcript, setTranscript] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [speechUnsupported, setSpeechUnsupported] = useState(false)
  const [micError, setMicError] = useState('')
  const recognitionRef = useRef<SpeechRecognitionType>(null)

  async function playSentence() {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence, speaker: 'female' }),
      })
      if (!response.ok) return
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch {
      // Audio is a convenience; the sentence text is always visible.
    }
  }

  function startRecording() {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionType }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechUnsupported(true)
      return
    }

    setMicError('')
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionType) => {
      let heard = ''
      for (let index = 0; index < event.results.length; index++) {
        heard += `${event.results[index][0].transcript} `
      }
      setTranscript(heard.trim())
    }
    recognition.onerror = (event: SpeechRecognitionType) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicError('Microphone access was denied. Please allow microphone access and try again.')
      }
    }
    recognition.onend = () => setRecordState('done')

    recognitionRef.current = recognition
    setTranscript('')
    setRecordState('recording')
    recognition.start()
  }

  function stopRecording() {
    recognitionRef.current?.stop()
  }

  function handleRetry() {
    setTranscript('')
    setRecordState('idle')
    setSubmitted(false)
  }

  const matched = submitted ? sentenceMatches(transcript, sentence) : null

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-400/20 bg-white/5 p-6 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Final step</div>
        <p className="mt-2 text-lg font-semibold text-white">Now say the whole sentence, start to finish</p>
        <p className="mt-2 text-sm text-slate-300">&ldquo;{sentence}&rdquo;</p>
        <button
          type="button"
          onClick={() => void playSentence()}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/20"
        >
          🔊 Listen again
        </button>
      </div>

      {speechUnsupported ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Voice recognition is unavailable in this browser. Please use Google Chrome to practice Shadowing.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {recordState === 'idle' && (
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
            >
              🎙 Start recording
            </button>
          )}
          {recordState === 'recording' && (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              Stop
            </button>
          )}
          {micError && <p className="text-center text-xs text-red-300" role="alert">{micError}</p>}
        </div>
      )}

      {(transcript || recordState === 'done') && (
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">What we heard</p>
          <textarea
            value={transcript}
            onChange={event => { setTranscript(event.target.value); setSubmitted(false) }}
            rows={2}
            placeholder="Type what you said..."
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
          />
        </div>
      )}

      {matched !== null && (
        <p className={`text-center text-sm font-semibold ${matched ? 'text-emerald-300' : 'text-amber-300'}`}>
          {matched ? '✓ That matches the sentence perfectly!' : 'Close — keep practicing this one on your own time.'}
        </p>
      )}

      {recordState === 'done' && transcript && !submitted && (
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Check my sentence
        </button>
      )}

      {submitted && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onFinished}
            className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            Finish exercise →
          </button>
        </div>
      )}
    </div>
  )
}
