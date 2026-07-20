-- English Code: reproducible local database schema.

create table levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  order_index int not null unique
);

create table users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique,
  level_id uuid references levels(id),
  created_at timestamptz default now()
);

create type generation_mode as enum ('pre_generated', 'on_demand');

create table scenarios (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels(id),
  title text not null,
  context text not null,
  order_index int not null,
  generation_mode generation_mode not null default 'pre_generated',
  is_published boolean not null default false,
  created_at timestamptz default now(),
  unique (level_id, order_index)
);

create table vocabulary (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references scenarios(id) on delete cascade,
  word text not null,
  definition text not null,
  example_sentence text not null,
  phonetic text,
  order_index int not null
);

create type phase_type as enum (
  'immersion',
  'listening',
  'comprehension',
  'speaking',
  'expression'
);

create table scenario_phases (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references scenarios(id) on delete cascade,
  phase_type phase_type not null,
  content jsonb not null,
  order_index int not null,
  unique (scenario_id, phase_type)
);

create type scenario_status as enum ('locked', 'in_progress', 'completed');

create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  scenario_id uuid not null references scenarios(id) on delete cascade,
  status scenario_status not null default 'locked',
  score_vocabulary int check (score_vocabulary between 0 and 100),
  score_clarity int check (score_clarity between 0 and 100),
  score_naturalness int check (score_naturalness between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz default now(),
  unique (user_id, scenario_id)
);

create table user_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  phase_id uuid not null references scenario_phases(id) on delete cascade,
  response_text text not null,
  ai_feedback jsonb,
  score_vocabulary int check (score_vocabulary between 0 and 100),
  score_clarity int check (score_clarity between 0 and 100),
  score_naturalness int check (score_naturalness between 0 and 100),
  attempt_number int not null default 1,
  created_at timestamptz default now()
);

create type vocabulary_status as enum ('new', 'learning', 'mastered');

create table user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  vocabulary_id uuid not null references vocabulary(id) on delete cascade,
  status vocabulary_status not null default 'new',
  exposure_count int not null default 0,
  last_seen_at timestamptz default now(),
  unique (user_id, vocabulary_id)
);

insert into levels (code, name, order_index) values
  ('A2', 'Elementary', 1),
  ('B1', 'Pre-Intermediate', 2),
  ('B2', 'Intermediate', 3),
  ('C1', 'Advanced', 4);

-- English Code currently uses a simple local user id rather than Supabase Auth.
-- Expose the local development tables through PostgREST for the anon client.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;
