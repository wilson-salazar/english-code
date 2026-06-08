-- ============================================================
-- ENGLISH FOR IT — Database Schema
-- ============================================================

-- LEVELS
create table levels (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,     -- 'A1', 'A2', 'B1', 'B2', 'C1'
  name         text not null,            -- 'Elementary', 'Pre-Intermediate'...
  order_index  int  not null unique
);

-- USERS (no auth for now — auth added later)
create table users (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  email        text unique,
  level_id     uuid references levels(id),
  created_at   timestamptz default now()
);

-- SCENARIOS
create type generation_mode as enum ('pre_generated', 'on_demand');

create table scenarios (
  id               uuid primary key default gen_random_uuid(),
  level_id         uuid not null references levels(id),
  title            text not null,            -- 'Reporting a Bug'
  context          text not null,            -- situation description shown to the user
  order_index      int  not null,            -- linear order within the level
  generation_mode  generation_mode not null default 'pre_generated',
  is_published     boolean not null default false,
  created_at       timestamptz default now(),
  unique (level_id, order_index)
);

-- VOCABULARY per scenario
create table vocabulary (
  id               uuid primary key default gen_random_uuid(),
  scenario_id      uuid not null references scenarios(id) on delete cascade,
  word             text not null,
  definition       text not null,
  example_sentence text not null,
  order_index      int  not null
);

-- SCENARIO PHASES (immersion, comprehension, expression)
create type phase_type as enum ('immersion', 'comprehension', 'expression');

create table scenario_phases (
  id           uuid primary key default gen_random_uuid(),
  scenario_id  uuid not null references scenarios(id) on delete cascade,
  phase_type   phase_type not null,
  content      jsonb not null,   -- flexible per phase type (see docs below)
  order_index  int  not null,
  unique (scenario_id, phase_type)
);

-- content jsonb structure by phase type:
-- immersion:     { "text": "...", "source": "Jira ticket", "highlighted_words": ["workaround", "reproduce"] }
-- comprehension: { "questions": [{ "question": "...", "expected_keywords": ["..."] }] }
-- expression:    { "prompt": "...", "evaluation_criteria": ["vocabulary", "clarity", "naturalness"] }

-- USER PROGRESS (one row per user per scenario)
create type scenario_status as enum ('locked', 'in_progress', 'completed');

create table user_progress (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  scenario_id       uuid not null references scenarios(id) on delete cascade,
  status            scenario_status not null default 'locked',
  score_vocabulary  int check (score_vocabulary between 0 and 100),
  score_clarity     int check (score_clarity between 0 and 100),
  score_naturalness int check (score_naturalness between 0 and 100),
  completed_at      timestamptz,
  updated_at        timestamptz default now(),
  unique (user_id, scenario_id)
);

-- USER RESPONSES (full history of everything the user has written)
create table user_responses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  phase_id          uuid not null references scenario_phases(id) on delete cascade,
  response_text     text not null,
  ai_feedback       jsonb,          -- { "summary": "...", "vocabulary": "...", "clarity": "...", "naturalness": "...", "improved_version": "..." }
  score_vocabulary  int check (score_vocabulary between 0 and 100),
  score_clarity     int check (score_clarity between 0 and 100),
  score_naturalness int check (score_naturalness between 0 and 100),
  attempt_number    int not null default 1,
  created_at        timestamptz default now()
);

-- USER VOCABULARY (word mastery tracking per user)
create type vocabulary_status as enum ('new', 'learning', 'mastered');

create table user_vocabulary (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  vocabulary_id   uuid not null references vocabulary(id) on delete cascade,
  status          vocabulary_status not null default 'new',
  exposure_count  int not null default 0,
  last_seen_at    timestamptz default now(),
  unique (user_id, vocabulary_id)
);

-- ============================================================
-- SEED — Levels
-- ============================================================
insert into levels (code, name, order_index) values
  ('A1', 'Beginner',         1),
  ('A2', 'Elementary',       2),
  ('B1', 'Pre-Intermediate', 3),
  ('B2', 'Intermediate',     4),
  ('C1', 'Advanced',         5);
