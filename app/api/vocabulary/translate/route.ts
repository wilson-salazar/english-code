import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface TranslationRequest {
  terms?: string[]
}

interface Translation {
  term: string
  meaning: string
}

function parseTranslations(text: string, requestedTerms: string[]): Translation[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('The translation response did not contain JSON.')

  const parsed = JSON.parse(match[0]) as Array<{ term?: unknown; meaning?: unknown }>
  const requested = new Map(requestedTerms.map(term => [term.toLocaleLowerCase(), term]))
  const translations = parsed
    .filter(item => typeof item.term === 'string' && typeof item.meaning === 'string')
    .map(item => ({
      term: requested.get((item.term as string).trim().toLocaleLowerCase()) ?? '',
      meaning: (item.meaning as string).trim(),
    }))
    .filter(item => item.term && item.meaning)

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
Preserve the input term exactly in the "term" field. Give only the most common meaning or a short Spanish equivalent; do not add examples or explanations.
Return only a valid JSON array and no markdown.`,
        messages: [{
          role: 'user',
          content: `Translate every item in this list:
${terms.map(term => `- ${term}`).join('\n')}

Return exactly: [{"term":"original term","meaning":"Spanish meaning"}]`,
        }],
      })

      const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
      return NextResponse.json({ translations: parseTranslations(text, terms) })
    } catch (error) {
      lastError = error
    }
  }

  console.error('Vocabulary translation error:', lastError)
  return NextResponse.json({ error: 'The Spanish meanings could not be generated.' }, { status: 500 })
}
