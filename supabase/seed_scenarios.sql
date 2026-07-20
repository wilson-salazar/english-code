-- Seed the first A2 scenario without requiring a manually copied UUID.
do $$
declare
  target_level_id uuid;
  new_scenario_id uuid;
begin
  select id into target_level_id from levels where code = 'A2';

  insert into scenarios (
    level_id, title, context, order_index, generation_mode, is_published
  ) values (
    target_level_id,
    'Reporting a Bug',
    'You are a QA engineer. During testing you found a bug: the login button does not work on mobile devices. You need to write a bug report in Jira and explain it to your team in the daily standup.',
    1,
    'pre_generated',
    true
  ) returning id into new_scenario_id;

  insert into vocabulary (
    scenario_id, word, definition, example_sentence, order_index
  ) values
    (new_scenario_id, 'bug', 'An error or flaw in software that causes unexpected behavior', 'I found a bug in the login flow — the button does not respond on mobile.', 1),
    (new_scenario_id, 'to reproduce', 'To make a bug happen again by following the same steps', 'I can reproduce the bug every time I use Chrome on Android.', 2),
    (new_scenario_id, 'steps to reproduce', 'A list of actions that trigger the bug', 'The steps to reproduce are: open the app, go to login, tap the button.', 3),
    (new_scenario_id, 'expected behavior', 'What the software should do when working correctly', 'Expected behavior: the user is redirected to the dashboard after login.', 4),
    (new_scenario_id, 'actual behavior', 'What the software actually does (the wrong thing)', 'Actual behavior: nothing happens when the button is tapped.', 5),
    (new_scenario_id, 'severity', 'How serious the bug is — how much it affects users', 'The severity is high because users cannot log in on mobile.', 6),
    (new_scenario_id, 'workaround', 'A temporary solution that avoids the bug while it is not fixed', 'The workaround is to use a desktop browser until we fix this.', 7);

  insert into scenario_phases (
    scenario_id, phase_type, content, order_index
  ) values
    (
      new_scenario_id,
      'immersion',
      '{
        "source": "Jira ticket",
        "text": "**BUG-204 — Login button unresponsive on mobile**\n\n**Reporter:** Maria Chen (QA)\n**Priority:** High\n**Environment:** Android Chrome 120, iOS Safari 17\n\n**Steps to reproduce:**\n1. Open the app on a mobile device\n2. Navigate to the login page\n3. Enter valid credentials\n4. Tap the login button\n\n**Expected behavior:** User is authenticated and redirected to the dashboard.\n\n**Actual behavior:** Nothing happens. The button does not respond to touch input.\n\n**Workaround:** Use a desktop browser until this is resolved.\n\n**Severity:** High — affects 100% of mobile users.",
        "highlighted_words": ["bug", "to reproduce", "steps to reproduce", "expected behavior", "actual behavior", "severity", "workaround"]
      }',
      1
    ),
    (
      new_scenario_id,
      'comprehension',
      '{
        "questions": [
          {
            "question": "What is the bug described in this ticket?",
            "expected_keywords": ["login", "button", "mobile", "not working", "unresponsive"]
          },
          {
            "question": "What is the workaround for this bug?",
            "expected_keywords": ["desktop", "browser", "desktop browser"]
          },
          {
            "question": "Why is the severity high?",
            "expected_keywords": ["mobile users", "cannot log in", "affects", "100%"]
          }
        ]
      }',
      2
    ),
    (
      new_scenario_id,
      'expression',
      '{
        "prompt": "Now it is your turn. You found a new bug: the search bar on the products page returns no results even when items exist. Write a Jira bug report using the vocabulary from this scenario: bug, steps to reproduce, expected behavior, actual behavior, severity, and workaround (if any).",
        "evaluation_criteria": ["vocabulary", "clarity", "naturalness"]
      }',
      3
    );
end $$;
