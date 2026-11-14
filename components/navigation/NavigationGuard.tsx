'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ComponentProps, createContext, ReactNode, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'

interface NavigationGuard {
  setSource: (id: string, active: boolean) => void
  hasUnsavedWork: () => boolean
  confirmLeave: (leave: () => void) => void
}

const NavigationGuardContext = createContext<NavigationGuard | null>(null)

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const sourcesRef = useRef(new Set<string>())
  const dialogRef = useRef<HTMLDialogElement>(null)
  const stayRef = useRef<HTMLButtonElement>(null)
  const [hasSources, setHasSources] = useState(false)
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null)

  const setSource = useCallback((id: string, active: boolean) => {
    if (active) sourcesRef.current.add(id)
    else sourcesRef.current.delete(id)
    setHasSources(sourcesRef.current.size > 0)
  }, [])

  const hasUnsavedWork = useCallback(() => sourcesRef.current.size > 0, [])

  const confirmLeave = useCallback((leave: () => void) => {
    if (sourcesRef.current.size === 0) {
      leave()
      return
    }
    setPendingLeave(() => leave)
  }, [])

  const guard = useMemo(() => ({ setSource, hasUnsavedWork, confirmLeave }), [setSource, hasUnsavedWork, confirmLeave])

  useEffect(() => {
    if (!hasSources) return

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [hasSources])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (pendingLeave && !dialog.open) {
      dialog.showModal()
      stayRef.current?.focus()
    } else if (!pendingLeave && dialog.open) {
      dialog.close()
    }
  }, [pendingLeave])

  function leave() {
    const action = pendingLeave
    setPendingLeave(null)
    action?.()
  }

  return (
    <NavigationGuardContext.Provider value={guard}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="leave-dialog-title"
        aria-describedby="leave-dialog-message"
        onClose={() => setPendingLeave(null)}
        onClick={event => {
          if (event.target === event.currentTarget) setPendingLeave(null)
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-0 text-slate-100 shadow-2xl shadow-black/50 backdrop:bg-black/60"
      >
        <div className="p-6">
          <h2 id="leave-dialog-title" className="text-base font-semibold">Leave this page?</h2>
          <p id="leave-dialog-message" className="mt-2 text-sm text-slate-300">
            You have unsaved work. If you leave now, it will be lost.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={leave}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-red-300/30 hover:bg-red-400/10 hover:text-red-200"
            >
              Leave
            </button>
            <button
              ref={stayRef}
              type="button"
              onClick={() => setPendingLeave(null)}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
            >
              Stay
            </button>
          </div>
        </div>
      </dialog>
    </NavigationGuardContext.Provider>
  )
}

export function useUnsavedWork(active: boolean) {
  const guard = useContext(NavigationGuardContext)
  const id = useId()

  useEffect(() => {
    if (!guard || !active) return
    guard.setSource(id, true)
    return () => guard.setSource(id, false)
  }, [guard, id, active])
}

export function useGuardedAction() {
  const guard = useContext(NavigationGuardContext)
  return useCallback((action: () => void) => {
    if (guard) guard.confirmLeave(action)
    else action()
  }, [guard])
}

type GuardedLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & { href: string }

export function GuardedLink({ href, onNavigate, ...props }: GuardedLinkProps) {
  const guard = useContext(NavigationGuardContext)
  const router = useRouter()

  return (
    <Link
      {...props}
      href={href}
      onNavigate={event => {
        onNavigate?.(event)
        if (!guard?.hasUnsavedWork()) return
        event.preventDefault()
        guard.confirmLeave(() => router.push(href))
      }}
    />
  )
}
