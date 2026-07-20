-- ============================================================
-- SEED — Scenarios 2–5 for A2 level
-- Run this entire file as a single transaction in Supabase SQL editor
-- ============================================================

-- ============================================================
-- SCENARIO 2: Writing a Pull Request
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
    'Writing a Pull Request',
    'You are a developer. You just finished fixing a bug in the payment module. Now you need to create a pull request on GitHub with a clear description so your teammates can review and approve your changes.',
    2,
    'pre_generated',
    true
  )
  returning id into sid;

  insert into vocabulary (scenario_id, word, definition, example_sentence, order_index)
  values
    (sid, 'pull request', 'A proposal to merge your code changes into the main codebase', 'I opened a pull request for the payment bug fix — can you take a look?', 1),
    (sid, 'branch', 'A separate version of the code where you work on a specific feature or fix', 'I created a branch called fix/payment-timeout to work on this issue.', 2),
    (sid, 'merge', 'To combine code from one branch into another', 'Once the review is approved, we can merge the branch into main.', 3),
    (sid, 'review', 'To read and check someone else''s code before approving it', 'Could you do a quick review of my pull request before end of day?', 4),
    (sid, 'conflict', 'When two changes in different branches affect the same code in different ways', 'There is a conflict in the config file — I need to resolve it before merging.', 5),
    (sid, 'diff', 'The visual difference showing what changed between the old code and the new code', 'Check the diff — I only changed three lines in the payment handler.', 6),
    (sid, 'approve', 'To accept the changes in a pull request after reviewing them', 'The tech lead approved the PR, so we can merge now.', 7);

  insert into scenario_phases (scenario_id, phase_type, content, order_index)
  values
    (
      sid,
      'immersion',
      jsonb_build_object(
        'source', 'GitHub — Pull Request #142',
        'text', '**fix: resolve payment timeout on mobile checkout**

**Branch:** fix/payment-timeout → main
**Author:** Alex Rivera
**Reviewers:** Sara Kim, Dev Team

**What does this PR do?**
This pull request fixes a bug where the payment request was timing out on slow mobile connections. The diff shows changes in the payment handler and the timeout configuration.

**Steps to test:**
1. Switch to the branch fix/payment-timeout
2. Open the checkout page on a mobile device with a slow connection
3. Complete a payment — it should now succeed

**Notes:**
There was a conflict with the config file. I resolved it by keeping the new timeout value (30s instead of 10s).

Please review and approve if everything looks good. I will merge after two approvals.',
        'highlighted_words', '["pull request", "branch", "merge", "review", "conflict", "diff", "approve"]'
      ),
      1
    ),
    (
      sid,
      'comprehension',
      jsonb_build_object(
        'questions', jsonb_build_array(
          jsonb_build_object(
            'question', 'What problem does this pull request fix?',
            'expected_keywords', '["payment", "timeout", "mobile", "slow connection"]'
          ),
          jsonb_build_object(
            'question', 'What was the conflict about, and how was it resolved?',
            'expected_keywords', '["config", "timeout", "30s", "resolved"]'
          ),
          jsonb_build_object(
            'question', 'What needs to happen before the branch is merged?',
            'expected_keywords', '["two approvals", "review", "approve"]'
          )
        )
      ),
      2
    ),
    (
      sid,
      'expression',
      jsonb_build_object(
        'prompt', 'Write a pull request description for the following change: You fixed a bug where users could not upload profile pictures larger than 2MB. You changed the file size limit in the API. Use the vocabulary from this scenario: pull request, branch, merge, review, diff, approve.',
        'evaluation_criteria', '["vocabulary", "clarity", "naturalness"]'
      ),
      3
    );
end $$;


