-- Run after 07. Deploy the updated Edge Functions before reopening public forms.
-- Repeatable: does not change staff roles, passwords, maker content or orders.
begin;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to service_role;
create table if not exists private.request_quotas (
 subject text primary key check (char_length(subject) between 1 and 160),
 window_start timestamptz not null,
 attempts integer not null check(attempts>0)
);
alter table private.request_quotas enable row level security;
revoke all on private.request_quotas from public,anon,authenticated;
grant select,insert,update,delete on private.request_quotas to service_role;
create index if not exists request_quotas_expiry_idx on private.request_quotas(window_start);

-- Only the trusted Edge Functions choose the identity, operation and quota.
create or replace function public.kcg_consume_quota(p_subject text,p_limit integer,p_seconds integer)
returns boolean language plpgsql volatile security invoker set search_path='' as $$
declare used integer;
begin
 if char_length(p_subject) not between 1 and 160 or p_limit not between 1 and 10000 or p_seconds not between 60 and 86400 then raise exception 'Invalid quota configuration'; end if;
 -- Bound maintenance work; inactive hashes expire without a growing event log.
 delete from private.request_quotas where subject in (select subject from private.request_quotas where window_start<now()-interval '2 days' order by window_start limit 100);
 insert into private.request_quotas(subject,window_start,attempts) values(p_subject,now(),1)
 on conflict(subject) do update set
  attempts=case when private.request_quotas.window_start<=now()-make_interval(secs=>p_seconds) then 1 else least(private.request_quotas.attempts+1,p_limit+1) end,
  window_start=case when private.request_quotas.window_start<=now()-make_interval(secs=>p_seconds) then now() else private.request_quotas.window_start end
 returning attempts into used;
 return used<=p_limit;
end $$;
revoke all on function public.kcg_consume_quota(text,integer,integer) from public,anon,authenticated;
grant execute on function public.kcg_consume_quota(text,integer,integer) to service_role;

-- Browser callers cannot bypass the rate-limited public submission function.
revoke insert on public.enquiries,public.newsletter_subscribers from anon,authenticated;
revoke insert(name,email,topic,message,amount_paise) on public.enquiries from anon,authenticated;
revoke insert(email) on public.newsletter_subscribers from anon,authenticated;
commit;
