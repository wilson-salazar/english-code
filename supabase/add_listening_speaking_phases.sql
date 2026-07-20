-- ============================================================
-- Add listening (order 2) and speaking (order 4) phases to
-- all existing scenarios. Also shifts comprehension to 3
-- and expression to 5.
-- Run in Supabase SQL editor.
-- ============================================================

-- Step 1: shift existing comprehension and expression order_index
update scenario_phases sp
set order_index = case
  when phase_type = 'comprehension' then 3
  when phase_type = 'expression'    then 5
  else order_index
end
where phase_type in ('comprehension', 'expression');


-- ============================================================
-- SCENARIO 1: Reporting a Bug
-- ============================================================
do $$
declare sid uuid;
begin
  select id into sid from scenarios where title = 'Reporting a Bug' limit 1;

  insert into scenario_phases (scenario_id, phase_type, content, order_index) values
  (sid, 'listening', jsonb_build_object(
    'dialogue', jsonb_build_array(
      jsonb_build_object('speaker', 'QA (Maria)', 'text', 'Hey, I found a bug. The login button does not respond on mobile.'),
      jsonb_build_object('speaker', 'Dev (Tom)', 'text', 'Interesting. Can you reproduce it?'),
      jsonb_build_object('speaker', 'QA (Maria)', 'text', 'Yes, every time. The steps to reproduce are: open the app on mobile, enter your credentials, and tap the login button.'),
      jsonb_build_object('speaker', 'Dev (Tom)', 'text', 'What is the expected behavior?'),
      jsonb_build_object('speaker', 'QA (Maria)', 'text', 'Expected behavior is that the user logs in and sees the dashboard. But the actual behavior is that nothing happens.'),
      jsonb_build_object('speaker', 'Dev (Tom)', 'text', 'What severity are you assigning to this?'),
      jsonb_build_object('speaker', 'QA (Maria)', 'text', 'High. It affects one hundred percent of mobile users. There is no workaround for now.'),
      jsonb_build_object('speaker', 'Dev (Tom)', 'text', 'Okay, I will pick it up today. Thanks for the clear report.')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('question', 'What is the bug Maria found?', 'expected_keywords', '["login", "button", "mobile", "does not respond"]'),
      jsonb_build_object('question', 'What severity did Maria assign and why?', 'expected_keywords', '["high", "mobile users", "100%", "all users"]'),
      jsonb_build_object('question', 'Is there a workaround for this bug?', 'expected_keywords', '["no", "no workaround", "none"]')
    )
  ), 2),
  (sid, 'speaking', jsonb_build_object(
    'prompt', 'Imagine you are in the daily standup. Explain the bug you found to your team: the login button does not work on mobile. Tell them the severity and if there is a workaround. Speak for about 30 seconds.',
    'example_answer', 'Hey team, I found a bug yesterday. The login button is not responding on mobile devices. I can reproduce it every time on Android Chrome and iOS Safari. The severity is high because it affects all mobile users. There is no workaround right now — users have to use a desktop browser. I already created a Jira ticket.'
  ), 4);
end $$;


