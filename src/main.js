import {errorMessage,UserFacingError,showSiteError} from './reliability.js';
import {deliveredImage,withResponsiveImages,prioritizeLeadImage} from './image-delivery.js';
import {pageSeo,updateDetailSeo} from './seo.js';
import {siteHeader,siteFooter,contactPage,legalPage,galleryPage,journalCard,collectionPage} from './public-pages.js';
import './style.css';
import './heritage.css';
import { configured, db,contentDb,result, checkout,submitPublicForm } from './backend.js';
import { previewMakers, previewProducts } from './data.js';
import { normalizeCart, mergeCarts, cartLines, cartTotal, money,reconcileCart } from './cart.js';
import { foundationDefaults, foundationGalleryDefaults, mergeFoundation } from './content.js';
import { foundationHome, foundationStory, foundationPrograms, makerProduct, makerDirectory } from './experience.js';
import {loadPublicData} from './public-data.js';
import {siteImage,imageAlt,imageCredit} from './site-images.js';

import {icon,esc,link,sectionHead} from './ui.js';
const imageUrl = value => {
  if(!value)return '/images/image-placeholder.svg';
  try { const u = new URL(deliveredImage(value), location.origin); return ['https:', 'http:'].includes(u.protocol) ? esc(u.href) : '/images/image-placeholder.svg'; } catch { return '/images/image-placeholder.svg'; }
};
const page = location.pathname.split('/').pop()?.replace('.html', '') || 'index';
const needsCommerce = ['shop','product','makers','checkout','account'].includes(page);
const params = new URLSearchParams(location.search);
let makers = [], products = [], posts = [], session = null, catalogError = '';
let site = foundationDefaults;
let galleryItems = foundationGalleryDefaults;
let cart = readCart(), activeCategory = params.get('category') || 'All pieces', sort = 'featured', search = params.get('q') || '';
let cartSave = Promise.resolve(), cartLoadedFor = '', checkoutKey = '', lastFocus;
function readCart() { try { return normalizeCart(JSON.parse(localStorage.getItem('kcg-cart') || '[]')); } catch { return []; } }
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('visible'), 4500); }
function showError(el, error) { el.textContent = errorMessage(error); el.hidden = false; }
const makerFor = p => makers.find(m => m.id === p.maker_id);
const productHref = p => `product.html?piece=${encodeURIComponent(p.slug)}`;
const makerHref = m => `makers.html?maker=${encodeURIComponent(m.id)}`;
const experienceContext = () => ({site,makers,products,posts,esc,imageUrl,imageAlt,imageCredit,icon,link,sectionHead,postCard,card,money,makerHref,productHref,previewNote});
function previewNote() { return !configured ? '<p class="preview-note">Illustrative collection · Sample pieces, prices and studio profiles. Purchases open with our real maker collection.</p>' : ''; }

