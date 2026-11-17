/* =============================================
   MAIN.JS — Firebase guard + app logic
   ============================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyAJlgIFjNPIoQUbc98LxXS9e00eLKueBfY",
  authDomain: "frontend-helper-b3ae7.firebaseapp.com",
  projectId: "frontend-helper-b3ae7",
  storageBucket: "frontend-helper-b3ae7.firebasestorage.app",
  messagingSenderId: "694794448757",
  appId: "1:694794448757:web:520bdbd6ee52e804c0ed3c",
  measurementId: "G-80ZG930B26"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

const isGuest = localStorage.getItem('fh-guest') === 'true';

// =============================================
// AUTH GUARD
// =============================================

onAuthStateChanged(auth, (user) => {
  if (user) {
    showUserMenu(user);
    unlockContent();
  } else if (isGuest) {
    showGuestBadge();
    unlockContent();
  } else {
    window.location.href = 'auth.html';
  }
});

function showUserMenu(user) {
  const userMenu   = document.getElementById('userMenu');
  const guestBadge = document.getElementById('guestBadge');
  userMenu.style.display   = '';
  guestBadge.style.display = 'none';

  const name  = user.displayName || user.email.split('@')[0];
  const email = user.email;
  const initials = name.slice(0,2).toUpperCase();

  document.getElementById('userAvatarText').textContent  = initials;
  document.getElementById('dropdownName').textContent    = name;
  document.getElementById('dropdownEmail').textContent   = email;

  // Show photo if set
  const avatarEl = document.getElementById('userAvatarText');
  if (user.photoURL) {
    const btn = document.getElementById('userAvatarBtn');
    btn.style.padding    = '0';
    btn.style.overflow   = 'hidden';
    const img = document.createElement('img');
    img.src   = user.photoURL;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:10px;';
    img.onerror = () => { btn.removeChild(img); };
    btn.insertBefore(img, avatarEl);
    avatarEl.style.display = 'none';
  }

  // Admin link — тільки для одного акаунту
  const ADMIN_EMAIL = 'nikita99didorenko@gmail.com';
  if (email === ADMIN_EMAIL) {
    const adminLink = document.getElementById('adminDropdownLink');
    if (adminLink) adminLink.style.display = '';
  }
}

function showGuestBadge() {
  document.getElementById('userMenu').style.display   = 'none';
  document.getElementById('guestBadge').style.display = '';
}

// =============================================
// CONTENT LOCK (unverified email)
// =============================================

function lockContent() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  // Blur and disable cards
  main.classList.add('content--locked');

  // Show overlay on each section
  document.querySelectorAll('.section').forEach(section => {
    if (!section.querySelector('.lock-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'lock-overlay';
      overlay.innerHTML = `
        <div class="lock-overlay__inner">
          <span class="lock-overlay__icon">🔒</span>
          <p class="lock-overlay__text">Підтверди email щоб отримати повний доступ</p>
          <button class="lock-overlay__btn" onclick="resendFromMain()">Надіслати лист ще раз</button>
        </div>
      `;
      section.style.position = 'relative';
      section.appendChild(overlay);
    }
  });
}

function unlockContent() {
  const main = document.getElementById('mainContent');
  if (!main) return;
  main.classList.remove('content--locked');
  document.querySelectorAll('.lock-overlay').forEach(el => el.remove());
}

// =============================================
// SIGN OUT
// =============================================

window.handleSignOut = async function() {
  localStorage.removeItem('fh-guest');
  await signOut(auth);
  window.location.href = 'auth.html';
};

// =============================================
// USER DROPDOWN TOGGLE
// =============================================

window.toggleUserDropdown = function() {
  const dd = document.getElementById('userDropdown');
  dd.style.display = dd.style.display === 'none' ? '' : 'none';
};

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('userMenu');
  const dd   = document.getElementById('userDropdown');
  if (dd && menu && !menu.contains(e.target)) {
    dd.style.display = 'none';
  }
});

// =============================================
// RESEND VERIFICATION (from main page)
// =============================================

window.resendFromMain = async function() {
  if (window._currentUser) {
    await sendEmailVerification(window._currentUser);
    alert('Лист надіслано! Перевір пошту.');
  }
};

// =============================================
// THEME TOGGLE
// =============================================

const html      = document.documentElement;
const themeBtn  = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('fh-theme', theme);
}

themeBtn.addEventListener('click', () => {
  applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

applyTheme(localStorage.getItem('fh-theme') || 'dark');

// =============================================
// BURGER MENU
// =============================================

const burger = document.getElementById('burger');
const nav    = document.getElementById('nav');

burger.addEventListener('click', () => {
  nav.classList.toggle('nav--open');
  burger.classList.toggle('burger--open');
});

document.querySelectorAll('.nav__link').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('nav--open');
    burger.classList.remove('burger--open');
  });
});

// =============================================
// COUNT RESOURCES
// =============================================

function countResources() {
  const total = document.querySelectorAll('.card').length;
  const el    = document.getElementById('totalCount');
  let count   = 0;
  const step  = Math.ceil(total / 40);
  const timer = setInterval(() => {
    count = Math.min(count + step, total);
    el.textContent = count;
    if (count >= total) clearInterval(timer);
  }, 30);
}
countResources();

// =============================================
// SEARCH
// =============================================

const searchInput = document.getElementById('searchInput');
const noResults   = document.getElementById('noResults');
const mainContent = document.getElementById('mainContent');

function normalizeText(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

searchInput.addEventListener('input', () => {
  const query = normalizeText(searchInput.value.trim());
  if (!query) {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('card--hidden'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('section--hidden'));
    noResults.style.display = 'none';
    mainContent.style.display = '';
    return;
  }

  let anyVisible = false;
  document.querySelectorAll('.section').forEach(section => {
    const cards = section.querySelectorAll('.card');
    let sectionHasVisible = false;
    cards.forEach(card => {
      const title = normalizeText(card.querySelector('.card__title')?.textContent || '');
      const desc  = normalizeText(card.querySelector('.card__desc')?.textContent || '');
      const tag   = normalizeText(card.querySelector('.card__tag')?.textContent || '');
      const link  = normalizeText(card.querySelector('.card__link')?.textContent || '');
      const match = title.includes(query) || desc.includes(query) || tag.includes(query) || link.includes(query);
      if (match) { card.classList.remove('card--hidden'); sectionHasVisible = true; anyVisible = true; }
      else       { card.classList.add('card--hidden'); }
    });
    section.classList[sectionHasVisible ? 'remove' : 'add']('section--hidden');
  });

  noResults.style.display    = anyVisible ? 'none' : 'block';
  mainContent.style.display  = anyVisible ? '' : 'none';
});

window.clearSearch = function() {
  searchInput.value = '';
  searchInput.dispatchEvent(new Event('input'));
  searchInput.focus();
};

// =============================================
// SCROLL TO TOP
// =============================================

const scrollTopBtn = document.getElementById('scrollTop');
window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });
scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// =============================================
// ACTIVE NAV (Intersection Observer)
// =============================================

const sections = document.querySelectorAll('.section[id]');
const navLinks  = document.querySelectorAll('.nav__link');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.style.color = '';
        link.style.background = '';
        if (link.getAttribute('href') === `#${id}`) {
          link.style.color = 'var(--text)';
          link.style.background = 'var(--bg-3)';
        }
      });
    }
  });
}, { rootMargin: '-30% 0px -60% 0px' });

sections.forEach(s => observer.observe(s));

// =============================================
// MODAL
// =============================================

window.openModal = function(title, url, domain, tag, desc, features) {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;

  window._currentModalSite = { title, url, domain, tag, desc };

  document.getElementById('modalTitle').textContent  = title;
  document.getElementById('modalDomain').textContent = domain;
  document.getElementById('modalTag').textContent    = tag;
  document.getElementById('modalDesc').textContent   = desc;
  document.getElementById('modalFavicon').src        = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  document.getElementById('modalLink').href          = url;

  const featuresEl = document.getElementById('modalFeatures');
  featuresEl.innerHTML = '';
  if (features) {
    features.split('\n').forEach(f => {
      const text = f.replace(/^[•\-]\s*/, '').trim();
      if (!text) return;
      const div = document.createElement('div');
      div.className   = 'modal__feature';
      div.textContent = text;
      featuresEl.appendChild(div);
    });
  }

  // Reset AI chat
  const aiChat = document.getElementById('modalAiChat');
  if (aiChat) aiChat.style.display = 'none';
  const aiMsgs = document.getElementById('modalAiMessages');
  if (aiMsgs) aiMsgs.innerHTML = '';

  // Quick AI questions for this site
  const quickBtns = document.getElementById('modalQuickBtns');
  if (quickBtns) {
    quickBtns.innerHTML = `
      <button class="modal-ai-quick-btn" onclick="sendModalAiQuick('Що таке ${title.replace(/'/g,"\\'")} і для чого він?')">❓ Що це?</button>
      <button class="modal-ai-quick-btn" onclick="sendModalAiQuick('Які переваги ${title.replace(/'/g,"\\'")}?')">⭐ Переваги</button>
      <button class="modal-ai-quick-btn" onclick="sendModalAiQuick('Як почати використовувати ${title.replace(/'/g,"\\'")}?')">🚀 Як почати?</button>
      <button class="modal-ai-quick-btn" onclick="sendModalAiQuick('Які альтернативи ${title.replace(/'/g,"\\'")}?')">🔄 Альтернативи</button>
    `;
  }

  overlay.classList.add('modal-overlay--open');
  document.body.style.overflow = 'hidden';
};

