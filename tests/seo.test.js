import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prerenderPage} from '../scripts/prerender.mjs';
import {foundationDefaults,foundationGalleryDefaults} from '../src/content.js';
import {pageSeo,canonicalUrl,organizationSchema,sitemapXml} from '../src/seo.js';

test('public pages contain meaningful initial HTML and private pages are not prerendered',()=>{
 const snapshot={site:foundationDefaults,posts:[],galleryItems:foundationGalleryDefaults,makers:[],products:[]};
 for(const page of ['index','about','mission','programs','contact','donate','volunteer','privacy','terms','gallery','makers','blog','shop']){
  const html=prerenderPage(page,snapshot);assert.ok(html.includes('<h1>'),page+' needs an initial heading');
  assert.ok(html.includes('id="main"'));assert.ok(html.includes('id="public-snapshot"'));
  const data=html.match(/<script type="application\/json" id="public-snapshot">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(data).site.name,'KCG Foundation');
 }
 assert.equal(prerenderPage('account',snapshot),null);assert.equal(prerenderPage('checkout',snapshot),null);
 assert.ok(canonicalUrl('index').endsWith('/'));assert.equal(canonicalUrl('mission'),canonicalUrl('about'));
 assert.equal(organizationSchema(foundationDefaults).url,'https://kcg.b2bindustrial.in/');
 for(const [page,[title,description]] of Object.entries(pageSeo)){assert.ok(title.includes('KCG Foundation'));assert.ok(description.length>60,page);}
 const sitemap=sitemapXml({products:[{slug:'a & b'}],posts:[{slug:'our-story'}],makers:[{id:'maker-id'}]});
 assert.ok(sitemap.includes('product.html?piece=a+%26+b'));assert.ok(sitemap.includes('blog.html?story=our-story'));
 assert.ok(!sitemap.includes('/account.html'));assert.ok(!sitemap.includes('/index.html'));assert.ok(!sitemap.includes('/mission.html'));
});
