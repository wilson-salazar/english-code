import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface ShadowGenerateRequest {
  level?: string
  recentSentences?: string[]
}

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
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Shadow requires ANTHROPIC_API_KEY in .env.local.' },
      { status: 503 }
    )
  }

  const body = await request.json() as ShadowGenerateRequest
  const level = (body.level ?? 'B1').slice(0, 10)
  const recentSentences = (body.recentSentences ?? [])
    .map(sentence => sentence.trim())
    .filter(Boolean)
    .slice(-50)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const system = `You create short practice sentences for a pronunciation-shadowing exercise inside English Code.
The learner's approximate CEFR level is ${level}.
Write exactly one short, complete English sentence (6 to 14 words) a learner at that level could realistically say, suitable for repeating word by word out loud.
Pick a surprising, varied topic from areas such as technology, health, science, nature, history, psychology, travel, food, space, or everyday life.
Return only valid JSON. Do not wrap it in markdown.`

  try {
    let lastError: unknown
    for (let attempt = 0; attempt < 2; attempt++) {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        temperature: 1,
        system,
        messages: [{
          role: 'user',
          content: `Sentences already used for this learner (never repeat one of these, and prefer a different topic):
${recentSentences.length > 0 ? recentSentences.map(sentence => `- ${sentence}`).join('\n') : '- None yet'}

Return exactly this JSON shape:
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
