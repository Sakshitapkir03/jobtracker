-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Companies ─────────────────────────────────────────────────────────────
create table if not exists companies (
  id            text primary key default gen_random_uuid()::text,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  website       text,
  careers_url   text,
  logo_url      text,
  industry      text,
  notes         text,
  last_scraped_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_companies_user_id on companies(user_id);

-- RLS
alter table companies enable row level security;
create policy "users_own_companies" on companies
  for all using (auth.uid()::text = user_id::text);

-- ── Applications ──────────────────────────────────────────────────────────
create type application_stage as enum (
  'BOOKMARKED','APPLIED','PHONE_SCREEN','TECHNICAL','ONSITE','OFFER','REJECTED','WITHDRAWN'
);

create table if not exists applications (
  id            text primary key default gen_random_uuid()::text,
  user_id       uuid not null references auth.users(id) on delete cascade,
  company_id    text not null references companies(id) on delete cascade,
  job_title     text not null,
  job_url       text,
  stage         application_stage not null default 'APPLIED',
  applied_at    timestamptz not null,
  notes         text,
  salary_range  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_applications_user_id on applications(user_id);
create index idx_applications_stage   on applications(stage);

alter table applications enable row level security;
create policy "users_own_applications" on applications
  for all using (auth.uid()::text = user_id::text);

-- ── Job Postings ──────────────────────────────────────────────────────────
create table if not exists job_postings (
  id          text primary key default gen_random_uuid()::text,
  company_id  text not null references companies(id) on delete cascade,
  title       text not null,
  url         text not null unique,
  location    text,
  description text,
  posted_at   timestamptz,
  is_new      boolean not null default true,
  scraped_at  timestamptz not null default now()
);

create index idx_job_postings_company_id on job_postings(company_id);
create index idx_job_postings_is_new     on job_postings(is_new);
create index idx_job_postings_scraped_at on job_postings(scraped_at desc);

-- ── Notifications ─────────────────────────────────────────────────────────
create table if not exists notifications (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text not null,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id    on notifications(user_id);
create index idx_notifications_created_at on notifications(created_at desc);

alter table notifications enable row level security;
create policy "users_own_notifications" on notifications
  for all using (auth.uid() = user_id);

-- ── Enable Realtime for notifications ─────────────────────────────────────
-- Run in Supabase dashboard → Database → Replication
-- or uncomment this if using CLI migrations:
-- alter publication supabase_realtime add table notifications;

-- ── updated_at trigger ────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at
  before update on companies
  for each row execute procedure set_updated_at();

create trigger applications_updated_at
  before update on applications
  for each row execute procedure set_updated_at();
