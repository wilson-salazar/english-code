import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface TranslationRequest {
  terms?: string[]
}

interface Translation {
  term: string
  meaning: string
}

interface TranslationToolInput {
  translations?: Array<{ index?: unknown; meaning?: unknown }>
}

function parseTranslations(input: unknown, requestedTerms: string[]): Translation[] {
  const parsed = input as TranslationToolInput
  const translations = (parsed.translations ?? [])
    .filter(item => Number.isInteger(item.index) && typeof item.meaning === 'string')
    .map(item => ({
      term: requestedTerms[item.index as number] ?? '',
      meaning: (item.meaning as string).trim(),
    }))
    .filter((item, index, items) => item.term && item.meaning && items.findIndex(other => other.term === item.term) === index)

  if (translations.length !== requestedTerms.length) {
    throw new Error('The translation response was incomplete.')
  }
  return translations
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Spanish meanings require ANTHROPIC_API_KEY in .env.local.' },
      { status: 503 }
    )
  }

  const body = await request.json() as TranslationRequest
  const terms = [...new Set((body.terms ?? [])
    .map(term => term.trim())
    .filter(Boolean))]
    .slice(0, 10)

  if (terms.length === 0) {
    return NextResponse.json({ translations: [] })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        temperature: 0,
        system: `Translate English vocabulary into concise, natural Spanish for a language learner.
Give only the most common meaning or a short Spanish equivalent. Ignore accidental trailing punctuation. If a term contains an accidentally repeated word, translate its intended meaning once. Do not add examples or explanations.`,
        messages: [{
          role: 'user',
          content: `Translate every item in this list:
${terms.map((term, index) => `${index}: ${term}`).join('\n')}`,
        }],
        tools: [{
          name: 'save_vocabulary_translations',
          description: 'Save one concise Spanish meaning for every indexed vocabulary item.',
          input_schema: {
            type: 'object',
            properties: {
              translations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: { type: 'integer', description: 'The original numeric index.' },
                    meaning: { type: 'string', description: 'A concise Spanish meaning.' },
                  },
                  required: ['index', 'meaning'],
                },
              },
            },
            required: ['translations'],
          },
        }],
        tool_choice: { type: 'tool', name: 'save_vocabulary_translations' },
      })

      const toolUse = response.content.find(
        block => block.type === 'tool_use' && block.name === 'save_vocabulary_translations'
      )
      if (!toolUse || toolUse.type !== 'tool_use') throw new Error('The translation tool was not used.')
      return NextResponse.json({ translations: parseTranslations(toolUse.input, terms) })
    } catch (error) {
      lastError = error
    }
  }

  console.error('Vocabulary translation error:', lastError)
  return NextResponse.json({ error: 'The Spanish meanings could not be generated.' }, { status: 500 })
}
