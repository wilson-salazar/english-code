-- ============================================================
-- SEED — Grammar Chapters, pilot chapter for A2
-- Run this entire file as a single transaction, AFTER
-- 20260922000000_add_chapters_module.sql has been applied and committed
-- (its ALTER TYPE ... ADD VALUE statements must land first).
--
-- Note: each chapter below is a single `do $$ ... $$` block (not a shared
-- pg_temp function called from separate statements) — the Supabase CLI's
-- seed runner does not guarantee the same session across top-level
-- statements in a seed file, so a pg_temp function created in one
-- statement is not visible to a later `select` statement. Migrations run
-- differently and don't have this issue (see
-- 20260720020000_remove_a1_add_level_curriculum.sql), but seed files do —
-- copy this per-chapter `do $$ ... $$` pattern for any new chapter.
-- ============================================================

-- ============================================================
-- A2 — Present Simple and Present Continuous
-- ============================================================
do $$
declare
  lvl_id uuid;
  ch_id uuid;
begin
  select id into lvl_id from public.levels where code = 'A2';

  insert into public.chapters (
    level_id, title, description, order_index, generation_mode, is_published
  ) values (
    lvl_id,
    'Present Simple and Continuous',
    'Learn when to describe your daily routine versus what you are doing right now — the foundation for talking about your workday in English.',
    1,
    'pre_generated',
    true
  ) returning id into ch_id;

  insert into public.chapter_phases (chapter_id, phase_type, content, order_index)
  values
    (ch_id, 'explanation', $x${
      "topic": "Present Simple and Present Continuous",
      "summary": "Use the Present Simple for routines, facts, and things that are generally true. Use the Present Continuous for actions happening right now or temporary situations around the present.",
      "rules": [
        {
          "title": "Present Simple",
          "structure": "Subject + verb (+ s/es for he/she/it)",
          "explanation": "Describes habits, routines, facts, and permanent situations. With he/she/it, add -s or -es to the verb. Negatives use do not/does not + base verb; questions start with Do/Does.",
          "examples": [
            "I write unit tests every day.",
            "She reviews pull requests every morning.",
            "The server does not restart automatically.",
            "Does the pipeline run on every commit?"
          ]
        },
        {
          "title": "Present Continuous",
          "structure": "Subject + am/is/are + verb-ing",
          "explanation": "Describes an action happening right now, or a temporary situation around the present time. Negatives use am/is/are + not + verb-ing; questions start with Am/Is/Are.",
          "examples": [
            "I am fixing a bug right now.",
            "She is reviewing my pull request at the moment.",
            "We are not deploying today.",
            "Is the build still running?"
          ]
        }
      ],
      "common_mistakes": [
        "Forgetting the -s in third person singular: \"She work\" should be \"She works\".",
        "Using Present Continuous for routines: \"I am writing tests every day\" should be \"I write tests every day\".",
        "Forgetting am/is/are before the -ing verb: \"I fixing the bug\" should be \"I am fixing the bug\".",
        "Using Present Simple for something happening right now: \"I fix the bug now\" should be \"I am fixing the bug now\"."
      ]
    }$x$::jsonb, 1),
    (ch_id, 'immersion', $x${
      "source": "Dev diary",
      "text": "**My Monday routine**\n\nI usually start my day at nine. I check Slack, and then I open my task board. Every morning, I review at least two pull requests before I write any new code. Today, though, is different — I am fixing a critical bug that came in overnight.\n\nNormally, our tests run automatically in the pipeline, but right now the pipeline is failing. My teammate Sara is investigating the database connection issue, and I am helping her while I wait for my own build.\n\nWe do not usually work this fast, but the client needs this fix by noon. I am learning a lot today about how our deployment system really works.",
      "highlighted_words": ["usually", "check", "review", "run", "am fixing", "is failing", "is investigating", "am helping", "do not"]
    }$x$::jsonb, 2),
    (ch_id, 'comprehension', $x${
      "questions": [
        {"question": "What does the writer usually do at the start of the day?", "expected_keywords": ["check", "slack", "review", "pull request"]},
        {"question": "Why is today different from a normal day?", "expected_keywords": ["fixing", "critical bug", "overnight"]},
        {"question": "What is Sara doing right now?", "expected_keywords": ["investigating", "database", "connection"]}
      ]
    }$x$::jsonb, 3),
    (ch_id, 'practice', $x${
      "instructions": "Choose the correct form: Present Simple or Present Continuous.",
      "items": [
        {"type": "fill_blank", "sentence": "She usually ___ (review) pull requests in the morning.", "answer": "reviews"},
        {"type": "fill_blank", "sentence": "Right now, I ___ (fix) a critical bug.", "answer": "am fixing"},
        {"type": "fill_blank", "sentence": "Listen! The build ___ (fail) again.", "answer": "is failing"},
        {"type": "multiple_choice", "question": "Which sentence describes a routine?", "options": ["I am writing tests right now.", "I write tests every day.", "I am reviewing your PR at the moment."], "answer_index": 1},
        {"type": "multiple_choice", "question": "Which sentence is correct?", "options": ["She check her email every morning.", "She checking her email every morning.", "She checks her email every morning."], "answer_index": 2},
        {"type": "multiple_choice", "question": "What is happening in this sentence: \"Sara is investigating the database issue\"?", "options": ["A routine action", "An action happening right now", "A future plan"], "answer_index": 1}
      ]
    }$x$::jsonb, 4),
    (ch_id, 'expression', $x${
      "prompt": "Write 4-6 sentences about your typical workday as a developer or QA. Use Present Simple for things you usually do, and Present Continuous for something you are doing right now or today that is different from usual.",
      "evaluation_criteria": ["grammar_accuracy", "clarity", "naturalness"]
    }$x$::jsonb, 5);
end $$;
