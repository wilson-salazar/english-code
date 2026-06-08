import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { response, scenarioTitle, prompt } = await req.json()

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an English teacher evaluating a response from an IT professional learning English.

Scenario: "${scenarioTitle}"
Task given to the student: "${prompt}"
Student's response: "${response}"

Evaluate the response and return ONLY a valid JSON object with this exact structure:
{
  "summary": "2-3 sentence overall assessment, encouraging but honest",
  "vocabulary": "1 sentence feedback on technical vocabulary usage",
  "clarity": "1 sentence feedback on how clear and understandable the writing is",
  "naturalness": "1 sentence feedback on how natural the English sounds",
  "improved_version": "A rewritten version of their response as a native English speaker in IT would write it",
  "scores": {
    "vocabulary": <integer 0-100>,
    "clarity": <integer 0-100>,
    "naturalness": <integer 0-100>
  }
}

Be encouraging. This person is learning. Focus on what they did well and what to improve.`,
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
