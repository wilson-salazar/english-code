import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface ChatMessage {
  role: 'assistant' | 'user'
  content: string
}

interface TalkRequest {
  action: 'start' | 'respond'
  vocabulary?: string[]
  previousTopics?: string[]
  history?: ChatMessage[]
  level?: string
}

interface TalkResult {
  topic_title?: string
  topic_category?: string
  message: string
  words_used?: string[]
}

function parseModelJson(text: string): TalkResult {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('The AI response did not contain JSON.')
  const parsed = JSON.parse(match[0]) as TalkResult
  if (!parsed.message?.trim()) throw new Error('The AI response did not contain a message.')
  return parsed
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Talk with AI requires ANTHROPIC_API_KEY in .env.local.' },
      { status: 503 }
    )
  }

  const body = await request.json() as TalkRequest
  const vocabulary = (body.vocabulary ?? [])
    .map(term => term.trim())
    .filter(Boolean)
    .slice(0, 10)
  const level = (body.level ?? 'B1').slice(0, 10)
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const vocabularyInstruction = vocabulary.length > 0
    ? `Practice vocabulary: ${vocabulary.map(term => `"${term}"`).join(', ')}. Across the first four assistant turns, naturally use every term at least once. On each turn, use one to three terms when natural. Never present them as a forced list.`
    : 'There is no saved practice vocabulary yet. Keep the conversation useful and invite the learner to add words later.'

  const system = `You are the friendly English conversation partner inside English Code.
The learner's approximate CEFR level is ${level}.
Speak only in English, using clear natural sentences appropriate for that level.
Keep every turn conversational and concise: 45 to 90 words, ending with one engaging question.
Gently provide context that makes unfamiliar vocabulary understandable without translating the whole message.
${vocabularyInstruction}
Return only valid JSON. Do not wrap it in markdown.`

  try {
    if (body.action === 'start') {
      const previousTopics = (body.previousTopics ?? [])
        .map(topic => topic.trim())
        .filter(Boolean)
        .slice(-80)

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        temperature: 1,
        system,
        messages: [{
          role: 'user',
          content: `Start a brand-new conversation on a surprising topic selected from areas such as novels, technology, health, science, nature, history, art, travel, psychology, food, space, or everyday life.

Topics already used for this learner:
${previousTopics.length > 0 ? previousTopics.map(topic => `- ${topic}`).join('\n') : '- None yet'}

Choose a clearly different subject. Return exactly this JSON shape:
{
  "topic_title": "short unique title",
  "topic_category": "one broad category",
  "message": "your opening conversational turn",
  "words_used": ["saved terms actually used in the message"]
}`,
        }],
      })

      const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
      const result = parseModelJson(text)
      if (!result.topic_title?.trim() || !result.topic_category?.trim()) {
        throw new Error('The AI response did not contain a topic.')
      }
      return NextResponse.json(result)
    }

    if (body.action === 'respond') {
      const history = (body.history ?? [])
        .filter(item => (item.role === 'assistant' || item.role === 'user') && item.content?.trim())
        .slice(-20)
        .map(item => ({ role: item.role, content: item.content.slice(0, 5000) }))

      if (history.length === 0 || history.at(-1)?.role !== 'user') {
        return NextResponse.json({ error: 'A user message is required.' }, { status: 400 })
      }

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        temperature: 0.9,
        system: `${system}
Continue the existing topic. Respond to what the learner actually said before adding a new fact or angle. Encourage communication rather than correcting every mistake.
Return exactly: {"message":"your next turn","words_used":["saved terms actually used"]}`,
        messages: history,
      })

      const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
      return NextResponse.json(parseModelJson(text))
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 })
  } catch (error) {
    console.error('Talk with AI error:', error)
    return NextResponse.json(
      { error: 'The conversation could not be generated. Please try again.' },
      { status: 500 }
    )
  }
}
