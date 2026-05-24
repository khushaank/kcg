// ─── GLOBAL HEADER SCROLL EFFECT ───
window.addEventListener('scroll', () => {
  const header = document.querySelector('.site-header');
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }
});

// record when the preloader became visible (used to ensure minimum display time)
const PRELOADER_START = performance.now();
let preloaderProgress = 0;
let preloaderTimer = null;

function updatePreloaderProgress(value) {
  const progressBar = document.getElementById('preloaderBar');
  const clamped = Math.min(Math.max(value, 0), 100);
  if (progressBar) {
    progressBar.style.width = `${clamped}%`;
    progressBar.setAttribute('aria-valuenow', String(Math.round(clamped)));
  }
}

function startPreloaderProgress() {
  if (preloaderTimer) return;
  preloaderProgress = 0;
  updatePreloaderProgress(preloaderProgress);
  preloaderTimer = setInterval(() => {
    if (preloaderProgress >= 90) return;
    preloaderProgress += Math.random() * 3 + 2;
    updatePreloaderProgress(Math.min(preloaderProgress, 90));
  }, 120);
}

function finishPreloaderProgress() {
  if (preloaderTimer) {
    clearInterval(preloaderTimer);
    preloaderTimer = null;
  }
  preloaderProgress = 100;
  updatePreloaderProgress(preloaderProgress);
}

function setCurrentYear() {
  const year = new Date().getFullYear().toString();
  document.querySelectorAll('.current-year').forEach((el) => {
    el.textContent = year;
  });
}

function initNewsletterForms() {
  const forms = document.querySelectorAll('.newsletter-form');
  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const email = input ? input.value.trim() : '';
      const validEmail = /^\S+@\S+\.\S+$/.test(email);
      if (!validEmail) {
        alert('Please enter a valid email address to subscribe.');
        return;
      }

      const stored = JSON.parse(localStorage.getItem('kcgNewsletterSubscribers') || '[]');
      if (!stored.includes(email)) {
        stored.push(email);
        localStorage.setItem('kcgNewsletterSubscribers', JSON.stringify(stored));
      }

      alert('Thank you for subscribing! You will receive KCG updates soon.');
      if (input) input.value = '';
    });
  });
}

function toggleShareButtons() {
  const nativeShare = document.getElementById('openNativeShareBtn');
  if (nativeShare) {
    nativeShare.style.display = navigator.share ? 'inline-flex' : 'none';
  }
}

function openShareModal(title, link) {
  const modal = document.getElementById('shareModal');
  const modalTitle = document.getElementById('shareModalTitle');
  const modalLink = document.getElementById('shareModalLink');

  if (!modal || !modalTitle || !modalLink) return;

  modalTitle.textContent = title || 'Share this page';
  modalLink.value = link || window.location.href;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  toggleShareButtons();
}

function closeShareModal() {
  const modal = document.getElementById('shareModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
}

function copyShareLink() {
  const modalLink = document.getElementById('shareModalLink');
  if (!modalLink) return;
  modalLink.select();
  document.execCommand('copy');
  alert('Link copied to clipboard.');
}

function openNativeShare() {
  const modalLink = document.getElementById('shareModalLink');
  if (!navigator.share || !modalLink) return;
  navigator.share({
    title: document.title,
    url: modalLink.value
  }).catch(() => {
    alert('Unable to open share menu. Please copy the link manually.');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setCurrentYear();
  startPreloaderProgress();
  initNewsletterForms();
  const copyButton = document.getElementById('copyShareLinkBtn');
  const nativeShareButton = document.getElementById('openNativeShareBtn');
  if (copyButton) copyButton.addEventListener('click', copyShareLink);
  if (nativeShareButton) nativeShareButton.addEventListener('click', openNativeShare);
});

// ─── MOBILE HAMBURGER DRAWER ───
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  const overlay = document.getElementById('mobileOverlay');
  const btn = document.getElementById('hamburgerBtn');
  
  if (menu) menu.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
  if (btn) {
    btn.classList.toggle('open');
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !expanded);
  }
}

