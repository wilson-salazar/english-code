'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAccount } from '@/components/navigation/AppShell'
import Breadcrumbs from '@/components/navigation/Breadcrumbs'
import { useUnsavedWork } from '@/components/navigation/NavigationGuard'
import { postJson } from '@/lib/api'
import { supabase } from '@/lib/supabase'

const QUESTION_COUNT = 6
const MAX_ANSWER_LENGTH = 5000
const RECENT_INTERVIEWS = 5
const INTERVIEW_FAILED = 'The interview could not continue. Please try again.'
const CONNECTION_FAILED = 'Could not reach the server. Check your connection and try again.'

interface Turn {
  id: string
  role: 'recruiter' | 'candidate'
  content: string
}

interface ActiveInterview {
  id: string
  focusTitle: string
  // The interview keeps the CV it started with, even if the learner replaces it meanwhile.
  cvText: string
}

interface InterviewFeedback {
  strengths: string[]
  improvements: string[]
  nextStep: string
  improvedAnswers: { question: string; original: string; improved: string }[]
}

type RecordingState = 'idle' | 'recording' | 'review'
type PendingRetry = 'next' | 'feedback' | null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any

async function typeText(text: string, onProgress: (value: string) => void) {
  const step = Math.max(1, Math.ceil(text.length / 100))
  for (let index = step; index <= text.length + step; index += step) {
    onProgress(text.slice(0, Math.min(index, text.length)))
    await new Promise(resolve => setTimeout(resolve, 24))
  }
}

function toApiHistory(turns: Turn[]) {
  return turns.map(turn => ({ role: turn.role, content: turn.content }))
}

