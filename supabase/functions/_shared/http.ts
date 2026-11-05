export const env = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing server configuration: ${key}`);
  return value;
};
export class HttpError extends Error {
 status:number;
 constructor(status:number,message:string){super(message);this.status=status;}
}
export async function readBody(req:Request,maxBytes:number){
 const declared=Number(req.headers.get('content-length'));
 if(declared>maxBytes)throw new HttpError(413,'Request too large');
 if(!req.body)return '';
 const reader=req.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let size=0,text='';
 try{
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new HttpError(413,'Request too large');}text+=decoder.decode(value,{stream:true});}
  return text+decoder.decode();
 }finally{reader.releaseLock();}
}
export async function quota(subject:string,limit:number,seconds:number){
 const allowed=await database('rpc/kcg_consume_quota',{method:'POST',body:JSON.stringify({p_subject:subject,p_limit:limit,p_seconds:seconds})});
 if(allowed!==true)throw new HttpError(429,'Too many requests. Please wait before trying again.');
}
export function cors(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed = env('ALLOWED_ORIGINS').split(',').map(s => s.trim());
  if (origin && !allowed.includes(origin)) throw new HttpError(403,'Origin not allowed');
  return { 'Access-Control-Allow-Origin': origin || allowed[0], 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
}
export const json = (value: unknown, status = 200, headers: Record<string,string> = {}) => new Response(JSON.stringify(value), { status, headers: { ...headers, 'content-type': 'application/json', 'cache-control': 'no-store' } });
export async function database(path: string, options: RequestInit = {}) {
  const response = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, { signal:AbortSignal.timeout(15000), ...options, headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Database request failed');
  return data;
}
export async function user(req: Request) {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new HttpError(401,'Please sign in to continue');
  const response = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { signal:AbortSignal.timeout(15000),headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: authorization } });
  if (!response.ok) throw new HttpError(401,'Please sign in again');
  const data = await response.json();
  if (!data.id || data.is_anonymous || !data.email_confirmed_at) throw new HttpError(401,'Please verify your email first');
  return data;
}
export async function razorpay(path: string, options: RequestInit = {}) {
  return fetch(`https://api.razorpay.com/v1/${path}`, { signal:AbortSignal.timeout(15000),...options, headers: { Authorization: `Basic ${btoa(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`)}`, 'Content-Type': 'application/json', ...options.headers } });
}
export async function validHmac(secret: string, payload: string, signature: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
  const bytes = new Uint8Array(signature.match(/.{2}/g)!.map(hex=>parseInt(hex,16)));
  return crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(payload));
}
