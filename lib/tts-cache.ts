import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'

// ~/Library/Caches is not synced by iCloud, unlike the repository folder, and macOS treats it as
// data it may clear: a missing file only means the audio is requested again.
const DEFAULT_DIR = process.platform === 'darwin'
  ? path.join(homedir(), 'Library', 'Caches', 'english-code', 'tts')
  : path.join(tmpdir(), 'english-code-tts')
const DEFAULT_MAX_BYTES = 200 * 1024 * 1024
const TRIM_RATIO = 0.9

export interface CacheOptions {
  dir?: string
  maxBytes?: number
}

export interface AudioKeyParts {
  voiceId: string
  modelId: string
  settings: Record<string, unknown>
  text: string
}

export function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, ' ')
}

export function audioKey({ voiceId, modelId, settings, text }: AudioKeyParts) {
  const parts = JSON.stringify([voiceId, modelId, settings, normalizeText(text)])
  return createHash('sha256').update(parts).digest('hex')
}

function audioPath(key: string, dir: string) {
  return path.join(dir, `${key}.mp3`)
}

export async function readSavedAudio(key: string, options: CacheOptions = {}) {
  const file = audioPath(key, options.dir ?? DEFAULT_DIR)
  let audio: Buffer
  try {
    audio = await readFile(file)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') await rm(file, { force: true }).catch(() => {})
    return null
  }

  if (audio.length === 0) {
    await rm(file, { force: true }).catch(() => {})
    return null
  }

  const now = new Date()
  await utimes(file, now, now).catch(() => {})
  return audio
}

export async function saveAudio(key: string, audio: ArrayBuffer, options: CacheOptions = {}) {
  const dir = options.dir ?? DEFAULT_DIR
  const temporary = path.join(dir, `${key}.${randomUUID()}.tmp`)
  try {
    await mkdir(dir, { recursive: true })
    await writeFile(temporary, Buffer.from(audio))
    await rename(temporary, audioPath(key, dir))
    await trimCache(dir, options.maxBytes ?? DEFAULT_MAX_BYTES)
  } catch (error) {
    console.error('Saved audio could not be written:', error)
    await rm(temporary, { force: true }).catch(() => {})
  }
}

async function trimCache(dir: string, maxBytes: number) {
  const names = (await readdir(dir)).filter(name => name.endsWith('.mp3'))
  const files = await Promise.all(names.map(async name => {
    const file = path.join(dir, name)
    const info = await stat(file)
    return { file, size: info.size, lastUsed: info.mtimeMs }
  }))

  let total = files.reduce((sum, file) => sum + file.size, 0)
  if (total <= maxBytes) return

  // Trimming below the limit keeps the next saves from walking the folder again right away.
  const target = maxBytes * TRIM_RATIO
  for (const file of files.sort((a, b) => a.lastUsed - b.lastUsed)) {
    if (total <= target) break
    await rm(file.file, { force: true })
    total -= file.size
  }
}
