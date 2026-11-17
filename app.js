/* =============================================
   FRONTEND HELPER — APP.JS
   ============================================= */

// ---- THEME TOGGLE ----
const html       = document.documentElement;
const themeBtn   = document.getElementById('themeToggle');
const themeIcon  = document.getElementById('themeIcon');

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('fh-theme', theme);
}

themeBtn.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// Apply saved theme on load
const savedTheme = localStorage.getItem('fh-theme') || 'dark';
applyTheme(savedTheme);


// ---- BURGER MENU ----
const burger = document.getElementById('burger');
const nav    = document.getElementById('nav');

burger.addEventListener('click', () => {
  nav.classList.toggle('nav--open');
  burger.classList.toggle('burger--open');
});

// Close nav on link click (mobile)
document.querySelectorAll('.nav__link').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('nav--open');
    burger.classList.remove('burger--open');
  });
});


// ---- COUNT TOTAL RESOURCES ----
function countResources() {
  const total = document.querySelectorAll('.card').length;
  const el = document.getElementById('totalCount');
  // Animate count
  let count = 0;
  const step = Math.ceil(total / 40);
  const timer = setInterval(() => {
    count = Math.min(count + step, total);
    el.textContent = count;
    if (count >= total) clearInterval(timer);
  }, 30);
}
countResources();


// ---- SEARCH ----
const searchInput = document.getElementById('searchInput');
const noResults   = document.getElementById('noResults');
const mainContent = document.getElementById('mainContent');

function normalizeText(str) {
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

searchInput.addEventListener('input', () => {
  const query = normalizeText(searchInput.value.trim());

  if (!query) {
    // Show everything
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

      if (match) {
        card.classList.remove('card--hidden');
        sectionHasVisible = true;
        anyVisible = true;
      } else {
        card.classList.add('card--hidden');
      }
    });

    if (sectionHasVisible) {
      section.classList.remove('section--hidden');
    } else {
      section.classList.add('section--hidden');
    }
  });

  if (!anyVisible) {
    noResults.style.display = 'block';
    mainContent.style.display = 'none';
  } else {
    noResults.style.display = 'none';
    mainContent.style.display = '';
  }
});

function clearSearch() {
  searchInput.value = '';
  searchInput.dispatchEvent(new Event('input'));
  searchInput.focus();
}


// ---- SCROLL TO TOP ----
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
  if (window.scrollY > 400) {
    scrollTopBtn.classList.add('visible');
  } else {
    scrollTopBtn.classList.remove('visible');
  }
}, { passive: true });

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});


// ---- ACTIVE NAV LINK (Intersection Observer) ----
const sections = document.querySelectorAll('.section[id]');
const navLinks  = document.querySelectorAll('.nav__link');

const observer = new IntersectionObserver(
  (entries) => {
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
  },
  { rootMargin: '-30% 0px -60% 0px' }
);

sections.forEach(s => observer.observe(s));


// ---- KEYBOARD SHORTCUT: "/" to focus search ----
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if (e.key === 'Escape') {
    clearSearch();
    searchInput.blur();
  }
});
