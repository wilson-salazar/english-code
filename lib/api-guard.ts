import { NextRequest, NextResponse } from 'next/server'
import { createClient, isAuthRetryableFetchError } from '@supabase/supabase-js'

const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

type GuardResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse }

function sessionExpiredResponse() {
  return NextResponse.json(
    { error: 'Sign in again, then retry.', code: 'session_expired' },
    { status: 401 }
  )
}

function sessionUnverifiedResponse() {
  return NextResponse.json(
    { error: 'Your session could not be verified. Please try again.', code: 'session_unverified' },
    { status: 503 }
  )
}

export function tooLargeResponse() {
  return NextResponse.json(
    { error: 'This text is too long. Please shorten it and try again.', code: 'too_large' },
    { status: 413 }
  )
}

export function invalidRequestResponse() {
  return NextResponse.json(
    { error: 'This request is not valid.', code: 'invalid_request' },
    { status: 400 }
  )
}

async function checkSession(request: NextRequest) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return sessionExpiredResponse()

  try {
    const { data: { user }, error } = await authClient.auth.getUser(token)
    if (error) {
      if (isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500) {
        console.error('Session check failed:', error)
        return sessionUnverifiedResponse()
      }
      return sessionExpiredResponse()
    }
    if (!user || user.is_anonymous) return sessionExpiredResponse()
    return null
  } catch (error) {
    console.error('Session check failed:', error)
    return sessionUnverifiedResponse()
  }
}

// Every route that spends provider credits starts here, so nothing reaches a provider
// without a verified session and a body of a reasonable size.
export async function guardRequest(
  request: NextRequest,
  { maxBodyBytes }: { maxBodyBytes: number }
): Promise<GuardResult> {
  const rejectedSession = await checkSession(request)
  if (rejectedSession) return { ok: false, response: rejectedSession }

  if (Number(request.headers.get('content-length') ?? 0) > maxBodyBytes) {
    return { ok: false, response: tooLargeResponse() }
  }

  const text = await request.text()
  if (Buffer.byteLength(text) > maxBodyBytes) {
    return { ok: false, response: tooLargeResponse() }
  }

  try {
    const body = JSON.parse(text)
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return { ok: false, response: invalidRequestResponse() }
    }
    return { ok: true, body }
  } catch {
    return { ok: false, response: invalidRequestResponse() }
  }
}

export function isOptionalText(value: unknown) {
  return value === undefined || typeof value === 'string'
}

export function isOptionalTextArray(value: unknown) {
  return value === undefined || (Array.isArray(value) && value.every(item => typeof item === 'string'))
}

export function exceedsLength(value: unknown, maxLength: number): boolean {
  if (Array.isArray(value)) return value.some(item => exceedsLength(item, maxLength))
  return typeof value === 'string' && value.length > maxLength
}
