-- Remove A1 and add starter curricula for B1, B2, and C1.

do $$
declare
  a1_id uuid;
  a2_id uuid;
begin
  select id into a1_id from public.levels where code = 'A1';
  select id into a2_id from public.levels where code = 'A2';

  if a1_id is not null then
    update public.users set level_id = a2_id where level_id = a1_id;
    delete from public.levels where id = a1_id;
  end if;

  -- Move away from the unique range before assigning the final order.
  update public.levels set order_index = order_index + 10;
  update public.levels
  set order_index = case code
    when 'A2' then 1
    when 'B1' then 2
    when 'B2' then 3
    when 'C1' then 4
  end
  where code in ('A2', 'B1', 'B2', 'C1');
end $$;

create or replace function pg_temp.add_english_code_lesson(
  level_code text,
  lesson_title text,
  lesson_context text,
  lesson_order int,
  lesson_vocabulary jsonb,
  immersion_content jsonb,
  listening_content jsonb,
  comprehension_content jsonb,
  speaking_content jsonb,
  expression_content jsonb
)
returns void
language plpgsql
as $$
declare
  lesson_level_id uuid;
  lesson_id uuid;
begin
  select id into lesson_level_id from public.levels where code = level_code;

  insert into public.scenarios (
    level_id, title, context, order_index, generation_mode, is_published
  ) values (
    lesson_level_id, lesson_title, lesson_context, lesson_order, 'pre_generated', true
  ) returning id into lesson_id;

  insert into public.vocabulary (
    scenario_id, word, definition, example_sentence, phonetic, order_index
  )
  select
    lesson_id,
    item ->> 'word',
    item ->> 'definition',
    item ->> 'example',
    item ->> 'phonetic',
    position::int
  from jsonb_array_elements(lesson_vocabulary) with ordinality as words(item, position);

  insert into public.scenario_phases (scenario_id, phase_type, content, order_index)
  values
    (lesson_id, 'immersion', immersion_content, 1),
    (lesson_id, 'listening', listening_content, 2),
    (lesson_id, 'comprehension', comprehension_content, 3),
    (lesson_id, 'speaking', speaking_content, 4),
    (lesson_id, 'expression', expression_content, 5);
end;
$$;

-- ============================================================
-- B1 — Collaboration and clear technical communication
-- ============================================================

select pg_temp.add_english_code_lesson(
  'B1',
  'Explaining a Task Estimate',
  'You need to explain why a feature will take five days, including assumptions, dependencies, and a realistic buffer.',
  1,
  $v$[
    {"word":"estimate","definition":"A prediction of the time or effort a task will require","example":"My estimate is five working days, including testing.","phonetic":"/ˈestɪmət/"},
    {"word":"scope","definition":"The work and requirements included in a task","example":"The estimate changes if we add analytics to the scope.","phonetic":"/skoʊp/"},
    {"word":"assumption","definition":"Something accepted as true when making a plan","example":"My main assumption is that the API is already available.","phonetic":"/əˈsʌmpʃən/"},
    {"word":"dependency","definition":"Work or information required before another task can continue","example":"The design approval is an external dependency.","phonetic":"/dɪˈpendənsi/"},
    {"word":"buffer","definition":"Extra time added to account for uncertainty","example":"I added a one-day buffer for integration issues.","phonetic":"/ˈbʌfər/"}
  ]$v$::jsonb,
  $i${"source":"Jira planning comment","text":"**Estimate: User notification preferences — 5 days**\n\nThe current scope includes the settings screen, API integration, validation, and automated tests. My estimate assumes that the notification API is stable and the final designs are approved by Tuesday.\n\nThe backend endpoint is a dependency. If it is delayed, frontend integration cannot start. I included a one-day buffer because the API response format has changed twice this month.\n\nIf we remove email preview from the scope, the work can probably be completed in four days.","highlighted_words":["estimate","scope","assumption","dependency","buffer"]}$i$::jsonb,
  $l${"dialogue":[{"speaker":"Product Manager (Nora)","text":"Can we finish notification preferences in three days?"},{"speaker":"Developer (Daniel)","text":"My estimate is five days for the current scope."},{"speaker":"Product Manager (Nora)","text":"What assumptions are behind that estimate?"},{"speaker":"Developer (Daniel)","text":"I assume the API and designs are ready. The backend endpoint is also a dependency."},{"speaker":"Product Manager (Nora)","text":"Could we reduce the scope?"},{"speaker":"Developer (Daniel)","text":"Yes. If we remove email preview, we can save one day, but I recommend keeping a small buffer."}],"questions":[{"question":"Why is the estimate five days?","expected_keywords":["scope","testing","buffer","integration"]},{"question":"How can the team reduce the estimate?","expected_keywords":["remove","email preview","reduce scope"]}]}$l$::jsonb,
  $c${"questions":[{"question":"Which assumptions affect the estimate?","expected_keywords":["API","stable","designs","approved"]},{"question":"What dependency could delay the work?","expected_keywords":["backend","endpoint","API"]},{"question":"Why was a buffer included?","expected_keywords":["uncertainty","format","changed","integration"]}]}$c$::jsonb,
  $s${"prompt":"Give a short estimate for a login redesign. Mention the scope, one assumption, one dependency, and a buffer.","example_answer":"My estimate is four days. The scope includes the new form, validation, and tests. I assume the designs are final. The authentication endpoint is a dependency, and I added a half-day buffer for integration issues."}$s$::jsonb,
  $e${"prompt":"Write a Jira comment explaining a five-day estimate for a dashboard filter. Include the scope, assumptions, dependencies, and buffer.","evaluation_criteria":["vocabulary","clarity","naturalness"]}$e$::jsonb
);

