'use client'

import { useState, useRef } from 'react'

interface SpeakingContent {
  prompt: string
  example_answer: string
}

interface SpeakingFeedback {
  summary: string
  vocabulary: string
  fluency: string
  naturalness: string
  improved_version: string
  scores: {
    vocabulary: number
    fluency: number
    naturalness: number
  }
}

interface Props {
  content: Record<string, unknown>
  scenarioTitle: string
  onComplete: () => void
}

type RecordingState = 'idle' | 'recording' | 'done'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any

export default function SpeakingPhase({ content, scenarioTitle, onComplete }: Props) {
  const { prompt, example_answer } = content as unknown as SpeakingContent

  const [recordState, setRecordState] = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null)
  const [loading, setLoading] = useState(false)
  const [showExample, setShowExample] = useState(false)
  const [notSupported, setNotSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionType>(null)

  function startRecording() {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionType }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setNotSupported(true)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionType) => {
      let final = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' '
      }
      setTranscript(final.trim())
    }

    recognition.onend = () => {
      setRecordState('done')
    }

    recognitionRef.current = recognition
    recognition.start()
    setTranscript('')
    setRecordState('recording')
  }

  function stopRecording() {
    recognitionRef.current?.stop()
  }

  async function handleSubmit() {
    if (!transcript.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/evaluate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, scenarioTitle, prompt }),
      })
      const data = await res.json()
      setFeedback(data)
    } catch {
      // silently fail
    }

    setLoading(false)
  }

  function handleRetry() {
    setFeedback(null)
    setTranscript('')
    setRecordState('idle')
    setShowExample(false)
  }

  const avgScore = feedback
    ? Math.round((feedback.scores.vocabulary + feedback.scores.fluency + feedback.scores.naturalness) / 3)
    : null

  if (notSupported) {
    return (
      <div className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-orange-600 uppercase tracking-widest">Speaking</span>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Speak in English</h2>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-5 text-center">
          <p className="text-sm font-semibold text-orange-700 mb-1">Speech recognition not available</p>
          <p className="text-xs text-orange-600">Please use Google Chrome to access this feature.</p>
        </div>
        <button
          onClick={onComplete}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 py-3 transition-colors"
        >
          Skip and continue →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold text-orange-600 uppercase tracking-widest">Speaking</span>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Now you speak</h2>
        <p className="text-sm text-gray-500 mt-1">
          Read the prompt, press Record, and answer in English. Speak clearly.
        </p>
      </div>

      {/* Prompt */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4">
        <p className="text-sm text-orange-900 leading-relaxed">{prompt}</p>
      </div>

      {/* Recorder */}
      {!feedback && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl px-6 py-6 shadow-sm flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              recordState === 'recording' ? 'bg-red-100 animate-pulse' : 'bg-orange-50'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                className={`w-7 h-7 ${recordState === 'recording' ? 'text-red-500' : 'text-orange-400'}`}>
                <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z"/>
                <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z"/>
              </svg>
            </div>

            {recordState === 'idle' && (
              <button
                onClick={startRecording}
                className="px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full text-sm transition-colors"
              >
                Start recording
              </button>
            )}

            {recordState === 'recording' && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-semibold text-red-500">Recording... speak now</p>
                <button
                  onClick={stopRecording}
                  className="px-8 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full text-sm transition-colors"
                >
                  Stop
                </button>
              </div>
            )}

            {recordState === 'done' && (
              <div className="flex gap-2">
                <button
                  onClick={handleRetry}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:border-gray-300 font-semibold rounded-full text-sm transition-colors"
                >
                  Record again
                </button>
                <button
                  onClick={startRecording}
                  className="px-5 py-2.5 bg-orange-100 text-orange-600 hover:bg-orange-200 font-semibold rounded-full text-sm transition-colors"
                >
                  Re-record
                </button>
              </div>
            )}
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">What we heard</p>
              <p className="text-sm text-gray-700 leading-relaxed">{transcript}</p>
            </div>
          )}

          {recordState === 'done' && transcript && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold rounded-xl px-4 py-3 transition-colors"
            >
              {loading ? 'Evaluating...' : 'Get feedback'}
            </button>
          )}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700">Your score</span>
              <span className="text-2xl font-bold text-orange-500">{avgScore}%</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Vocabulary', value: feedback.scores.vocabulary, color: 'bg-indigo-500' },
                { label: 'Fluency', value: feedback.scores.fluency, color: 'bg-orange-500' },
                { label: 'Naturalness', value: feedback.scores.naturalness, color: 'bg-teal-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24">{label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }}/>
                  </div>
                  <span className="text-xs font-mono text-gray-500 w-8 text-right">{value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-sm text-gray-700">{feedback.summary}</p>
            <div className="space-y-2 pt-2 border-t border-gray-50">
              {[
                { label: 'Vocabulary', text: feedback.vocabulary },
                { label: 'Fluency', text: feedback.fluency },
                { label: 'Naturalness', text: feedback.naturalness },
              ].map(({ label, text }) => (
                <div key={label}>
                  <span className="text-xs font-semibold text-orange-600">{label}: </span>
                  <span className="text-xs text-gray-600">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">What you said</p>
            <p className="text-sm text-gray-600 italic">&ldquo;{transcript}&rdquo;</p>
          </div>

          <button
            onClick={() => setShowExample(e => !e)}
            className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors underline"
          >
            {showExample ? 'Hide example answer' : 'See example answer'}
          </button>

          {showExample && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4">
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest mb-2">Example answer</p>
              <p className="text-sm text-orange-900 leading-relaxed">{example_answer}</p>
            </div>
          )}

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
