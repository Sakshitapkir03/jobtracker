-- Seed data for local development
-- Replace 'your-user-uuid' with an actual Supabase auth user ID

-- Sample companies
insert into companies (id, user_id, name, website, careers_url, industry) values
  ('c1', 'your-user-uuid', 'Stripe',    'https://stripe.com',    'https://stripe.com/jobs',    'Fintech'),
  ('c2', 'your-user-uuid', 'Linear',    'https://linear.app',    'https://linear.app/careers', 'Productivity'),
  ('c3', 'your-user-uuid', 'Vercel',    'https://vercel.com',    'https://vercel.com/careers', 'Developer Tools'),
  ('c4', 'your-user-uuid', 'Anthropic', 'https://anthropic.com', 'https://anthropic.com/careers', 'AI/ML')
on conflict do nothing;

-- Sample applications
insert into applications (id, user_id, company_id, job_title, stage, applied_at) values
  ('a1', 'your-user-uuid', 'c1', 'Senior Software Engineer', 'APPLIED',      now() - interval '7 days'),
  ('a2', 'your-user-uuid', 'c2', 'Full Stack Engineer',      'PHONE_SCREEN', now() - interval '5 days'),
  ('a3', 'your-user-uuid', 'c3', 'Frontend Engineer',        'TECHNICAL',    now() - interval '3 days'),
  ('a4', 'your-user-uuid', 'c4', 'ML Engineer',              'BOOKMARKED',   now())
on conflict do nothing;
