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
| `ANTHROPIC_API_KEY` | `app/api/evaluate`, `app/api/evaluate-speech`, `app/api/talk` |
| `ELEVENLABS_API_KEY` | `app/api/tts` |

## Key structure

- `app/page.tsx` — auth (login/signup/forgot password), then routes to `/dashboard`.
- `app/dashboard/page.tsx` — scenario list, progress stats, level switcher, entry point to Talk with AI.
- `app/scenario/[id]/page.tsx` — renders the phase sequence for one scenario, one phase component at a time.
- `components/phases/*.tsx` — one component per phase type (`ImmersionPhase`, `ListeningPhase`, `ComprehensionPhase`, `SpeakingPhase`, `ExpressionPhase`). Phase content comes from `scenarios`/`scenario_phases` tables as JSON (see `lib/content.ts` for parsing helpers).
- `app/talk/` — open-ended voice conversation with the AI, using the user's saved vocabulary.
- `components/FloatingVocabulary.tsx` — persistent personal word list widget, available on most pages once logged in.
- `app/api/tts/route.ts` — ElevenLabs proxy. Two fixed voice IDs: `VOICE_FEMALE` (Jessa) and `VOICE_MALE` (Adam). Don't hardcode voice IDs anywhere else — always call this route.
- `supabase/migrations/` — source of truth for schema. `supabase/seed_scenarios*.sql` — lesson content. Row Level Security scopes all user data (`user_progress`, `user_responses`, personal vocabulary) to its owner.

## Conventions to follow

- No comments unless explaining a non-obvious *why*.
- Phase components receive parsed JSON content as props and call `onComplete()` when the user finishes — don't change that contract without updating `app/scenario/[id]/page.tsx`.
- TTS calls always go through `/api/tts` with `{ text, speaker: 'male' | 'female' }` — never call ElevenLabs directly from a component.
- Local Supabase credentials (from `npx supabase status`) are dev-only; never reuse them or the hosted project's service-role key in client code.
- This repo is public (`github.com/wilson-salazar/english-code`) under the owner's personal GitHub account — don't add anything Simetrik-related, and never commit real API keys (`.env.local` is gitignored; only `.env.example` should ever be tracked).
