// ============================================
// ARCHIVO PRINCIPAL JS — PROYECTO DOSSIER
// ============================================

// --- Reloj en tiempo real (header) ---
function updateClock() {
  const el = document.getElementById('live-clock');
  if (!el) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  el.textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

// --- Efecto de escritura (typewriter) ---
function typewriter(el, text, speed = 30, callback) {
  let i = 0;
  el.textContent = '';
  const interval = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) {
      clearInterval(interval);
      if (callback) callback();
    }
  }, speed);
}

// --- Inicializar elementos typewriter al cargar ---
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-typewriter]').forEach(el => {
    const text = el.dataset.typewriter;
    const delay = parseInt(el.dataset.delay || 0);
    setTimeout(() => typewriter(el, text), delay);
  });
});

// --- Línea de tiempo: expandir/colapsar eventos ---
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('expanded');
    });
  });
});

// --- Galería: gestionada por cada expediente individualmente ---

// --- Efecto glitch aleatorio en elementos marcados ---
document.addEventListener('DOMContentLoaded', () => {
  const glitchEls = document.querySelectorAll('.glitch-random');
  function randomGlitch() {
    if (glitchEls.length === 0) return;
    const el = glitchEls[Math.floor(Math.random() * glitchEls.length)];
    el.classList.add('glitching');
    setTimeout(() => el.classList.remove('glitching'), 200);
    setTimeout(randomGlitch, Math.random() * 5000 + 2000);
  }
  randomGlitch();
});

// --- Contador de visitas (localStorage) ---
function trackVisit(caseId) {
  const key = `visits_${caseId}`;
  const count = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, count);
  const el = document.getElementById('visit-count');
  if (el) el.textContent = count;
}

// --- Sistema de temas ---
const THEMES = ['amber', 'phosphor', 'paper', 'blood'];

function applyTheme(theme) {
  if (theme === 'amber') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem('dossier-theme', theme);
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.classList.toggle('active', dot.dataset.theme === theme);
  });
}

function initTheme() {
  const saved = localStorage.getItem('dossier-theme') || 'amber';
  applyTheme(saved);
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', () => applyTheme(dot.dataset.theme));
    dot.title = dot.dataset.theme.charAt(0).toUpperCase() + dot.dataset.theme.slice(1);
  });
});

// --- Buscador en tiempo real (index.html) ---
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('search-input');
  if (!input) return;

  const cards = document.querySelectorAll('.case-card');
  const noResults = document.getElementById('no-results');

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let visible = 0;

    cards.forEach(card => {
      const title   = card.querySelector('.case-title')?.textContent.toLowerCase()   || '';
      const excerpt = card.querySelector('.case-excerpt')?.textContent.toLowerCase() || '';
      const cat     = card.querySelector('.case-category')?.textContent.toLowerCase()|| '';
      const num     = card.querySelector('.case-number')?.textContent.toLowerCase()  || '';

      const match = !q || title.includes(q) || excerpt.includes(q) || cat.includes(q) || num.includes(q);
      card.classList.toggle('hidden', !match);
      if (match) visible++;
    });

    if (noResults) noResults.classList.toggle('visible', visible === 0 && q.length > 0);
  });
});

// --- Filtros por categoría (index.html) ---
document.addEventListener('DOMContentLoaded', () => {
  const btns = document.querySelectorAll('.filter-btn');
  if (!btns.length) return;

  const cards = document.querySelectorAll('.case-card');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter || 'todos';

      cards.forEach(card => {
        if (filter === 'todos') {
          card.classList.remove('hidden');
        } else {
          const tags = (card.dataset.tags || '').toLowerCase();
          card.classList.toggle('hidden', !tags.includes(filter));
        }
      });

      // Reset search input
      const input = document.getElementById('search-input');
      if (input) input.value = '';
      const noResults = document.getElementById('no-results');
      if (noResults) noResults.classList.remove('visible');
    });
  });
});

// --- Hamburger menu (mobile) ---
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const toggle = document.querySelector('.nav-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    header.classList.toggle('nav-open');
  });
  document.querySelectorAll('.site-nav a').forEach(a => {
    a.addEventListener('click', () => header.classList.remove('nav-open'));
  });
});
