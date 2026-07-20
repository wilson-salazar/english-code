/**
 * Supabase stores JSONB arrays as real arrays, but jsonb_build_object()
 * with string values saves them as JSON strings instead. This helper
 * normalizes any field that should be an array regardless of how it arrived.
 */
export function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T[] } catch { return [] }
  }
  return []
}
