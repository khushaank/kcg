import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {FIELD_LIMITS,ARRAY_LIMITS,entryErrors,uploadError,UPLOAD_LIMITS} from '../src/data-limits.js';
import {mergeFoundation,foundationDefaults} from '../src/content.js';

test('brand and entry limits reject oversized media, text, nested data and numeric values',()=>{
 assert.equal(mergeFoundation({name:'A different name'}).name,'KCG Foundation');
 assert.deepEqual(entryErrors('foundation',foundationDefaults),[]);
 assert.match(entryErrors('foundation',{name:'Renamed'})[0],/locked/);
 assert.match(entryErrors('makers',{name:'x'.repeat(121)})[0],/120/);
 assert.ok(entryErrors('products',{stock:10001,price_paise:100,sort_order:10000}).length>=2);
 assert.ok(entryErrors('makers',{story:'x'.repeat(8001)}).length);
 assert.ok(entryErrors('foundation',{...foundationDefaults,phone:{bad:'value'}}).length);
 assert.ok(entryErrors('products',{gallery:Array(4).fill({url:'/images/test.jpg'}),stock:1,price_paise:100}).length);
 for(const [kind,rule] of Object.entries(UPLOAD_LIMITS)){
  const file={size:rule.bytes,type:rule.types[0],name:kind==='captions'?'captions.vtt':'media'};
  assert.equal(uploadError(file,kind),'');
  assert.ok(uploadError({...file,size:rule.bytes+1},kind));
  assert.ok(uploadError({...file,size:0},kind));
 }
 assert.ok(uploadError({size:100,type:'image/svg+xml',name:'image.svg'},'image'));
});

test('SQL upgrade enforces matching limits, locks the name, and preserves existing content',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;grant usage on schema auth to anon,authenticated,service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`);
  for(const file of ['01-schema.sql','04-maker-stories.sql','05-admin.sql','06-staff-roles.sql'])await db.exec(await readFile(new URL('../supabase/sql/'+file,import.meta.url),'utf8'));
  await db.exec(`insert into public.site_content values('foundation','{"name":"Old title","mission":"Keep this mission"}',now())`);
  const upgrade=await readFile(new URL('../supabase/sql/07-content-limits.sql',import.meta.url),'utf8');
  assert.ok(upgrade.includes(JSON.stringify(FIELD_LIMITS)));
  assert.ok(upgrade.includes(JSON.stringify(ARRAY_LIMITS)));
  await db.exec(upgrade);await db.exec(upgrade);
  const foundation=(await db.query('select value from public.site_content')).rows[0].value;
  assert.equal(foundation.name,'KCG Foundation');assert.equal(foundation.mission,'Keep this mission');
  const buckets=(await db.query('select * from storage.buckets')).rows;
  for(const rule of Object.values(UPLOAD_LIMITS)){
   const bucket=buckets.find(b=>b.id===rule.bucket);
   assert.equal(Number(bucket.file_size_limit),rule.bytes);assert.deepEqual(bucket.allowed_mime_types,rule.types);
  }
  const staff=crypto.randomUUID(),maker=crypto.randomUUID();
  await db.query('insert into auth.users values($1)',[staff]);
  await db.query(`insert into public.admin_users(user_id,role) values($1,'super_admin')`,[staff]);
  await db.exec('set role authenticated');
  await db.query(`select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)`,[staff,JSON.stringify({aal:'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}]})]);
  await db.query(`insert into public.makers(id,name,craft,story,image) values($1,'A maker','Clay','A story','/images/test.jpg')`,[maker]);
  await assert.rejects(()=>db.query('update public.makers set life_story=$1',[ 'x'.repeat(12001)]),/12000 characters/);
  await assert.rejects(()=>db.exec(`update public.site_content set value='{"name":"Another foundation"}'`),/locked/);
  await assert.rejects(()=>db.exec(`update public.site_content set value='{"name":"KCG Foundation","phone":{"bad":"value"}}'`),/plain text/);
  await assert.rejects(()=>db.query(`update public.site_content set value=$1`,[JSON.stringify({name:'KCG Foundation',programs:Array(13).fill({title:'Program'})})]),/too many/);
  await assert.rejects(()=>db.query(`update public.site_content set value=$1`,[JSON.stringify({name:'KCG Foundation',programs:Array(12).fill({description:'ह'.repeat(6000)})})]),/192 KB/);
  await db.query(`insert into public.products(maker_id,slug,title,category,price_paise,image,description) values($1,'test-piece','Test piece','Clay',100,'/images/test.jpg','Story')`,[maker]);
  await assert.rejects(()=>db.exec('update public.products set stock=10001'),/Stock/);
  await assert.rejects(()=>db.exec('update public.products set sort_order=10000'),/Display order/);
  await db.exec(`insert into public.journal_posts(slug,title,date,category,excerpt,"featuredImage",content) values('valid-story','Story','Today','Care','Summary','/images/test.jpg','Body')`);
  await assert.rejects(()=>db.exec(`update public.journal_posts set slug='Invalid URL'`),/URL name/);
  await assert.rejects(()=>db.query(`update public.products set gallery=$1`,[JSON.stringify([{url:'/images/one.jpg',caption:'x'.repeat(501)}])]),/500 characters/);
  await db.exec(`update public.site_content set value='{"name":"KCG Foundation","mission":"Saved safely"}'`);
  await db.query('insert into public.carts(user_id,items) values($1,$2)',[staff,JSON.stringify([{product_id:maker,quantity:1}])]);
  for(const items of [[{product_id:maker,quantity:11}],[{product_id:maker,quantity:1,extra:'x'.repeat(20000)}],[{product_id:'invalid',quantity:1}],Array(31).fill({product_id:maker,quantity:1})]){
   await assert.rejects(()=>db.query('update public.carts set items=$1',[JSON.stringify(items)]),/violates check constraint/);
  }
  assert.equal((await db.query('select value from public.site_content')).rows[0].value.mission,'Saved safely');
 }finally{await db.close();}
});
