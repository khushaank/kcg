export class UserFacingError extends Error {}

export function errorMessage(error,fallback='We couldn’t complete that action. Please try again or contact the foundation.'){
 if(error instanceof UserFacingError)return error.message;
 const code=String(error?.code || ''),message=String(error?.message || '');
 if(error?.name==='AbortError'||error?.name==='TimeoutError'||/timed? ?out/i.test(message))return 'The request took too long. Your entries are still here. Check your connection before trying again.';
 if(/fetch|network|offline/i.test(message))return 'The connection was interrupted. Your entries are still here. Please check your internet connection.';
 if(error?.status===429||/rate.limit|too many requests/i.test(message))return 'Too many requests. Please wait a minute before trying again.';
 if(['42501','PGRST301','PGRST302'].includes(code)||[401,403].includes(error?.status))return 'Your access could not be verified. Sign in again, or ask the director to check your assigned role.';
 if(code==='23505')return 'This record already exists. Check its email address or unique reference.';
 if(['23514','22001','22003','22P02','23502'].includes(code))return 'Some details do not meet the entry requirements. Check the required fields, sizes and number limits.';
 return fallback;
}

// Abort the actual request; never automatically retry writes or payments.
export function boundedFetch(input,options={},timeoutMs=20000){
 const signals=[options.signal || (input instanceof Request?input.signal:null),AbortSignal.timeout(timeoutMs)].filter(Boolean);
 return fetch(input,{...options,signal:AbortSignal.any(signals)});
}

export function showSiteError(message){
 let panel=document.querySelector('#site-error');
 if(!panel){panel=document.createElement('aside');panel.id='site-error';panel.className='site-error';panel.setAttribute('role','status');
  const text=document.createElement('p'),refresh=document.createElement('button'),contact=document.createElement('a'),close=document.createElement('button');
  refresh.textContent='Refresh page';refresh.addEventListener('click',()=>location.reload());contact.textContent='Contact KCG';contact.href='/contact.html';close.textContent='Dismiss';close.addEventListener('click',()=>panel.remove());
  panel.append(text,refresh,contact,close);document.body.append(panel);
 }
 panel.querySelector('p').textContent=message;
}

export function installErrorHandling(){
 window.addEventListener('unhandledrejection',()=>showSiteError('An action could not finish. Your entries have been kept. If you were paying, check your account before trying another payment.'));
 window.addEventListener('error',event=>{
  const image=event.target;
  if(image instanceof HTMLImageElement){if(!image.dataset.fallback){image.dataset.fallback='true';image.removeAttribute('srcset');image.src='/images/image-placeholder.svg';image.alt='Photograph currently unavailable';}return;}
  if(event.target===window)showSiteError('Something on this page could not finish. You can keep reading, or refresh the page.');
 },true);
 window.addEventListener('offline',()=>showSiteError('You are offline. Keep this page open to preserve your entries. Reconnect before submitting or paying.'));
 window.addEventListener('online',()=>{const text=document.querySelector('#site-error p');if(text?.textContent.startsWith('You are offline.'))document.querySelector('#site-error').remove();});
 if(navigator.onLine===false)showSiteError('You are offline. Keep this page open to preserve your entries. Reconnect before submitting or paying.');
}
