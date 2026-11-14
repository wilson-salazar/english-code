'use client'

import { GuardedLink } from './NavigationGuard'
import { SectionId, sectionHref, sectionLabel } from './sections'

export default function Breadcrumbs({ section, current }: { section: SectionId; current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        <li className="shrink-0">
          <GuardedLink href={sectionHref(section)} className="text-slate-400 transition-colors hover:text-white">
            {sectionLabel(section)}
          </GuardedLink>
        </li>
        <li aria-hidden="true" className="shrink-0 text-slate-600">›</li>
        <li aria-current="page" className="truncate font-semibold text-slate-100">{current}</li>
      </ol>
    </nav>
  )
}
