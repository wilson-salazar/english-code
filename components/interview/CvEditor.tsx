'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAccount } from '@/components/navigation/AppShell'
import Breadcrumbs from '@/components/navigation/Breadcrumbs'
import { useUnsavedWork } from '@/components/navigation/NavigationGuard'
import { postJson } from '@/lib/api'
import { supabase } from '@/lib/supabase'

const MAX_PDF_BYTES = 5 * 1024 * 1024
const MAX_TEXT_LENGTH = 20000

interface SavedCv {
  content: string
  updated_at: string
}

export function formatCvDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function CvEditor() {
  const { user } = useAccount()
  const [saved, setSaved] = useState<SavedCv | null>(null)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCv() {
      const { data, error: loadError } = await supabase
        .from('interview_cvs')
        .select('content, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (loadError) setError('Your CV could not be loaded. Please reload the page.')
      if (data) {
        setSaved(data)
        setText(data.content)
      }
      setLoading(false)
    }

    void loadCv()
    return () => { cancelled = true }
  }, [user.id])

  const cleanText = text.trim()
  const isTooLong = cleanText.length > MAX_TEXT_LENGTH
  const hasChanges = cleanText !== (saved?.content ?? '')
  useUnsavedWork(reading || saving || (hasChanges && cleanText !== ''))

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError('')
    setNotice('')
    if (file.type !== 'application/pdf' || file.size > MAX_PDF_BYTES) {
      setError('Upload a PDF file of up to 5 MB.')
      return
    }

    setReading(true)
    try {
      const response = await postJson('/api/interview/cv-text', { pdf: await readAsBase64(file) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || typeof data.text !== 'string') {
        setError(data.error ?? 'Your CV could not be read. Please try again.')
      } else {
        setText(data.text)
        setNotice(data.tooLong
          ? 'Your CV is longer than 20,000 characters. Shorten it before saving.'
          : 'Review the text below, then save it.')
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    }
    setReading(false)
  }

  async function saveCv() {
    if (!cleanText || isTooLong || !hasChanges) return
    if (saved && !window.confirm('Replace your saved CV with this text?')) return

    setSaving(true)
    setError('')
    setNotice('')
    const { data, error: saveError } = await supabase
      .from('interview_cvs')
      .upsert({ user_id: user.id, content: cleanText, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('content, updated_at')
      .single()

    if (saveError || !data) {
      setError('Your CV could not be saved. Please try again.')
    } else {
      setSaved(data)
      setText(data.content)
      setNotice('Your CV is saved.')
    }
    setSaving(false)
  }

  return (
    <div className="bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Breadcrumbs section="interview" current="Your CV" />
          <div className="text-center">
            <div className="text-sm font-semibold">Your CV</div>
            <div className="text-xs text-indigo-300">
              {saved ? `CV updated on ${formatCvDate(saved.updated_at)}` : 'The base of every interview'}
            </div>
          </div>
          <span className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-5 pb-24 pt-8">
        {loading ? (
          <p className="text-sm text-slate-400">Loading your CV…</p>
        ) : (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={event => void handleFile(event)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={reading || saving}
                className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {reading ? 'Reading your CV…' : saved ? 'Replace with a new PDF' : 'Choose a PDF'}
              </button>
              <span className="text-xs text-slate-400">PDF only, up to 5 MB.</span>
            </div>

            <label htmlFor="cv-text" className="block text-sm font-semibold text-slate-200">CV text</label>
            <p className="text-xs text-slate-400">Review the text before saving. You can remove your phone number or email.</p>
            <textarea
              id="cv-text"
              value={text}
              onChange={event => setText(event.target.value)}
              disabled={reading}
              rows={18}
              placeholder="Choose a PDF to read your CV here."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400 disabled:opacity-50"
            />
            <p className={`text-right text-xs ${isTooLong ? 'text-red-300' : 'text-slate-400'}`}>
              {cleanText.length.toLocaleString('en-US')} / 20,000 characters
            </p>

            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            {notice && <p role="status" className="text-sm text-cyan-300">{notice}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void saveCv()}
                disabled={saving || reading || !cleanText || isTooLong || !hasChanges}
                className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save CV'}
              </button>
              {saved && !hasChanges && (
                <Link
                  href="/interview"
                  className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/5"
                >
                  Start an interview
                </Link>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
