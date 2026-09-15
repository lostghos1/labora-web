// ===================== Config =====================
const API_BASE = '/api';
const ICON_KEYS = ['ball', 'droplet', 'image', 'music', 'food', 'pin', 'star', 'tree', 'building', 'camera'];
const DIFFICULTY_LEVELS = [
  { key: 'very_easy', label: 'Very easy', color: '#22C55E' },
  { key: 'easy', label: 'Easy', color: '#84CC16' },
  { key: 'moderate', label: 'Moderate', color: '#F59E0B' },
  { key: 'hard', label: 'Hard', color: '#F97316' },
  { key: 'very_hard', label: 'Very hard', color: '#EF4444' },
];
const RATING_LABELS = { 0: 'No rating', 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };
const SELECT_ZOOM = 16;

const COPY = {
  en:{ view:"View", add:"Add", admin:"Admin",
       viewSub:"Discover places", adminSub:"Manage content",
       viewDesc:"Browse and explore amazing locations shared by the community",
       categories:"Categories", mapHint:"Click anywhere on the map to add a new location",
       locations:"locations", location:"location", search:"Search locations…", clearFilter:"Clear Filter" },
  cs:{ view:"Zobrazit", add:"Přidat", admin:"Správa",
       viewSub:"Objevte místa", adminSub:"Spravovat obsah",
       viewDesc:"Procházejte a objevujte úžasná místa sdílená komunitou",
       categories:"Kategorie", mapHint:"Klikněte na mapu pro přidání nového místa",
       locations:"míst", location:"místo", search:"Hledat místa…", clearFilter:"Zrušit filtr" },
  de:{ view:"Ansicht", add:"Hinzufügen", admin:"Verwaltung",
       viewSub:"Orte entdecken", adminSub:"Inhalte verwalten",
       viewDesc:"Durchstöbern Sie großartige Orte aus der Community",
       categories:"Kategorien", mapHint:"Klicken Sie auf die Karte, um einen Ort hinzuzufügen",
       locations:"Orte", location:"Ort", search:"Orte suchen…", clearFilter:"Filter löschen" }
};

// ===================== State =====================
let mode = 'view';
let lang = 'en';
let theme = localStorage.getItem('labora_theme') || 'dark';
let locations = [];
let categories = [];
let markers = {};
let adminToken = sessionStorage.getItem('labora_admin_token') || null;
let currentDetailsId = null;
let activeFilters = new Set();
const expandedCatsAdmin = new Set();

// Wizard state
let wizardStep = 1;
let wizardLatLng = null;
let wizardPhotoData = null;
let editPhotoData = null;

hydrateIcons();

// ===================== Theme =====================
const themeToggleEl = document.getElementById('themeToggle');
function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggleEl.checked = theme === 'light';
}
themeToggleEl.addEventListener('change', () => {
  theme = themeToggleEl.checked ? 'light' : 'dark';
  localStorage.setItem('labora_theme', theme);
  applyTheme();
});
applyTheme();

