-- ============================================================
-- SEED — Grammar Chapters for B2
-- Same per-chapter `do $$ ... $$` pattern as seed_chapters_a2.sql
-- (see the note there about pg_temp functions in seed files).
-- ============================================================

-- ============================================================
-- B2 — Conditionals: real, unreal, mixed, and alternatives to "if"
-- ============================================================
do $$
declare
  lvl_id uuid;
  ch_id uuid;
begin
  select id into lvl_id from public.levels where code = 'B2';

  insert into public.chapters (
    level_id, title, description, order_index, generation_mode, is_published
  ) values (
    lvl_id,
    'Conditionals: Real, Unreal and Mixed',
    'Talk about real possibilities, imaginary situations, and past regrets — including mixed conditionals, "unless", "as long as", and inversion — to explain decisions and incidents at work.',
    1,
    'pre_generated',
    true
  ) returning id into ch_id;

  insert into public.chapter_phases (chapter_id, phase_type, content, order_index)
  values
    (ch_id, 'explanation', $x${
      "topic": "Conditionals at B2",
      "summary": "Conditionals let you describe facts, real possibilities, imaginary situations, and past regrets. At B2 you also need mixed conditionals, alternatives to \"if\", and formal inversion.",
      "rules": [
        {
          "title": "Zero and First Conditional (real situations)",
          "structure": "If + present simple, present simple / will + base verb",
          "explanation": "Zero conditional states general facts and rules. First conditional talks about a real, possible future situation. Do not use \"will\" in the if-clause.",
          "examples": [
            "If a test fails, the pipeline stops.",
            "If the deployment fails tonight, we will roll back.",
            "We will not merge the branch if the tests are red."
          ]
        },
        {
          "title": "Second Conditional (unreal or unlikely present/future)",
          "structure": "If + past simple, would + base verb",
          "explanation": "Describes imaginary or unlikely situations and advice. Use \"were\" for all subjects in formal English: \"If I were you...\".",
          "examples": [
            "If we had more engineers, we would run a staging environment for every branch.",
            "If I were you, I would ask for a code review.",
            "What would you do if the database went down?"
          ]
        },
        {
          "title": "Third Conditional (unreal past, regrets)",
          "structure": "If + past perfect, would have + past participle",
          "explanation": "Describes something that did not happen in the past and its imagined result. It is often used to analyze mistakes and incidents.",
          "examples": [
            "If we had added a load test, we would have caught the memory leak.",
            "If she had escalated earlier, the outage would not have lasted so long."
          ]
        },
        {
          "title": "Mixed Conditionals",
          "structure": "If + past perfect, would + base verb  |  If + past simple, would have + past participle",
          "explanation": "Mix time references. Past cause with a present result: \"If I had learned SQL earlier, I would be a better analyst now.\" Present state with a past result: \"If the server were more stable, the release would not have been delayed.\"",
          "examples": [
            "If I had learned SQL earlier, I would be a better analyst now.",
            "If the server were more stable, the release would not have been delayed."
          ]
        },
        {
          "title": "Alternatives to \"if\" and inversion",
          "structure": "unless / as long as / provided (that) / in case / otherwise  |  Had + subject + past participle / Should + subject + base verb / Were + subject + to",
          "explanation": "\"Unless\" means \"if not\". \"As long as\" and \"provided that\" mean \"only if\". \"In case\" means \"because it might happen\". Inversion removes \"if\" and sounds more formal.",
          "examples": [
            "Nobody merges to main unless the rollback check passes.",
            "You can ship on Friday as long as the pipeline is green.",
            "Take a charger in case the battery dies.",
            "Had we followed the runbook, the outage would not have happened.",
            "Should you need help, contact the on-call engineer."
          ]
        }
      ],
      "common_mistakes": [
        "Using \"will\" in the if-clause: \"If it will fail, we roll back\" should be \"If it fails, we will roll back\".",
        "Using \"would\" in the if-clause: \"If we would have tested\" should be \"If we had tested\".",
        "Mixing up unless and if not: \"Unless the tests do not pass\" should be \"Unless the tests pass\" (unless already means if not).",
        "Forgetting the past participle in the third conditional: \"we would have find it\" should be \"we would have found it\"."
      ]
    }$x$::jsonb, 1),
    (ch_id, 'immersion', $x${
      "source": "Retro notes",
      "text": "**Retro notes: the payment outage**\n\nIf we had added a load test before the release, we would have caught the memory leak. That is the main lesson from this incident.\n\nWe are not a large team. If we had more engineers, we would run a full staging environment for every branch, but we rely on one shared staging server. If that server were more stable, the release would not have been delayed by two days.\n\nFrom now on, we will deploy on Fridays only if the pipeline is green. Nobody merges to main unless the rollback script passes its check. We can ship fast as long as the checks stay automatic. In case the alert fires at night, the on-call engineer follows the runbook.\n\nHad we followed this process last month, the outage would never have happened. Should you need help with the new checklist, ask Priya.",
      "highlighted_words": ["if we had added", "would have caught", "if we had more engineers", "would run", "if that server were more stable", "would not have been delayed", "only if", "unless", "as long as", "in case", "had we followed", "should you need"]
    }$x$::jsonb, 2),
    (ch_id, 'comprehension', $x${
      "questions": [
        {"question": "What would the team have caught if they had added a load test?", "expected_keywords": ["memory leak", "leak"]},
        {"question": "Why does the team use only one shared staging server?", "expected_keywords": ["small", "not a large team", "engineers", "not enough"]},
        {"question": "Under what condition can nobody merge to main?", "expected_keywords": ["rollback", "script", "check", "unless", "does not pass", "fails"]}
      ]
    }$x$::jsonb, 3),
    (ch_id, 'practice', $x${
      "instructions": "Choose the correct conditional form.",
      "items": [
        {"type": "fill_blank", "sentence": "If we ___ (add) a load test, we would have caught the bug.", "answer": "had added"},
        {"type": "fill_blank", "sentence": "If the server ___ (be) more stable, we would deploy every day.", "answer": "were"},
        {"type": "fill_blank", "sentence": "If we had tested earlier, we would ___ (find) the bug.", "answer": "have found"},
        {"type": "multiple_choice", "question": "Which sentence is a third conditional?", "options": ["If the test fails, the pipeline stops.", "If we had reviewed the code, we would have found the bug.", "If we had more time, we would refactor the module."], "answer_index": 1},
        {"type": "multiple_choice", "question": "Complete the mixed conditional: \"If I had learned SQL earlier, I ___ a better data engineer now.\"", "options": ["would be", "would have been", "will be"], "answer_index": 0},
        {"type": "multiple_choice", "question": "Which sentence means the same as \"If the alert does not fire, nobody wakes up\"?", "options": ["Nobody wakes up unless the alert fires.", "Nobody wakes up unless the alert does not fire.", "Nobody wakes up if the alert fires."], "answer_index": 0},
        {"type": "multiple_choice", "question": "Which sentence means the same as \"Had we followed the runbook, the outage would not have lasted so long\"?", "options": ["If we followed the runbook, the outage would not last so long.", "If we had followed the runbook, the outage would not have lasted so long.", "If we would follow the runbook, the outage would not have lasted so long."], "answer_index": 1}
      ]
    }$x$::jsonb, 4),
    (ch_id, 'expression', $x${
      "prompt": "Write 5-6 sentences about a mistake or incident at work (real or imagined). Use at least one third conditional (what would have happened differently), one second conditional (an unreal present situation), and one alternative to \"if\" such as unless, as long as, or provided that.",
      "evaluation_criteria": ["grammar_accuracy", "clarity", "naturalness"]
    }$x$::jsonb, 5);
end $$;
