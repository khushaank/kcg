const icons = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  leaf: '<path d="M20 4C9 2 2 8 5 15s16 5 15-11Z"/><path d="m4 21 12-12M10 15v-5m0 5h5"/>',
  hands: '<path d="m2 12 4-4 5 4 5-4 6 5-5 6-5-2-5 2-5-7Z"/><path d="m8 10 3-3h4l3 3M7 14l5 3"/>',
  heart: '<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 0 9 8 15 8-6 12-11 8-15Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  expand: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
};
export const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.leaf}</svg>`;
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const link = (url,label,cls='text-link') => '<a class="'+cls+'" href="'+url+'">'+label+icon('arrow')+'</a>';
export const sectionHead = (kicker,title,aside='') => '<div class="section-heading"><div><span class="eyebrow">'+kicker+'</span><h2>'+title+'</h2></div>'+aside+'</div>';
