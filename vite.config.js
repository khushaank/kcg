import { defineConfig,loadEnv } from 'vite';
import { readdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {securityHeaders,hostingHeaderFiles} from './scripts/security-headers.js';
import {readPublicSnapshot,prerenderPage} from './scripts/prerender.mjs';
import {pageSeo,canonicalUrl,organizationSchema,SITE_ORIGIN} from './src/seo.js';
import {deliveredImage} from './src/image-delivery.js';

export default defineConfig(({mode,command})=>{
 const values=loadEnv(mode,process.cwd(),'VITE_');
 const {VITE_SUPABASE_URL='',VITE_SUPABASE_PUBLISHABLE_KEY=''}=values;
 for(const [key,value] of Object.entries(values)){
  if(/SECRET|SERVICE_ROLE|PASSWORD|PRIVATE/i.test(key)||value.startsWith('sb_secret_'))throw new Error('Private credentials must never be supplied through VITE_ variables: '+key);
 }
 try{if(JSON.parse(Buffer.from(VITE_SUPABASE_PUBLISHABLE_KEY.split('.')[1] || '','base64url')).role==='service_role')throw new Error('A service-role key cannot be used as the browser publishable key.');}catch(error){if(error.message?.includes('service-role'))throw error;}
 const middleware=dev=>(server)=>{server.middlewares.use((req,res,next)=>{for(const [key,value] of Object.entries(securityHeaders(req.url?.split('?')[0] || '/',VITE_SUPABASE_URL,{dev,https:false})))res.setHeader(key,value);next();});};
 let snapshot;
 return {
  plugins:[{name:'kcg-security-headers',configureServer:middleware(true),configurePreviewServer:middleware(false),async transformIndexHtml(html,context){
   const page=context.path.split('/').pop().replace('.html','') || 'index';
   const info=pageSeo[page],canonical=canonicalUrl(page);
   if(info){html=html.replace(/<title>[^<]*<\/title>/,'<title>'+info[0]+'</title>').replace(/<meta name="description"[^>]*>/,'<meta name="description" content="'+info[1]+'">');
    html=html.replace(/\s*<link rel="canonical"[^>]*>/g,'').replace(/\s*<meta property="og:(?:title|description|url|image)"[^>]*>/g,'');
    html=html.replace('</head>',`<link rel="canonical" href="${canonical}"><meta property="og:title" content="${info[0]}"><meta property="og:description" content="${info[1]}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${SITE_ORIGIN}/images/rural-learning-illustration.jpg"><meta name="twitter:card" content="summary_large_image"><meta name="robots" content="index,follow,max-image-preview:large"></head>`);
   }
   html=html.replace(/\s*<link rel="preconnect"[^>]*>/g,'').replaceAll('href="/favicon.png"','href="/favicon-32.png"');
   html=html.replace('</head>','<link rel="preload" href="/fonts/dm-sans-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="apple-touch-icon" href="/favicon-180.png"></head>');
   if(command==='build'&&info){
    snapshot ||= readPublicSnapshot(VITE_SUPABASE_URL,VITE_SUPABASE_PUBLISHABLE_KEY);
    const data=await snapshot,body=prerenderPage(page,data);
    if(body)html=html.replace('<div id="app"></div>',body).replace(/<noscript>[\s\S]*?<\/noscript>/,'');
    if(page==='index')html=html.replace('</head>','<script type="application/ld+json">'+JSON.stringify(organizationSchema(data.site)).replace(/</g,'\\u003c')+'</script></head>');
    if(page==='index')html=html.replace('</head>','<link rel="preload" as="image" href="'+deliveredImage(data.site.hero_image)+'" fetchpriority="high"></head>');
   }
   if(page==='product')html=html.replace(/<link rel="canonical"[^>]*>/g,'');
   if(!info&&['account','checkout','404'].includes(page))html=html.replace('</head>','<meta name="robots" content="noindex,follow"></head>');
   return html;
  },closeBundle(){if(command!=='build')return;const files=hostingHeaderFiles(VITE_SUPABASE_URL);writeFileSync(resolve('dist/_headers'),files.headers);writeFileSync(resolve('dist/.htaccess'),files.apache);}}],
  server: { fs: { deny: ['**/.env*','**/*.{crt,pem,key}','**/.secrets*','**/.git/**','**/.aws/**','**/.codex/**','**/.agents/**','**/artifacts/**','**/media-inbox/**','**/supabase/**'] } },
  build: { rollupOptions: { input: Object.fromEntries(readdirSync('.').filter(f => f.endsWith('.html')).map(f => [f.replace('.html', ''), resolve(f)])) } },
 };
});
