import {readFile} from 'node:fs/promises';
import {foundationDefaults,foundationGalleryDefaults,mergeFoundation} from '../src/content.js';
import {foundationHome,foundationStory,foundationPrograms,makerDirectory} from '../src/experience.js';
import {siteHeader,siteFooter,contactPage,legalPage,galleryPage,journalCard,collectionPage} from '../src/public-pages.js';
import {icon,esc,link,sectionHead} from '../src/ui.js';
import {deliveredImage,withResponsiveImages,prioritizeLeadImage} from '../src/image-delivery.js';
import {money} from '../src/cart.js';

const fields='id,slug,title,date,category,readingTime,featuredImage';
export async function readPublicSnapshot(url,key){
 const fallbackPosts=JSON.parse(await readFile('public/blog-posts.json','utf8')).map(p=>Object.fromEntries(fields.split(',').map(k=>[k,p[k]])));
 const read=async(table,query,fallback)=>{
  if(!url||!key)return fallback;
  try{const response=await fetch(url+'/rest/v1/'+table+'?'+query,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(5000)});if(!response.ok)return fallback;return await response.json();}catch{return fallback;}
 };
 const [foundation,posts,gallery,makers,products]=await Promise.all([
  read('site_content','select=value&key=eq.foundation',[]),
  read('journal_posts','select='+fields+'&published=eq.true&order=created_at.desc&limit=1000',fallbackPosts),
  read('gallery_items','select=*&published=eq.true&order=sort_order&limit=1000',foundationGalleryDefaults),
  read('makers','select=id,name,craft,location,image,portrait_url,quote&published=eq.true&order=name&limit=1000',[]),
  read('products','select=id,maker_id,slug,title,subtitle,category,price_paise,image,materials,tag,stock,sort_order,origin&published=eq.true&order=sort_order&limit=1000',[]),
 ]);
 return {site:mergeFoundation(foundation[0]?.value || foundationDefaults),posts,galleryItems:gallery,makers,products,session:null};
}
export function prerenderPage(page,snapshot){
 const imageUrl=value=>esc(deliveredImage(value) || '/images/image-placeholder.svg');
 const c={...snapshot,page,esc,imageUrl,icon,link,sectionHead,money,productHref:p=>'product.html?piece='+encodeURIComponent(p.slug),makerHref:m=>'makers.html?maker='+encodeURIComponent(m.id),previewNote:()=>'',card:()=>''};
 c.postCard=p=>journalCard(p,{imageUrl});
 const collection=()=>collectionPage({...c,activeCategory:'All pieces',search:''}).replace('<div class="product-grid" id="shop-results"></div>','<div class="product-grid" id="shop-results">'+(snapshot.products.map(p=>'<article class="product-card"><a href="'+c.productHref(p)+'"><img src="'+imageUrl(p.image)+'" alt="'+esc(p.title)+'" loading="lazy"><h2>'+esc(p.title)+'</h2></a><p>'+money(p.price_paise)+'</p></article>').join('') || '<div class="empty-state"><h2>Our maker collection is being prepared.</h2><p>We’ll share each maker’s work here once their story, making film and products are ready.</p><a class="text-link" href="contact.html">Talk to our team ↗</a></div>')+'</div>');
 const renderers={index:()=>foundationHome(c),about:()=>foundationStory(c),mission:()=>foundationStory(c),programs:()=>foundationPrograms(c),contact:()=>contactPage(c),donate:()=>contactPage(c),volunteer:()=>contactPage(c),privacy:()=>legalPage(c),terms:()=>legalPage(c),gallery:()=>galleryPage(c),makers:()=>makerDirectory(c),blog:()=>'<section class="page-intro"><span class="eyebrow">THE KCG JOURNAL</span><h1>A little more <em>good.</em></h1><p>Stories from our work and community in Haryana.</p></section><section class="section"><h2 class="sr-only">Community stories</h2><div class="journal-grid">'+snapshot.posts.map(c.postCard).join('')+'</div></section>'};
 renderers.shop=collection;
 if(!renderers[page])return null;
 const model={site:snapshot.site,posts:['index','blog'].includes(page)?snapshot.posts.slice(0,page==='index'?3:1000):[],galleryItems:page==='gallery'?snapshot.galleryItems:foundationGalleryDefaults,makers:['makers','shop'].includes(page)?snapshot.makers:[],products:page==='shop'?snapshot.products:[]};
 const json=JSON.stringify(model).replace(/</g,'\\u003c');
 const content=renderers[page]();
 return withResponsiveImages('<div id="app" data-prerendered="true">'+siteHeader(c)+'<main id="main">'+(['programs','blog','gallery'].includes(page)?prioritizeLeadImage(content):content)+'</main>'+siteFooter(c)+'</div><script type="application/json" id="public-snapshot">'+json+'</script>');
}
