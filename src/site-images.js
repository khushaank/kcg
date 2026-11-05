const learning={url:'/images/rural-learning-illustration.jpg',alt:'AI-generated illustration of a village learning space in rural India'};
const nutrition={url:'/images/rural-community-meal-illustration.jpg',alt:'AI-generated illustration of a community meal in rural India'};
const pottery={url:'/images/rural-pottery-illustration.jpg',alt:'AI-generated illustration of pottery being made in a rural Indian workshop'};
const health={url:'/images/rural-eye-care-illustration.jpg',alt:'AI-generated illustration of a non-invasive eye examination in a rural Indian clinic'};
const healthCamp={url:'/images/rural-health-camp-illustration.jpg',alt:'AI-generated illustration of a village health camp in rural Haryana, with a healthcare worker checking an older man’s blood pressure'};
const replacements={'/images/education.jpg':learning,'/images/community.jpg':nutrition,'/images/craft-hero.jpg':pottery,'/images/cataract-operation.jpg':health};
const legacyStock={'photo-1524995997946-a1c2e315a42f':learning,'photo-1528909514045-2fa4ac7a08ba':learning,'photo-1488521787991-ed7bbaae773c':nutrition};
function illustration(value){
 if(typeof value!=='string')return null;
 const local=value.startsWith('images/')?'/'+value:value;
 if(replacements[local])return replacements[local];
 for(const item of [learning,nutrition,pottery,health,healthCamp])if(value===item.url)return item;
 try{const url=new URL(value);if(url.hostname==='images.unsplash.com')return legacyStock[url.pathname.slice(1)] || null;}catch{}
 return null;
}
export const siteImage=value=>illustration(value)?.url || value;
export const imageAlt=(value,fallback='')=>illustration(value)?.alt || fallback;
export const imageCredit=value=>illustration(value)?'<small class="image-credit">AI-generated illustration</small>':'';
