import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('Supabase policies isolate the director workspace and protect payments and admin membership',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated,service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`);
  for(const file of ['01-schema.sql','04-maker-stories.sql','05-admin.sql','04-maker-stories.sql','05-admin.sql'])await db.exec(await readFile(new URL('../supabase/sql/'+file,import.meta.url),'utf8'));
  const admin='11111111-1111-4111-8111-111111111111',customer='22222222-2222-4222-8222-222222222222',maker='33333333-3333-4333-8333-333333333333';
  await db.query('insert into auth.users values($1),($2)',[admin,customer]);
  await db.query('insert into public.admin_users(user_id) values($1)',[admin]);
  await db.query(`insert into public.makers(id,name,craft,story,image,published) values($1,'Private draft maker','Clay','Approved story','/workshop.jpg',false)`,[maker]);
  await db.exec(`insert into public.enquiries(name,email,topic,message) values('Visitor','visitor@example.com','General enquiry','Private enquiry content');set role authenticated;set request.jwt.claim.sub='${customer}'`);
  assert.equal((await db.query('select * from public.admin_users')).rows.length,0);
  assert.equal((await db.query('select * from public.makers')).rows.length,0);
  assert.equal((await db.query('select * from public.enquiries')).rows.length,0);
  await assert.rejects(()=>db.query(`insert into public.admin_users(user_id) values($1)`,[customer]),/permission denied/);
  await assert.rejects(()=>db.exec(`insert into public.site_content values('foundation','{}',now())`),/row-level security/);
  await assert.rejects(()=>db.exec(`insert into storage.objects(bucket_id) values('kcg-media')`),/row-level security/);
  await assert.rejects(()=>db.exec(`insert into public.makers(name,craft,story,image) values('Intruder','Clay','Bad','/image')`),/row-level security/);
  assert.equal((await db.query(`update public.makers set name='Tampered' returning id`)).rows.length,0);
  await db.exec(`set request.jwt.claim.sub='${admin}'`);
  assert.equal((await db.query('select * from public.admin_users')).rows.length,1);
  assert.equal((await db.query('select * from public.makers')).rows.length,1);
  assert.equal((await db.query('select * from public.enquiries')).rows.length,1);
  await db.query(`update public.makers set portrait_url='/portrait.jpg',life_story='A real story',signature_style='Distinctive curves',learning_story='Family learning',cultural_roots='Haryana' where id=$1`,[maker]);
  await db.exec(`insert into public.site_content(key,value) values('foundation','{"hero_heading":"Edited by director"}');insert into storage.objects(bucket_id) values('kcg-media');`);
  await assert.rejects(()=>db.query(`insert into public.admin_users(user_id) values($1)`,[customer]),/permission denied/);
  await db.exec('reset role');
  const order=(await db.query(`insert into public.orders(user_id,idempotency_key,status,total_paise,shipping) values($1,gen_random_uuid(),'paid',10000,'{}') returning id`,[customer])).rows[0].id;
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${customer}'`);
  assert.equal((await db.query(`update public.orders set status='shipped' where id=$1 returning id`,[order])).rows.length,0);
  await db.exec(`set request.jwt.claim.sub='${admin}'`);
  assert.equal((await db.query(`update public.orders set status='shipped' where id=$1 returning id`,[order])).rows.length,1);
  await assert.rejects(()=>db.query(`update public.orders set total_paise=1 where id=$1`,[order]),/permission denied/);
  await assert.rejects(()=>db.query(`update public.orders set status='paid' where id=$1`,[order]),/row-level security/);
  await db.exec('reset role;set role anon');
  assert.equal((await db.query(`select value->>'hero_heading' as heading from public.site_content where key='foundation'`)).rows[0].heading,'Edited by director');
  assert.equal((await db.query('select * from public.makers')).rows.length,0,'draft makers remain private');
 }finally{await db.close();}
});
