// A small hand-built icon set: simple, single-color (currentColor) line icons.
// Used everywhere in place of emoji per user preference.

const ICONS = {
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="20" y1="20" x2="15.5" y2="15.5"/>',
  chevronDown: '<polyline points="5 8 12 16 19 8"/>',
  chevronRight: '<polyline points="9 5 16 12 9 19"/>',
  pencil: '<path d="M4 20l3.5-1L18 8.5a2.1 2.1 0 0 0-3-3L4.5 16 4 20z"/>',
  trash: '<polyline points="4 7 20 7"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
  x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  star: '<polygon points="12 2 15 9 22 9.5 16.5 14 18 21 12 17.3 6 21 7.5 14 2 9.5 9 9" fill="currentColor" stroke="none"/>',
  starOutline: '<polygon points="12 2 15 9 22 9.5 16.5 14 18 21 12 17.3 6 21 7.5 14 2 9.5 9 9"/>',
  navigation: '<polygon points="12 2 19 21 12 17 5 21 12 2"/>',
  externalLink: '<path d="M14 4h6v6"/><line x1="20" y1="4" x2="11" y2="13"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
  messageCircle: '<path d="M21 12a8 8 0 1 1-3.5-6.6"/><path d="M21 12c0 4.4-3.6 8-8 8-1.2 0-2.3-.3-3.3-.7L4 21l1.7-4.8"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5.5-5.5a2 2 0 0 0-2.8 0L4 19"/>',
  mountain: '<path d="M3 20l6.5-11L14 15l2-3 5 8H3z"/>',
  pin: '<path d="M12 21s7-7.2 7-12a7 7 0 0 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/>',
  droplet: '<path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"/>',
  music: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/>',
  food: '<path d="M6 2v8a2 2 0 0 0 4 0V2M8 10v12M18 2c-2 1-3 3-3 6s1 4 3 4v10"/>',
  tree: '<path d="M12 2L6 12h3l-4 7h6v3M12 2l6 10h-3l4 7h-6"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><line x1="9" y1="7" x2="9" y2="7"/><line x1="15" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="9" y2="11"/><line x1="15" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="21" x2="9" y2="17"/><line x1="15" y1="21" x2="15" y2="17"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-2.5h5L16 7"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  paperclip: '<path d="M21 11l-9.5 9.5a4.5 4.5 0 0 1-6.4-6.4L14 5a3 3 0 0 1 4.2 4.2L9.5 18a1.5 1.5 0 0 1-2.1-2.1l7.8-7.8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3" y1="12" x2="21" y2="12"/>',
  graduation: '<path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
  heart: '<path d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z" fill="currentColor" stroke="none"/>'
};

function iconSvg(name, size = 16, strokeWidth = 2) {
  const inner = ICONS[name] || ICONS.pin;
  const isFilledStar = name === 'star';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-3px;">${inner}</svg>`;
}

// Replace any element with a data-icon attribute with the matching svg.
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon');
    const size = parseInt(el.getAttribute('data-icon-size') || '16', 10);
    el.innerHTML = iconSvg(name, size);
  });
}
