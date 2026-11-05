-- Run after 04-maker-stories.sql and before 06-staff-roles.sql.
begin;
do $$ begin
  if to_regprocedure('public.staff_has_role(text[])') is not null then
    raise exception 'Staff roles are already installed. Do not re-run 05 after 06; apply future upgrades instead.';
  end if;
end $$;
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon,authenticated;
grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;
drop policy if exists "Check your admin membership" on public.admin_users;
create policy "Check your admin membership" on public.admin_users for select to authenticated using (user_id=(select auth.uid()));

-- Membership is only assigned by the project owner in SQL Editor. No browser
-- role, including an admin, can grant itself or another account admin access.
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null check (jsonb_typeof(value)='object'),
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
revoke all on public.site_content from anon,authenticated;
grant select on public.site_content to anon,authenticated;
grant insert,update on public.site_content to authenticated;
grant all on public.site_content to service_role;
drop policy if exists "Read foundation content" on public.site_content;
create policy "Read foundation content" on public.site_content for select to anon,authenticated using (key='foundation');
drop policy if exists "Admin foundation content" on public.site_content;
create policy "Admin foundation content" on public.site_content for all to authenticated
using (exists(select 1 from public.admin_users where user_id=(select auth.uid())))
with check (exists(select 1 from public.admin_users where user_id=(select auth.uid())));

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image text not null,
  alt text not null default '',
  description text not null default '',
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.gallery_items enable row level security;
revoke all on public.gallery_items from anon,authenticated;
grant select on public.gallery_items to anon,authenticated;
grant all on public.gallery_items to service_role;
drop policy if exists "Published community photographs" on public.gallery_items;
create policy "Published community photographs" on public.gallery_items for select to anon,authenticated using (published);
insert into public.gallery_items(id,title,image,alt,description,published,sort_order) values
('11111111-0000-4000-8000-000000000001','Community health & welfare','/images/Health-camp.jpg','KCG Foundation health camp in Haryana','Care, close to the community.',true,0),
('11111111-0000-4000-8000-000000000002','Supporting access to cataract treatment','/images/cataract-operation.jpg','Cataract treatment supported by KCG Foundation','Helping people access essential medical care.',true,1)
on conflict(id) do nothing;

-- These policies run as the caller. They do not use JWT user_metadata and do not
-- use SECURITY DEFINER functions. The membership table's own policy is nonrecursive.
do $$
declare t text;
begin
  foreach t in array array['makers','products','journal_posts','maker_payment_accounts','gallery_items'] loop
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('drop policy if exists "Admin content management" on public.%I',t);
    execute format('create policy "Admin content management" on public.%I for all to authenticated using (exists(select 1 from public.admin_users where user_id=(select auth.uid()))) with check (exists(select 1 from public.admin_users where user_id=(select auth.uid())))',t);
  end loop;
  foreach t in array array['orders','order_items','enquiries','newsletter_subscribers'] loop
    execute format('grant select on public.%I to authenticated',t);
    execute format('drop policy if exists "Admin operations read" on public.%I',t);
    execute format('create policy "Admin operations read" on public.%I for select to authenticated using (exists(select 1 from public.admin_users where user_id=(select auth.uid())))',t);
  end loop;
end $$;

grant update(status) on public.orders to authenticated;
drop policy if exists "Admin fulfilment updates" on public.orders;
create policy "Admin fulfilment updates" on public.orders for update to authenticated
using (status in ('paid','shipped','delivered') and exists(select 1 from public.admin_users where user_id=(select auth.uid())))
with check (status in ('shipped','delivered') and exists(select 1 from public.admin_users where user_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('kcg-media','kcg-media',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']),
       ('kcg-films','kcg-films',true,52428800,array['video/mp4','video/webm','text/vtt'])
on conflict(id) do nothing;
drop policy if exists "Admin read media" on storage.objects;
drop policy if exists "Admin upload media" on storage.objects;
create policy "Admin read media" on storage.objects for select to authenticated
using (bucket_id in ('kcg-media','kcg-films') and exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create policy "Admin upload media" on storage.objects for insert to authenticated
with check (bucket_id in ('kcg-media','kcg-films') and exists(select 1 from public.admin_users where user_id=(select auth.uid())));
-- New files use UUID names. No public overwrites or deletes can break live media.
commit;

-- NEXT: run 06-staff-roles.sql before using the staff workspace.
-- Create staff email/password accounts in Supabase Authentication > Users,
-- then assign their role using the SQL in 06 or docs/SETUP.md. Never grant access
-- from a public form, URL parameter, user_metadata, or a frontend boolean.
