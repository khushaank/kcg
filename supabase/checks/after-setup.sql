-- Read-only diagnostics: run in SQL Editor after SQL 01–08.
-- This does not create users, change roles or modify data.
select to_regprocedure('public.kcg_consume_quota(text,integer,integer)') is not null as sql_08_quota_function_installed;
select role,enabled,count(*) as staff_accounts from public.admin_users group by role,enabled;
select id,public,file_size_limit,allowed_mime_types from storage.buckets
where id in ('kcg-media','kcg-films','kcg-captions') order by id;
select tablename,rowsecurity from pg_tables where schemaname='public'
and tablename in ('admin_users','site_content','makers','products','carts','orders','order_items','enquiries','newsletter_subscribers');
select has_table_privilege('anon','public.enquiries','INSERT') as direct_public_enquiry_insert,
has_table_privilege('anon','public.newsletter_subscribers','INSERT') as direct_public_newsletter_insert,
has_function_privilege('anon','public.kcg_consume_quota(text,integer,integer)','EXECUTE') as public_quota_execute;
select value->>'name' as foundation_name from public.site_content where key='foundation';
