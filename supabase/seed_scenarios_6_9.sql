-- ============================================================
-- SEED — Scenarios 6–9 for A2 level
-- Run this entire file as a single transaction in Supabase SQL editor
-- ============================================================

-- ============================================================
-- SCENARIO 6: Asking for Help in Slack
-- ============================================================
do $$
declare
  sid uuid;
  lid uuid;
begin
  select id into lid from levels where code = 'A2';

  insert into scenarios (level_id, title, context, order_index, generation_mode, is_published)
  values (
    lid,
    'Asking for Help in Slack',
    'You are stuck on a task. The API you are integrating is returning an unexpected error. You need to write a Slack message asking your team for help — with enough context so someone can assist you quickly without asking too many questions.',
    6,
    'pre_generated',
    true
  )
  returning id into sid;

  insert into vocabulary (scenario_id, word, definition, example_sentence, order_index)
  values
    (sid, 'thread', 'A connected series of messages in Slack about the same topic', 'I replied in the thread so we don''t spam the main channel.', 1),
    (sid, 'snippet', 'A small piece of code shared in a message for context', 'Here is a snippet of the error I''m getting — line 42.', 2),
    (sid, 'reproduce', 'To make the same error or problem happen again', 'I can reproduce the error every time I send a POST request.', 3),
    (sid, 'context', 'Background information that helps someone understand your situation', 'Let me give you some context before I share the error.', 4),
    (sid, 'mention', 'To tag someone in a message using @name so they are notified', 'I mentioned the backend team so they see this issue.', 5),
    (sid, 'block', 'To be unable to continue your work because of a problem', 'I''m blocked on this — can anyone help?', 6),
    (sid, 'async', 'Communication that does not require an immediate response', 'No rush — this is async, reply when you have a moment.', 7);

  insert into scenario_phases (scenario_id, phase_type, content, order_index)
  values
    (
      sid,
      'immersion',
      jsonb_build_object(
        'source', 'Slack — #dev-help',
        'text', E'**@backend-team** — asking for help, I''m blocked on the payments integration.\n\nHi team! I need some context from someone who knows the payments API.\n\n**What I''m trying to do:**\nI''m sending a POST request to /api/payments/charge to process a transaction.\n\n**The problem:**\nI keep getting a 422 error. I can reproduce it every time with the same payload.\n\n**Here''s a snippet of the request:**\n```\nPOST /api/payments/charge\n{ "amount": 5000, "currency": "USD", "user_id": null }\n```\n\n**What I already tried:**\n- Checked the API docs\n- Tested with Postman — same result\n- Verified the token is valid\n\nI think the issue might be the null user_id but I''m not sure why it''s null at this point in the flow. No rush — async is fine. Can someone reply in this thread when they have a moment? Thanks!',
        'highlighted_words', '["thread", "snippet", "reproduce", "context", "mention", "block", "async"]'::jsonb
      ),
      1
    ),
    (
      sid,
      'comprehension',
      jsonb_build_object(
        'questions', jsonb_build_array(
          jsonb_build_object(
            'question', 'What is the developer trying to do and what problem are they having?',
            'expected_keywords', '["payment", "POST", "422 error", "charge"]'
          ),
          jsonb_build_object(
            'question', 'What has the developer already tried before asking for help?',
            'expected_keywords', '["API docs", "Postman", "token"]'
          ),
          jsonb_build_object(
            'question', 'Why does the developer say "async is fine"?',
            'expected_keywords', '["no rush", "no immediate", "reply when", "not urgent"]'
          )
        )
      ),
      2
    ),
    (
      sid,
      'expression',
      jsonb_build_object(
        'prompt', 'Write a Slack message asking for help with this problem: You are trying to run the test suite but it keeps failing. The error says "database connection refused". You already checked your .env file and the credentials look correct. You can reproduce it on your machine but not on the CI server. Tag the DevOps team. Use the vocabulary: thread, snippet, reproduce, context, mention, block, async.',
        'evaluation_criteria', '["vocabulary", "clarity", "naturalness"]'
      ),
      3
    );
end $$;


-- ============================================================
-- SCENARIO 7: Writing Release Notes
-- ============================================================
do $$
declare
  sid uuid;
  lid uuid;
