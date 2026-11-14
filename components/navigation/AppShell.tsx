'use client'

import { createContext, ReactNode, Suspense, useCallback, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GuardedLink, NavigationGuardProvider, useGuardedAction } from './NavigationGuard'
import { SECTIONS, SectionId, sectionFromLocation, sectionHref } from './sections'

export interface LevelOption {
  id: string
  code: string
  name: string
}

export interface AccountUser {
  id: string
  full_name: string
  levels: LevelOption | null
}

interface Account {
  user: AccountUser
  levels: LevelOption[]
  changeLevel: (level: LevelOption) => Promise<boolean>
}

const AccountContext = createContext<Account | null>(null)

export function useAccount() {
  const account = useContext(AccountContext)
  if (!account) throw new Error('useAccount must be used inside AppShell')
  return account
}

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AccountUser | null>(null)
  const [levels, setLevels] = useState<LevelOption[]>([])

  const loadUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return null

    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name, levels(id, code, name)')
      .eq('auth_user_id', authUser.id)
      .single()
    return userData as AccountUser | null
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadAccount() {
      const [account, { data: levelOptions }] = await Promise.all([
        loadUser(),
        supabase.from('levels').select('id, code, name').order('order_index'),
      ])
      if (cancelled) return

      if (!account) {
        await supabase.auth.signOut()
        router.replace('/')
        return
      }
      setLevels(levelOptions ?? [])
      setUser(account)
    }

    void loadAccount()
    return () => { cancelled = true }
  }, [loadUser, router])

  const changeLevel = useCallback(async (level: LevelOption) => {
    if (!user || user.levels?.id === level.id) return true

    const { error } = await supabase
      .from('users')
      .update({ level_id: level.id })
      .eq('id', user.id)
    if (error) return false

    const refreshed = await loadUser()
    if (refreshed) setUser(refreshed)
    return true
  }, [loadUser, user])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading...
      </div>
    )
  }

  return (
    <AccountContext.Provider value={{ user, levels, changeLevel }}>
      <NavigationGuardProvider>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <AccountHeader />
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-start">
            <aside className="learning-theme w-full shrink-0 md:sticky md:top-6 md:w-56">
              <Suspense fallback={<SectionNav active={null} />}>
                <ActiveSectionNav />
              </Suspense>
            </aside>
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </div>
      </NavigationGuardProvider>
    </AccountContext.Provider>
  )
}

function AccountHeader() {
  const router = useRouter()
  const guardedAction = useGuardedAction()
  const { user, levels, changeLevel } = useAccount()
  const [showLevelPicker, setShowLevelPicker] = useState(false)
  const [updatingLevel, setUpdatingLevel] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const { error } = await supabase.auth.signOut()

    if (error) {
      setSigningOut(false)
      return
    }

    router.replace('/')
    router.refresh()
  }

  async function handleLevelChange(level: LevelOption) {
    setUpdatingLevel(true)
    if (await changeLevel(level)) setShowLevelPicker(false)
    setUpdatingLevel(false)
  }

  return (
    <div className="learning-theme">
      <header className="relative border-b border-white/10 bg-slate-950/90 px-6 py-4 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-[#41c300]">{'</>'}</span>
            <span className="text-gray-400 font-mono text-sm">English Code</span>
          </div>
          <div className="text-right pr-12 sm:pr-0">
            <div className="text-sm font-semibold text-slate-100">{user.full_name}</div>
            <button
              onClick={() => setShowLevelPicker(value => !value)}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-mono transition-colors"
            >
              {user.levels?.code} · {user.levels?.name} · Change
            </button>
          </div>
        </div>
        <button
          onClick={() => guardedAction(() => void handleSignOut())}
          disabled={signingOut}
          aria-label="Log out"
          className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 sm:px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-red-300/30 hover:bg-red-400/10 hover:text-red-200 disabled:cursor-wait disabled:opacity-60"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          </svg>
          <span className="hidden sm:inline">{signingOut ? 'Logging out...' : 'Log out'}</span>
        </button>
      </header>

      {showLevelPicker && (
        <div className="border-b border-white/10 bg-slate-900 px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Choose a learning program</div>
                <div className="mt-0.5 text-xs text-indigo-300">You can switch levels anytime. Your progress is preserved.</div>
              </div>
              <button
                onClick={() => setShowLevelPicker(false)}
                className="text-xs text-indigo-400 hover:text-indigo-600"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {levels.map(level => {
                const isCurrent = user.levels?.id === level.id
                return (
                  <button
                    key={level.id}
                    onClick={() => handleLevelChange(level)}
                    disabled={updatingLevel}
                    className={`rounded-xl border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                      isCurrent
                        ? 'border-indigo-400 bg-indigo-500/15 ring-1 ring-indigo-400'
                        : 'border-white/10 bg-white/5 hover:border-indigo-400/50'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold text-indigo-600">{level.code}</div>
                    <div className="mt-0.5 text-xs text-slate-300">{level.name}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActiveSectionNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return <SectionNav active={sectionFromLocation(pathname, searchParams.get('section'))} />
}

function SectionNav({ active }: { active: SectionId | null }) {
  return (
    <nav aria-label="Main sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80 p-2 shadow-xl shadow-black/10 md:flex-col">
      {SECTIONS.map(item => {
        const isActive = active === item.id
        return (
          <GuardedLink
            key={item.id}
            href={sectionHref(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`min-w-max rounded-xl px-4 py-3 text-left transition-colors md:min-w-0 ${
              isActive
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/30'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="block text-sm font-semibold">{item.label}</span>
            <span className={`mt-0.5 hidden text-[11px] md:block ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
              {item.description}
            </span>
          </GuardedLink>
        )
      })}
    </nav>
  )
}