window.openModalChat = function() {
  document.getElementById('modalAiChat').style.display = '';
  document.getElementById('modalAiInput')?.focus();
};

window.closeModalChat = function() {
  document.getElementById('modalAiChat').style.display = 'none';
};

window.sendModalAiMessage = async function() {
  const input = document.getElementById('modalAiInput');
  const text  = input?.value.trim();
  if (!text) return;
  input.value = '';
  await callModalAI(text);
};

window.sendModalAiQuick = function(text) {
  openModalChat();
  callModalAI(text);
};

async function callModalAI(text) {
  const msgs = document.getElementById('modalAiMessages');
  if (!msgs) return;

  document.getElementById('modalQuickBtns').style.display = 'none';

  const userMsg = document.createElement('div');
  userMsg.className   = 'modal-ai-msg modal-ai-msg--user';
  userMsg.textContent = text;
  msgs.appendChild(userMsg);

  const typing = document.createElement('div');
  typing.className   = 'modal-ai-msg modal-ai-msg--ai';
  typing.textContent = '⏳ Думаю...';
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  const site = window._currentModalSite || {};
  const MODAL_MODELS = [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "deepseek/deepseek-r1-0528:free",
    "mistralai/mistral-7b-instruct:free",
    "qwen/qwen-2.5-72b-instruct:free"
  ];

  const sysPrompt = `Ти AI-асистент що відповідає на питання про інструмент "${site.title}" (${site.domain}) для frontend розробників. Опис: ${site.desc}. Відповідай коротко та по суті, українською мовою.`;

  try {
    const OPENROUTER_KEY = "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";
    let aiText = null;
    for (const model of MODAL_MODELS) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Frontend Helper'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: text }
          ],
          max_tokens: 400
        })
      });
      const data = await res.json();
      if (res.ok && data?.choices?.[0]?.message?.content) {
        aiText = data.choices[0].message.content;
        break;
      }
    }
    typing.textContent = aiText || 'Не вдалося отримати відповідь.';
  } catch {
    typing.textContent = '⚠️ Помилка з\'єднання.';
  }
  msgs.scrollTop = msgs.scrollHeight;
}

