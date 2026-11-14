<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# English Code — project context

English Code is an interactive English-learning app for developers and QA
engineers. Users work through scenario-based lessons (standups, bug reports,
code reviews, technical interviews) split into phases: **immersion → listening
→ comprehension → speaking → expression**, plus a freeform **Talk with AI**
voice-conversation mode and a personal vocabulary list.

For install/setup steps, read [README.md](./README.md) first — this section only
covers things a coding assistant needs to know *while working in the code*.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS 4.
- Supabase (Postgres + Auth + RLS) — local via Docker for dev, hosted project
  for the data that's actually seeded (`supabase/migrations`, `supabase/seed_*.sql`).
- Anthropic API (`@anthropic-ai/sdk`, `ai` SDK) for written/spoken answer
  evaluation and the "Talk with AI" conversations.
- ElevenLabs TTS for dialogue and question audio.

## Required env vars (`.env.local`, never commit)

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (`lib/supabase.ts`) |
| `ANTHROPIC_API_KEY` | `app/api/evaluate`, `app/api/evaluate-speech`, `app/api/talk`, `app/api/writing-assistant` |
| `ELEVENLABS_API_KEY` | `app/api/tts` |

## Key structure

- `app/page.tsx` — auth (login/forgot password; sign-ups are closed, single-user app), then routes to `/dashboard`.
- `app/(app)/` — every signed-in screen. Its `layout.tsx` mounts `components/navigation/AppShell.tsx`, which loads the account once (`useAccount()`) and shows the header (name, level switcher, Log out) and the main menu on every screen. The login and reset-password pages stay outside the group, so they have no menu.
- `components/navigation/` — `sections.ts` lists the six menu sections and maps each URL to its active section; `NavigationGuard.tsx` holds `useUnsavedWork`, `GuardedLink` and the "Leave this page?" dialog; `Breadcrumbs.tsx` is the "Section › Screen" trail inside a module.
- `app/(app)/dashboard/page.tsx` — the six sections (Learning path, Grammar, Talk with AI, Shadowing, Tools, Progress), selected with `/dashboard?section=<id>` so a reload keeps the section.
- `app/(app)/scenario/[id]/page.tsx` — renders the phase sequence for one scenario, one phase component at a time.
- `components/phases/*.tsx` — one component per phase type (`ImmersionPhase`, `ListeningPhase`, `ComprehensionPhase`, `SpeakingPhase`, `ExpressionPhase`). Phase content comes from `scenarios`/`scenario_phases` tables as JSON (see `lib/content.ts` for parsing helpers).
- `app/(app)/talk/` — open-ended voice conversation with the AI, using the user's saved vocabulary.
- `app/(app)/tools/` and `components/tools/` — the Tools module, listed in the `TOOLS` array of `app/(app)/dashboard/page.tsx`. Its first tool is the Writing Assistant: `app/api/writing-assistant` reviews wording on each click, and `lib/spelling/` marks misspelled words in the browser with the dictionaries in `public/dictionaries/en/`, without spending credits.
- `components/FloatingVocabulary.tsx` — persistent personal word list widget, available on most pages once logged in.
- `app/api/tts/route.ts` — ElevenLabs proxy. Two fixed voice IDs: `VOICE_FEMALE` (Jessa) and `VOICE_MALE` (Adam). Don't hardcode voice IDs anywhere else — always call this route.
- `supabase/migrations/` — source of truth for schema. `supabase/seed_scenarios*.sql` — lesson content. Row Level Security scopes all user data (`user_progress`, `user_responses`, personal vocabulary) to its owner.

## Conventions to follow

- No comments unless explaining a non-obvious *why*.
- Phase components receive parsed JSON content as props and call `onComplete()` when the user finishes — don't change that contract without updating `app/(app)/scenario/[id]/page.tsx`.
- New signed-in screens go in `app/(app)/`, so they get the menu, and add their URL prefix to `sections.ts`. Inside a module, use `Breadcrumbs` instead of a link back to the dashboard.
- A screen that holds work the learner would lose by leaving (unsent text, a recording, a request carrying their answer, a conversation in progress) calls `useUnsavedWork(condition)`. The menu, the breadcrumb and Log out then ask before leaving. Generating audio or new content doesn't count. Components that play audio or record speech stop it when they unmount.
- TTS calls always go through `/api/tts` with `{ text, speaker: 'male' | 'female' }` — never call ElevenLabs directly from a component.
- Every API route that spends provider credits starts with `guardRequest` from `lib/api-guard.ts`, and the client calls it with `postJson` from `lib/api.ts`, never with a bare `fetch`.
- Local Supabase credentials (from `npx supabase status`) are dev-only; never reuse them or the hosted project's service-role key in client code.
- **Never wipe database data.** Do not run `npm run db:reset` / `supabase db reset` on a local DB that holds a real account (it destroys users, progress and saved words, and cannot be undone). Apply new migrations and seeds incrementally with `psql` (`PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -f <file>.sql`), and write seeds as additive inserts only. Seed files use one `do $$ ... $$` block per chapter.
- This repo is public (`github.com/wilson-salazar/english-code`) under the owner's personal GitHub account — don't add anything Simetrik-related, and never commit real API keys (`.env.local` is gitignored; only `.env.example` should ever be tracked).