-- ============================================================
-- SCENARIO 2: Writing a Pull Request
-- ============================================================
do $$
declare sid uuid;
begin
  select id into sid from scenarios where title = 'Writing a Pull Request' limit 1;

  insert into scenario_phases (scenario_id, phase_type, content, order_index) values
  (sid, 'listening', jsonb_build_object(
    'dialogue', jsonb_build_array(
      jsonb_build_object('speaker', 'Dev (Alex)', 'text', 'Hey, I just opened a pull request for the payment timeout fix.'),
      jsonb_build_object('speaker', 'Lead (Sara)', 'text', 'Great. Which branch is it merging into?'),
      jsonb_build_object('speaker', 'Dev (Alex)', 'text', 'It goes from fix slash payment-timeout into main.'),
      jsonb_build_object('speaker', 'Lead (Sara)', 'text', 'Did you have any conflicts?'),
      jsonb_build_object('speaker', 'Dev (Alex)', 'text', 'Yes, there was a conflict in the config file. I resolved it by keeping the new timeout value — thirty seconds instead of ten.'),
      jsonb_build_object('speaker', 'Lead (Sara)', 'text', 'Good. I will review the diff this afternoon.'),
      jsonb_build_object('speaker', 'Dev (Alex)', 'text', 'Thanks. I need two approvals before I can merge. Can you also ask Tom to review?'),
      jsonb_build_object('speaker', 'Lead (Sara)', 'text', 'Sure, I will mention him in the pull request.')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('question', 'What branches are involved in this pull request?', 'expected_keywords', '["fix/payment-timeout", "main", "payment-timeout"]'),
      jsonb_build_object('question', 'What was the conflict about and how was it resolved?', 'expected_keywords', '["config", "timeout", "30 seconds", "resolved"]'),
      jsonb_build_object('question', 'How many approvals does Alex need before merging?', 'expected_keywords', '["two", "2"]')
    )
  ), 2),
  (sid, 'speaking', jsonb_build_object(
    'prompt', 'Your teammate asks you: "What did you change in this pull request and why?" Explain the pull request in 2-3 sentences. Mention the branch, what the diff shows, and any conflict you resolved.',
    'example_answer', 'I opened a pull request from the fix slash payment-timeout branch into main. The diff shows changes in the payment handler and the timeout configuration — I increased the timeout from ten to thirty seconds to fix the mobile checkout issue. There was a conflict in the config file, but I resolved it by keeping the new value.'
  ), 4);
end $$;


-- ============================================================
-- SCENARIO 3: Daily Standup
-- ============================================================
do $$
declare sid uuid;
begin
  select id into sid from scenarios where title = 'Daily Standup' limit 1;

  insert into scenario_phases (scenario_id, phase_type, content, order_index) values
  (sid, 'listening', jsonb_build_object(
    'dialogue', jsonb_build_array(
      jsonb_build_object('speaker', 'Scrum Master', 'text', 'Good morning everyone. Let''s start the standup. Jordan, what is your update?'),
      jsonb_build_object('speaker', 'Jordan', 'text', 'Yesterday I wrapped up the authentication refactor. Today I will pick up the password reset bug. My ETA is end of day. No blockers.'),
      jsonb_build_object('speaker', 'Scrum Master', 'text', 'Great. Priya, your turn.'),
      jsonb_build_object('speaker', 'Priya', 'text', 'Yesterday I finished testing the checkout flow. Today I am in progress on the payment module tests. I have one dependency — I need the staging environment to be up. I will sync with DevOps after this call.'),
      jsonb_build_object('speaker', 'Scrum Master', 'text', 'Got it. Carlos?'),
      jsonb_build_object('speaker', 'Carlos', 'text', 'I have a blocker. I cannot continue the dashboard redesign until I get the color tokens from the design team. ETA is unknown right now.'),
      jsonb_build_object('speaker', 'Scrum Master', 'text', 'I will reach out to the design team. Thanks everyone, let''s wrap up.')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('question', 'What is Carlos''s blocker?', 'expected_keywords', '["design team", "color tokens", "dashboard", "cannot continue"]'),
      jsonb_build_object('question', 'What is Jordan''s ETA for the password reset bug?', 'expected_keywords', '["end of day", "today", "ETA"]'),
      jsonb_build_object('question', 'Why does Priya need to sync with DevOps?', 'expected_keywords', '["staging", "environment", "dependency"]')
    )
  ), 2),
  (sid, 'speaking', jsonb_build_object(
    'prompt', 'Give your own standup update using this information: Yesterday you finished writing test cases for the login page. Today you will pick up the registration flow. You have a blocker — you need access to the test environment. Speak for about 30 seconds.',
    'example_answer', 'Yesterday I finished writing test cases for the login page — all twelve cases are documented. Today I will pick up the registration flow tests. I do have a blocker: I need access credentials for the test environment. My ETA for the registration tests depends on resolving that. I will sync with the DevOps team after this standup.'
  ), 4);