// Close Mobile Menu on Outside Clicks
document.addEventListener('click', (e) => {
  const menu = document.getElementById('mobileMenu');
  const btn = document.getElementById('hamburgerBtn');
  const overlay = document.getElementById('mobileOverlay');
  
  if (menu && menu.classList.contains('open')) {
    if (!menu.contains(e.target) && !btn.contains(e.target) && !e.target.closest('.hamburger')) {
      toggleMenu();
    }
  }
});

// ─── STATS COUNT-UP ANIMATION ───
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const plusSpan = el.querySelector('span') ? el.querySelector('span').outerHTML : '<span>+</span>';
  let count = 0;
  const duration = 1200; // Total duration in ms
  const intervalTime = 30;
  const steps = duration / intervalTime;
  const stepVal = Math.ceil(target / steps);
  
  const timer = setInterval(() => {
    count = Math.min(count + stepVal, target);
    el.innerHTML = count + plusSpan;
    if (count >= target) {
      clearInterval(timer);
    }
  }, intervalTime);
}

// Stats Intersection Observer
document.addEventListener('DOMContentLoaded', () => {
  const statItems = document.querySelectorAll('.stat-item');
  if (statItems.length > 0) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const num = entry.target.querySelector('.stat-number[data-target]');
          if (num) animateCounter(num);
          statsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    
    statItems.forEach(item => statsObserver.observe(item));
  }
});

// ─── FAQ ACCORDION TRIGGER ───
function toggleFaq(btn) {
  const card = btn.closest('.faq-card');
  const panel = card.querySelector('.faq-panel');
  const isOpen = card.classList.contains('open');

  // Close all other open FAQs
  document.querySelectorAll('.faq-card').forEach(item => {
    item.classList.remove('open');
    const p = item.querySelector('.faq-panel');
    if (p) p.style.maxHeight = null;
  });

  // Toggle clicked FAQ
  if (!isOpen && card && panel) {
    card.classList.add('open');
    panel.style.maxHeight = panel.scrollHeight + "px";
  }
}

// ─── GALLERY CATEGORY FILTER ───
document.addEventListener('DOMContentLoaded', () => {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  if (filterButtons.length > 0 && galleryItems.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Toggle active button
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const activeFilter = button.dataset.filter;

        galleryItems.forEach(item => {
          const itemCategory = item.dataset.category;
          if (activeFilter === 'all' || itemCategory === activeFilter) {
            item.classList.remove('hide');
          } else {
            item.classList.add('hide');
          }
        });
      });
    });
  }
});

// ─── DONATION PAGE INTERACTIVE FORM ───
function selectTier(element, val) {
  document.querySelectorAll('.donation-tier').forEach(tier => tier.classList.remove('selected'));
  if (element) element.classList.add('selected');
  
  const customInput = document.getElementById('customAmount');
  if (customInput) customInput.value = val;
  
  updateImpactDescription(val);
}

function handleAmountInput(val) {
  const numVal = parseInt(val, 10);
  document.querySelectorAll('.donation-tier').forEach(tier => tier.classList.remove('selected'));

  const tiers = document.querySelectorAll('.donation-tier');
  if (tiers.length >= 3) {
    if (numVal === 1000) tiers[0].classList.add('selected');
    else if (numVal === 2500) tiers[1].classList.add('selected');
    else if (numVal === 5000) tiers[2].classList.add('selected');
  }
  
  updateImpactDescription(numVal);
}

