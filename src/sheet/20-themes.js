/* ---------- Thèmes : couleurs + paire de polices, appliqués à tout le document en un clic (variables CSS) ---------- */
const FONT_Q = {
  'Inter':'ital,wght@0,400;0,500;0,600;0,700;0,800;1,400', 'Plus Jakarta Sans':'ital,wght@0,400;0,600;0,700;0,800;1,400',
  'Poppins':'ital,wght@0,400;0,500;0,600;0,700;0,800;1,400', 'Montserrat':'ital,wght@0,400;0,600;0,700;0,800;1,400',
  'DM Sans':'ital,wght@0,400;0,500;0,700;1,400', 'IBM Plex Sans':'ital,wght@0,400;0,500;0,600;0,700;1,400', 'Space Grotesk':'wght@400;500;600;700',
  'Nunito':'ital,wght@0,400;0,600;0,700;0,800;1,400', 'Lora':'ital,wght@0,400;0,600;0,700;1,400', 'Merriweather':'ital,wght@0,400;0,700;1,400',
  'Source Serif 4':'ital,wght@0,400;0,600;0,700;1,400', 'Playfair Display':'ital,wght@0,400;0,600;0,700;0,800;1,400', 'DM Serif Display':'ital@0;1',
  'Libre Baskerville':'ital,wght@0,400;0,700;1,400', 'Caveat':'wght@400;600;700', 'JetBrains Mono':'wght@400;600',
};
const FONTS = [
  ['Inter', 'sans-serif'], ['Plus Jakarta Sans', 'sans-serif'], ['Poppins', 'sans-serif'], ['Montserrat', 'sans-serif'], ['DM Sans', 'sans-serif'],
  ['IBM Plex Sans', 'sans-serif'], ['Space Grotesk', 'sans-serif'], ['Nunito', 'sans-serif'], ['Lora', 'serif'], ['Merriweather', 'serif'],
  ['Source Serif 4', 'serif'], ['Playfair Display', 'serif'], ['DM Serif Display', 'serif'], ['Libre Baskerville', 'serif'], ['Caveat', 'cursive'],
  ['JetBrains Mono', 'monospace'], ['Arial', 'sans-serif'], ['Georgia', 'serif'], ['Times New Roman', 'serif'], ['Verdana', 'sans-serif'], ['Courier New', 'monospace'],
];
const fontStack = n => { const f = FONTS.find(x => x[0] === n); return `'${String(n).replace(/'/g, '')}', ${f ? f[1] : 'sans-serif'}`; };
const loadedFonts = new Set(['Inter', 'Plus Jakarta Sans', 'JetBrains Mono']); // déjà chargées par la page
function ensureFont(name){
  if (!name || loadedFonts.has(name) || !FONT_Q[name]) return; loadedFonts.add(name);
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:${FONT_Q[name]}&display=swap`;
  document.head.appendChild(l);
}
const THEMES = [
  {id:'spectra', name:'Spectra', ac:'#6D3BFF', ac2:'#00A6E8', ac3:'#FF4D8D', ink:'#1C1830', mut:'#625D78', soft:'#F2EFFF', line:'#E4E0F2', fh:'Plus Jakarta Sans', fb:'Inter', hw:800,
    grad:'linear-gradient(120deg,#7B2FF7 0%,#2D6BFF 32%,#00C2FF 52%,#22D39A 70%,#FFC83D 85%,#FF5E62 100%)'},
  {id:'studio', name:'Studio Prism', ac:'#0A5E8E', ac2:'#03A2AC', ac3:'#071B55', ink:'#0F1B33', mut:'#4A5570', soft:'#EDF6F8', line:'#DDE5EA', fh:'Montserrat', fb:'Inter', hw:800, grad:'linear-gradient(120deg,#071B55,#0A5E8E 60%,#03A2AC)'},
  {id:'moderne', name:'Moderne', ac:'#4F46E5', ac2:'#06B6D4', ac3:'#F59E0B', ink:'#111827', mut:'#4B5563', soft:'#EEF2FF', line:'#E5E7EB', fh:'Space Grotesk', fb:'DM Sans', hw:700, grad:'linear-gradient(120deg,#4F46E5,#06B6D4)'},
  {id:'classique', name:'Classique', ac:'#1F2937', ac2:'#6B7280', ac3:'#9B2C2C', ink:'#111111', mut:'#555555', soft:'#F5F5F4', line:'#D9D9D6', fh:'Libre Baskerville', fb:'Source Serif 4', hw:700, grad:'linear-gradient(120deg,#1F2937,#4B5563)'},
  {id:'elegant', name:'Élégant', ac:'#9A7B4F', ac2:'#2E2A26', ac3:'#C9A96E', ink:'#2B2622', mut:'#6B6259', soft:'#F7F2EA', line:'#E7DED0', fh:'Playfair Display', fb:'Lora', hw:700, grad:'linear-gradient(120deg,#2E2A26,#9A7B4F)'},
  {id:'nature', name:'Nature', ac:'#2F7D4E', ac2:'#7FB35E', ac3:'#E0A526', ink:'#1E2A22', mut:'#55645A', soft:'#EEF6EF', line:'#DCE8DE', fh:'Nunito', fb:'Nunito', hw:800, grad:'linear-gradient(120deg,#1F5E3A,#2F7D4E 50%,#8BBF6A)'},
  {id:'ocean', name:'Océan', ac:'#0E7490', ac2:'#0EA5C6', ac3:'#F97316', ink:'#0B2530', mut:'#4A6670', soft:'#E9F7FA', line:'#D3E8EE', fh:'Montserrat', fb:'IBM Plex Sans', hw:700, grad:'linear-gradient(120deg,#0B3C5D,#0E7490 55%,#22D3EE)'},
  {id:'corail', name:'Corail', ac:'#E8505B', ac2:'#F28C4B', ac3:'#14B8A6', ink:'#2A1E22', mut:'#6E5A60', soft:'#FFF0EE', line:'#F3DEDA', fh:'Poppins', fb:'Poppins', hw:700, grad:'linear-gradient(120deg,#E8505B,#F9A26C)'},
  {id:'minuit', name:'Minuit', ac:'#7C4DEB', ac2:'#DB3E8F', ac3:'#22D3EE', ink:'#15131F', mut:'#5E5A70', soft:'#F3EEFF', line:'#E3DDF2', fh:'DM Serif Display', fb:'Inter', hw:400, grad:'linear-gradient(120deg,#15131F,#3B1F6E 55%,#8B5CF6)'},
  {id:'ardoise', name:'Ardoise', ac:'#334155', ac2:'#64748B', ac3:'#0EA5E9', ink:'#0F172A', mut:'#475569', soft:'#F1F5F9', line:'#E2E8F0', fh:'IBM Plex Sans', fb:'IBM Plex Sans', hw:700, grad:'linear-gradient(120deg,#0F172A,#334155)'},
  {id:'pastel', name:'Pastel', ac:'#6E5FD8', ac2:'#E58AAE', ac3:'#3FB3A6', ink:'#2D2A3E', mut:'#6C6880', soft:'#F5F3FF', line:'#E8E4F7', fh:'DM Sans', fb:'DM Sans', hw:700, grad:'linear-gradient(120deg,#A79BFF,#F2A7C3 55%,#FFD6A5)'},
  {id:'editorial', name:'Éditorial', ac:'#B42318', ac2:'#1D2939', ac3:'#F79009', ink:'#101828', mut:'#475467', soft:'#FEF3F2', line:'#EAECF0', fh:'DM Serif Display', fb:'Source Serif 4', hw:400, grad:'linear-gradient(120deg,#101828,#B42318)'},
  {id:'manuscrit', name:'Carnet', ac:'#2563EB', ac2:'#F59E0B', ac3:'#DB2777', ink:'#1E293B', mut:'#55607A', soft:'#EFF6FF', line:'#DCE6F5', fh:'Caveat', fb:'Nunito', hw:700, grad:'linear-gradient(120deg,#2563EB,#60A5FA)'},
];
const SWAP = {'#':''};
/* spec : {id, ac, ac2, fh, fb, fs, lh} (objet du document) ou "id|ac|ac2" (vignettes) */
function themeVals(spec){
  if (typeof spec === 'string'){ const [id, ac, ac2] = spec.split('|'); spec = {id, ac, ac2}; }
  spec = spec || {};
  const base = THEMES.find(t => t.id === spec.id) || THEMES[0];
  const v = {...base};
  ['ac', 'ac2', 'ac3', 'fh', 'fb', 'ink'].forEach(k => { if (spec[k]) v[k] = spec[k]; });
  v.fs = +spec.fs || 15; v.lh = +spec.lh || 1.55;
  if (spec.ac && spec.ac !== base.ac){ v.soft = mix(spec.ac, '#ffffff', .91); v.grad = `linear-gradient(120deg,${shade(spec.ac, -.25)},${spec.ac} 55%,${spec.ac2 || base.ac2})`; }
  return v;
}
function themeCss(spec){
  const v = themeVals(spec); ensureFont(v.fh); ensureFont(v.fb);
  return `--ac:${v.ac};--ac2:${v.ac2};--ac3:${v.ac3};--ink:${v.ink};--mut:${v.mut};--soft:${v.soft};--line:${v.line};--fh:${fontStack(v.fh).replace(/"/g, "'")};--fb:${fontStack(v.fb).replace(/"/g, "'")};--hw:${v.hw};--fs:${v.fs}px;--lh:${v.lh};--grad:${v.grad}`;
}
const themeKey = spec => [spec?.id || 'spectra', spec?.ac || '', spec?.ac2 || ''].join('|').slice(0, 40);
function hexRgb(h){ h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbHex(r, g, b){ return '#' + [r, g, b].map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t){ const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function shade(a, t){ return t < 0 ? mix(a, '#000000', -t) : mix(a, '#ffffff', t); }
window.SWThemes = {css:themeCss, vals:themeVals, list:THEMES, key:themeKey};

/* Feuille de style des documents (édition, vignettes ; résolue en valeurs fixes pour les exports Word et page web) */
