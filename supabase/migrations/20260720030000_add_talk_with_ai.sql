-- Personal vocabulary and AI conversation history.

create table public.personal_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  term text not null check (char_length(trim(term)) between 1 and 120),
  normalized_term text generated always as (
    lower(regexp_replace(trim(term), '\s+', ' ', 'g'))
  ) stored,
  is_learned boolean not null default false,
  learned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, normalized_term)
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic_title text not null check (char_length(trim(topic_title)) between 1 and 160),
  topic_key text generated always as (
    lower(regexp_replace(trim(topic_title), '[^[:alnum:]]+', '-', 'g'))
  ) stored,
  topic_category text not null,
  vocabulary_terms text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, topic_key)
);

create table public.ai_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('assistant', 'user')),
  content text not null check (char_length(trim(content)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index personal_vocabulary_active_idx
  on public.personal_vocabulary (user_id, created_at)
  where is_learned = false;

create index ai_conversations_user_created_idx
  on public.ai_conversations (user_id, created_at desc);

create index ai_conversation_messages_conversation_created_idx
  on public.ai_conversation_messages (conversation_id, created_at);

alter table public.personal_vocabulary enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_conversation_messages enable row level security;

create policy "Users manage their personal vocabulary"
  on public.personal_vocabulary for all to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = personal_vocabulary.user_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.users u
    where u.id = personal_vocabulary.user_id
      and u.auth_user_id = (select auth.uid())
  ));

create policy "Users manage their AI conversations"
  on public.ai_conversations for all to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = ai_conversations.user_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.users u
    where u.id = ai_conversations.user_id
      and u.auth_user_id = (select auth.uid())
  ));

create policy "Users manage messages in their AI conversations"
  on public.ai_conversation_messages for all to authenticated
  using (exists (
    select 1
    from public.ai_conversations conversation
    join public.users u on u.id = conversation.user_id
    where conversation.id = ai_conversation_messages.conversation_id
      and u.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1
    from public.ai_conversations conversation
    join public.users u on u.id = conversation.user_id
    where conversation.id = ai_conversation_messages.conversation_id
      and u.auth_user_id = (select auth.uid())
  ));
