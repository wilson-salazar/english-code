alter table public.personal_vocabulary
  add column if not exists spanish_meaning text;

comment on column public.personal_vocabulary.spanish_meaning is
  'Short Spanish meaning generated once for the learner vocabulary entry.';