select pg_temp.add_english_code_lesson(
  'B1',
  'Clarifying Requirements',
  'A ticket is ambiguous. You need to ask focused questions and align with the product owner before implementation starts.',
  2,
  $v$[
    {"word":"acceptance criteria","definition":"Conditions that must be met for work to be accepted","example":"The acceptance criteria should explain what happens when the search is empty.","phonetic":"/əkˈseptəns kraɪˈtɪriə/"},
    {"word":"edge case","definition":"An unusual situation at the boundary of normal behavior","example":"Slow connections are an important edge case.","phonetic":"/edʒ keɪs/"},
    {"word":"constraint","definition":"A limitation that affects possible solutions","example":"Supporting the old browser is a technical constraint.","phonetic":"/kənˈstreɪnt/"},
    {"word":"clarify","definition":"To make information easier to understand and less ambiguous","example":"Could you clarify which roles can edit the report?","phonetic":"/ˈklærəfaɪ/"},
    {"word":"align","definition":"To reach a shared understanding or agreement","example":"Let us align on the expected behavior before development starts.","phonetic":"/əˈlaɪn/"}
  ]$v$::jsonb,
  $i${"source":"Jira — Feature clarification","text":"**Ticket: Add report sharing**\n\nBefore implementation, we need to clarify three points:\n\n1. The acceptance criteria do not specify whether viewers can download the report.\n2. We need expected behavior for the edge case where a report owner leaves the company.\n3. Our main constraint is that external users cannot access the internal identity provider.\n\nProposal: align with Product and Security in a short meeting, then update the ticket before estimation.","highlighted_words":["acceptance criteria","edge case","constraint","clarify","align"]}$i$::jsonb,
  $l${"dialogue":[{"speaker":"Business Analyst (Maya)","text":"Is the report sharing ticket ready for development?"},{"speaker":"Developer (Ethan)","text":"Not yet. I need to clarify the acceptance criteria."},{"speaker":"Business Analyst (Maya)","text":"Which part is unclear?"},{"speaker":"Developer (Ethan)","text":"We do not know if viewers can download reports, and there is an edge case when the owner leaves."},{"speaker":"Business Analyst (Maya)","text":"There is also a security constraint for external users."},{"speaker":"Developer (Ethan)","text":"Exactly. Let us align with Security before we estimate the work."}],"questions":[{"question":"What needs clarification?","expected_keywords":["download","viewers","acceptance criteria"]},{"question":"Who should join the alignment?","expected_keywords":["Security","Product"]}]}$l$::jsonb,
  $c${"questions":[{"question":"What edge case is missing from the ticket?","expected_keywords":["owner","leaves","company"]},{"question":"What is the main constraint?","expected_keywords":["external users","identity provider","security"]},{"question":"Why should the team wait before estimating?","expected_keywords":["clarify","align","requirements"]}]}$c$::jsonb,
  $s${"prompt":"Ask three clarification questions about a password reset feature. Include an edge case and a constraint.","example_answer":"Could you clarify whether the reset link expires? What should happen if the email belongs to a disabled account? We also have a constraint: the mobile app cannot open the current web-only reset page."}$s$::jsonb,
  $e${"prompt":"Write a concise message asking a product owner to clarify acceptance criteria for exporting reports. Mention an edge case, a constraint, and the need to align.","evaluation_criteria":["vocabulary","clarity","naturalness"]}$e$::jsonb
);

