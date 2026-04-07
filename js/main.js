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

// ============================================
// SISTEMA DE CONOCIMIENTO ACUMULADO — DossierDB
// Arquitectura tipo DB para migración futura a backend
// ============================================

const DossierDB = (() => {
  const STORAGE_KEY = 'dossier_db_v1';

  // Estructura inicial de la "base de datos"
  const defaultState = () => ({
    profile: {
      firstVisit: null,
      lastVisit: null,
      totalVisits: 0,
      rank: 'civilian'
    },
    cases: {},       // { 'valiant-thor': { visits: 0, firstVisit: null, lastVisit: null, timeSpent: 0, sectionsRead: [], timelineExpanded: 0 } }
    badges: [],      // ['first_case', 'deep_diver', ...]
    connections: [], // ['valiant-thor:dulce-base', ...] — conexiones descubiertas
    stats: {
      totalTimeSpent: 0,
      totalTimelineExpands: 0,
      totalSectionsRead: 0
    }
  });

  let state = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        // Merge con defaults para campos nuevos en versiones futuras
        const def = defaultState();
        state = { ...def, ...state, profile: { ...def.profile, ...state.profile }, stats: { ...def.stats, ...state.stats } };
        if (!state.cases) state.cases = {};
        if (!state.badges) state.badges = [];
        if (!state.connections) state.connections = [];
      } else {
        state = defaultState();
      }
    } catch (e) {
      console.warn('[DossierDB] Error loading state, using defaults:', e);
      state = defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[DossierDB] Error saving state:', e);
    }
  }

  function getState() { return state; }

  // --- Acciones (equivalente a queries en una DB real) ---

  function recordVisit(caseId) {
    const now = Date.now();
    state.profile.totalVisits++;
    if (!state.profile.firstVisit) state.profile.firstVisit = now;
    state.profile.lastVisit = now;

    if (!state.cases[caseId]) {
      state.cases[caseId] = { visits: 0, firstVisit: null, lastVisit: null, timeSpent: 0, sectionsRead: [], timelineExpanded: 0 };
    }
    const c = state.cases[caseId];
    c.visits++;
    if (!c.firstVisit) c.firstVisit = now;
    c.lastVisit = now;

    checkBadges();
    save();
  }

  function recordTimeSpent(caseId, seconds) {
    if (!state.cases[caseId]) {
      state.cases[caseId] = { visits: 0, firstVisit: null, lastVisit: null, timeSpent: 0, sectionsRead: [], timelineExpanded: 0 };
    }
    state.cases[caseId].timeSpent += seconds;
    state.stats.totalTimeSpent += seconds;
    checkBadges();
    save();
  }

  function recordSectionRead(caseId, sectionId) {
    if (!state.cases[caseId]) {
      state.cases[caseId] = { visits: 0, firstVisit: null, lastVisit: null, timeSpent: 0, sectionsRead: [], timelineExpanded: 0 };
    }
    if (!state.cases[caseId].sectionsRead.includes(sectionId)) {
      state.cases[caseId].sectionsRead.push(sectionId);
      state.stats.totalSectionsRead++;
    }
    checkBadges();
    save();
  }

  function recordTimelineExpand(caseId) {
    if (!state.cases[caseId]) {
      state.cases[caseId] = { visits: 0, firstVisit: null, lastVisit: null, timeSpent: 0, sectionsRead: [], timelineExpanded: 0 };
    }
    state.cases[caseId].timelineExpanded++;
    state.stats.totalTimelineExpands++;
    checkBadges();
    save();
  }

  function recordConnection(fromCase, toCase) {
    const key1 = `${fromCase}:${toCase}`;
    const key2 = `${toCase}:${fromCase}`;
    if (!state.connections.includes(key1) && !state.connections.includes(key2)) {
      state.connections.push(key1);
      checkBadges();
      save();
      return true; // nueva conexión descubierta
    }
    return false;
  }

  // --- Sistema de Badges ---

  const BADGE_DEFS = [
    {
      id: 'first_step',
      name: 'Primer Paso',
      desc: 'Abre tu primer expediente. Ya no hay vuelta atrás.',
      icon: '📂',
      rarity: 'common',
      check: (s) => Object.keys(s.cases).length >= 1
    },
    {
      id: 'investigator',
      name: 'Investigador',
      desc: 'Has abierto 3 expedientes diferentes. El patrón se confirma.',
      icon: '🔍',
      rarity: 'common',
      check: (s) => Object.keys(s.cases).length >= 3
    },
    {
      id: 'obsessive',
      name: 'Obsesivo',
      desc: 'Has visitado el mismo caso 5 veces. Algo no te deja dormir.',
      icon: '👁️',
      rarity: 'uncommon',
      check: (s) => Object.values(s.cases).some(c => c.visits >= 5)
    },
    {
      id: 'deep_diver',
      name: 'Inmersión Profunda',
      desc: 'Pasaste más de 10 minutos en un solo expediente. Esto ya es personal.',
      icon: '🌊',
      rarity: 'uncommon',
      check: (s) => Object.values(s.cases).some(c => c.timeSpent >= 600)
    },
    {
      id: 'scholar',
      name: 'Erudito',
      desc: 'Has leído todas las secciones de al menos un caso. No dejas nada sin revisar.',
      icon: '📚',
      rarity: 'rare',
      check: (s) => Object.values(s.cases).some(c => c.sectionsRead.length >= 5)
    },
    {
      id: 'connector',
      name: 'Conector',
      desc: 'Descubriste la conexión entre dos casos. El hilo se hace visible.',
      icon: '🔗',
      rarity: 'uncommon',
      check: (s) => s.connections.length >= 1
    },
    {
      id: 'architect',
      name: 'Arquitecto del Hilo',
      desc: 'Conectaste 3 pares de casos. Empiezas a ver la red completa.',
      icon: '🕸️',
      rarity: 'rare',
      check: (s) => s.connections.length >= 3
    },
    {
      id: 'night_owl',
      name: 'Búho Nocturno',
      desc: 'Investigaste entre las 00:00 y las 05:00. La verdad no duerme.',
      icon: '🦉',
      rarity: 'uncommon',
      check: (s) => {
        const h = new Date().getHours();
        return h >= 0 && h < 5;
      }
    },
    {
      id: 'complete',
      name: 'Expediente Completo',
      desc: 'Has abierto los 5 casos del archivo. No queda nada sin explorar.',
      icon: '🗂️',
      rarity: 'epic',
      check: (s) => Object.keys(s.cases).length >= 5
    },
    {
      id: 'veteran',
      name: 'Veterano',
      desc: '30 visitas totales al archivo. Esto ya es parte de ti.',
      icon: '⭐',
      rarity: 'epic',
      check: (s) => s.profile.totalVisits >= 30
    },
    {
      id: 'marathon',
      name: 'Maratonista',
      desc: 'Más de 1 hora acumulada investigando. No hay prisa, hay profundidad.',
      icon: '🏃',
      rarity: 'epic',
      check: (s) => s.stats.totalTimeSpent >= 3600
    }
  ];

  function checkBadges() {
    BADGE_DEFS.forEach(def => {
      if (!state.badges.includes(def.id) && def.check(state)) {
        state.badges.push(def.id);
        // Disparar evento para notificación
        document.dispatchEvent(new CustomEvent('badge-earned', { detail: { ...def } }));
      }
    });
    updateRank();
  }

  function updateRank() {
    const count = state.badges.length;
    let rank;
    if (count === 0) rank = { id: 'civilian', name: 'Civil', color: '#666' };
    else if (count <= 2) rank = { id: 'curious', name: 'Curioso', color: '#3aaa50' };
    else if (count <= 4) rank = { id: 'seeker', name: 'Buscador', color: '#d4870a' };
    else if (count <= 6) rank = { id: 'investigator', name: 'Investigador', color: '#cc5500' };
    else if (count <= 8) rank = { id: 'analyst', name: 'Analista', color: '#cc2200' };
    else rank = { id: 'architect', name: 'Arquitecto', color: '#ff0040' };
    state.profile.rank = rank.id;
    state.profile.rankData = rank;
  }

  function getBadgeDefs() { return BADGE_DEFS; }
  function getBadges() { return state.badges; }
  function getCaseData(caseId) { return state.cases[caseId] || null; }
  function getProfile() { return state.profile; }
  function getStats() { return state.stats; }

  // Inicializar
  load();

  return {
    recordVisit,
    recordTimeSpent,
    recordSectionRead,
    recordTimelineExpand,
    recordConnection,
    getBadges,
    getBadgeDefs,
    getCaseData,
    getProfile,
    getStats,
    getState
  };
})();

