'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PERSONAL_VOCABULARY_EVENT } from '@/components/FloatingVocabulary'
import { supabase } from '@/lib/supabase'

interface PersonalTerm {
  id: string
  term: string
  spanish_meaning: string | null
}

interface ConversationMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
}

interface TalkApiResponse {
  topic_title?: string
  topic_category?: string
  message?: string
  words_used?: string[]
  feedback?: ConversationFeedback
  error?: string
}

interface ConversationFeedback {
  summary: string
  strengths: string[]
  improvements: string[]
  next_step: string
}

type RecordingState = 'idle' | 'recording' | 'review'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any
const MAX_USER_TURNS = 5

function highlightedText(text: string, terms: string[]) {
  if (terms.length === 0) return text
  const escaped = terms
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (escaped.length === 0) return text

  const expression = new RegExp(`(${escaped.join('|')})`, 'gi')
  const normalizedTerms = new Set(terms.map(term => term.toLowerCase()))

  return text.split(expression).map((part, index) =>
    normalizedTerms.has(part.toLowerCase()) ? (
      <mark key={`${part}-${index}`} className="rounded bg-amber-100 px-0.5 text-amber-900">
        {part}
      </mark>
    ) : part
  )
}

async function typeText(text: string, onProgress: (value: string) => void) {
  const step = Math.max(1, Math.ceil(text.length / 100))
  for (let index = step; index <= text.length + step; index += step) {
    onProgress(text.slice(0, Math.min(index, text.length)))
    await new Promise(resolve => setTimeout(resolve, 24))
  }
}

