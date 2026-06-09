'use client'

import { useState, useEffect } from 'react'
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
  full_name: string
  levels: { code: string; name: string } | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) { router.replace('/'); return }
    loadData(userId)
  }, [router])

  async function loadData(userId: string) {
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, levels(code, name)')
      .eq('id', userId)
      .single()

    if (!userData) { router.replace('/'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setUser(userData as any)

    const { data: levelData } = await supabase
      .from('users')
      .select('levels(id)')
      .eq('id', userId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const levelId = (levelData?.levels as any)?.id
    if (!levelId) { setLoading(false); return }

    const { data: scenarioList } = await supabase
      .from('scenarios')
      .select('id, title, context, order_index')
      .eq('level_id', levelId)
      .eq('is_published', true)
      .order('order_index')

    const { data: progressList } = await supabase
      .from('user_progress')
      .select('scenario_id, status, score_vocabulary, score_clarity, score_naturalness')
      .eq('user_id', userId)

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
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading your path...</div>
      </div>
    )
  }

  const completed = scenarios.filter(s => s.status === 'completed').length
  const total = scenarios.length

  return (
    <div className="min-h-screen bg-yellow-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600 font-mono text-base font-bold">{'</>'}</span>
            <span className="text-gray-400 font-mono text-sm">English for IT</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-800">{user?.full_name}</div>
            <div className="text-xs text-indigo-500 font-mono">{user?.levels?.code} · {user?.levels?.name}</div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Progress header */}
        <div className="mb-8">
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

        {/* Empty state */}
        {total === 0 && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-400 text-sm">No scenarios available yet for your level.</p>
            <p className="text-gray-300 text-xs mt-1">We&apos;re working on it.</p>
          </div>
        )}

        {/* Scenario list */}
        {total > 0 && (
          <div className="space-y-3">
            {scenarios.map((scenario, i) => {
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
                      {/* Index circle */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isDone ? 'bg-green-100 text-green-600' :
                        isActive ? 'bg-indigo-100 text-indigo-600' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {isDone ? '✓' : String(i + 1)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{scenario.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{scenario.context}</div>
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
                      {isLocked && (
                        <span className="text-gray-300 text-sm">🔒</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
