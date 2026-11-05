import manifest from './image-manifest.json' with {type:'json'};
import {siteImage} from './site-images.js';
export const IMAGE_SIZES='(max-width: 650px) 88vw, (max-width: 1050px) 45vw, 40vw';
const byUrl=new Map();for(const [key,list] of Object.entries(manifest)){byUrl.set(key,list);for(const item of list)byUrl.set(item.url,list);}
function variants(value){let path=siteImage(value);if(typeof path!=='string')return null;try{if(/^https?:/.test(path)){const url=new URL(path);if(!['127.0.0.1','localhost','kcg.b2bindustrial.in'].includes(url.hostname))return null;path=url.pathname;}}catch{return null;}return byUrl.get(path.startsWith('images/')?'/'+path:path);}
export function deliveredImage(value,width=960){const list=variants(value);return list?.find(v=>v.width>=width)?.url || list?.at(-1)?.url || siteImage(value);}
export function responsiveImages(value){return variants(value)?.map(v=>v.url+' '+v.width+'w').join(', ') || '';}
export function prioritizeLeadImage(html){return html.replace(/<img\b[^>]*>/,tag=>tag.replace(/\sloading="lazy"/,' loading="eager"').replace(/>$/,' fetchpriority="high">'));}
export function withResponsiveImages(html){return html.replace(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g,(tag,src)=>{
 tag=tag.replace(/\sdraggable="[^"]*"/g,'').replace(/>$/,' draggable="false">');
 const list=variants(src);if(!list)return tag;
 let attributes='';if(!/\bsrcset=/.test(tag))attributes+=' srcset="'+responsiveImages(src)+'" sizes="'+IMAGE_SIZES+'"';
 if(!/\bwidth=/.test(tag))attributes+=' width="'+list.at(-1).width+'" height="'+list.at(-1).height+'"';
 if(!/\bdecoding=/.test(tag))attributes+=' decoding="async"';
 return tag.replace(/>$/,attributes+'>');
});}