// --- Wrapper para trackVisit (compatibilidad) ---
function trackVisit(caseId) {
  DossierDB.recordVisit(caseId);
  const el = document.getElementById('visit-count');
  if (el) {
    const data = DossierDB.getCaseData(caseId);
    el.textContent = data ? data.visits : 0;
  }
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

// --- Buscador + Filtros combinados (index.html) ---
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('search-input');
  const btns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.case-card');
  const noResults = document.getElementById('no-results');

  if (!cards.length) return;

  // Estado actual de los filtros
  let activeFilter = 'todos';
  let searchQuery = '';

  // Función central que aplica búsqueda + filtros juntos
  function applyFilters() {
    let visible = 0;

    cards.forEach(card => {
      // 1. Comprobar filtro de categoría
      let categoryMatch = false;
      if (activeFilter === 'todos') {
        categoryMatch = true;
      } else {
        const tags = (card.dataset.tags || '').toLowerCase();
        categoryMatch = tags.includes(activeFilter);
      }

      // 2. Comprobar búsqueda
      let searchMatch = true;
      if (searchQuery.length > 0) {
        const title   = card.querySelector('.case-title')?.textContent.toLowerCase()   || '';
        const excerpt = card.querySelector('.case-excerpt')?.textContent.toLowerCase() || '';
        const cat     = card.querySelector('.case-category')?.textContent.toLowerCase()|| '';
        const num     = card.querySelector('.case-number')?.textContent.toLowerCase()  || '';
        searchMatch = title.includes(searchQuery) || excerpt.includes(searchQuery) || cat.includes(searchQuery) || num.includes(searchQuery);
      }

      // 3. Ambos deben coincidir
      const show = categoryMatch && searchMatch;
      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });

    // Mostrar mensaje de "no resultados" solo si hay búsqueda activa
    if (noResults) {
      noResults.classList.toggle('visible', visible === 0 && searchQuery.length > 0);
    }
  }

  // Evento del buscador
  if (input) {
    input.addEventListener('input', () => {
      searchQuery = input.value.trim().toLowerCase();
      applyFilters();
    });
  }

  // Eventos de los filtros
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      activeFilter = btn.dataset.filter || 'todos';

      // Resetear el buscador al cambiar filtro
      if (input) {
        input.value = '';
        searchQuery = '';
      }

      applyFilters();
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

// ============================================
// TRACKING AUTOMÁTICO EN PÁGINAS DE CASOS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Detectar si estamos en una página de caso
  const caseHero = document.querySelector('.case-hero');
  if (!caseHero) return;

  // Extraer caseId del breadcrumb o del título
  const breadcrumb = document.querySelector('.breadcrumb span:last-child');
  const caseNumber = breadcrumb ? breadcrumb.textContent.trim() : '';
  // Usar el título del caso como ID aproximado
  const titleEl = document.querySelector('.case-hero-title');
  const titleText = titleEl ? titleEl.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'unknown';
  const caseId = titleText;

  // --- Tracking de tiempo ---
  let startTime = Date.now();
  function recordTime() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed > 5) { // Solo registrar si pasó más de 5 segundos
      DossierDB.recordTimeSpent(caseId, elapsed);
    }
    startTime = Date.now();
  }
  window.addEventListener('beforeunload', recordTime);
  // También registrar cada 30 segundos
  setInterval(recordTime, 30000);

  // --- Tracking de secciones leídas (intersection observer) ---
  const sections = document.querySelectorAll('.section');
  if (sections.length && typeof IntersectionObserver !== 'undefined') {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const sectionEl = entry.target;
          const sectionTitle = sectionEl.querySelector('.section-title');
          if (sectionTitle) {
            const sectionId = sectionTitle.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
            DossierDB.recordSectionRead(caseId, sectionId);
          }
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(s => sectionObserver.observe(s));
  }

  // --- Tracking de timeline expands ---
  document.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', () => {
      DossierDB.recordTimelineExpand(caseId);
    });
  });

  // --- Tracking de conexiones (clics en casos relacionados) ---
  document.querySelectorAll('.related-case[href]').forEach(link => {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href');
      const relatedCase = href.replace('../casos/', '').replace('.html', '').replace('casos/', '');
      DossierDB.recordConnection(caseId, relatedCase);
    });
  });

  // --- Mostrar badges en la sidebar ---
  renderBadges(caseId);
});

