-- Monvia Office Docs — run once in Supabase: SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  gender text not null default 'm' check (gender in ('m', 'f')),
  cin text,
  birth_date text,
  birth_place text,
  nationality text,
  job text,
  address text,
  phone text,
  email text,
  notes text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  template_title text not null,
  category text,
  lang text not null default 'ar',
  title text,
  values jsonb not null default '{}'::jsonb,
  search_text text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cvs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  lang text not null default 'fr',
  title text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contracts no longer link to a client: the client's details live only inside the
-- contract (values) and go with it. Safe to re-run on a database made by an older schema.
drop index if exists contracts_client_idx;
alter table public.contracts drop column if exists client_id;
create index if not exists contracts_created_idx on public.contracts (created_at desc);
create index if not exists cvs_client_idx on public.cvs (client_id);
create index if not exists cvs_created_idx on public.cvs (created_at desc);
create index if not exists clients_name_idx on public.clients (full_name);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();
drop trigger if exists contracts_touch on public.contracts;
create trigger contracts_touch before update on public.contracts for each row execute function public.touch_updated_at();
drop trigger if exists cvs_touch on public.cvs;
create trigger cvs_touch before update on public.cvs for each row execute function public.touch_updated_at();

-- Only signed-in office accounts can read or write. Public sign-up is turned off
-- in the dashboard, so the only accounts are the ones you create.
alter table public.clients enable row level security;
alter table public.contracts enable row level security;
alter table public.cvs enable row level security;

drop policy if exists "office staff" on public.clients;
create policy "office staff" on public.clients for all to authenticated using (true) with check (true);
drop policy if exists "office staff" on public.contracts;
create policy "office staff" on public.contracts for all to authenticated using (true) with check (true);
drop policy if exists "office staff" on public.cvs;
create policy "office staff" on public.cvs for all to authenticated using (true) with check (true);

-- Templates the office edited in the app (template editor). The original stays in the
-- app's code; deleting a row here brings it back.
create table if not exists public.template_edits (
  id text primary key,
  data jsonb not null,
  updated_by uuid default auth.uid() references auth.users (id),
  updated_at timestamptz not null default now()
);
drop trigger if exists template_edits_touch on public.template_edits;
create trigger template_edits_touch before update on public.template_edits for each row execute function public.touch_updated_at();
alter table public.template_edits enable row level security;
drop policy if exists "office staff" on public.template_edits;
create policy "office staff" on public.template_edits for all to authenticated using (true) with check (true);

-- Saved contracts (with the client details in them) are deleted 30 days after creation.
-- Runs every hour; re-running this file just replaces the job.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('delete-old-contracts', '0 * * * *', $$delete from public.contracts where created_at < now() - interval '30 days'$$);

-- Job titles the office typed in CVs that weren't in the app's built-in list,
-- so they're suggested next time.
create table if not exists public.job_titles (
  title text primary key,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
alter table public.job_titles enable row level security;
drop policy if exists "office staff" on public.job_titles;
create policy "office staff" on public.job_titles for all to authenticated using (true) with check (true);