export default function InterviewSession() {
  const { user } = useAccount()
  const level = user.levels?.code ?? 'B1'
  const [cvText, setCvText] = useState<string | null>(null)
  const [loadingCv, setLoadingCv] = useState(true)
  const [interview, setInterview] = useState<ActiveInterview | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [acceptedAnswers, setAcceptedAnswers] = useState(0)
  const [finished, setFinished] = useState(false)
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null)
  const [starting, setStarting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [pendingRetry, setPendingRetry] = useState<PendingRetry>(null)
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState('')
  const [speechUnsupported, setSpeechUnsupported] = useState(false)
  const [micError, setMicError] = useState('')
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [visibleText, setVisibleText] = useState('')
  const [speakingFullText, setSpeakingFullText] = useState('')
  const recognitionRef = useRef<SpeechRecognitionType>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const feedbackRef = useRef<HTMLElement | null>(null)
  const startingRef = useRef(false)
  const sendingRef = useRef(false)
  const stickToBottomRef = useRef(true)
  // Identifies the latest playback: audio that finishes loading after the learner skipped it
  // or left must stay silent.
  const playbackIdRef = useRef(0)

  // Unlike Talk, the learner starts the interview on purpose and it cannot be resumed, so it
  // counts as unsaved work from the first question until the feedback arrives.
  useUnsavedWork(
    recordingState === 'recording'
    || transcript.trim() !== ''
    || sending
    || (interview !== null && !feedback)
  )

  const stopAudio = useCallback(() => {
    playbackIdRef.current += 1
    audioRef.current?.pause()
    setSpeakingId(null)
  }, [])

  const discardRecognition = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    recognition.abort()
    recognitionRef.current = null
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadCv() {
      const { data } = await supabase
        .from('interview_cvs')
        .select('content')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      setCvText(data?.content ?? null)
      setLoadingCv(false)
    }

    void loadCv()
    return () => {
      cancelled = true
      discardRecognition()
      stopAudio()
    }
  }, [discardRecognition, stopAudio, user.id])

  useEffect(() => {
    function updateStickToBottom() {
      const distanceFromBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight)
      stickToBottomRef.current = distanceFromBottom < 160
    }
    window.addEventListener('scroll', updateStickToBottom, { passive: true })
    return () => window.removeEventListener('scroll', updateStickToBottom)
  }, [])

  useEffect(() => {
    if (feedback || !stickToBottomRef.current) return
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: speakingId ? 'auto' : 'smooth' })
  }, [turns, visibleText, speakingId, sending, error, feedback])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const speakRecruiter = useCallback(async (turnId: string, text: string, animateText = true) => {
    playbackIdRef.current += 1
    const playbackId = playbackIdRef.current
    const isCurrent = () => playbackIdRef.current === playbackId
    audioRef.current?.pause()
    setSpeakingId(turnId)
    setVisibleText(animateText ? '' : text)
    setSpeakingFullText(text)

    try {
      const response = await postJson('/api/tts', { text, speaker: 'female' })
      if (!response.ok) throw new Error('TTS unavailable')
      const blob = await response.blob()
      if (!isCurrent()) return

      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      await new Promise<void>((resolve, reject) => {
        audio.ontimeupdate = () => {
          if (!animateText || !audio.duration) return
          setVisibleText(text.slice(0, Math.ceil(text.length * (audio.currentTime / audio.duration))))
        }
        audio.onended = () => resolve()
        audio.onpause = () => resolve()
        audio.onerror = () => reject(new Error('Audio playback failed'))
        audio.play().catch(reject)
      })
      URL.revokeObjectURL(url)
      if (isCurrent()) setVisibleText(text)
    } catch {
      if (!isCurrent()) return
      if (animateText) {
        await typeText(text, value => {
          if (isCurrent()) setVisibleText(value)
        })
      } else {
        setVisibleText(text)
      }
    } finally {
      if (isCurrent()) setSpeakingId(null)
    }
  }, [])

  function skipAudio() {
    stopAudio()
    setVisibleText(speakingFullText)
  }

  async function saveRecruiterTurn(interviewId: string, content: string, questionType: string | null) {
    const { data, error: insertError } = await supabase
      .from('interview_turns')
      .insert({ interview_id: interviewId, role: 'recruiter', content, question_type: questionType })
      .select('id')
      .single()
    if (insertError || !data) throw new Error('The recruiter turn could not be saved.')
    return data.id as string
  }

  async function startInterview() {
    if (!cvText || startingRef.current) return
    startingRef.current = true
    setStarting(true)
    setError('')
    setPendingRetry(null)
    stopAudio()
    discardRecognition()

    try {
      const { data: recent } = await supabase
        .from('interviews')
        .select('focus_title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(RECENT_INTERVIEWS)
      const recentFocuses = (recent ?? []).map(item => item.focus_title as string)

      const response = await postJson('/api/interview', { mode: 'start', level, cvText, recentFocuses })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || typeof data.message !== 'string' || typeof data.focusTitle !== 'string') {
        setError(data.error ?? INTERVIEW_FAILED)
        return
      }

      const { data: created, error: createError } = await supabase
        .from('interviews')
        .insert({ user_id: user.id, focus_title: data.focusTitle, question_count: QUESTION_COUNT })
        .select('id')
        .single()
      if (createError || !created) throw new Error('The interview could not be saved.')

      const turnId = await saveRecruiterTurn(created.id, data.message, data.questionType ?? null)
      setInterview({ id: created.id, focusTitle: data.focusTitle, cvText })
      setTurns([{ id: turnId, role: 'recruiter', content: data.message }])
      setAcceptedAnswers(0)
      setFinished(false)
      setFeedback(null)
      setTranscript('')
      setRecordingState('idle')
      void speakRecruiter(turnId, data.message)
    } catch {
      setError(CONNECTION_FAILED)
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }

  async function requestFeedback(active: ActiveInterview, history: Turn[]) {
    setSending(true)
    sendingRef.current = true
    setError('')
    setPendingRetry(null)
    try {
      const response = await postJson('/api/interview', {
        mode: 'feedback',
        level,
        focusTitle: active.focusTitle,
        history: toApiHistory(history),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.feedback) {
        setError(data.error ?? INTERVIEW_FAILED)
        setPendingRetry('feedback')
        return
      }

      await supabase
        .from('interviews')
        .update({ feedback: data.feedback, status: 'finished', finished_at: new Date().toISOString() })
        .eq('id', active.id)
      setFeedback(data.feedback)
    } catch {
      setError(CONNECTION_FAILED)
      setPendingRetry('feedback')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  async function requestNextQuestion(active: ActiveInterview, history: Turn[], accepted: number) {
    setSending(true)
    sendingRef.current = true
    setError('')
    setPendingRetry(null)
    let closedHistory: Turn[] | null = null
    try {
      const response = await postJson('/api/interview', {
        mode: 'next',
        level,
        cvText: active.cvText,
        focusTitle: active.focusTitle,
        acceptedAnswers: accepted,
        history: toApiHistory(history),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || typeof data.message !== 'string') {
        setError(data.error ?? INTERVIEW_FAILED)
        setPendingRetry('next')
        return
      }

      const turnId = await saveRecruiterTurn(active.id, data.message, data.questionType ?? null)
      const nextHistory: Turn[] = [...history, { id: turnId, role: 'recruiter', content: data.message }]
      setTurns(nextHistory)
      if (data.answerAccepted) setAcceptedAnswers(accepted + 1)
      void speakRecruiter(turnId, data.message)
      if (data.finished) {
        setFinished(true)
        closedHistory = nextHistory
      }
    } catch {
      setError(CONNECTION_FAILED)
      setPendingRetry('next')
    } finally {
      sendingRef.current = false
      setSending(false)
    }

    if (closedHistory) await requestFeedback(active, closedHistory)
  }

  async function sendAnswer() {
    const answer = transcript.trim()
    if (!interview || !answer || answer.length > MAX_ANSWER_LENGTH || sendingRef.current) return
    sendingRef.current = true
    discardRecognition()
    stopAudio()

    const { data, error: insertError } = await supabase
      .from('interview_turns')
      .insert({ interview_id: interview.id, role: 'candidate', content: answer })
      .select('id')
      .single()
    if (insertError || !data) {
      sendingRef.current = false
      setError('Your answer could not be saved. Please try again.')
      return
    }

    const history: Turn[] = [...turns, { id: data.id, role: 'candidate', content: answer }]
    setTurns(history)
    setTranscript('')
    setRecordingState('idle')
    sendingRef.current = false
    await requestNextQuestion(interview, history, acceptedAnswers)
  }

  function retry() {
    if (!interview) return
    if (pendingRetry === 'next') void requestNextQuestion(interview, turns, acceptedAnswers)
    if (pendingRetry === 'feedback') void requestFeedback(interview, turns)
  }

  function finishEarly() {
    if (!interview || sendingRef.current) return
    discardRecognition()
    stopAudio()
    setFinished(true)
    void requestFeedback(interview, turns)
  }

  function resetInterview() {
    stopAudio()
    discardRecognition()
    setInterview(null)
    setTurns([])
    setAcceptedAnswers(0)
    setFinished(false)
    setFeedback(null)
    setError('')
    setPendingRetry(null)
    setTranscript('')
    setRecordingState('idle')
  }

  function startRecording() {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionType }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechUnsupported(true)
      return
    }

    stopAudio()
    setMicError('')
    const typedBeforeRecording = transcript
    // Without a usable microphone nothing was recorded: restore what the learner had typed.
    let blocked = false
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
        blocked = true
        setMicError('Microphone access was denied. Please allow microphone access and try again.')
      } else if (event.error === 'audio-capture') {
        blocked = true
        setMicError('No microphone was found. Connect one and try again.')
      }
    }
    recognition.onend = () => {
      if (blocked) {
        setTranscript(typedBeforeRecording)
        setRecordingState('idle')
        return
      }
      setRecordingState('review')
    }
    recognitionRef.current = recognition
    setTranscript('')
    setRecordingState('recording')
    recognition.start()
  }

  function stopRecording() {
    recognitionRef.current?.stop()
  }

  function clearAnswer() {
    discardRecognition()
    setTranscript('')
    setRecordingState('idle')
  }

  const answerTooLong = transcript.trim().length > MAX_ANSWER_LENGTH
  const composerDisabled = !interview || finished || sending || pendingRetry !== null
  const questionNumber = Math.min(acceptedAnswers + 1, QUESTION_COUNT)

  return (
    <div className="bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Breadcrumbs section="interview" current="Practice" />
          <div className="text-center">
            <div className="text-sm font-semibold">Interview</div>
            <div className="text-xs text-indigo-300">{interview ? interview.focusTitle : 'Practice with a recruiter'}</div>
          </div>
          <span className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-5 py-6">
        {loadingCv ? (
          <p className="text-sm text-slate-400">Loading your CV…</p>
        ) : !interview ? (
          <section className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-600/30 via-violet-600/15 to-cyan-500/10 p-6">
            {cvText ? (
              <>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">New interview</div>
                <h1 className="mt-2 text-2xl font-bold text-white">Ready for your interview?</h1>
                <p className="mt-2 text-sm text-slate-300">A recruiter will ask you 6 questions based on your CV.</p>
                <button
                  type="button"
                  onClick={() => void startInterview()}
                  disabled={starting}
                  className="mt-5 rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-40"
                >
                  {starting ? 'Preparing your interview…' : 'Start an interview'}
                </button>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white">Upload your CV first.</h1>
                <p className="mt-2 text-sm text-slate-300">The recruiter asks about your own experience.</p>
                <Link
                  href="/interview/cv"
                  className="mt-5 inline-block rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
                >
                  Upload your CV
                </Link>
              </>
            )}
            {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
          </section>
        ) : (
          <section aria-live="polite" className="space-y-4">
            {turns.map(turn => {
              const isRecruiter = turn.role === 'recruiter'
              const isSpeaking = speakingId === turn.id
              return (
                <article key={turn.id} className={`flex gap-3 ${isRecruiter ? '' : 'justify-end'}`}>
                  {isRecruiter && (
                    <button
                      type="button"
                      onClick={() => isSpeaking ? skipAudio() : void speakRecruiter(turn.id, turn.content, false)}
                      aria-label={isSpeaking ? 'Stop recruiter audio' : 'Replay recruiter message'}
                      title={isSpeaking ? 'Stop audio' : 'Listen again'}
                      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-sm font-bold transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    >
                      J
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[9px] shadow" aria-hidden="true">
                        {isSpeaking ? '■' : '🔊'}
                      </span>
                    </button>
                  )}
                  <div className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isRecruiter
                      ? 'rounded-tl-sm border border-white/10 bg-white/10 text-slate-100'
                      : 'rounded-tr-sm bg-indigo-500 text-white'
                  }`}>
                    {isSpeaking ? visibleText : turn.content}
                    {isSpeaking && (
                      <>
                        <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-cyan-300 align-text-bottom" />
                        <button type="button" onClick={skipAudio} className="mt-3 block text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                          Skip audio →
                        </button>
                      </>
                    )}
                  </div>
                </article>
              )
            })}

            {sending && (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" />
                {finished ? 'Preparing your feedback…' : 'The recruiter is thinking…'}
              </div>
            )}

            {error && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
                <span>{error}</span>
                {pendingRetry && (
                  <button
                    type="button"
                    onClick={retry}
                    disabled={sending}
                    className="shrink-0 rounded-lg bg-red-300/15 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-300/25 disabled:opacity-40"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {feedback && (
              <section ref={feedbackRef} className="space-y-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5" aria-labelledby="interview-feedback-title">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Interview complete</div>
                  <h2 id="interview-feedback-title" className="mt-1 text-xl font-bold text-white">Your feedback</h2>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-emerald-200">Strengths</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                    {feedback.strengths.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-200">What to improve</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                    {feedback.improvements.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-cyan-200">Next step</h3>
                  <p className="mt-2 text-sm text-slate-200">{feedback.nextStep}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-indigo-200">Stronger answers</h3>
                  <div className="mt-2 space-y-3">
                    {feedback.improvedAnswers.map(item => (
                      <div key={item.question} className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                        <p className="font-semibold text-slate-100">{item.question}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">You said</p>
                        <p className="mt-1 text-slate-300">{item.original}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">Try this</p>
                        <p className="mt-1 text-slate-100">{item.improved}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetInterview}
                  className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
                >
                  Start another interview
                </button>
              </section>
            )}
          </section>
        )}
      </main>

      {interview && !feedback && (
        <section className="sticky bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-5 py-4 shadow-2xl shadow-black backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-cyan-300">
                {finished
                  ? 'The interview is over'
                  : speakingId
                    ? 'Listen to the recruiter, then answer'
                    : 'Your turn — answer the question'}
              </span>
              {!finished && <span className="text-slate-400">Question {questionNumber} of {QUESTION_COUNT}</span>}
            </div>
            <textarea
              value={transcript}
              onChange={event => {
                if (recordingState === 'recording') discardRecognition()
                setTranscript(event.target.value)
                setRecordingState('review')
              }}
              disabled={composerDisabled}
              rows={3}
              placeholder={recordingState === 'recording' ? 'Your words will appear here as you speak...' : 'Speak or type your answer in English...'}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400 disabled:opacity-50"
            />
            {answerTooLong && <p role="alert" className="mt-2 text-xs text-red-300">Your answer is too long. Keep it under 5,000 characters.</p>}

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {recordingState !== 'recording' ? (
                  <button
                    onClick={startRecording}
                    disabled={composerDisabled || speakingId !== null}
                    className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-40"
                  >
                    <span aria-hidden="true">🎙</span>
                    {recordingState === 'review' ? 'Record again' : 'Start talking'}
                  </button>
                ) : (
                  <button onClick={stopRecording} className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    Stop
                  </button>
                )}

                {transcript && recordingState !== 'recording' && (
                  <button onClick={clearAnswer} className="px-2 py-2 text-xs font-semibold text-slate-400 hover:text-white">
                    Clear
                  </button>
                )}

                {acceptedAnswers >= 1 && !finished && (
                  <button
                    onClick={finishEarly}
                    disabled={sending || recordingState === 'recording'}
                    className="px-2 py-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
                  >
                    Finish &amp; feedback
                  </button>
                )}
              </div>

              <button
                onClick={() => void sendAnswer()}
                disabled={composerDisabled || !transcript.trim() || answerTooLong || recordingState === 'recording'}
                className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Send →
              </button>
            </div>

            {speechUnsupported && (
              <p className="mt-2 text-xs text-amber-300">Voice recognition is unavailable in this browser. You can still type your answer.</p>
            )}
            {micError && <p className="mt-2 text-xs text-red-300" role="alert">{micError} You can still type your answer.</p>}
          </div>
        </section>
      )}
    </div>
  )
}
