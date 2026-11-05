export const SITE_ORIGIN='https://kcg.b2bindustrial.in';
export const pageSeo={
 index:['KCG Foundation | Education, Nutrition & Community Care in Haryana','KCG Foundation supports children and families in Haryana through education, nutrition and community healthcare. Learn about our work and get involved.'],
 about:['Our Story & Purpose | KCG Foundation, Haryana','Discover the legacy of Late Sh. Kailash Chand Gupta and KCG Foundation’s work for education, wellbeing and dignity in Haryana.'],
 programs:['Our Programs in Haryana | KCG Foundation','Explore KCG Foundation’s education support, nutrition initiatives, community health camps and welfare programs for children and families in Haryana.'],
 blog:['Community Stories & Updates | KCG Foundation','Read KCG Foundation stories about education, nutrition, scholarships and community healthcare in Haryana.'],
 shop:['Handmade Maker Collection | KCG Foundation','Meet the people behind handmade pieces. Discover their making films, craft traditions and stories in the KCG Foundation maker collection.'],
 product:['Handmade Piece & Maker Story | KCG Foundation','Discover the maker, making film, craft process, materials and cultural origins behind a handmade piece in the KCG Foundation collection.'],
 makers:['Meet the Makers | KCG Foundation','Discover the people, skills and cultural traditions behind the KCG Foundation maker collection.'],
 contact:['Contact KCG Foundation | Haryana, India','Contact KCG Foundation about programs, volunteering, maker partnerships, donations or orders. Find our email and phone details.'],
 volunteer:['Volunteer in Haryana | KCG Foundation','Give your time or skills to KCG Foundation’s education, food support and community healthcare work in Haryana. Enquire about volunteering.'],
 donate:['Support Our Community Work | KCG Foundation','Support KCG Foundation’s education, nutrition and wellbeing programs. Contact us for verified contribution information and ways to help.'],
 gallery:['Community Gallery | KCG Foundation','Explore photographs and clearly labelled illustrations connected with KCG Foundation’s community work in Haryana.'],
 privacy:['Privacy Policy | KCG Foundation','How KCG Foundation handles contact details, account information, orders and newsletter consent.'],
 terms:['Shopping Terms & Policies | KCG Foundation','Read the KCG Foundation maker collection’s shopping, delivery, cancellation and refund terms.'],
};
pageSeo.mission=pageSeo.about;pageSeo.pulse=pageSeo.blog;
export function canonicalUrl(page){return SITE_ORIGIN+(page==='index'?'/':page==='mission'?'/about.html':page==='pulse'?'/blog.html':'/'+page+'.html');}
export function organizationSchema(site){return {'@context':'https://schema.org','@type':'Organization','@id':SITE_ORIGIN+'/#organization',name:'KCG Foundation',url:SITE_ORIGIN+'/',logo:SITE_ORIGIN+'/images/kcg-logo.webp',description:site.mission,email:site.email,telephone:site.phone,address:{'@type':'PostalAddress',addressRegion:'Haryana',addressCountry:'IN'}};}
export function updateDetailSeo({page,params,products,makers,posts}){
 let record=page==='product'?products.find(p=>p.slug===params.get('piece')):page==='makers'&&params.has('maker')?makers.find(m=>m.id===params.get('maker')):page==='blog'&&params.has('story')?posts.find(p=>p.slug===params.get('story')):null;
 if(!record){if(page==='product'||params.has('maker')||params.has('story')){const meta=document.querySelector('meta[name=robots]');if(meta)meta.content='noindex,follow';}return;}
 const title=(record.title || record.name)+' | KCG Foundation';
 const description=(record.description || record.excerpt || record.life_story || record.quote || record.craft || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,160);
 document.title=title;
 const robots=document.querySelector('meta[name=robots]');if(robots)robots.content='index,follow,max-image-preview:large';
 for(const [key,value] of [['description',description],['og:title',title],['og:description',description]]){let el=document.querySelector('meta[name="'+key+'"],meta[property="'+key+'"]');if(!el){el=document.createElement('meta');el.setAttribute(key.startsWith('og:')?'property':'name',key);document.head.append(el);}el.content=value;}
 const url=new URL('/'+page+'.html',SITE_ORIGIN);url.searchParams.set(page==='product'?'piece':page==='makers'?'maker':'story',record.slug || record.id);
 let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}canonical.href=url.href;
}
