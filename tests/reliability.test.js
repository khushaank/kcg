import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boundedFetch,errorMessage,UserFacingError} from '../src/reliability.js';

test('request cancellation reaches fetch without retrying a write',async()=>{
 const previous=globalThis.fetch,controller=new AbortController();let calls=0;
 globalThis.fetch=async(input,options)=>{calls++;assert.equal(options.method,'POST');assert.equal(options.signal.aborted,true);throw options.signal.reason;};
 controller.abort(new DOMException('Cancelled','AbortError'));
 try{await assert.rejects(boundedFetch('https://example.com',{method:'POST',signal:controller.signal}),{name:'AbortError'});assert.equal(calls,1);}finally{globalThis.fetch=previous;}
});
test('errors provide recovery advice without exposing internal database details',()=>{
 assert.match(errorMessage({code:'42501',message:'private role table detail'}),/Sign in again/);
 assert.match(errorMessage(new DOMException('Timed out','TimeoutError')),/took too long/);
 assert.match(errorMessage({status:429}),/wait a minute/);
 assert.match(errorMessage({message:'Failed to fetch'}),/connection/);
 assert.ok(!errorMessage(new Error('database password=private')).includes('private'));
 assert.equal(errorMessage(new UserFacingError('Please choose a valid quantity.')),'Please choose a valid quantity.');
});
