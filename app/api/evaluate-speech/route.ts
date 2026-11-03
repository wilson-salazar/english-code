import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { exceedsLength, guardRequest, invalidRequestResponse, isOptionalText, tooLargeResponse } from '@/lib/api-guard'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MAX_BODY_BYTES = 32 * 1024

export async function POST(req: NextRequest) {
  const guard = await guardRequest(req, { maxBodyBytes: MAX_BODY_BYTES })
  if (!guard.ok) return guard.response

  const { transcript, scenarioTitle, prompt } = guard.body

  if (typeof transcript !== 'string' || !transcript.trim() || !isOptionalText(scenarioTitle) || !isOptionalText(prompt)) {
    return invalidRequestResponse()
  }
  if (exceedsLength(transcript, 5000) || exceedsLength(prompt, 2000) || exceedsLength(scenarioTitle, 200)) {
    return tooLargeResponse()
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an English teacher evaluating a spoken response from an IT professional learning English. The response was transcribed automatically from speech.

Scenario: "${scenarioTitle}"
Speaking prompt: "${prompt}"
Transcribed response: "${transcript}"

Evaluate the spoken response and return ONLY a valid JSON object with this exact structure:
{
  "summary": "2-3 sentence overall assessment, encouraging but honest",
  "vocabulary": "1 sentence feedback on use of technical vocabulary",
  "fluency": "1 sentence feedback on how naturally and smoothly they expressed their ideas",
  "naturalness": "1 sentence feedback on how natural the English sounds for a professional context",
  "improved_version": "A version of their answer as a confident native English speaker in IT would say it",
  "scores": {
    "vocabulary": <integer 0-100>,
    "fluency": <integer 0-100>,
    "naturalness": <integer 0-100>
  }
}

Note: the text is a speech transcription so ignore capitalization and punctuation issues. Focus on content, vocabulary choice, and natural expression. Be encouraging.`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] ?? '{}')
    if (!parsed.scores) throw new Error('The AI response did not contain scores.')
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Evaluate speech error:', error)
    return NextResponse.json({ error: 'Your feedback could not be generated. Please try again.' }, { status: 500 })
  }
}
