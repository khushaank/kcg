import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

test('Edge Functions authenticate checkout, allocate transfers and verify captured payments',async()=>{
  const realFetch=globalThis.fetch, previousDeno=globalThis.Deno;
  const config={SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-server-only',ALLOWED_ORIGINS:'https://shop.test',RAZORPAY_KEY_ID:'rzp_test_key',RAZORPAY_KEY_SECRET:'test-private',RAZORPAY_WEBHOOK_SECRET:'test-webhook'};
  let handler, calls=[], verified=false, allowUser=true;
  const orderId='11111111-1111-4111-8111-111111111111';
  const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
  globalThis.Deno={env:{get:key=>config[key]},serve:fn=>{handler=fn;}};
  globalThis.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes('/rpc/kcg_consume_quota'))return response(true);
    if(String(url).endsWith('/auth/v1/user'))return allowUser ? response({id:'22222222-2222-4222-8222-222222222222',email_confirmed_at:'2026-01-01',is_anonymous:false}) : response({},401);
    if(String(url).includes('/rpc/prepare_checkout'))return response({created:true,order_id:orderId,amount:250000,transfers:[{account:'acc_test',amount:250000,currency:'INR',on_hold:false}]});
    if(String(url)==='https://api.razorpay.com/v1/orders')return response({id:'order_test',amount:250000,currency:'INR'});
    if(String(url).includes('/rest/v1/orders?') && options.method==='PATCH')return response([{id:orderId}]);
    if(String(url).includes('/rest/v1/orders?'))return response([{id:orderId,status:'pending_payment',provider_order_id:'order_test',total_paise:250000,shipping:{name:'Test Customer'}}]);
    if(String(url)==='https://api.razorpay.com/v1/payments/pay_test')return response({id:'pay_test',order_id:'order_test',status:'captured',amount:250000,currency:'INR'});
    if(String(url).includes('/rpc/confirm_payment')){verified=true;return response(orderId);}
    throw new Error('Unexpected request: '+url);
  };
  const request=body=>new Request('https://test.supabase.co/functions/v1/test',{method:'POST',headers:{origin:'https://shop.test',authorization:'Bearer user-test-token','content-type':'application/json'},body:JSON.stringify(body)});
  try{
    await import('../supabase/functions/create-checkout/index.ts');
    const checkoutHandler=handler;
    const body={idempotency_key:crypto.randomUUID(),items:[{product_id:'33333333-3333-4333-8333-333333333333',quantity:2}],shipping:{name:'Test Customer',phone:'9899702065',pincode:'110001',address:'Test delivery address',city:'Delhi',state:'Delhi'}};
    const created=await checkoutHandler(request(body));
    assert.equal(created.status,200);
    assert.equal((await created.json()).razorpay_order_id,'order_test');
    const providerBody=JSON.parse(calls.find(c=>c.url==='https://api.razorpay.com/v1/orders').options.body);
    assert.equal(providerBody.amount,250000);
    assert.equal(providerBody.transfers[0].amount,250000);
    assert.equal(providerBody.transfers[0].account,'acc_test');
    calls=[];
    const resumed=await checkoutHandler(request({resume_order_id:orderId}));
    assert.equal(resumed.status,200);
    assert.equal((await resumed.json()).razorpay_order_id,'order_test');
    assert.equal(calls.some(c=>c.url.includes('/rpc/prepare_checkout')),false,'continuing payment must not reserve stock again');
    calls=[];allowUser=false;
    assert.equal((await checkoutHandler(request(body))).status,401);
    assert.equal(calls.length,1,'unauthenticated requests must never call privileged database APIs');
    allowUser=true;
    await import('../supabase/functions/verify-payment/index.ts');
    const verifyHandler=handler;
    const signature=createHmac('sha256',config.RAZORPAY_KEY_SECRET).update('order_test|pay_test').digest('hex');
    const verifiedResponse=await verifyHandler(request({order_id:orderId,razorpay_order_id:'order_test',razorpay_payment_id:'pay_test',razorpay_signature:signature}));
    assert.equal((await verifiedResponse.json()).paid,true);
    assert.equal(verified,true);
    verified=false;
    assert.equal((await verifyHandler(request({order_id:orderId,razorpay_order_id:'order_test',razorpay_payment_id:'pay_test',razorpay_signature:'0'.repeat(64)}))).status,400);
    assert.equal(verified,false);
    await import('../supabase/functions/payment-webhook/index.ts');
    const webhookHandler=handler;
    const event=JSON.stringify({event:'payment.captured',payload:{payment:{entity:{id:'pay_test',order_id:'order_test',status:'captured',currency:'INR',amount:250000}}}});
    const webhookSignature=createHmac('sha256',config.RAZORPAY_WEBHOOK_SECRET).update(event).digest('hex');
    const webhook=await webhookHandler(new Request('https://test.supabase.co/webhook',{method:'POST',headers:{'x-razorpay-signature':webhookSignature,'x-razorpay-event-id':'evt_test'},body:event}));
    assert.equal(webhook.status,200);
    assert.equal(verified,true);
    verified=false;
    assert.equal((await webhookHandler(new Request('https://test.supabase.co/webhook',{method:'POST',headers:{'x-razorpay-signature':'0'.repeat(64),'x-razorpay-event-id':'evt_bad'},body:event}))).status,401);
    assert.equal(verified,false);
  }finally{globalThis.fetch=realFetch;globalThis.Deno=previousDeno;}
});
