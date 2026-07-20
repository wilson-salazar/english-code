'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface PersonalTerm {
  id: string
  term: string
  is_learned: boolean
  spanish_meaning: string | null
}

interface TranslationResponse {
  translations?: Array<{ term: string; meaning: string }>
}

export const PERSONAL_VOCABULARY_EVENT = 'personal-vocabulary-changed'

export default function FloatingVocabulary() {
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [terms, setTerms] = useState<PersonalTerm[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const translationsInProgressRef = useRef(new Set<string>())

  const loadVocabulary = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      setUserId(null)
      setTerms([])
      setIsOpen(false)
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle()

    if (!profile) return
    setUserId(profile.id)

    const { data } = await supabase
      .from('personal_vocabulary')
      .select('id, term, is_learned, spanish_meaning')
      .eq('user_id', profile.id)
      .eq('is_learned', false)
      .order('created_at', { ascending: false })

    const vocabulary = data ?? []
    setTerms(vocabulary)

    const missingMeanings = vocabulary
      .filter(item => !item.spanish_meaning && !translationsInProgressRef.current.has(item.id))
      .slice(0, 10)

    if (missingMeanings.length > 0) {
      missingMeanings.forEach(item => translationsInProgressRef.current.add(item.id))
      void (async () => {
        try {
          const response = await fetch('/api/vocabulary/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terms: missingMeanings.map(item => item.term) }),
          })
          const result = await response.json() as TranslationResponse
          if (!response.ok || !result.translations) return

          const meanings = new Map(result.translations.map(item => [item.term.toLocaleLowerCase(), item.meaning]))
          await Promise.all(missingMeanings.map(item => {
            const spanishMeaning = meanings.get(item.term.toLocaleLowerCase())
            if (!spanishMeaning) return Promise.resolve()
            return supabase
              .from('personal_vocabulary')
              .update({ spanish_meaning: spanishMeaning })
              .eq('id', item.id)
          }))

          setTerms(current => current.map(item => ({
            ...item,
            spanish_meaning: meanings.get(item.term.toLocaleLowerCase()) ?? item.spanish_meaning,
          })))
          window.dispatchEvent(new Event(PERSONAL_VOCABULARY_EVENT))
        } finally {
          missingMeanings.forEach(item => translationsInProgressRef.current.delete(item.id))
        }
      })()
    }
  }, [])

  useEffect(() => {
    async function initializeVocabulary() {
      await loadVocabulary()
    }

    void initializeVocabulary()

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadVocabulary()
    })
    const handleVocabularyChange = () => { void loadVocabulary() }
    window.addEventListener(PERSONAL_VOCABULARY_EVENT, handleVocabularyChange)

    return () => {
      authListener.subscription.unsubscribe()
      window.removeEventListener(PERSONAL_VOCABULARY_EVENT, handleVocabularyChange)
    }
  }, [loadVocabulary])

  async function handleAddTerm(event: FormEvent) {
    event.preventDefault()
    const cleanTerm = term.trim().replace(/\s+/g, ' ')
    if (!userId || !cleanTerm) return

    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('personal_vocabulary')
      .insert({ user_id: userId, term: cleanTerm })

    if (error?.code === '23505') {
      setMessage('This word or phrase is already in your list.')
    } else if (error) {
      setMessage('We could not save it. Please try again.')
    } else {
      setTerm('')
      setMessage('Saved for your next AI conversation.')
      await loadVocabulary()
      window.dispatchEvent(new Event(PERSONAL_VOCABULARY_EVENT))
    }

    setSaving(false)
  }

  async function markAsLearned(id: string) {
    const { error } = await supabase
      .from('personal_vocabulary')
      .update({ is_learned: true, learned_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setTerms(current => current.filter(item => item.id !== id))
      window.dispatchEvent(new Event(PERSONAL_VOCABULARY_EVENT))
    }
  }

  return (
    <div className={`fixed right-4 z-50 sm:right-5 ${pathname === '/talk' ? 'bottom-52 sm:bottom-48' : 'bottom-4 sm:bottom-5'}`}>
      {isOpen ? (
        <section
          aria-label="Personal vocabulary"
          className="w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 bg-indigo-600 px-5 py-4 text-white">
            <div>
              <h2 className="font-semibold">My new words</h2>
              <p className="mt-0.5 text-xs text-indigo-200">AI will use up to 10 in each new topic.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close vocabulary"
              className="rounded-lg p-1 text-indigo-200 transition-colors hover:bg-indigo-500 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleAddTerm} className="border-b border-gray-100 p-4">
            <label htmlFor="personal-term" className="mb-1.5 block text-xs font-semibold text-gray-600">
              New word or phrase
            </label>
            <div className="flex gap-2">
              <input
                id="personal-term"
                value={term}
                onChange={event => { setTerm(event.target.value); setMessage('') }}
                disabled={!userId}
                maxLength={120}
                placeholder={userId ? 'e.g. delicate balance' : 'Sign in to save new words'}
                className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!userId || saving || !term.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {message && (
              <p className={`mt-2 text-xs ${message.startsWith('Saved') ? 'text-green-600' : 'text-amber-600'}`} role="status">
                {message}
              </p>
            )}
          </form>

          <div className="max-h-72 overflow-y-auto p-4">
            {terms.length === 0 ? (
              <div className="py-5 text-center">
                <div className="text-3xl">✨</div>
                <p className="mt-2 text-sm font-medium text-gray-700">Your list is empty</p>
                <p className="mt-1 text-xs text-gray-400">Add anything you want to practice later.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {terms.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                    <span className="min-w-0 break-words">
                      <span className="block text-sm font-medium text-gray-700">{item.term}</span>
                      <span className="mt-0.5 block text-xs text-indigo-500">
                        {item.spanish_meaning || 'Traduciendo…'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => markAsLearned(item.id)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-green-600 transition-colors hover:bg-green-100"
                    >
                      Learned ✓
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section
          aria-label="Quick vocabulary entry"
          className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-indigo-100 bg-white p-3 shadow-xl shadow-indigo-200/60"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <div>
                <h2 className="text-xs font-bold text-gray-800">Save a new word</h2>
                <p className="text-[11px] text-gray-400">Use it later in Talk with AI</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setIsOpen(true); setMessage('') }}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              My list {terms.length > 0 ? `(${terms.length})` : ''}
            </button>
          </div>

          <form onSubmit={handleAddTerm} className="flex gap-2">
            <label htmlFor="quick-personal-term" className="sr-only">New word or phrase</label>
            <input
              id="quick-personal-term"
              value={term}
              onChange={event => { setTerm(event.target.value); setMessage('') }}
              disabled={!userId}
              maxLength={120}
              placeholder={userId ? 'Word or phrase...' : 'Sign in to save words'}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
            />
            <button
              type="submit"
              aria-label="Save word"
              disabled={!userId || saving || !term.trim()}
              className="rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-35"
            >
              +
            </button>
          </form>
          {message && (
            <p className={`mt-2 text-xs ${message.startsWith('Saved') ? 'text-green-600' : 'text-amber-600'}`} role="status">
              {message}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
