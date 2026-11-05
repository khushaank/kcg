import sharp from 'sharp';
import {readdir,mkdir,writeFile,copyFile} from 'node:fs/promises';
const directory='public/images';await mkdir(directory+'/optimized',{recursive:true});await mkdir('public/fonts',{recursive:true});
const manifest={};
for(const name of (await readdir(directory)).filter(n=>/\.(?:jpg|png)$/i.test(n))){
 const image=sharp(directory+'/'+name),meta=await image.metadata(),base=name.replace(/\.[^.]+$/,'');
 const widths=[...new Set([320,640,960,1280,meta.width].filter(w=>w<=meta.width))].sort((a,b)=>a-b);
 const variants=[];
 for(const width of widths){
  const smallPhoto=['Health-camp.jpg','rural-health-camp-illustration.jpg'].includes(name),file=`${base}-${width}.${smallPhoto?'avif':'webp'}`;
  const resized=image.clone().resize({width,withoutEnlargement:true});
  await (smallPhoto?resized.avif({quality:55,effort:6}):resized.webp({quality:65,effort:5})).toFile(directory+'/optimized/'+file);
  variants.push({url:'/images/optimized/'+file,width,height:Math.round(meta.height*width/meta.width)});
 }
 manifest['/images/'+name]=variants;
}
await sharp('public/Logo.png').resize({width:320}).webp({quality:72,effort:6}).toFile(directory+'/kcg-logo.webp');
await sharp('public/Logo.png').resize({width:272}).avif({quality:65,effort:6}).toFile(directory+'/kcg-logo.avif');
for(const size of [32,180])await sharp('public/favicon.png').resize(size,size,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toFile(`public/favicon-${size}.png`);
await copyFile('node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2','public/fonts/dm-sans-latin.woff2');
await copyFile('node_modules/@fontsource-variable/dm-sans/LICENSE','public/fonts/DM-Sans-LICENSE.txt');
await writeFile('src/image-manifest.json',JSON.stringify(manifest));
console.log('Optimized images, original logo, favicon and local font ready.');
