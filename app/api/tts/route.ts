import { NextRequest, NextResponse } from 'next/server'
import { exceedsLength, guardRequest, invalidRequestResponse, tooLargeResponse } from '@/lib/api-guard'
import { audioKey, normalizeText, readSavedAudio, saveAudio } from '@/lib/tts-cache'

// Jessa (female) and Adam (male) — ElevenLabs voice library
const VOICE_FEMALE = 'yj30vwTGJxSHezdAGsv9' // Jessa - Easygoing and Effortless
const VOICE_MALE   = 's3TPKV1kjDlVtZbl4Ksh' // Adam - Engaging, Friendly and Bright

// eleven_multilingual_v2 guesses the language from the text, and for a single word
// or a short phrase that guess is wrong some of the time (e.g. "tardigrades" came out
// in Spanish on alternate plays). It does not accept `language_code`, so short texts use
// a model that does and are forced to English; everything in the app is English content.
const SHORT_TEXT_MAX_WORDS = 5
const MAX_BODY_BYTES = 16 * 1024
const MAX_TEXT_LENGTH = 3000
const TTS_FAILED = 'The audio could not be generated. Please try again.'
const VOICE_SETTINGS = {
  stability: 0.55,
  similarity_boost: 0.75,
  speed: 0.8,
}

// A word that plays on its own and is replayed right away arrives twice before the first audio
// is saved; sharing the request keeps it to one call to ElevenLabs.
const pendingAudio = new Map<string, Promise<ArrayBuffer | null>>()

function audioResponse(audio: ArrayBuffer | Buffer, source: 'saved' | 'generated') {
  return new NextResponse(new Uint8Array(audio), {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, max-age=86400',
      'X-Audio-Source': source,
    },
  })
}

async function generateAudio(voiceId: string, text: string, modelSettings: Record<string, string>) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      ...modelSettings,
      voice_settings: VOICE_SETTINGS,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('ElevenLabs error:', res.status, errorText)
    return null
  }

  return res.arrayBuffer()
}

export async function POST(req: NextRequest) {
  const guard = await guardRequest(req, { maxBodyBytes: MAX_BODY_BYTES })
  if (!guard.ok) return guard.response

  const { text, speaker } = guard.body

  if (typeof text !== 'string' || !text.trim()) return invalidRequestResponse()
  if (exceedsLength(text, MAX_TEXT_LENGTH)) return tooLargeResponse()

  const voiceId = speaker === 'male' ? VOICE_MALE : VOICE_FEMALE
  const cleanText = normalizeText(text)
  const isShortText = cleanText.split(' ').length <= SHORT_TEXT_MAX_WORDS
  const modelSettings: Record<string, string> = isShortText
    ? { model_id: 'eleven_turbo_v2_5', language_code: 'en' }
    : { model_id: 'eleven_multilingual_v2' }
  const key = audioKey({
    voiceId,
    modelId: modelSettings.model_id,
    settings: { ...modelSettings, voice_settings: VOICE_SETTINGS },
    text: cleanText,
  })

  const saved = await readSavedAudio(key)
  if (saved) return audioResponse(saved, 'saved')

  const pending = pendingAudio.get(key)
  if (pending) {
    const shared = await pending.catch(() => null)
    return shared ? audioResponse(shared, 'saved') : NextResponse.json({ error: TTS_FAILED }, { status: 500 })
  }

  const request = generateAudio(voiceId, cleanText, modelSettings)
  pendingAudio.set(key, request)
  try {
    const audio = await request
    if (!audio) return NextResponse.json({ error: TTS_FAILED }, { status: 500 })
    await saveAudio(key, audio)
    return audioResponse(audio, 'generated')
  } catch (error) {
    console.error('ElevenLabs error:', error)
    return NextResponse.json({ error: TTS_FAILED }, { status: 500 })
  } finally {
    pendingAudio.delete(key)
  }
}