begin
  select id into lid from levels where code = 'A2';

  insert into scenarios (level_id, title, context, order_index, generation_mode, is_published)
  values (
    lid,
    'Writing Release Notes',
    'Your team just deployed version 2.4.0 of the app. You need to write release notes for the changelog so the rest of the team and stakeholders can quickly understand what changed, what was fixed, and if anything will break their existing workflow.',
    7,
    'pre_generated',
    true
  )
  returning id into sid;

  insert into vocabulary (scenario_id, word, definition, example_sentence, order_index)
  values
    (sid, 'release', 'A new version of software that is published and available to users', 'We shipped the release at 3 PM with no issues.', 1),
    (sid, 'changelog', 'A document that lists all the changes in each version of the software', 'Check the changelog — the new export feature was added in v2.3.', 2),
    (sid, 'breaking change', 'A change that stops existing code or integrations from working correctly', 'This is a breaking change — teams using the old API will need to update their code.', 3),
    (sid, 'deprecated', 'A feature that still works but will be removed in a future version', 'The /v1/users endpoint is deprecated — please migrate to /v2/users.', 4),
    (sid, 'feature', 'A new capability or functionality added to the software', 'The main feature in this release is the new dashboard export.', 5),
    (sid, 'fix', 'A correction that resolves a bug or problem in the software', 'This release includes a fix for the mobile login issue.', 6),
    (sid, 'rollback', 'To revert to a previous version of the software if something goes wrong', 'If the release causes issues, we will rollback to v2.3.1.', 7);

  insert into scenario_phases (scenario_id, phase_type, content, order_index)
  values
    (
      sid,
      'immersion',
      jsonb_build_object(
        'source', 'Confluence — Changelog',
        'text', E'**Release v2.4.0 — March 15, 2024**\n\n**New features**\n- Dashboard export: users can now export their data as CSV or PDF directly from the dashboard.\n- Email notifications: users receive an email when a report is ready to download.\n\n**Fixes**\n- Fixed a bug where the login button was unresponsive on mobile devices.\n- Fixed incorrect date formatting in the activity log for users in UTC-5 timezones.\n\n**Breaking change**\n- The /api/v1/reports endpoint has been removed. Teams must migrate to /api/v2/reports before deploying this release. See migration guide in the docs.\n\n**Deprecated**\n- The CSV export option in Settings is deprecated and will be removed in v3.0. Please use the new dashboard export feature instead.\n\n**Rollback plan**\nIf critical issues are found after deploy, rollback to v2.3.2 using the standard deployment pipeline.',
        'highlighted_words', '["release", "changelog", "breaking change", "deprecated", "feature", "fix", "rollback"]'::jsonb
      ),
      1
    ),
    (
      sid,
      'comprehension',
      jsonb_build_object(
        'questions', jsonb_build_array(
          jsonb_build_object(
            'question', 'What is the breaking change in this release and what do teams need to do?',
            'expected_keywords', '["v1/reports", "removed", "migrate", "v2/reports"]'
          ),
          jsonb_build_object(
            'question', 'What are the two new features added in v2.4.0?',
            'expected_keywords', '["dashboard export", "email notifications", "CSV", "PDF"]'
          ),
          jsonb_build_object(
            'question', 'What is deprecated and when will it be removed?',
            'expected_keywords', '["CSV export", "Settings", "v3.0", "deprecated"]'
          )
        )
      ),
      2
    ),
    (
      sid,
      'expression',
      jsonb_build_object(
        'prompt', 'Write release notes for version 3.1.0. Include: (1) a new feature — users can now connect their Google account for single sign-on login; (2) a fix — resolved a crash that happened when uploading files larger than 10MB; (3) a breaking change — the old password login will be removed in v4.0 and is now deprecated. Use the vocabulary: release, changelog, breaking change, deprecated, feature, fix, rollback.',
        'evaluation_criteria', '["vocabulary", "clarity", "naturalness"]'
      ),
      3
    );
end $$;


-- ============================================================
-- SCENARIO 8: Code Review Feedback
-- ============================================================
do $$
declare
  sid uuid;
  lid uuid;
