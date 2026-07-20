import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { transcript, scenarioTitle, prompt } = await req.json()

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

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] ?? '{}')
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