// ===================== Map setup =====================
const map = L.map('map', { zoomControl: true }).setView([50.75, 13.5], 9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

function pinIcon(color, iconKey) {
  const inner = ICONS[iconKey] || ICONS.pin;
  return L.divIcon({
    className: 'leaflet-div-icon',
    html: `<div style="position:relative;width:32px;height:42px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));">
      <svg width="32" height="42" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="${color}"/>
      </svg>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;top:6px;left:9px;">${inner}</svg>
    </div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
  });
}

map.on('click', (e) => {
  if (mode !== 'add') return;
  openWizard(e.latlng);
});

// ===================== API helpers =====================
async function api(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  const res = await fetch(API_BASE + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
function categoryById(id) {
  return categories.find(c => c.id === id) || { id, label: id, icon: 'pin', color: '#888888' };
}
async function refreshCategoryCounts() {
  try { categories = await api('/categories'); } catch (e) {}
}
async function loadAll() {
  document.getElementById('loadingBanner').classList.remove('hidden');
  try {
    [categories, locations] = await Promise.all([api('/categories'), api('/locations')]);
  } catch (err) {
    showToast(err.message, true);
    categories = []; locations = [];
  }
  document.getElementById('loadingBanner').classList.add('hidden');
  populateCategorySelects();
  renderCategoryLists();
  renderMarkers();
  updateStatusCluster();
}

// ===================== Category rendering ====================
function renderCategoryLists() {
  renderViewCategoryList();
  renderAdminCategoryList();
}

function renderViewCategoryList() {
  const el = document.getElementById('categoryListView');
  el.innerHTML = '';
  categories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'cat-row' + (activeFilters.has(cat.id) ? ' filter-active' : '');
    row.innerHTML = `
      <span class="cat-icon-badge" style="background:${activeFilters.has(cat.id) ? 'rgba(255,255,255,.2)' : cat.color + '33'};color:${activeFilters.has(cat.id) ? '#fff' : cat.color};">${iconSvg(cat.icon, 15)}</span>
      <span class="cat-name">${escapeHtml(cat.label)}</span>
      <span class="cat-count">${cat.count}</span>
    `;
    row.addEventListener('click', () => toggleFilter(cat.id));
    el.appendChild(row);
  });
  document.getElementById('clearFiltersBtn').classList.toggle('hidden', activeFilters.size === 0);
}

function renderAdminCategoryList() {
  const el = document.getElementById('categoryListAdmin');
  el.innerHTML = '';
  const term = document.getElementById('searchInputAdmin').value.toLowerCase().trim();

  categories.forEach(cat => {
    const block = document.createElement('div');
    block.className = 'cat-block';
    const catLocs = locations.filter(l => l.category === cat.id && (
      !term || l.name.toLowerCase().includes(term) || (l.description || '').toLowerCase().includes(term)
    ));
    const isExpanded = expandedCatsAdmin.has(cat.id) || (term && catLocs.length > 0);
    if (isExpanded) block.classList.add('expanded');

    const canDeleteCat = cat.id !== 'others';
    const header = document.createElement('div');
    header.className = 'cat-row';
    header.innerHTML = `
      <span class="cat-chevron">${iconSvg('chevronRight', 14)}</span>
      <span class="cat-icon-badge" style="background:${cat.color}33;color:${cat.color};">${iconSvg(cat.icon, 15)}</span>
      <span class="cat-name">${escapeHtml(cat.label)}</span>
      <span class="cat-count">${cat.count}</span>
      ${canDeleteCat ? `<button class="cat-delete-btn" title="Delete category">${iconSvg('trash', 14)}</button>` : ''}
    `;
    header.addEventListener('click', (e) => {
      if (e.target.closest('.cat-delete-btn')) return;
      if (expandedCatsAdmin.has(cat.id)) expandedCatsAdmin.delete(cat.id);
      else expandedCatsAdmin.add(cat.id);
      renderAdminCategoryList();
    });
    if (canDeleteCat) header.querySelector('.cat-delete-btn').addEventListener('click', () => deleteCategory(cat.id));
    block.appendChild(header);

    const nested = document.createElement('div');
    nested.className = 'cat-locations' + (isExpanded ? '' : ' hidden');
    if (catLocs.length === 0) {
      nested.innerHTML = `<div class="empty-note">No locations${term ? ' match your search' : ' yet'}.</div>`;
    } else {
      catLocs.forEach(loc => {
        const row = document.createElement('div');
        row.className = 'cat-loc-row';
        row.innerHTML = `
          <span class="name">${escapeHtml(loc.name)}</span>
          <span class="row-actions">
            <button class="edit" title="Edit">${iconSvg('pencil', 13)}</button>
            <button class="del" title="Delete">${iconSvg('trash', 13)}</button>
          </span>`;
        row.querySelector('.name').addEventListener('click', () => {
          map.setView([loc.lat, loc.lng], SELECT_ZOOM, { animate: true });
          openDetailsPanel(loc.id);
        });
        row.querySelector('.edit').addEventListener('click', (e) => { e.stopPropagation(); openDetailsPanel(loc.id, true); });
        row.querySelector('.del').addEventListener('click', (e) => { e.stopPropagation(); deleteLocation(loc.id); });
        nested.appendChild(row);
      });
    }
    block.appendChild(nested);
    el.appendChild(block);
  });
}
document.getElementById('searchInputAdmin').addEventListener('input', () => renderAdminCategoryList());

// Search in View mode: text search still narrows the map/markers alongside category filters
document.getElementById('searchInputView').addEventListener('input', () => renderMarkers());

function toggleFilter(catId) {
  if (activeFilters.has(catId)) activeFilters.delete(catId);
  else activeFilters.add(catId);
  renderViewCategoryList();
  renderMarkers();
  updateStatusCluster();
}
document.getElementById('clearFiltersBtn').addEventListener('click', () => {
  activeFilters.clear();
  renderViewCategoryList();
  renderMarkers();
  updateStatusCluster();
});

function populateCategorySelects() {
  ['wizCategory', 'editCategory'].forEach(id => {
    const sel = document.getElementById(id);
    const current = sel.value;
    sel.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('');
    if (current) sel.value = current;
  });
  const newCatIcon = document.getElementById('newCatIcon');
  if (!newCatIcon.dataset.populated) {
    newCatIcon.innerHTML = ICON_KEYS.map(k => `<option value="${k}">${k.charAt(0).toUpperCase() + k.slice(1)}</option>`).join('');
    newCatIcon.dataset.populated = '1';
  }
}

// ===================== Status cluster (mode dot, filter tags, count) ====================
function updateStatusCluster() {
  const t = COPY[lang];
  document.getElementById('statusDot').className = 'status-dot mode-' + mode;
  document.getElementById('statusLabel').textContent = mode === 'view' ? t.view : mode === 'add' ? t.add : t.admin;

  const tagsEl = document.getElementById('filterTags');
  tagsEl.innerHTML = '';
  if (mode === 'view' && activeFilters.size > 0) {
    activeFilters.forEach(catId => {
      const cat = categoryById(catId);
      const tag = document.createElement('span');
      tag.className = 'filter-tag';
      tag.innerHTML = `${iconSvg(cat.icon, 12)} ${escapeHtml(cat.label)} <button>${iconSvg('x', 11)}</button>`;
      tag.querySelector('button').addEventListener('click', () => toggleFilter(catId));
      tagsEl.appendChild(tag);
    });
  }

  const visibleCount = getVisibleLocations().length;
  const countPill = document.getElementById('countPill');
  if (mode === 'view' && activeFilters.size > 0) {
    countPill.textContent = `${visibleCount} ${visibleCount === 1 ? t.location : t.locations} (${locations.length} total)`;
  } else {
    countPill.textContent = `${locations.length} ${locations.length === 1 ? t.location : t.locations}`;
  }
}

// ===================== Marker rendering (respects View filters + search) ====================
function getVisibleLocations() {
  if (mode !== 'view') return locations;
  const term = document.getElementById('searchInputView').value.toLowerCase().trim();
  return locations.filter(l => {
    const matchesFilter = activeFilters.size === 0 || activeFilters.has(l.category);
    const matchesSearch = !term || l.name.toLowerCase().includes(term) || (l.description || '').toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });
}

function renderMarkers() {
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};
  getVisibleLocations().forEach(loc => {
    const cat = categoryById(loc.category);
    const marker = L.marker([loc.lat, loc.lng], { icon: pinIcon(cat.color, cat.icon) }).addTo(map);
    marker.on('click', () => {
      map.setView([loc.lat, loc.lng], Math.max(map.getZoom(), SELECT_ZOOM), { animate: true });
      openDetailsPanel(loc.id);
    });
    markers[loc.id] = marker;
  });
  updateStatusCluster();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3200);
}

// ===================== Mode switching =====================
function setMode(next) {
  if (next === 'admin' && !adminToken) {
    document.getElementById('adminOverlay').classList.remove('hidden');
    document.getElementById('adminCode').focus();
    return;
  }
  mode = next;
  document.getElementById('viewModeBtn').classList.toggle('active', mode === 'view');
  document.getElementById('addModeBtn').classList.toggle('active', mode === 'add');
  document.getElementById('adminModeBtn').classList.toggle('active', mode === 'admin');
  document.getElementById('sidebarView').classList.toggle('hidden', mode !== 'view');
  document.getElementById('sidebarAdmin').classList.toggle('hidden', mode !== 'admin');
  document.getElementById('mainLayout').classList.toggle('full-map', mode === 'add');
  [document.getElementById('sidebarView'), document.getElementById('sidebarAdmin')]
    .forEach(el => el.classList.remove('collapsed'));
  document.getElementById('sidebarToggle').classList.remove('open');
  document.getElementById('mapHint').classList.toggle('hidden', mode !== 'add');
  document.getElementById('mapWrap').style.cursor = mode === 'add' ? 'crosshair' : '';
  renderMarkers();
  updateStatusCluster();
}
document.getElementById('viewModeBtn').addEventListener('click', () => setMode('view'));
document.getElementById('addModeBtn').addEventListener('click', () => setMode('add'));
document.getElementById('adminModeBtn').addEventListener('click', () => setMode('admin'));

document.getElementById('sidebarToggle').addEventListener('click', () => {
  const visible = document.querySelector('.sidebar:not(.hidden)');
  if (!visible) return;
  visible.classList.toggle('collapsed');
  document.getElementById('sidebarToggle').classList.toggle('open');
});

// ===================== Language =====================
function setLang(code) {
  lang = code;
  const t = COPY[lang];
  const flagMap = { en: '🇬🇧 English', de: '🇩🇪 Deutsch', cs: '🇨🇿 Čeština' };
  document.getElementById('langBtn').textContent = flagMap[code];
  document.getElementById('langMenu').classList.add('hidden');

  document.querySelector('#viewModeBtn').lastChild.textContent = t.view;
  document.querySelector('#addModeBtn').lastChild.textContent = t.add;
  document.querySelector('#adminModeBtn').lastChild.textContent = t.admin;
  document.querySelector('#mapHint').lastChild.textContent = ' ' + t.mapHint;

  document.querySelector('#sidebarView h2').textContent = t.view;
  document.querySelector('#sidebarView .sidebar-sub').textContent = t.viewSub;
  document.querySelector('#sidebarView .sidebar-desc').textContent = t.viewDesc;
  document.querySelector('#sidebarAdmin h2').textContent = t.admin;
  document.querySelector('#sidebarAdmin .sidebar-sub').textContent = t.adminSub;

  document.querySelectorAll('.cat-heading').forEach(el => { el.textContent = t.categories; });
  document.getElementById('searchInputView').placeholder = t.search;
  document.getElementById('searchInputAdmin').placeholder = t.search;
  document.querySelector('#clearFiltersBtn').lastChild.textContent = t.clearFilter;

  updateStatusCluster();
}
document.getElementById('langBtn').addEventListener('click', () => document.getElementById('langMenu').classList.toggle('hidden'));
document.getElementById('langMenu').addEventListener('click', (e) => {
  const code = e.target.closest('[data-lang]') ? e.target.closest('[data-lang]').getAttribute('data-lang') : null;
  if (code) setLang(code);
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.lang-select')) document.getElementById('langMenu').classList.add('hidden');
});

// ===================== Star picker / display ====================
function buildStarPicker(containerId, onChange) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  el.dataset.value = '0';
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('span');
    btn.className = 'star-btn';
    btn.dataset.i = i;
    btn.innerHTML = iconSvg('starOutline', 22);
    btn.addEventListener('click', () => {
      const current = parseInt(el.dataset.value, 10);
      const next = current === i ? 0 : i;
      setStarPickerValue(containerId, next);
      if (onChange) onChange(next);
    });
    el.appendChild(btn);
  }
}
function setStarPickerValue(containerId, value) {
  const el = document.getElementById(containerId);
  el.dataset.value = String(value);
  el.querySelectorAll('.star-btn').forEach(btn => {
    const filled = parseInt(btn.dataset.i, 10) <= value;
    btn.classList.toggle('filled', filled);
    btn.innerHTML = iconSvg(filled ? 'star' : 'starOutline', 22);
  });
}
function renderStarDisplay(containerId, value) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const span = document.createElement('span');
    span.className = 'star-btn' + (i <= value ? ' filled' : '');
    span.innerHTML = iconSvg(i <= value ? 'star' : 'starOutline', 18);
    el.appendChild(span);
  }
}
buildStarPicker('wizRatingStars', (val) => { document.getElementById('wizRatingLabel').textContent = RATING_LABELS[val]; });
buildStarPicker('editRatingStars');

// ===================== Difficulty picker / display ====================
function buildDifficultyPicker(containerId, onChange) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  el.dataset.value = '';
  DIFFICULTY_LEVELS.forEach((level, idx) => {
    const span = document.createElement('span');
    span.className = 'diff-icon';
    span.dataset.idx = idx;
    span.innerHTML = iconSvg('mountain', 20);
    span.addEventListener('click', () => {
      const currentIdx = DIFFICULTY_LEVELS.findIndex(d => d.key === el.dataset.value);
      const next = currentIdx === idx ? '' : level.key;
      setDifficultyPickerValue(containerId, next);
      if (onChange) onChange(next);
    });
    el.appendChild(span);
  });
}
function setDifficultyPickerValue(containerId, key) {
  const el = document.getElementById(containerId);
  el.dataset.value = key;
  const idx = DIFFICULTY_LEVELS.findIndex(d => d.key === key);
  el.querySelectorAll('.diff-icon').forEach((span, i) => {
    const on = idx >= 0 && i <= idx;
    span.classList.toggle('on', on);
    if (on) span.style.setProperty('--diff-color', DIFFICULTY_LEVELS[idx].color);
  });
}
function renderDifficultyDisplay(levelKey) {
  const wrap = document.getElementById('detailsDifficultyIcons');
  const labelEl = document.getElementById('detailsDifficultyLabel');
  wrap.innerHTML = '';
  const idx = DIFFICULTY_LEVELS.findIndex(d => d.key === levelKey);
  const level = DIFFICULTY_LEVELS[idx];
  DIFFICULTY_LEVELS.forEach((d, i) => {
    const span = document.createElement('span');
    span.className = 'diff-icon' + (i <= idx ? ' on' : '');
    if (i <= idx) span.style.setProperty('--diff-color', level.color);
    span.innerHTML = iconSvg('mountain', 18);
    wrap.appendChild(span);
  });
  labelEl.textContent = level ? level.label : '';
}
buildDifficultyPicker('wizDifficultyPicker', (val) => {
  const level = DIFFICULTY_LEVELS.find(d => d.key === val);
  document.getElementById('wizDifficultyLabel').textContent = level ? level.label : 'Not set';
});
buildDifficultyPicker('editDifficultyPicker');

// ===================== Photo compression ====================
function compressImage(file, maxDim = 800, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else { width = Math.round(width * (maxDim / height)); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===================== Add New Location — wizard ====================
const addWizardOverlay = document.getElementById('addWizardOverlay');

function openWizard(latlng) {
  wizardLatLng = latlng;
  wizardStep = 1;
  wizardPhotoData = null;
  document.getElementById('wizName').value = '';
  document.getElementById('wizNameCount').textContent = '0';
  document.getElementById('wizCategory').value = categories[0] ? categories[0].id : 'others';
  document.getElementById('wizDesc').value = '';
  document.getElementById('wizDescCount').textContent = '0';
  setStarPickerValue('wizRatingStars', 0);
  document.getElementById('wizRatingLabel').textContent = RATING_LABELS[0];
  setDifficultyPickerValue('wizDifficultyPicker', '');
  document.getElementById('wizDifficultyLabel').textContent = 'Not set';
  document.getElementById('wizPhotoInput').value = '';
  document.getElementById('wizPhotoPreviewWrap').classList.add('hidden');
  document.getElementById('wizCoords').textContent = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;

  showWizardStep(1);
  addWizardOverlay.classList.remove('hidden');
}
function closeWizard() {
  addWizardOverlay.classList.add('hidden');
  wizardLatLng = null;
}
function showWizardStep(n) {
  wizardStep = n;
  document.querySelectorAll('.wizard-step').forEach(el => {
    el.classList.toggle('hidden', parseInt(el.dataset.wizardStep, 10) !== n);
  });
  document.querySelectorAll('.wizard-step-dot').forEach(dot => {
    const s = parseInt(dot.dataset.step, 10);
    dot.classList.toggle('done', s < n);
    dot.classList.toggle('current', s === n);
    dot.textContent = s < n ? '✓' : s;
  });
  document.querySelectorAll('.wizard-step-line').forEach(line => {
    line.classList.toggle('done', parseInt(line.dataset.line, 10) < n);
  });
  document.getElementById('wizPrevBtn').classList.toggle('hidden', n === 1);
  document.getElementById('wizNextBtn').classList.toggle('hidden', n === 4);
  document.getElementById('wizSubmitBtn').classList.toggle('hidden', n !== 4);
}
document.getElementById('wizardCloseBtn').addEventListener('click', closeWizard);
document.getElementById('wizCancelBtn').addEventListener('click', closeWizard);
document.getElementById('wizName').addEventListener('input', (e) => {
  document.getElementById('wizNameCount').textContent = e.target.value.length;
});
document.getElementById('wizDesc').addEventListener('input', (e) => {
  document.getElementById('wizDescCount').textContent = e.target.value.length;
});
document.getElementById('wizNextBtn').addEventListener('click', () => {
  if (wizardStep === 1 && !document.getElementById('wizName').value.trim()) {
    showToast('Please enter a location name.', true);
    return;
  }
  showWizardStep(Math.min(wizardStep + 1, 4));
});
document.getElementById('wizPrevBtn').addEventListener('click', () => showWizardStep(Math.max(wizardStep - 1, 1)));

document.getElementById('wizPhotoInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    wizardPhotoData = await compressImage(file);
    document.getElementById('wizPhotoPreview').src = wizardPhotoData;
    document.getElementById('wizPhotoPreviewWrap').classList.remove('hidden');
  } catch { showToast('Could not process that image.', true); }
});
document.getElementById('wizPhotoRemoveBtn').addEventListener('click', () => {
  wizardPhotoData = null;
  document.getElementById('wizPhotoInput').value = '';
  document.getElementById('wizPhotoPreviewWrap').classList.add('hidden');
});

document.getElementById('wizSubmitBtn').addEventListener('click', async () => {
  const name = document.getElementById('wizName').value.trim();
  if (!name || !wizardLatLng) { showToast('Please enter a location name.', true); showWizardStep(1); return; }
  const category = document.getElementById('wizCategory').value;
  const description = document.getElementById('wizDesc').value.trim();
  const ratingVal = parseInt(document.getElementById('wizRatingStars').dataset.value, 10);
  const difficulty = document.getElementById('wizDifficultyPicker').dataset.value || null;

  try {
    const created = await api('/locations', {
      method: 'POST',
      body: JSON.stringify({
        name, description, category, lat: wizardLatLng.lat, lng: wizardLatLng.lng,
        rating: ratingVal > 0 ? ratingVal : null,
        difficulty,
        photo: wizardPhotoData,
      })
    });
    locations.unshift(created);
    await refreshCategoryCounts();
    renderCategoryLists();
    renderMarkers();
    updateStatusCluster();
    showToast('Location added.');
    closeWizard();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ===================== Admin: login =====================
const adminOverlay = document.getElementById('adminOverlay');
document.getElementById('adminCancelBtn').addEventListener('click', () => adminOverlay.classList.add('hidden'));
document.getElementById('adminModalCloseBtn').addEventListener('click', () => adminOverlay.classList.add('hidden'));

document.getElementById('adminLoginBtn').addEventListener('click', async () => {
  const code = document.getElementById('adminCode').value;
  const errBox = document.getElementById('adminLoginError');
  errBox.classList.add('hidden');
  try {
    const data = await api('/admin/login', { method: 'POST', body: JSON.stringify({ code }) });
    adminToken = data.token;
    sessionStorage.setItem('labora_admin_token', adminToken);
    adminOverlay.classList.add('hidden');
    document.getElementById('adminCode').value = '';
    setMode('admin');
    renderCategoryLists();
    showToast('Admin mode unlocked.');
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  }
});
document.getElementById('adminCode').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('adminLoginBtn').click();
});
document.getElementById('adminLogoutBtn').addEventListener('click', () => {
  adminToken = null;
  sessionStorage.removeItem('labora_admin_token');
  setMode('view');
  renderCategoryLists();
  showToast('Logged out.');
});

// ===================== Admin: categories =====================
document.getElementById('showAddCategoryBtn').addEventListener('click', () => {
  document.getElementById('addCategoryForm').classList.toggle('hidden');
});
document.getElementById('cancelAddCategoryBtn').addEventListener('click', () => {
  document.getElementById('addCategoryForm').classList.add('hidden');
});
document.getElementById('saveAddCategoryBtn').addEventListener('click', async () => {
  const label = document.getElementById('newCatLabel').value.trim();
  const icon = document.getElementById('newCatIcon').value;
  const color = document.getElementById('newCatColor').value;
  if (!label) { showToast('Category name is required.', true); return; }
  try {
    await api('/categories', { method: 'POST', body: JSON.stringify({ label, icon, color }) });
    categories = await api('/categories');
    populateCategorySelects();
    renderCategoryLists();
    document.getElementById('newCatLabel').value = '';
    document.getElementById('addCategoryForm').classList.add('hidden');
    showToast('Category added.');
  } catch (err) {
    showToast(err.message, true);
  }
});
async function deleteCategory(id) {
  if (!confirm('Delete this category? Locations using it will be moved to "Others".')) return;
  try {
    await api(`/categories/${id}`, { method: 'DELETE' });
    [categories, locations] = await Promise.all([api('/categories'), api('/locations')]);
    populateCategorySelects();
    renderCategoryLists();
    renderMarkers();
    activeFilters.delete(id);
    updateStatusCluster();
    showToast('Category deleted.');
  } catch (err) {
    showToast(err.message, true);
  }
}

// ===================== Location Details panel (non-blocking) ====================
const detailsOverlay = document.getElementById('detailsOverlay');

function mapsLinks(lat, lng) {
  return {
    navigate: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    view: `https://www.google.com/maps?q=${lat},${lng}`,
  };
}

async function openDetailsPanel(id, startInEdit = false) {
  const loc = locations.find(l => l.id === id);
  if (!loc) return;
  currentDetailsId = id;
  const cat = categoryById(loc.category);

  document.getElementById('detailsEditBtn').classList.toggle('hidden', !adminToken);
  document.getElementById('detailsDeleteBtn').classList.toggle('hidden', !adminToken);
  document.getElementById('detailsPanel').classList.remove('wide');

  const photoEl = document.getElementById('detailsPhoto');
  if (loc.photo) { photoEl.src = loc.photo; photoEl.classList.remove('hidden'); }
  else photoEl.classList.add('hidden');

  document.getElementById('detailsName').textContent = loc.name;
  document.getElementById('detailsCategory').innerHTML = `${iconSvg(cat.icon, 13)} ${escapeHtml(cat.label)}`;
  document.getElementById('detailsCoords').textContent = `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;

  const links = mapsLinks(loc.lat, loc.lng);
  document.getElementById('detailsNavigateBtn').onclick = () => window.open(links.navigate, '_blank');
  document.getElementById('detailsMapsBtn').onclick = () => window.open(links.view, '_blank');

  const ratingSection = document.getElementById('detailsRatingSection');
  if (loc.rating) { ratingSection.classList.remove('hidden'); renderStarDisplay('detailsStars', loc.rating); }
  else ratingSection.classList.add('hidden');

  const diffSection = document.getElementById('detailsDifficultySection');
  if (loc.difficulty) { diffSection.classList.remove('hidden'); renderDifficultyDisplay(loc.difficulty); }
  else diffSection.classList.add('hidden');

  const descSection = document.getElementById('detailsDescSection');
  if (loc.description) { descSection.classList.remove('hidden'); document.getElementById('detailsDesc').textContent = loc.description; }
  else descSection.classList.add('hidden');

  document.getElementById('detailsAdded').textContent = 'Added on ' + new Date(loc.created_at).toLocaleDateString();

  document.getElementById('commentName').value = '';
  document.getElementById('commentText').value = '';
  document.getElementById('commentCharCount').textContent = '0';
  await loadComments(id);

  document.getElementById('detailsViewBody').classList.remove('hidden');
  document.getElementById('detailsEditBody').classList.add('hidden');
  detailsOverlay.classList.remove('hidden');

  if (startInEdit && adminToken) openEditBody(loc);
}
document.getElementById('detailsCloseBtn').addEventListener('click', () => {
  detailsOverlay.classList.add('hidden');
  currentDetailsId = null;
});
document.getElementById('detailsDeleteBtn').addEventListener('click', async () => {
  if (!currentDetailsId) return;
  await deleteLocation(currentDetailsId);
  detailsOverlay.classList.add('hidden');
});
document.getElementById('detailsEditBtn').addEventListener('click', () => {
  const loc = locations.find(l => l.id === currentDetailsId);
  if (loc) openEditBody(loc);
});

function openEditBody(loc) {
  document.getElementById('detailsPanel').classList.add('wide');
  document.getElementById('editName').value = loc.name;
  document.getElementById('editDesc').value = loc.description || '';
  document.getElementById('editCategory').value = loc.category;
  setStarPickerValue('editRatingStars', loc.rating || 0);
  setDifficultyPickerValue('editDifficultyPicker', loc.difficulty || '');
  editPhotoData = loc.photo || null;
  if (loc.photo) { document.getElementById('editPhotoPreview').src = loc.photo; document.getElementById('editPhotoPreviewWrap').classList.remove('hidden'); }
  else document.getElementById('editPhotoPreviewWrap').classList.add('hidden');
  document.getElementById('editPhotoInput').value = '';

  document.getElementById('detailsViewBody').classList.add('hidden');
  document.getElementById('detailsEditBody').classList.remove('hidden');
}
document.getElementById('editPhotoInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    editPhotoData = await compressImage(file);
    document.getElementById('editPhotoPreview').src = editPhotoData;
    document.getElementById('editPhotoPreviewWrap').classList.remove('hidden');
  } catch { showToast('Could not process that image.', true); }
});
document.getElementById('editPhotoRemoveBtn').addEventListener('click', () => {
  editPhotoData = null;
  document.getElementById('editPhotoInput').value = '';
  document.getElementById('editPhotoPreviewWrap').classList.add('hidden');
});
document.getElementById('editCancelBtn').addEventListener('click', () => {
  document.getElementById('detailsPanel').classList.remove('wide');
  document.getElementById('detailsEditBody').classList.add('hidden');
  document.getElementById('detailsViewBody').classList.remove('hidden');
});
document.getElementById('editSaveBtn').addEventListener('click', async () => {
  const name = document.getElementById('editName').value.trim();
  if (!name || !currentDetailsId) return;
  const description = document.getElementById('editDesc').value.trim();
  const category = document.getElementById('editCategory').value;
  const ratingVal = parseInt(document.getElementById('editRatingStars').dataset.value, 10);
  const difficulty = document.getElementById('editDifficultyPicker').dataset.value || null;

  try {
    const updated = await api(`/locations/${currentDetailsId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name, description, category,
        rating: ratingVal > 0 ? ratingVal : null,
        difficulty,
        photo: editPhotoData,
      })
    });
    locations = locations.map(l => (l.id === updated.id ? updated : l));
    await refreshCategoryCounts();
    renderCategoryLists();
    renderMarkers();
    showToast('Location updated.');
    openDetailsPanel(updated.id);
  } catch (err) {
    showToast(err.message, true);
  }
});

