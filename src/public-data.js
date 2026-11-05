import {foundationGalleryDefaults,mergeFoundation} from './content.js';

// Public content only. Private sessions/orders are never cached across page loads.
export async function loadPublicData(db,page,params=new URLSearchParams(),customerAuth=db.auth,previous={}){
 const commerce=['shop','product','makers','checkout','account'].includes(page);
 const read=async query=>{const {data,error}=await query.abortSignal(AbortSignal.timeout(8000));if(error)throw error;return data;};
 const session=async()=>{
  let timer;
  try{return await Promise.race([customerAuth.getSession(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Account verification timed out')),10000);})]);}
  finally{clearTimeout(timer);}
 };
 const detail=page==='product'&&params.get('piece')?read(db.from('products').select('*').eq('published',true).eq('slug',params.get('piece')).maybeSingle()):page==='makers'&&params.get('maker')?read(db.from('makers').select('*').eq('published',true).eq('id',params.get('maker')).maybeSingle()):['blog','pulse'].includes(page)&&params.get('story')?read(db.from('journal_posts').select('*').eq('published',true).eq('slug',params.get('story')).maybeSingle()):null;
 const results=await Promise.allSettled([
  commerce?read(db.from('makers').select('id,name,craft,location,initials,image,portrait_url,quote').eq('published',true).order('name')):[],
  commerce?read(db.from('products').select('id,maker_id,slug,title,subtitle,category,price_paise,image,materials,tag,stock,sort_order,origin').eq('published',true).order('sort_order')):[],
  ['index','blog','pulse'].includes(page)?read(db.from('journal_posts').select('id,slug,title,date,category,readingTime,featuredImage').eq('published',true).order('created_at',{ascending:false}).limit(page==='index'?3:1000)):[],
  read(db.from('site_content').select('value').eq('key','foundation').maybeSingle()),
  page==='gallery'?read(db.from('gallery_items').select('*').eq('published',true).order('sort_order')):foundationGalleryDefaults,
  commerce?session():null,
  detail,
 ]);
 const value=(i,fallback)=>results[i].status==='fulfilled'?(results[i].value??fallback):fallback;
 const snapshot={makers:value(0,previous.makers || []),products:value(1,previous.products || []),posts:value(2,previous.posts || []),site:mergeFoundation(results[3].status==='rejected'?previous.site:value(3,null)?.value),galleryItems:value(4,previous.galleryItems || foundationGalleryDefaults),session:value(5,null)?.data?.session || null,catalogError:'',pageError:''};
 if(commerce&&(results[0].status==='rejected'||results[1].status==='rejected'))snapshot.catalogError='We couldn’t load the collection. Your saved bag has been kept. Please refresh or contact our team.';
 if((results[5].status==='rejected'||value(5,null)?.error)&&['account','checkout'].includes(page))snapshot.pageError='We couldn’t verify your account. Please refresh and try again.';
 if(results[2].status==='rejected'&&['blog','pulse'].includes(page))snapshot.pageError='We couldn’t load the journal. Please refresh and try again.';
 if(results[6].status==='rejected')snapshot.pageError='We couldn’t load this page’s details. Please refresh and try again.';
 const selected=value(6,null);
 if(selected){
  if(page==='product'){
   snapshot.products=snapshot.products.filter(p=>p.id!==selected.id).concat(selected);
   try{const maker=await read(db.from('makers').select('*').eq('published',true).eq('id',selected.maker_id).maybeSingle());if(maker)snapshot.makers=snapshot.makers.filter(m=>m.id!==maker.id).concat(maker);}
   catch{snapshot.pageError='We couldn’t load the maker’s story. Please refresh and try again.';}
  }else if(page==='makers')snapshot.makers=snapshot.makers.filter(m=>m.id!==selected.id).concat(selected);
  else snapshot.posts=snapshot.posts.filter(p=>p.id!==selected.id).concat(selected);
 }
 return snapshot;
}