-- ============================================================
-- SCENARIO 3: Daily Standup
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
    'Daily Standup',
    'Every morning your team has a short meeting called a standup. Each person answers three questions: What did you do yesterday? What are you doing today? Do you have any blockers? You need to give your update clearly and concisely.',
    3,
    'pre_generated',
    true
  )
  returning id into sid;

  insert into vocabulary (scenario_id, word, definition, example_sentence, order_index)
  values
    (sid, 'blocker', 'Something that stops you from finishing your work', 'My blocker is that I''m waiting for the API documentation from the backend team.', 1),
    (sid, 'in progress', 'Currently being worked on, not finished yet', 'The search feature is still in progress — I expect to finish it today.', 2),
    (sid, 'pick up', 'To start working on a task', 'After this meeting I will pick up the notification bug.', 3),
    (sid, 'ETA', 'Estimated time of arrival — when you expect something to be finished', 'The ETA for the fix is end of day Thursday.', 4),
    (sid, 'dependency', 'Something your work needs before it can move forward', 'I have a dependency on the design team — I need the new icons before I can continue.', 5),
    (sid, 'sync', 'To coordinate or share information with someone', 'Can we sync after the standup to discuss the authentication issue?', 6),
    (sid, 'wrap up', 'To finish or complete something', 'I should wrap up the unit tests by noon.', 7);

  insert into scenario_phases (scenario_id, phase_type, content, order_index)
  values
    (
      sid,
      'immersion',
      jsonb_build_object(
        'source', 'Slack — #team-standup',
        'text', '**Daily Standup — Tuesday 9:00 AM**

**Jordan (Backend):**
Yesterday I wrapped up the user authentication refactor. Today I will pick up the password reset bug — ETA is end of day. No blockers.

**Priya (QA):**
Yesterday I finished testing the checkout flow. I found two issues and created tickets for them. Today I''m in progress on the payment module tests. My only dependency is waiting for the staging environment — it was down yesterday. I''ll sync with DevOps after this call.

**Carlos (Frontend):**
Yesterday I reviewed three pull requests. Today I will continue with the dashboard redesign. I do have a blocker: I need the final color tokens from the design team before I can continue. ETA unknown until they respond.',
        'highlighted_words', '["blocker", "in progress", "pick up", "ETA", "dependency", "sync", "wrap up"]'
      ),
      1
    ),
    (
      sid,
      'comprehension',
      jsonb_build_object(
        'questions', jsonb_build_array(
          jsonb_build_object(
            'question', 'What is Carlos''s blocker?',
            'expected_keywords', '["design team", "color tokens", "waiting"]'
          ),
          jsonb_build_object(
            'question', 'What is Jordan working on today and what is the ETA?',
            'expected_keywords', '["password reset", "bug", "end of day"]'
          ),
          jsonb_build_object(
            'question', 'Why does Priya need to sync with DevOps?',
            'expected_keywords', '["staging", "environment", "down"]'
          )
        )
      ),
      2
    ),
    (
      sid,
      'expression',
      jsonb_build_object(
        'prompt', 'Write your standup update for today. Use this information: Yesterday you finished writing test cases for the login page. Today you will pick up the registration flow tests. You have a blocker: you need access to the test environment but you don''t have credentials yet. Use the vocabulary: blocker, in progress, pick up, ETA, dependency, sync.',
        'evaluation_criteria', '["vocabulary", "clarity", "naturalness"]'
      ),
      3
    );
end $$;


-- ============================================================
-- SCENARIO 4: Reading an Error Log
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
    'Reading an Error Log',
    'Your application is throwing errors in production. You receive a Slack alert with an error log. You need to understand what went wrong, find the relevant information in the log, and explain the problem clearly to your team.',
    4,
    'pre_generated',
    true
  )
  returning id into sid;

  insert into vocabulary (scenario_id, word, definition, example_sentence, order_index)
  values
    (sid, 'exception', 'An error that interrupts the normal flow of a program', 'The app threw a NullPointerException when the user field was empty.', 1),
    (sid, 'stack trace', 'A list of functions that were called before an error occurred, shown in the log', 'Check the stack trace — the error starts in the payment controller.', 2),
    (sid, 'timeout', 'When a request takes too long and is automatically cancelled', 'The database query hit a timeout after 30 seconds.', 3),
    (sid, 'null', 'A value that represents the absence of data — nothing is there', 'The user ID was null, which caused the exception.', 4),
    (sid, 'log', 'A record of events, errors, and actions that happened in the application', 'I checked the log and found the error happened at 3:42 AM.', 5),
    (sid, 'endpoint', 'A specific URL where an API receives and responds to requests', 'The error is coming from the /api/checkout endpoint.', 6),
    (sid, 'payload', 'The data sent with a request or received in a response', 'The payload was missing the required field "amount".', 7);

  insert into scenario_phases (scenario_id, phase_type, content, order_index)
  values
    (
      sid,
      'immersion',
      jsonb_build_object(
        'source', 'Datadog alert — Production Error',
        'text', '**[CRITICAL] 47 exceptions in the last 5 minutes**
Service: checkout-api | Environment: production

**Error:** NullPointerException
**Endpoint:** POST /api/checkout
**Timestamp:** 2024-03-15 03:42:18 UTC

**Stack trace:**
at CheckoutController.processPayment (line 84)
at PaymentService.charge (line 201)
at DatabaseClient.query (line 55)

**Log message:**
Failed to process payment. The payload is missing field: user_id. Received value: null.
Request timed out after 30000ms waiting for database response.

**Suggested action:**
Check the payload validation on the endpoint. The user_id field must not be null. Also investigate the database timeout — queries are taking longer than expected.',
        'highlighted_words', '["exception", "stack trace", "timeout", "null", "log", "endpoint", "payload"]'
      ),
      1
    ),
    (
      sid,
      'comprehension',
      jsonb_build_object(
        'questions', jsonb_build_array(
          jsonb_build_object(
            'question', 'What caused the exception according to the log?',
            'expected_keywords', '["user_id", "null", "missing", "payload"]'
          ),
          jsonb_build_object(
            'question', 'Which endpoint is throwing the error?',
            'expected_keywords', '["/api/checkout", "checkout", "POST"]'
          ),
          jsonb_build_object(
            'question', 'What are the two problems described in the log?',
            'expected_keywords', '["null user_id", "timeout", "database", "payload"]'
          )
        )
      ),
      2
    ),
    (
      sid,
      'expression',
      jsonb_build_object(
        'prompt', 'Explain this error to a developer who has not seen the log. Write a short message (like a Slack message) describing: what happened, which endpoint has the problem, what the payload issue is, and what you think the team should check first. Use the vocabulary: exception, stack trace, null, payload, endpoint, log, timeout.',
        'evaluation_criteria', '["vocabulary", "clarity", "naturalness"]'
      ),
      3
    );
