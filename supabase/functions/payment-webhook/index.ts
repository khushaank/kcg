import { database, env, json, validHmac,readBody,HttpError } from '../_shared/http.ts';

Deno.serve(async (req: Request) => {
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const raw=await readBody(req,1000000);
    if(!await validHmac(env('RAZORPAY_WEBHOOK_SECRET'),raw,req.headers.get('x-razorpay-signature') || ''))return json({error:'Invalid signature'},401);
    const event=JSON.parse(raw), eventId=req.headers.get('x-razorpay-event-id');
    if(!eventId||eventId.length>200)return json({error:'Invalid event identifier'},400);
    if(event.event==='payment.captured' || event.event==='order.paid'){
      const payment=event.payload?.payment?.entity;
      if(!payment || payment.status!=='captured' || payment.currency!=='INR')return json({error:'Invalid captured payment'},400);
      await database('rpc/confirm_payment',{method:'POST',body:JSON.stringify({p_provider_order_id:payment.order_id,p_payment_id:payment.id,p_amount:payment.amount,p_event_id:eventId})});
    }
    // Do not release reservations on payment.failed: the same provider order
    // may be retried and paid. Refund/transfer settlement is reconciled in Route.
    return json({received:true});
  }catch(error){if(error instanceof HttpError)return json({error:error.message},error.status);console.error('Webhook error:',error instanceof Error?error.message:'unknown');return json({error:'Retry delivery'},500);}
});
