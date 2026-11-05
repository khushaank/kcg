import {createClient} from '@supabase/supabase-js';
import {STAFF_AUTH_OPTIONS} from './staff-access.js';
import {boundedFetch} from './reliability.js';

const url=import.meta.env.VITE_SUPABASE_URL || '';
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const configured=/^https:\/\//.test(url) && !url.includes('YOUR-') && key.length>20 && !key.includes('YOUR_');
export const db=configured ? createClient(url,key,{auth:STAFF_AUTH_OPTIONS,global:{fetch:(input,options)=>boundedFetch(input,options,(input instanceof Request?input.url:String(input)).includes('/storage/v1/object/')?120000:20000)}}) : null;
export async function result(query){const {data,error}=await query;if(error)throw error;return data;}
