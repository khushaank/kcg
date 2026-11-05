export function mediaSource(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const source = value.trim();
  if (/^\/(?!\/)/.test(source)) return source;
  try {
    const url = new URL(source);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname)) ? url.href : '';
  } catch { return ''; }
}
export function filmEmbed(value) {
  try {
    const u = new URL(value);
    if (!['https:','http:'].includes(u.protocol)) return '';
    if (['youtube.com','www.youtube.com','youtu.be','www.youtu.be'].includes(u.hostname)) {
      const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v');
      return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` : '';
    }
    if (['vimeo.com','www.vimeo.com'].includes(u.hostname) && /^\/\d+$/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}?dnt=1&autoplay=1`;
  } catch { /* Unsupported URLs are handled as direct media files. */ }
  return '';
}
