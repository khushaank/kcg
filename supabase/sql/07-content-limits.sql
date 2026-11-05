-- Upgrade an existing installation after 06-staff-roles.sql.
-- Repeatable. Keeps existing content and media; limits apply to new uploads/writes.
begin;
update public.site_content set value=jsonb_set(value,'{name}','"KCG Foundation"'::jsonb) where key='foundation' and value->>'name' is distinct from 'KCG Foundation';

-- Supabase Storage enforces these before accepting uploaded file bytes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('kcg-media','kcg-media',true,2097152,array['image/jpeg','image/png','image/webp','image/avif']),
 ('kcg-films','kcg-films',true,52428800,array['video/mp4','video/webm']),
 ('kcg-captions','kcg-captions',true,262144,array['text/vtt'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
alter policy "Admin read media" on storage.objects using (bucket_id in ('kcg-media','kcg-films','kcg-captions') and (select public.staff_has_role(array['super_admin','manager','editor'])));
alter policy "Admin upload media" on storage.objects with check (bucket_id in ('kcg-media','kcg-films','kcg-captions') and (select public.staff_has_role(array['super_admin','manager','editor'])));

-- Pure validator: no privileged reads and no security-definer access.
create or replace function public.kcg_content_problem(doc jsonb, nesting integer default 0)
returns text language plpgsql immutable security invoker set search_path='' as $$
declare
 limits constant jsonb := '{"name":120,"title":160,"slug":160,"craft":160,"location":240,"initials":8,"story":8000,"life_story":12000,"learning_story":8000,"signature_style":8000,"cultural_roots":8000,"quote":1000,"subtitle":300,"category":100,"tag":80,"description":6000,"significance":8000,"materials":1000,"dimensions":500,"care":4000,"delivery":2000,"origin":300,"technique":1000,"making_time":160,"making_video_caption":500,"making_video_transcript":20000,"date":80,"readingTime":80,"excerpt":1200,"content":40000,"alt":300,"caption":500,"tagline":200,"mission":2000,"hero_eyebrow":200,"hero_heading":160,"hero_emphasis":160,"hero_description":1200,"hero_image_alt":300,"email":254,"phone":40,"footer_summary":1000,"newsletter_heading":160,"razorpay_account_id":80}'::jsonb;
 arrays constant jsonb := '{"gallery":3,"process_steps":12,"programs":12}'::jsonb;
 item record; child jsonb; max_chars integer; problem text;
begin
 if nesting>5 or jsonb_typeof(doc) is distinct from 'object' then return 'Invalid nested content.'; end if;
 for item in select key,value from jsonb_each(doc) loop
  if jsonb_typeof(item.value)='string' then
   max_chars:=case when item.key in ('url','image','featuredImage','making_video_poster') or item.key like '%\_url' escape '\' or item.key like '%\_image' escape '\' then 2048 else coalesce((limits->>item.key)::integer,500) end;
   if char_length(item.value#>>'{}')>max_chars then return item.key||': maximum '||max_chars||' characters.'; end if;
  elsif jsonb_typeof(item.value)='array' then
   if not (arrays ? item.key) or jsonb_array_length(item.value)>(arrays->>item.key)::integer then return item.key||': too many entries.'; end if;
   for child in select value from jsonb_array_elements(item.value) loop
    problem:=public.kcg_content_problem(child,nesting+1);
    if problem is not null then return item.key||'.'||problem; end if;
   end loop;
  elsif jsonb_typeof(item.value)='object' then
   return item.key||': use plain text, not a nested object.';
  elsif jsonb_typeof(item.value)='boolean' and item.key not in ('published','enabled') then
   return item.key||': use plain text.';
  elsif jsonb_typeof(item.value)='number' and item.key not in ('stock','price_paise','sort_order') then
   return item.key||': use plain text.';
  elsif jsonb_typeof(item.value)='null' then
   return item.key||': use an empty text field instead of null.';
  end if;
 end loop;
 return null;
end $$;
revoke all on function public.kcg_content_problem(jsonb,integer) from public,anon;
grant execute on function public.kcg_content_problem(jsonb,integer) to authenticated,service_role;

create or replace function public.kcg_guard_entry()
returns trigger language plpgsql security invoker set search_path='' as $$
declare doc jsonb:=to_jsonb(new); problem text;
begin
 if octet_length(doc::text)>196608 then raise exception using errcode='23514',message='This entry exceeds 192 KB. Shorten the text; upload media as files.'; end if;
 if tg_table_name='site_content' then
  if new.key<>'foundation' or new.value->>'name' is distinct from 'KCG Foundation' then
   raise exception using errcode='23514',message='The foundation name is locked to KCG Foundation.';
  end if;
  doc:=new.value;
 end if;
 problem:=public.kcg_content_problem(doc);
 if problem is not null then raise exception using errcode='23514',message=problem; end if;
 if tg_table_name='products' then
  if new.stock not between 0 and 10000 then raise exception using errcode='23514',message='Stock must be between 0 and 10000.'; end if;
 end if;
 if tg_table_name in ('products','journal_posts') and doc->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception using errcode='23514',message='URL name must use lowercase letters, numbers and single hyphens.'; end if;
 if doc ? 'sort_order' and (doc->>'sort_order')::integer not between 0 and 9999 then raise exception using errcode='23514',message='Display order must be between 0 and 9999.'; end if;
 return new;
end $$;
revoke all on function public.kcg_guard_entry() from public,anon;
grant execute on function public.kcg_guard_entry() to authenticated,service_role;
do $$ declare t text; begin
 foreach t in array array['makers','products','journal_posts','gallery_items','site_content','maker_payment_accounts'] loop
  execute format('drop trigger if exists kcg_entry_limits on public.%I',t);
  execute format('create trigger kcg_entry_limits before insert or update on public.%I for each row execute function public.kcg_guard_entry()',t);
 end loop;
end $$;

-- Customer-owned carts must contain only small, valid line items, even if a
-- caller skips the website and writes directly through the Data API.
create or replace function public.kcg_cart_valid(items jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare item jsonb;
begin
 if jsonb_typeof(items) is distinct from 'array' or octet_length(items::text)>16000 then return false; end if;
 if jsonb_array_length(items)>30 then return false; end if;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item) is distinct from 'object' then return false; end if;
  if not (item ?& array['product_id','quantity']) or item-'product_id'-'quantity'<>'{}'::jsonb then return false; end if;
  if jsonb_typeof(item->'product_id') is distinct from 'string' or item->>'product_id' !~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' then return false; end if;
  if jsonb_typeof(item->'quantity') is distinct from 'number' or item->>'quantity' !~ '^([1-9]|10)$' then return false; end if;
 end loop;
 return true;
end $$;
revoke all on function public.kcg_cart_valid(jsonb) from public,anon;
grant execute on function public.kcg_cart_valid(jsonb) to authenticated,service_role;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.carts'::regclass and conname='kcg_cart_entry_limits') then
  alter table public.carts add constraint kcg_cart_entry_limits check(public.kcg_cart_valid(items)) not valid;
 end if;
end $$;
commit;