// ============================================
// RENDERIZADO DE BADGES EN SIDEBAR
// ============================================
function renderBadges(caseId) {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const profile = DossierDB.getProfile();
  const badges = DossierDB.getBadges();
  const badgeDefs = DossierDB.getBadgeDefs();
  const caseData = DossierDB.getCaseData(caseId);
  const stats = DossierDB.getStats();

  // Crear bloque de perfil del investigador
  const rankData = profile.rankData || { name: 'Civil', color: '#666' };
  const profileBlock = document.createElement('div');
  profileBlock.className = 'sidebar-block fade-in';
  profileBlock.innerHTML = `
    <div class="sidebar-block-title">Tu Perfil</div>
    <div class="sidebar-block-body" style="text-align:center;">
      <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:2px;color:${rankData.color};text-transform:uppercase;margin-bottom:8px;">
        ${rankData.name}
      </div>
      <div style="display:flex;justify-content:center;gap:12px;font-family:var(--font-mono);font-size:9px;color:var(--text-dim);letter-spacing:1px;">
        <span>${profile.totalVisits} visitas</span>
        <span>${Object.keys(DossierDB.getState().cases).length}/5 casos</span>
      </div>
    </div>
  `;

  // Crear bloque de badges
  const badgesBlock = document.createElement('div');
  badgesBlock.className = 'sidebar-block fade-in';

  const earnedBadges = badgeDefs.filter(def => badges.includes(def.id));
  const unearnedBadges = badgeDefs.filter(def => !badges.includes(def.id));

  let badgesHTML = '<div class="sidebar-block-title">Insignias</div><div class="sidebar-block-body">';

  if (earnedBadges.length > 0) {
    badgesHTML += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">';
    earnedBadges.forEach(badge => {
      badgesHTML += `
        <div class="badge-item" title="${badge.name}: ${badge.desc}" style="
          display:inline-flex;align-items:center;gap:4px;
          padding:4px 8px;
          background:var(--bg-card);
          border:1px solid var(--border);
          font-family:var(--font-mono);
          font-size:9px;
          letter-spacing:1px;
          color:var(--text-bright);
          cursor:help;
        ">
          <span>${badge.icon}</span>
          <span>${badge.name}</span>
        </div>
      `;
    });
    badgesHTML += '</div>';
  }

  // Badges ocultos (por descubrir)
  if (unearnedBadges.length > 0) {
    badgesHTML += '<div style="font-family:var(--font-mono);font-size:8px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px;">Sin descubrir: ' + unearnedBadges.length + '</div>';
    badgesHTML += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
    unearnedBadges.forEach(badge => {
      badgesHTML += `
        <div style="
          display:inline-flex;align-items:center;justify-content:center;
          width:24px;height:24px;
          background:rgba(255,255,255,0.02);
          border:1px dashed var(--border);
          font-size:10px;
          opacity:0.3;
          cursor:help;
        " title="???">?</div>
      `;
    });
    badgesHTML += '</div>';
  }

  badgesHTML += '</div>';
  badgesBlock.innerHTML = badgesHTML;

  // Insertar bloques al inicio de la sidebar
  sidebar.insertBefore(profileBlock, sidebar.firstChild);
  sidebar.insertBefore(badgesBlock, sidebar.firstChild.nextSibling);
}

