/* =====================================================================
   SPECTRA Writer — éditeur (script classique, fichiers concaténés dans l'ordre par tools/build.py, une seule IIFE)
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uidS = () => Math.random().toString(36).slice(2, 9);
const toast = msg => { const t = $('#toast'); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); };
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
const today = () => new Date().toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});
const MM = 96 / 25.4; // pixels par millimètre (96 dpi)
const IC = {
  b:'<svg viewBox="0 0 24 24"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/></svg>',
  i:'<svg viewBox="0 0 24 24"><path d="M10 5h8M6 19h8M14 5l-4 14"/></svg>',
  u:'<svg viewBox="0 0 24 24"><path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/></svg>',
  s:'<svg viewBox="0 0 24 24"><path d="M5 12h14M16 7a4 3 0 0 0-4-2.5C9.5 4.5 8 6 8 7.5c0 1.6 1.4 2.4 4 3M8 17c.6 1.6 2.2 2.5 4 2.5 2.5 0 4-1.4 4-3 0-.7-.2-1.3-.7-1.8"/></svg>',
  color:'<svg viewBox="0 0 24 24"><path d="M6 17 11 4h2l5 13M8 12h8"/></svg>',
  hl:'<svg viewBox="0 0 24 24"><path d="m14 4 6 6-8 8H6v-6zM4 20h16"/></svg>',
  al:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>',
  ac:'<svg viewBox="0 0 24 24"><path d="M4 6h16M7 10h10M4 14h16M7 18h10"/></svg>',
  ar:'<svg viewBox="0 0 24 24"><path d="M4 6h16M10 10h10M4 14h16M10 18h10"/></svg>',
  aj:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>',
  ul:'<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>',
  ol:'<svg viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5v4M3.5 8.5h3M3.5 13.2c0-.8.6-1.4 1.4-1.4s1.4.5 1.4 1.2c0 1.2-2.8 1.8-2.8 3h2.9"/></svg>',
  check:'<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="6" height="6" rx="1.5"/><path d="m4.8 7.6 1.3 1.3 2.4-2.6M13 7.5h7M3.5 14.5h6v6h-6zM13 17.5h7"/></svg>',
  indL:'<svg viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10M7 9l-3 3 3 3"/></svg>',
  indR:'<svg viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10M4 9l3 3-3 3"/></svg>',
  link:'<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  img:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>',
  table:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/></svg>',
  clear:'<svg viewBox="0 0 24 24"><path d="M6 5h12M12 5 9 19M4 20l16-16"/></svg>',
  undo:'<svg viewBox="0 0 24 24"><path d="M8 5 4 9l4 4M4 9h11a5 5 0 0 1 0 10h-4"/></svg>',
  redo:'<svg viewBox="0 0 24 24"><path d="m16 5 4 4-4 4M20 9H9a5 5 0 0 0 0 10h4"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  page:'<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus:'<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  grip:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  up:'<svg viewBox="0 0 24 24"><path d="m6 14 6-6 6 6"/></svg>',
  down:'<svg viewBox="0 0 24 24"><path d="m6 10 6 6 6-6"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  spacing:'<svg viewBox="0 0 24 24"><path d="M11 6h9M11 12h9M11 18h9M5 4v16M3 6l2-2 2 2M3 18l2 2 2-2"/></svg>',
  focus:'<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  sparkle:'<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>',
};
