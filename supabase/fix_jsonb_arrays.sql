-- Fix highlighted_words in immersion phases (stored as string instead of array)
update scenario_phases
set content = jsonb_set(content, '{highlighted_words}', (content->>'highlighted_words')::jsonb)
where phase_type = 'immersion'
  and jsonb_typeof(content->'highlighted_words') = 'string';

-- Fix expected_keywords inside questions arrays in comprehension phases
update scenario_phases
set content = jsonb_set(
  content,
  '{questions}',
  (
    select jsonb_agg(
      case
        when jsonb_typeof(q->'expected_keywords') = 'string'
        then jsonb_set(q, '{expected_keywords}', (q->>'expected_keywords')::jsonb)
        else q
      end
    )
    from jsonb_array_elements(content->'questions') as q
  )
)
where phase_type = 'comprehension'
  and exists (
    select 1 from jsonb_array_elements(content->'questions') as q
    where jsonb_typeof(q->'expected_keywords') = 'string'
  );

-- Fix expected_keywords inside questions arrays in listening phases
update scenario_phases
set content = jsonb_set(
  content,
  '{questions}',
  (
    select jsonb_agg(
      case
        when jsonb_typeof(q->'expected_keywords') = 'string'
        then jsonb_set(q, '{expected_keywords}', (q->>'expected_keywords')::jsonb)
        else q
      end
    )
    from jsonb_array_elements(content->'questions') as q
  )
)
where phase_type = 'listening'
  and exists (
    select 1 from jsonb_array_elements(content->'questions') as q
    where jsonb_typeof(q->'expected_keywords') = 'string'
  );
