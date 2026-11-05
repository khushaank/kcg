import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const configured = /^https:\/\//.test(url) && !url.includes('YOUR-') && key.length > 20 && !key.includes('YOUR_');
export const db = configured ? createClient(url, key) : null;
// Published pages must not wait for a customer's persisted Auth session to refresh.
export const contentDb = configured ? createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'kcg-public-content'}}) : null;
export async function result(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export async function submitPublicForm(body){
 const {data,error}=await db.functions.invoke('submit-public-form',{body});
 if(error){let message='Please try again later or contact the foundation.';try{message=(await error.context.json()).error || message;}catch{}throw new Error(message);}
 if(!data?.ok)throw new Error('Your submission could not be saved.');
 return data;
}
export async function checkout(payload) {
  const { data, error } = await db.functions.invoke('create-checkout', { body: payload });
  if (error) {
    let message = 'Checkout could not be started. Please retry or contact us.';
    try { message = (await error.context.json()).error || message; } catch { /* Network failures have no response body. */ }
    throw new Error(message);
  }
  if (data.error) throw new Error(data.error);
  return data;
}
