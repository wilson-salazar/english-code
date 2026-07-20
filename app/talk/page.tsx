'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PERSONAL_VOCABULARY_EVENT } from '@/components/FloatingVocabulary'
import { supabase } from '@/lib/supabase'

interface PersonalTerm {
  id: string
  term: string
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
  error?: string
}

type RecordingState = 'idle' | 'recording' | 'review'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any

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
  const recognitionRef = useRef<SpeechRecognitionType>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const initializedRef = useRef(false)

  const speakAssistant = useCallback(async (messageId: string, text: string) => {
    audioRef.current?.pause()
    setSpeakingMessageId(messageId)
    setVisibleAssistantText('')
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
          if (!audio.duration) return
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
      await typeText(text, setVisibleAssistantText)
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
    const { data } = await supabase
      .from('personal_vocabulary')
      .select('id, term')
      .eq('user_id', userId)
      .eq('is_learned', false)
      .order('created_at')
      .limit(10)
    return data ?? []
  }, [])

  const startConversation = useCallback(async (userId: string, userLevel: string, selectedTerms: PersonalTerm[]) => {
    setLoadingTopic(true)
    setError('')
    setMessages([])
    setConversationId(null)
    setTopicTitle('')

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
      const activeTerms = await loadActiveTerms(profile.id)
      setProfileId(profile.id)
      setLevel(userLevel)
      setTerms(activeTerms)
      await startConversation(profile.id, userLevel, activeTerms)
    }

    void initializeTalk()

    return () => {
      recognitionRef.current?.stop()
      audioRef.current?.pause()
    }
  }, [loadActiveTerms, router, startConversation])

  async function handleNewTopic() {
    if (!profileId || loadingTopic || sending) return
    audioRef.current?.pause()
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

  async function sendMessage() {
    const cleanTranscript = transcript.trim()
    if (!conversationId || !cleanTranscript || sending) return

    setSending(true)
    setError('')
    recognitionRef.current?.stop()

    const { data: savedUserMessage, error: userMessageError } = await supabase
      .from('ai_conversation_messages')
      .insert({ conversation_id: conversationId, role: 'user', content: cleanTranscript })
      .select('id, role, content')
      .single()

    if (userMessageError || !savedUserMessage) {
      setError('Your message could not be saved.')
      setSending(false)
      return
    }

    const userMessage = savedUserMessage as ConversationMessage
    const nextHistory = [...messages, userMessage]
    setMessages(nextHistory)
    setTranscript('')
    setRecordingState('idle')

    const response = await fetch('/api/talk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'respond',
        vocabulary: terms.map(item => item.term),
        history: nextHistory.map(item => ({ role: item.role, content: item.content })),
        level,
      }),
    })
    const generated = await response.json() as TalkApiResponse

    if (!response.ok || !generated.message) {
      setError(generated.error ?? 'The AI could not answer. Please try again.')
      setSending(false)
      return
    }

    const { data: savedAssistantMessage, error: assistantMessageError } = await supabase
      .from('ai_conversation_messages')
      .insert({ conversation_id: conversationId, role: 'assistant', content: generated.message })
      .select('id, role, content')
      .single()

    if (assistantMessageError || !savedAssistantMessage) {
      setError('The AI answer could not be saved.')
      setSending(false)
      return
    }

    const assistantMessage = savedAssistantMessage as ConversationMessage
    setMessages(current => [...current, assistantMessage])
    setSending(false)
    await speakAssistant(assistantMessage.id, assistantMessage.content)
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
            <div className="text-sm font-semibold">Talk with AI</div>
            <div className="text-xs text-indigo-300">Voice practice with your own vocabulary</div>
          </div>
          <button
            onClick={handleNewTopic}
            disabled={loadingTopic || sending}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            New topic
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-5 py-6 pb-40">
        <section className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-600/30 via-violet-600/15 to-cyan-500/10 p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            {topicCategory || 'Preparing a random topic'}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white">
            {topicTitle || 'Your next conversation is loading...'}
          </h1>
          <p className="mt-2 text-sm text-slate-300">Every visit starts a different subject from your conversation history.</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
              {terms.map(item => (
                <button
                  key={item.id}
                  onClick={() => markTermLearned(item)}
                  title="Mark as learned"
                  className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:border-green-300/30 hover:bg-green-300/10 hover:text-green-200"
                >
                  {item.term} · Learned ✓
                </button>
              ))}
            </div>
          )}
        </section>

        <section aria-live="polite" className="space-y-4">
          {loadingTopic && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />
              AI is choosing a topic it has never used with you...
            </div>
          )}

          {messages.map(message => {
            const isAssistant = message.role === 'assistant'
            const displayedText = speakingMessageId === message.id ? visibleAssistantText : message.content
            return (
              <article key={message.id} className={`flex gap-3 ${isAssistant ? '' : 'justify-end'}`}>
                {isAssistant && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-sm font-bold">
                    AI
                  </div>
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
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
              {error}
            </div>
          )}
        </section>
      </main>

      <section className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <textarea
            value={transcript}
            onChange={event => { setTranscript(event.target.value); setRecordingState('review') }}
            rows={2}
            placeholder={recordingState === 'recording' ? 'Your words will appear here as you speak...' : 'Speak or type your answer in English...'}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {recordingState !== 'recording' ? (
                <button
                  onClick={startRecording}
                  disabled={loadingTopic || sending || speakingMessageId !== null}
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
            </div>

            <button
              onClick={sendMessage}
              disabled={!transcript.trim() || !conversationId || sending || recordingState === 'recording'}
              className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Send →
            </button>
          </div>

          {speechUnsupported && (
            <p className="mt-2 text-xs text-amber-300">Voice recognition is unavailable in this browser. You can still type your answer.</p>
          )}
        </div>
      </section>
    </div>
  )
}
