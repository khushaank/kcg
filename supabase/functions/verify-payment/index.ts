import { cors, database, env, json, razorpay, user, validHmac,readBody,quota,HttpError } from '../_shared/http.ts';

Deno.serve(async (req: Request) => {
  let headers: Record<string,string> = {};
  try {
    headers=cors(req);
    if(req.method==='OPTIONS') return new Response('ok',{headers});
    if(req.method!=='POST') return json({error:'Method not allowed'},405,headers);
    const customer=await user(req);
    const text=await readBody(req,4000);
    await quota('verify-minute:'+customer.id,10,60);
    const body=JSON.parse(text);
    if(!/^[a-f0-9-]{36}$/i.test(body.order_id) || !/^pay_[A-Za-z0-9]+$/.test(body.razorpay_payment_id))return json({error:'Invalid payment reference'},400,headers);
    const [order]=await database(`orders?id=eq.${encodeURIComponent(body.order_id)}&user_id=eq.${customer.id}&select=id,provider_order_id,total_paise`);
    if(!order || body.razorpay_order_id!==order.provider_order_id)return json({error:'Order not found'},404,headers);
    if(!await validHmac(env('RAZORPAY_KEY_SECRET'),`${order.provider_order_id}|${body.razorpay_payment_id}`,body.razorpay_signature || ''))return json({error:'Invalid payment signature'},400,headers);
    const response=await razorpay(`payments/${body.razorpay_payment_id}`);
    if(!response.ok)throw new Error('Provider verification failed');
    const payment=await response.json();
    if(payment.status!=='captured' || payment.currency!=='INR' || payment.amount!==order.total_paise || payment.order_id!==order.provider_order_id)return json({paid:false},202,headers);
    await database('rpc/confirm_payment',{method:'POST',body:JSON.stringify({p_provider_order_id:payment.order_id,p_payment_id:payment.id,p_amount:payment.amount,p_event_id:`verify:${payment.id}`})});
    return json({paid:true},200,headers);
  }catch(error){if(error instanceof HttpError)return json({error:error.message},error.status,headers);console.error('Verification error:',error instanceof Error?error.message:'unknown');return json({error:'Payment verification is pending. Please do not pay again; check your account.'},400,headers);}
});