export default function TalkWithAiPage() {
  const router = useRouter()
  const pathname = usePathname()
  const isOpenMode = pathname === '/talk/open'
  const [profileId, setProfileId] = useState<string | null>(null)
  const [level, setLevel] = useState('B1')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [topicTitle, setTopicTitle] = useState('')
  const [topicCategory, setTopicCategory] = useState('')
  const [terms, setTerms] = useState<PersonalTerm[]>([])
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loadingTopic, setLoadingTopic] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState('')
  const [speechUnsupported, setSpeechUnsupported] = useState(false)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [visibleAssistantText, setVisibleAssistantText] = useState('')
  const [speakingFullText, setSpeakingFullText] = useState('')
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(null)
  const [conversationFinished, setConversationFinished] = useState(false)
  const [pendingHistory, setPendingHistory] = useState<ConversationMessage[] | null>(null)
  const recognitionRef = useRef<SpeechRecognitionType>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const feedbackRef = useRef<HTMLElement | null>(null)
  const initializedRef = useRef(false)
  const sendingRef = useRef(false)

  const speakAssistant = useCallback(async (messageId: string, text: string, animateText = true) => {
    audioRef.current?.pause()
    setSpeakingMessageId(messageId)
    setVisibleAssistantText(animateText ? '' : text)
    setSpeakingFullText(text)

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker: 'female' }),
      })
      if (!response.ok) throw new Error('TTS unavailable')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      await Promise.race([
        new Promise<void>((resolve, reject) => {
        audio.ontimeupdate = () => {
          if (!animateText || !audio.duration) return
          const visibleCharacters = Math.ceil(text.length * (audio.currentTime / audio.duration))
          setVisibleAssistantText(text.slice(0, visibleCharacters))
        }
        audio.onended = () => resolve()
        audio.onpause = () => resolve()
        audio.onerror = () => reject(new Error('Audio playback failed'))
        audio.play().catch(reject)
        }),
        new Promise<void>(resolve => {
          window.setTimeout(() => {
            audio.pause()
            resolve()
          }, 45000)
        }),
      ])

      URL.revokeObjectURL(url)
      setVisibleAssistantText(text)
    } catch {
      if (animateText) {
        await typeText(text, setVisibleAssistantText)
      } else {
        setVisibleAssistantText(text)
      }
    } finally {
      setSpeakingMessageId(null)
    }
  }, [])

  function skipAssistantAudio() {
    audioRef.current?.pause()
    setVisibleAssistantText(speakingFullText)
    setSpeakingMessageId(null)
  }

  const loadActiveTerms = useCallback(async (userId: string) => {
    const result = await supabase
      .from('personal_vocabulary')
      .select('id, term, spanish_meaning')
      .eq('user_id', userId)
      .eq('is_learned', false)
      .order('created_at')
      .limit(10)

    if (!result.error) return result.data ?? []

    const fallback = await supabase
      .from('personal_vocabulary')
      .select('id, term')
      .eq('user_id', userId)
      .eq('is_learned', false)
      .order('created_at')
      .limit(10)

    if (fallback.error) {
      console.error('Could not load conversation vocabulary:', fallback.error)
      return []
    }
    return (fallback.data ?? []).map(item => ({ ...item, spanish_meaning: null }))
  }, [])

  const startConversation = useCallback(async (userId: string, userLevel: string, selectedTerms: PersonalTerm[]) => {
    setLoadingTopic(true)
    setError('')
    setMessages([])
    setConversationId(null)
    setTopicTitle('')
    setFeedback(null)
    setConversationFinished(false)
    setPendingHistory(null)

    const { data: previous } = await supabase
      .from('ai_conversations')
      .select('topic_title')
      .eq('user_id', userId)
      .order('created_at')

    const previousTopics = (previous ?? []).map(item => item.topic_title)

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          vocabulary: selectedTerms.map(item => item.term),
          previousTopics,
          level: userLevel,
        }),
      })
      const generated = await response.json() as TalkApiResponse

      if (!response.ok || !generated.topic_title || !generated.topic_category || !generated.message) {
        setError(generated.error ?? 'A new topic could not be created. Please try again.')
        setLoadingTopic(false)
        return
      }

      const { data: conversation, error: conversationError } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: userId,
          topic_title: generated.topic_title,
          topic_category: generated.topic_category,
          vocabulary_terms: selectedTerms.map(item => item.term),
        })
        .select('id')
        .single()

      if (conversationError?.code === '23505') {
        previousTopics.push(generated.topic_title)
        continue
      }

      if (conversationError || !conversation) {
        setError('The conversation could not be saved. Please try again.')
        setLoadingTopic(false)
        return
      }

      const { data: savedMessage, error: messageError } = await supabase
        .from('ai_conversation_messages')
        .insert({ conversation_id: conversation.id, role: 'assistant', content: generated.message })
        .select('id, role, content')
        .single()

      if (messageError || !savedMessage) {
        setError('The opening message could not be saved.')
        setLoadingTopic(false)
        return
      }

      const opening = savedMessage as ConversationMessage
      setConversationId(conversation.id)
      setTopicTitle(generated.topic_title)
      setTopicCategory(generated.topic_category)
      setMessages([opening])
      setLoadingTopic(false)
      await speakAssistant(opening.id, opening.content)
      return
    }

    setError('The AI repeated a previous topic. Please request another one.')
    setLoadingTopic(false)
  }, [speakAssistant])

  const startOpenConversation = useCallback(async () => {
    audioRef.current?.pause()
    setLoadingTopic(true)
    setError('')
    setMessages([])
    setConversationId(null)
    setTopicTitle('Start with your idea')
    setTopicCategory('Open conversation')
    setTerms([])
    setTranscript('')
    setRecordingState('idle')
    setFeedback(null)
    setConversationFinished(false)
    setPendingHistory(null)

    setLoadingTopic(false)
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    async function initializeTalk() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('id, levels(code)')
        .eq('auth_user_id', authUser.id)
        .single()

      if (!profile) {
        router.replace('/')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userLevel = (profile.levels as any)?.code ?? 'B1'
      setProfileId(profile.id)
      setLevel(userLevel)
      if (isOpenMode) {
        await startOpenConversation()
      } else {
        const activeTerms = await loadActiveTerms(profile.id)
        setTerms(activeTerms)
        await startConversation(profile.id, userLevel, activeTerms)
      }
    }

    void initializeTalk()

    return () => {
      recognitionRef.current?.stop()
      audioRef.current?.pause()
    }
  }, [isOpenMode, loadActiveTerms, router, startConversation, startOpenConversation])

  useEffect(() => {
    if (!profileId || isOpenMode) return
    const refreshTerms = () => {
      void loadActiveTerms(profileId).then(setTerms)
    }
    window.addEventListener(PERSONAL_VOCABULARY_EVENT, refreshTerms)
    return () => window.removeEventListener(PERSONAL_VOCABULARY_EVENT, refreshTerms)
  }, [isOpenMode, loadActiveTerms, profileId])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    return () => window.clearTimeout(timer)
  }, [feedback])

  async function handleNewTopic() {
    if (!profileId || loadingTopic || sending) return
    audioRef.current?.pause()
    if (isOpenMode) {
      await startOpenConversation()
      return
    }
    const activeTerms = await loadActiveTerms(profileId)
    setTerms(activeTerms)
    setTranscript('')
    setRecordingState('idle')
    await startConversation(profileId, level, activeTerms)
  }

  function startRecording() {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionType }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechUnsupported(true)
      return
    }

    audioRef.current?.pause()
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
    recognition.onend = () => setRecordingState('review')
    recognitionRef.current = recognition
    setTranscript('')
    setRecordingState('recording')
    recognition.start()
  }

  function stopRecording() {
    recognitionRef.current?.stop()
  }

  function retryRecording() {
    recognitionRef.current?.stop()
    setTranscript('')
    setRecordingState('idle')
  }

  function releaseSending() {
    sendingRef.current = false
    setSending(false)
  }

  async function sendMessage() {
    const cleanTranscript = transcript.trim()
    if (!cleanTranscript || sendingRef.current || pendingHistory) return

    sendingRef.current = true
    setSending(true)
    setError('')
    recognitionRef.current?.stop()

    let activeConversationId = conversationId
    if (!activeConversationId && isOpenMode && profileId) {
      const now = new Date()
      const { data: conversation, error: conversationError } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: profileId,
          topic_title: `Open conversation ${now.toISOString()}`,
          topic_category: 'Open conversation',
          vocabulary_terms: [],
        })
        .select('id')
        .single()

      if (conversationError || !conversation) {
        setError('The open conversation could not be created. Please try again.')
        releaseSending()
        return
      }
      activeConversationId = conversation.id
      setConversationId(conversation.id)
    }

    if (!activeConversationId) {
      releaseSending()
      return
    }

    const { data: savedUserMessage, error: userMessageError } = await supabase
      .from('ai_conversation_messages')
      .insert({ conversation_id: activeConversationId, role: 'user', content: cleanTranscript })
      .select('id, role, content')
      .single()

    if (userMessageError || !savedUserMessage) {
      setError('Your message could not be saved.')
      releaseSending()
      return
    }

    const userMessage = savedUserMessage as ConversationMessage
    const nextHistory = [...messages, userMessage]
    setMessages(nextHistory)
    setTranscript('')
    setRecordingState('idle')

    if (nextHistory.filter(item => item.role === 'user').length >= MAX_USER_TURNS) {
      await requestFeedback(nextHistory)
      return
    }

    await requestAssistantResponse(nextHistory, activeConversationId)
  }

  async function requestAssistantResponse(history: ConversationMessage[], targetConversationId = conversationId) {
    if (!targetConversationId) {
      setError('The conversation is not ready. Please try again.')
      releaseSending()
      return
    }
    try {
      const response = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          mode: isOpenMode ? 'open' : 'vocabulary',
          vocabulary: terms.map(item => item.term),
          history: history.map(item => ({ role: item.role, content: item.content })),
          level,
        }),
      })
      const generated = await response.json() as TalkApiResponse

      if (!response.ok || !generated.message) {
        setError(generated.error ?? 'The AI could not answer. Retry without recording your answer again.')
        setPendingHistory(history)
        releaseSending()
        return
      }

      const { data: savedAssistantMessage, error: assistantMessageError } = await supabase
        .from('ai_conversation_messages')
        .insert({ conversation_id: targetConversationId, role: 'assistant', content: generated.message })
        .select('id, role, content')
        .single()

      if (assistantMessageError || !savedAssistantMessage) {
        setError('The AI answer could not be saved.')
        setPendingHistory(history)
        releaseSending()
        return
      }

      const assistantMessage = savedAssistantMessage as ConversationMessage
      setMessages(current => [...current, assistantMessage])
      setPendingHistory(null)
      releaseSending()
      await speakAssistant(assistantMessage.id, assistantMessage.content)
    } catch {
      setError('The AI connection was interrupted. Your answer is safe; please retry.')
      setPendingHistory(history)
      releaseSending()
    }
  }

  async function retryAssistantResponse() {
    if (!pendingHistory || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    setError('')
    await requestAssistantResponse(pendingHistory)
  }

  async function requestFeedback(history: ConversationMessage[]) {
    if (!conversationId) {
      releaseSending()
      return
    }

    const response = await fetch('/api/talk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'feedback',
        history: history.map(item => ({ role: item.role, content: item.content })),
        level,
      }),
    })
    const generated = await response.json() as TalkApiResponse

    if (!response.ok || !generated.message || !generated.feedback) {
      setError(generated.error ?? 'Your feedback could not be generated. Please try again.')
      releaseSending()
      return
    }

    const { data: savedClosing, error: closingError } = await supabase
      .from('ai_conversation_messages')
      .insert({ conversation_id: conversationId, role: 'assistant', content: generated.message })
      .select('id, role, content')
      .single()

    if (closingError || !savedClosing) {
      setError('Your feedback could not be saved.')
      releaseSending()
      return
    }

    const closingMessage = savedClosing as ConversationMessage
    setMessages(current => [...current, closingMessage])
    setFeedback(generated.feedback)
    setConversationFinished(true)
    setTranscript('')
    setRecordingState('idle')
    setPendingHistory(null)
    releaseSending()
    await speakAssistant(closingMessage.id, closingMessage.content)
  }

  async function finishConversation() {
    if (sendingRef.current || conversationFinished || messages.every(item => item.role !== 'user')) return
    recognitionRef.current?.stop()
    skipAssistantAudio()
    sendingRef.current = true
    setSending(true)
    setError('')
    await requestFeedback(messages)
  }

  async function markTermLearned(term: PersonalTerm) {
    const { error: updateError } = await supabase
      .from('personal_vocabulary')
      .update({ is_learned: true, learned_at: new Date().toISOString() })
      .eq('id', term.id)

    if (!updateError) {
      setTerms(current => current.filter(item => item.id !== term.id))
      window.dispatchEvent(new Event(PERSONAL_VOCABULARY_EVENT))
    }
  }

  const userTurnCount = messages.filter(message => message.role === 'user').length

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            ← Dashboard
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold">{isOpenMode ? 'Open conversation' : 'Talk with AI'}</div>
            <div className="text-xs text-indigo-300">
              {isOpenMode ? 'Bring any question or topic' : 'Voice practice with your own vocabulary'}
            </div>
          </div>
          <button
            onClick={handleNewTopic}
            disabled={loadingTopic || sending}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            {isOpenMode ? 'New conversation' : 'New topic'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-5 py-6 pb-56">
        <section className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-600/30 via-violet-600/15 to-cyan-500/10 p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            {topicCategory || (isOpenMode ? 'Open conversation' : 'Preparing a random topic')}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              {topicTitle || (isOpenMode ? 'Start with your idea' : 'Your next conversation is loading...')}
            </h1>
            {!isOpenMode && <button
              type="button"
              onClick={() => speakingMessageId === 'topic-title'
                ? skipAssistantAudio()
                : void speakAssistant('topic-title', topicTitle, false)}
              disabled={!topicTitle}
              aria-label={speakingMessageId === 'topic-title' ? 'Stop topic title audio' : 'Listen to topic title'}
              title={speakingMessageId === 'topic-title' ? 'Stop title audio' : 'Listen to title'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-base transition-all hover:scale-105 hover:bg-cyan-300/20 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span aria-hidden="true">{speakingMessageId === 'topic-title' ? '■' : '🔊'}</span>
            </button>}
          </div>
          <p className="mt-2 text-sm text-slate-300">
            {isOpenMode
              ? 'You begin the dialogue. Ask a question or introduce any subject you want to explore in English.'
              : 'Every visit starts a different subject from your conversation history.'}
          </p>
        </section>

        {!isOpenMode && <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Words in this conversation</h2>
              <p className="text-xs text-slate-400">Click a word when you no longer need to practice it.</p>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{terms.length}/10</span>
          </div>
          {terms.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-xs text-slate-400">
              Add words with the floating button. They will be included when you request a new topic.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {terms.map(item => {
                const pronunciationId = `term-${item.id}`
                const isPronouncing = speakingMessageId === pronunciationId
                return (
                <div
                  key={item.id}
                  className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 transition-colors hover:border-green-300/30 hover:bg-green-300/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-amber-100">{item.term}</span>
                    <button
                      type="button"
                      onClick={() => isPronouncing
                        ? skipAssistantAudio()
                        : void speakAssistant(pronunciationId, item.term, false)}
                      aria-label={isPronouncing ? `Stop pronunciation of ${item.term}` : `Listen to pronunciation of ${item.term}`}
                      title={isPronouncing ? 'Stop pronunciation' : 'Listen to pronunciation'}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-xs transition-all hover:scale-105 hover:bg-cyan-300/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    >
                      <span aria-hidden="true">{isPronouncing ? '■' : '🔊'}</span>
                    </button>
                  </div>
                  <span className="mt-0.5 block text-xs text-indigo-200">
                    {item.spanish_meaning || 'Traduciendo…'}
                  </span>
                  <button
                    type="button"
                    onClick={() => markTermLearned(item)}
                    title="Mark as learned"
                    className="mt-1 block text-left text-[10px] font-semibold uppercase tracking-wide text-green-300/80 hover:text-green-200"
                  >
                    Mark learned ✓
                  </button>
                </div>
                )
              })}
            </div>
          )}
        </section>}

        <section aria-live="polite" className="space-y-4">
          {loadingTopic && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />
              {isOpenMode ? 'Preparing your open conversation...' : 'AI is choosing a topic it has never used with you...'}
            </div>
          )}

          {messages.map(message => {
            const isAssistant = message.role === 'assistant'
            const displayedText = speakingMessageId === message.id ? visibleAssistantText : message.content
            return (
              <article key={message.id} className={`flex gap-3 ${isAssistant ? '' : 'justify-end'}`}>
                {isAssistant && (
                  <button
                    type="button"
                    onClick={() => speakingMessageId === message.id
                      ? skipAssistantAudio()
                      : void speakAssistant(message.id, message.content, false)}
                    aria-label={speakingMessageId === message.id ? 'Stop AI audio' : 'Replay AI message'}
                    title={speakingMessageId === message.id ? 'Stop audio' : 'Listen again'}
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-sm font-bold transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  >
                    AI
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[9px] shadow" aria-hidden="true">
                      {speakingMessageId === message.id ? '■' : '🔊'}
                    </span>
                  </button>
                )}
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isAssistant
                    ? 'rounded-tl-sm border border-white/10 bg-white/10 text-slate-100'
                    : 'rounded-tr-sm bg-indigo-500 text-white'
                }`}>
                  {isAssistant ? highlightedText(displayedText, terms.map(item => item.term)) : displayedText}
                  {speakingMessageId === message.id && (
                    <>
                      <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-cyan-300 align-text-bottom" />
                      <button
                        type="button"
                        onClick={skipAssistantAudio}
                        className="mt-3 block text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                      >
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
              AI is thinking...
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
              <span>{error}</span>
              {pendingHistory && (
                <button
                  type="button"
                  onClick={retryAssistantResponse}
                  disabled={sending}
                  className="shrink-0 rounded-lg bg-red-300/15 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-300/25 disabled:opacity-40"
                >
                  Retry AI response
                </button>
              )}
            </div>
          )}

          {feedback && (
            <section ref={feedbackRef} className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5" aria-labelledby="conversation-feedback-title">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Conversation complete</div>
                  <h2 id="conversation-feedback-title" className="mt-1 text-xl font-bold text-white">Your feedback</h2>
                </div>
                <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-xs text-emerald-200">{userTurnCount} responses</span>
              </div>
              <p className="rounded-xl bg-black/15 px-4 py-3 text-sm leading-relaxed text-slate-200">{feedback.summary}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-emerald-300">What you did well</h3>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {feedback.strengths.map((item, index) => <li key={index}>✓ {item}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-amber-300">What to improve</h3>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {feedback.improvements.map((item, index) => <li key={index}>→ {item}</li>)}
                  </ul>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                <span className="font-semibold text-cyan-300">Next step: </span>{feedback.next_step}
              </div>
            </section>
          )}
        </section>
      </main>

      <section className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-5 py-4 shadow-2xl shadow-black backdrop-blur">
        <div className="mx-auto max-w-3xl">
          {conversationFinished ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-emerald-300">Practice complete</div>
                <p className="text-xs text-slate-400">Review your feedback above or start another conversation.</p>
              </div>
              <button
                onClick={handleNewTopic}
                className="shrink-0 rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400"
              >
                {isOpenMode ? 'New conversation →' : 'New topic →'}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-cyan-300">
                  {loadingTopic
                    ? 'Preparing the conversation…'
                    : pendingHistory
                      ? 'Your answer is saved — retry the AI response'
                      : speakingMessageId
                        ? 'Listen to the AI, then answer'
                        : isOpenMode && messages.length === 0
                          ? 'Your turn — start with any question or topic'
                          : 'Your turn — answer the AI question'}
                </span>
                <span className="text-slate-400">Response {Math.min(userTurnCount + 1, MAX_USER_TURNS)} of {MAX_USER_TURNS}</span>
              </div>
              <textarea
                value={transcript}
                onChange={event => { setTranscript(event.target.value); setRecordingState('review') }}
                disabled={loadingTopic || sending || pendingHistory !== null}
                rows={2}
                placeholder={recordingState === 'recording'
                  ? 'Your words will appear here as you speak...'
                  : isOpenMode && messages.length === 0
                    ? 'What would you like to talk about?'
                    : 'Speak or type your answer in English...'}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400 disabled:opacity-50"
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {recordingState !== 'recording' ? (
                    <button
                      onClick={startRecording}
                      disabled={loadingTopic || sending || pendingHistory !== null || speakingMessageId !== null}
                      className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-40"
                    >
                      <span aria-hidden="true">🎙</span>
                      {recordingState === 'review' ? 'Record again' : 'Start talking'}
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                      Stop
                    </button>
                  )}

                  {transcript && recordingState !== 'recording' && (
                    <button onClick={retryRecording} className="px-2 py-2 text-xs font-semibold text-slate-400 hover:text-white">
                      Clear
                    </button>
                  )}

                  {userTurnCount >= 2 && (
                    <button
                      onClick={finishConversation}
                      disabled={sending || recordingState === 'recording'}
                      className="px-2 py-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
                    >
                      Finish & feedback
                    </button>
                  )}
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!transcript.trim() || (!conversationId && !isOpenMode) || sending || pendingHistory !== null || recordingState === 'recording'}
                  className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {userTurnCount + 1 >= MAX_USER_TURNS ? 'Send & get feedback →' : 'Send →'}
                </button>
              </div>

              {speechUnsupported && (
                <p className="mt-2 text-xs text-amber-300">Voice recognition is unavailable in this browser. You can still type your answer.</p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