select pg_temp.add_english_code_lesson(
  'B1',
  'Giving a Sprint Update',
  'You are updating your team about delivery status, risks, handoffs, and the next action required.',
  3,
  $v$[
    {"word":"on track","definition":"Progressing according to the agreed plan","example":"The API migration is on track for Friday.","phonetic":"/ɑn træk/"},
    {"word":"at risk","definition":"Likely to be delayed or fail without action","example":"The release is at risk because testing has not started.","phonetic":"/æt rɪsk/"},
    {"word":"blocker","definition":"A problem that prevents progress","example":"Access to the staging account is my only blocker.","phonetic":"/ˈblɑkər/"},
    {"word":"handoff","definition":"The transfer of work or responsibility to another person","example":"The handoff to QA will happen this afternoon.","phonetic":"/ˈhændɔf/"},
    {"word":"follow up","definition":"To take additional action after an earlier discussion","example":"I will follow up with DevOps after the meeting.","phonetic":"/ˈfɑloʊ ʌp/"}
  ]$v$::jsonb,
  $i${"source":"Sprint status update","text":"**Checkout redesign — Sprint update**\n\nFrontend development is on track and the main flow is complete. The delivery date is at risk, however, because accessibility testing has not started.\n\nThere are no code blockers. The remaining dependency is access to the testing devices. The handoff to QA is planned for Wednesday morning.\n\nAction: Priya will follow up with IT today and confirm device availability before 3 PM.","highlighted_words":["on track","at risk","blocker","handoff","follow up"]}$i$::jsonb,
  $l${"dialogue":[{"speaker":"Scrum Master (Ava)","text":"Is the checkout redesign on track?"},{"speaker":"Developer (Marcus)","text":"Development is on track, but the delivery date is at risk."},{"speaker":"Scrum Master (Ava)","text":"Do you have a blocker?"},{"speaker":"Developer (Marcus)","text":"We need testing devices before the handoff to QA."},{"speaker":"Scrum Master (Ava)","text":"What is the next action?"},{"speaker":"Developer (Marcus)","text":"Priya will follow up with IT and confirm availability today."}],"questions":[{"question":"What is on track?","expected_keywords":["development","frontend"]},{"question":"Why is delivery at risk?","expected_keywords":["accessibility testing","devices","not started"]}]}$l$::jsonb,
  $c${"questions":[{"question":"When is the QA handoff planned?","expected_keywords":["Wednesday","morning"]},{"question":"Who owns the follow-up?","expected_keywords":["Priya"]},{"question":"What must be confirmed?","expected_keywords":["device","availability","testing devices"]}]}$c$::jsonb,
  $s${"prompt":"Give a sprint update for a feature that is technically complete but waiting for QA. Say what is on track, what is at risk, and who will follow up.","example_answer":"Development is on track and the feature is complete. The release is at risk because QA has not received test data. The handoff is ready, and I will follow up with the data team this afternoon."}$s$::jsonb,
  $e${"prompt":"Write a short sprint status update. Include on track, at risk, blocker, handoff, and follow up.","evaluation_criteria":["vocabulary","clarity","naturalness"]}$e$::jsonb
);

-- ============================================================
-- B2 — Decisions, trade-offs, and technical leadership
-- ============================================================

