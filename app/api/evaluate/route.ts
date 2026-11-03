import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { exceedsLength, guardRequest, invalidRequestResponse, isOptionalText, tooLargeResponse } from '@/lib/api-guard'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MAX_BODY_BYTES = 32 * 1024

export async function POST(req: NextRequest) {
  const guard = await guardRequest(req, { maxBodyBytes: MAX_BODY_BYTES })
  if (!guard.ok) return guard.response

  const { response, scenarioTitle, prompt } = guard.body

  if (typeof response !== 'string' || !response.trim() || !isOptionalText(scenarioTitle) || !isOptionalText(prompt)) {
    return invalidRequestResponse()
  }
  if (exceedsLength(response, 5000) || exceedsLength(prompt, 2000) || exceedsLength(scenarioTitle, 200)) {
    return tooLargeResponse()
  }

  try {
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
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] ?? '{}')
    if (!parsed.scores) throw new Error('The AI response did not contain scores.')
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Evaluate error:', error)
    return NextResponse.json({ error: 'Your feedback could not be generated. Please try again.' }, { status: 500 })
  }
}
