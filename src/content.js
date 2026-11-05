import {FOUNDATION_NAME} from './data-limits.js';
import {siteImage,imageAlt} from './site-images.js';
export const foundationDefaults = {
  name: FOUNDATION_NAME,
  tagline: 'बहुजनहिताय बहुजन सुखाय',
  hero_eyebrow: 'FOR THE WELFARE OF MANY. FOR THE HAPPINESS OF MANY.',
  hero_heading: 'A legacy of care.',
  hero_emphasis: 'A future of possibility.',
  hero_description: 'Helping children learn, families thrive, and communities grow stronger. Carrying forward the compassionate legacy of Late Sh. Kailash Chand Gupta in Haryana.',
  hero_image: '/images/Health-camp.jpg',
  hero_image_alt: 'KCG Foundation community health camp in Haryana',
  mission: 'We believe that every child deserves the chance to learn, every family deserves dignity, and care should reach the people who need it.',
  story: 'KCG Foundation was established in loving memory of Late Sh. Kailash Chand Gupta. His vision of selfless service lives on through our work with children, daily-wage workers, and families in Haryana.\n\nOur focus is education, nutrition, and community wellbeing. From school essentials and educational support to health camps and medical assistance, we work to remove barriers to a better everyday.',
  quote: 'For the welfare of many, for the happiness of many.',
  email: 'info@b2bindustrial.in',
  phone: '+91 98997 02065',
  location: 'Haryana, India',
  footer_summary: 'Education. Wellbeing. Dignity.\nCare that creates possibility.',
  newsletter_heading: 'Good work. Human stories.',
  programs: [
    { title: 'Education & school support', subtitle: 'A brighter future begins with access.', description: 'School essentials, uniforms, books and educational scholarships help children from daily-wage and agricultural families stay in school and pursue their potential.', image: '/images/education.jpg', alt: 'Illustrative books and learning resources', link: 'Program support' },
    { title: 'Nutrition & food security', subtitle: 'Nourishment for the journey ahead.', description: 'Nutritional drives and meal support help children and families meet a fundamental need. Food security and education belong together: children need the energy to learn, grow and thrive.', image: '/images/community.jpg', alt: 'Illustrative community photograph', link: 'Program support' },
    { title: 'Community health & welfare', subtitle: 'Wellbeing, with dignity.', description: 'Health camps, medical assistance and family welfare initiatives bring care closer to people who need it, including support for cataract surgery and essential treatment.', image: '/images/cataract-operation.jpg', alt: 'Cataract treatment supported by KCG Foundation', link: 'Program support' },
  ],
};
export const foundationGalleryDefaults = [
  {id:'11111111-0000-4000-8000-000000000001',title:'Community health & welfare',image:'/images/Health-camp.jpg',alt:'KCG Foundation health camp in Haryana',description:'Care, close to the community.',published:true,sort_order:0},
  {id:'11111111-0000-4000-8000-000000000002',title:'Supporting access to cataract treatment',image:'/images/cataract-operation.jpg',alt:'Cataract treatment supported by KCG Foundation',description:'Helping people access essential medical care.',published:true,sort_order:1},
];

export function mergeFoundation(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const content = { ...foundationDefaults };
  for(const key of Object.keys(foundationDefaults))if(key!=='programs'&&typeof source[key]==='string')content[key]=source[key];
  content.name = FOUNDATION_NAME;
  content.programs = (Array.isArray(source.programs) ? source.programs : foundationDefaults.programs).filter(p=>p&&typeof p==='object'&&!Array.isArray(p)).slice(0,12).map(p=>{
    const program=Object.fromEntries(['title','subtitle','description','image','alt','link'].map(key=>[key,typeof p[key]==='string'?p[key]:'']));
    program.alt=imageAlt(program.image,program.alt);program.image=siteImage(program.image);return program;
  });
  return content;
}

export function productGallery(product) {
  const images = Array.isArray(product.gallery) ? product.gallery.filter(i => i && typeof i.url === 'string' && i.url.trim()).slice(0, 3) : [];
  return images.length ? images : (product.image ? [{ url: product.image, alt: product.title, caption: product.is_preview ? 'Illustrative product photograph' : 'The piece' }] : []);
}

export function publicationErrors(kind, record) {
  const missing = [];
  if (kind === 'makers') {
    for (const [field, label] of [['name','Name'],['portrait_url','Maker portrait'],['life_story','Life story'],['learning_story','How they learned the craft'],['signature_style','Signature style'],['cultural_roots','Place and cultural roots']]) if (!record[field]?.trim()) missing.push(label);
  }
  if (kind === 'products') {
    if (new Set(productGallery(record).map(i=>i.url)).size < 2) missing.push('At least two different product photographs');
    for (const [field, label] of [['title','Title'],['maker_id','Maker'],['making_video_url','Making video'],['making_video_transcript','Film transcript'],['origin','Place of origin'],['technique','Technique'],['significance','Significance'],['description','Description'],['materials','Materials'],['dimensions','Dimensions'],['care','Care instructions']]) if (!record[field]?.trim()) missing.push(label);
    if (!Array.isArray(record.process_steps) || !record.process_steps.some(s=>s?.title?.trim() && s?.description?.trim())) missing.push('Making process');
  }
  if (kind === 'gallery_items') for (const [field,label] of [['title','Title'],['image','Photograph'],['alt','Photograph description']]) if (!record[field]?.trim()) missing.push(label);
  return missing;
}
