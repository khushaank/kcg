// Staff authentication uses an independent, memory-only Supabase client.
export const STAFF_AUTH_OPTIONS = Object.freeze({
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
  storageKey: 'kcg-staff-memory',
});
export const STAFF_IDLE_MS = 15 * 60 * 1000;
export const STAFF_MAX_MS = 30 * 60 * 1000;
export const ROLE_NAMES = { super_admin: 'Super admin', manager: 'Manager', editor: 'Editor' };
export function mfaQrSource(value) {
  if (typeof value !== 'string') return '';
  const prefix='data:image/svg+xml;utf-8,';
  const svg=(value.startsWith(prefix) ? value.slice(prefix.length) : value).trim();
  // Supabase's SVG generator includes an XML declaration and an SVGo comment.
  const isSvg=/^(?:<\?xml\b[^?]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg(?=[\s>])/.test(svg);
  return isSvg ? 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg) : '';
}
const content = ['makers','products','journal_posts','gallery_items'];
export function staffCan(role,action,table) {
  if (!Object.hasOwn(ROLE_NAMES,role)) return false;
  if (action === 'tab') return table === 'overview' || content.includes(table) || (role !== 'editor' && ['foundation','orders','enquiries','newsletter_subscribers'].includes(table)) || (role === 'super_admin' && table === 'maker_payment_accounts');
  if (action === 'draft') return content.includes(table);
  if (action === 'publish') return role !== 'editor' && content.includes(table);
  if (action === 'foundation' || action === 'operations') return role !== 'editor';
  if (action === 'payouts') return role === 'super_admin';
  return false;
}
