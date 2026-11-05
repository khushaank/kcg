import { cors, database, env, json, razorpay, user,readBody,quota,HttpError } from '../_shared/http.ts';

Deno.serve(async (req: Request) => {
  let headers: Record<string,string> = {};
  try {
    headers = cors(req);
    if (req.method === 'OPTIONS') return new Response('ok',{headers});
    if (req.method !== 'POST') return json({error:'Method not allowed'},405,headers);
    const customer = await user(req);
    const text = await readBody(req,16000);
    await quota('checkout-minute:'+customer.id,5,60);
    await quota('checkout-hour:'+customer.id,30,3600);
    const body = JSON.parse(text);
    if (body.resume_order_id) {
      if (!/^[a-f0-9-]{36}$/i.test(body.resume_order_id)) return json({error:'Invalid order reference'},400,headers);
      const [saved] = await database(`orders?id=eq.${body.resume_order_id}&user_id=eq.${customer.id}&select=id,status,total_paise,provider_order_id,shipping`);
      if (!saved || saved.status !== 'pending_payment' || !saved.provider_order_id) return json({error:'This order cannot be resumed. Please check its status in your account.'},409,headers);
      return json({order_id:saved.id,razorpay_order_id:saved.provider_order_id,amount:saved.total_paise,key_id:env('RAZORPAY_KEY_ID'),shipping:saved.shipping},200,headers);
    }
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30 || !body.items.every((i: {product_id:string;quantity:number}) => /^[a-f0-9-]{36}$/i.test(i.product_id) && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 10)) return json({error:'Please check your bag'},400,headers);
    if (!/^[a-f0-9-]{36}$/i.test(body.idempotency_key)) return json({error:'Invalid checkout reference'},400,headers);
    const shipping = body.shipping || {};
    const clean: Record<string,string> = {country:'India'};
    for (const field of ['name','phone','pincode','address','city','state']) {
      if (typeof shipping[field] !== 'string' || !shipping[field].trim() || shipping[field].length > (field === 'address' ? 300 : 120)) return json({error:'Please complete your delivery details'},400,headers);
      clean[field] = shipping[field].trim();
    }
    if (!/^[1-9][0-9]{5}$/.test(clean.pincode) || !/^[+]?[0-9 ()-]{10,18}$/.test(clean.phone)) return json({error:'Please check your PIN code and phone number'},400,headers);
    const order = await database('rpc/prepare_checkout',{method:'POST',body:JSON.stringify({p_user_id:customer.id,p_key:body.idempotency_key,p_items:body.items,p_shipping:clean})});
    if (!order.created) {
      if (order.status !== 'pending_payment' || !order.provider_order_id) return json({error:'This order is being checked or has completed. Please view your account or contact the KCG team.'},409,headers);
      return json({order_id:order.order_id,razorpay_order_id:order.provider_order_id,amount:order.amount,key_id:env('RAZORPAY_KEY_ID')},200,headers);
    }
    let response: Response;
    try {
      response = await razorpay('orders',{method:'POST',body:JSON.stringify({amount:order.amount,currency:'INR',receipt:order.order_id,notes:{kcg_order_id:order.order_id},transfers:order.transfers})});
    } catch {
      await database(`orders?id=eq.${order.order_id}`,{method:'PATCH',body:JSON.stringify({status:'payment_setup_review'})});
      return json({error:'The payment provider took too long. Please contact us before retrying; your order reference is '+order.order_id.slice(0,8).toUpperCase()},502,headers);
    }
    const paymentOrder = await response.json();
    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) await database('rpc/cancel_uncreated_checkout',{method:'POST',body:JSON.stringify({p_order_id:order.order_id})});
      else await database(`orders?id=eq.${order.order_id}`,{method:'PATCH',body:JSON.stringify({status:'payment_setup_review'})});
      return json({error:'Payment is temporarily unavailable. Please contact the KCG team with reference '+order.order_id.slice(0,8).toUpperCase()},502,headers);
    }
    if (!paymentOrder.id || paymentOrder.amount !== order.amount || paymentOrder.currency !== 'INR') throw new Error('Payment provider response needs review');
    await database(`orders?id=eq.${order.order_id}`,{method:'PATCH',body:JSON.stringify({provider_order_id:paymentOrder.id,status:'pending_payment'})});
    return json({order_id:order.order_id,razorpay_order_id:paymentOrder.id,amount:order.amount,key_id:env('RAZORPAY_KEY_ID')},200,headers);
  } catch (error) {
    if(error instanceof HttpError)return json({error:error.message},error.status,headers);
    console.error('Checkout error:',error instanceof Error ? error.message : 'unknown');
    return json({error:'We could not start checkout. Check availability or contact the KCG team.'},400,headers);
  }
});