select pg_temp.add_english_code_lesson(
  'B2',
  'Negotiating Product Scope',
  'A deadline cannot move. You need to negotiate scope with stakeholders while protecting the core user outcome.',
  1,
  $v$[
    {"word":"trade-off","definition":"A balance where gaining one benefit requires giving up another","example":"The trade-off is speed of delivery versus customization.","phonetic":"/ˈtreɪd ɔf/"},
    {"word":"must-have","definition":"A requirement essential to the outcome","example":"Audit logging is a must-have for the launch.","phonetic":"/ˈmʌst hæv/"},
    {"word":"nice-to-have","definition":"A useful feature that is not essential","example":"Animated charts are a nice-to-have for a later release.","phonetic":"/ˈnaɪs tə hæv/"},
    {"word":"de-scope","definition":"To remove work from the current delivery scope","example":"We can de-scope custom themes to protect the deadline.","phonetic":"/diː skoʊp/"},
    {"word":"compromise","definition":"An agreement where each side accepts part of what it wants","example":"A limited export format is a reasonable compromise.","phonetic":"/ˈkɑmprəmaɪz/"}
  ]$v$::jsonb,
  $i${"source":"Release scope proposal","text":"**Launch deadline: September 15**\n\nThe current scope requires six weeks, but only four weeks remain. The main trade-off is between launching on time and supporting every customization request.\n\n**Must-haves:** role-based access, audit logs, CSV export.\n**Nice-to-haves:** custom themes, scheduled reports, PDF export.\n\nRecommendation: de-scope themes and scheduled reports. As a compromise, provide CSV at launch and deliver PDF export in the next iteration.","highlighted_words":["trade-off","must-have","nice-to-have","de-scope","compromise"]}$i$::jsonb,
  $l${"dialogue":[{"speaker":"Product Director (Elena)","text":"The deadline is fixed, but stakeholders want every feature."},{"speaker":"Engineering Lead (Ryan)","text":"Then we need an explicit trade-off. The full scope takes six weeks."},{"speaker":"Product Director (Elena)","text":"Which items are must-haves?"},{"speaker":"Engineering Lead (Ryan)","text":"Access control, audit logs, and CSV export. Themes are a nice-to-have."},{"speaker":"Product Director (Elena)","text":"What compromise do you recommend?"},{"speaker":"Engineering Lead (Ryan)","text":"De-scope themes now and commit to them in the next iteration."}],"questions":[{"question":"What is the central trade-off?","expected_keywords":["deadline","scope","on time","customization"]},{"question":"What will be de-scoped?","expected_keywords":["themes","scheduled reports"]}]}$l$::jsonb,
  $c${"questions":[{"question":"Which features are must-haves?","expected_keywords":["access","audit","CSV"]},{"question":"What compromise is proposed for exports?","expected_keywords":["CSV","PDF","next iteration"]},{"question":"Why must the scope change?","expected_keywords":["four weeks","six weeks","deadline"]}]}$c$::jsonb,
  $s${"prompt":"Negotiate the scope of a release that has half the required time. Identify one must-have, one nice-to-have, and a compromise.","example_answer":"The trade-off is delivery speed versus feature completeness. Secure login is a must-have, while dashboard customization is a nice-to-have. I propose that we de-scope customization and deliver it next sprint as a compromise."}$s$::jsonb,
  $e${"prompt":"Write a scope recommendation for a fixed deadline. Use trade-off, must-have, nice-to-have, de-scope, and compromise.","evaluation_criteria":["vocabulary","clarity","naturalness"]}$e$::jsonb
);

