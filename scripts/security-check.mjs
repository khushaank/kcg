import {readdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const files=await readdir('dist',{recursive:true});
assert.ok(!files.includes('_headers')&&!files.includes('.htaccess'),'Unused host-specific configuration in GitHub Pages build');
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
 if(file.endsWith('.html')){
  assert.ok(source.includes('http-equiv="Content-Security-Policy"'),'Missing GitHub Pages content policy in '+file);
  assert.ok(source.includes("script-src 'self'"),'Missing script restriction in '+file);
 }
}
assert.equal((await readFile('dist/CNAME','utf8')).trim(),'kcg.b2bindustrial.in');
console.log('Production security checks passed: no eval, unload handlers, inline executable scripts or private build files; page-level CSP and GitHub Pages domain included.');
