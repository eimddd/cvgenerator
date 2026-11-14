-- Brings an existing database up to date with schema.sql. Safe to run more than once.
-- Run in Supabase → SQL Editor → New query → Run.

-- Imported contracts (ids "u…") and the office's edits of built-in templates (ids "c…"/"m…").
create table if not exists public.template_edits (
  id text primary key,
  data jsonb not null,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists template_edits_touch on public.template_edits;
create trigger template_edits_touch before update on public.template_edits
  for each row execute function public.touch_updated_at();

-- Only signed-in office staff can read or write; visitors who aren't logged in get nothing.
alter table public.template_edits enable row level security;
revoke all on public.template_edits from anon;
grant select, insert, update, delete on public.template_edits to authenticated;
drop policy if exists "office staff" on public.template_edits;
drop policy if exists "staff read" on public.template_edits;
drop policy if exists "staff insert" on public.template_edits;
drop policy if exists "staff update" on public.template_edits;
drop policy if exists "staff delete" on public.template_edits;
create policy "staff read" on public.template_edits for select to authenticated using (true);
create policy "staff insert" on public.template_edits for insert to authenticated with check (true);
create policy "staff update" on public.template_edits for update to authenticated using (true) with check (true);
create policy "staff delete" on public.template_edits for delete to authenticated using (true);

-- Also pending: contracts no longer link to a client (saving a contract fails without this) …
drop index if exists contracts_client_idx;
alter table public.contracts drop column if exists client_id;

-- … and job titles typed in CVs, suggested next time.
create table if not exists public.job_titles (
  title text primary key,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.job_titles enable row level security;
revoke all on public.job_titles from anon;
grant select, insert, update, delete on public.job_titles to authenticated;
drop policy if exists "office staff" on public.job_titles;
create policy "office staff" on public.job_titles for all to authenticated using (true) with check (true);

-- The 30-day auto-delete job (pg_cron) is in its own file, 20261114000000_auto_delete.sql,
-- so a pg_cron problem can't cancel this script.

-- Makes the API see the new tables right away (fixes "not found in the schema cache").
NOTIFY pgrst, 'reload schema';