select pg_temp.add_english_code_lesson(
  'B2',
  'Presenting an Architecture Decision',
  'You need to compare technical options and present a clear recommendation with evidence and acknowledged drawbacks.',
  2,
  $v$[
    {"word":"scalability","definition":"The ability of a system to handle growth","example":"The queue improves scalability during traffic spikes.","phonetic":"/ˌskeɪləˈbɪləti/"},
    {"word":"maintainability","definition":"How easily software can be understood and changed","example":"A smaller service improves maintainability for this team.","phonetic":"/meɪnˌteɪnəˈbɪləti/"},
    {"word":"bottleneck","definition":"A component that limits overall performance","example":"Database writes are currently the main bottleneck.","phonetic":"/ˈbɑtlnek/"},
    {"word":"alternative","definition":"Another possible option or approach","example":"The simpler alternative is to keep the modular monolith.","phonetic":"/ɔlˈtɜrnətɪv/"},
    {"word":"rationale","definition":"The reasoning behind a decision","example":"The rationale is based on traffic data and team capacity.","phonetic":"/ˌræʃəˈnæl/"}
  ]$v$::jsonb,
  $i${"source":"Architecture Decision Record","text":"**ADR-014: Asynchronous invoice generation**\n\nDecision: introduce a message queue between the API and invoice worker.\n\nRationale: synchronous generation is the current bottleneck and causes requests to time out during monthly peaks. A queue improves scalability and isolates failures.\n\nAlternative considered: increase API capacity and keep synchronous processing. This is simpler initially, but it does not remove the bottleneck.\n\nTrade-off: the queue adds operational complexity. We accept this cost because maintainability remains manageable with one worker and clear monitoring.","highlighted_words":["scalability","maintainability","bottleneck","alternative","rationale"]}$i$::jsonb,
  $l${"dialogue":[{"speaker":"Architect (Sophia)","text":"What is the rationale for adding a queue?"},{"speaker":"Tech Lead (James)","text":"Invoice generation is our main bottleneck during monthly peaks."},{"speaker":"Architect (Sophia)","text":"How does the proposal improve scalability?"},{"speaker":"Tech Lead (James)","text":"The API can accept requests while workers process invoices asynchronously."},{"speaker":"Architect (Sophia)","text":"Did you evaluate a simpler alternative?"},{"speaker":"Tech Lead (James)","text":"Yes, but increasing API capacity does not remove the bottleneck."}],"questions":[{"question":"What is the current bottleneck?","expected_keywords":["invoice","generation","synchronous"]},{"question":"What alternative was rejected?","expected_keywords":["increase","API capacity","synchronous"]}]}$l$::jsonb,
  $c${"questions":[{"question":"How does the queue improve scalability?","expected_keywords":["asynchronous","workers","accept requests"]},{"question":"What drawback does the team accept?","expected_keywords":["operational complexity","queue"]},{"question":"Why is maintainability still acceptable?","expected_keywords":["one worker","monitoring","manageable"]}]}$c$::jsonb,
  $s${"prompt":"Present a recommendation to add caching to a slow API. Explain the bottleneck, an alternative, and your rationale.","example_answer":"Database reads are the bottleneck. I recommend adding a short-lived cache to improve scalability. The alternative is a larger database instance, but it is more expensive. Our rationale is based on repeated reads of the same data."}$s$::jsonb,
  $e${"prompt":"Write a short architecture decision. Include scalability, maintainability, bottleneck, alternative, and rationale.","evaluation_criteria":["vocabulary","clarity","naturalness"]}$e$::jsonb
);

select pg_temp.add_english_code_lesson(
  'B2',
  'Leading an Incident Call',
  'A production incident is active. You must communicate impact, assign owners, and coordinate containment and mitigation.',
  3,
  $v$[
    {"word":"containment","definition":"Immediate action that prevents an incident from spreading","example":"Disabling the import job is our containment step.","phonetic":"/kənˈteɪnmənt/"},
    {"word":"impact","definition":"The effect of an incident on users or systems","example":"The impact is limited to European customers.","phonetic":"/ˈɪmpækt/"},
    {"word":"mitigation","definition":"Action that reduces the severity of a problem","example":"Rolling back is the fastest mitigation.","phonetic":"/ˌmɪtəˈɡeɪʃən/"},
    {"word":"owner","definition":"The person accountable for a specific action","example":"Nina is the owner of the database investigation.","phonetic":"/ˈoʊnər/"},
    {"word":"escalation","definition":"The act of involving a higher level of support or authority","example":"We need an escalation to the cloud provider.","phonetic":"/ˌeskəˈleɪʃən/"}
  ]$v$::jsonb,
  $i${"source":"Incident channel — SEV-1","text":"**Impact:** Checkout failures for approximately 35% of users in Europe.\n\n**Containment:** Traffic from the affected region has been routed to the secondary cluster.\n\n**Mitigation:** Roll back release 4.8.1 while Database investigates increased lock time.\n\n**Owners:** Marco — rollback; Nina — database; Elena — customer communication.\n\n**Escalation:** Cloud provider support has been engaged. Next update in 15 minutes.","highlighted_words":["containment","impact","mitigation","owner","escalation"]}$i$::jsonb,
  $l${"dialogue":[{"speaker":"Incident Commander (Rachel)","text":"Let us confirm the user impact first."},{"speaker":"Engineer (Adam)","text":"About thirty-five percent of European checkouts are failing."},{"speaker":"Incident Commander (Rachel)","text":"What containment is active?"},{"speaker":"Engineer (Adam)","text":"Traffic is going to the secondary cluster, and Marco owns the rollback."},{"speaker":"Incident Commander (Rachel)","text":"Do we need an escalation?"},{"speaker":"Engineer (Adam)","text":"Yes. The cloud provider is investigating unusual database latency."}],"questions":[{"question":"What is the impact?","expected_keywords":["checkout","Europe","35 percent"]},{"question":"Who owns the rollback?","expected_keywords":["Marco"]}]}$l$::jsonb,
  $c${"questions":[{"question":"What containment step is active?","expected_keywords":["traffic","secondary cluster","routed"]},{"question":"What mitigation is planned?","expected_keywords":["rollback","4.8.1"]},{"question":"Why was the provider escalation opened?","expected_keywords":["database","latency","cloud"]}]}$c$::jsonb,
  $s${"prompt":"Lead a short incident update: state impact, containment, mitigation, two owners, and whether escalation is needed.","example_answer":"The impact is failed logins for mobile users. Containment is active through the web fallback. The mitigation is to roll back the authentication change. Maya owns the rollback, Tom owns monitoring, and we have escalated to the identity provider."}$s$::jsonb,
  $e${"prompt":"Write a structured incident update using impact, containment, mitigation, owner, and escalation.","evaluation_criteria":["vocabulary","clarity","naturalness"]}$e$::jsonb
);

