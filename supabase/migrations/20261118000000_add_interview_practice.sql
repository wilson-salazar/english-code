-- Interview module: the learner's CV text and the history of practice interviews with an
-- AI recruiter (see specs/007-interview-practice). Only the reviewed CV text is stored,
-- never the uploaded PDF.

create table public.interview_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  focus_title text not null check (char_length(trim(focus_title)) between 1 and 200),
  question_count smallint not null default 6 check (question_count between 1 and 10),
  status text not null default 'in_progress' check (status in ('in_progress', 'finished')),
  feedback jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.interview_turns (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  role text not null check (role in ('recruiter', 'candidate')),
  content text not null check (char_length(trim(content)) between 1 and 5000),
  question_type text check (
    question_type is null
    or question_type in ('opening', 'cv_experience', 'qa_concepts', 'automation', 'situational', 'practical', 'closing')
  ),
  created_at timestamptz not null default now()
);

create index interviews_user_created_idx
  on public.interviews (user_id, created_at desc);

create index interview_turns_interview_created_idx
  on public.interview_turns (interview_id, created_at);

alter table public.interview_cvs enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_turns enable row level security;

create policy "Users manage their own CV"
  on public.interview_cvs for all to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = interview_cvs.user_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.users u
    where u.id = interview_cvs.user_id
      and u.auth_user_id = (select auth.uid())
  ));

create policy "Users manage their own interviews"
  on public.interviews for all to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = interviews.user_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.users u
    where u.id = interviews.user_id
      and u.auth_user_id = (select auth.uid())
  ));

create policy "Users manage turns in their own interviews"
  on public.interview_turns for all to authenticated
  using (exists (
    select 1
    from public.interviews interview
    join public.users u on u.id = interview.user_id
    where interview.id = interview_turns.interview_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1
    from public.interviews interview
    join public.users u on u.id = interview.user_id
    where interview.id = interview_turns.interview_id
      and u.auth_user_id = (select auth.uid())
  ));
