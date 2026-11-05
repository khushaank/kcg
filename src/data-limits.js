export const FOUNDATION_NAME = 'KCG Foundation';
export const ENTRY_MAX_BYTES = 192 * 1024;
export const FIELD_LIMITS = Object.freeze({
 name:120,title:160,slug:160,craft:160,location:240,initials:8,story:8000,
 life_story:12000,learning_story:8000,signature_style:8000,cultural_roots:8000,
 quote:1000,subtitle:300,category:100,tag:80,description:6000,significance:8000,
 materials:1000,dimensions:500,care:4000,delivery:2000,origin:300,technique:1000,
 making_time:160,making_video_caption:500,making_video_transcript:20000,
 date:80,readingTime:80,excerpt:1200,content:40000,alt:300,caption:500,
 tagline:200,mission:2000,hero_eyebrow:200,hero_heading:160,hero_emphasis:160,
 hero_description:1200,hero_image_alt:300,email:254,phone:40,footer_summary:1000,
 newsletter_heading:160,razorpay_account_id:80,
});
export const ARRAY_LIMITS = Object.freeze({gallery:3,process_steps:12,programs:12});
export const UPLOAD_LIMITS = Object.freeze({
 image:{bytes:2*1024*1024,label:'2 MB',bucket:'kcg-media',types:['image/jpeg','image/png','image/webp','image/avif']},
 video:{bytes:50*1024*1024,label:'50 MB',bucket:'kcg-films',types:['video/mp4','video/webm']},
 captions:{bytes:256*1024,label:'256 KB',bucket:'kcg-captions',types:['text/vtt']},
});
export function fieldLimit(name){
 const key=name.replace(/^(?:program_|gallery_|step_)/,'').replace(/_\d+$/,'');
 return key==='url'||key==='image'||key==='featuredImage'||key.endsWith('_url')||key.endsWith('_image')||key==='making_video_poster' ? 2048 : FIELD_LIMITS[key] ?? 500;
}
export function entryErrors(kind,record){
 const errors=[];
 if(new TextEncoder().encode(JSON.stringify(record)).length>ENTRY_MAX_BYTES)errors.push('This entry exceeds 192 KB. Shorten the text; upload media as files.');
 function visit(value,path='',depth=0){
  if(depth>5){errors.push('The entry contains too many nested fields.');return;}
  for(const [key,item] of Object.entries(value)){
   const label=path+key;
   if(typeof item==='string'&&[...item].length>fieldLimit(key))errors.push(`${label}: maximum ${fieldLimit(key).toLocaleString()} characters.`);
   if(Array.isArray(item)){
    if(!(key in ARRAY_LIMITS)||item.length>ARRAY_LIMITS[key])errors.push(`${label}: too many entries.`);
    for(const child of item)if(!child||typeof child!=='object'||Array.isArray(child))errors.push(`${label}: invalid entry.`);else visit(child,label+'.',depth+1);
   }else if(item&&typeof item==='object')errors.push(`${label}: use plain text, not a nested object.`);
   else if(typeof item==='boolean'&&!['published','enabled'].includes(key))errors.push(`${label}: use plain text.`);
   else if(typeof item==='number'&&!['stock','price_paise','sort_order'].includes(key))errors.push(`${label}: use plain text.`);
   else if(item===null)errors.push(`${label}: use an empty text field instead of null.`);
  }
 }
 visit(record);
 if(kind==='foundation'&&record.name!==FOUNDATION_NAME)errors.push('The foundation name is locked to KCG Foundation.');
 if(kind==='products'){
  if(!Number.isInteger(record.stock)||record.stock<0||record.stock>10000)errors.push('Stock must be a whole number from 0 to 10,000.');
  if(!Number.isInteger(record.price_paise)||record.price_paise<100||record.price_paise>100000000)errors.push('Price must be between ₹1 and ₹10,00,000.');
 }
 if(['products','journal_posts'].includes(kind)&&typeof record.slug==='string'&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug))errors.push('URL name must use lowercase letters, numbers and single hyphens.');
 if('sort_order' in record&&(!Number.isInteger(record.sort_order)||record.sort_order<0||record.sort_order>9999))errors.push('Display order must be a whole number from 0 to 9,999.');
 return errors;
}
export function uploadError(file,kind){
 const rule=UPLOAD_LIMITS[kind];
 if(!rule)return 'Unsupported media type.';
 if(!file.size)return 'Choose a file that is not empty.';
 if(file.size>rule.bytes)return `Maximum ${kind==='image'?'image':kind==='video'?'video':'caption file'} size is ${rule.label}. Compress the file before uploading.`;
 if(kind==='captions'?!/\.vtt$/i.test(file.name):!rule.types.includes(file.type))return 'This file type is not supported.';
 return '';
}
