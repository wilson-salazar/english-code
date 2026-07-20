'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Scenario {
  id: string
  title: string
  context: string
  order_index: number
  status: 'locked' | 'in_progress' | 'completed'
  score: number | null
}

interface User {
  id: string
  full_name: string
  levels: { id: string; code: string; name: string } | null
}

interface LevelOption {
  id: string
  code: string
  name: string
}

interface Stats {
  scenariosCompleted: number
  scenariosTotal: number
  wordsLearned: number
  avgScore: number
  avgVocabulary: number
  avgClarity: number
  avgNaturalness: number
  totalResponses: number
  daysActive: number
  bestSkill: string
}

type DashboardView = 'learning' | 'talk' | 'progress'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [availableLevels, setAvailableLevels] = useState<LevelOption[]>([])
  const [showLevelPicker, setShowLevelPicker] = useState(false)
  const [updatingLevel, setUpdatingLevel] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [activeView, setActiveView] = useState<DashboardView>('learning')

  const loadData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      setLoading(false)
      router.replace('/')
      return
    }

    const { data: levelOptions } = await supabase
      .from('levels')
      .select('id, code, name')
      .order('order_index')
    setAvailableLevels(levelOptions ?? [])

    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name, levels(id, code, name)')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!userData) {
      await supabase.auth.signOut()
      setLoading(false)
      router.replace('/')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setUser(userData as any)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const levelId = (userData.levels as any)?.id
    if (!levelId) { setLoading(false); return }

    const userId = userData.id

    const [{ data: scenarioList }, { data: progressList }, { data: responses }] = await Promise.all([
      supabase.from('scenarios').select('id, title, context, order_index').eq('level_id', levelId).eq('is_published', true).order('order_index'),
      supabase.from('user_progress').select('scenario_id, status, score_vocabulary, score_clarity, score_naturalness').eq('user_id', userId),
      supabase.from('user_responses').select('score_vocabulary, score_clarity, score_naturalness, created_at').eq('user_id', userId),
    ])

    const progressMap = new Map(progressList?.map(p => [p.scenario_id, p]) ?? [])

    const enriched: Scenario[] = (scenarioList ?? []).map((s, i) => {
      const progress = progressMap.get(s.id)
      const prevCompleted = i === 0 || progressMap.get((scenarioList ?? [])[i - 1]?.id)?.status === 'completed'
      let status: Scenario['status'] = 'locked'
      if (progress) {
        status = progress.status as Scenario['status']
      } else if (prevCompleted) {
        status = 'in_progress'
      }
      const scores = progress
        ? [progress.score_vocabulary, progress.score_clarity, progress.score_naturalness].filter(Boolean) as number[]
        : []
      const score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
      return { ...s, status, score }
    })

    setScenarios(enriched)

    // Calculate stats
    const currentScenarioIds = new Set((scenarioList ?? []).map(s => s.id))
    const completedProgress = progressList?.filter(
      p => p.status === 'completed' && currentScenarioIds.has(p.scenario_id)
    ) ?? []
    const completedIds = completedProgress.map(p => p.scenario_id)

    let wordsLearned = 0
    if (completedIds.length > 0) {
      const { count } = await supabase
        .from('vocabulary')
        .select('id', { count: 'exact', head: true })
        .in('scenario_id', completedIds)
      wordsLearned = count ?? 0
    }

    const avgVocabulary = completedProgress.length
      ? Math.round(completedProgress.reduce((s, p) => s + (p.score_vocabulary ?? 0), 0) / completedProgress.length)
      : 0
    const avgClarity = completedProgress.length
      ? Math.round(completedProgress.reduce((s, p) => s + (p.score_clarity ?? 0), 0) / completedProgress.length)
      : 0
    const avgNaturalness = completedProgress.length
      ? Math.round(completedProgress.reduce((s, p) => s + (p.score_naturalness ?? 0), 0) / completedProgress.length)
      : 0
    const avgScore = completedProgress.length
      ? Math.round((avgVocabulary + avgClarity + avgNaturalness) / 3)
      : 0

    const skillMap = { Vocabulary: avgVocabulary, Clarity: avgClarity, Naturalness: avgNaturalness }
    const bestSkill = avgScore > 0
      ? Object.entries(skillMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
      : '—'

    const uniqueDays = new Set(
      (responses ?? []).map(r => new Date(r.created_at).toDateString())
    ).size

    setStats({
      scenariosCompleted: completedProgress.length,
      scenariosTotal: scenarioList?.length ?? 0,
      wordsLearned,
      avgScore,
      avgVocabulary,
      avgClarity,
      avgNaturalness,
      totalResponses: responses?.length ?? 0,
      daysActive: uniqueDays,
      bestSkill,
    })

    setLoading(false)
  }, [router])

  useEffect(() => {
    async function initializeDashboard() {
      await loadData()
    }

    void initializeDashboard()
  }, [loadData])

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
    if (!user || user.levels?.id === level.id) {
      setShowLevelPicker(false)
      return
    }

    setUpdatingLevel(true)
    const { error } = await supabase
      .from('users')
      .update({ level_id: level.id })
      .eq('id', user.id)

    if (!error) {
      setShowLevelPicker(false)
      setLoading(true)
      await loadData()
    }
    setUpdatingLevel(false)
  }

  if (loading) {
    return (
      <div className="learning-theme min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading your path...</div>
      </div>
    )
  }

  const completed = scenarios.filter(s => s.status === 'completed').length
  const total = scenarios.length

  return (
    <div className="learning-theme min-h-screen bg-yellow-50">
      {/* Top bar */}
      <header className="relative border-b border-white/10 bg-slate-950/90 px-6 py-4 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600 font-mono text-base font-bold">{'</>'}</span>
            <span className="text-gray-400 font-mono text-sm">English Code</span>
          </div>
          <div className="text-right pr-12 sm:pr-0">
            <div className="text-sm font-semibold text-slate-100">{user?.full_name}</div>
            <button
              onClick={() => setShowLevelPicker(value => !value)}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-mono transition-colors"
            >
              {user?.levels?.code} · {user?.levels?.name} · Change
            </button>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label="Log out"
          className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 sm:px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-60"
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
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <div className="text-sm font-semibold text-indigo-950">Choose a learning program</div>
                <div className="text-xs text-indigo-600 mt-0.5">You can switch levels anytime. Your progress is preserved.</div>
              </div>
              <button
                onClick={() => setShowLevelPicker(false)}
                className="text-xs text-indigo-400 hover:text-indigo-600"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {availableLevels.map(level => {
                const isCurrent = user?.levels?.id === level.id
                return (
                  <button
                    key={level.id}
                    onClick={() => handleLevelChange(level)}
                    disabled={updatingLevel}
                    className={`rounded-xl border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                      isCurrent
                        ? 'border-indigo-500 bg-white ring-1 ring-indigo-500'
                        : 'border-indigo-100 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold text-indigo-600">{level.code}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{level.name}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-start">
        <aside className="w-full shrink-0 md:sticky md:top-6 md:w-56">
          <nav aria-label="Dashboard sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80 p-2 shadow-xl shadow-black/10 md:flex-col">
            {([
              { id: 'learning', label: 'Learning path', description: 'Lessons and scenarios' },
              { id: 'talk', label: 'Talk with AI', description: 'Voice conversation' },
              { id: 'progress', label: 'Progress', description: 'KPIs and skills' },
            ] as Array<{ id: DashboardView; label: string; description: string }>).map(item => {
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
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
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-8">

        {activeView === 'talk' && (
        <section className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-600/30 via-violet-600/15 to-cyan-500/10 p-8 text-white shadow-xl shadow-black/20">
          <div className="flex items-center justify-between gap-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">New practice space</div>
              <h2 className="mt-2 text-xl font-bold">Talk with AI</h2>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-300">
                Start a new voice conversation and practice the words you have saved.
              </p>
            </div>
            <button
              onClick={() => router.push('/talk')}
              className="shrink-0 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-cyan-300"
            >
              Start talking →
            </button>
          </div>
        </section>
        )}

        {/* Stats section */}
        {activeView === 'progress' && stats && (
          <section>
            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Your activity</div>
              <h1 className="mt-1 text-2xl font-bold text-slate-100">Progress and KPIs</h1>
              <p className="mt-1 text-sm text-slate-400">
                These indicators update as you complete lessons and submit responses.
              </p>
            </div>

            {/* KPI grid */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                {
                  label: 'Scenarios done',
                  value: `${stats.scenariosCompleted}/${stats.scenariosTotal}`,
                  icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
                  color: 'text-green-600',
                  bg: 'bg-green-50',
                },
                {
                  label: 'Words learned',
                  value: stats.wordsLearned,
                  icon: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25',
                  color: 'text-indigo-600',
                  bg: 'bg-indigo-50',
                  stroke: true,
                },
                {
                  label: 'Avg score',
                  value: `${stats.avgScore}%`,
                  icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
                  color: 'text-violet-600',
                  bg: 'bg-violet-50',
                },
                {
                  label: 'Responses written',
                  value: stats.totalResponses,
                  icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10',
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                  stroke: true,
                },
                {
                  label: 'Days active',
                  value: stats.daysActive,
                  icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                  stroke: true,
                },
                {
                  label: 'Best skill',
                  value: stats.bestSkill,
                  icon: 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z',
                  color: 'text-rose-600',
                  bg: 'bg-rose-50',
                },
              ].map(({ label, value, icon, color, bg, stroke }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 shadow-sm">
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                      fill={stroke ? 'none' : 'currentColor'}
                      stroke={stroke ? 'currentColor' : 'none'}
                      strokeWidth={stroke ? 1.5 : 0}
                      className={`w-4 h-4 ${color}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
                    </svg>
                  </div>
                  <div className="text-lg font-bold text-slate-100">{value}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>

            {/* Skill breakdown */}
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Skill breakdown</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Vocabulary', value: stats.avgVocabulary, color: 'bg-indigo-500' },
                  { label: 'Clarity', value: stats.avgClarity, color: 'bg-violet-500' },
                  { label: 'Naturalness', value: stats.avgNaturalness, color: 'bg-blue-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }}/>
                    </div>
                    <span className="text-xs font-mono text-gray-500 w-8 text-right">{value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Learning path */}
        {activeView === 'learning' && (
        <section>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Your learning path</h1>
            <p className="text-sm text-gray-600 mt-1">
              {total === 0
                ? 'Scenarios are being prepared. Check back soon.'
                : `${completed} of ${total} scenarios completed`}
            </p>
            {total > 0 && (
              <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>

          {total === 0 && (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-400 text-sm">No scenarios available yet for your level.</p>
              <p className="text-gray-300 text-xs mt-1">We&apos;re working on it.</p>
            </div>
          )}

          {total > 0 && (
            <div className="space-y-3">
              {scenarios.map(scenario => {
                const isActive = scenario.status === 'in_progress'
                const isDone = scenario.status === 'completed'
                const isLocked = scenario.status === 'locked'

                return (
                  <button
                    key={scenario.id}
                    onClick={() => !isLocked && router.push(`/scenario/${scenario.id}`)}
                    disabled={isLocked}
                    className={`w-full text-left rounded-2xl border px-5 py-4 transition-all ${
                      isDone
                        ? 'border-green-200 bg-white hover:border-green-300'
                        : isActive
                        ? 'border-indigo-200 bg-white shadow-md hover:shadow-lg cursor-pointer'
                        : 'border-gray-200 bg-white opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isDone ? 'bg-green-100' : isActive ? 'bg-indigo-100' : 'bg-gray-100'
                        }`}>
                          {isDone ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-600">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/>
                            </svg>
                          ) : isActive ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-indigo-600">
                              <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
                              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{scenario.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{scenario.context}</div>
                          <div className="flex items-center gap-1 mt-1.5">
                            {[
                              { label: 'Read', icon: 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z' },
                              { label: 'Quiz', icon: 'M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6ZM10 18a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3Z' },
                              { label: 'Write', icon: 'M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828Z' },
                            ].map(({ label, icon }) => (
                              <span key={label} className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                                isDone ? 'bg-green-50 text-green-600' :
                                isActive ? 'bg-indigo-50 text-indigo-500' :
                                'bg-gray-50 text-gray-400'
                              }`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                  <path fillRule="evenodd" d={icon} clipRule="evenodd"/>
                                </svg>
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isDone && scenario.score !== null && (
                          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            {scenario.score}%
                          </span>
                        )}
                        {isActive && (
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                            Start →
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
        )}
        </div>
      </main>
    </div>
  )
}
