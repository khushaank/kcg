import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadPublicData} from '../src/public-data.js';
import {reconcileCart} from '../src/cart.js';
import {mergeFoundation} from '../src/content.js';
import {siteImage,imageAlt,imageCredit} from '../src/site-images.js';

function source(rows={},fail=[]){
 const calls=[];
 const db={calls,auth:{getSession(){calls.push('auth');return Promise.resolve({data:{session:null},error:null});}},from(table){
  calls.push(table);
  return {one:false,select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},maybeSingle(){this.one=true;return this;},abortSignal(signal){assert.ok(signal instanceof AbortSignal);return this;},then(resolve,reject){const values=rows[table] || [];return Promise.resolve({data:this.one?values[0] || null:values,error:fail.includes(table)?new Error('Network unavailable'):null}).then(resolve,reject);}};
 }};
 return db;
}
test('foundation pages do not wait for customer auth or catalogue and tolerate journal failures',async()=>{
 const db=source({site_content:[{value:{name:'KCG Foundation',mission:'Our approved mission'}}]},['journal_posts']);
 const page=await loadPublicData(db,'index');
 assert.equal(page.site.mission,'Our approved mission');
 assert.deepEqual(page.posts,[]);assert.equal(page.pageError,'');
 assert.equal(db.calls.includes('auth'),false);assert.equal(db.calls.includes('products'),false);
});
test('a catalogue failure preserves successful requests and the saved bag',async()=>{
 const db=source({makers:[{id:'maker',name:'Approved maker'}]},['products']);
 const page=await loadPublicData(db,'shop');
 assert.equal(page.makers[0].name,'Approved maker');assert.ok(page.catalogError);
 const cart=[{product_id:'saved-piece',quantity:2}];
 assert.deepEqual(reconcileCart(cart,page.products,!page.catalogError),cart);
 assert.deepEqual(reconcileCart(cart,[{id:'saved-piece',stock:1}],true),[{product_id:'saved-piece',quantity:1}]);
});
test('rural illustrations only replace known stock assets and malformed foundation data is safe',()=>{
 assert.equal(siteImage('/images/education.jpg'),'/images/rural-learning-illustration.jpg');
 assert.match(imageAlt('/images/community.jpg','Old caption'),/AI-generated/);
 assert.ok(imageCredit('/images/rural-pottery-illustration.jpg'));
 assert.equal(siteImage('/images/Health-camp.jpg'),'/images/Health-camp.jpg');
 assert.equal(imageCredit('/images/Health-camp.jpg'),'');
 assert.equal(siteImage('images/cataract-operation.jpg'),'/images/rural-eye-care-illustration.jpg');
 assert.equal(siteImage('https://example.com/approved-maker.jpg'),'https://example.com/approved-maker.jpg');
 const site=mergeFoundation({phone:{bad:true},story:null,programs:[null,{title:'Education',image:'/images/education.jpg',description:'Learning together'}]});
 assert.equal(typeof site.phone,'string');assert.equal(typeof site.story,'string');assert.equal(site.programs.length,1);
 assert.equal(site.programs[0].image,'/images/rural-learning-illustration.jpg');
});
