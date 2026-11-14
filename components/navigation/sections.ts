export type SectionId = 'learning' | 'grammar' | 'talk' | 'shadow' | 'tools' | 'progress'

export interface Section {
  id: SectionId
  label: string
  description: string
}

export const SECTIONS: Section[] = [
  { id: 'learning', label: 'Learning path', description: 'Lessons and scenarios' },
  { id: 'grammar', label: 'Grammar', description: 'Core grammar chapters' },
  { id: 'talk', label: 'Talk with AI', description: 'Voice conversation' },
  { id: 'shadow', label: 'Shadowing', description: 'Pronunciation practice' },
  { id: 'tools', label: 'Tools', description: 'Writing and more' },
  { id: 'progress', label: 'Progress', description: 'KPIs and skills' },
]

export function sectionHref(id: SectionId) {
  return `/dashboard?section=${id}`
}

export function sectionLabel(id: SectionId) {
  return SECTIONS.find(section => section.id === id)?.label ?? ''
}

export function parseSection(value: string | null): SectionId {
  return SECTIONS.find(section => section.id === value)?.id ?? 'learning'
}

const MODULE_SECTIONS: Array<[prefix: string, section: SectionId]> = [
  ['/scenario/', 'learning'],
  ['/chapter/', 'grammar'],
  ['/talk', 'talk'],
  ['/shadow', 'shadow'],
  ['/tools/', 'tools'],
]

export function sectionFromLocation(pathname: string, sectionParam: string | null): SectionId {
  if (pathname === '/dashboard') return parseSection(sectionParam)
  return MODULE_SECTIONS.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'learning'
}
