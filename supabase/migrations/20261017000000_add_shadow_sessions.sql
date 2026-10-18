-- Shadow module: practice history for the word-by-word pronunciation-shadowing
-- exercises (see specs/001-shadow-pronunciation). One row per completed
-- exercise; in-progress state (current word, attempts) is never persisted.

create table public.shadow_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  sentence text not null check (char_length(trim(sentence)) between 1 and 500),
  topic_category text not null check (char_length(trim(topic_category)) between 1 and 120),
  level text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index shadow_sessions_user_completed_idx
  on public.shadow_sessions (user_id, completed_at desc);

alter table public.shadow_sessions enable row level security;

create policy "Users manage their own Shadow sessions"
  on public.shadow_sessions for all to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = shadow_sessions.user_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.users u
    where u.id = shadow_sessions.user_id
      and u.auth_user_id = (select auth.uid())
  ));
