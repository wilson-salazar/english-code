import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  exceedsLength,
  guardRequest,
  invalidRequestResponse,
  isOptionalText,
  isOptionalTextArray,
  tooLargeResponse,
} from '@/lib/api-guard'

const MAX_BODY_BYTES = 32 * 1024

interface ShadowGenerateRequest {
  level?: string
  recentSentences?: string[]
  previousTopic?: string
}

const MAX_GENERATION_ATTEMPTS = 3

interface ShadowGenerateResult {
  sentence: string
  topic_category: string
}

function parseModelJson(text: string): ShadowGenerateResult {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('The AI response did not contain JSON.')
  const parsed = JSON.parse(match[0]) as ShadowGenerateResult
  if (!parsed.sentence?.trim() || !parsed.topic_category?.trim()) {
    throw new Error('The AI response did not contain a sentence.')
  }
  return parsed
}

export async function POST(request: NextRequest) {
  const guard = await guardRequest(request, { maxBodyBytes: MAX_BODY_BYTES })
  if (!guard.ok) return guard.response

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Shadowing requires ANTHROPIC_API_KEY in .env.local.' },
      { status: 503 }
    )
  }

  const body = guard.body as ShadowGenerateRequest
  if (
    !isOptionalText(body.level)
    || !isOptionalText(body.previousTopic)
    || !isOptionalTextArray(body.recentSentences)
  ) {
    return invalidRequestResponse()
  }
  if (exceedsLength(body.recentSentences, 500)) return tooLargeResponse()

  const level = (body.level ?? 'B1').slice(0, 10)
  const recentSentences = (body.recentSentences ?? [])
    .map(sentence => sentence.trim())
    .filter(Boolean)
    .slice(-50)
  const previousTopic = (body.previousTopic ?? '').trim().slice(0, 120)
  const normalizedPreviousTopic = previousTopic.toLowerCase()

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const system = `You create short practice sentences for a pronunciation-shadowing exercise inside English Code.
The learner's approximate CEFR level is ${level}.
Write exactly one short, complete English sentence (6 to 14 words) a learner at that level could realistically say, suitable for repeating word by word out loud.
Pick a surprising, varied topic from areas such as technology, health, science, nature, history, psychology, travel, food, space, or everyday life.
Return only valid JSON. Do not wrap it in markdown.`

  try {
    let lastError: unknown
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        temperature: 1,
        system,
        messages: [{
          role: 'user',
          content: `Sentences already used for this learner (never repeat one of these, and prefer a different topic):
${recentSentences.length > 0 ? recentSentences.map(sentence => `- ${sentence}`).join('\n') : '- None yet'}

${previousTopic ? `The previous exercise used the topic category "${previousTopic}". The new sentence MUST be about a clearly different topic category.\n\n` : ''}Return exactly this JSON shape:
{
  "sentence": "the short English sentence",
  "topic_category": "one broad category"
}`,
        }],
      })

      const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
      try {
        const result = parseModelJson(text)
        const normalized = result.sentence.trim().toLowerCase()
        if (recentSentences.some(sentence => sentence.trim().toLowerCase() === normalized)) {
          lastError = new Error('The AI repeated a previous sentence.')
          continue
        }
        if (normalizedPreviousTopic && result.topic_category.trim().toLowerCase() === normalizedPreviousTopic) {
          lastError = new Error('The AI repeated the previous topic.')
          continue
        }
        return NextResponse.json(result)
      } catch (error) {
        lastError = error
      }
    }
    throw lastError
  } catch (error) {
    console.error('Shadow generate error:', error)
    return NextResponse.json(
      { error: 'A new sentence could not be generated. Please try again.' },
      { status: 500 }
    )
  }
}