end $$;


-- ============================================================
-- SCENARIO 5: Writing Test Cases
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
    'Writing Test Cases',
    'You are a QA engineer. A new feature was just deployed: users can now reset their password via email. You need to write test cases for this feature and explain your results to the development team.',
    5,
    'pre_generated',
    true
  )
  returning id into sid;

  insert into vocabulary (scenario_id, word, definition, example_sentence, order_index)
  values
    (sid, 'test case', 'A set of steps and conditions used to check if a specific feature works correctly', 'I wrote 12 test cases for the password reset feature.', 1),
    (sid, 'pass', 'When a test produces the expected result — the feature works correctly', 'All 10 happy path test cases pass.', 2),
    (sid, 'fail', 'When a test does not produce the expected result — there is a problem', 'TC-07 fails: the reset link does not expire after 24 hours.', 3),
    (sid, 'regression', 'When a new change breaks something that previously worked correctly', 'After the deploy, login stopped working — that is a regression.', 4),
    (sid, 'edge case', 'An unusual or extreme situation that might cause unexpected behavior', 'An edge case to test: what happens if the user clicks the reset link twice?', 5),
    (sid, 'coverage', 'The percentage of features or code paths that are tested', 'We have 80% coverage on the authentication module.', 6),
    (sid, 'assertion', 'A specific check in a test that verifies a condition is true', 'The assertion checks that the user receives an email within 60 seconds.', 7);

  insert into scenario_phases (scenario_id, phase_type, content, order_index)
  values
    (
      sid,
      'immersion',
      jsonb_build_object(
        'source', 'Confluence — QA Test Report',
        'text', '**Test Report: Password Reset Feature**
**QA Engineer:** Sam Torres | **Date:** 2024-03-14

**Coverage:** 12 test cases written — 10 pass, 2 fail.

**TC-01 (Pass):** User enters a valid email → system sends reset email within 60 seconds.
Assertion: email received, link is valid.

**TC-05 (Pass):** User enters an email that does not exist → system shows generic message.
This is an important edge case for security.

**TC-07 (Fail):** Reset link is still valid after 24 hours → link should expire.
This is a regression — the previous password system did expire links correctly.

**TC-11 (Fail):** User clicks the reset link twice → second click shows no error.
Another edge case. Assertion fails: expected "link already used" message.

**Summary for dev team:**
Two failures. TC-07 is a regression — priority high. TC-11 is an edge case that needs a fix before release. I recommend increasing test coverage on the email expiry logic.',
        'highlighted_words', '["test case", "pass", "fail", "regression", "edge case", "coverage", "assertion"]'
      ),
      1
    ),
    (
      sid,
      'comprehension',
      jsonb_build_object(
        'questions', jsonb_build_array(
          jsonb_build_object(
            'question', 'Why is TC-07 considered a regression?',
            'expected_keywords', '["previous", "worked", "expired", "links", "before"]'
          ),
          jsonb_build_object(
            'question', 'What is the assertion in TC-01?',
            'expected_keywords', '["email received", "link valid", "60 seconds"]'
          ),
          jsonb_build_object(
            'question', 'What does the QA engineer recommend for the team?',
            'expected_keywords', '["coverage", "email expiry", "priority", "high"]'
          )
        )
      ),
      2
    ),
    (
      sid,
      'expression',
      jsonb_build_object(
        'prompt', 'Write a short test summary (like a Confluence note) for the following situation: You tested a new feature — users can now update their email address from their profile page. You wrote 8 test cases. 6 pass. 2 fail: one edge case where the user enters an email that is already in use shows no error message, and one regression where changing email logs the user out unexpectedly. Use the vocabulary: test case, pass, fail, regression, edge case, coverage, assertion.',
        'evaluation_criteria', '["vocabulary", "clarity", "naturalness"]'
      ),
      3
    );
end $$;
