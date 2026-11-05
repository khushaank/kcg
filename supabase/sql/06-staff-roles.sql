-- Run AFTER 01–05. Repeatable. Passwords belong to Supabase Auth, never a table.
begin;
-- Preserve the full scope of any previously approved directors on upgrade.
alter table public.admin_users add column if not exists role text not null default 'super_admin'
  check (role in ('super_admin','manager','editor'));
alter table public.admin_users alter column role set default 'editor';
alter table public.admin_users add column if not exists enabled boolean not null default true;
revoke insert,update,delete on public.admin_users from anon,authenticated;

-- A fresh password login AND verified MFA are required for EVERY staff operation.
-- Membership/role/enabled are read from the database on every statement, so a
-- role change takes effect without waiting for a stale JWT role claim to refresh.
create or replace function public.staff_has_role(allowed_roles text[])
returns boolean language sql stable security invoker set search_path='' as $$
  select coalesce(
    (select auth.uid()) is not null
    and (select auth.jwt()->>'aal')='aal2'
    and exists (
      select 1 from jsonb_array_elements(coalesce((select auth.jwt()->'amr'),'[]'::jsonb)) as method
      where method->>'method'='password'
        and case when method->>'timestamp' ~ '^[0-9]{1,12}$'
          then (method->>'timestamp')::numeric between extract(epoch from now())-1800 and extract(epoch from now())+30
          else false end
    )
    and exists (
      select 1 from public.admin_users a
      where a.user_id=(select auth.uid()) and a.enabled and a.role=any(allowed_roles)
    ),false);
$$;
revoke all on function public.staff_has_role(text[]) from public,anon;
grant execute on function public.staff_has_role(text[]) to authenticated,service_role;

drop policy if exists "Admin foundation content" on public.site_content;
create policy "Admin foundation content" on public.site_content for all to authenticated
using ((select public.staff_has_role(array['super_admin','manager'])))
with check ((select public.staff_has_role(array['super_admin','manager'])));

do $$
declare t text;
begin
  foreach t in array array['makers','products','journal_posts','gallery_items'] loop
    execute format('drop policy if exists "Admin content management" on public.%I',t);
    execute format('drop policy if exists "Staff content read" on public.%I',t);
    execute format('drop policy if exists "Staff content insert" on public.%I',t);
    execute format('drop policy if exists "Staff content update" on public.%I',t);
    execute format('revoke delete on public.%I from authenticated',t);
    execute format('create policy "Staff content read" on public.%I for select to authenticated using ((select public.staff_has_role(array[''super_admin'',''manager'',''editor''])))',t);
    execute format('create policy "Staff content insert" on public.%I for insert to authenticated with check ((select public.staff_has_role(array[''super_admin'',''manager''])) or (not published and (select public.staff_has_role(array[''editor'']))))',t);
    execute format('create policy "Staff content update" on public.%I for update to authenticated using ((select public.staff_has_role(array[''super_admin'',''manager''])) or (not published and (select public.staff_has_role(array[''editor''])))) with check ((select public.staff_has_role(array[''super_admin'',''manager''])) or (not published and (select public.staff_has_role(array[''editor'']))))',t);
  end loop;
  foreach t in array array['orders','order_items','enquiries','newsletter_subscribers'] loop
    execute format('drop policy if exists "Admin operations read" on public.%I',t);
    execute format('create policy "Admin operations read" on public.%I for select to authenticated using ((select public.staff_has_role(array[''super_admin'',''manager''])))',t);
  end loop;
end $$;

drop policy if exists "Admin content management" on public.maker_payment_accounts;
create policy "Admin content management" on public.maker_payment_accounts for all to authenticated
using ((select public.staff_has_role(array['super_admin'])))
with check ((select public.staff_has_role(array['super_admin'])));
revoke delete on public.maker_payment_accounts from authenticated;

drop policy if exists "Admin fulfilment updates" on public.orders;
create policy "Admin fulfilment updates" on public.orders for update to authenticated
using (status in ('paid','shipped','delivered') and (select public.staff_has_role(array['super_admin','manager'])))
with check (status in ('shipped','delivered') and (select public.staff_has_role(array['super_admin','manager'])));

drop policy if exists "Admin read media" on storage.objects;
drop policy if exists "Admin upload media" on storage.objects;
create policy "Admin read media" on storage.objects for select to authenticated
using (bucket_id in ('kcg-media','kcg-films') and (select public.staff_has_role(array['super_admin','manager','editor'])));
create policy "Admin upload media" on storage.objects for insert to authenticated
with check (bucket_id in ('kcg-media','kcg-films') and (select public.staff_has_role(array['super_admin','manager','editor'])));
commit;

-- Create each email/password account in Authentication > Users first.
-- Then assign access HERE or through the admin_users Table Editor in Supabase.
-- insert into public.admin_users(user_id,role,enabled)
-- select id,'super_admin',true from auth.users where lower(email)=lower('YOUR-EMAIL@example.com')
-- on conflict(user_id) do update set role=excluded.role,enabled=true;
-- Other roles: 'editor' or 'manager'.
-- To revoke staff access immediately: update public.admin_users set enabled=false where user_id='USER-UUID';
