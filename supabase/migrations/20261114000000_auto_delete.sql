-- Optional, run after 20261113000000_template_edits.sql: deletes saved contracts 30 days after
-- creation, checked every hour. If "pg_cron" is refused, enable it first in
-- Database → Extensions → pg_cron, then run this again. Re-running just replaces the job.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('delete-old-contracts', '0 * * * *', $$delete from public.contracts where created_at < now() - interval '30 days'$$);
