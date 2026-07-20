-- Connect application profiles to Supabase Auth and protect personal data.

alter table public.users
  add column if not exists auth_user_id uuid unique
  references auth.users(id) on delete cascade;

-- Automatically create the public profile after an Auth account is created.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_level_id uuid;
begin
  select id into selected_level_id
  from public.levels
  where code = new.raw_user_meta_data ->> 'level_code';

  insert into public.users (auth_user_id, full_name, email, level_id)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Student'),
    new.email,
    selected_level_id
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Public learning content can be read before and after login.
alter table public.levels enable row level security;
alter table public.scenarios enable row level security;
alter table public.vocabulary enable row level security;
alter table public.scenario_phases enable row level security;

create policy "Learning levels are public"
  on public.levels for select to anon, authenticated using (true);
create policy "Published scenarios are public"
  on public.scenarios for select to anon, authenticated using (is_published = true);
create policy "Vocabulary is public"
  on public.vocabulary for select to anon, authenticated using (true);
create policy "Scenario phases are public"
  on public.scenario_phases for select to anon, authenticated using (true);

-- A signed-in user can only access their own profile.
alter table public.users enable row level security;

create policy "Users can read their own profile"
  on public.users for select to authenticated
  using ((select auth.uid()) = auth_user_id);

create policy "Users can update their own profile"
  on public.users for update to authenticated
  using ((select auth.uid()) = auth_user_id)
  with check ((select auth.uid()) = auth_user_id);

-- Progress and responses belong to the authenticated profile.
alter table public.user_progress enable row level security;
alter table public.user_responses enable row level security;
alter table public.user_vocabulary enable row level security;

create policy "Users manage their own progress"
  on public.user_progress for all to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = user_progress.user_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.users u
    where u.id = user_progress.user_id
      and u.auth_user_id = (select auth.uid())
  ));

create policy "Users manage their own responses"
  on public.user_responses for all to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = user_responses.user_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.users u
    where u.id = user_responses.user_id
      and u.auth_user_id = (select auth.uid())
  ));

create policy "Users manage their own vocabulary"
  on public.user_vocabulary for all to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = user_vocabulary.user_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.users u
    where u.id = user_vocabulary.user_id
      and u.auth_user_id = (select auth.uid())
  ));