-- ============================================================
-- C1 — Strategic influence and executive communication
-- ============================================================

select pg_temp.add_english_code_lesson(
  'C1',
  'Challenging a Technical Strategy',
  'You disagree with a proposed platform strategy and need to challenge it diplomatically while preserving alignment.',
  1,
  $v$[
    {"word":"premise","definition":"An idea on which an argument or decision is based","example":"The proposal depends on the premise that traffic will triple.","phonetic":"/ˈpremɪs/"},
    {"word":"implication","definition":"A likely consequence of a decision","example":"One implication is a permanent increase in operational cost.","phonetic":"/ˌɪmpləˈkeɪʃən/"},
    {"word":"counterproposal","definition":"An alternative proposal offered in response","example":"My counterproposal is a staged migration with clear exit criteria.","phonetic":"/ˈkaʊntərprəpoʊzəl/"},
    {"word":"evidence","definition":"Facts or data supporting a conclusion","example":"Current load tests provide little evidence for an immediate rewrite.","phonetic":"/ˈevɪdəns/"},
    {"word":"alignment","definition":"Shared agreement on direction and priorities","example":"We need leadership alignment before committing the budget.","phonetic":"/əˈlaɪnmənt/"}
  ]$v$::jsonb,
  $i${"source":"Architecture strategy review","text":"**Proposal:** Rewrite the billing platform as twelve microservices this quarter.\n\nI support reducing coupling, but I would challenge the premise that service boundaries alone will solve our delivery issues. The available evidence points to unclear ownership and fragile release automation as the primary constraints.\n\nA full rewrite also has a significant implication: two product teams would pause feature delivery for at least six months.\n\n**Counterproposal:** extract the two highest-change domains first, improve deployment automation, and evaluate outcomes after one quarter. This gives us evidence for the next decision and creates alignment around measurable criteria.","highlighted_words":["premise","implication","counterproposal","evidence","alignment"]}$i$::jsonb,
  $l${"dialogue":[{"speaker":"VP Engineering (Olivia)","text":"Do you support the full microservices rewrite?"},{"speaker":"Principal Engineer (Henry)","text":"I support the goal, but I would challenge one premise of the plan."},{"speaker":"VP Engineering (Olivia)","text":"Which premise concerns you?"},{"speaker":"Principal Engineer (Henry)","text":"We lack evidence that architecture is the main cause of slow delivery."},{"speaker":"VP Engineering (Olivia)","text":"What is your counterproposal?"},{"speaker":"Principal Engineer (Henry)","text":"Extract two domains first and align on measurable results before expanding."}],"questions":[{"question":"Which premise is challenged?","expected_keywords":["architecture","microservices","slow delivery"]},{"question":"What is the counterproposal?","expected_keywords":["two domains","staged","measure"]}]}$l$::jsonb,
  $c${"questions":[{"question":"What evidence contradicts the rewrite rationale?","expected_keywords":["ownership","release automation","constraints"]},{"question":"What implication would the rewrite have?","expected_keywords":["pause","feature delivery","six months"]},{"question":"How does the counterproposal improve alignment?","expected_keywords":["measurable","criteria","evidence","quarter"]}]}$c$::jsonb,
  $s${"prompt":"Diplomatically challenge a proposal to adopt a new framework across every product. Question one premise, cite evidence, explain an implication, and offer a counterproposal.","example_answer":"I support improving consistency, but I would challenge the premise that one framework suits every product. Our evidence shows different performance requirements. The implication is a costly migration. My counterproposal is a pilot in one product with agreed success criteria."}$s$::jsonb,
  $e${"prompt":"Write a strategic response that challenges a technical proposal while preserving alignment. Use premise, implication, evidence, counterproposal, and alignment.","evaluation_criteria":["vocabulary","clarity","naturalness"]}$e$::jsonb
);