end $$;


-- ============================================================
-- SCENARIO 4: Reading an Error Log
-- ============================================================
do $$
declare sid uuid;
begin
  select id into sid from scenarios where title = 'Reading an Error Log' limit 1;

  insert into scenario_phases (scenario_id, phase_type, content, order_index) values
  (sid, 'listening', jsonb_build_object(
    'dialogue', jsonb_build_array(
      jsonb_build_object('speaker', 'Dev (Sam)', 'text', 'Hey, did you see the Datadog alert? We have forty-seven exceptions in the last five minutes.'),
      jsonb_build_object('speaker', 'QA (Lee)', 'text', 'Yes, I just saw it. Which endpoint is throwing the error?'),
      jsonb_build_object('speaker', 'Dev (Sam)', 'text', 'It is coming from POST slash api slash checkout. I checked the log and the payload is missing the user ID field — it is coming in as null.'),
      jsonb_build_object('speaker', 'QA (Lee)', 'text', 'That would explain the null pointer exception in the stack trace.'),
      jsonb_build_object('speaker', 'Dev (Sam)', 'text', 'Exactly. And there is also a timeout — the database query is taking over thirty seconds.'),
      jsonb_build_object('speaker', 'QA (Lee)', 'text', 'So we have two problems: the null user ID and the slow database query.'),
      jsonb_build_object('speaker', 'Dev (Sam)', 'text', 'Right. I will fix the payload validation first, then investigate the timeout.')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('question', 'Which endpoint is causing the error?', 'expected_keywords', '["checkout", "/api/checkout", "POST"]'),
      jsonb_build_object('question', 'What are the two problems described in the conversation?', 'expected_keywords', '["null user ID", "timeout", "payload", "slow database"]'),
      jsonb_build_object('question', 'What will Sam fix first and why?', 'expected_keywords', '["payload validation", "null", "user ID", "first"]')
    )
  ), 2),
  (sid, 'speaking', jsonb_build_object(
    'prompt', 'Your manager asks you: "What happened in production last night?" Explain the error log situation in 2-3 sentences. Mention the endpoint, the exception, and what caused it.',
    'example_answer', 'Last night we had a critical issue on the POST slash api slash checkout endpoint. The log showed a null pointer exception because the user ID field in the payload was coming in as null, which caused all database queries to fail. We also had a timeout issue — queries were taking over thirty seconds. We applied a fix this morning and the service is back to normal.'
  ), 4);
end $$;


-- ============================================================
-- SCENARIO 5: Writing Test Cases
-- ============================================================
do $$
declare sid uuid;
begin
  select id into sid from scenarios where title = 'Writing Test Cases' limit 1;

  insert into scenario_phases (scenario_id, phase_type, content, order_index) values
  (sid, 'listening', jsonb_build_object(
    'dialogue', jsonb_build_array(
      jsonb_build_object('speaker', 'Dev (Kim)', 'text', 'Hey Sam, how did the testing go for the password reset feature?'),
      jsonb_build_object('speaker', 'QA (Sam)', 'text', 'I wrote twelve test cases in total. Ten pass and two fail.'),
      jsonb_build_object('speaker', 'Dev (Kim)', 'text', 'Which ones failed?'),
      jsonb_build_object('speaker', 'QA (Sam)', 'text', 'The first failure is an edge case: if the user clicks the reset link twice, the app shows no error. The assertion fails — it should say link already used.'),
      jsonb_build_object('speaker', 'Dev (Kim)', 'text', 'And the second one?'),
      jsonb_build_object('speaker', 'QA (Sam)', 'text', 'That one is a regression. The reset link should expire after twenty-four hours, but it does not. The old system did expire links correctly, so this is a new bug.'),
      jsonb_build_object('speaker', 'Dev (Kim)', 'text', 'Okay, the regression is priority. I will fix that today.'),
      jsonb_build_object('speaker', 'QA (Sam)', 'text', 'Good. I also recommend we increase our test coverage on the email expiry logic.')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('question', 'How many test cases pass and how many fail?', 'expected_keywords', '["ten pass", "10 pass", "two fail", "2 fail"]'),
      jsonb_build_object('question', 'Why is the second failure considered a regression?', 'expected_keywords', '["old system", "worked before", "expire", "previously"]'),
      jsonb_build_object('question', 'What does Sam recommend to improve?', 'expected_keywords', '["coverage", "email expiry", "test coverage"]')
    )
  ), 2),
  (sid, 'speaking', jsonb_build_object(
    'prompt', 'Explain the test results to a developer who was not in the meeting. Tell them: how many test cases you wrote, which ones pass, what failed, and what the priority is. Speak for about 30 seconds.',
    'example_answer', 'I finished testing the password reset feature. I wrote twelve test cases — ten pass and two fail. The first failure is an edge case where clicking the reset link twice shows no error. The second failure is a regression: the link does not expire after twenty-four hours, which it should. The regression is the priority — Kim said she will fix it today. I will also add more test coverage on the email expiry logic.'
  ), 4);
