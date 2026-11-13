import { MISSING_APOSTROPHES } from './allowed-terms'
import { findCheckableWords } from './tokens'

const MAX_SUGGESTIONS = 5
const DICTIONARY_PATH = '/dictionaries/en'

export interface MisspelledWord {
  start: number
  end: number
  word: string
}

export interface SpellChecker {
  findMisspellings(text: string, caret: number | null): MisspelledWord[]
  suggest(word: string): string[]
}

interface Speller {
  correct(word: string): boolean
  suggest(word: string): string[]
}

// A swapped pair of letters counts as one change, because it is one of the most common typos.
function editDistance(a: string, b: string) {
  const distances = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) distances[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        distances[i][j] = Math.min(distances[i][j], distances[i - 2][j - 2] + 1)
      }
    }
  }
  return distances[a.length][b.length]
}

function matchInitialCapital(original: string, suggestion: string) {
  return /^[A-Z]/.test(original) ? suggestion[0].toUpperCase() + suggestion.slice(1) : suggestion
}

export function createChecker(speller: Speller, commonWords: string[]): SpellChecker {
  const commonness = new Map(commonWords.map((word, index) => [word, index]))
  const suggestions = new Map<string, string[]>()

  function rank(lowerWord: string) {
    const swapped: string[] = []
    for (let i = 0; i < lowerWord.length - 1; i++) {
      const candidate = lowerWord.slice(0, i) + lowerWord[i + 1] + lowerWord[i] + lowerWord.slice(i + 2)
      if (speller.correct(candidate)) swapped.push(candidate)
    }

    const candidates = [...new Set([...swapped, ...speller.suggest(lowerWord)])]
    return candidates
      .map((candidate, order) => ({
        candidate,
        order,
        distance: editDistance(lowerWord, candidate.toLowerCase()),
        commonness: commonness.get(candidate.toLowerCase()) ?? Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.distance - b.distance || a.commonness - b.commonness || a.order - b.order)
      .map(item => item.candidate)
  }

  return {
    findMisspellings(text, caret) {
      return findCheckableWords(text).filter(token => {
        // A word still being typed would turn red at every keystroke.
        if (caret !== null && caret > token.start && caret <= token.end) return false
        return !speller.correct(token.word.replace(/’/g, "'"))
      })
    },

    suggest(word) {
      const cached = suggestions.get(word)
      if (cached) return cached

      const lowerWord = word.toLowerCase().replace(/’/g, "'")
      const contraction = MISSING_APOSTROPHES[lowerWord]
      const ordered = [...(contraction ? [contraction] : []), ...rank(lowerWord)]
      const result = [...new Set(ordered.map(item => matchInitialCapital(word, item)))].slice(0, MAX_SUGGESTIONS)

      suggestions.set(word, result)
      return result
    },
  }
}

let checkerPromise: Promise<SpellChecker> | null = null

async function fetchDictionaryFile(name: string) {
  const response = await fetch(`${DICTIONARY_PATH}/${name}`)
  if (!response.ok) throw new Error(`Could not load ${name}.`)
  return response
}

async function buildChecker() {
  const [{ default: nspell }, aff, dic, commonWords] = await Promise.all([
    import('nspell'),
    fetchDictionaryFile('index.aff').then(response => response.text()),
    fetchDictionaryFile('index.dic').then(response => response.text()),
    fetchDictionaryFile('common-words.json').then(response => response.json() as Promise<string[]>),
  ])
  return createChecker(nspell(aff, dic), commonWords)
}

export function loadChecker() {
  checkerPromise ??= buildChecker().catch(error => {
    checkerPromise = null
    throw error
  })
  return checkerPromise
}