select pg_temp.add_english_code_lesson(
  'C1',
  'Presenting an Executive Risk Assessment',
  'You must translate a technical risk into business language and recommend proportionate action to leadership.',
  2,
  $v$[
    {"word":"likelihood","definition":"The probability that an event will occur","example":"The likelihood of failure is moderate but increasing.","phonetic":"/ˈlaɪklihʊd/"},
    {"word":"exposure","definition":"The potential amount of loss or harm","example":"Our financial exposure is highest during the holiday period.","phonetic":"/ɪkˈspoʊʒər/"},
    {"word":"contingency","definition":"A prepared alternative plan for an adverse event","example":"The contingency is to route payments through the secondary provider.","phonetic":"/kənˈtɪndʒənsi/"},
    {"word":"threshold","definition":"A level that triggers a decision or action","example":"Five percent failures is our rollback threshold.","phonetic":"/ˈθreʃhoʊld/"},
    {"word":"residual risk","definition":"Risk that remains after controls are applied","example":"The residual risk is acceptable for a limited pilot.","phonetic":"/rɪˈzɪdʒuəl rɪsk/"}
  ]$v$::jsonb,
  $i${"source":"Executive risk brief","text":"**Risk:** Primary payment provider instability during peak season.\n\n**Likelihood:** Moderate. Three regional incidents occurred in the last 60 days.\n**Exposure:** Up to $180,000 in lost transactions per hour during peak traffic.\n\n**Recommendation:** Enable automatic failover when payment errors exceed the 3% threshold for five minutes. The contingency is manual routing through the secondary provider if automation fails.\n\nAfter these controls, the residual risk is approximately 15 minutes of degraded checkout performance. Leadership approval is requested before November 1.","highlighted_words":["likelihood","exposure","contingency","threshold","residual risk"]}$i$::jsonb,
  $l${"dialogue":[{"speaker":"COO (Victoria)","text":"How likely is a major payment interruption?"},{"speaker":"Security Director (Michael)","text":"The likelihood is moderate, based on three recent incidents."},{"speaker":"COO (Victoria)","text":"What is our exposure during peak traffic?"},{"speaker":"Security Director (Michael)","text":"Up to one hundred eighty thousand dollars per hour."},{"speaker":"COO (Victoria)","text":"What contingency do we have?"},{"speaker":"Security Director (Michael)","text":"Automatic failover at the three-percent threshold, followed by manual routing if needed."}],"questions":[{"question":"How is likelihood assessed?","expected_keywords":["moderate","three incidents"]},{"question":"What is the financial exposure?","expected_keywords":["180000","per hour","lost transactions"]}]}$l$::jsonb,
  $c${"questions":[{"question":"What triggers automatic failover?","expected_keywords":["3 percent","five minutes","errors"]},{"question":"What is the contingency if automation fails?","expected_keywords":["manual routing","secondary provider"]},{"question":"What residual risk remains?","expected_keywords":["15 minutes","degraded checkout"]}]}$c$::jsonb,
  $s${"prompt":"Present a one-minute executive risk assessment for an unsupported database version. Cover likelihood, exposure, threshold, contingency, and residual risk.","example_answer":"The likelihood of a security issue is currently low but rising. Our exposure includes customer data and regulatory penalties. I recommend migration when vendor support ends, which is our threshold. The contingency is an isolated legacy environment. Residual risk remains until migration is complete."}$s$::jsonb,
  $e${"prompt":"Write an executive risk brief for a critical third-party API. Use likelihood, exposure, contingency, threshold, and residual risk.","evaluation_criteria":["vocabulary","clarity","naturalness"]}$e$::jsonb
);

