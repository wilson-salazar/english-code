/**
 * Word-matching for the Shadow pronunciation-practice module (see
 * specs/001-shadow-pronunciation/research.md §1): "correct pronunciation" is
 * whether speech recognition understood the student as saying the target
 * word/sentence, not a phonetic/acoustic score.
 */

export function normalizeSpeech(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
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
