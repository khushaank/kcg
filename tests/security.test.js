import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {securityHeaders,securityMetaTags,STAFF_PAGE} from '../scripts/security-headers.js';
import {readBody,HttpError} from '../supabase/functions/_shared/http.ts';

test('CSP blocks string evaluation, inline scripts, framing and deprecated unload',()=>{
 for(const page of ['/','/checkout.html','/'+STAFF_PAGE]){
  const headers=securityHeaders(page,'https://project.supabase.co');
  const csp=headers['Content-Security-Policy'];
  assert.ok(csp.includes("script-src-attr 'none'"));assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.ok(!csp.includes('unsafe-eval'));assert.ok(!csp.match(/script-src[^;]*unsafe-inline/));
  assert.ok(csp.includes('https://project.supabase.co'));assert.ok(!csp.includes('https://*.supabase.co'));
  assert.ok(headers['Permissions-Policy'].includes('unload=()'));
 }
 const staff=securityHeaders('/'+STAFF_PAGE,'https://project.supabase.co');
 assert.ok(!staff['Content-Security-Policy'].includes('razorpay'));
 assert.equal(staff['Cache-Control'],'no-store, max-age=0');
 const meta=securityMetaTags('/'+STAFF_PAGE,'https://project.supabase.co');
 assert.ok(meta.includes('http-equiv="Content-Security-Policy"'));assert.ok(meta.includes("script-src 'self'"));
 assert.ok(!meta.includes('frame-ancestors'));assert.ok(!meta.includes('razorpay'));assert.ok(meta.includes('content="same-origin"'));
});

test('request body limits count bytes and stop oversized streams before parsing',async()=>{
 const input='ह'.repeat(10);
 assert.equal(await readBody(new Request('https://test',{method:'POST',body:input}),30),input);
 await assert.rejects(()=>readBody(new Request('https://test',{method:'POST',body:input}),29),e=>e instanceof HttpError&&e.status===413);
 await assert.rejects(()=>readBody(new Request('https://test',{method:'POST',headers:{'content-length':'1000000'},body:'x'}),100),e=>e.status===413);
});

test('public form endpoint validates input, limits requests and ignores honeypot submissions',async()=>{
 const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;let handler,limited=false,calls=[];
 globalThis.Deno={serve:fn=>handler=fn,env:{get:key=>({ALLOWED_ORIGINS:'https://foundation.test',SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-server-only'}[key])}};
 globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return new Response(JSON.stringify(String(url).includes('/rpc/kcg_consume_quota')?!limited:[{id:'saved'}]),{status:200});};
 const req=body=>new Request('https://project.supabase.co/functions/v1/submit-public-form',{method:'POST',headers:{origin:'https://foundation.test'},body:JSON.stringify(body)});
 try{
  await import('../supabase/functions/submit-public-form/index.ts');
  assert.equal((await handler(req({kind:'newsletter',email:'reader@example.com'}))).status,200);
  assert.equal(calls.filter(c=>c.url.includes('kcg_consume_quota')).length,3);
  assert.ok(calls.some(c=>c.url.endsWith('/newsletter_subscribers')));
  calls=[];assert.equal((await handler(req({kind:'newsletter',email:'invalid'}))).status,400);assert.equal(calls.length,0);
  assert.equal((await handler(req({kind:'newsletter',email:'reader@example.com',website:'bot-filled'}))).status,200);assert.equal(calls.length,0);
  limited=true;assert.equal((await handler(req({kind:'newsletter',email:'reader@example.com'}))).status,429);assert.equal(calls.some(c=>c.url.endsWith('/newsletter_subscribers')),false);
  assert.equal((await handler(new Request('https://test',{method:'POST',headers:{origin:'https://attacker.test'},body:'{}'}))).status,403);
 }finally{globalThis.Deno=oldDeno;globalThis.fetch=oldFetch;}
});

test('rate quota SQL is atomic, resets expired windows and cannot be bypassed by a customer',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated,service_role;`);
  await db.exec(await readFile(new URL('../supabase/sql/01-schema.sql',import.meta.url),'utf8'));
  const sql=await readFile(new URL('../supabase/sql/08-security.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
  for(const role of ['anon','authenticated']){
   await db.exec('reset role;set role '+role);
   await assert.rejects(()=>db.exec(`insert into public.newsletter_subscribers(email) values('reader@example.com')`),/permission denied/);
   await assert.rejects(()=>db.exec(`insert into public.enquiries(name,email,topic,message) values('Visitor','reader@example.com','General enquiry','A valid message here')`),/permission denied/);
   await assert.rejects(()=>db.exec(`select public.kcg_consume_quota('test',2,60)`),/permission denied/);
  }
  await db.exec('reset role;set role service_role');
  const use=async()=> (await db.query(`select public.kcg_consume_quota('test',2,60) as allowed`)).rows[0].allowed;
  assert.equal(await use(),true);assert.equal(await use(),true);assert.equal(await use(),false);
  await db.exec(`update private.request_quotas set window_start=now()-interval '2 minutes' where subject='test'`);
  assert.equal(await use(),true);
  await db.exec(`insert into public.newsletter_subscribers(email) values('reader@example.com')`);
 }finally{await db.close();}
});
