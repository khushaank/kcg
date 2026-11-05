export const STAFF_PAGE='seva-karyalaya-7c9e4b2d.html';
export function securityHeaders(pathname='/',supabaseUrl='',{dev=false,https=true}={}){
 let backend='';
 try{const url=new URL(supabaseUrl);if(url.protocol==='https:')backend=url.origin;}catch{}
 const payment=/\/(account|checkout)\.html$/.test(pathname);
 const csp=[
  "default-src 'self'",
  `script-src 'self'${payment?' https://checkout.razorpay.com https://cdn.razorpay.com':''}`,
  "script-src-attr 'none'",
  `style-src 'self' https://fonts.googleapis.com${dev||payment?" 'unsafe-inline'":''}`,
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' https: data:",
  "media-src 'self' https: blob:",
  `connect-src 'self'${backend?' '+backend:''}${dev?' ws://localhost:* ws://127.0.0.1:*':''}${payment?' https://*.razorpay.com':''}`,
  `frame-src https://www.youtube-nocookie.com https://player.vimeo.com${payment?' https://*.razorpay.com':''}`,
  "object-src 'none'","base-uri 'none'","form-action 'self'","frame-ancestors 'none'",
  ...(https&&!dev?['upgrade-insecure-requests']:[]),
 ].join('; ');
 const headers={
  'Content-Security-Policy':csp,
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), usb=(), serial=(), unload=()',
  'Cross-Origin-Opener-Policy':'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy':'same-origin',
 };
 if(https&&!dev)headers['Strict-Transport-Security']='max-age=31536000';
 if(pathname.endsWith('/'+STAFF_PAGE)||payment){headers['Cache-Control']='no-store, max-age=0';headers['X-Robots-Tag']='noindex, nofollow, noarchive';}
 if(pathname.endsWith('/'+STAFF_PAGE))headers['Referrer-Policy']='same-origin';
 return headers;
}
export function hostingHeaderFiles(supabaseUrl){
 const general=securityHeaders('/',supabaseUrl),payment=securityHeaders('/checkout.html',supabaseUrl);
 // Same CSP on all public pages allows the payment SDK only from its named hosts.
 // This avoids conflicting CSP headers when a static host merges wildcard rules.
 const common={...general,'Content-Security-Policy':payment['Content-Security-Policy']};
 const section=(path,headers)=>path+'\n'+Object.entries(headers).map(([k,v])=>'  '+k+': '+v).join('\n')+'\n';
 const extra={'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive'};
 const staff=securityHeaders('/'+STAFF_PAGE,supabaseUrl);
 // Staff CSP intersects the common policy: no payment scripts or inline styles in admin.
 const staffExtra={...extra,'Referrer-Policy':'same-origin','Content-Security-Policy':staff['Content-Security-Policy']};
 const headers=section('/*',common)+'\n'+section('/'+STAFF_PAGE,staffExtra)+'\n'+section('/account.html',extra)+'\n'+section('/checkout.html',extra);
 const apache='<IfModule mod_headers.c>\n'+Object.entries(common).map(([k,v])=>'  Header always set '+k+' "'+v+'"').join('\n')+'\n  <Files "'+STAFF_PAGE+'">\n'+Object.entries(staffExtra).map(([k,v])=>'    Header always set '+k+' "'+v+'"').join('\n')+'\n  </Files>\n  <FilesMatch "^(account|checkout)\\.html$">\n    Header always set Cache-Control "no-store, max-age=0"\n    Header always set X-Robots-Tag "noindex, nofollow, noarchive"\n  </FilesMatch>\n</IfModule>\nOptions -Indexes\nErrorDocument 404 /404.html\n';
 return {headers,apache};
}