// =============================================
// SUPPORT EMAIL
// =============================================

window.sendSupportEmail = function(e) {
  e.preventDefault();
  const name    = document.getElementById('supportName')?.value.trim();
  const email   = document.getElementById('supportEmail')?.value.trim();
  const message = document.getElementById('supportMessage')?.value.trim();
  const status  = document.getElementById('supportStatus');

  const subject = encodeURIComponent(`Frontend Helper — Звернення від ${name}`);
  const body    = encodeURIComponent(`Ім'я: ${name}\nEmail: ${email}\n\nПовідомлення:\n${message}`);
  window.open(`mailto:nikita99didorenko@gmail.com?subject=${subject}&body=${body}`);

  if (status) {
    status.textContent   = '✅ Відкривається ваш поштовий клієнт!';
    status.className     = 'footer__form-status footer__form-status--success';
    status.style.display = '';
    setTimeout(() => { status.style.display = 'none'; }, 4000);
  }
};

window.closeModal = function() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('modal-overlay--open');
  document.body.style.overflow = '';
};

// =============================================
// KEYBOARD SHORTCUTS
// =============================================

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.closeModal();
    window.clearSearch?.();
    document.getElementById('searchInput')?.blur();
  }
  if (e.key === '/' && document.activeElement !== document.getElementById('searchInput')) {
    e.preventDefault();
    const si = document.getElementById('searchInput');
    si?.focus();
    si?.select();
  }
});
