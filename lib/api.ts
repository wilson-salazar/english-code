import { supabase } from '@/lib/supabase'

export const SESSION_PROBLEM_EVENT = 'english-code:session-problem'

export type SessionProblem = 'session_expired' | 'session_unverified'

function notifySessionProblem(problem: SessionProblem) {
  window.dispatchEvent(new CustomEvent<SessionProblem>(SESSION_PROBLEM_EVENT, { detail: problem }))
}

function send(path: string, body: unknown, token: string | undefined, signal?: AbortSignal) {
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })
}

export async function postJson(path: string, body: unknown, init?: { signal?: AbortSignal }) {
  const { data: { session } } = await supabase.auth.getSession()
  let response = await send(path, body, session?.access_token, init?.signal)

  // The guard rejects before calling any provider, so retrying after a 401 cannot spend credits twice.
  if (response.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed.session) {
      response = await send(path, body, refreshed.session.access_token, init?.signal)
    }
  }

  if (response.status === 401) {
    notifySessionProblem('session_expired')
  } else if (response.status === 503) {
    const result = await response.clone().json().catch(() => null) as { code?: string } | null
    if (result?.code === 'session_unverified') notifySessionProblem('session_unverified')
  }

  return response
}
