'use client'

import { MouseEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MisspelledWord } from '@/lib/spelling/checker'

const MENU_WIDTH = 224
const MENU_ROW_HEIGHT = 40

// Both layers must wrap text identically, or the marks drift away from their words.
const LAYER_CLASS =
  'absolute inset-0 overflow-y-scroll whitespace-pre-wrap break-words rounded-2xl border border-transparent p-4 font-sans text-base leading-7 [color-scheme:dark]'

interface SpellCheckedTextareaProps {
  value: string
  misspellings: MisspelledWord[]
  placeholder: string
  label: string
  suggest: (word: string) => string[]
  onChange: (text: string, caret: number | null) => void
}

interface OpenMenu {
  x: number
  y: number
  text: string
  misspelling: MisspelledWord
  options: string[]
}

export default function SpellCheckedTextarea({
  value,
  misspellings,
  placeholder,
  label,
  suggest,
  onChange,
}: SpellCheckedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pendingCaretRef = useRef<number | null>(null)
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null)

  // A menu belongs to the text it was opened on, so any edit closes it.
  const menu = openMenu?.text === value ? openMenu : null

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    if (pendingCaretRef.current !== null) {
      const scrollTop = textarea.scrollTop
      textarea.setSelectionRange(pendingCaretRef.current, pendingCaretRef.current)
      textarea.focus({ preventScroll: true })
      textarea.scrollTop = scrollTop
      pendingCaretRef.current = null
    }
    if (backdropRef.current) backdropRef.current.scrollTop = textarea.scrollTop
  }, [value, misspellings])

  useEffect(() => {
    if (!menu) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [menu])

  function handleContextMenu(event: MouseEvent<HTMLTextAreaElement>) {
    const marks = backdropRef.current?.querySelectorAll('mark') ?? []
    const hitIndex = [...marks].findIndex(mark =>
      [...mark.getClientRects()].some(rect =>
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      )
    )
    const misspelling = misspellings[hitIndex]
    if (!misspelling) {
      setOpenMenu(null)
      return
    }

    event.preventDefault()
    const options = suggest(misspelling.word)
    setOpenMenu({
      x: Math.min(event.clientX, window.innerWidth - MENU_WIDTH - 16),
      y: Math.min(event.clientY, window.innerHeight - MENU_ROW_HEIGHT * Math.max(options.length, 1) - 24),
      text: value,
      misspelling,
      options,
    })
  }

  function replaceWord(replacement: string) {
    if (!menu) return
    const { start, end, word } = menu.misspelling
    setOpenMenu(null)
    if (value.slice(start, end) !== word) return
    pendingCaretRef.current = start + replacement.length
    onChange(value.slice(0, start) + replacement + value.slice(end), null)
  }

  const segments: React.ReactNode[] = []
  let cursor = 0
  misspellings.forEach(({ start, end }) => {
    segments.push(value.slice(cursor, start))
    segments.push(
      <mark
        key={start}
        className="bg-transparent text-red-400 underline decoration-red-400 decoration-wavy underline-offset-4"
      >
        {value.slice(start, end)}
      </mark>
    )
    cursor = end
  })
  segments.push(value.slice(cursor))

  return (
    <div className="relative h-72 rounded-2xl border border-white/10 bg-white/5 focus-within:border-cyan-400/60">
      <div ref={backdropRef} aria-hidden="true" className={`${LAYER_CLASS} pointer-events-none text-slate-100`}>
        {segments}
        {/* Without this, a final line break has no height and the layers stop lining up. */}
        {'​'}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        onChange={event => onChange(event.target.value, event.target.selectionStart)}
        onScroll={event => {
          if (backdropRef.current) backdropRef.current.scrollTop = event.currentTarget.scrollTop
          setOpenMenu(null)
        }}
        onContextMenu={handleContextMenu}
        className={`${LAYER_CLASS} w-full resize-none bg-transparent text-transparent caret-white outline-none selection:bg-cyan-400/30 placeholder:text-slate-500`}
      />

      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Corrections for ${menu.misspelling.word}`}
          style={{ position: 'fixed', left: menu.x, top: menu.y, width: MENU_WIDTH }}
          className="z-50 overflow-hidden rounded-xl border border-white/15 bg-slate-900 py-1 shadow-xl shadow-black/40"
        >
          {menu.options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-slate-400">No suggestions</div>
          ) : (
            menu.options.map(option => (
              <button
                key={option}
                type="button"
                role="menuitem"
                onClick={() => replaceWord(option)}
                className="block w-full px-4 py-2 text-left text-sm text-slate-100 transition-colors hover:bg-white/10"
              >
                {option}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