function updateImpactDescription(amount) {
  const textElement = document.getElementById('impactText');
  const meterElement = document.getElementById('impactMeter');

  if (!textElement) return;

  if (isNaN(amount) || amount <= 0) {
    textElement.innerText = "Please input a positive donation amount.";
    if (meterElement) {
      meterElement.style.color = "var(--text-muted)";
      meterElement.style.borderLeftColor = "var(--border-warm)";
    }
    return;
  }

  if (meterElement) {
    meterElement.style.color = "var(--success)";
    meterElement.style.borderLeftColor = "var(--success)";
  }

  if (amount < 500) {
    textElement.innerText = `Your contribution of ₹${amount.toLocaleString()} will fund general school supplies like pencil sets and notebooks for children.`;
  } else if (amount < 1500) {
    textElement.innerText = `Your contribution of ₹${amount.toLocaleString()} will purchase custom-fit uniforms and full primary school textbook sets for one student.`;
  } else if (amount < 3500) {
    textElement.innerText = `Your contribution of ₹${amount.toLocaleString()} will secure daily hot nutritious mid-day meals for one child for an entire month.`;
  } else if (amount < 7500) {
    textElement.innerText = `Your contribution of ₹${amount.toLocaleString()} sponsors a comprehensive educational scholarship and supply box for one student for a full term.`;
  } else {
    textElement.innerText = `Your contribution of ₹${amount.toLocaleString()} sponsors full educational support, nutritional meals, and family health kit assistance for multiple students!`;
  }
}

// ─── FORM SUBMISSIONS CALLBACKS (Unified) ───
function handleSubmit(e) {
  e.preventDefault();
  handleSubmissionCallback(e.target);
}

function handleFormSubmit(e) {
  e.preventDefault();
  handleSubmissionCallback(e.target);
}

// Direct volunteer application
function handleVolSubmit(e) {
  e.preventDefault();
  handleSubmissionCallback(e.target, "Your volunteer application has been submitted! A representative will reach out to you within 48 hours to onboard you. Thank you!");
}

// Direct donation checkout mock
function handleDonationSubmit(e) {
  e.preventDefault();
  const customAmount = document.getElementById('customAmount') ? document.getElementById('customAmount').value : 1000;
  handleSubmissionCallback(e.target, `Thank you for your generous support of ₹${parseInt(customAmount, 10).toLocaleString()}! You will be redirected to the secure gateway in a live setup. Check NEFT details on the right to complete transfers.`);
}

function handleSubmissionCallback(form, alertMsg = null) {
  const btn = form.querySelector('button[type="submit"]') || form.querySelector('.form-submit-btn');
  if (!btn) return;

  const oldHTML = btn.innerHTML;
  btn.innerHTML = '<span class="icon" style="font-size:18px"><svg viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span> Success!';
  const originalBg = btn.style.backgroundColor;
  const originalShadow = btn.style.boxShadow;

  btn.style.backgroundColor = 'var(--success)';
  btn.style.boxShadow = '0 8px 24px rgba(26, 122, 76, 0.3)';
  btn.disabled = true;

  setTimeout(() => {
    if (alertMsg) {
      alert(alertMsg);
    } else {
      alert("Your message has been successfully transmitted! Our community representative will connect with you shortly.");
    }

    form.reset();
    btn.innerHTML = oldHTML;
    btn.style.backgroundColor = originalBg;
    btn.style.boxShadow = originalShadow;
    btn.disabled = false;
    
    // Check if donation page to reset tiers
    const tiers = document.querySelectorAll('.donation-tier');
    if (tiers.length > 0) {
      tiers.forEach(t => t.classList.remove('selected'));
      tiers[0].classList.add('selected');
      const customInput = document.getElementById('customAmount');
      if (customInput) customInput.value = 1000;
      updateImpactDescription(1000);
    }
  }, 1000);
}


// ─── PRELOADER HIDE ON LOAD (minimum 4s visible) ───
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const elapsed = performance.now() - PRELOADER_START;
  const minVisible = 1200; // milliseconds
  const wait = Math.max(0, minVisible - elapsed);

  setTimeout(() => {
    finishPreloaderProgress();
    setTimeout(() => {
      preloader.classList.add('preloader--hide');
      preloader.setAttribute('aria-hidden', 'true');
      // remove element after fade-out
      setTimeout(() => {
        if (preloader && preloader.parentNode) preloader.parentNode.removeChild(preloader);
      }, 400);
    }, 180);
  }, wait);
});
