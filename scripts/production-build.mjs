import {spawnSync} from 'node:child_process';
const url=process.env.VITE_SUPABASE_URL || '',key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)||!key.startsWith('sb_publishable_'))throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the hosting build environment. Never use a secret/service-role key.');
for(const args of [['run','build'],['run','check:security']]){
 const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',args,{stdio:'inherit',shell:process.platform==='win32'});
 if(result.status!==0)process.exit(result.status || 1);
}