end $$;


-- ============================================================
-- SCENARIO 6: Asking for Help in Slack
-- ============================================================
do $$
declare sid uuid;
begin
  select id into sid from scenarios where title = 'Asking for Help in Slack' limit 1;

  insert into scenario_phases (scenario_id, phase_type, content, order_index) values
  (sid, 'listening', jsonb_build_object(
    'dialogue', jsonb_build_array(
      jsonb_build_object('speaker', 'Dev A (Raj)', 'text', 'Hey, I saw your message in the dev-help channel. You are blocked on the payments API?'),
      jsonb_build_object('speaker', 'Dev B (Chris)', 'text', 'Yes, thanks for reaching out. I am getting a four-twenty-two error every time I send a POST request to the charge endpoint.'),
      jsonb_build_object('speaker', 'Dev A (Raj)', 'text', 'Can you reproduce it consistently?'),
      jsonb_build_object('speaker', 'Dev B (Chris)', 'text', 'Yes, every time. I shared a snippet in the thread with the exact payload I am sending.'),
      jsonb_build_object('speaker', 'Dev A (Raj)', 'text', 'I saw it. The problem is the user ID — it is null in your payload. You need to pass the user ID from the session before calling the charge endpoint.'),
      jsonb_build_object('speaker', 'Dev B (Chris)', 'text', 'Oh! That makes sense. I did not have that context. So the user session needs to be loaded first.'),
      jsonb_build_object('speaker', 'Dev A (Raj)', 'text', 'Exactly. Try that and let me know in the thread if it works.')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('question', 'Why is Chris blocked?', 'expected_keywords', '["422", "error", "payments API", "POST", "charge"]'),
      jsonb_build_object('question', 'What did Chris share to give context about the problem?', 'expected_keywords', '["snippet", "payload", "thread"]'),
      jsonb_build_object('question', 'What was the root cause of the error?', 'expected_keywords', '["null", "user ID", "session", "missing"]')
    )
  ), 2),
  (sid, 'speaking', jsonb_build_object(
    'prompt', 'Record a short Slack voice message asking for help. You are blocked: the tests keep failing with a database connection error. You already checked your environment file and the credentials look correct. Ask the DevOps team for help.',
    'example_answer', 'Hey DevOps team, quick question — I am blocked on running the test suite. Every time I run the tests I get a database connection refused error. I already checked my env file and the credentials look correct. I can reproduce it consistently on my machine, but apparently it works fine in CI. Can someone help me figure out what is different? No rush, async is totally fine. I will also share a snippet of the error in this thread.'
  ), 4);
end $$;