function header(){return siteHeader({site,page,galleryItems,imageUrl});}
function footer(){return siteFooter({site,page,galleryItems,imageUrl});}
function card(p) {
  const m = makerFor(p);
  return withResponsiveImages(`<article class="product-card"><div class="product-visual"><a href="${productHref(p)}" aria-label="Discover ${esc(p.title)}"><img draggable="false" src="${imageUrl(p.image)}" alt="${esc(p.title)}${p.is_preview ? ' — illustrative photograph' : ''}" loading="lazy" width="650" height="780"></a><span class="product-tag">${esc(p.tag || 'Made by hand')}</span><button class="quick-add" data-action="add" data-id="${esc(p.id)}" aria-label="Add ${esc(p.title)} to bag" ${p.stock < 1 ? 'disabled' : ''}>${p.stock < 1 ? 'Sold out' : `Add to bag ${icon('bag')}`}</button></div><div class="product-meta"><span>${esc(p.category)}</span><span>${esc(p.origin || m?.location || 'India')}</span></div><div class="product-title-row"><h3><a href="${productHref(p)}">${esc(p.title)}</a></h3><span>${money(p.price_paise)}</span></div>${m ? `<a class="maker-byline" href="${makerHref(m)}">${m.portrait_url ? `<img draggable="false" src="${imageUrl(m.portrait_url)}" alt="${esc(m.name)}" loading="lazy">` : `<span class="tiny-avatar">${icon('user')}</span>`}<span>Meet ${esc(m.name)}<small>${esc(m.craft)}</small></span>${icon('arrow')}</a>` : ''}</article>`);
}
function home() { return foundationHome(experienceContext()); }
function emptyCatalog() { return `<div class="empty-state"><span class="empty-icon">${icon('leaf')}</span><h2>${catalogError ? 'The collection is temporarily unavailable.' : 'Our maker collection is being prepared.'}</h2><p>${catalogError ? esc(catalogError) : 'We’ll share each maker’s work here once their story, making film and products are ready.'}</p>${link('contact.html','Talk to our team')}</div>`; }
function shop(){return collectionPage({products,activeCategory,search,previewNote});}
function updateShop() {
  const filtered = products.filter(p => (activeCategory === 'All pieces' || p.category === activeCategory) && `${p.title} ${p.materials} ${makerFor(p)?.name || ''}`.toLowerCase().includes(search.toLowerCase()));
  if (sort !== 'featured') filtered.sort((a,b) => sort === 'name' ? a.title.localeCompare(b.title) : (a.price_paise - b.price_paise) * (sort === 'high' ? -1 : 1));
  document.querySelector('#shop-results').innerHTML = filtered.map(card).join('') || (products.length ? '<div class="empty-state"><h2>No pieces found.</h2><p>Try another craft or search term.</p><button class="button outline" data-action="reset-filters">Clear filters</button></div>' : emptyCatalog());
  document.querySelector('#result-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'piece' : 'pieces'}`;
  document.querySelectorAll('[data-category]').forEach(el => { el.classList.toggle('active', el.dataset.category === activeCategory); el.setAttribute('aria-pressed', String(el.dataset.category === activeCategory)); });
}
function product() {
  const p=products.find(p=>p.slug===params.get('piece'));
  if(!p)return notFound('This piece isn’t in the collection right now.','Discover the rest of our maker collection.');
  document.title=p.title+' — KCG Foundation';
  return makerProduct(p,makerFor(p),experienceContext());
}
function makersPage() {
  const m=makers.find(m=>m.id===params.get('maker'));
  if(params.has('maker')&&!m)return notFound('This maker’s story is coming soon.','Meet the rest of our maker community.');
  return makerDirectory(experienceContext(),m);
}
function postCard(p){return journalCard(p,{imageUrl});}
// Existing journal bodies are converted to a small, inert set of editorial tags.
function safeArticle(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['P','H2','H3','UL','OL','LI','STRONG','EM','BR']);
  const clean = node => node.nodeType === Node.TEXT_NODE ? esc(node.textContent) : (node.nodeType !== Node.ELEMENT_NODE ? '' : (allowed.has(node.tagName) ? `<${node.tagName.toLowerCase()}>${[...node.childNodes].map(clean).join('')}</${node.tagName.toLowerCase()}>` : ''));
  return [...doc.body.childNodes].map(clean).join('');
}
function journal() {
  const p = posts.find(p=>p.slug===params.get('story'));
  if (params.has('story') && !p) return notFound('We couldn’t find that story.','There are more stories waiting in the journal.');
  if (p) return `<article class="article-page"><div class="page-intro"><a class="eyebrow" href="blog.html">← THE JOURNAL</a><h1>${esc(p.title)}</h1><p>${esc(p.date)} · ${esc(p.category)} · ${esc(p.readingTime)}</p></div><figure class="article-visual"><img draggable="false" class="article-image" src="${imageUrl(p.featuredImage)}" alt="${esc(imageAlt(p.featuredImage,p.title))}">${imageCredit(p.featuredImage)}</figure><div class="prose">${safeArticle(p.content)}</div></article>`;
  return `<section class="page-intro"><span class="eyebrow">THE KCG JOURNAL</span><h1>A little more <em>good.</em></h1><p>From community care to brighter classrooms.<br>Stories from the work, and the people at its heart.</p></section><section class="section"><h2 class="sr-only">Community stories</h2><div class="journal-grid">${posts.map(postCard).join('') || '<p>Our next story is on its way.</p>'}</div></section>`;
}
function about() { return foundationStory(experienceContext()); }
function programs() { return foundationPrograms(experienceContext()); }
function contact(){return contactPage({site,page,galleryItems,imageUrl});}
function account() { return `<section class="page-intro compact"><span class="eyebrow">YOUR KCG CORNER</span><h1>A more personal <em>connection.</em></h1><p>Your bag, your orders, and the stories you’re part of.</p></section><section class="section account-section" id="account-content">${authPanel()}</section>`; }
function authPanel() { return `<div class="auth-card">${icon('user')}<h2>Welcome to KCG.</h2><p>We’ll send a secure sign-in link to your inbox. No password to remember.</p><form method="post" id="auth-form"><label>Email address<input type="email" name="email" autocomplete="email" required placeholder="you@example.com" maxlength="254"></label><button class="button primary">Email me a sign-in link ${icon('arrow')}</button><p class="form-status" role="status"></p></form><small>By continuing, you agree to our <a href="terms.html">terms</a> and <a href="privacy.html">privacy policy</a>.</small>${!configured ? '<p class="preview-note">Account access opens when the live collection launches.</p>':''}</div>`; }
async function renderAccount() {
  const el = document.querySelector('#account-content'); if (!el || !session) return;
  el.innerHTML = `<div class="account-heading"><div><span class="eyebrow">YOU’RE PART OF THE STORY</span><h2>Welcome back.</h2><p>${esc(session.user.email)}</p></div><button class="button outline" data-action="sign-out">Sign out</button></div><h3>Your orders</h3><div id="orders"><p>Finding your orders…</p></div>`;
  try {
    const orders = await result(db.from('orders').select('id,status,total_paise,created_at,order_items(title,quantity,unit_price_paise)').order('created_at',{ascending:false}));
    document.querySelector('#orders').innerHTML = orders.length ? orders.map(o=>`<article class="order-card"><div><strong>Order ${esc(o.id.slice(0,8).toUpperCase())}</strong><span class="order-status">${esc(o.status.replaceAll('_',' '))}</span></div><p>${new Date(o.created_at).toLocaleDateString('en-IN')} · ${money(o.total_paise)}</p>${o.order_items.map(i=>`<p>${esc(i.title)} × ${i.quantity} <span>${money(i.unit_price_paise*i.quantity)}</span></p>`).join('')}<small>${o.status==='paid' ? 'Payment received. Maker bank settlement follows the payment provider’s schedule.' : o.status==='pending_payment' ? 'Payment has not been confirmed. Please contact us if you need help.' : 'Contact us with your order reference for help.'}</small>${o.status==='pending_payment' ? `<button class="button outline resume-payment" data-action="resume-payment" data-id="${esc(o.id)}">Continue payment ${icon('lock')}</button><p class="form-status" role="status"></p>` : ''}</article>`).join('') : `<div class="empty-state"><h2>Your story starts here.</h2><p>You haven’t placed an order yet.</p>${link('shop.html','Explore the collection','button primary')}</div>`;
  } catch (e) { showError(document.querySelector('#orders'),e); }
}
function checkoutPage() { if(catalogError)return unavailable('Your bag is saved, but we couldn’t load current product information. Refresh before continuing to payment.'); return `<section class="page-intro compact"><span class="eyebrow">ONE THOUGHTFUL STEP AWAY</span><h1>From their hands.<br><em>To your home.</em></h1></section><section class="section checkout-layout"><div id="checkout-main">${session || !configured ? shippingForm() : authPanel()}</div><aside class="checkout-summary" id="checkout-summary"></aside></section>`; }
function shippingForm() { return `<div class="checkout-steps"><span class="done">01 · Your account ${icon('check')}</span><span>02 · Delivery</span><span>03 · Secure payment</span></div><h2>The place it will call home.</h2><p>${session ? `Signed in as ${esc(session.user.email)}` : `Preview checkout · No details are sent and no payment is taken.`}</p><form method="post" id="shipping-form"><label>Full name<input name="name" required autocomplete="shipping name" maxlength="120"></label><div class="form-row"><label>Phone number<input name="phone" type="tel" required autocomplete="shipping tel" pattern="[+]?[0-9 ()-]{10,18}" maxlength="18" placeholder="+91"></label><label>PIN code<input name="pincode" required autocomplete="shipping postal-code" inputmode="numeric" pattern="[1-9][0-9]{5}" maxlength="6" placeholder="6-digit PIN"></label></div><label>Street address<input name="address" required autocomplete="shipping street-address" minlength="5" maxlength="300"></label><div class="form-row"><label>City<input name="city" required autocomplete="shipping address-level2" maxlength="100"></label><label>State / Union territory<select name="state" required autocomplete="shipping address-level1"><option value="">Choose a state</option>${['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'].map(s=>`<option>${s}</option>`).join('')}</select></label></div><p class="delivery-country">Delivering within India · Delivery included</p><label class="consent"><input type="checkbox" required> I agree to the <a href="terms.html">shopping & return terms</a> and <a href="privacy.html">privacy policy</a>.</label><button class="button primary" ${!configured ? 'disabled':''}>Continue to secure payment ${icon('lock')}</button><p class="form-status" role="status"></p></form>`; }
function updateCheckout() {
  const el = document.querySelector('#checkout-summary'); if (!el) return;
  const lines = cartLines(cart,products);
  el.innerHTML = `<span class="eyebrow">YOUR THOUGHTFUL CHOICES</span><h2>In your bag <span>(${lines.reduce((s,l)=>s+l.quantity,0)})</span></h2>${lines.map(l=>`<div class="summary-line"><img draggable="false" src="${imageUrl(l.product.image)}" alt="${esc(l.product.title)}"><div><strong>${esc(l.product.title)}</strong><span>${esc(makerFor(l.product)?.name || '')}</span><small>Quantity: ${l.quantity}</small></div><span>${money(l.product.price_paise*l.quantity)}</span></div>`).join('')}<div class="price-row"><span>Subtotal</span><span>${money(cartTotal(lines))}</span></div><div class="price-row"><span>Delivery</span><span>Included</span></div><div class="price-row total"><span>Total · INR</span><span>${money(cartTotal(lines))}</span></div><p class="maker-promise">${icon('heart')} Product value allocated to the makers.<br>Zero foundation commission.</p><button class="text-link" data-action="open-cart">Edit your bag ${icon('arrow')}</button>${previewNote()}`;
  if (!lines.length) document.querySelector('#checkout-main').innerHTML = `<div class="empty-state"><h2>Let’s find something you love.</h2><p>Your bag is currently empty.</p>${link('shop.html','Explore the collection','button primary')}</div>`;
}
function legal(){return legalPage({site,page,galleryItems,imageUrl});}
function gallery(){return galleryPage({site,page,galleryItems,imageUrl});}
function notFound(title='A little off the beaten path.',desc='Let’s help you find your way back.') { return `<section class="page-intro not-found"><span class="eyebrow">KCG FOUNDATION</span><h1>${title}</h1><p>${desc}</p>${link('shop.html','Explore the collection','button primary')}</section>`; }
function overlay() { return `<dialog id="cart-dialog" class="cart-dialog" aria-labelledby="cart-title"><div class="cart-drawer"><div class="drawer-header"><div><span class="eyebrow">GOOD CHOICES, GATHERED</span><h2 id="cart-title">Your bag <span id="drawer-count"></span></h2></div><button class="icon-button" data-action="close-cart" aria-label="Close shopping bag">${icon('close')}</button></div><div id="cart-items"></div><div id="cart-bottom"></div></div></dialog><div id="toast" class="toast" role="status" aria-live="polite"></div>`; }
function updateCart() {
  const lines = cartLines(cart,products), count = lines.reduce((s,l)=>s+l.quantity,0);
  document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
  document.querySelector('#drawer-count').textContent = `(${count})`;
  document.querySelector('#cart-items').innerHTML = lines.length ? lines.map(l=>`<article class="cart-line"><a href="${productHref(l.product)}"><img draggable="false" src="${imageUrl(l.product.image)}" alt="${esc(l.product.title)}"></a><div class="cart-line-copy"><h3><a href="${productHref(l.product)}">${esc(l.product.title)}</a></h3><p>By ${esc(makerFor(l.product)?.name || 'our maker')}</p><span>${money(l.product.price_paise)}</span><div class="quantity-controls"><button data-action="quantity" data-id="${esc(l.product_id)}" data-delta="-1" aria-label="Decrease quantity of ${esc(l.product.title)}">−</button><span aria-live="polite">${l.quantity}</span><button data-action="quantity" data-id="${esc(l.product_id)}" data-delta="1" aria-label="Increase quantity of ${esc(l.product.title)}" ${l.quantity >= Math.min(l.product.stock,10) ? 'disabled' : ''}>+</button></div></div><button class="remove-item" data-action="remove" data-id="${esc(l.product_id)}" aria-label="Remove ${esc(l.product.title)}">${icon('close')}</button></article>`).join('') : `<div class="empty-bag"><h3>${catalogError?'Your bag is saved.':'Your bag is empty.'}</h3><p>${catalogError?'Product information is temporarily unavailable. Refresh before checking out.':'Discover the pieces made by our maker community.'}</p>${link('shop.html',catalogError?'Refresh collection':'Explore the collection','button primary')}</div>`;
  document.querySelector('#cart-bottom').innerHTML = lines.length ? `<div class="price-row total"><span>Subtotal</span><span>${money(cartTotal(lines))}</span></div><p class="cart-delivery">Delivery included within India.</p><a class="button primary checkout-link" href="checkout.html">${configured ? 'Continue to checkout' : 'Preview checkout'} ${icon('arrow')}</a><button class="continue-shopping" data-action="close-cart">Keep exploring</button><p class="maker-promise">${icon('heart')} Thoughtfully chosen. Maker first.</p>${previewNote()}` : '';
  if(catalogError&&cart.length)document.querySelector('#cart-bottom').innerHTML='<p class="cart-delivery">Your bag is saved. Refresh to load current prices before payment.</p><a class="button primary" href="shop.html">Refresh collection</a>';
  updateCheckout();
}
function saveCart() {
  checkoutKey = '';
  try { localStorage.setItem('kcg-cart',JSON.stringify(cart)); } catch { toast('Your browser could not save the bag. Keep this tab open.'); }
  updateCart();
  if (session && configured && !catalogError) {
    const user_id = session.user.id, snapshot = [...cart];
    try { localStorage.setItem('kcg-cart-owner',user_id); localStorage.setItem('kcg-cart-dirty','1'); } catch {}
    cartSave = cartSave.catch(()=>{}).then(async()=>{
      await result(db.from('carts').upsert({user_id, items:snapshot, updated_at:new Date().toISOString()}));
      try { if(localStorage.getItem('kcg-cart')===JSON.stringify(snapshot))localStorage.removeItem('kcg-cart-dirty'); } catch {}
    }).catch(()=>toast('Your bag is saved on this device. Account sync is temporarily unavailable.'));
  }
}
function openCart() { lastFocus = document.activeElement; document.querySelector('#cart-dialog').showModal(); document.body.classList.add('dialog-open'); }
function closeCart() { document.querySelector('#cart-dialog').close(); }
function addItem(id,quantity=1) {
  if(catalogError)return toast('Please refresh the collection before adding a piece. Your saved bag has been kept.');
  const p = products.find(p=>p.id===id); if (!p || !Number.isInteger(quantity) || quantity < 1) return toast('Please choose a valid quantity.');
  const old = cart.find(l=>l.product_id===id), qty = (old?.quantity || 0) + quantity;
  if (!old && cart.length >= 30) return toast('For more than 30 different pieces, please contact our team.');
  if (qty > Math.min(p.stock,10)) return toast('That’s more than the available quantity.');
  if (old) old.quantity=qty; else cart.push({product_id:id,quantity});
  saveCart(); openCart();
}
async function loadUserCart() {
  if (!session || catalogError || cartLoadedFor === session.user.id) return;
  cartLoadedFor = session.user.id;
  try {
    const saved = await result(db.from('carts').select('items').eq('user_id',session.user.id).maybeSingle());
    let owner='', dirty=false;
    try { owner=localStorage.getItem('kcg-cart-owner') || ''; dirty=localStorage.getItem('kcg-cart-dirty')==='1'; } catch {}
    const source=owner===session.user.id ? (dirty ? cart : (saved?.items ?? cart)) : owner ? (saved?.items || []) : mergeCarts(saved?.items,cart);
    cart = normalizeCart(source).filter(l=>products.some(p=>p.id===l.product_id)).map(l=>({...l,quantity:Math.min(l.quantity,products.find(p=>p.id===l.product_id).stock)})).filter(l=>l.quantity>0);
    saveCart();
  } catch { toast('Your account bag could not be loaded. Your device bag is still here.'); }
}
async function submitAuth(form) {
  const status = form.querySelector('.form-status');
  if (!configured) return showError(status,new UserFacingError('Account access will open with the live collection. You can explore the preview without signing in.'));
  const button = form.querySelector('button'); button.disabled=true; status.textContent='Sending your secure link…';
  try {
    const redirect = new URL(page === 'checkout' ? 'checkout.html' : 'account.html',location.href);
    await result(db.auth.signInWithOtp({email:new FormData(form).get('email'),options:{emailRedirectTo:redirect.href}}));
    status.textContent='Your sign-in link is on its way. Check your inbox, then return here. You can request another link after a minute.';
  } catch(e) { showError(status,e); } finally { button.disabled=false; }
}
async function submitInquiry(form) {
  const status = form.querySelector('.form-status');
  if (!configured) return showError(status,new UserFacingError('Online enquiries are not open in this preview. Please email info@b2bindustrial.in or call +91 98997 02065.'));
  const button = form.querySelector('button'); button.disabled=true;
  const f = new FormData(form);
  try {
    await submitPublicForm({kind:'enquiry',name:f.get('name'),email:f.get('email'),topic:f.get('topic'),message:f.get('message'),website:f.get('website'),amount_paise:f.get('amount') ? Math.round(Number(f.get('amount'))*100) : null});
    form.reset(); status.textContent='Thank you. Your message is with the KCG team. We’ll be in touch by email.';
  } catch(e) { showError(status,e); } finally { button.disabled=false; }
}
async function submitNewsletter(form) {
  const status = form.querySelector('.form-status');
  if (!configured) return showError(status,new UserFacingError('Subscriptions open with the live site. Please check back soon.'));
  const button = form.querySelector('button'); button.disabled=true;
  try { await submitPublicForm({kind:'newsletter',email:new FormData(form).get('email'),website:new FormData(form).get('website')}); form.reset(); status.textContent='You’re on the list. Thank you for being part of the story.'; }
  catch(e) { status.textContent=e.code==='23505' ? 'This email is already on the list. Thank you for being here.' : 'We couldn’t save your subscription. Please try again.'; }
  finally { button.disabled=false; }
}
async function startPayment(form) {
  const status=form.querySelector('.form-status'), button=form.querySelector('button');
  if(catalogError)return showError(status,new UserFacingError('Product information is unavailable. Please refresh before paying.'));
  if (!configured || !session) return showError(status,new UserFacingError('Please sign in to continue.'));
  if (!cart.length) return showError(status,new UserFacingError('Your bag is empty.'));
  button.disabled=true; status.textContent='Preparing your secure checkout…';
  try {
    await cartSave;
    await loadPaymentWidget();
    const shipping=Object.fromEntries(new FormData(form));
    const fingerprint=JSON.stringify({items:cart,shipping});
    try {
      const saved=JSON.parse(sessionStorage.getItem('kcg-checkout') || 'null');
      checkoutKey=saved?.fingerprint===fingerprint && saved?.user===session.user.id ? saved.key : crypto.randomUUID();
      sessionStorage.setItem('kcg-checkout',JSON.stringify({fingerprint,key:checkoutKey,user:session.user.id}));
    } catch { checkoutKey ||= crypto.randomUUID(); }
    const data=await checkout({items:cart, shipping,idempotency_key:checkoutKey});
    openPayment(data,status,button,shipping);
  } catch(e) { showError(status,e);button.disabled=false; }
}
async function loadPaymentWidget() {
  if (!window.Razorpay) await new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';
    const fail=()=>{clearTimeout(timer);s.remove();reject(new UserFacingError('Payment could not load. Please check your connection and retry.'));};
    const timer=setTimeout(fail,15000);s.onload=()=>{clearTimeout(timer);window.Razorpay?resolve():fail();};s.onerror=fail;document.head.append(s);
  });
}
function openPayment(data,status,button,shipping={}) {
    const payment=new window.Razorpay({key:data.key_id,amount:data.amount,currency:'INR',name:'KCG Foundation',description:'Thoughtfully made. Maker first.',order_id:data.razorpay_order_id,prefill:{email:session.user.email,name:shipping.name,contact:shipping.phone},theme:{color:'#263e32'},modal:{ondismiss:()=>{status.textContent='Payment was closed. You can continue from your account whenever you’re ready.';button.disabled=false;}},handler:async response=>{
      status.textContent='Verifying your payment…';
      try {
        const verification=await result(db.functions.invoke('verify-payment',{body:{...response,order_id:data.order_id}}));
        if (!verification?.paid) throw new UserFacingError('Verification is still pending.');
        if(page==='checkout'){
          cart=[];saveCart();
          document.querySelector('#checkout-main').innerHTML=`<div class="payment-success">${icon('check')}<span class="eyebrow">A THOUGHTFUL CHOICE</span><h2>Thank you.<br><em>Your piece has a new story.</em></h2><p>Your payment of <strong>${money(data.amount)}</strong> is confirmed. Your order reference is <strong>${esc(data.order_id.slice(0,8).toUpperCase())}</strong>.</p><p>The product value is allocated to the makers. Bank settlement follows the payment provider’s schedule.</p>${link('account.html','View your order','button primary')}</div>`;
          document.querySelector('#checkout-summary').hidden=true;
        }else{await renderAccount();toast('Your payment is confirmed. Thank you for your thoughtful choice.');}
      } catch { status.textContent='Your payment is being checked. Please do not pay again. View your account or contact us with order '+data.order_id.slice(0,8).toUpperCase()+'.';button.disabled=false; }
    }});
    payment.on('payment.failed',()=>{status.textContent='Payment did not complete. You can retry securely. Your bag is saved.';button.disabled=false;});
    payment.open();
}
async function resumePayment(id,button) {
  const status=button.parentElement.querySelector('.form-status');
  button.disabled=true;status.textContent='Finding your payment…';
  try{await loadPaymentWidget();const data=await checkout({resume_order_id:id});openPayment(data,status,button,data.shipping);}
  catch(e){showError(status,e);button.disabled=false;}
}
function bindEvents() {
  document.addEventListener('click',async event=>{
    const category=event.target.closest('[data-category]');if(category){activeCategory=category.dataset.category;updateShop();return;}
    const el=event.target.closest('[data-action]'); if(!el) return;
    try{
    const action=el.dataset.action,id=el.dataset.id;
    if(action==='gallery-image'){
      const image=document.querySelector('#product-main-image');image.src=el.dataset.src;image.alt=el.dataset.alt;
      document.querySelector('#gallery-caption').textContent=el.dataset.caption;
      document.querySelectorAll('[data-action="gallery-image"]').forEach(button=>button.setAttribute('aria-pressed',String(button===el)));
    }
    if(action==='expand-gallery'){
      const image=document.querySelector('#product-main-image'),dialog=document.querySelector('#piece-lightbox');
      dialog.querySelector('img').src=image.src;dialog.querySelector('img').alt=image.alt;dialog.showModal();
    }
    if(action==='close-gallery')document.querySelector('#piece-lightbox').close();
    if(action==='load-film'){
      const frame=document.createElement('iframe');frame.src=el.dataset.src;frame.title=el.dataset.title;frame.allow='fullscreen; autoplay; encrypted-media';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';el.replaceWith(frame);
    }
    if(action==='open-cart') openCart();
    if(action==='close-cart') closeCart();
    if(action==='resume-payment') resumePayment(id,el);
    if(action==='add') addItem(id);
    if(action==='add-detail') addItem(id,Number(document.querySelector('#product-quantity').value));
    if(action==='remove'){cart=cart.filter(l=>l.product_id!==id);saveCart();}
    if(action==='quantity'){
      const item=cart.find(l=>l.product_id===id),p=products.find(p=>p.id===id);
      if(!item || !p)return;
      item.quantity=Math.max(0,Math.min(Math.min(p.stock,10),item.quantity+Number(el.dataset.delta)));
      cart=cart.filter(l=>l.quantity>0);saveCart();
      [...document.querySelectorAll('[data-action="quantity"]')].find(button=>button.dataset.id===id && button.dataset.delta===el.dataset.delta)?.focus();
    }
    if(action==='menu'){const nav=document.querySelector('.mobile-nav');nav.hidden=!nav.hidden;el.setAttribute('aria-expanded',String(!nav.hidden));}
    if(action==='reset-filters'){search='';activeCategory='All pieces';document.querySelector('#collection-search').value='';updateShop();}
    if(action==='sign-out'){
      el.disabled=true;
      const {error}=await db.auth.signOut();
      if(error){toast('Sign out failed. Please retry.');el.disabled=false;return;}
      session=null;cartLoadedFor='';cart=[];try{localStorage.removeItem('kcg-cart');localStorage.removeItem('kcg-cart-owner');localStorage.removeItem('kcg-cart-dirty');sessionStorage.removeItem('kcg-checkout');}catch{}location.href='account.html';
    }
    }catch(error){if(el instanceof HTMLButtonElement)el.disabled=false;toast(errorMessage(error));}
  });
  document.addEventListener('submit',event=>{const form=event.target;event.preventDefault();if(form.id==='auth-form')submitAuth(form);if(form.id==='contact-form')submitInquiry(form);if(form.id==='newsletter-form')submitNewsletter(form);if(form.id==='shipping-form')startPayment(form);});
  document.addEventListener('input',e=>{if(e.target.id==='collection-search'){search=e.target.value;updateShop();}});
  document.addEventListener('change',e=>{if(e.target.id==='sort'){sort=e.target.value;updateShop();}});
  const dialog=document.querySelector('#cart-dialog');
  dialog.addEventListener('click',e=>{if(e.target===dialog && e.clientX < dialog.getBoundingClientRect().left)closeCart();});
  dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');lastFocus?.focus();});
  window.addEventListener('storage',event=>{if(event.key==='kcg-cart'){cart=readCart();updateCart();}});
}
function unavailable(message){return '<section class="page-intro"><span class="eyebrow">KCG FOUNDATION</span><h1>This page is temporarily unavailable.</h1><p>'+esc(message)+'</p><a class="button primary" href="'+esc(location.pathname+location.search)+'">Refresh page</a></section>';}
function viewSignature(value){return JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);}
async function init() {
  const shell=document.querySelector('#app');
  const cached=document.querySelector('#public-snapshot');
  let initial=null,eventsBound=false;
  if(cached){try{initial=JSON.parse(cached.textContent);site=mergeFoundation(initial.site);makers=initial.makers || [];products=initial.products || [];posts=initial.posts || [];galleryItems=initial.galleryItems || foundationGalleryDefaults;}catch{initial=null;}}
  const firstSignature=initial?viewSignature({site,makers,products,posts,galleryItems}):'';
  if(initial){shell.insertAdjacentHTML('beforeend',overlay());if(needsCommerce)catalogError='Current availability is being checked.';bindEvents();eventsBound=true;updateCart();}
  else shell.innerHTML=`${header()}<main id="main" class="page-pending" aria-busy="true"></main>${overlay()}`;
  let pageError='';
  if(configured){
    const snapshot=await loadPublicData(contentDb,page,params,db.auth,initial || {});
    ({makers,products,posts,site,galleryItems,session,catalogError,pageError}=snapshot);
  }else{
    makers=previewMakers;products=previewProducts;
    try{const response=await fetch('/blog-posts.json',{signal:AbortSignal.timeout(8000)});if(response.ok)posts=await response.json();}catch{posts=[];}
  }
  if(needsCommerce)cart=reconcileCart(cart,products,!catalogError);
  const routes={index:home,shop,product,makers:makersPage,about,mission:about,programs,blog:journal,pulse:journal,contact,volunteer:contact,donate:contact,account,checkout:checkoutPage,privacy:legal,terms:legal,gallery,'404':notFound};
  document.querySelector('.announcement').innerHTML=`<span>Education, nutrition & community care · ${esc(site.location)}</span><span class="announcement-right">${esc(site.tagline)} ${icon('leaf')}</span>`;
  const main=document.querySelector('#main');
  if(pageError&&initial&&!params.has('maker')&&!params.has('story')){showSiteError('The latest content could not be loaded. The last published version is shown. Please refresh later.');pageError='';}
  const changed=!initial || firstSignature!==viewSignature({site,makers,products,posts,galleryItems}) || params.has('maker') || params.has('story');
  const editing=document.activeElement?.matches('input,textarea,select');
  if(changed&&!editing){let content=pageError?unavailable(pageError):(routes[page]||notFound)();if(['programs','blog','gallery'].includes(page))content=prioritizeLeadImage(content);main.innerHTML=withResponsiveImages(content);}
  main.classList.remove('page-pending');main.setAttribute('aria-busy','false');
  if(!initial)shell.insertAdjacentHTML('beforeend',footer());
  if(!eventsBound)bindEvents();updateCart();
  document.querySelectorAll('.making-film video').forEach(video=>{const failure=()=>{const message=video.parentElement.querySelector('.film-error');if(message)message.hidden=false;};video.addEventListener('error',failure);video.querySelectorAll('source').forEach(source=>source.addEventListener('error',failure));});
  if(location.hash)try{document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();}catch{/* Ignore malformed fragment links. */}
  if(page==='index'){document.title=pageSeo.index[0];}
  updateDetailSeo({page,params,products,makers,posts});
  if(page==='shop'){updateShop();if(params.has('q'))document.querySelector('#collection-search').focus();}
  if(params.has('topic') && document.querySelector('[name=topic]'))document.querySelector('[name=topic]').value=params.get('topic');
  if(session && needsCommerce){await loadUserCart();renderAccount();}
  if(db&&needsCommerce)db.auth.onAuthStateChange((event,newSession)=>{
    session=newSession;
    if(event==='SIGNED_OUT'){
      cartLoadedFor='';cart=[];
      try{localStorage.removeItem('kcg-cart');localStorage.removeItem('kcg-cart-owner');localStorage.removeItem('kcg-cart-dirty');}catch{}
      updateCart();
      if(page==='account')document.querySelector('#account-content').innerHTML=authPanel();
      if(page==='checkout')document.querySelector('#checkout-main').innerHTML=authPanel();
    }
    if(event==='SIGNED_IN' && needsCommerce)setTimeout(async()=>{await loadUserCart();renderAccount();if(page==='checkout'&&cart.length){document.querySelector('#checkout-main').innerHTML=shippingForm();updateCheckout();}},0);
  });
}
init().catch(()=>{const main=document.querySelector('#main');if(document.querySelector('#public-snapshot')){showSiteError('Interactive features could not finish loading. You can keep reading, or refresh the page.');return;}if(main){main.classList.remove('page-pending');main.setAttribute('aria-busy','false');main.innerHTML=unavailable('Please refresh or contact the foundation if this continues.');}});
