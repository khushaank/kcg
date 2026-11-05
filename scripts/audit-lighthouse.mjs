import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
const args=process.argv.slice(2),target=args.find(a=>!a.startsWith('--')) || 'http://127.0.0.1:4173/';
const base=new URL(target);if(!['http:','https:'].includes(base.protocol))throw new Error('Supply an HTTP(S) website URL.');
const desktop=args.includes('--desktop'),all=args.includes('--all');
const pages=all?['','about.html','programs.html','blog.html','gallery.html','contact.html','volunteer.html','donate.html','shop.html','makers.html','privacy.html','terms.html']:[null];
mkdirSync('artifacts/lighthouse',{recursive:true});
const env={...process.env};
if(!env.CHROME_PATH&&process.platform==='win32'){
 const directory='artifacts/browsers/chrome-headless-shell';
 const bundled=existsSync(directory)?readdirSync(directory).filter(v=>v.startsWith('win64-')).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})).map(v=>resolve(directory,v,'chrome-headless-shell-win64/chrome-headless-shell.exe')):[];
 env.CHROME_PATH=[...bundled,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
}
const summary=[];
for(const page of pages){
 const url=page===null?base:new URL('/'+page,base),label=(url.pathname==='/'?'home':url.pathname.replace(/[^a-z0-9-]/gi,'-').replace(/^-|-$/g,''))+(desktop?'-desktop':'-mobile');
 const output=resolve('artifacts/lighthouse',label);
 const flags=[resolve('node_modules/lighthouse/cli/index.js'),url.href,'--output=json','--output=html','--output-path='+output,'--chrome-flags=--headless=new --disable-extensions --no-first-run --disable-gpu','--only-categories=performance,accessibility,best-practices,seo','--quiet',...(desktop?['--preset=desktop']:[])];
 const code=await new Promise((done,reject)=>{const child=spawn(process.execPath,flags,{env,stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('close',done);});
 if(code!==0)throw new Error('Lighthouse failed for '+url.href);
 const report=JSON.parse(readFileSync(output+'.report.json','utf8'));
 if(report.runtimeError)throw new Error(report.runtimeError.message);
 const scores=Object.fromEntries(Object.entries(report.categories).map(([k,v])=>[k,Math.round(v.score*100)]));
 const row={url:url.href,mode:desktop?'desktop':'mobile',lighthouseVersion:report.lighthouseVersion,scores,report:output+'.report.html'};summary.push(row);console.log(JSON.stringify(row));
}
writeFileSync('artifacts/lighthouse/summary-'+(desktop?'desktop':'mobile')+'.json',JSON.stringify(summary,null,2));