select pg_temp.add_english_code_lesson(
  'C1',
  'Facilitating a Cross-Team Post-Mortem',
  'Multiple teams contributed to an outage. You need to facilitate a blameless review and turn findings into systemic improvements.',
  3,
  $v$[
    {"word":"systemic","definition":"Related to the structure of the whole system rather than one event","example":"This was a systemic weakness, not an individual mistake.","phonetic":"/sɪˈstemɪk/"},
    {"word":"contributing factor","definition":"A condition that helped cause an outcome","example":"Alert fatigue was a contributing factor in the delayed response.","phonetic":"/kənˈtrɪbjətɪŋ ˈfæktər/"},
    {"word":"accountability","definition":"Clear responsibility for actions and outcomes","example":"Blamelessness does not remove accountability for follow-up actions.","phonetic":"/əˌkaʊntəˈbɪləti/"},
    {"word":"remediation","definition":"Work that corrects a weakness or prevents future harm","example":"The remediation includes automated rollback and ownership changes.","phonetic":"/rɪˌmiːdiˈeɪʃən/"},
    {"word":"recurrence","definition":"The event happening again","example":"We will measure whether the controls reduce recurrence.","phonetic":"/rɪˈkɜrəns/"}
  ]$v$::jsonb,
  $i${"source":"Cross-team post-mortem summary","text":"**Incident:** Customer notifications delayed for four hours.\n\nThe immediate trigger was an expired queue credential. However, the review identified systemic weaknesses across three teams: unclear service ownership, no credential-expiry alert, and a deployment checklist that excluded background workers.\n\nContributing factors included alert fatigue and an incomplete handoff during the platform reorganization. This is a blameless review, but accountability remains explicit: Platform owns credential automation; Messaging owns service alerts; SRE owns the runbook update.\n\nRemediation will be tracked for 60 days. Success means no recurrence and a recovery time below 15 minutes in the next simulation.","highlighted_words":["systemic","contributing factor","accountability","remediation","recurrence"]}$i$::jsonb,
  $l${"dialogue":[{"speaker":"Facilitator (Grace)","text":"Let us separate the trigger from the systemic causes."},{"speaker":"SRE Lead (Thomas)","text":"The trigger was an expired credential, but unclear ownership was a contributing factor."},{"speaker":"Facilitator (Grace)","text":"How do we maintain accountability without blaming individuals?"},{"speaker":"SRE Lead (Thomas)","text":"Assign every remediation action to a team and track a due date."},{"speaker":"Facilitator (Grace)","text":"How will we measure recurrence?"},{"speaker":"SRE Lead (Thomas)","text":"We will run simulations and verify recovery stays below fifteen minutes."}],"questions":[{"question":"What was the immediate trigger?","expected_keywords":["expired","credential","queue"]},{"question":"How is accountability maintained?","expected_keywords":["owner","team","due date","actions"]}]}$l$::jsonb,
  $c${"questions":[{"question":"Which systemic weaknesses were identified?","expected_keywords":["ownership","alert","checklist"]},{"question":"What contributing factors delayed recovery?","expected_keywords":["alert fatigue","handoff","reorganization"]},{"question":"How will remediation success be measured?","expected_keywords":["no recurrence","15 minutes","simulation"]}]}$c$::jsonb,
  $s${"prompt":"Facilitate a short blameless post-mortem summary. Distinguish the trigger from systemic causes, mention a contributing factor, assign accountability, and define remediation success.","example_answer":"The trigger was a failed deployment, but the systemic issue was missing validation. Time pressure was a contributing factor. Release Engineering owns the remediation. We will measure success through three simulations with no recurrence."}$s$::jsonb,
  $e${"prompt":"Write a cross-team post-mortem summary using systemic, contributing factor, accountability, remediation, and recurrence.","evaluation_criteria":["vocabulary","clarity","naturalness"]}$e$::jsonb
);
