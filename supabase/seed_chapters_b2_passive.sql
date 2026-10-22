-- ============================================================
-- SEED — B2 Grammar Chapter 2: Passive voice
-- Additive only (inserts one chapter + its phases). Safe to apply to a DB
-- that already has user data:
--   psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/seed_chapters_b2_passive.sql
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
    'Passive Voice and Reporting Structures',
    'Describe what happened without naming who did it — in every tense, with modals, and with "It is believed that..." — the natural style of release notes, incident reports and documentation.',
    2,
    'pre_generated',
    true
  ) returning id into ch_id;

  insert into public.chapter_phases (chapter_id, phase_type, content, order_index)
  values
    (ch_id, 'explanation', $x${
      "topic": "Passive Voice at B2",
      "summary": "Use the passive when the action or its result matters more than who did it, when the doer is unknown, or when you want a more formal, impersonal tone — typical in reports and documentation.",
      "rules": [
        {
          "title": "Form: be + past participle",
          "structure": "Subject + be (in the right tense) + past participle (+ by + agent)",
          "explanation": "The object of the active sentence becomes the subject. Only add \"by + agent\" when knowing who did it is important.",
          "examples": [
            "The logs are stored for 30 days. (present simple)",
            "The bug was fixed yesterday. (past simple)",
            "All customer data has been migrated. (present perfect)",
            "The database is being archived this week. (present continuous)",
            "The patch will be released tomorrow. (future)"
          ]
        },
        {
          "title": "Passive with modal verbs",
          "structure": "Subject + modal + be + past participle",
          "explanation": "Use modals for obligations, possibilities and permissions. For past situations use modal + have been + past participle.",
          "examples": [
            "Logs must be reviewed before the patch is approved.",
            "The issue can be reproduced on Android.",
            "The problem should have been detected earlier."
          ]
        },
        {
          "title": "Passive of reporting verbs",
          "structure": "It is believed / said / reported / known that + clause  |  Subject + is believed / said / known + to + infinitive (or to have + past participle)",
          "explanation": "Use these structures to report what people think or say without saying who. Use \"to have + past participle\" for something that happened earlier.",
          "examples": [
            "It is believed that the issue was caused by a configuration change.",
            "The issue is believed to have been caused by a configuration change.",
            "The service is said to be unstable under heavy load."
          ]
        },
        {
          "title": "Two objects and the get-passive",
          "structure": "Person + was given / offered / told + thing  |  get + past participle (informal)",
          "explanation": "Verbs like give, offer, send and tell can have two objects, so two passives are possible. The person is usually the subject. \"Get\" replaces \"be\" in informal speech for things that happen, often unexpectedly.",
          "examples": [
            "Sara was given access to the repository.",
            "The team was told to freeze the release.",
            "The deployment got cancelled at the last minute."
          ]
        }
      ],
      "common_mistakes": [
        "Forgetting the verb be: \"The bug fixed yesterday\" should be \"The bug was fixed yesterday\".",
        "Using the wrong participle: \"The module was builded\" should be \"The module was built\".",
        "Passivizing intransitive verbs: \"The outage was happened\" should be \"The outage happened\" (happen, occur, arrive and exist have no passive).",
        "Adding a useless agent: \"The file was deleted by someone\" is usually just \"The file was deleted\"."
      ]
    }$x$::jsonb, 1),
    (ch_id, 'immersion', $x${
      "source": "Release report",
      "text": "**Release report: version 4.2**\n\nThe new billing module was deployed on Tuesday. All customer data has been migrated, and the old database is being archived this week. The migration was tested in staging, but two edge cases were missed.\n\nYesterday, a critical bug was reported by a customer. It is believed that the issue was introduced by a recent configuration change. The affected service has been rolled back, and a fix will be released tomorrow. Logs must be reviewed before the patch can be approved.\n\nThe team was given two extra days to finish the tests. It is said that the new automated checks will prevent similar problems.",
      "highlighted_words": ["was deployed", "has been migrated", "is being archived", "were missed", "was reported", "it is believed that", "has been rolled back", "will be released", "must be reviewed", "was given", "it is said that"]
    }$x$::jsonb, 2),
    (ch_id, 'comprehension', $x${
      "questions": [
        {"question": "When was the new billing module deployed?", "expected_keywords": ["tuesday"]},
        {"question": "What is believed to have caused the critical bug?", "expected_keywords": ["configuration", "config", "change"]},
        {"question": "What must happen before the patch can be approved?", "expected_keywords": ["logs", "reviewed", "review"]}
      ]
    }$x$::jsonb, 3),
    (ch_id, 'practice', $x${
      "instructions": "Choose or write the correct passive form.",
      "items": [
        {"type": "fill_blank", "sentence": "The bug ___ (fix) yesterday by the QA team.", "answer": "was fixed"},
        {"type": "fill_blank", "sentence": "The new version ___ (release) next Monday.", "answer": "will be released"},
        {"type": "fill_blank", "sentence": "All the servers ___ (migrate) at the moment.", "answer": "are being migrated"},
        {"type": "multiple_choice", "question": "Which sentence is passive?", "options": ["The team fixed the bug.", "The bug was fixed by the team.", "The team is fixing the bug."], "answer_index": 1},
        {"type": "multiple_choice", "question": "Which sentence is correct?", "options": ["The outage was happened last night.", "The outage happened last night.", "The outage has happened by the network."], "answer_index": 1},
        {"type": "multiple_choice", "question": "Which sentence means the same as \"People believe the leak started in March\"?", "options": ["It is believed that the leak started in March.", "It believes that the leak started in March.", "The leak is believing to start in March."], "answer_index": 0},
        {"type": "multiple_choice", "question": "Complete the sentence: \"Sara ___ access to the repository last week.\"", "options": ["was given", "gave", "is giving"], "answer_index": 0}
      ]
    }$x$::jsonb, 4),
    (ch_id, 'expression', $x${
      "prompt": "Write 5-6 sentences of a short incident or release report for your team. Use the passive voice at least four times, including one passive with a modal (must / can / should be...) and one reporting structure such as \"It is believed that...\" or \"The bug is said to have been...\".",
      "evaluation_criteria": ["grammar_accuracy", "clarity", "naturalness"]
    }$x$::jsonb, 5);
end $$;