-- ============================================================
-- SCENARIO 7: Writing Release Notes
-- ============================================================
do $$
declare sid uuid;
begin
  select id into sid from scenarios where title = 'Writing Release Notes' limit 1;

  insert into scenario_phases (scenario_id, phase_type, content, order_index) values
  (sid, 'listening', jsonb_build_object(
    'dialogue', jsonb_build_array(
      jsonb_build_object('speaker', 'PM (Ana)', 'text', 'Before we deploy version two point four, can someone walk me through the changelog?'),
      jsonb_build_object('speaker', 'Dev (Marco)', 'text', 'Sure. There are two new features: dashboard export and email notifications when a report is ready.'),
      jsonb_build_object('speaker', 'PM (Ana)', 'text', 'Great. Any fixes?'),
      jsonb_build_object('speaker', 'Dev (Marco)', 'text', 'Yes, we fixed the mobile login button bug and a date formatting issue for users in certain time zones.'),
      jsonb_build_object('speaker', 'PM (Ana)', 'text', 'What about breaking changes? I need to warn the teams.'),
      jsonb_build_object('speaker', 'Dev (Marco)', 'text', 'There is one breaking change: the version one reports endpoint is removed. Any team using it must migrate to version two before this release.'),
      jsonb_build_object('speaker', 'PM (Ana)', 'text', 'And is anything deprecated?'),
      jsonb_build_object('speaker', 'Dev (Marco)', 'text', 'Yes, the old CSV export in Settings is deprecated. It will be removed in version three. Users should switch to the new dashboard export.')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('question', 'What is the breaking change in this release?', 'expected_keywords', '["v1 reports", "endpoint", "removed", "migrate"]'),
      jsonb_build_object('question', 'What are the two new features?', 'expected_keywords', '["dashboard export", "email notifications", "report"]'),
      jsonb_build_object('question', 'What is deprecated and when will it be removed?', 'expected_keywords', '["CSV export", "Settings", "version 3", "deprecated"]')
    )
  ), 2),
  (sid, 'speaking', jsonb_build_object(
    'prompt', 'A teammate missed the meeting and asks: "What is new in version 2.4?" Give them a quick verbal summary of the release: features, fixes, and the most important warning for other teams.',
    'example_answer', 'Version two point four has two new features: users can now export data from the dashboard as CSV or PDF, and they get an email notification when a report is ready. We also fixed the mobile login button bug. The most important thing to communicate to other teams is the breaking change: the version one reports endpoint has been removed, so any team still using it needs to migrate to version two before deploying. Also, the CSV export in Settings is now deprecated and will be gone in version three.'
  ), 4);
end $$;


-- ============================================================
-- SCENARIO 8: Giving Code Review Feedback
-- ============================================================
do $$
declare sid uuid;
begin
  select id into sid from scenarios where title = 'Giving Code Review Feedback' limit 1;

  insert into scenario_phases (scenario_id, phase_type, content, order_index) values
  (sid, 'listening', jsonb_build_object(
    'dialogue', jsonb_build_array(
      jsonb_build_object('speaker', 'Reviewer (Priya)', 'text', 'Hey, I finished reviewing your pull request. Overall it looks good, but I left a few comments.'),
      jsonb_build_object('speaker', 'Author (Dan)', 'text', 'Thanks! Are any of them blockers?'),
      jsonb_build_object('speaker', 'Reviewer (Priya)', 'text', 'Yes, one blocker. On line fourteen, the function does not handle the edge case where the user ID is null. If null is passed, the app will crash.'),
      jsonb_build_object('speaker', 'Author (Dan)', 'text', 'Oh, you are right. I will add a null check right away.'),
      jsonb_build_object('speaker', 'Reviewer (Priya)', 'text', 'I also left a suggestion: consider refactoring the date logic into a separate helper function. It is inline right now and a bit hard to read. But it is not blocking.'),
      jsonb_build_object('speaker', 'Author (Dan)', 'text', 'Good idea, I will do that too. Anything else?'),
      jsonb_build_object('speaker', 'Reviewer (Priya)', 'text', 'Just a nitpick on the variable name — not a big deal. Once you fix the blocker, it is LGTM from me.')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('question', 'What is the blocker Priya found?', 'expected_keywords', '["null", "user ID", "crash", "line 14", "null check"]'),
      jsonb_build_object('question', 'What is the difference between the blocker and the suggestion?', 'expected_keywords', '["must fix", "not blocking", "optional", "blocker"]'),
      jsonb_build_object('question', 'What does LGTM mean in this context?', 'expected_keywords', '["approved", "looks good", "ready to merge", "approve"]')
    )
  ), 2),
  (sid, 'speaking', jsonb_build_object(
    'prompt', 'Your teammate asks: "How was the code review?" Summarize Priya''s feedback in 3-4 sentences. Mention the blocker, the suggestion, and the overall result.',
    'example_answer', 'Priya found one blocker: the function on line fourteen crashes if the user ID is null, so I need to add a null check before I can merge. She also left a suggestion to refactor the date logic into a separate helper — it is not blocking but she thinks it would be cleaner. There was also a small nitpick about a variable name. Overall she said LGTM once I fix the blocker, so I should be ready to merge today.'
  ), 4);
