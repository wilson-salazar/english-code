import { NextRequest, NextResponse } from 'next/server'
import { guardRequest, invalidRequestResponse } from '@/lib/api-guard'
import { extractCvText } from '@/lib/cv-text'

// A 5 MB PDF is about 6.7 MB once encoded in base64.
const MAX_BODY_BYTES = 7 * 1024 * 1024

const ERRORS = {
  invalid_pdf: { status: 400, error: 'Upload a PDF file of up to 5 MB.' },
  password_protected: { status: 422, error: 'This PDF is password-protected. Remove the password and try again.' },
  no_text: { status: 422, error: 'We could not find any text in this PDF. Export your CV as a text PDF and try again.' },
  unreadable: { status: 500, error: 'Your CV could not be read. Please try again.' },
} as const

// Reads the text of an uploaded CV. The PDF stays in memory: nothing is saved here and no
// provider is called, so the learner reviews the text before anything leaves the Mac.
export async function POST(request: NextRequest) {
  const guard = await guardRequest(request, { maxBodyBytes: MAX_BODY_BYTES })
  if (!guard.ok) return guard.response

  const { pdf } = guard.body
  if (typeof pdf !== 'string' || !pdf) return invalidRequestResponse()

  const result = await extractCvText(new Uint8Array(Buffer.from(pdf, 'base64')))
  if (!result.ok) {
    const { status, error } = ERRORS[result.code]
    return NextResponse.json(result.code === 'unreadable' ? { error } : { error, code: result.code }, { status })
  }

  return NextResponse.json({ text: result.text, pages: result.pages, tooLong: result.tooLong })
}
