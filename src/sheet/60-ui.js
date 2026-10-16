/* ---------- Interface : barre Prisme, fenêtres contextuelles, onglets de feuilles, état, menu contextuel ---------- */
let popClose = null;
function openPop(anchor, html, wire, cls = ''){
  closePop(); const p = g$('edPop'); p.className = 'pop ' + cls; p.innerHTML = html; p.hidden = false;
  const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : {left:anchor.x, right:anchor.x, top:anchor.y, bottom:anchor.y};
  const w = p.offsetWidth, h = p.offsetHeight;
  p.style.left = clamp(r.left, 8, innerWidth - w - 8) + 'px'; p.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
  wire && wire(p);
  popClose = e => { if (!p.contains(e.target) && !(anchor.contains && anchor.contains(e.target))) closePop(); };
  setTimeout(() => document.addEventListener('mousedown', popClose), 0);
}
function closePop(){ const p = g$('edPop'); if (p) p.hidden = true; if (popClose) document.removeEventListener('mousedown', popClose); popClose = null; }
const STD_COLORS = ['#000000', '#3F3F46', '#71717A', '#B91C1C', '#EA580C', '#CA8A04', '#16A34A', '#0D9488', '#2563EB', '#4F46E5', '#9333EA', '#DB2777'];
const FILL_COLORS = ['#FFF1A8', '#FFE0B2', '#FFD1DC', '#E9D5FF', '#D6E4FF', '#CFF5E7', '#E2E8F0', '#FDE68A', '#FECACA', '#C7D2FE', '#BBF7D0', '#1A1726'];
function colorPop(anchor, key){
  const v = themeColors(), fill = key === 'bg';
  const themeC = [v.ac, v.ac2, v.ac3, mix(v.ac, '#ffffff', .82), mix(v.ac2, '#ffffff', .82), v.ink];
  openPop(anchor, `<p class="pop-h">Couleurs du thème</p><div class="pop-sw">${themeC.map(c => `<button type="button" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
    <p class="pop-h">${fill ? 'Remplissage' : 'Couleur du texte'}</p><div class="pop-sw">${(fill ? FILL_COLORS : STD_COLORS).map(c => `<button type="button" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
    <div class="pop-row"><label class="pop-custom"><input type="color" id="popCol" value="${fill ? '#fff1a8' : '#6d3bff'}"><span>Personnalisée</span></label><button type="button" class="pop-link" data-c="">${fill ? 'Aucun' : 'Automatique'}</button></div>`, p => {
    p.onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; closePop(); styleSel({[key]:b.dataset.c || null}, fill ? 'Remplissage' : 'Couleur'); LAST[key] = b.dataset.c; refreshToolbar(); };
    p.querySelector('#popCol').onchange = e => { closePop(); styleSel({[key]:e.target.value}); LAST[key] = e.target.value; refreshToolbar(); };
  });
}
const LAST = {fc:'#D92D20', bg:'#FFF1A8'};
function bordersPop(anchor){
  const B = [['all', 'Toutes'], ['out', 'Contour'], ['thick', 'Contour épais'], ['in', 'Intérieures'], ['top', 'Haut'], ['bottom', 'Bas'], ['dbl', 'Bas double'], ['left', 'Gauche'], ['right', 'Droite'], ['none', 'Aucune']];
  const ic = k => `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="2 2"/>${{all:'<path d="M4 4h16v16H4zM12 4v16M4 12h16"/>', out:'<path d="M4 4h16v16H4z"/>', thick:'<path d="M4 4h16v16H4z" stroke-width="3"/>', in:'<path d="M12 4v16M4 12h16"/>', top:'<path d="M4 4h16"/>', bottom:'<path d="M4 20h16"/>', dbl:'<path d="M4 18h16M4 21h16"/>', left:'<path d="M4 4v16"/>', right:'<path d="M20 4v16"/>', none:''}[k]}</svg>`;
  openPop(anchor, `<p class="pop-h">Bordures</p><div class="pop-row4">${B.map(([k, n]) => `<button type="button" data-b="${k}">${ic(k)}<span>${n}</span></button>`).join('')}</div>
    <div class="pop-row"><label class="pop-custom"><input type="color" id="popBc" value="#1a1726"><span>Couleur</span></label></div>`, p => {
    p.onclick = e => { const b = e.target.closest('[data-b]'); if (!b) return; closePop(); applyBorders(b.dataset.b, p.querySelector('#popBc').value); };
  }, 'wide');
}
function applyBorders(kind, col = '#1A1726'){
  const sh = sh0(), g = {...SEL}, u = sh.used(); g.r2 = Math.min(g.r2, Math.max(u.r, g.r1)); g.c2 = Math.min(g.c2, Math.max(u.c, g.c1));
  const L = '1px ' + col, T = '2px ' + col, D = '3px ' + col;
  tx('Bordures', () => { for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++){
    const top = r === g.r1, bot = r === g.r2, lef = c === g.c1, rig = c === g.c2, p = {};
    if (kind === 'none') Object.assign(p, {bt:null, br:null, bb:null, bl:null});
    if (kind === 'all') Object.assign(p, {bt:L, br:L, bb:L, bl:L});
    if (kind === 'out' || kind === 'thick'){ const w = kind === 'thick' ? T : L; if (top) p.bt = w; if (bot) p.bb = w; if (lef) p.bl = w; if (rig) p.br = w; }
    if (kind === 'in'){ if (!bot) p.bb = L; if (!rig) p.br = L; }
    if (kind === 'top' && top) p.bt = L; if (kind === 'bottom' && bot) p.bb = L; if (kind === 'dbl' && bot) p.bb = D + ' double'; if (kind === 'left' && lef) p.bl = L; if (kind === 'right' && rig) p.br = L;
    if (Object.keys(p).length) sh.setStyle(r, c, p); } });
}
function alignPop(anchor){
  const s = sh0().get(SEL.r, SEL.c)?.s || {};
  const A = [['l', 'Gauche', IC.al], ['c', 'Centre', IC.ac], ['r', 'Droite', IC.ar]], VA = [['t', 'Haut'], ['m', 'Milieu'], ['b', 'Bas']];
  openPop(anchor, `<p class="pop-h">Horizontal</p><div class="pop-row4" style="grid-template-columns:repeat(3,1fr)">${A.map(([k, n, ic]) => `<button type="button" data-ha="${k}" class="${s.ha === k ? 'on' : ''}">${ic}<span>${n}</span></button>`).join('')}</div>
    <p class="pop-h">Vertical</p><div class="seg" style="margin:0 6px 8px">${VA.map(([k, n]) => `<button type="button" data-va="${k}" aria-checked="${(s.va || 'b') === k}">${n}</button>`).join('')}</div>
    <label class="pop-toggle"><input type="checkbox" id="popWrap"${s.wrap ? ' checked' : ''}><span><b>Renvoyer à la ligne</b><small>Le texte long s'affiche sur plusieurs lignes</small></span></label>
    <div class="pop-size" style="padding:6px"><span>Retrait</span><button type="button" data-ind="-1">${IC.indL}</button><button type="button" data-ind="1">${IC.indR}</button></div>`, p => {
    p.onclick = e => { const a = e.target.closest('[data-ha]'), v = e.target.closest('[data-va]'), i = e.target.closest('[data-ind]');
      if (a){ styleSel({ha:s.ha === a.dataset.ha ? null : a.dataset.ha}, 'Alignement'); closePop(); }
      if (v){ styleSel({va:v.dataset.va === 'b' ? null : v.dataset.va}, 'Alignement'); closePop(); }
      if (i){ const n = Math.max(0, (s.ind || 0) + +i.dataset.ind); styleSel({ind:n || null}, 'Retrait'); s.ind = n; } refreshToolbar(); };
    p.querySelector('#popWrap').onchange = e => { styleSel({wrap:e.target.checked ? 1 : null}, 'Renvoi à la ligne'); };
  });
}
function fontPop(anchor){
  const s = sh0().get(SEL.r, SEL.c)?.s || {}, cur = s.ff || themeColors().fb;
  openPop(anchor, `<p class="pop-h">Police</p><div class="pop-fonts">${FONTS.map(([f]) => `<button type="button" data-f="${escH(f)}" class="${f === cur ? 'on' : ''}" style="font-family:${fontStack(f).replace(/"/g, "'")}">${escH(f)}</button>`).join('')}</div>
    <p class="pop-h">Taille <small>en points</small></p><div class="pop-sizes">${[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48].map(z => `<button type="button" data-fs="${z}" style="${(s.fs || 10) === z ? 'background:var(--ink);color:var(--panel)' : ''}">${z}</button>`).join('')}</div>`, p => {
    p.querySelectorAll('[data-f]').forEach(b => ensureFont(b.dataset.f));
    p.onclick = e => { const f = e.target.closest('[data-f]'), z = e.target.closest('[data-fs]'); if (f){ styleSel({ff:f.dataset.f === themeColors().fb ? null : f.dataset.f}, 'Police'); closePop(); } if (z){ styleSel({fs:+z.dataset.fs === 10 ? null : +z.dataset.fs}, 'Taille'); closePop(); layoutRowsForFont(); } };
  }, 'wide');
}
function layoutRowsForFont(){ const sh = sh0(); let ch = false; for (let r = SEL.r1; r <= Math.min(SEL.r2, sh.used().r); r++){ let mx = 0; for (let c = 0; c <= sh.used().c; c++){ const fs = sh.get(r, c)?.s?.fs; if (fs) mx = Math.max(mx, fs); } if (mx > 11 && !sh.rh[r]){ sh.rh[r] = Math.round(mx * 4 / 3 * 1.5 + 6); ch = true; } } if (ch){ layout(); schedule(); } }
function nfPop(anchor){
  const cur = sh0().get(SEL.r, SEL.c)?.s?.nf || '';
  openPop(anchor, `<p class="pop-h">Format des nombres</p><div class="pop-list nf">${NFORMATS.map(([k, n, ex]) => `<button type="button" data-nf="${escH(k)}" class="${k === cur ? 'on' : ''}"><span>${n}</span><small>${escH(ex)}</small></button>`).join('')}
    <hr><button type="button" data-nf="chk"><span>Case à cocher</span><small>☑ VRAI / FAUX</small></button><button type="button" data-nfc="1"><span>Format personnalisé…</span><small>0,00 "kg"</small></button></div>`, p => {
    p.onclick = e => { const b = e.target.closest('[data-nf]'); if (b){ closePop(); if (b.dataset.nf === 'chk') return makeCheckboxes(); styleSel({nf:b.dataset.nf || null}, 'Format'); refreshToolbar(); return; }
      if (e.target.closest('[data-nfc]')){ closePop(); SWAsk('Format personnalisé', 'Code de format (comme Excel), par exemple : 0,00 "kg" · # ##0 € · jj/mm/aaaa', cur.replace(/\./g, ','), 'Appliquer', async v => { const code = v.replace(/,(?=0|#)/g, '.').replace(/jj/gi, 'dd').replace(/aaaa/gi, 'yyyy').replace(/aa/gi, 'yy'); styleSel({nf:code}, 'Format'); }); } };
  }, 'wide');
}
function makeCheckboxes(){ const sh = sh0(); tx('Cases à cocher', () => selCellsIncludingEmpty((r, c) => { const v = WB.val(sh, r, c); if (typeof v !== 'boolean') sh.setRaw(r, c, 'FAUX'); sh.setStyle(r, c, {chk:1, ha:'c'}); })); }
function stepDecimals(d){
  const sh = sh0(), cell = sh.get(SEL.r, SEL.c), v = WB.val(sh, SEL.r, SEL.c); let nf = cell?.s?.nf || '';
  if (!nf || nf === '@'){ const s = typeof v === 'number' ? String(+v.toPrecision(12)) : ''; const dec = s.includes('.') ? s.split('.')[1].length : 0; nf = dec ? '0.' + '0'.repeat(dec) : '0'; }
  const f = compileFmt(nf); if (f.kind !== 'num') return;
  const m = /(\d)(\.0+)?(?![^"]*")/; let next;
  if (/0\.0*/.test(nf) || /0(?![.0])/.test(nf)){
    next = nf.replace(/0(\.0*)?(?=[^0.]*$|%|\s|"|$)/, (x, dec) => { const n = Math.max(0, (dec ? dec.length - 1 : 0) + d); return '0' + (n ? '.' + '0'.repeat(n) : ''); });
  } else next = nf;
  styleSel({nf:next}, 'Décimales');
}
/* ---------- la barre Prisme ---------- */
const TB_IC = {
  sigma:'<svg viewBox="0 0 24 24"><path d="M17 5H7l6 7-6 7h10"/></svg>',
  euro:'<svg viewBox="0 0 24 24"><path d="M17 6.5A6.5 6.5 0 1 0 17 17.5M4 10.5h9M4 13.5h9"/></svg>',
  pct:'<svg viewBox="0 0 24 24"><path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.3"/><circle cx="17" cy="17" r="2.3"/></svg>',
  decM:'<svg viewBox="0 0 24 24"><path d="M3 17h1M7 8a3 3 0 0 1 3 3v3a3 3 0 0 1-6 0v-3a3 3 0 0 1 3-3zM14 16h7M17 13l-3 3 3 3"/></svg>',
  decP:'<svg viewBox="0 0 24 24"><path d="M3 17h1M7 8a3 3 0 0 1 3 3v3a3 3 0 0 1-6 0v-3a3 3 0 0 1 3-3zM14 16h7M18 13l3 3-3 3"/></svg>',
  fill:'<svg viewBox="0 0 24 24"><path d="m5 12 7-7 7 7-7 7z"/><path d="M19 15s2 2.2 2 3.5a2 2 0 0 1-4 0c0-1.3 2-3.5 2-3.5z"/></svg>',
  border:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16" stroke-opacity=".45"/></svg>',
  merge:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 12h10M9 10l-2 2 2 2M15 10l2 2-2 2"/></svg>',
  wrap:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h13a3 3 0 0 1 0 6h-4M15 16l-2 2 2 2M4 18h5"/></svg>',
  sortA:'<svg viewBox="0 0 24 24"><path d="M7 4v16M4 17l3 3 3-3M14 5h6l-6 6h6M14 14h6M14 19h6"/></svg>',
  filter:'<svg viewBox="0 0 24 24"><path d="M4 5h16l-6 7.5V19l-4 1v-7.5z"/></svg>',
  magic:'<svg viewBox="0 0 24 24"><path d="m4 20 11-11M14 4l1.2 2.8L18 8l-2.8 1.2L14 12l-1.2-2.8L10 8l2.8-1.2zM19 13l.7 1.3L21 15l-1.3.7L19 17l-.7-1.3L17 15l1.3-.7z"/></svg>',
  chart:'<svg viewBox="0 0 24 24"><path d="M4 20V4M4 20h16"/><rect x="7" y="11" width="3" height="6" rx=".5"/><rect x="12" y="7" width="3" height="10" rx=".5"/><rect x="17" y="13" width="3" height="4" rx=".5"/></svg>',
  data:'<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6"/></svg>',
  cf:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5" fill="currentColor" fill-opacity=".35"/><rect x="4" y="13" width="7" height="7" rx="1.5" fill="currentColor" fill-opacity=".6"/><rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor"/></svg>',
  theme:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>',
  tpl:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
};
function buildToolbar(){
  const b = (k, title, ic, cls = '') => `<button type="button" class="tb ${cls}" data-t="${k}" title="${title}" aria-label="${title}">${ic}</button>`;
  g$('edBar').innerHTML = `<div class="tg">${b('undo', 'Annuler (Ctrl + Z)', IC.undo)}${b('redo', 'Rétablir (Ctrl + Y)', IC.redo)}</div>
    <div class="tg"><button type="button" class="tsel tnf" id="tNf" title="Format des nombres">Automatique</button>${b('eur', 'Format euros', TB_IC.euro)}${b('pct', 'Pourcentage', TB_IC.pct)}${b('decm', 'Moins de décimales', TB_IC.decM, 'hide-m')}${b('decp', 'Plus de décimales', TB_IC.decP, 'hide-m')}</div>
    <div class="tg">${b('font', 'Police et taille', '<span class="tb-aa">Aa</span>', 'tb-aa')}${b('b', 'Gras (Ctrl + B)', IC.b)}${b('i', 'Italique (Ctrl + I)', IC.i)}${b('u', 'Souligné (Ctrl + U)', IC.u, 'hide-s')}
      <button type="button" class="tb tcol" data-t="fc" title="Couleur du texte" aria-label="Couleur du texte">${IC.color}<i id="tFc"></i></button><button type="button" class="tb tcol" data-t="bg" title="Couleur de remplissage" aria-label="Couleur de remplissage">${TB_IC.fill}<i id="tBg"></i></button></div>
    <div class="tg">${b('border', 'Bordures', TB_IC.border)}${b('align', 'Alignement', IC.al)}${b('merge', 'Fusionner et centrer', TB_IC.merge, 'hide-s')}${b('wrap', 'Renvoyer à la ligne', TB_IC.wrap, 'hide-m')}</div>
    <div class="tg">${b('sum', 'Somme automatique (Alt + =)', TB_IC.sigma)}${b('sort', 'Trier de A à Z', TB_IC.sortA, 'hide-s')}${b('filter', 'Filtrer', TB_IC.filter, 'hide-s')}<button type="button" class="tb tb-magic" data-t="magic" title="Embellir : transforme la sélection en beau tableau" aria-label="Embellir">${TB_IC.magic}<span class="hide-m">Embellir</span></button></div>`;
  const R = [['insert', 'Insérer', TB_IC.plus, '#7B3FF2'], ['data', 'Données', TB_IC.data, '#12B5E5'], ['cf', 'Couleurs', TB_IC.cf, '#2FBF71'], ['theme', 'Thème', TB_IC.theme, '#F5B82E'], ['templates', 'Modèles', TB_IC.tpl, '#FF7A2F']];
  g$('edRail').innerHTML = R.map(([k, n, ic, c]) => `<button type="button" class="ray" data-panel="${k}" style="--ray:${c}" aria-pressed="false">${ic}<span>${n}</span></button>`).join('');
}
function refreshToolbar(){
  const s = sh0().get(SEL.r, SEL.c)?.s || {};
  for (const k of ['b', 'i', 'u', 'wrap']) g$('edBar').querySelector(`[data-t="${k}"]`)?.classList.toggle('on', !!s[k]);
  g$('edBar').querySelector('[data-t="merge"]')?.classList.toggle('on', !!sh0().mergeAt(SEL.r, SEL.c));
  g$('edBar').querySelector('[data-t="filter"]')?.classList.toggle('on', !!sh0().filter);
  const nf = s.nf || ''; const f = NFORMATS.find(x => x[0] === nf); g$('tNf').textContent = f ? f[1] : nf === 'chk' || s.chk ? 'Case' : nf ? 'Personnalisé' : 'Automatique';
  g$('tFc').style.background = LAST.fc; g$('tBg').style.background = LAST.bg;
  const al = g$('edBar').querySelector('[data-t="align"]'); if (al) al.innerHTML = s.ha === 'c' ? IC.ac : s.ha === 'r' ? IC.ar : IC.al;
}
function onToolbar(e){
  const b = e.target.closest('[data-t]'); if (!b){ if (e.target.closest('#tNf')) nfPop(g$('tNf')); return; }
  if (EDIT.on && !['undo', 'redo'].includes(b.dataset.t)) commitEdit(0, 0);
  const k = b.dataset.t, s = sh0().get(SEL.r, SEL.c)?.s || {};
  switch (k){
    case 'undo': return undo(); case 'redo': return redo();
    case 'eur': return styleSel({nf:s.nf === '#,##0.00 €' ? null : '#,##0.00 €'}, 'Format euros');
    case 'pct': return styleSel({nf:s.nf === '0%' ? null : '0%'}, 'Pourcentage');
    case 'decm': return stepDecimals(-1); case 'decp': return stepDecimals(1);
    case 'font': return fontPop(b);
    case 'b': case 'i': case 'u': case 'wrap': return toggleStyle(k);
    case 'fc': case 'bg': return colorPop(b, k);
    case 'border': return bordersPop(b); case 'align': return alignPop(b);
    case 'merge': return toggleMerge();
    case 'sum': return sumPop(b);
    case 'sort': return sortSel(true);
    case 'filter': return toggleFilter();
    case 'magic': return beautify();
  }
}
function sumPop(anchor){
  openPop(anchor, `<div class="pop-list">${[['SOMME', 'Somme'], ['MOYENNE', 'Moyenne'], ['NB', 'Nombre de valeurs'], ['MAX', 'Maximum'], ['MIN', 'Minimum']].map(([f, n]) => `<button type="button" data-f="${f}"><span class="emo">Σ</span>${n}<kbd>${f}</kbd></button>`).join('')}<hr><button type="button" data-more="1"><span class="emo">ƒ</span>Toutes les fonctions…</button></div>`, p => {
    p.onclick = e => { const f = e.target.closest('[data-f]'); if (f){ closePop(); autoSum(f.dataset.f); } if (e.target.closest('[data-more]')){ closePop(); fnDialog(); } };
  });
}
/* ---------- fusion ---------- */
function toggleMerge(){
  const sh = sh0(), m = sh.mergeAt(SEL.r, SEL.c);
  if (m && m.r1 === SEL.r1 && m.r2 === SEL.r2 && m.c1 === SEL.c1 && m.c2 === SEL.c2){ tx('Défusionner', () => { sh.merges = sh.merges.filter(x => x !== m); }); return; }
  if (SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2) return toast('Sélectionnez plusieurs cellules à fusionner');
  if (SEL.r2 - SEL.r1 > 500 || SEL.c2 - SEL.c1 > 100) return toast('Sélection trop grande pour une fusion');
  let lost = 0; for (let r = SEL.r1; r <= SEL.r2; r++) for (let c = SEL.c1; c <= SEL.c2; c++) if ((r !== SEL.r1 || c !== SEL.c1) && WB.val(sh, r, c) != null) lost++;
  const go = () => tx('Fusionner', () => { sh.merges = sh.merges.filter(x => x.r2 < SEL.r1 || x.r1 > SEL.r2 || x.c2 < SEL.c1 || x.c1 > SEL.c2);
    for (let r = SEL.r1; r <= SEL.r2; r++) for (let c = SEL.c1; c <= SEL.c2; c++) if (r !== SEL.r1 || c !== SEL.c1) sh.setRaw(r, c, '');
    sh.merges.push({r1:SEL.r1, c1:SEL.c1, r2:SEL.r2, c2:SEL.c2}); sh.setStyle(SEL.r1, SEL.c1, {ha:'c', va:'m'}); SEL.r = SEL.r1; SEL.c = SEL.c1; });
  if (lost) SWDlg.open(`<h3>Fusionner les cellules</h3><p class="dlg-p">Seule la valeur en haut à gauche sera conservée (${lost} autre${lost > 1 ? 's' : ''} valeur${lost > 1 ? 's' : ''} effacée${lost > 1 ? 's' : ''}).</p><div class="dlg-acts"><button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="mgOk">Fusionner</button></div>`, d => { d.querySelector('#mgOk').onclick = () => { SWDlg.close(); go(); }; });
  else go();
}
/* ---------- onglets des feuilles ---------- */
function renderTabs(){
  const el = g$('shTabs');
  el.innerHTML = WB.sheets.map((s, i) => `<button type="button" role="tab" class="sht${i === WB.active ? ' on' : ''}" data-sheet="${i}" aria-selected="${i === WB.active}" style="${s.tab ? `--tab:${s.tab}` : ''}" draggable="true"><span>${escH(s.name)}</span></button>`).join('')
    + `<button type="button" class="sht-add" data-sheet-add="1" title="Nouvelle feuille" aria-label="Nouvelle feuille">${IC.plus}</button>`;
  el.querySelector('.sht.on')?.scrollIntoView({block:'nearest', inline:'nearest'});
}
function switchSheet(i){
  if (i === WB.active || !WB.sheets[i]) return;
  if (EDIT.on){ if (edVal()[0] === '=' ){ EDIT.bar = true; g$('gEdit').hidden = true; } else if (!commitEdit(0, 0)) return; }
  const cur = WB.sh; cur.selSave = {...SEL}; cur.scroll = {x:V.sx, y:V.sy};
  WB.active = i; const sh = WB.sh;
  Object.assign(SEL, sh.selSave || {r:0, c:0, r1:0, c1:0, r2:0, c2:0, ar:0, ac:0});
  V.nr = 120; V.nc = 26; layout(); const sc = g$('gScroll'); sc.scrollLeft = sh.scroll?.x || 0; sc.scrollTop = sh.scroll?.y || 0;
  renderTabs(); schedule(); selChanged(); emitChange();
  if (EDIT.on && EDIT.bar){ g$('fxIn').focus(); }
}
function sheetMenu(anchor, i){
  const s = WB.sheets[i];
  openPop(anchor, `<div class="pop-list">
    <button type="button" data-a="ren">${IC.page}Renommer</button><button type="button" data-a="dup">${IC.copy}Dupliquer</button>
    <button type="button" data-a="left"${i === 0 ? ' disabled' : ''}>${IC.up}Déplacer vers la gauche</button><button type="button" data-a="right"${i === WB.sheets.length - 1 ? ' disabled' : ''}>${IC.down}Déplacer vers la droite</button>
    <hr><p class="pop-h">Couleur de l'onglet</p><div class="pop-sw">${['', '#7B3FF2', '#3D63FF', '#12B5E5', '#2FBF71', '#F5B82E', '#FF7A2F', '#F2387A', '#1A1726'].map(c => `<button type="button" data-tab="${c}" style="background:${c || 'var(--panel)'};${c ? '' : 'box-shadow:inset 0 0 0 1px var(--line2)'}" title="${c ? '' : 'Aucune'}"></button>`).join('')}</div>
    <hr><button type="button" data-a="grid">${s.grid ? 'Masquer' : 'Afficher'} le quadrillage</button>
    <button type="button" data-a="del" class="danger"${WB.sheets.length < 2 ? ' disabled' : ''}>${IC.trash}Supprimer la feuille</button></div>`, p => {
    p.onclick = e => { const b = e.target.closest('[data-a]'), t = e.target.closest('[data-tab]');
      if (t){ closePop(); tx('Couleur d\'onglet', () => { s.tab = t.dataset.tab; }); renderTabs(); return; } if (!b) return; closePop(); const a = b.dataset.a;
      if (a === 'ren') return renameSheet(i);
      if (a === 'dup') return wbOp('Dupliquer la feuille', () => { const j = JSON.parse(JSON.stringify(s.toJSON())); const ns = WB.addSheet(WB.freeName(s.name + ' (copie)').replace(/ \d+$/, m => m), i + 1); j.name = uniqueSheetName(s.name + ' (copie)'); ns.load(j); WB.active = i + 1; });
      if (a === 'left' || a === 'right') return wbOp('Déplacer la feuille', () => { const j = a === 'left' ? i - 1 : i + 1; [WB.sheets[i], WB.sheets[j]] = [WB.sheets[j], WB.sheets[i]]; WB.active = j; });
      if (a === 'grid'){ tx('Quadrillage', () => { s.grid = !s.grid; }); schedule(); return; }
      if (a === 'del') return SWDlg.open(`<h3>Supprimer « ${escH(s.name)} » ?</h3><p class="dlg-p">Les formules des autres feuilles qui y font référence afficheront #REF!. Ctrl + Z permet d'annuler.</p><div class="dlg-acts"><button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn danger" id="shDel">Supprimer</button></div>`, d => { d.querySelector('#shDel').onclick = () => { SWDlg.close(); wbOp('Supprimer la feuille', () => { WB.sheets.splice(i, 1); WB.active = Math.max(0, Math.min(WB.active, WB.sheets.length - 1) - (i < WB.active ? 1 : 0)); }); }; });
    };
  });
}
function uniqueSheetName(base){ let n = base, i = 2; while (WB.byName(n)) n = `${base} ${i++}`; return n.slice(0, 31); }
function wbOp(label, fn){ tx(label, fn, {full:true}); WB.recalc(); V.nr = 120; V.nc = 26; layout(); renderTabs(); schedule(); selChanged(); }
function renameSheet(i){
  const s = WB.sheets[i];
  SWAsk('Renommer la feuille', 'Nom de la feuille', s.name, 'Renommer', async v => {
    v = v.replace(/[\\/?*[\]:]/g, '').trim().slice(0, 31); if (!v) throw new Error('Nom invalide');
    if (WB.byName(v) && WB.byName(v) !== s) throw new Error('Une feuille porte déjà ce nom');
    const old = s.name; wbOp('Renommer la feuille', () => { s.name = v; for (const o of WB.sheets) for (const [k, cell] of o.cells) if (cell.raw && cell.raw[0] === '=' && cell.raw.includes(old)){ const nr = '=' + renameSheetInFormula(cell.raw.slice(1), old, v); if (nr !== cell.raw) o.setRaw(KR(k), KC(k), nr, true); } });
  });
}
function addSheet(){ wbOp('Nouvelle feuille', () => { WB.addSheet(WB.freeName(), WB.active + 1); WB.active++; }); }
/* ---------- barre d'état : somme, moyenne, nombre de la sélection ---------- */
function updateStat(){
  const el = g$('shStat'); const sh = sh0(); let n = 0, cnt = 0, s = 0, mn = Infinity, mx = -Infinity, nf = '';
  if (SEL.r1 !== SEL.r2 || SEL.c1 !== SEL.c2){
    eachSel((r, c) => { const v = WB.val(sh, r, c); if (v == null || v === '') return; cnt++; if (typeof v === 'number'){ n++; s += v; mn = Math.min(mn, v); mx = Math.max(mx, v); if (!nf) nf = sh.get(r, c)?.s?.nf || ''; } }, 300000);
  }
  if (!cnt){ el.innerHTML = ''; return; }
  const f = x => formatValue(x, nf && compileFmt(nf).kind !== 'date' ? nf : '#,##0.##').t;
  el.innerHTML = n ? `<button type="button" data-st="sum" title="Copier">Somme <b>${f(s)}</b></button><button type="button" data-st="avg" class="hide-s">Moyenne <b>${f(s / n)}</b></button><span class="hide-m">Nb <b>${cnt}</b></span><span class="hide-m">Min <b>${f(mn)}</b></span><span class="hide-m">Max <b>${f(mx)}</b></span>` : `<span>Nb <b>${cnt}</b></span>`;
  el.dataset.sum = s; el.dataset.avg = n ? s / n : '';
}
/* ---------- menu contextuel ---------- */
function ctxMenu(e){
  e.preventDefault(); if (EDIT.on) return;
  const p = gvXY(e), isCol = p.y < V.hh && p.x > V.hw, isRow = p.x < V.hw && p.y > V.hh;
  const full = SEL.r1 === 0 && SEL.r2 >= MAXR - 1, fullR = SEL.c1 === 0 && SEL.c2 >= MAXC - 1;
  const ro = V.ro ? ' disabled' : '';
  const nC = SEL.c2 - SEL.c1 + 1 > 1000 ? 1 : SEL.c2 - SEL.c1 + 1, nR = SEL.r2 - SEL.r1 + 1 > 10000 ? 1 : SEL.r2 - SEL.r1 + 1;
  const items = `
    <button type="button" data-cx="cut"${ro}>Couper<kbd>Ctrl X</kbd></button><button type="button" data-cx="copy">Copier<kbd>Ctrl C</kbd></button><button type="button" data-cx="paste"${ro}>Coller<kbd>Ctrl V</kbd></button>
    <button type="button" data-cx="pval"${ro || (!CLIP.cells ? ' disabled' : '')}>Coller les valeurs seulement</button><button type="button" data-cx="pfmt"${ro || (!CLIP.cells ? ' disabled' : '')}>Coller la mise en forme</button><hr>
    ${isCol || full ? `<button type="button" data-cx="icl"${ro}>Insérer ${nC > 1 ? nC + ' colonnes' : 'une colonne'} à gauche</button><button type="button" data-cx="icr"${ro}>Insérer à droite</button><button type="button" data-cx="dc"${ro}>Supprimer ${nC > 1 ? 'les colonnes' : 'la colonne'}</button><button type="button" data-cx="hc"${ro}>Masquer</button><button type="button" data-cx="fitc">Largeur automatique</button>`
    : isRow || fullR ? `<button type="button" data-cx="ira"${ro}>Insérer ${nR > 1 ? nR + ' lignes' : 'une ligne'} au-dessus</button><button type="button" data-cx="irb"${ro}>Insérer en dessous</button><button type="button" data-cx="dr"${ro}>Supprimer ${nR > 1 ? 'les lignes' : 'la ligne'}</button><button type="button" data-cx="hr"${ro}>Masquer</button>`
    : `<button type="button" data-cx="ira"${ro}>Insérer une ligne au-dessus</button><button type="button" data-cx="icl"${ro}>Insérer une colonne à gauche</button><button type="button" data-cx="dr"${ro}>Supprimer la ligne</button><button type="button" data-cx="dc"${ro}>Supprimer la colonne</button>`}
    <hr><button type="button" data-cx="clear"${ro}>Effacer le contenu<kbd>Suppr</kbd></button><button type="button" data-cx="clearf"${ro}>Effacer la mise en forme</button>
    <button type="button" data-cx="sorta"${ro}>Trier de A à Z</button><button type="button" data-cx="sortz"${ro}>Trier de Z à A</button>
    <button type="button" data-cx="note"${ro}>${sh0().get(SEL.r, SEL.c)?.note ? 'Modifier la note' : 'Ajouter une note'}</button>
    <button type="button" data-cx="freeze">${sh0().freeze.r || sh0().freeze.c ? 'Libérer les volets' : 'Figer jusqu\'ici'}</button>
    <button type="button" data-cx="chart"${ro}>Créer un graphique</button><button type="button" data-cx="name"${ro}>Nommer la plage…</button>`;
  openPop({x:e.clientX, y:e.clientY, getBoundingClientRect:() => ({left:e.clientX, right:e.clientX, top:e.clientY, bottom:e.clientY})}, `<div class="pop-list ctx">${items}</div>`, pp => {
    pp.onclick = ev => { const b = ev.target.closest('[data-cx]'); if (!b || b.disabled) return; closePop(); ctxRun(b.dataset.cx); };
  }, 'menu');
}
function ctxRun(k){
  const sh = sh0();
  switch (k){
    case 'cut': g$('grid').focus(); document.execCommand('cut') || toast('Utilisez Ctrl + X'); break;
    case 'copy': g$('grid').focus(); document.execCommand('copy') || toast('Utilisez Ctrl + C'); break;
    case 'paste': if (CLIP.cells) pasteInternal('all'); else navigator.clipboard?.readText?.().then(t => t && pasteRows(parseTSV(t))).catch(() => toast('Utilisez Ctrl + V pour coller')); break;
    case 'pval': pasteInternal('values'); break; case 'pfmt': pasteInternal('format'); break;
    case 'icl': insertCols(SEL.c1, Math.min(1000, SEL.c2 - SEL.c1 + 1)); break; case 'icr': insertCols(SEL.c2 + 1, Math.min(1000, SEL.c2 - SEL.c1 + 1)); break;
    case 'ira': insertRows(SEL.r1, Math.min(10000, SEL.r2 - SEL.r1 + 1) || 1); break; case 'irb': insertRows(SEL.r2 + 1, Math.min(10000, SEL.r2 - SEL.r1 + 1) || 1); break;
    case 'dr': deleteRows(SEL.r1, Math.min(SEL.r2, sh.used().r + 1) - SEL.r1 + 1); break; case 'dc': deleteCols(SEL.c1, Math.min(SEL.c2, sh.used().c + 1) - SEL.c1 + 1); break;
    case 'hc': tx('Masquer des colonnes', () => { for (let c = SEL.c1; c <= Math.min(SEL.c2, SEL.c1 + 200); c++) sh.hc.add(c); }); break;
    case 'hr': tx('Masquer des lignes', () => { for (let r = SEL.r1; r <= Math.min(SEL.r2, SEL.r1 + 5000); r++) sh.hr.add(r); }); break;
    case 'fitc': autofitCols(range(SEL.c1, Math.min(SEL.c2, sh.used().c))); break;
    case 'clear': clearSel('contents'); break; case 'clearf': clearSel('format'); break;
    case 'sorta': sortSel(true); break; case 'sortz': sortSel(false); break;
    case 'note': noteDlg(); break;
    case 'freeze': tx('Figer les volets', () => { sh.freeze = sh.freeze.r || sh.freeze.c ? {r:0, c:0} : {r:SEL.r, c:SEL.c}; }); g$('gScroll').scrollTo(0, 0); break;
    case 'chart': addChart('col'); break;
    case 'name': nameDlg(); break;
  }
}
function insertRows(at, n){ if (V.ro) return; tx('Insérer des lignes', () => structOp(sh0(), 'r', at, n), {full:true}); WB.recalc(); afterChange(true); }
function insertCols(at, n){ if (V.ro) return; tx('Insérer des colonnes', () => structOp(sh0(), 'c', at, n), {full:true}); WB.recalc(); afterChange(true); }
function deleteRows(at, n){ if (V.ro || n < 1) return; tx('Supprimer des lignes', () => structOp(sh0(), 'r', at, -n), {full:true}); WB.recalc(); afterChange(true); }
function deleteCols(at, n){ if (V.ro || n < 1) return; tx('Supprimer des colonnes', () => structOp(sh0(), 'c', at, -n), {full:true}); WB.recalc(); afterChange(true); }
function insertCells(){ if (SEL.c1 === 0 && SEL.c2 >= MAXC - 1) return insertRows(SEL.r1, SEL.r2 - SEL.r1 + 1); if (SEL.r1 === 0 && SEL.r2 >= MAXR - 1) return insertCols(SEL.c1, SEL.c2 - SEL.c1 + 1); insertRows(SEL.r1, SEL.r2 - SEL.r1 + 1); }
function deleteCells(){ if (SEL.r1 === 0 && SEL.r2 >= MAXR - 1) return deleteCols(SEL.c1, SEL.c2 - SEL.c1 + 1); deleteRows(SEL.r1, SEL.r2 - SEL.r1 + 1); }
function noteDlg(){
  const sh = sh0(), cell = sh.get(SEL.r, SEL.c);
  SWDlg.open(`<h3>Note sur ${A1(SEL.r, SEL.c)}</h3><textarea id="noteIn" class="dlg-ta" rows="5" maxlength="2000" placeholder="Une précision, une source, un rappel…">${escH(cell?.note || '')}</textarea>
    <div class="dlg-acts">${cell?.note ? '<button class="ap-btn alt danger-t" id="noteDel">Supprimer</button>' : ''}<button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="noteOk">Enregistrer</button></div>`, d => {
    const set = v => { tx('Note', () => { const k = KEY(SEL.r, SEL.c); WB.rec(sh, k, sh.cells.get(k)); let c = sh.cells.get(k); if (!c){ c = {raw:'', v:null}; sh.cells.set(k, c); sh._used = null; } c.note = v || undefined; if (!c.note && !c.s && c.raw === '') sh.cells.delete(k); }); SWDlg.close(); };
    d.querySelector('#noteOk').onclick = () => set(d.querySelector('#noteIn').value.trim()); const del = d.querySelector('#noteDel'); if (del) del.onclick = () => set('');
  });
}
function nameDlg(){
  SWAsk('Nommer la plage ' + rangeA1(SEL), 'Nom (sans espace), par exemple TauxTVA', '', 'Nommer', async v => {
    v = v.trim().replace(/\s+/g, '_'); if (!/^[A-Za-zÀ-ÿ_][\wÀ-ÿ.]*$/.test(v) || parseA1(v)) throw new Error('Nom invalide (lettres, chiffres, _ ; pas une adresse comme A1)');
    tx('Nommer une plage', () => { WB.names[v.toUpperCase()] = {ref:rangeA1(SEL), sheet:sh0().name, label:v}; }, {full:true}); WB.recalc(); schedule(); toast(`« ${v} » utilisable dans vos formules`);
  });
}
/* une ligne de totaux en bas d'un tableau ne se trie pas et n'est pas une catégorie de graphique */
function isTotalRow(sh, r, c1, c2){ return range(c1, c2).some(c => /^=(SOMME|SUM|SOUS\.TOTAL|SUBTOTAL|MOYENNE|AVERAGE)\(/i.test(sh.get(r, c)?.raw || '')) && (WB.val(sh, r, c1) == null || /^(total|moyenne|sous-total)/i.test(String(WB.val(sh, r, c1)))); }
function trimTotal(sh, g){ const o = {...g}; while (o.r2 > o.r1 + 1 && isTotalRow(sh, o.r2, o.c1, o.c2)) o.r2--; return o; }
/* Tri de la plage (ou de la région autour de la cellule active) */
function sortSel(asc, col){
  if (V.ro) return; const sh = sh0();
  let g = SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2 ? trimTotal(sh, currentRegion(SEL.r, SEL.c)) : {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, sh.used().r), c2:Math.min(SEL.c2, sh.used().c)};
  if (g.r1 === g.r2) return toast('Rien à trier ici');
  // en-tête détectée : la première ligne est du texte alors que la colonne contient des nombres, ou elle est en gras
  const first = WB.val(sh, g.r1, col ?? SEL.c), second = WB.val(sh, g.r1 + 1, col ?? SEL.c);
  const hdr = sh.get(g.r1, SEL.c)?.s?.b || (typeof first === 'string' && typeof second !== 'string' && second != null) || sh.tables.some(t => parseRange(t.range)?.r1 === g.r1);
  const r0 = hdr ? g.r1 + 1 : g.r1, key = (col ?? SEL.c);
  sortRows(sh, {r1:r0, c1:g.c1, r2:g.r2, c2:g.c2}, [{c:key, asc}]);
  toast(`Trié ${asc ? 'de A à Z' : 'de Z à A'} par la colonne ${colName(key)}${hdr ? ' (en-tête conservée)' : ''}`);
}
function sortRows(sh, g, keys){
  tx('Trier', () => {
    const rows = []; for (let r = g.r1; r <= g.r2; r++){ const row = []; for (let c = g.c1; c <= g.c2; c++) row.push(cloneCell(sh.get(r, c))); rows.push({r, row, k:keys.map(k => WB.val(sh, r, k.c))}); }
    rows.sort((a, b) => { for (let i = 0; i < keys.length; i++){ const x = a.k[i], y = b.k[i]; const ex = x == null || x === '', ey = y == null || y === ''; if (ex !== ey) return ex ? 1 : -1; const d = cmpVal(x, y); if (d) return keys[i].asc ? d : -d; } return a.r - b.r; });
    rows.forEach((o, i) => { const r = g.r1 + i; o.row.forEach((d, j) => { if (d && d.raw && d.raw[0] === '=') d = {...d, raw:'=' + shiftFormula(d.raw.slice(1), r - o.r, 0)}; sh.setCell(r, g.c1 + j, d); }); });
  });
}
/* Filtre automatique sur la région de la cellule active */
function toggleFilter(){
  const sh = sh0();
  if (sh.filter){ tx('Retirer le filtre', () => { sh.filter = null; sh.hr = new Set(); }); toast('Filtre retiré'); return; }
  const g = SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2 ? currentRegion(SEL.r, SEL.c) : {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, sh.used().r), c2:Math.min(SEL.c2, sh.used().c)};
  if (g.r1 === g.r2) return toast('Sélectionnez un tableau avec une ligne d\'en-tête');
  tx('Filtrer', () => { sh.filter = {range:rangeA1(g), crit:{}}; });
  toast('Filtre ajouté : cliquez sur ▾ dans les en-têtes');
}
function applyFilter(sh){
  const f = sh.filter; if (!f) return; const g = parseRange(f.range); sh.hr = new Set();
  for (let r = g.r1 + 1; r <= g.r2; r++){ for (const [ci, cr] of Object.entries(f.crit || {})){ if (!cr) continue; const v = WB.val(sh, r, g.c1 + +ci); const t = v == null ? '' : formatValue(v, sh.get(r, g.c1 + +ci)?.s?.nf).t;
      let ok = true; if (cr.vals) ok = cr.vals.includes(t); if (ok && cr.q) ok = t.toLowerCase().includes(cr.q.toLowerCase()); if (!ok){ sh.hr.add(r); break; } } }
}
function filterPop(anchor, c){
  const sh = sh0(), f = sh.filter, g = parseRange(f.range), ci = c - g.c1, cr = f.crit[ci] || null;
  const values = new Map(); for (let r = g.r1 + 1; r <= g.r2; r++){ const v = WB.val(sh, r, c); const t = v == null ? '' : formatValue(v, sh.get(r, c)?.s?.nf).t; if (!values.has(t)) values.set(t, v); }
  const list = [...values.entries()].sort((a, b) => cmpVal(a[1], b[1]));
  openPop(anchor, `<div class="flt"><div class="flt-sort"><button type="button" data-fs="1">${TB_IC.sortA} Trier A → Z</button><button type="button" data-fs="0">Trier Z → A</button></div>
    <input class="flt-q" id="fltQ" placeholder="Chercher" value="${escH(cr?.q || '')}">
    <label class="flt-all"><input type="checkbox" id="fltAll"${!cr?.vals ? ' checked' : ''}> <b>Tout sélectionner</b></label>
    <div class="flt-list">${list.map(([t]) => `<label><input type="checkbox" data-v="${escH(t)}"${!cr?.vals || cr.vals.includes(t) ? ' checked' : ''}> ${t === '' ? '<i>(vide)</i>' : escH(t)}</label>`).join('')}</div>
    <div class="dlg-acts"><button type="button" class="ap-btn alt" id="fltClr">Effacer</button><button type="button" class="ap-btn" id="fltOk">Filtrer</button></div></div>`, p => {
    const boxes = () => [...p.querySelectorAll('[data-v]')];
    p.querySelector('#fltAll').onchange = e => boxes().forEach(b => b.checked = e.target.checked);
    p.querySelector('#fltQ').oninput = e => { const q = e.target.value.toLowerCase(); boxes().forEach(b => b.parentElement.hidden = q && !b.dataset.v.toLowerCase().includes(q)); };
    p.querySelectorAll('[data-fs]').forEach(b => b.onclick = () => { closePop(); sortRows(sh, {r1:g.r1 + 1, c1:g.c1, r2:g.r2, c2:g.c2}, [{c, asc:b.dataset.fs === '1'}]); });
    p.querySelector('#fltClr').onclick = () => { closePop(); tx('Filtre', () => { delete f.crit[ci]; applyFilter(sh); }); };
    p.querySelector('#fltOk').onclick = () => { closePop(); const on = boxes().filter(b => b.checked && !b.parentElement.hidden).map(b => b.dataset.v); const all = on.length === boxes().length;
      tx('Filtre', () => { f.crit[ci] = all ? null : {vals:on}; if (!f.crit[ci]) delete f.crit[ci]; applyFilter(sh); }); const hidden = sh.hr.size; toast(hidden ? `${hidden} ligne${hidden > 1 ? 's' : ''} masquée${hidden > 1 ? 's' : ''} par le filtre` : 'Toutes les lignes sont visibles'); };
  }, 'wide');
}
/* listes déroulantes (validation) */
function dvAtCell(sh, r, c){ return sh.dv.find(d => { const g = parseRange(d.range); return g && r >= g.r1 && r <= g.r2 && c >= g.c1 && c <= g.c2; }); }
function dvItems(d){ if (d.src){ const g = parseRange(d.src); const sh = d.srcSheet ? WB.byName(d.srcSheet) : sh0(); if (g && sh){ const out = []; for (let r = g.r1; r <= Math.min(g.r2, g.r1 + 500); r++) for (let c = g.c1; c <= g.c2; c++){ const v = WB.val(sh, r, c); if (v != null && v !== '') out.push(formatValue(v, sh.get(r, c)?.s?.nf).t); } return [...new Set(out)]; } } return d.list || []; }
function dvPop(btn){
  const [r, c] = btn.dataset.dv.split(',').map(Number), sh = sh0(), d = dvAtCell(sh, r, c); if (!d) return;
  const items = dvItems(d), cur = formatValue(WB.val(sh, r, c), sh.get(r, c)?.s?.nf).t;
  openPop(btn, `<div class="pop-list dvl">${items.map(t => `<button type="button" data-it="${escH(t)}" class="${t === cur ? 'on' : ''}">${d.colors?.[t] ? `<i style="background:${d.colors[t]}"></i>` : ''}${escH(t)}</button>`).join('') || '<p class="pop-h">Liste vide</p>'}<hr><button type="button" data-it="">Effacer</button></div>`, p => {
    p.onclick = e => { const b = e.target.closest('[data-it]'); if (!b) return; closePop(); tx('Choix dans la liste', () => { sh.setRaw(r, c, b.dataset.it); if (d.colors){ const col = d.colors[b.dataset.it]; sh.setStyle(r, c, {bg:col || null, fc:col ? (luma(col) < .5 ? '#ffffff' : '#1A1726') : null}); } }); g$('grid').focus(); };
  });
}
const luma = h => { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
