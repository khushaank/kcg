import {cors,database,json,quota,readBody,HttpError} from '../_shared/http.ts';
const topics=new Set(['Volunteering','Donation enquiry','General enquiry','Order support','Maker partnership','Program support','Corporate partnership']);
Deno.serve(async(req:Request)=>{
 let headers:Record<string,string>={};
 try{
  headers=cors(req);
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return json({error:'Method not allowed'},405,headers);
  const body=JSON.parse(await readBody(req,16000));
  if(body.website)return json({ok:true},200,headers);
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'Enter a valid email address.');
  if(!['enquiry','newsletter'].includes(body.kind))throw new HttpError(400,'Invalid form.');
  let payload:Record<string,unknown>={email};
  if(body.kind==='enquiry'){
   const name=typeof body.name==='string'?body.name.trim():'',message=typeof body.message==='string'?body.message.trim():'';
   if(!name||name.length>120||message.length<10||message.length>4000||!topics.has(body.topic))throw new HttpError(400,'Please check your name, topic and message.');
   const amount=body.amount_paise??null;
   if(amount!==null&&(!Number.isSafeInteger(amount)||amount<100||amount>1000000000))throw new HttpError(400,'Please check the contribution amount.');
   payload={...payload,name,message,topic:body.topic,amount_paise:amount};
  }
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  await quota('public-minute',30,60);
  await quota('public-hour',500,3600);
  await quota(body.kind+':'+hash,3,3600);
  await database(body.kind==='enquiry'?'enquiries':'newsletter_subscribers',{method:'POST',body:JSON.stringify(payload)});
  return json({ok:true},200,headers);
 }catch(error){
  if(error instanceof HttpError)return json({error:error.message},error.status,headers);
  return json({error:'We could not save this submission. It may already be on file; please retry later or contact the foundation.'},400,headers);
 }
});
