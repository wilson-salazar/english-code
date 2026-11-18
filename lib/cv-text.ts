import { extractText } from 'unpdf'

export const MAX_CV_PDF_BYTES = 5 * 1024 * 1024
export const MAX_CV_TEXT_LENGTH = 20000

export type CvTextResult =
  | { ok: true; text: string; pages: number; tooLong: boolean }
  | { ok: false; code: 'invalid_pdf' | 'password_protected' | 'no_text' | 'unreadable' }

const PDF_SIGNATURE = '%PDF'

function normalizeCvText(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function extractCvText(pdf: Uint8Array): Promise<CvTextResult> {
  if (pdf.length === 0 || pdf.length > MAX_CV_PDF_BYTES) return { ok: false, code: 'invalid_pdf' }
  if (new TextDecoder().decode(pdf.subarray(0, PDF_SIGNATURE.length)) !== PDF_SIGNATURE) {
    return { ok: false, code: 'invalid_pdf' }
  }

  try {
    const { totalPages, text } = await extractText(pdf, { mergePages: true })
    const clean = normalizeCvText(text)
    // A scanned CV is a stack of images: pdf.js reads it fine but finds no text layer.
    if (!clean) return { ok: false, code: 'no_text' }
    return { ok: true, text: clean, pages: totalPages, tooLong: clean.length > MAX_CV_TEXT_LENGTH }
  } catch (error) {
    if ((error as { name?: string }).name === 'PasswordException') return { ok: false, code: 'password_protected' }
    console.error('CV text extraction failed:', error)
    return { ok: false, code: 'unreadable' }
  }
}
