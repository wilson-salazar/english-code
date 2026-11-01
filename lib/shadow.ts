/**
 * Word-matching for the Shadow pronunciation-practice module (see
 * specs/001-shadow-pronunciation/research.md §1): "correct pronunciation" is
 * whether speech recognition understood the student as saying the target
 * word/sentence, not a phonetic/acoustic score.
 */

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const SCALES: Array<[number, string]> = [[1e6, 'million'], [1e3, 'thousand']]

// Speech recognition often writes numbers as digits ("20") even when the word
// was "twenty". Digits are spelled out on both sides before comparing so the
// two forms count as the same word. Covers whole numbers below one billion.
function numberToWords(value: number): string {
  if (value < 20) return ONES[value]
  if (value < 100) return TENS[Math.floor(value / 10)] + (value % 10 ? ` ${ONES[value % 10]}` : '')
  if (value < 1000) {
    return `${ONES[Math.floor(value / 100)]} hundred` + (value % 100 ? ` ${numberToWords(value % 100)}` : '')
  }
  for (const [scale, name] of SCALES) {
    if (value >= scale) {
      const rest = value % scale
      return `${numberToWords(Math.floor(value / scale))} ${name}` + (rest ? ` ${numberToWords(rest)}` : '')
    }
  }
  return String(value)
}

export function normalizeSpeech(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
    .replace(/\d{1,9}/g, digits => ` ${numberToWords(Number(digits))} `)
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function splitIntoWords(sentence: string): string[] {
  return normalizeSpeech(sentence)
    .split(' ')
    .filter(Boolean)
}

export function wordMatches(recognizedText: string, targetWord: string): boolean {
  const targetToken = normalizeSpeech(targetWord)
  if (!targetToken) return false
  return splitIntoWords(recognizedText).includes(targetToken)
}

export function sentenceMatches(recognizedText: string, targetSentence: string): boolean {
  return normalizeSpeech(recognizedText) === normalizeSpeech(targetSentence)
}