// ============================================
// NOTIFICACIÓN DE BADGE GANADO
// ============================================
document.addEventListener('badge-earned', (e) => {
  const badge = e.detail;

  // Crear notificación
  const notif = document.createElement('div');
  notif.style.cssText = `
    position:fixed;bottom:2rem;right:2rem;z-index:10001;
    background:var(--bg-card);border:1px solid var(--amber);
    padding:1rem 1.5rem;max-width:320px;
    font-family:var(--font-mono);font-size:10px;letter-spacing:1px;
    color:var(--text-bright);
    box-shadow:0 0 20px rgba(212,135,10,0.2);
    transform:translateY(20px);opacity:0;
    transition:all 0.3s ease;
  `;
  notif.innerHTML = `
    <div style="font-size:8px;letter-spacing:3px;color:var(--amber-dim);text-transform:uppercase;margin-bottom:6px;">
      ✦ INSIGNIA DESCUBIERTA
    </div>
    <div style="font-size:1.4rem;margin-bottom:4px;">${badge.icon}</div>
    <div style="font-size:12px;letter-spacing:2px;color:var(--amber);text-transform:uppercase;margin-bottom:4px;">
      ${badge.name}
    </div>
    <div style="color:var(--text-dim);line-height:1.5;">${badge.desc}</div>
  `;

  document.body.appendChild(notif);

  // Animar entrada
  requestAnimationFrame(() => {
    notif.style.transform = 'translateY(0)';
    notif.style.opacity = '1';
  });

  // Auto-eliminar después de 5 segundos
  setTimeout(() => {
    notif.style.transform = 'translateY(20px)';
    notif.style.opacity = '0';
    setTimeout(() => notif.remove(), 300);
  }, 5000);
});
