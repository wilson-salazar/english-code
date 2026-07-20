import { NextRequest, NextResponse } from 'next/server'

// Jessa (female) and Adam (male) — ElevenLabs voice library
const VOICE_FEMALE = 'yj30vwTGJxSHezdAGsv9' // Jessa - Easygoing and Effortless
const VOICE_MALE   = 's3TPKV1kjDlVtZbl4Ksh' // Adam - Engaging, Friendly and Bright

export async function POST(req: NextRequest) {
  const { text, speaker } = await req.json()

  const voiceId = speaker === 'male' ? VOICE_MALE : VOICE_FEMALE

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
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
