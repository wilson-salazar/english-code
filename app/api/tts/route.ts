import { NextRequest, NextResponse } from 'next/server'

// Jessa (female) and Adam (male) — ElevenLabs voice library
const VOICE_FEMALE = 'yj30vwTGJxSHezdAGsv9' // Jessa - Easygoing and Effortless
const VOICE_MALE   = 's3TPKV1kjDlVtZbl4Ksh' // Adam - Engaging, Friendly and Bright

// eleven_multilingual_v2 guesses the language from the text, and for a single word
// or a short phrase that guess is wrong some of the time (e.g. "tardigrades" came out
// in Spanish on alternate plays). It does not accept `language_code`, so short texts use
// a model that does and are forced to English; everything in the app is English content.
const SHORT_TEXT_MAX_WORDS = 5

export async function POST(req: NextRequest) {
  const { text, speaker } = await req.json()

  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const voiceId = speaker === 'male' ? VOICE_MALE : VOICE_FEMALE
  const isShortText = text.trim().split(/\s+/).length <= SHORT_TEXT_MAX_WORDS
  const modelSettings = isShortText
    ? { model_id: 'eleven_turbo_v2_5', language_code: 'en' }
    : { model_id: 'eleven_multilingual_v2' }

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
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
        speed: 0.8,
      },
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('ElevenLabs error:', res.status, errorText)
    return NextResponse.json({ error: 'TTS failed', detail: errorText }, { status: 500 })
  }

  const audioBuffer = await res.arrayBuffer()

  return new NextResponse(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