begin
  select id into lid from levels where code = 'A2';

  insert into scenarios (level_id, title, context, order_index, generation_mode, is_published)
  values (
    lid,
    'Giving Code Review Feedback',
    'A teammate opened a pull request and asked you to review it. You need to leave comments that are clear, specific, and professional — explaining what to change and why, without being rude or vague.',
    8,
    'pre_generated',
    true
  )
  returning id into sid;

  insert into vocabulary (scenario_id, word, definition, example_sentence, order_index)
  values
    (sid, 'LGTM', 'Looks Good To Me — a way to say the code is approved and ready to merge', 'Everything looks clean and tested. LGTM — feel free to merge.', 1),
    (sid, 'nitpick', 'A small, non-blocking suggestion about style or naming — not a requirement', 'Nitpick: you could rename this variable to make it clearer, but it''s not blocking.', 2),
    (sid, 'blocker', 'A comment that must be resolved before the PR can be approved', 'This is a blocker — the function will crash if the input is null.', 3),
    (sid, 'suggestion', 'An idea for improvement that the author can choose to accept or ignore', 'Suggestion: consider extracting this logic into a separate helper function.', 4),
    (sid, 'refactor', 'To restructure existing code without changing what it does', 'I would refactor this loop — it''s doing too many things at once.', 5),
    (sid, 'edge case', 'An unusual situation that the code might not handle correctly', 'What happens in the edge case where the list is empty? This will throw an error.', 6),
    (sid, 'inline', 'Written directly in the code rather than in a separate file or comment', 'Left some inline comments on the specific lines — check the diff.', 7);

  insert into scenario_phases (scenario_id, phase_type, content, order_index)
  values
    (
      sid,
      'immersion',
      jsonb_build_object(
        'source', 'GitHub — PR #198 Review Comments',
        'text', E'**Review by: Priya Sharma**\n\n---\n\n**Line 14 — BLOCKER**\nThis function does not handle the edge case where `userId` is null. If null is passed, the app will crash with a NullPointerException. Please add a null check before calling the database.\n\n---\n\n**Line 31 — Suggestion**\nSuggestion: consider extracting the date formatting logic into a separate helper function. Right now it''s inline and makes this method harder to read. Not blocking, just a suggestion for cleaner code.\n\n---\n\n**Line 45 — Nitpick**\nNitpick: the variable name `x` is not descriptive. Something like `transactionAmount` would make this easier to understand. Not a blocker.\n\n---\n\n**General comment:**\nOverall the logic is solid and the tests cover the happy path well. Once you fix the blocker and refactor the date logic (optional), this will be ready to merge. LGTM after those changes! 🙌',
        'highlighted_words', '["LGTM", "nitpick", "blocker", "suggestion", "refactor", "edge case", "inline"]'::jsonb
      ),
      1
    ),
    (
      sid,
      'comprehension',
      jsonb_build_object(
        'questions', jsonb_build_array(
          jsonb_build_object(
            'question', 'What is the blocker in this review and why is it a problem?',
            'expected_keywords', '["null", "userId", "crash", "NullPointerException", "null check"]'
          ),
          jsonb_build_object(
            'question', 'What is the difference between the blocker and the nitpick in this review?',
            'expected_keywords', '["must fix", "not blocking", "optional", "required"]'
          ),
          jsonb_build_object(
            'question', 'What does the reviewer say about the overall quality of the PR?',
            'expected_keywords', '["solid", "tests", "LGTM", "ready to merge"]'
          )
        )
      ),
      2
    ),
    (
      sid,
      'expression',
      jsonb_build_object(
        'prompt', 'Write a code review for a pull request that adds a user search feature. Include: (1) a blocker — the search returns all users including deleted ones, which is a security issue; (2) a suggestion — the search query could be moved to a separate service class; (3) a nitpick — a variable is named "res" but "searchResults" would be clearer; (4) a general LGTM once the blocker is fixed. Use the vocabulary: LGTM, nitpick, blocker, suggestion, refactor, edge case, inline.',
        'evaluation_criteria', '["vocabulary", "clarity", "naturalness"]'
      ),
      3
    );
end $$;


-- ============================================================
-- SCENARIO 9: Writing a Post-Mortem
-- ============================================================
do $$
declare
  sid uuid;
  lid uuid;