end $$;


-- ============================================================
-- SCENARIO 9: Writing a Post-Mortem
-- ============================================================
do $$
declare sid uuid;
begin
  select id into sid from scenarios where title = 'Writing a Post-Mortem' limit 1;

  insert into scenario_phases (scenario_id, phase_type, content, order_index) values
  (sid, 'listening', jsonb_build_object(
    'dialogue', jsonb_build_array(
      jsonb_build_object('speaker', 'Manager (Jo)', 'text', 'Okay, let''s debrief the incident from last night. Sam, can you walk us through the timeline?'),
      jsonb_build_object('speaker', 'Dev (Sam)', 'text', 'Sure. The outage started at two-fifteen UTC when monitoring detected the API was returning five-oh-three errors.'),
      jsonb_build_object('speaker', 'Manager (Jo)', 'text', 'What was the root cause?'),
      jsonb_build_object('speaker', 'Dev (Sam)', 'text', 'A deploy at one-fifty UTC introduced a new environment variable that was not added to the production configuration. That caused all database connections to fail.'),
      jsonb_build_object('speaker', 'Manager (Jo)', 'text', 'What was the impact?'),
      jsonb_build_object('speaker', 'Dev (Sam)', 'text', 'About two thousand users could not access the app for forty-five minutes. No data was lost.'),
      jsonb_build_object('speaker', 'Manager (Jo)', 'text', 'And the mitigation?'),
      jsonb_build_object('speaker', 'Dev (Sam)', 'text', 'We rolled back to the previous version at two-fifty-eight. Service was restored at three AM. Our action items are to add automated environment variable validation before every deploy.')
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('question', 'What was the root cause of the incident?', 'expected_keywords', '["environment variable", "missing", "deploy", "configuration", "database"]'),
      jsonb_build_object('question', 'How long was the outage and how many users were affected?', 'expected_keywords', '["45 minutes", "2000 users", "two thousand"]'),
      jsonb_build_object('question', 'What was the mitigation and what is the action item?', 'expected_keywords', '["rollback", "environment variable", "validation", "automated"]')
    )
  ), 2),
  (sid, 'speaking', jsonb_build_object(
    'prompt', 'A new team member asks: "I heard there was an incident last night, what happened?" Give them a brief verbal post-mortem: what happened, the root cause, the impact, and one action item.',
    'example_answer', 'Last night we had a forty-five minute outage — our API was completely down and about two thousand users could not log in. The root cause was a missing environment variable after a deploy: we added a new variable but forgot to set it in the production configuration, which broke all database connections. The mitigation was a rollback to the previous version, which restored the service. Our main action item is to add automated validation that checks all required environment variables exist before every deploy.'
  ), 4);
end $$;