async function deleteLocation(id) {
  if (!confirm('Delete this location? This cannot be undone.')) return;
  try {
    await api(`/locations/${id}`, { method: 'DELETE' });
    locations = locations.filter(l => l.id !== id);
    await refreshCategoryCounts();
    renderCategoryLists();
    renderMarkers();
    updateStatusCluster();
    showToast('Location deleted.');
  } catch (err) {
    showToast(err.message, true);
  }
}

// ===================== Comments =====================
async function loadComments(locationId) {
  const list = document.getElementById('commentsList');
  list.innerHTML = '<div class="empty-note">Loading…</div>';
  try {
    const comments = await api(`/locations/${locationId}/comments`);
    document.getElementById('commentsCount').textContent = comments.length;
    list.innerHTML = '';
    if (comments.length === 0) {
      list.innerHTML = '<div class="empty-note">No comments yet. Be the first to share your experience!</div>';
      return;
    }
    comments.forEach(c => {
      const row = document.createElement('div');
      row.className = 'comment-row';
      row.innerHTML = `
        <div class="top">
          <span class="author">${escapeHtml(c.name)}</span>
          <span class="date">${new Date(c.created_at).toLocaleDateString()}</span>
        </div>
        <div class="body">${escapeHtml(c.comment)}</div>
        ${adminToken ? `<button class="del-comment" title="Delete comment">${iconSvg('trash', 12)}</button>` : ''}
      `;
      if (adminToken) {
        row.querySelector('.del-comment').addEventListener('click', async () => {
          try { await api(`/comments/${c.id}`, { method: 'DELETE' }); loadComments(locationId); }
          catch (err) { showToast(err.message, true); }
        });
      }
      list.appendChild(row);
    });
  } catch (err) {
    list.innerHTML = '<div class="empty-note">Could not load comments.</div>';
  }
}
document.getElementById('commentText').addEventListener('input', (e) => {
  document.getElementById('commentCharCount').textContent = e.target.value.length;
});
document.getElementById('commentSubmitBtn').addEventListener('click', async () => {
  if (!currentDetailsId) return;
  const name = document.getElementById('commentName').value.trim();
  const comment = document.getElementById('commentText').value.trim();
  if (!name) { showToast('Please enter your name.', true); return; }
  if (!comment) { showToast('Please enter a comment.', true); return; }
  try {
    await api(`/locations/${currentDetailsId}/comments`, { method: 'POST', body: JSON.stringify({ name, comment }) });
    document.getElementById('commentName').value = '';
    document.getElementById('commentText').value = '';
    document.getElementById('commentCharCount').textContent = '0';
    loadComments(currentDetailsId);
    showToast('Comment added.');
  } catch (err) {
    showToast(err.message, true);
  }
});

// ===================== Init =====================
setLang('en');
setMode('view');
loadAll();

if (adminToken) {
  api('/admin/me').catch(() => {
    adminToken = null;
    sessionStorage.removeItem('labora_admin_token');
  });
}
