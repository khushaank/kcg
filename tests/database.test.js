import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('SQL enforces ownership, server pricing, atomic stock and payment idempotency',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`);
    await db.exec(await readFile(new URL('../supabase/sql/01-schema.sql',import.meta.url),'utf8'));
    const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',maker='33333333-3333-4333-8333-333333333333',product='44444444-4444-4444-8444-444444444444',key='55555555-5555-4555-8555-555555555555';
    await db.query('insert into auth.users(id) values($1),($2)',[user,other]);
    await db.query(`insert into public.makers(id,name,craft,story,image,published) values($1,'Real maker','Clay','Approved story','/image.jpg',true)`,[maker]);
    await db.query(`insert into public.products(id,maker_id,slug,title,category,price_paise,image,description,stock,published) values($1,$2,'real-piece','Real piece','Clay',125000,'/image.jpg','A real piece',5,true)`,[product,maker]);
    await db.query(`insert into public.maker_payment_accounts values($1,'acc_test123',true)`,[maker]);
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${user}'`);
    await assert.rejects(()=>db.query(`select public.prepare_checkout($1,$2,$3,$4)`,[user,key,JSON.stringify([{product_id:product,quantity:2}]),'{}']),/permission denied/);
    await db.query('insert into public.carts(user_id,items) values($1,$2)',[user,'[]']);
    await assert.rejects(()=>db.query('insert into public.carts(user_id,items) values($1,$2)',[other,'[]']),/row-level security/);
    await db.exec('reset role; set role service_role');
    const payload=[user,key,JSON.stringify([{product_id:product,quantity:2,price_paise:1}]),JSON.stringify({name:'Test Customer',country:'India'})];
    const order=(await db.query('select public.prepare_checkout($1,$2,$3,$4) as data',payload)).rows[0].data;
    assert.equal(order.amount,250000);
    assert.equal(order.created,true);
    assert.equal(order.transfers[0].amount,250000);
    assert.equal((await db.query('select stock from public.products')).rows[0].stock,3);
    const retry=(await db.query('select public.prepare_checkout($1,$2,$3,$4) as data',payload)).rows[0].data;
    assert.equal(retry.created,false);
    assert.equal(retry.order_id,order.order_id);
    assert.equal((await db.query('select stock from public.products')).rows[0].stock,3);
    await assert.rejects(()=>db.query('select public.prepare_checkout($1,$2,$3,$4)',[user,crypto.randomUUID(),JSON.stringify([{product_id:product,quantity:4}]),'{}']),/Not enough stock/);
    assert.equal((await db.query('select stock from public.products')).rows[0].stock,3);
    await db.query(`update public.orders set provider_order_id='order_test',status='pending_payment' where id=$1`,[order.order_id]);
    await assert.rejects(()=>db.query(`select public.confirm_payment('order_test','pay_test',1,'event_wrong')`),/amount mismatch/);
    await db.exec(`select public.confirm_payment('order_test','pay_test',250000,'event_test'); select public.confirm_payment('order_test','pay_test',250000,'event_test');`);
    assert.equal((await db.query('select status from public.orders')).rows[0].status,'paid');
    assert.equal((await db.query('select count(*)::integer as count from public.payment_events')).rows[0].count,1);
    await db.exec(`update public.orders set status='shipped'; select public.confirm_payment('order_test','pay_test',250000,'event_retry')`);
    assert.equal((await db.query('select status from public.orders')).rows[0].status,'shipped');
    await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${other}'`);
    assert.equal((await db.query('select * from public.orders')).rows.length,0);
    assert.equal((await db.query('select * from public.order_items')).rows.length,0);
    assert.equal((await db.query('select * from public.carts')).rows.length,0);
    await assert.rejects(()=>db.query('select * from public.maker_payment_accounts'),/permission denied/);
    await assert.rejects(()=>db.query(`update public.products set price_paise=1`),/permission denied/);
    await db.exec('reset role; set role anon');
    assert.equal((await db.query('select * from public.products')).rows.length,1);
    await assert.rejects(()=>db.query('select * from public.newsletter_subscribers'),/permission denied/);
    await db.exec(`insert into public.newsletter_subscribers(email) values('test@example.com');`);
    await assert.rejects(()=>db.exec(`insert into public.newsletter_subscribers(email) values('TEST@example.com')`),/duplicate key/);
    await db.exec('reset role');
    // Definitive provider rejection returns stock exactly once.
    const second=(await db.query('select public.prepare_checkout($1,$2,$3,$4) as data',[user,crypto.randomUUID(),JSON.stringify([{product_id:product,quantity:1}]),'{}'])).rows[0].data;
    await db.query('select public.cancel_uncreated_checkout($1)',[second.order_id]);
    await db.query('select public.cancel_uncreated_checkout($1)',[second.order_id]);
    assert.equal((await db.query('select stock from public.products')).rows[0].stock,3);
    // Apply real content seed, too: quotes, HTML and Hindi must remain valid SQL.
    await db.exec(await readFile(new URL('../supabase/sql/02-content.sql',import.meta.url),'utf8'));
    assert.equal((await db.query('select count(*)::integer as count from public.journal_posts')).rows[0].count,4);
  }finally{await db.close();}
});
