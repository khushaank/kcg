import {readdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const files=await readdir('dist',{recursive:true});
for(const file of files){
 assert.ok(!/(^|[/\\])(?:\.env(?:\.|$)|\.git|supabase|media-inbox|node_modules)(?:[/\\]|$)/.test(file),'Private file in build: '+file);
 if(!/\.(?:js|html)$/.test(file))continue;
 const source=await readFile('dist/'+file,'utf8');
 assert.ok(!/\beval\s*\(|\bnew\s+Function\s*\(/.test(source),'Arbitrary code evaluation in '+file);
 assert.ok(!/addEventListener\s*\(\s*['"]unload['"]/.test(source),'Deprecated unload listener in '+file);
 assert.ok(!/sb_secret_[A-Za-z0-9_-]+/.test(source),'Private Supabase key in '+file);
 assert.ok(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source),'Private key in '+file);
 if(file.endsWith('.html'))for(const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!match[2].trim())continue;
  assert.ok(/type="application\/(?:ld\+)?json"/.test(match[1]),'Inline executable script in '+file);
  JSON.parse(match[2]);
 }
}
const headers=await readFile('dist/_headers','utf8');
assert.ok(headers.includes("script-src 'self'"));
assert.ok(!headers.includes('unsafe-eval'));
assert.ok(headers.includes("frame-ancestors 'none'"));
assert.ok(headers.includes('unload=()'));
console.log('Production security checks passed: no eval, unload handlers, inline scripts or private build files; restrictive headers included.');