begin
  select id into lid from levels where code = 'A2';

  insert into scenarios (level_id, title, context, order_index, generation_mode, is_published)
  values (
    lid,
    'Writing a Post-Mortem',
    'Last night there was an incident in production — the API was down for 45 minutes and users could not access the app. Now your team needs to write a post-mortem document to explain what happened, why it happened, and how to prevent it in the future.',
    9,
    'pre_generated',
    true
  )
  returning id into sid;

  insert into vocabulary (scenario_id, word, definition, example_sentence, order_index)
  values
    (sid, 'incident', 'An unexpected event that causes the system to fail or behave incorrectly', 'We had a major incident last night — the database was unreachable for 45 minutes.', 1),
    (sid, 'root cause', 'The original reason that caused the incident to happen', 'The root cause was a misconfigured environment variable after the deploy.', 2),
    (sid, 'impact', 'The effect the incident had on users or the business', 'The impact was significant — 2,000 users could not log in during the outage.', 3),
    (sid, 'mitigation', 'The action taken to reduce or stop the damage while solving the root cause', 'Our mitigation was to rollback the deploy while we investigated.', 4),
    (sid, 'timeline', 'A chronological list of events showing what happened and when', 'The timeline shows the incident started at 02:15 UTC.', 5),
    (sid, 'action item', 'A specific task that someone must complete to prevent the problem from happening again', 'Action item: add automated checks for environment variables before every deploy.', 6),
    (sid, 'outage', 'A period of time when a system or service is not available', 'The outage lasted 45 minutes before the service was restored.', 7);

  insert into scenario_phases (scenario_id, phase_type, content, order_index)
  values
    (
      sid,
      'immersion',
      jsonb_build_object(
        'source', 'Confluence — Post-Mortem Report',
        'text', E'**Post-Mortem: API Outage — March 14, 2024**\n**Severity:** High | **Duration:** 45 minutes\n\n**Summary**\nOn March 14 at 02:15 UTC, the main API became unreachable. The outage lasted 45 minutes and affected all users. This document explains the incident, the root cause, and our action items.\n\n**Timeline**\n- 02:15 UTC — Monitoring alert fires. API returning 503 errors.\n- 02:22 UTC — On-call engineer notified. Investigation begins.\n- 02:35 UTC — Root cause identified: a missing environment variable after the 01:50 deploy.\n- 02:58 UTC — Mitigation applied: rollback to previous version.\n- 03:00 UTC — Service restored. Incident closed.\n\n**Root cause**\nA deploy at 01:50 UTC introduced a new environment variable (DB_POOL_SIZE) that was not added to the production configuration. This caused all database connections to fail.\n\n**Impact**\nApproximately 2,000 users were unable to access the application. No data was lost.\n\n**Action items**\n1. Add automated validation for required environment variables before every deploy. (Owner: DevOps, ETA: March 20)\n2. Add a smoke test that checks database connectivity after deploy. (Owner: QA, ETA: March 22)\n3. Update the deploy checklist to include environment variable review.',
        'highlighted_words', '["incident", "root cause", "impact", "mitigation", "timeline", "action item", "outage"]'::jsonb
      ),
      1
    ),
    (
      sid,
      'comprehension',
      jsonb_build_object(
        'questions', jsonb_build_array(
          jsonb_build_object(
            'question', 'What was the root cause of the outage?',
            'expected_keywords', '["environment variable", "DB_POOL_SIZE", "missing", "deploy", "database"]'
          ),
          jsonb_build_object(
            'question', 'What was the mitigation and how long did the outage last?',
            'expected_keywords', '["rollback", "45 minutes", "previous version"]'
          ),
          jsonb_build_object(
            'question', 'What are the action items to prevent this from happening again?',
            'expected_keywords', '["environment variable", "validation", "smoke test", "checklist"]'
          )
        )
      ),
      2
    ),
    (
      sid,
      'expression',
      jsonb_build_object(
        'prompt', 'Write a short post-mortem for the following incident: Yesterday at 6 PM, the file upload feature stopped working for 30 minutes. The root cause was a disk quota limit that was reached on the storage server. The impact was that 500 users could not upload documents. The mitigation was to delete old temporary files to free up space. Write two action items to prevent it from happening again. Use the vocabulary: incident, root cause, impact, mitigation, timeline, action item, outage.',
        'evaluation_criteria', '["vocabulary", "clarity", "naturalness"]'
      ),
      3
    );
end $$;
