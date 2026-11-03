import { ALLOWED_TERMS, HYPHEN_PREFIXES } from './allowed-terms'

export interface WordToken {
  start: number
  end: number
  word: string
}

const CHUNK = /[^\s—–,;!?()"“”[\]{}]+/g
const CODE_SPAN = /`[^`\n]*`/g
const LOOKS_LIKE_ADDRESS = /:\/\/|@|^www\./i
const PLAIN_WORD = /^[A-Za-z]+(?:['’][A-Za-z]+)*$/
const LEADING_PUNCTUATION = /^['’‘`.:…*_-]+/
const TRAILING_PUNCTUATION = /['’‘`.:…*_-]+$/

function isSentenceStart(text: string, index: number) {
  for (let i = index - 1; i >= 0; i--) {
    const char = text[i]
    if (char === '\n') return true
    if (/\s/.test(char) || '"“‘\'(['.includes(char)) continue
    return '.!?…:'.includes(char)
  }
  return true
}

function isAllowedTerm(word: string) {
  const lower = word.toLowerCase().replace(/['’]s$/, '')
  return ALLOWED_TERMS.has(lower) || ALLOWED_TERMS.has(lower.replace(/s$/, ''))
}

function isCheckable(word: string, canBeCapitalized: boolean) {
  if (word.length > 1 && word === word.toUpperCase()) return false
  if (/[a-z][A-Z]|[A-Z]{2,}[a-z]/.test(word)) return false
  // A capital in the middle of a sentence usually marks a name, such as a person or a product.
  if (!canBeCapitalized && /^[A-Z]/.test(word)) return false
  return !isAllowedTerm(word)
}

export function findCheckableWords(text: string): WordToken[] {
  const codeSpans = [...text.matchAll(CODE_SPAN)].map(match => ({
    start: match.index,
    end: match.index + match[0].length,
  }))
  const tokens: WordToken[] = []

  for (const match of text.matchAll(CHUNK)) {
    const chunkStart = match.index
    if (codeSpans.some(span => chunkStart < span.end && chunkStart + match[0].length > span.start)) continue
    if (LOOKS_LIKE_ADDRESS.test(match[0])) continue

    const leading = match[0].match(LEADING_PUNCTUATION)?.[0].length ?? 0
    const core = match[0].slice(leading).replace(TRAILING_PUNCTUATION, '')
    if (!core) continue

    const parts = core.split('-')
    if (!parts.every(part => PLAIN_WORD.test(part))) continue

    const startsSentence = isSentenceStart(text, chunkStart)
    let offset = chunkStart + leading
    parts.forEach((part, index) => {
      const isPrefix = index < parts.length - 1 && HYPHEN_PREFIXES.has(part.toLowerCase())
      if (!isPrefix && isCheckable(part, index === 0 && startsSentence)) {
        tokens.push({ start: offset, end: offset + part.length, word: part })
      }
      offset += part.length + 1
    })
  }

  return tokens
}
