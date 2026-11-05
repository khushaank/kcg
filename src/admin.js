import './style.css';
import './admin.css';
import './heritage.css';
import {db,configured,result} from './admin-backend.js';
import {brandLogo} from './brand.js';
import {staffCan,mfaQrSource,ROLE_NAMES,STAFF_IDLE_MS,STAFF_MAX_MS} from './staff-access.js';
import { foundationDefaults,mergeFoundation,publicationErrors } from './content.js';
import { mediaSource } from './media.js';
import { money } from './cart.js';
import {FOUNDATION_NAME,fieldLimit,entryErrors,UPLOAD_LIMITS,uploadError} from './data-limits.js';

const root=document.querySelector('#admin-app');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tabs=[['overview','Overview'],['foundation','Foundation & programs'],['makers','People & maker stories'],['products','Products & making films'],['journal_posts','Journal'],['gallery_items','Community gallery'],['orders','Orders & delivery'],['maker_payment_accounts','Maker payout accounts'],['enquiries','Enquiries & volunteers'],['newsletter_subscribers','Newsletter subscribers']];
let session,tab='overview',current=null,options=[],rows=[],page=0,site=foundationDefaults,dirty=false,busy=false,uploads=0;
let role='',factorId='',signedInAt=0,lastActivity=Date.now(),locking=false;
const can=(action,table=tab)=>staffCan(role,action,table);
const tableLabels=Object.fromEntries(tabs);
function status(message,error=false){const el=document.querySelector('#admin-status,#admin-auth-status,#staff-mfa-status');if(!el)return;el.textContent=message;el.classList.toggle('error',error);el.hidden=false;}
function field(name,label,value='',type='text',hint=''){
  const numeric=name==='price_rupees'?'min="1" max="1000000" step="0.01"':`min="0" max="${name==='stock'?10000:9999}" step="1"`;
  const control=type==='textarea'?`<textarea name="${name}" rows="5" maxlength="${fieldLimit(name)}">${esc(value)}</textarea>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${type==='number'?numeric:`maxlength="${fieldLimit(name)}"`}>`;
  return `<label>${label}${control}<small>${hint?hint+' · ':''}${type==='number'?'Use the range shown in this field.':`Maximum ${fieldLimit(name).toLocaleString()} characters.`}</small></label>`;
}
function mediaField(name,label,value='',kind='image',hint=''){
  const valid=mediaSource(value);
  hint=(hint || (kind==='video'?'MP4/WebM, or a YouTube/Vimeo link.':kind==='captions'?'WebVTT caption file.':'JPEG, PNG, WebP or AVIF.'))+` Maximum ${UPLOAD_LIMITS[kind].label} per upload.`;
  return `<div class="admin-media-field">${field(name,label,value,'text',hint || (kind==='video'?'Upload MP4/WebM, or paste a YouTube/Vimeo link.':'Upload a photograph or paste its public URL.'))}${kind==='image'&&valid?`<img class="admin-media-preview" src="${esc(valid)}" alt="Current ${esc(label)}">`:''}<label class="admin-upload">${kind==='captions'?'Upload .vtt captions':kind==='video'?'Upload making video':'Upload photograph'}<input type="file" data-upload-target="${name}" data-kind="${kind}" accept="${kind==='video'?'video/mp4,video/webm':kind==='captions'?'.vtt':'image/jpeg,image/png,image/webp,image/avif'}" ${!configured?'disabled':''}></label><p class="upload-status" role="status"></p></div>`;
}
function section(title,copy,fields){return `<section class="admin-form-section"><h3>${title}</h3>${copy?`<p>${copy}</p>`:''}${fields}</section>`;}
function authView(message='Sign in with your staff ID and password, then verify your authenticator code.'){
  root.innerHTML=`<header class="admin-topbar"><a href="index.html" class="admin-brand">${brandLogo}<small>STAFF WORKSPACE</small></a><a href="index.html">Return to the foundation ↗</a></header><main class="admin-auth"><span class="eyebrow">KCG FOUNDATION · AUTHORISED STAFF</span><h1>A place to care<br>for <em>the details.</em></h1><p>${esc(message)}</p><form id="admin-auth-form"><label>Staff ID (email)<input name="email" type="email" autocomplete="username" maxlength="254" required ${!configured?'disabled':''}></label><label>Password<input name="password" type="password" autocomplete="current-password" maxlength="1024" required ${!configured?'disabled':''}></label><button class="button primary" ${!configured?'disabled':''}>Sign in securely →</button><p id="admin-auth-status" role="status"></p></form><p class="admin-auth-note">Access is assigned in Supabase. Passwords are verified by Supabase Auth and are never read from a password table. This workspace does not remember your sign-in after a reload.</p>${!configured?'<div class="admin-readonly-note">Supabase is not connected yet. Follow docs/SETUP.md to add credentials, run SQL files 01–08 and create your staff account.</div>':''}</main>`;
}
function shell(){
 root.innerHTML=`<header class="admin-topbar"><a href="index.html" class="admin-brand">${brandLogo}<small>STAFF WORKSPACE</small></a><div><a href="index.html" target="_blank" rel="noopener">View website ↗</a><span class="staff-role-badge">${esc(ROLE_NAMES[role])}</span><span class="staff-timeout-note">Temporary sign-in · 30 minutes maximum</span><button data-admin-action="signout">Sign out</button></div></header><div class="admin-layout"><aside class="admin-sidebar"><span class="eyebrow">MANAGE YOUR FOUNDATION</span><nav aria-label="Workspace navigation">${tabs.filter(([key])=>can('tab',key)).map(([key,label])=>`<button data-tab="${key}" ${key===tab?'aria-current="page"':''}>${label}</button>`).join('')}</nav><p>${esc(session?.user.email || '')}</p></aside><main class="admin-main"><div class="admin-page-heading"><div><span class="eyebrow">KCG FOUNDATION</span><h1>${tableLabels[tab]}</h1></div><div id="admin-page-actions"></div></div><p id="admin-status" role="status" hidden></p><div id="admin-body"></div></main></div>`;
}
async function guard(){
 if(!configured){authView('Connect Supabase to enable staff sign-in.');return;}
 const {data,error}=await db.auth.getSession();
 if(error || !data.session){authView();return;}
 session=data.session;
 try{
   const verified=await result(db.auth.getUser());
   if(verified.user?.id!==session.user.id || verified.user?.is_anonymous)throw new Error('Invalid staff identity');
   const membership=await result(db.from('admin_users').select('user_id,role,enabled').eq('user_id',session.user.id).maybeSingle());
   if(!membership?.enabled || !Object.hasOwn(ROLE_NAMES,membership.role)){await db.auth.signOut({scope:'local'});session=null;authView('This account does not have active staff access. Contact the Supabase project owner.');return;}
   role=membership.role;
   const assurance=await result(db.auth.mfa.getAuthenticatorAssuranceLevel());
   if(assurance.currentLevel!=='aal2'){await mfaView();return;}
   if(!await result(db.rpc('staff_has_role',{allowed_roles:['super_admin','manager','editor']}))){await lockWorkspace('Please sign in again.');return;}
   signedInAt ||= Date.now();lastActivity=Date.now();
   // ponytail: the maker dropdown loads up to 1000 names; add server search if the community grows beyond that.
   options=await result(db.from('makers').select('id,name,published').order('name').limit(1000));
   const saved=await result(db.from('site_content').select('value').eq('key','foundation').maybeSingle());
   site=mergeFoundation(saved?.value);
   await render();
 }catch(error){role='';rows=[];options=[];current=null;authView('The workspace could not be verified. Check that SQL files 01–08 have been run, then sign in again.');console.error('Workspace access:',error.message);}
}
async function mfaView(enrollment){
 const factors=await result(db.auth.mfa.listFactors());
 const verified=factors.totp?.filter(f=>f.status==='verified') || [];
 factorId=enrollment?.id || verified[0]?.id || '';
 const qr=mfaQrSource(enrollment?.totp?.qr_code);
 root.innerHTML=`<header class="admin-topbar"><a href="index.html" class="admin-brand">${brandLogo}<small>STAFF VERIFICATION</small></a><button data-admin-action="signout">Sign out</button></header><main class="admin-auth"><span class="eyebrow">SECOND STEP · AUTHENTICATOR</span><h1>${enrollment?'Set up your':'Verify your'}<br><em>authenticator.</em></h1><p>${enrollment?'Scan this QR code with your authenticator app, then enter its six-digit code.':verified.length?'Enter the six-digit code from your authenticator app.':'Staff access requires an authenticator. Set it up to finish signing in.'}</p>${enrollment?`${qr?`<img class="staff-mfa-qr" src="${esc(qr)}" alt="Scan with your authenticator app">`:'<p role="status">The QR image could not be displayed. Use the manual setup key below.</p>'}<details ${!qr?'open':''}><summary>Manual setup key</summary><p>In your authenticator app, choose to enter a setup key, name the account KCG Foundation, and select a time-based code.</p><p class="staff-mfa-secret">${esc(enrollment.totp.secret)}</p></details>`:''}${factorId?`<form id="staff-mfa-form" class="staff-mfa-form">${verified.length>1&&!enrollment?`<label>Authenticator<select name="factor">${verified.map(f=>`<option value="${esc(f.id)}">${esc(f.friendly_name || 'Authenticator')}</option>`).join('')}</select></label>`:''}<label>Authenticator code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><button class="button primary">Verify & open workspace →</button><p id="staff-mfa-status" role="status"></p></form>`:'<button class="button primary" data-admin-action="enroll-mfa">Set up authenticator →</button><p id="staff-mfa-status" role="status"></p>'}</main>`;
}
async function enrollMfa(button){
 button.disabled=true;
 try{
  const factors=await result(db.auth.mfa.listFactors());
  for(const f of (factors.all || []).filter(f=>f.factor_type==='totp'&&f.status==='unverified'))await result(db.auth.mfa.unenroll({factorId:f.id}));
  const enrollment=await result(db.auth.mfa.enroll({factorType:'totp',friendlyName:'KCG staff authenticator',issuer:'KCG Foundation'}));
  await mfaView(enrollment);
 }catch(error){document.querySelector('#staff-mfa-status').textContent='Authenticator setup could not start. Check that TOTP MFA is enabled in Supabase, then try again.';button.disabled=false;}
}
async function lockWorkspace(){
 if(locking)return;locking=true;setDirty(false);session=null;role='';rows=[];options=[];current=null;
 root.innerHTML='<main class="admin-auth"><p>Closing the staff workspace…</p></main>';
 try{await Promise.race([db?.auth.signOut({scope:'local'}),new Promise(resolve=>setTimeout(resolve,1500))]);}catch{}
 location.replace(location.pathname);
}
async function render(){
 if(!can('tab',tab)){tab='overview';current=null;}
 shell();const body=document.querySelector('#admin-body');
 try{
  if(tab==='overview')return await overview(body);
  if(tab==='foundation')return foundationEditor(body);
  if(current)return editor(body,current);
  await list(body);
 }catch(error){status(error.message,true);}
}
async function overview(body){
 const counts={};
 for(const table of ['makers','products','orders','enquiries'].filter(t=>can('tab',t))){const {count,error}=await db.from(table).select('*',{count:'exact',head:true});if(error)throw error;counts[table]=count;}
 body.innerHTML=`<div class="admin-welcome"><h2>A little care,<br><em>behind everything.</em></h2><p>Keep the foundation’s work at the centre. Introduce the people, capture their craft, and bring each piece’s story to life.</p></div><div class="admin-stat-grid">${Object.entries(counts).map(([t,n])=>`<button data-tab="${t}"><strong>${n}</strong><span>${tableLabels[t]}</span></button>`).join('')}</div><section class="admin-workflow"><span class="eyebrow">BRING A NEW STORY TO LIFE</span><div><article><span>01</span><h3>Introduce the person.</h3><p>Add a portrait, life story, learning journey, style and cultural roots.</p><button class="text-link" data-tab="makers" data-new="true">Add a maker →</button></article><article><span>02</span><h3>Show the making.</h3><p>Upload the film, add a transcript, describe the process, and choose 2–3 product images.</p><button class="text-link" data-tab="products" data-new="true">Add a piece →</button></article><article><span>03</span><h3>Publish with care.</h3><p>Save drafts as you go. Publish when the person’s story and product details are complete.</p>${can('foundation') ? '<button class="text-link" data-tab="foundation">Edit foundation content →</button>' : '<p>Your manager reviews and publishes completed drafts.</p>'}</article></div></section>`;
}
async function list(body){
 const readOnly=['orders','enquiries','newsletter_subscribers'].includes(tab);
 document.querySelector('#admin-page-actions').innerHTML=readOnly?'':`<button class="button primary" data-admin-action="new">+ ${tab==='makers'?'Add a person':tab==='products'?'Add a product':tab==='maker_payment_accounts'?'Add payout account':tab==='gallery_items'?'Add a photograph':'Add a story'}</button>`;
 const columns={makers:'id,name,craft,location,portrait_url,image,published',products:'id,title,category,price_paise,image,published',journal_posts:'id,title,category,date,published',gallery_items:'id,title,image,published',orders:'id,created_at,total_paise,status'};
 let query=db.from(tab).select(columns[tab] || '*');query=tab==='maker_payment_accounts'?query.order('maker_id'):query.order('created_at',{ascending:false});rows=await result(query.range(page*100,page*100+99));
 const headers=tab==='orders'?['Order','Date','Amount','Status','Action']:tab==='enquiries'?['Name & email','Topic','Message','Date']:tab==='newsletter_subscribers'?['Email','Consent recorded']:tab==='maker_payment_accounts'?['Maker','Linked account','Payments','Action']:['Name','Details','Visibility','Action'];
 body.innerHTML=`${tab==='makers'?'<p class="admin-list-intro">A maker is a person first. Their portrait, background, practice and voice stay connected to every piece they create.</p>':tab==='products'?'<p class="admin-list-intro">The making film leads each product page. Publish with 2–3 photographs, a complete maker profile, process and provenance.</p>':''}<div class="admin-table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(rowHtml).join('')}</tbody></table>${!rows.length?'<div class="admin-empty">Nothing here yet. Your next addition will appear here.</div>':''}</div><div class="admin-pagination"><button class="button outline" data-admin-action="previous" ${!page?'disabled':''}>← Previous</button><span>Page ${page+1} · up to 100 records</span><button class="button outline" data-admin-action="next" ${rows.length<100?'disabled':''}>Next →</button></div>`;
}
function rowHtml(r){
 const date=value=>new Date(value).toLocaleDateString('en-IN');
 if(tab==='enquiries')return `<tr><td><strong>${esc(r.name)}</strong><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td><td>${esc(r.topic)}${r.amount_paise?`<small>${money(r.amount_paise)}</small>`:''}</td><td class="admin-message">${esc(r.message)}</td><td>${date(r.created_at)}</td></tr>`;
 if(tab==='newsletter_subscribers')return `<tr><td>${esc(r.email)}</td><td>${date(r.consent_at)}</td></tr>`;
 if(tab==='orders')return `<tr><td><button class="text-link" data-admin-action="view-order" data-id="${r.id}">${esc(r.id.slice(0,8).toUpperCase())}</button></td><td>${date(r.created_at)}</td><td>${money(r.total_paise)}</td><td><span class="admin-pill">${esc(r.status.replaceAll('_',' '))}</span></td><td>${['paid','shipped'].includes(r.status)?`<button class="text-link" data-admin-action="fulfil" data-id="${r.id}" data-status="${r.status==='paid'?'shipped':'delivered'}">Mark ${r.status==='paid'?'shipped':'delivered'} →</button>`:'—'}</td></tr>`;
 if(tab==='maker_payment_accounts')return `<tr><td>${esc(options.find(m=>m.id===r.maker_id)?.name || r.maker_id)}</td><td>${esc(r.razorpay_account_id)}</td><td>${r.enabled?'Enabled':'Not enabled'}</td><td><button class="text-link" data-admin-action="edit" data-id="${r.maker_id}">Edit →</button></td></tr>`;
 return `<tr><td><strong>${esc(r.name || r.title)}</strong>${r.portrait_url || r.image ? `<img class="admin-row-image" src="${esc(mediaSource(r.portrait_url || r.image))}" alt="">`:''}</td><td>${esc(r.craft || r.category)}<small>${esc(r.location || (r.price_paise ? money(r.price_paise):r.date))}</small></td><td><span class="admin-pill ${r.published?'published':''}">${r.published?'Published':'Draft'}</span></td><td><button class="text-link" data-admin-action="edit" data-id="${esc(r.id)}">Edit →</button>${r.published&&can('publish')?`<button class="admin-archive" data-admin-action="archive" data-id="${esc(r.id)}">Move to draft</button>`:''}</td></tr>`;
}
function editor(body,r){
 document.querySelector('#admin-page-actions').innerHTML='<button class="button outline" data-admin-action="back">← Back to list</button>';
 let fields='';
 if(tab==='makers'){
  fields=section('Meet the person','The portrait is shown on their profile, product pages and collection cards.',field('name','Full name / display name',r.name)+mediaField('portrait_url','Portrait of the maker',r.portrait_url)+`<div class="form-row">${field('craft','Craft / practice',r.craft)}${field('location','Village, town, region & country',r.location)}</div>`+field('initials','Initials (optional)',r.initials)+field('story','Short introduction',r.story,'textarea'));
  fields+=section('Their life, in their words','Use the maker’s approved words. Separate paragraphs with a blank line.',field('life_story','Life story & everyday life',r.life_story,'textarea')+field('learning_story','How they learned · teachers, family & turning points',r.learning_story,'textarea')+field('signature_style','Personal style · forms, colours, techniques & influences',r.signature_style,'textarea')+field('cultural_roots','Roots · home, community, tradition & belonging',r.cultural_roots,'textarea')+field('quote','A quote in their own words',r.quote));
  fields+=section('Their working world','A photograph of their studio, tools or working process.',mediaField('image','Workshop / process photograph',r.image));
 }else if(tab==='products'){
  fields=section('The piece & the person','Choose the person who actually makes this piece.',field('title','Product title',r.title)+field('slug','URL name (lowercase words separated by hyphens)',r.slug)+`<label>Maker<select name="maker_id"><option value="">Choose a maker</option>${options.map(m=>`<option value="${esc(m.id)}" ${m.id===r.maker_id?'selected':''}>${esc(m.name)}${m.published?'':' · draft'}</option>`).join('')}</select></label>`+field('subtitle','Short introductory line',r.subtitle)+field('description','About this piece',r.description,'textarea')+`<div class="form-row">${field('category','Collection / category',r.category)}${field('tag','Small product label',r.tag || 'Made by hand')}</div>`);
  fields+=section('The making film — shown first','The film has priority on the product page. Show the maker creating this specific piece. Public media can be viewed by website visitors.',mediaField('making_video_url','Making video',r.making_video_url,'video')+mediaField('making_video_poster','Film poster / thumbnail',r.making_video_poster)+field('making_video_caption','Film title / context',r.making_video_caption)+field('making_video_transcript','Transcript / spoken story (required to publish)',r.making_video_transcript,'textarea')+mediaField('making_video_captions_url','Optional caption track',r.making_video_captions_url,'captions','Upload a WebVTT (.vtt) file.'));
  fields+=section('Product photographs','Add two or three photographs of this same piece: the complete piece, another angle, and its details or texture.',Array.from({length:3},(_,i)=>`<fieldset><legend>Photograph ${i+1}${i===2?' · optional':''}</legend>${mediaField(`gallery_url_${i}`,'Photograph',r.gallery?.[i]?.url || (i===0?r.image:''))}${field(`gallery_alt_${i}`,'Describe the photograph (accessibility)',r.gallery?.[i]?.alt)}${field(`gallery_caption_${i}`,'Caption',r.gallery?.[i]?.caption)}</fieldset>`).join(''));
  fields+=section('Where it comes from & what it means','Help visitors understand the place, materials and traditions connected to the piece.',field('origin','Place of origin · village / region / country',r.origin)+field('technique','Craft technique',r.technique)+field('making_time','Time to make · e.g. 3 days, plus firing',r.making_time)+field('significance','Story, significance & cultural meaning',r.significance,'textarea'));
  fields+=section('How it is made','Each step is shown in order on the product page.',`<div id="process-fields">${(r.process_steps?.length?r.process_steps:[{},{},{}]).map(processFields).join('')}</div><button type="button" class="text-link" data-admin-action="add-step">+ Add a process step</button>`);
  fields+=section('The practical details','Enter the total selling price in rupees, including delivery and applicable taxes.',`<div class="form-row">${field('price_rupees','Price (₹)',(r.price_paise || 0)/100,'number')}${field('stock','Available quantity',r.stock ?? 0,'number')}</div>`+field('materials','Materials',r.materials)+field('dimensions','Dimensions / size',r.dimensions)+field('care','Care instructions',r.care,'textarea')+field('delivery','Dispatch, delivery & return information',r.delivery,'textarea')+field('sort_order','Collection display order',r.sort_order ?? 0,'number'));
 }else if(tab==='journal_posts'){
  fields=section('A story from the foundation','Share the people, work and moments that matter.',field('title','Title',r.title)+field('slug','URL name',r.slug)+`<div class="form-row">${field('date','Display date',r.date)}${field('category','Category',r.category)}</div>`+field('readingTime','Reading time',r.readingTime || '3 min read')+mediaField('featuredImage','Story photograph',r.featuredImage)+field('excerpt','Short summary',r.excerpt,'textarea')+field('content','Full story',r.content,'textarea','Plain text or simple editorial HTML: paragraphs, headings, lists, bold and italic.'));
 }else if(tab==='gallery_items'){
  fields=section('A moment from the community','Share an approved photograph from the foundation’s work.',field('title','Title',r.title)+mediaField('image','Community photograph',r.image)+field('alt','Describe the photograph',r.alt)+field('description','Caption / story',r.description,'textarea')+field('sort_order','Display order',r.sort_order ?? 0,'number'));
 }else if(tab==='maker_payment_accounts'){
  fields=section('Verified maker payout account','Use the approved Razorpay Route linked account. Never enter a bank password, payment secret or service-role key here.',`<label>Maker<select name="maker_id" ${r.maker_id?'disabled':''}>${options.map(m=>`<option value="${esc(m.id)}" ${r.maker_id===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label>`+field('razorpay_account_id','Razorpay linked-account ID (acc_…)',r.razorpay_account_id)+`<label class="consent"><input type="checkbox" name="enabled" ${r.enabled?'checked':''}> This linked account is verified and ready to receive transfers.</label>`);
 }
 body.innerHTML=`<form id="admin-record-form" data-table="${tab}">${fields}<div class="admin-savebar"><span>${r.published?'Currently published':'Draft · take your time'}</span><button class="button outline" name="intent" value="draft" ${!configured?'disabled':''}>${tab==='maker_payment_accounts'?'Save account':'Save draft'}</button>${tab!=='maker_payment_accounts'&&can('publish')?`<button class="button primary" name="intent" value="publish" ${!configured?'disabled':''}>Publish →</button>`:''}</div></form>`;
 if(role==='editor' && r.published){
  body.insertAdjacentHTML('afterbegin','<p class="admin-readonly-note">This record is published. A manager must move it to draft before an editor can change it.</p>');
  body.querySelectorAll('form input,form textarea,form select,form button').forEach(el=>el.disabled=true);
 }
}
function processFields(step,i){return `<fieldset data-step="${i}"><legend>Step ${i+1}</legend>${field(`step_title_${i}`,'Step title',step.title)}${field(`step_description_${i}`,'What happens and why',step.description,'textarea')}</fieldset>`;}
function foundationEditor(body){
 document.querySelector('#admin-page-actions').innerHTML='';
 const s=site;
 body.innerHTML=`<form id="foundation-form">${section('The foundation at the centre','These fields update the home page, our story, programs and public contact details.','<p class="admin-readonly-note"><strong>KCG Foundation</strong><br>Foundation name is locked and cannot be changed here.</p>'+field('tagline','Guiding principle / Hindi line',s.tagline)+field('mission','Mission statement',s.mission,'textarea')+field('story','Foundation story & legacy',s.story,'textarea')+field('quote','Guiding quotation',s.quote))}${section('Home page introduction','Lead with your foundation’s purpose and community work.',field('hero_eyebrow','Small introduction above the headline',s.hero_eyebrow)+field('hero_heading','Main headline',s.hero_heading)+field('hero_emphasis','Second headline line',s.hero_emphasis)+field('hero_description','Introduction',s.hero_description,'textarea')+mediaField('hero_image','Home page photograph',s.hero_image)+field('hero_image_alt','Describe the home page photograph',s.hero_image_alt))}${section('Programs','Each program appears on the home page and Our work page.',`<div id="program-fields">${s.programs.map(programFields).join('')}</div><button type="button" class="text-link" data-admin-action="add-program">+ Add a program</button>`)}${section('Contact & community updates','Keep these details current so people can reach you.',field('email','Public contact email',s.email,'email')+field('phone','Public contact phone',s.phone)+field('location','Location',s.location)+field('footer_summary','Short foundation description in the footer',s.footer_summary,'textarea')+field('newsletter_heading','Community newsletter heading',s.newsletter_heading))}<div class="admin-savebar"><span>Foundation content is public when saved.</span><button class="button primary" ${!configured?'disabled':''}>Save foundation content →</button></div></form>`;
}
function programFields(p,i){return `<fieldset data-program="${i}"><legend>Program ${i+1}</legend>${field(`program_title_${i}`,'Program title',p.title)}${field(`program_subtitle_${i}`,'Introductory line',p.subtitle)}${field(`program_description_${i}`,'What this program does',p.description,'textarea')}${mediaField(`program_image_${i}`,'Program photograph',p.image)}${field(`program_alt_${i}`,'Describe the photograph',p.alt)}<label class="consent"><input type="checkbox" name="program_remove_${i}"> Remove this program when I save</label></fieldset>`;}
function stringFields(data,keys){return Object.fromEntries(keys.map(key=>[key,String(data.get(key)||'').trim()]));}
async function saveRecord(form,intent){
 if(tab==='maker_payment_accounts' ? !can('payouts') : !can(intent==='publish'?'publish':'draft') || (role==='editor'&&current?.published))return status('Your role does not allow this change.',true);
 if(uploads)return status('Wait for your media upload to finish before saving.',true);
 if(!configured || busy)return;busy=true;form.querySelectorAll('button[type=submit],.admin-savebar button').forEach(b=>b.disabled=true);
 status('Saving your changes…');
 try{
  const f=new FormData(form);let payload;
  if(tab==='makers')payload=stringFields(f,['name','craft','location','initials','story','quote','image','portrait_url','life_story','learning_story','signature_style','cultural_roots']);
  if(tab==='products'){
   payload=stringFields(f,['title','slug','maker_id','subtitle','category','tag','description','making_video_url','making_video_poster','making_video_caption','making_video_transcript','making_video_captions_url','origin','technique','making_time','significance','materials','dimensions','care','delivery']);
   payload.gallery=Array.from({length:3},(_,i)=>({url:String(f.get(`gallery_url_${i}`)||'').trim(),alt:String(f.get(`gallery_alt_${i}`)||'').trim(),caption:String(f.get(`gallery_caption_${i}`)||'').trim()})).filter(i=>i.url);
   payload.image=payload.gallery[0]?.url || '';
   payload.process_steps=[...form.querySelectorAll('[data-step]')].map(el=>({title:String(f.get(`step_title_${el.dataset.step}`)||'').trim(),description:String(f.get(`step_description_${el.dataset.step}`)||'').trim()})).filter(s=>s.title || s.description);
   payload.price_paise=Math.round(Number(f.get('price_rupees'))*100);payload.stock=Number(f.get('stock'));payload.sort_order=Number(f.get('sort_order'));
   if(!Number.isSafeInteger(payload.price_paise)||payload.price_paise<100||!Number.isInteger(payload.stock)||payload.stock<0)throw new Error('Enter a valid price of at least ₹1 and a whole-number stock quantity.');
  }
  if(tab==='journal_posts')payload=stringFields(f,['title','slug','date','category','readingTime','excerpt','featuredImage','content']);
  if(tab==='gallery_items')payload={...stringFields(f,['title','image','alt','description']),sort_order:Number(f.get('sort_order'))};
  if(tab==='maker_payment_accounts'){
   payload={maker_id:current?.maker_id || f.get('maker_id'),razorpay_account_id:String(f.get('razorpay_account_id')||'').trim(),enabled:f.has('enabled')};
   if(!/^acc_[A-Za-z0-9]+$/.test(payload.razorpay_account_id))throw new Error('Enter the verified Razorpay account ID beginning with acc_.');
  }else payload.published=intent==='publish';
  for(const [key,value] of Object.entries(payload))if((key.endsWith('_url') || ['image','featuredImage'].includes(key)) && value && !mediaSource(value))throw new Error('Use a valid HTTPS media URL or a local /images/ path.');
  if(payload.gallery?.some(i=>!mediaSource(i.url)))throw new Error('A product photograph URL is invalid.');
  const invalid=entryErrors(tab,payload);if(invalid.length)throw new Error(invalid.join('\n'));
  if(payload.published){
   const missing=publicationErrors(tab,payload);if(missing.length)throw new Error('Before publishing, complete: '+missing.join(', ')+'.');
   if(tab==='products'){
    const maker=await result(db.from('makers').select('*').eq('id',payload.maker_id).single());
    if(!maker.published || publicationErrors('makers',maker).length)throw new Error('Publish a complete maker profile, including the portrait and life story, before publishing their product.');
   }
  }
  const key=tab==='maker_payment_accounts'?'maker_id':'id',id=current?.[key];
  const saved=await result(id ? db.from(tab).update(payload).eq(key,id).select().single() : db.from(tab).insert(payload).select().single());
  current=saved;setDirty(false);
  if(tab==='maker_payment_accounts')form.querySelector('[name=maker_id]').disabled=true;
  if(tab==='makers')options=await result(db.from('makers').select('id,name,published').order('name').limit(1000));
  status(payload.published?'Published. This story is now available on the website.':tab==='maker_payment_accounts'?'Payout account saved.':'Draft saved. You can return and complete it whenever you’re ready.');
  const label=form.querySelector('.admin-savebar>span');if(label)label.textContent=payload.published?'Published':'Saved draft';
 }catch(error){status(error.message,true);}finally{busy=false;form.querySelectorAll('.admin-savebar button').forEach(b=>b.disabled=false);}
}
async function saveFoundation(form){
 if(!can('foundation'))return status('A manager or super admin must save foundation content.',true);
 if(uploads)return status('Wait for your media upload to finish before saving.',true);
 if(!configured||busy)return;busy=true;
 status('Saving foundation content…');form.querySelector('.admin-savebar button').disabled=true;
 try{
  const f=new FormData(form),keys=Object.keys(foundationDefaults).filter(k=>k!=='programs');
  const value=stringFields(f,keys);
  value.name=FOUNDATION_NAME;
  value.programs=[...form.querySelectorAll('[data-program]')].filter(el=>!f.has(`program_remove_${el.dataset.program}`)).map(el=>{const i=el.dataset.program;return {title:f.get(`program_title_${i}`),subtitle:f.get(`program_subtitle_${i}`),description:f.get(`program_description_${i}`),image:f.get(`program_image_${i}`),alt:f.get(`program_alt_${i}`)};});
  if(!value.name||!value.email||!value.hero_heading||!value.mission)throw new Error('Complete the foundation name, email, home headline and mission.');
  if(!mediaSource(value.hero_image) || value.programs.some(p=>!p.title||!p.description||!mediaSource(p.image)))throw new Error('Complete each program’s title, description and valid photograph URL.');
  const invalid=entryErrors('foundation',value);if(invalid.length)throw new Error(invalid.join('\n'));
  await result(db.from('site_content').upsert({key:'foundation',value,updated_at:new Date().toISOString()}));site=mergeFoundation(value);setDirty(false);status('Foundation content saved. Your website will show the new content when refreshed.');
 }catch(error){status(error.message,true);}finally{busy=false;form.querySelector('.admin-savebar button').disabled=false;}
}
async function upload(input){
 const file=input.files?.[0];if(!file || !configured)return;
 const kind=input.dataset.kind,bucket=UPLOAD_LIMITS[kind]?.bucket;
 const box=input.closest('.admin-media-field'),message=box.querySelector('.upload-status'),target=box.querySelector(`[name="${input.dataset.uploadTarget}"]`);
 if(uploads){message.textContent='Please wait for the current upload to finish.';input.value='';return;}
 input.disabled=true;setDirty(true);uploads++;
 try{
  const problem=uploadError(file,kind);if(problem)throw new Error(problem);
  if(kind==='image'){
   const image=await createImageBitmap(file);
   const tooLarge=image.width>4096||image.height>4096;image.close();
   if(tooLarge)throw new Error('Resize photographs to at most 4,096 pixels on each side before uploading.');
  }
  if(kind==='captions'&&!/^\uFEFF?WEBVTT(?:[ \t\r\n]|$)/.test(await file.text()))throw new Error('Choose a valid WebVTT caption file beginning with WEBVTT.');
  const contentType=kind==='captions'?'text/vtt':file.type;
  const allowed=kind==='image'?['image/jpeg','image/png','image/webp','image/avif']:kind==='video'?['video/mp4','video/webm']:['text/vtt'];
  if(!allowed.includes(contentType))throw new Error('This file type is not supported.');
  const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','video/mp4':'mp4','video/webm':'webm','text/vtt':'vtt'}[contentType];
  const path=`${kind}/${crypto.randomUUID()}.${extension}`;
  message.textContent='Uploading… keep this page open.';
  await result(db.storage.from(bucket).upload(path,file,{contentType,upsert:false}));
  target.value=db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  setDirty(true);message.textContent='Uploaded. Save the record to attach this media.';
  if(kind==='image'){let preview=box.querySelector('.admin-media-preview');if(!preview){preview=document.createElement('img');preview.className='admin-media-preview';preview.alt='Uploaded photograph';box.querySelector('.admin-upload').before(preview);}preview.src=target.value;}
 }catch(error){message.textContent=error.message;}finally{uploads--;input.disabled=false;input.value='';}
}
async function viewOrder(id){
 const [order,items]=await Promise.all([result(db.from('orders').select('*').eq('id',id).single()),result(db.from('order_items').select('*').eq('order_id',id))]);
 document.querySelector('#admin-body').innerHTML=`<div class="admin-order-detail"><button class="text-link" data-admin-action="back">← All orders</button><h2>Order ${esc(order.id.slice(0,8).toUpperCase())}</h2><p>${esc(order.status)} · ${money(order.total_paise)}</p><h3>Delivery details</h3><address>${Object.values(order.shipping).map(esc).join('<br>')}</address><h3>Items</h3>${items.map(i=>`<p>${esc(i.title)} × ${i.quantity} · ${money(i.unit_price_paise*i.quantity)}</p>`).join('')}<h3>Payment reference</h3><p>${esc(order.provider_order_id || 'Not linked')}<br>${esc(order.provider_payment_id || 'Not confirmed')}</p><small>Refunds and transfer settlement are managed in Razorpay. Payment status is verified by the server.</small></div>`;
}
function discard(){if(!dirty)return true;const yes=window.confirm('Leave this form and discard unsaved edits?');if(yes)setDirty(false);return yes;}
document.addEventListener('input',event=>{
 if(event.target.closest('#admin-record-form,#foundation-form'))setDirty(true);
 if(event.target.name==='slug')event.target.dataset.touched='true';
 if(event.target.name==='title' && !current?.id){
  const slug=event.target.form?.querySelector('[name=slug]');
  if(slug && !slug.dataset.touched)slug.value=event.target.value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 }
});
document.addEventListener('change',event=>{if(event.target.matches('[data-upload-target]'))upload(event.target);});
document.addEventListener('submit',async event=>{
 const form=event.target;event.preventDefault();
 if(form.id==='admin-record-form')saveRecord(form,event.submitter?.value || 'draft');
 if(form.id==='foundation-form')saveFoundation(form);
 if(form.id==='admin-auth-form'){
  if(!configured)return;
  const button=form.querySelector('button'),message=document.querySelector('#admin-auth-status');button.disabled=true;message.textContent='Checking your credentials…';
  try{
   const f=new FormData(form);
   await result(db.auth.signInWithPassword({email:String(f.get('email')).trim(),password:String(f.get('password'))}));
   form.querySelector('[name=password]').value='';signedInAt=Date.now();lastActivity=Date.now();await guard();
  }catch{message.textContent='Sign-in failed. Check your staff ID and password, then try again.';button.disabled=false;}
 }
 if(form.id==='staff-mfa-form'){
  const button=form.querySelector('button'),message=document.querySelector('#staff-mfa-status');button.disabled=true;
  try{await result(db.auth.mfa.challengeAndVerify({factorId:String(new FormData(form).get('factor')||factorId),code:String(new FormData(form).get('code'))}));form.querySelector('[name=code]').value='';await guard();}
  catch{message.textContent='The code could not be verified. Enter a current code and try again.';button.disabled=false;}
 }
});
document.addEventListener('click',async event=>{
 const el=event.target.closest('[data-tab],[data-admin-action]');if(!el)return;
 if(el.dataset.tab){if(!can('tab',el.dataset.tab))return status('This section is not available to your role.',true);if(!discard())return;tab=el.dataset.tab;page=0;current=el.dataset.new?{}:null;await render();return;}
 const action=el.dataset.adminAction;
 if(action==='enroll-mfa'){await enrollMfa(el);return;}
 try{
  if(action==='new'||action==='back'){if(!discard())return;current=action==='new'?{}:null;await render();}
  if(action==='edit'){if(!discard())return;const key=tab==='maker_payment_accounts'?'maker_id':'id';current=await result(db.from(tab).select('*').eq(key,el.dataset.id).single());await render();}
  if(action==='previous'||action==='next'){page+=action==='next'?1:-1;await render();}
  if(action==='archive'){if(!configured || !can('publish'))return;await result(db.from(tab).update({published:false}).eq('id',el.dataset.id));await render();status('Moved to draft. Existing orders and media are preserved.');}
  if(action==='signout'){if(!discard())return;await lockWorkspace();}
  if(action==='add-step'){const list=document.querySelector('#process-fields'),count=list.querySelectorAll('[data-step]').length;if(count>=12)return status('A process can contain up to 12 steps.',true);list.insertAdjacentHTML('beforeend',processFields({},count));setDirty(true);}
  if(action==='add-program'){const list=document.querySelector('#program-fields'),count=list.querySelectorAll('[data-program]').length;if(count>=12)return status('You can include up to 12 programs.',true);list.insertAdjacentHTML('beforeend',programFields({},count));setDirty(true);}
  if(action==='view-order')await viewOrder(el.dataset.id);
  if(action==='fulfil'){
   if(!can('operations'))return status('Only managers and super admins can update delivery status.',true);
   const updated=await result(db.from('orders').update({status:el.dataset.status}).eq('id',el.dataset.id).select('id'));
   if(!updated.length)throw new Error('This order’s status changed. Refresh before updating it.');await render();status('Order marked '+el.dataset.status+'.');
  }
 }catch(error){status(error.message,true);}
});
function warnUnsaved(event){event.preventDefault();event.returnValue='';}
function setDirty(value){dirty=value;if(value)window.addEventListener('beforeunload',warnUnsaved);else window.removeEventListener('beforeunload',warnUnsaved);}
window.addEventListener('pageshow',event=>{if(event.persisted)lockWorkspace();});
for(const type of ['pointerdown','keydown','wheel','touchstart'])window.addEventListener(type,()=>{lastActivity=Date.now();},{passive:true});
let lastAccessCheck=0;
setInterval(async()=>{
 if(!session||!signedInAt||!role||locking)return;
 const now=Date.now();
 if(now-signedInAt>=STAFF_MAX_MS || now-lastActivity>=STAFF_IDLE_MS){await lockWorkspace();return;}
 if(now-lastAccessCheck<60000)return;
 lastAccessCheck=now;
 try{
  await result(db.auth.getUser());
  const member=await result(db.from('admin_users').select('role,enabled').eq('user_id',session.user.id).maybeSingle());
  if(!member?.enabled||member.role!==role)await lockWorkspace();
 }catch{await lockWorkspace();}
},30000);
guard();
