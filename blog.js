const BLOG_JSON_PATH = 'blog-posts.json';

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (err) {
    return dateString;
  }
}

function createBlogCard(post) {
  const card = document.createElement('article');
  card.className = 'blog-card reveal';
  card.innerHTML = `
    <div class="blog-card-image">
      <img src="${post.featuredImage}" alt="${post.title}" loading="lazy" />
      <span class="blog-card-chip">${post.category}</span>
    </div>
    <div class="blog-card-body">
      <div class="blog-card-meta">${formatDate(post.date)} · ${post.readingTime}</div>
      <h3>${post.title}</h3>
      <p>${post.excerpt}</p>
      <div class="blog-card-actions">
        <button class="btn btn-outline btn-small" onclick="openPulse('${post.slug}')">Read Full Article</button>
        <button class="btn btn-share" onclick="openShareModal('${escapeHtml(post.title)}', getPostUrl('${post.slug}'))">Share</button>
      </div>
    </div>
  `;
  return card;
}

function escapeHtml(value) {
  return value.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// TOC has been moved to the separate pulse page. The blog will provide post content
// to the pulse window via postMessage when requested.

function showBlogPost(slug) {
  // Open the Pulse viewer for the requested slug instead of in-page detail
  openPulse(slug);
}

function getPostUrl(slug) {
  const base = window.location.href.split('#')[0];
  return `${base}#${slug}`;
}
// Pulse window handling: open pulse.html and show an overlay on this page
let __pulseWindowRef = null;
function openPulse(slug) {
  const url = slug ? `pulse.html#${encodeURIComponent(slug)}` : 'pulse.html';
  try {
    __pulseWindowRef = window.open(url, '_blank');
  } catch (err) {
    __pulseWindowRef = null;
  }
  const overlay = document.getElementById('pulseOverlay');
  if (overlay) overlay.classList.add('active');
  // poll to remove overlay when pulse window is closed
  const t = setInterval(() => {
    if (!__pulseWindowRef || __pulseWindowRef.closed) {
      if (overlay) overlay.classList.remove('active');
      clearInterval(t);
      __pulseWindowRef = null;
    }
  }, 600);
}

function closePulseOverlay() {
  const overlay = document.getElementById('pulseOverlay');
  if (overlay) overlay.classList.remove('active');
}

// Respond to postMessage requests from the pulse page
window.addEventListener('message', (ev) => {
  const data = ev && ev.data;
  if (!data || !data.type) return;
  if (data.type === 'requestPostContent') {
    // return current post (if available) or the requested slug
    const post = window.__currentPost || (window.__blogPosts || []).find(p => p.slug === (location.hash || '').slice(1));
    const payload = post ? { type: 'postContent', post: { slug: post.slug, title: post.title, content: post.content } } : { type: 'postContent', post: null };
    // reply to source
    try { ev.source.postMessage(payload, ev.origin || '*'); } catch (e) { /* ignore */ }
  }
  if (data.type === 'pulseClosed') {
    closePulseOverlay();
  }
});
function renderBlogPosts(posts) {
  const feed = document.getElementById('blogList');
  const popular = document.getElementById('popularPosts');
  if (!feed || !popular) return;

  feed.innerHTML = '';
  posts.forEach(post => feed.appendChild(createBlogCard(post)));

  popular.innerHTML = posts.slice(0, 3).map(post => `
    <a href="javascript:void(0)" onclick="showBlogPost('${post.slug}')" class="popular-link">
      <strong>${post.title}</strong>
      <span>${post.readingTime}</span>
    </a>
  `).join('');
}

function initBlogPage() {
  fetch(BLOG_JSON_PATH)
    .then(response => response.json())
    .then(posts => {
      window.__blogPosts = posts;
      renderBlogPosts(posts);
      const anchor = window.location.hash.slice(1);
      if (anchor) {
        showBlogPost(anchor);
      }
    })
    .catch(() => {
      const feed = document.getElementById('blogList');
      if (feed) feed.innerHTML = '<p class="empty-state">Unable to load blog posts at the moment. Please try again later.</p>';
    });
}

window.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('blog-page')) {
    initBlogPage();
  }
});
