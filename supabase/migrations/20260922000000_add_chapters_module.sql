-- Grammar Chapters module: a second, level-scoped learning track focused on
-- explicit grammar topics (vs. the job-scenario track in `scenarios`).
-- Schema only — no data. Chapter content lives in a separate seed file
-- (supabase/seed_chapters_*.sql) so the new phase_type values below are
-- committed before anything tries to INSERT with them.

alter type public.phase_type add value 'explanation';
alter type public.phase_type add value 'practice';

-- content jsonb structure by phase type (chapters use immersion/comprehension
-- unchanged from scenarios — see supabase/migrations/20260720000000_initial_schema.sql):
-- explanation: { "topic": "...", "summary": "...", "rules": [{ "title": "...", "structure": "...", "explanation": "...", "examples": ["..."] }], "common_mistakes": ["..."] }
-- practice:     { "instructions": "...", "items": [{ "type": "fill_blank", "sentence": "She ___ (study) English.", "answer": "studies" }, { "type": "multiple_choice", "question": "...", "options": ["..."], "answer_index": 0 }] }

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels(id),
  title text not null,
  description text not null,
  order_index int not null,
  generation_mode public.generation_mode not null default 'pre_generated',
  is_published boolean not null default false,
  created_at timestamptz default now(),
  unique (level_id, order_index)
);

create table public.chapter_phases (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  phase_type public.phase_type not null,
  content jsonb not null,
  order_index int not null,
  unique (chapter_id, phase_type)
);

-- Reuses scenario_status ('locked' | 'in_progress' | 'completed') generically.
create table public.user_chapter_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  status public.scenario_status not null default 'locked',
  score_grammar int check (score_grammar between 0 and 100),
  score_clarity int check (score_clarity between 0 and 100),
  score_naturalness int check (score_naturalness between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz default now(),
  unique (user_id, chapter_id)
);

create table public.user_chapter_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  phase_id uuid not null references public.chapter_phases(id) on delete cascade,
  response_text text not null,
  ai_feedback jsonb,
  score_grammar int check (score_grammar between 0 and 100),
  score_clarity int check (score_clarity between 0 and 100),
  score_naturalness int check (score_naturalness between 0 and 100),
  attempt_number int not null default 1,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.chapters, public.chapter_phases,
  public.user_chapter_progress, public.user_chapter_responses
  to anon, authenticated, service_role;

alter table public.chapters enable row level security;
alter table public.chapter_phases enable row level security;
alter table public.user_chapter_progress enable row level security;
alter table public.user_chapter_responses enable row level security;

create policy "Published chapters are public"
  on public.chapters for select to anon, authenticated using (is_published = true);
create policy "Chapter phases are public"
  on public.chapter_phases for select to anon, authenticated using (true);

create policy "Users manage their own chapter progress"
  on public.user_chapter_progress for all to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = user_chapter_progress.user_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.users u
    where u.id = user_chapter_progress.user_id
      and u.auth_user_id = (select auth.uid())
  ));

create policy "Users manage their own chapter responses"
  on public.user_chapter_responses for all to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = user_chapter_responses.user_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.users u
    where u.id = user_chapter_responses.user_id
      and u.auth_user_id = (select auth.uid())
  ));
