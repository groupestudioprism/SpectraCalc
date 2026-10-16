/* ---------- Sélection, saisie, formules (pointage, saisie semi-automatique), presse-papiers, poignée de recopie ---------- */
const EDIT = {on:false, r:0, c:0, orig:'', bar:false, refs:[], ptr:null, ac:{items:[], i:0, from:0}};
const CLIP = {box:null, sheet:null, cut:false, cells:null, text:''};
const FILLP = {box:null};
const sh0 = () => WB.sh;
const inSel = (r, c) => r >= SEL.r1 && r <= SEL.r2 && c >= SEL.c1 && c <= SEL.c2;
function selectCell(r, c, extend){
  r = clamp(r, 0, MAXR - 1); c = clamp(c, 0, MAXC - 1);
  if (extend){ SEL.r1 = Math.min(SEL.ar, r); SEL.r2 = Math.max(SEL.ar, r); SEL.c1 = Math.min(SEL.ac, c); SEL.c2 = Math.max(SEL.ac, c); SEL.er = r; SEL.ec = c; selMergeExpand(); }
  else { const m = sh0().mergeAt(r, c); SEL.r = m ? m.r1 : r; SEL.c = m ? m.c1 : c; SEL.ar = SEL.r; SEL.ac = SEL.c; SEL.er = r; SEL.ec = c; if (m){ SEL.r1 = m.r1; SEL.c1 = m.c1; SEL.r2 = m.r2; SEL.c2 = m.c2; } else { SEL.r1 = SEL.r2 = r; SEL.c1 = SEL.c2 = c; } }
  if (r >= V.nr - 5 || c >= V.nc - 3){ V.nr = Math.max(V.nr, r + 50); V.nc = Math.max(V.nc, c + 5); layout(); }
  scrollToCell(extend ? r : SEL.r, extend ? c : SEL.c); schedule(); selChanged();
}
function selectRange(g, act){ Object.assign(SEL, {r1:g.r1, c1:g.c1, r2:g.r2, c2:g.c2, r:act?.r ?? g.r1, c:act?.c ?? g.c1, ar:g.r1, ac:g.c1, er:g.r2, ec:g.c2}); schedule(); selChanged(); }
const selChangedSoon = debounce(() => { refreshToolbar(); updateStat(); }, 40);
function selChanged(){ if (!EDIT.on) syncBar(); selChangedSoon(); }
function syncBar(){ const cell = sh0().get(SEL.r, SEL.c); const t = editRaw(cell); const fx = g$('fxIn'); if (document.activeElement !== fx){ fx.value = t; autoGrowBar(); } }
function editRaw(cell){
  if (!cell) return '';
  if (cell.raw && cell.raw[0] === '=') return cell.raw;
  if (typeof cell.v === 'number' && cell.s?.nf) return editText(cell.v, cell.s.nf);
  return cell.raw ?? '';
}
function autoGrowBar(){ const fx = g$('fxIn'); fx.style.height = 'auto'; fx.style.height = Math.min(160, Math.max(30, fx.scrollHeight)) + 'px'; }
/* ---------- édition ---------- */
function startEdit(text, opts = {}){
  if (V.ro){ toast('Classeur en lecture seule'); return; }
  const sh = sh0(), cell = sh.get(SEL.r, SEL.c);
  if (cell?.s?.lock && sh.protect){ toast('Cette cellule est verrouillée'); return; }
  EDIT.on = true; EDIT.sheet = WB.sh.id; EDIT.r = SEL.r; EDIT.c = SEL.c; EDIT.orig = editRaw(cell); EDIT.bar = !!opts.bar; EDIT.ptr = null; EDIT.typed = text != null;
  const ed = g$('gEdit'); ed.value = text != null ? text : EDIT.orig; ed.hidden = false;
  const s = cell?.s || {}; ed.style.fontWeight = s.b ? '700' : ''; ed.style.fontStyle = s.i ? 'italic' : ''; ed.style.fontSize = s.fs ? (s.fs * 4 / 3 * V.z) + 'px' : ''; ed.style.textAlign = s.ha === 'c' ? 'center' : s.ha === 'r' ? 'right' : 'left';
  ed.style.fontFamily = s.ff ? fontStack(s.ff) : ''; ed.style.background = s.bg || ''; ed.style.color = s.fc || '';
  placeEditor();
  if (!opts.bar){ ed.focus({preventScroll:true}); const n = ed.value.length; ed.setSelectionRange(n, n); }
  g$('fxIn').value = ed.value; autoGrowBar(); g$('fxOk').hidden = false; g$('grid').classList.add('editing');
  editInput();
}
function placeEditor(){
  const ed = g$('gEdit'); if (ed.hidden) return;
  const m = sh0().mergeAt(EDIT.r, EDIT.c); const rc = m ? rectOf(m.r1, m.c1, m.r2, m.c2) : rectOf(EDIT.r, EDIT.c, EDIT.r, EDIT.c);
  const x = Math.max(rc.x, V.hw), y = Math.max(rc.y, V.hh);
  ed.style.left = x + 'px'; ed.style.top = y + 'px'; ed.style.minWidth = Math.max(40, rc.w + 1) + 'px'; ed.style.minHeight = (rc.h + 1) + 'px'; ed.style.maxWidth = Math.max(160, V.vw - x - 8) + 'px';
  ed.style.width = '0px'; ed.style.width = Math.min(V.vw - x - 8, Math.max(rc.w + 1, ed.scrollWidth + 6)) + 'px';
  ed.style.height = '0px'; ed.style.height = Math.max(rc.h + 1, ed.scrollHeight) + 'px';
}
function edVal(){ return EDIT.bar ? g$('fxIn').value : g$('gEdit').value; }
function edEl(){ return EDIT.bar ? g$('fxIn') : g$('gEdit'); }
function editInput(){
  const v = edVal();
  if (EDIT.bar) g$('gEdit').value = v; else { g$('fxIn').value = v; autoGrowBar(); }
  placeEditor();
  EDIT.refs = v[0] === '=' ? formulaRefs(v.slice(1)).map(t => { const g = parseRange(t.a + (t.b ? ':' + t.b : '')); return g ? {...g, sheet:t.sheet} : null; }).filter(Boolean) : [];
  acUpdate(); hintUpdate(); renderSel();
}
/* le curseur est-il à un endroit où une référence peut être insérée ? */
function canPoint(){
  const el = edEl(), v = el.value; if (v[0] !== '=') return false;
  const pos = el.selectionStart; if (EDIT.ptr && pos === EDIT.ptr.end) return true;
  const before = v.slice(0, pos).replace(/\s+$/, '');
  return /[=(;,+\-*/^&<>:]$/.test(before);
}
function insertRef(g, sheetName){
  const el = edEl(); let v = el.value, s = el.selectionStart, e = el.selectionEnd;
  if (EDIT.ptr && EDIT.ptr.end === s){ s = EDIT.ptr.start; }
  const txt = (sheetName && sheetName !== WB.sheets.find(x => x.id === EDIT.sheet)?.name ? quoteSheet(sheetName) + '!' : '') + rangeA1(g);
  v = v.slice(0, s) + txt + v.slice(e); el.value = v; const ne = s + txt.length; el.setSelectionRange(ne, ne);
  EDIT.ptr = {start:s, end:ne, g}; editInput();
}
function commitEdit(dr = 1, dc = 0){
  if (!EDIT.on) return true;
  let raw = edVal();
  const sh = WB.sheets.find(s => s.id === EDIT.sheet) || sh0();
  if (raw[0] === '=' && raw.length > 1){
    // parenthèses oubliées : on les ferme
    let open = 0, q = false; for (const ch of raw){ if (ch === '"') q = !q; else if (!q && ch === '(') open++; else if (!q && ch === ')') open--; } if (open > 0) raw += ')'.repeat(open);
    try { parseFormula(raw.slice(1)); }
    catch(e){ toast('Formule incomplète ou incorrecte : vérifiez les parenthèses et les « ; »'); edEl().focus(); return false; }
  }
  closeEdit();
  if (WB.sh !== sh){ WB.active = WB.sheets.indexOf(sh); layout(); renderTabs(); }
  if (raw !== EDIT.orig){
    tx('Saisie', () => {
      const multi = EDIT.fillAll && (SEL.r1 !== SEL.r2 || SEL.c1 !== SEL.c2);
      if (multi){ for (let r = SEL.r1; r <= SEL.r2; r++) for (let c = SEL.c1; c <= SEL.c2; c++) sh.setRaw(r, c, raw[0] === '=' ? '=' + shiftFormula(raw.slice(1), r - EDIT.r, c - EDIT.c) : raw); }
      else sh.setRaw(EDIT.r, EDIT.c, raw);
      // date saisie : on élargit la colonne si besoin
      autoWidenAfterInput(sh, EDIT.r, EDIT.c);
    });
  }
  EDIT.fillAll = false;
  if (dr || dc) moveAfterCommit(dr, dc); else schedule();
  g$('grid').focus({preventScroll:true});
  return true;
}
function autoWidenAfterInput(sh, r, c){
  const v = WB.val(sh, r, c), cell = sh.get(r, c); if (typeof v !== 'number') return; WB.recalc();
  const t = formatValue(WB.val(sh, r, c), cell?.s?.nf).t; const w = measureText(t, cell?.s) + 14;
  if (w > sh.colW(c) && !sh.cw[c]){ sh.cw[c] = Math.min(260, Math.ceil(w)); layout(); }
}
function moveAfterCommit(dr, dc){
  const multi = SEL.r1 !== SEL.r2 || SEL.c1 !== SEL.c2;
  if (multi){ // on parcourt la sélection
    let r = SEL.r + dr, c = SEL.c + dc;
    if (dr){ if (r > SEL.r2){ r = SEL.r1; c++; if (c > SEL.c2) c = SEL.c1; } if (r < SEL.r1){ r = SEL.r2; c--; if (c < SEL.c1) c = SEL.c2; } }
    if (dc){ if (c > SEL.c2){ c = SEL.c1; r++; if (r > SEL.r2) r = SEL.r1; } if (c < SEL.c1){ c = SEL.c2; r--; if (r < SEL.r1) r = SEL.r2; } }
    SEL.r = r; SEL.c = c; scrollToCell(r, c); schedule(); selChanged(); return;
  }
  // Entrée après une série de Tab : retour à la colonne de départ (comme Excel)
  if (dr && EDIT.tabStart != null){ selectCell(SEL.r + dr, EDIT.tabStart); EDIT.tabStart = null; return; }
  if (dc > 0 && EDIT.tabStart == null) EDIT.tabStart = SEL.c;
  const m = sh0().mergeAt(SEL.r, SEL.c);
  selectCell((dr > 0 && m ? m.r2 : SEL.r) + dr, (dc > 0 && m ? m.c2 : SEL.c) + dc);
}
function closeEdit(){
  EDIT.on = false; EDIT.refs = []; EDIT.ptr = null; const ed = g$('gEdit'); ed.hidden = true; ed.value = '';
  g$('gAc').hidden = true; g$('gHint').hidden = true; g$('fxOk').hidden = true; g$('grid').classList.remove('editing');
  if (document.activeElement === g$('fxIn')) g$('fxIn').blur();
  syncBar(); renderSel();
}
function cancelEdit(){ if (!EDIT.on) return; const sh = WB.sheets.find(s => s.id === EDIT.sheet); closeEdit(); if (sh && WB.sh !== sh){ WB.active = WB.sheets.indexOf(sh); layout(); renderTabs(); schedule(); } g$('grid').focus({preventScroll:true}); }
/* ---------- saisie semi-automatique des fonctions et aide sur les arguments ---------- */
function fnList(){ return FN_INFO; }
function acUpdate(){
  const el = edEl(), v = el.value, pos = el.selectionStart, box = g$('gAc');
  if (v[0] !== '=' || pos !== el.selectionEnd){ box.hidden = true; return; }
  const before = v.slice(0, pos), m = /(?:^=|[=(;,+\-*/^&<> ])([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9.]*)$/.exec(before);
  if (!m || /^[A-Z]{1,3}\d+$/i.test(m[1]) && !/[A-Z]{4}/i.test(m[1])){ if (!m){ box.hidden = true; return; } }
  const q = nrmTxt(m[1]).toUpperCase();
  const L = fnList().filter(f => nrmTxt(f.fr).toUpperCase().startsWith(q) || f.en.startsWith(q)).sort((a, b) => (nrmTxt(a.fr).toUpperCase().startsWith(q) ? 0 : 1) - (nrmTxt(b.fr).toUpperCase().startsWith(q) ? 0 : 1) || a.fr.length - b.fr.length).slice(0, 8);
  if (!L.length){ box.hidden = true; return; }
  EDIT.ac = {items:L, i:Math.min(EDIT.ac.i || 0, L.length - 1), from:pos - m[1].length};
  if (EDIT.ac.q !== q){ EDIT.ac.i = 0; EDIT.ac.q = q; }
  box.innerHTML = L.map((f, i) => `<button type="button" data-ac="${i}" class="${i === EDIT.ac.i ? 'on' : ''}"><b>${escH(f.fr)}</b><small>${escH(f.desc)}</small></button>`).join('') + '<p>Tab pour choisir</p>';
  box.hidden = false; placeFloat(box);
}
function acAccept(i = EDIT.ac.i){
  const f = EDIT.ac.items[i]; if (!f) return; const el = edEl(), v = el.value, pos = el.selectionStart;
  const name = f.fr + '(', nv = v.slice(0, EDIT.ac.from) + name + v.slice(pos); el.value = nv; const np = EDIT.ac.from + name.length; el.setSelectionRange(np, np);
  g$('gAc').hidden = true; editInput(); el.focus();
}
function hintUpdate(){
  const el = edEl(), v = el.value, pos = el.selectionStart, box = g$('gHint');
  if (v[0] !== '=' || !g$('gAc').hidden){ box.hidden = true; return; }
  // fonction englobante et numéro d'argument
  let depth = 0, argI = 0, q = false; const stack = [];
  for (let i = 1; i < pos; i++){ const ch = v[i]; if (ch === '"'){ q = !q; continue; } if (q) continue;
    if (ch === '('){ const m = /([A-Za-zÀ-ÿ][\w.À-ÿ]*)\s*$/.exec(v.slice(0, i)); stack.push({name:m ? m[1].toUpperCase() : '', arg:0}); }
    else if (ch === ')') stack.pop(); else if ((ch === ';' || ch === ',') && stack.length) stack[stack.length - 1].arg++; }
  const top = stack[stack.length - 1]; if (!top || !top.name){ box.hidden = true; return; }
  const f = FN_INFO.find(x => x.fr === top.name || x.en === top.name || FN_ALIAS[top.name] === x.en); if (!f){ box.hidden = true; return; }
  const parts = f.syn.split(';').map(s => s.trim()); const k = Math.min(top.arg, parts.length - 1);
  box.innerHTML = `<b>${escH(f.fr)}</b>(${parts.map((p, i) => i === k || (i === parts.length - 1 && top.arg >= parts.length && /…/.test(p)) ? `<u>${escH(p)}</u>` : escH(p)).join('; ')})<small>${escH(f.desc)}</small>`;
  box.hidden = false; placeFloat(box);
}
function placeFloat(box){
  if (EDIT.bar){ const r = g$('fxIn').getBoundingClientRect(), gv = g$('gView').getBoundingClientRect(); box.style.left = Math.max(4, r.left - gv.left) + 'px'; box.style.top = '4px'; return; }
  const ed = g$('gEdit'); box.style.left = ed.offsetLeft + 'px'; const below = ed.offsetTop + ed.offsetHeight + 4;
  box.style.top = (below + 200 > V.vh ? Math.max(4, ed.offsetTop - box.offsetHeight - 4) : below) + 'px';
}
/* ---------- souris dans la grille ---------- */
const DRAG = {mode:'', x:0, y:0};
function gvXY(e){ const r = g$('gView').getBoundingClientRect(); return {x:e.clientX - r.left, y:e.clientY - r.top}; }
function onGridDown(e){
  if (e.button === 2) { const p = gvXY(e); if (p.x > V.hw && p.y > V.hh){ const h = cellAt(p.x, p.y); if (!inSel(h.r, h.c) && !EDIT.on) selectCell(h.r, h.c); } return; }
  if (e.button !== 0) return;
  const t = e.target;
  if (t.closest('.g-obj') || t.closest('.g-edit') || t.closest('.g-ac')) return;
  const p = gvXY(e);
  if (t.closest('[data-dv]')){ e.preventDefault(); dvPop(t.closest('[data-dv]')); return; }
  if (t.closest('[data-flt]')){ e.preventDefault(); filterPop(t.closest('[data-flt]'), +t.closest('[data-flt]').dataset.flt); return; }
  if (t.closest('[data-cb]')){ e.preventDefault(); const [r, c] = t.closest('[data-cb]').dataset.cb.split(',').map(Number); toggleCheck(r, c); return; }
  if (t.id === 'gFill'){ e.preventDefault(); DRAG.mode = 'fill'; DRAG.src = {r1:SEL.r1, c1:SEL.c1, r2:SEL.r2, c2:SEL.c2}; return; }
  if (t.closest('.g-corner')){ selectRange({r1:0, c1:0, r2:MAXR - 1, c2:MAXC - 1}, {r:0, c:0}); return; }
  // en-têtes : redimensionnement ou sélection de colonnes / lignes
  if (p.y < V.hh && p.x > V.hw){ const edge = colEdge(p.x); if (edge != null){ e.preventDefault(); DRAG.mode = 'cw'; DRAG.c = edge; DRAG.x = p.x; DRAG.w0 = WB.sh.colW(edge); return; }
    const h = cellAt(p.x, V.hh + 1); if (EDIT.on && canPoint()){ e.preventDefault(); insertRef({r1:0, c1:h.c, r2:MAXR - 1, c2:h.c}); return; }
    if (EDIT.on && !commitEdit(0, 0)) return;
    e.preventDefault(); DRAG.mode = 'cols'; DRAG.c0 = e.shiftKey ? SEL.ac : h.c; selectRange({r1:0, c1:Math.min(DRAG.c0, h.c), r2:MAXR - 1, c2:Math.max(DRAG.c0, h.c)}, {r:Math.max(0, V.fr && V.sy ? 0 : 0), c:DRAG.c0}); SEL.ac = DRAG.c0; return; }
  if (p.x < V.hw && p.y > V.hh){ const edge = rowEdge(p.y); if (edge != null){ e.preventDefault(); DRAG.mode = 'rh'; DRAG.r = edge; DRAG.y = p.y; DRAG.h0 = WB.sh.rowH(edge); return; }
    const h = cellAt(V.hw + 1, p.y); if (EDIT.on && !commitEdit(0, 0)) return;
    e.preventDefault(); DRAG.mode = 'rows'; DRAG.r0 = e.shiftKey ? SEL.ar : h.r; selectRange({r1:Math.min(DRAG.r0, h.r), c1:0, r2:Math.max(DRAG.r0, h.r), c2:MAXC - 1}, {r:DRAG.r0, c:0}); SEL.ar = DRAG.r0; return; }
  if (p.x < V.hw || p.y < V.hh) return;
  const h = cellAt(p.x, p.y);
  if (EDIT.on){
    if (canPoint()){ e.preventDefault(); DRAG.mode = 'point'; DRAG.p0 = h; insertRef({r1:h.r, c1:h.c, r2:h.r, c2:h.c}, WB.sh.name); return; }
    if (h.r === EDIT.r && h.c === EDIT.c && WB.sh.id === EDIT.sheet) return;
    if (!commitEdit(0, 0)) { e.preventDefault(); return; }
  }
  e.preventDefault(); g$('grid').focus({preventScroll:true});
  // Ctrl + clic sur un lien
  const v = WB.val(WB.sh, h.r, h.c); if ((e.ctrlKey || e.metaKey) && typeof v === 'string' && /^https?:\/\//i.test(v)){ window.open(v, '_blank', 'noopener'); return; }
  selectCell(h.r, h.c, e.shiftKey); DRAG.mode = 'sel';
}
function colEdge(x){ for (let c = 0; c < V.nc; c++){ const l = colLeft(c) + colW(c); if (c >= V.fc && l > V.vw) break; if (Math.abs(x - l) <= 4 && (c < V.fc || colLeft(c) >= V.hw + V.fw - 2)) return c; } return null; }
function rowEdge(y){ const vr = visRange(); for (const r of [...range(0, V.fr - 1), ...range(vr.r1, vr.r2)]){ const b = rowTop(r) + rowH(r); if (Math.abs(y - b) <= 3) return r; } return null; }
function onGridMove(e){
  const p = gvXY(e);
  if (!DRAG.mode){ const ch = g$('gColH'), rh = g$('gRowH'); if (p.y < V.hh && p.x > V.hw) ch.style.cursor = colEdge(p.x) != null ? 'col-resize' : ''; if (p.x < V.hw && p.y > V.hh) rh.style.cursor = rowEdge(p.y) != null ? 'row-resize' : ''; return; }
  if (DRAG.mode === 'cw'){ const w = Math.max(4, DRAG.w0 + (p.x - DRAG.x) / V.z); WB.sh.cw[DRAG.c] = Math.round(w); layout(); schedule(); tipAt(e, `${Math.round(w)} px`); return; }
  if (DRAG.mode === 'rh'){ const h = Math.max(6, DRAG.h0 + (p.y - DRAG.y) / V.z); WB.sh.rh[DRAG.r] = Math.round(h); layout(); schedule(); tipAt(e, `${Math.round(h)} px`); return; }
  autoScroll(p);
  const h = cellAt(clamp(p.x, V.hw + 1, V.vw - 2), clamp(p.y, V.hh + 1, V.vh - 2));
  if (DRAG.mode === 'sel'){ if (h.r !== SEL.er || h.c !== SEL.ec) selectCell(h.r, h.c, true); }
  else if (DRAG.mode === 'cols'){ selectRange({r1:0, c1:Math.min(DRAG.c0, h.c), r2:MAXR - 1, c2:Math.max(DRAG.c0, h.c)}, {r:0, c:DRAG.c0}); SEL.ac = DRAG.c0; }
  else if (DRAG.mode === 'rows'){ selectRange({r1:Math.min(DRAG.r0, h.r), c1:0, r2:Math.max(DRAG.r0, h.r), c2:MAXC - 1}, {r:DRAG.r0, c:0}); SEL.ar = DRAG.r0; }
  else if (DRAG.mode === 'point'){ const g = {r1:Math.min(DRAG.p0.r, h.r), c1:Math.min(DRAG.p0.c, h.c), r2:Math.max(DRAG.p0.r, h.r), c2:Math.max(DRAG.p0.c, h.c)}; if (rangeA1(g) !== rangeA1(EDIT.ptr?.g || {})) insertRef(g, WB.sh.name); }
  else if (DRAG.mode === 'fill'){
    const s = DRAG.src; let box;
    const dDown = h.r > s.r2 ? h.r - s.r2 : h.r < s.r1 ? s.r1 - h.r : 0, dRight = h.c > s.c2 ? h.c - s.c2 : h.c < s.c1 ? s.c1 - h.c : 0;
    if (!dDown && !dRight) box = null;
    else if (dDown >= dRight) box = h.r > s.r2 ? {r1:s.r2 + 1, c1:s.c1, r2:h.r, c2:s.c2} : {r1:h.r, c1:s.c1, r2:s.r1 - 1, c2:s.c2};
    else box = h.c > s.c2 ? {r1:s.r1, c1:s.c2 + 1, r2:s.r2, c2:h.c} : {r1:s.r1, c1:h.c, r2:s.r2, c2:s.c1 - 1};
    FILLP.box = box; renderSel();
    if (box){ const fn = previewFill(s, box); tipAt(e, fn); } else g$('gTip').hidden = true;
  }
}
function onGridUp(){
  if (!DRAG.mode) return; const m = DRAG.mode; DRAG.mode = ''; stopAutoScroll(); g$('gTip').hidden = true;
  if (m === 'cw' || m === 'rh'){ tx(m === 'cw' ? 'Largeur de colonne' : 'Hauteur de ligne', () => {}); afterChange(); return; }
  if (m === 'fill' && FILLP.box){ const box = FILLP.box; FILLP.box = null; fillOp(DRAG.src, box); return; }
  FILLP.box = null; renderSel();
}
let ASI = 0;
function autoScroll(p){
  const sc = g$('gScroll'); let dx = 0, dy = 0;
  if (p.x > V.vw - 20) dx = 24; else if (p.x < V.hw + V.fw + 4 && V.sx > 0 && DRAG.mode !== 'rows') dx = -24;
  if (p.y > V.vh - 20) dy = 24; else if (p.y < V.hh + V.fh + 4 && V.sy > 0 && DRAG.mode !== 'cols') dy = -24;
  clearInterval(ASI); if (!dx && !dy) return;
  ASI = setInterval(() => { sc.scrollLeft += dx; sc.scrollTop += dy; }, 30);
}
function stopAutoScroll(){ clearInterval(ASI); }
function tipAt(e, t){ const tp = g$('gTip'); const p = gvXY(e); tp.textContent = t; tp.hidden = false; tp.style.left = (p.x + 14) + 'px'; tp.style.top = (p.y + 16) + 'px'; }
function onGridDbl(e){
  const t = e.target, p = gvXY(e);
  if (t.id === 'gFill'){ fillDownAuto(); return; }
  if (p.y < V.hh && p.x > V.hw){ const edge = colEdge(p.x); if (edge != null){ autofitCols(SEL.c1 <= edge && edge <= SEL.c2 ? range(SEL.c1, Math.min(SEL.c2, V.nc - 1)) : [edge]); } return; }
  if (p.x < V.hw && p.y > V.hh){ const edge = rowEdge(p.y); if (edge != null){ tx('Hauteur automatique', () => { delete WB.sh.rh[edge]; }); layout(); schedule(); } return; }
  if (t.closest('.g-obj') || p.x < V.hw || p.y < V.hh) return;
  startEdit();
}
/* ---------- largeur automatique ---------- */
let MCTX = null;
function measureText(t, s){
  if (!MCTX) MCTX = document.createElement('canvas').getContext('2d');
  const tv = themeColors(); MCTX.font = `${s?.i ? 'italic ' : ''}${s?.b ? '700 ' : '400 '}${s?.fs ? s.fs * 4 / 3 : 13}px ${fontStack(s?.ff || tv.fb)}`;
  return Math.max(...String(t).split('\n').map(x => MCTX.measureText(x).width));
}
function autofitCols(cols){
  const sh = sh0(), u = sh.used();
  tx('Largeur automatique', () => { for (const c of cols){ let w = 30; for (let r = 0; r <= Math.min(u.r, 5000); r++){ const cell = sh.get(r, c), v = WB.val(sh, r, c); if (v == null || sh.mergeAt(r, c)) continue; w = Math.max(w, measureText(formatValue(v, cell?.s?.nf).t, cell?.s) + 16); } sh.cw[c] = Math.min(600, Math.ceil(w)); } });
  layout(); schedule();
}
/* ---------- recopie ---------- */
function previewFill(s, box){
  const fn = seriesFn(srcCellsFor(s, box), ...dirOf(s, box)); const r = fn(0); return r ? (r.raw[0] === '=' ? r.raw : formatValue(parseInput(r.raw).v, r.s?.nf || parseInput(r.raw).nf).t || r.raw) : '';
}
function dirOf(s, box){ return box.r1 > s.r2 ? [1, 0] : box.r2 < s.r1 ? [-1, 0] : box.c1 > s.c2 ? [0, 1] : [0, -1]; }
function srcCellsFor(s, box, lane = 0){
  const [dr, dc] = dirOf(s, box), sh = sh0(), out = [];
  if (dr){ const c = s.c1 + lane; for (let r = s.r1; r <= s.r2; r++) out.push({r, c, cell:sh.get(r, c)}); if (dr < 0) out.reverse(); }
  else { const r = s.r1 + lane; for (let c = s.c1; c <= s.c2; c++) out.push({r, c, cell:sh.get(r, c)}); if (dc < 0) out.reverse(); }
  return out;
}
function fillOp(s, box){
  const [dr, dc] = dirOf(s, box), sh = sh0();
  tx('Recopie', () => {
    const lanes = dr ? s.c2 - s.c1 + 1 : s.r2 - s.r1 + 1;
    for (let l = 0; l < lanes; l++){
      const src = srcCellsFor(s, box, l); const fn = seriesFn(src, dr, dc);
      const n = dr ? box.r2 - box.r1 + 1 : box.c2 - box.c1 + 1;
      for (let k = 0; k < n; k++){
        const r = dr > 0 ? box.r1 + k : dr < 0 ? box.r2 - k : s.r1 + l, c = dc > 0 ? box.c1 + k : dc < 0 ? box.c2 - k : s.c1 + l;
        // décalage réel par rapport à la source correspondante pour les formules
        const d = fn(k); sh.setCell(r, c, d);
      }
    }
  });
  selectRange({r1:Math.min(s.r1, box.r1), c1:Math.min(s.c1, box.c1), r2:Math.max(s.r2, box.r2), c2:Math.max(s.c2, box.c2)}, {r:SEL.r, c:SEL.c});
}
function fillDownAuto(){
  const sh = sh0(), s = {r1:SEL.r1, c1:SEL.c1, r2:SEL.r2, c2:SEL.c2};
  let last = -1; for (const c of [s.c1 - 1, s.c2 + 1]){ if (c < 0) continue; let r = s.r2 + 1; if (WB.val(sh, r, c) == null) continue; while (r < MAXR && WB.val(sh, r + 1, c) != null) r++; last = Math.max(last, r); }
  if (last <= s.r2){ toast('Rien à côté pour savoir jusqu\'où recopier'); return; }
  fillOp(s, {r1:s.r2 + 1, c1:s.c1, r2:last, c2:s.c2});
}
/* ---------- clavier ---------- */
function dataEdge(r, c, dr, dc){
  const sh = sh0(), has = (rr, cc) => rr >= 0 && cc >= 0 && WB.val(sh, rr, cc) != null && WB.val(sh, rr, cc) !== '';
  const u = sh.used(), lim = dr ? Math.max(u.r + 1, V.nr - 1) : Math.max(u.c + 1, V.nc - 1);
  let rr = r, cc = c;
  const step = () => { rr += dr; cc += dc; };
  const inside = () => rr >= 0 && cc >= 0 && (dr ? rr <= lim : cc <= lim);
  if (has(r, c) && has(r + dr, c + dc)){ while (inside() && has(rr + dr, cc + dc)) step(); return {r:rr, c:cc}; }
  step(); while (inside() && !has(rr, cc)) step();
  if (!inside()) return {r:clamp(rr - dr, 0, dr ? lim : MAXR), c:clamp(cc - dc, 0, dc ? lim : MAXC)};
  return {r:rr, c:cc};
}
function onGridKey(e){
  if (g$('app').hidden) return;
  const k = e.key, mod = e.ctrlKey || e.metaKey, lk = k.length === 1 ? k.toLowerCase() : k;
  if (EDIT.on){ return onEditKey(e); }
  const active = document.activeElement; if (active && active !== g$('grid') && active !== document.body && !active.closest?.('#grid')) return;
  if (mod && lk === 'z'){ e.preventDefault(); return e.shiftKey ? redo() : undo(); }
  if (mod && lk === 'y'){ e.preventDefault(); return redo(); }
  if (mod && lk === 'a'){ e.preventDefault(); return selectCurrentRegionOrAll(); }
  if (mod && lk === 'b'){ e.preventDefault(); return toggleStyle('b'); }
  if (mod && lk === 'i'){ e.preventDefault(); return toggleStyle('i'); }
  if (mod && lk === 'u'){ e.preventDefault(); return toggleStyle('u'); }
  if (mod && lk === 'd'){ e.preventDefault(); return fillDir(1, 0); }
  if (mod && lk === 'r'){ e.preventDefault(); return fillDir(0, 1); }
  if (mod && lk === 'f'){ e.preventDefault(); return openFind(false); }
  if (mod && lk === 'h'){ e.preventDefault(); return openFind(true); }
  if (mod && (k === ';' || k === ',')){ e.preventDefault(); return setSelRaw(e.shiftKey ? fmtDate(nowSerial(), 'hh:mm') : fmtDate(todaySerial(), 'dd/mm/yyyy')); }
  if (mod && k === ':'){ e.preventDefault(); return setSelRaw(fmtDate(nowSerial(), 'hh:mm')); }
  if (e.altKey && (k === '=' || k === '+')){ e.preventDefault(); return autoSum('SOMME'); }
  if (mod && k === 'Enter'){ e.preventDefault(); return; }
  if (mod && (k === ' ' )){ e.preventDefault(); return selectRange({r1:0, c1:SEL.c1, r2:MAXR - 1, c2:SEL.c2}, {r:SEL.r, c:SEL.c}); }
  if (e.shiftKey && k === ' '){ e.preventDefault(); return selectRange({r1:SEL.r1, c1:0, r2:SEL.r2, c2:MAXC - 1}, {r:SEL.r, c:SEL.c}); }
  if (mod && (k === '+' || k === '=')){ e.preventDefault(); return insertCells(); }
  if (mod && k === '-'){ e.preventDefault(); return deleteCells(); }
  if (mod && (k === 'PageDown' || k === 'PageUp')){ e.preventDefault(); return switchSheet(clamp(WB.active + (k === 'PageDown' ? 1 : -1), 0, WB.sheets.length - 1)); }
  const arrows = {ArrowDown:[1, 0], ArrowUp:[-1, 0], ArrowRight:[0, 1], ArrowLeft:[0, -1]};
  if (arrows[k]){ e.preventDefault(); const [dr, dc] = arrows[k];
    const from = e.shiftKey ? {r:SEL.er ?? SEL.r, c:SEL.ec ?? SEL.c} : {r:SEL.r, c:SEL.c};
    let to; if (mod) to = dataEdge(from.r, from.c, dr, dc); else { const m = !e.shiftKey && sh0().mergeAt(SEL.r, SEL.c); to = {r:(m && dr > 0 ? m.r2 : m && dr < 0 ? m.r1 : from.r) + dr, c:(m && dc > 0 ? m.c2 : m && dc < 0 ? m.c1 : from.c) + dc}; while (sh0().hr.has(to.r) && to.r > 0 && to.r < MAXR - 1) to.r += dr || 0; while (sh0().hc.has(to.c) && to.c > 0) to.c += dc || 0; }
    EDIT.tabStart = null; return selectCell(Math.max(0, to.r), Math.max(0, to.c), e.shiftKey); }
  if (k === 'Tab'){ e.preventDefault(); return moveAfterCommit(0, e.shiftKey ? -1 : 1); }
  if (k === 'Enter'){ e.preventDefault(); return moveAfterCommit(e.shiftKey ? -1 : 1, 0); }
  if (k === 'Home'){ e.preventDefault(); return selectCell(mod ? 0 : SEL.r, 0, e.shiftKey); }
  if (k === 'End' && mod){ e.preventDefault(); const u = sh0().used(); return selectCell(u.r, u.c, e.shiftKey); }
  if (k === 'PageDown' || k === 'PageUp'){ e.preventDefault(); const n = Math.max(1, Math.floor((V.vh - V.hh) / (DEF_RH * V.z)) - 1); return selectCell(Math.max(0, SEL.r + (k === 'PageDown' ? n : -n)), SEL.c, e.shiftKey); }
  if (k === 'Delete' || k === 'Backspace'){ e.preventDefault(); if (k === 'Backspace' && SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2) return startEdit(''); return clearSel('contents'); }
  if (k === 'F2'){ e.preventDefault(); return startEdit(); }
  if (k === 'Escape'){ if (CLIP.box){ CLIP.box = null; renderSel(); } return; }
  if (k === 'F4' || (mod && lk === 'y')) { e.preventDefault(); return; }
  if (!mod && !e.altKey && k.length === 1){ e.preventDefault(); const rows = sh0().get(SEL.r, SEL.c); return startEdit(k); }
}
function onEditKey(e){
  const k = e.key, el = edEl(), mod = e.ctrlKey || e.metaKey;
  const acOpen = !g$('gAc').hidden;
  if (acOpen && (k === 'ArrowDown' || k === 'ArrowUp')){ e.preventDefault(); EDIT.ac.i = clamp(EDIT.ac.i + (k === 'ArrowDown' ? 1 : -1), 0, EDIT.ac.items.length - 1); acUpdate(); return; }
  if (acOpen && k === 'Tab'){ e.preventDefault(); return acAccept(); }
  if (k === 'Escape'){ e.preventDefault(); if (acOpen){ g$('gAc').hidden = true; return; } return cancelEdit(); }
  if (k === 'Enter' && e.altKey){ e.preventDefault(); const s = el.selectionStart; el.setRangeText('\n', s, el.selectionEnd, 'end'); editInput(); return; }
  if (k === 'Enter' && mod){ e.preventDefault(); EDIT.fillAll = true; commitEdit(0, 0); return; }
  if (k === 'Enter'){ e.preventDefault(); if (acOpen && EDIT.ac.items.length && edVal().slice(EDIT.ac.from, el.selectionStart).length >= 2 && false) return acAccept(); commitEdit(e.shiftKey ? -1 : 1, 0); return; }
  if (k === 'Tab'){ e.preventDefault(); commitEdit(0, e.shiftKey ? -1 : 1); return; }
  // pointage au clavier (après un opérateur)
  const arrows = {ArrowDown:[1, 0], ArrowUp:[-1, 0], ArrowRight:[0, 1], ArrowLeft:[0, -1]};
  if (arrows[k] && !EDIT.bar && (canPoint())){
    e.preventDefault(); const [dr, dc] = arrows[k]; const base = EDIT.ptr?.g ? {r:e.shiftKey ? EDIT.ptr.g.r2 : EDIT.ptr.g.r1, c:e.shiftKey ? EDIT.ptr.g.c2 : EDIT.ptr.g.c1} : {r:EDIT.r, c:EDIT.c};
    const nr = Math.max(0, base.r + dr), nc = Math.max(0, base.c + dc);
    const g = e.shiftKey && EDIT.ptr?.g ? {r1:Math.min(EDIT.ptr.g.r1, nr), c1:Math.min(EDIT.ptr.g.c1, nc), r2:Math.max(EDIT.ptr.g.r1, nr), c2:Math.max(EDIT.ptr.g.c1, nc)} : {r1:nr, c1:nc, r2:nr, c2:nc};
    insertRef(g); scrollToCell(nr, nc); schedule(); return;
  }
  if (arrows[k] && !EDIT.bar && EDIT.typed && !(edVal()[0] === '=')){ e.preventDefault(); const [dr, dc] = arrows[k]; commitEdit(dr, dc); return; }
  if (k === 'F4'){ e.preventDefault(); toggleAbsRef(); return; }
}
/* F4 : A1 → $A$1 → A$1 → $A1 */
function toggleAbsRef(){
  const el = edEl(), v = el.value, pos = el.selectionStart; if (v[0] !== '=') return;
  const tks = tokenize(v.slice(1)); const t = tks.find(x => x.t === 'ref' && !x.kind && x.s + 1 <= pos && x.e + 1 >= pos) || [...tks].reverse().find(x => x.t === 'ref' && !x.kind && x.e + 1 <= pos);
  if (!t) return;
  const cyc = p => { const m = /^(\$?)([A-Za-z]+)(\$?)(\d+)$/.exec(p); const st = (m[1] ? 2 : 0) + (m[3] ? 1 : 0); const next = {0:[1, 1], 3:[0, 1], 1:[1, 0], 2:[0, 0]}[st]; return (next[0] ? '$' : '') + m[2].toUpperCase() + (next[1] ? '$' : '') + m[4]; };
  const rep = cyc(t.a) + (t.b ? ':' + cyc(t.b) : '');
  const s = t.ss + 1, e = t.e + 1; el.value = v.slice(0, s) + rep + v.slice(e); el.setSelectionRange(s + rep.length, s + rep.length); editInput();
}
/* ---------- opérations sur la sélection ---------- */
function eachSel(fn, limit = 200000){
  const sh = sh0(), u = sh.used(); const r2 = Math.min(SEL.r2, Math.max(u.r, SEL.r1)), c2 = Math.min(SEL.c2, Math.max(u.c, SEL.c1));
  let n = 0; for (let r = SEL.r1; r <= r2; r++) for (let c = SEL.c1; c <= c2; c++){ if (n++ > limit) return; fn(r, c); }
}
function selCellsIncludingEmpty(fn){
  const sh = sh0(), u = sh.used(); const full = SEL.r2 >= MAXR - 1 || SEL.c2 >= MAXC - 1;
  const r2 = full ? Math.min(SEL.r2, Math.max(u.r, SEL.r1)) : SEL.r2, c2 = full ? Math.min(SEL.c2, Math.max(u.c, SEL.c1)) : SEL.c2;
  for (let r = SEL.r1; r <= r2; r++) for (let c = SEL.c1; c <= c2; c++) fn(r, c);
}
function clearSel(what = 'contents'){
  if (V.ro) return;
  const sh = sh0();
  tx(what === 'all' ? 'Effacer tout' : what === 'format' ? 'Effacer la mise en forme' : 'Effacer', () => {
    const keys = []; for (const k of sh.cells.keys()){ const r = KR(k), c = KC(k); if (inSel(r, c)) keys.push([r, c]); }
    for (const [r, c] of keys){ const cell = sh.get(r, c); if (!cell) continue;
      if (what === 'contents') sh.setRaw(r, c, '', true); else if (what === 'format'){ sh.setCell(r, c, {raw:cell.raw, note:cell.note}); } else sh.setCell(r, c, null); }
    if (what !== 'contents') sh.cf = sh.cf.filter(x => { const g = parseRange(x.range); return !g || !(g.r1 >= SEL.r1 && g.r2 <= SEL.r2 && g.c1 >= SEL.c1 && g.c2 <= SEL.c2); });
  });
}
function setSelRaw(raw){ tx('Saisie', () => sh0().setRaw(SEL.r, SEL.c, raw)); }
function styleSel(patch, label = 'Mise en forme'){
  if (V.ro) return;
  const sh = sh0(), full = SEL.r2 >= MAXR - 1 || SEL.c2 >= MAXC - 1;
  tx(label, () => {
    if (full){ // colonnes ou lignes entières : on applique aux cellules existantes et à la zone utilisée
      const u = sh.used(); for (let r = SEL.r1; r <= Math.min(SEL.r2, u.r + 1); r++) for (let c = SEL.c1; c <= Math.min(SEL.c2, u.c + 1); c++) sh.setStyle(r, c, patch);
    } else for (let r = SEL.r1; r <= SEL.r2; r++) for (let c = SEL.c1; c <= SEL.c2; c++) sh.setStyle(r, c, patch);
  });
}
function toggleStyle(k){ const s = sh0().get(SEL.r, SEL.c)?.s || {}; styleSel({[k]:s[k] ? null : 1}); }
function fillDir(dr, dc){
  if (SEL.r1 === SEL.r2 && dr){ if (SEL.r1 === 0) return; const s = {r1:SEL.r1 - 1, c1:SEL.c1, r2:SEL.r1 - 1, c2:SEL.c2}; return fillOp(s, {r1:SEL.r1, c1:SEL.c1, r2:SEL.r2, c2:SEL.c2}); }
  if (SEL.c1 === SEL.c2 && dc){ if (SEL.c1 === 0) return; const s = {r1:SEL.r1, c1:SEL.c1 - 1, r2:SEL.r2, c2:SEL.c1 - 1}; return fillOp(s, {r1:SEL.r1, c1:SEL.c1, r2:SEL.r2, c2:SEL.c2}); }
  if (dr) fillOp({r1:SEL.r1, c1:SEL.c1, r2:SEL.r1, c2:SEL.c2}, {r1:SEL.r1 + 1, c1:SEL.c1, r2:SEL.r2, c2:SEL.c2}); else fillOp({r1:SEL.r1, c1:SEL.c1, r2:SEL.r2, c2:SEL.c1}, {r1:SEL.r1, c1:SEL.c1 + 1, r2:SEL.r2, c2:SEL.c2});
}
function currentRegion(r, c){
  const sh = sh0(), has = (rr, cc) => rr >= 0 && cc >= 0 && WB.val(sh, rr, cc) != null && WB.val(sh, rr, cc) !== '';
  let g = {r1:r, c1:c, r2:r, c2:c}, grew = true, n = 0;
  while (grew && n++ < 500){ grew = false;
    for (let cc = g.c1 - 1; cc <= g.c2 + 1; cc++){ if (has(g.r1 - 1, cc)){ g.r1--; grew = true; break; } }
    for (let cc = g.c1 - 1; cc <= g.c2 + 1; cc++){ if (has(g.r2 + 1, cc)){ g.r2++; grew = true; break; } }
    for (let rr = g.r1 - 1; rr <= g.r2 + 1; rr++){ if (has(rr, g.c1 - 1)){ g.c1--; grew = true; break; } }
    for (let rr = g.r1 - 1; rr <= g.r2 + 1; rr++){ if (has(rr, g.c2 + 1)){ g.c2++; grew = true; break; } }
    g.r1 = Math.max(0, g.r1); g.c1 = Math.max(0, g.c1);
  }
  return g;
}
function selectCurrentRegionOrAll(){
  const g = currentRegion(SEL.r, SEL.c);
  if ((g.r1 !== g.r2 || g.c1 !== g.c2) && !(SEL.r1 === g.r1 && SEL.r2 === g.r2 && SEL.c1 === g.c1 && SEL.c2 === g.c2)) selectRange(g, {r:SEL.r, c:SEL.c});
  else selectRange({r1:0, c1:0, r2:MAXR - 1, c2:MAXC - 1}, {r:SEL.r, c:SEL.c});
}
/* Somme automatique : sous / à droite de la sélection, ou dans la cellule active */
function autoSum(fname = 'SOMME'){
  if (V.ro) return; const sh = sh0();
  const isNum = (r, c) => typeof WB.val(sh, r, c) === 'number';
  if (SEL.r1 !== SEL.r2 || SEL.c1 !== SEL.c2){
    // une ligne de totaux sous chaque colonne sélectionnée
    tx('Somme automatique', () => { const r = SEL.r2 + 1; for (let c = SEL.c1; c <= SEL.c2; c++){ if (!isNum(SEL.r2, c) && !isNum(SEL.r1, c)) continue; sh.setRaw(r, c, `=${fname}(${rangeA1({r1:SEL.r1, c1:c, r2:SEL.r2, c2:c})})`); const nf = sh.get(SEL.r2, c)?.s?.nf; sh.setStyle(r, c, {b:1, ...(nf ? {nf} : {})}); } });
    selectCell(SEL.r2 + 1, SEL.c1); return;
  }
  const r = SEL.r, c = SEL.c; let g = null;
  if (r > 0 && isNum(r - 1, c)){ let a = r - 1; while (a > 0 && isNum(a - 1, c)) a--; g = {r1:a, c1:c, r2:r - 1, c2:c}; }
  else if (c > 0 && isNum(r, c - 1)){ let a = c - 1; while (a > 0 && isNum(r, a - 1)) a--; g = {r1:r, c1:a, r2:r, c2:c - 1}; }
  if (!g){ startEdit(`=${fname}()`); const el = g$('gEdit'); el.setSelectionRange(el.value.length - 1, el.value.length - 1); editInput(); return; }
  startEdit(`=${fname}(${rangeA1(g)})`); EDIT.refs = [g]; renderSel();
}
function toggleCheck(r, c){ if (V.ro) return; const v = WB.val(sh0(), r, c); tx('Case à cocher', () => sh0().setRaw(r, c, v === true ? 'FAUX' : 'VRAI')); }
/* ---------- presse-papiers ---------- */
function selToTSV(g){
  const sh = sh0(), rows = [];
  const r2 = Math.min(g.r2, sh.used().r), c2 = Math.min(g.c2, sh.used().c);
  for (let r = g.r1; r <= r2; r++){ if (sh.hr.has(r)) continue; const row = []; for (let c = g.c1; c <= c2; c++){ if (sh.hc.has(c)) continue; const cell = sh.get(r, c), v = WB.val(sh, r, c); let t = v == null ? '' : formatValue(v, cell?.s?.nf).t.replace(/ /g, ' '); if (/[\t\n"]/.test(t)) t = '"' + t.replace(/"/g, '""') + '"'; row.push(t); } rows.push(row.join('\t')); }
  return rows.join('\n');
}
function selToHTML(g){
  const sh = sh0(), u = sh.used(); let h = '<table>';
  for (let r = g.r1; r <= Math.min(g.r2, u.r); r++){ h += '<tr>'; for (let c = g.c1; c <= Math.min(g.c2, u.c); c++){ const cell = sh.get(r, c), v = WB.val(sh, r, c), s = cell?.s || {}; const css = (s.b ? 'font-weight:bold;' : '') + (s.i ? 'font-style:italic;' : '') + (s.bg ? `background:${s.bg};` : '') + (s.fc ? `color:${s.fc};` : '') + (s.ha ? `text-align:${{l:'left', c:'center', r:'right'}[s.ha]};` : ''); h += `<td${css ? ` style="${css}"` : ''}>${escH(v == null ? '' : formatValue(v, s.nf).t)}</td>`; } h += '</tr>'; }
  return h + '</table>';
}
function onCopy(e, cut){
  if (g$('app').hidden || EDIT.on) return; const a = document.activeElement; if (a && a !== g$('grid') && a !== document.body) return;
  e.preventDefault();
  const sh = sh0(), u = sh.used(); const g = {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, u.r), c2:Math.min(SEL.c2, u.c)};
  const cells = []; for (let r = g.r1; r <= g.r2; r++){ const row = []; for (let c = g.c1; c <= g.c2; c++) row.push(cloneCell(sh.get(r, c))); cells.push(row); }
  const text = selToTSV(g);
  e.clipboardData.setData('text/plain', text); e.clipboardData.setData('text/html', selToHTML(g));
  Object.assign(CLIP, {box:g, sheet:sh.id, cut:!!cut, cells, text, merges:sh.merges.filter(m => m.r1 >= g.r1 && m.r2 <= g.r2 && m.c1 >= g.c1 && m.c2 <= g.c2).map(m => ({r1:m.r1 - g.r1, c1:m.c1 - g.c1, r2:m.r2 - g.r1, c2:m.c2 - g.c1}))});
  renderSel(); toast(cut ? 'Coupé : collez à l\'endroit voulu' : `Copié (${(g.r2 - g.r1 + 1) * (g.c2 - g.c1 + 1)} cellule${(g.r2 - g.r1 + 1) * (g.c2 - g.c1 + 1) > 1 ? 's' : ''})`);
}
function onPaste(e){
  if (g$('app').hidden || EDIT.on || V.ro) return; const a = document.activeElement; if (a && a !== g$('grid') && a !== document.body) return;
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain'), html = e.clipboardData.getData('text/html');
  if (CLIP.cells && text.replace(/\r/g, '') === CLIP.text.replace(/\r/g, '')) return pasteInternal(e.shiftKey ? 'values' : 'all');
  let rows = null;
  if (html && /<table/i.test(html)) rows = htmlTable(html);
  if (!rows) rows = parseTSV(text);
  if (!rows || !rows.length) return;
  pasteRows(rows);
}
function parseTSV(t){
  t = t.replace(/\r\n?/g, '\n'); if (t.endsWith('\n')) t = t.slice(0, -1);
  const sep = t.includes('\t') ? '\t' : null; if (!sep) return t.split('\n').map(l => [{raw:l}]);
  const out = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++){ const ch = t[i];
    if (q){ if (ch === '"'){ if (t[i + 1] === '"'){ cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"' && cur === '') { q = true; continue; }
    if (ch === sep){ row.push({raw:cur}); cur = ''; } else if (ch === '\n'){ row.push({raw:cur}); out.push(row); row = []; cur = ''; } else cur += ch; }
  row.push({raw:cur}); out.push(row); return out;
}
function htmlTable(html){
  const doc = new DOMParser().parseFromString(html, 'text/html'); const tb = doc.querySelector('table'); if (!tb) return null;
  const out = [];
  for (const tr of tb.querySelectorAll('tr')){ const row = []; for (const td of tr.querySelectorAll('td,th')){ const st = td.getAttribute('style') || '', s = {};
      if (/font-weight:\s*(bold|[6-9]00)/i.test(st) || td.querySelector('b,strong') || td.tagName === 'TH') s.b = 1; if (/font-style:\s*italic/i.test(st)) s.i = 1;
      const bg = /background(?:-color)?:\s*(#[0-9a-f]{3,6}|rgb\([^)]+\))/i.exec(st); if (bg && !/^#?f{3,6}$/i.test(bg[1].replace('#', ''))) s.bg = cssHex(bg[1]);
      const col = /(?:^|;)\s*color:\s*(#[0-9a-f]{3,6}|rgb\([^)]+\))/i.exec(st); if (col && !/^#0{3,6}$|^#000/i.test(col[1])) s.fc = cssHex(col[1]);
      let raw = td.innerText ?? td.textContent; raw = String(raw).replace(/ /g, ' ').trim();
      const cs = +(td.getAttribute('colspan') || 1); row.push({raw, s:Object.keys(s).length ? s : undefined}); for (let k = 1; k < cs; k++) row.push({raw:''}); }
    out.push(row); }
  return out.length ? out : null;
}
function cssHex(c){ const m = /rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(c); return m ? rgbHex(+m[1], +m[2], +m[3]) : (c.length === 4 ? '#' + [...c.slice(1)].map(x => x + x).join('') : c); }
function pasteRows(rows){
  const sh = sh0(), h = rows.length, w = Math.max(...rows.map(r => r.length));
  // une seule valeur collée sur une sélection : elle remplit toute la sélection
  const fillSel = h === 1 && w === 1 && (SEL.r1 !== SEL.r2 || SEL.c1 !== SEL.c2);
  tx('Coller', () => {
    if (fillSel){ selCellsIncludingEmpty((r, c) => sh.setRaw(r, c, rows[0][0].raw)); return; }
    rows.forEach((row, i) => row.forEach((x, j) => { const r = SEL.r + i, c = SEL.c + j; sh.setRaw(r, c, x.raw); if (x.s) sh.setStyle(r, c, x.s); }));
  });
  if (!fillSel) selectRange({r1:SEL.r, c1:SEL.c, r2:SEL.r + h - 1, c2:SEL.c + w - 1}, {r:SEL.r, c:SEL.c});
  if (w > 1 || h > 1) toast(`${h} ligne${h > 1 ? 's' : ''} × ${w} colonne${w > 1 ? 's' : ''} collées`);
}
function pasteInternal(mode = 'all'){
  const sh = sh0(), src = CLIP, h = src.cells.length, w = src.cells[0].length;
  const fromSh = WB.sheets.find(s => s.id === src.sheet);
  // collage répété si la sélection est un multiple de la copie
  const th = SEL.r2 - SEL.r1 + 1, tw = SEL.c2 - SEL.c1 + 1; const reps = (th % h === 0 && tw % w === 0 && (th > h || tw > w)) ? [th / h, tw / w] : [1, 1];
  tx(src.cut ? 'Déplacer' : 'Coller', () => {
    if (src.cut && fromSh){ for (let r = src.box.r1; r <= src.box.r2; r++) for (let c = src.box.c1; c <= src.box.c2; c++) fromSh.setCell(r, c, null); fromSh.merges = fromSh.merges.filter(m => !(m.r1 >= src.box.r1 && m.r2 <= src.box.r2 && m.c1 >= src.box.c1 && m.c2 <= src.box.c2)); }
    for (let a = 0; a < reps[0]; a++) for (let b = 0; b < reps[1]; b++){
      const r0 = SEL.r1 + a * h, c0 = SEL.c1 + b * w, dr = r0 - src.box.r1, dc = c0 - src.box.c1;
      src.cells.forEach((row, i) => row.forEach((d, j) => {
        const r = r0 + i, c = c0 + j;
        if (mode === 'values'){ const v = fromSh ? WB.val(fromSh, src.box.r1 + i, src.box.c1 + j) : null; sh.setRaw(r, c, v == null ? '' : editText(v, d?.s?.nf)); return; }
        if (mode === 'format'){ sh.setCell(r, c, {raw:sh.get(r, c)?.raw ?? '', s:d?.s}); return; }
        if (!d){ sh.setCell(r, c, null); return; }
        const raw = d.raw && d.raw[0] === '=' && !src.cut ? '=' + shiftFormula(d.raw.slice(1), dr, dc) : d.raw;
        sh.setCell(r, c, {raw, s:d.s, note:d.note});
      }));
      if (mode === 'all') for (const m of src.merges || []) sh.merges.push({r1:r0 + m.r1, c1:c0 + m.c1, r2:r0 + m.r2, c2:c0 + m.c2});
    }
    // déplacement : les formules qui pointaient vers la zone coupée suivent
    if (src.cut && fromSh){
      const dr = SEL.r1 - src.box.r1, dc = SEL.c1 - src.box.c1;
      const mv = p => { const m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(p); return m[1] + colName(colIdx(m[2]) + dc) + m[3] + (+m[4] + dr); };
      for (const s2 of WB.sheets) for (const [k, cell] of s2.cells){
        if (!cell.raw || cell.raw[0] !== '=') continue;
        const nr = '=' + rewriteRefs(cell.raw.slice(1), t => { const target = t.sheet ?? s2.name; if (target !== fromSh.name || t.kind) return null; const g = parseRange(t.a + (t.b ? ':' + t.b : '')); if (!g || g.r1 < src.box.r1 || g.r2 > src.box.r2 || g.c1 < src.box.c1 || g.c2 > src.box.c2) return null;
          const pre = t.sheet != null ? quoteSheet(sh.name) + '!' : (s2 !== sh ? quoteSheet(sh.name) + '!' : ''); return pre + mv(t.a) + (t.b ? ':' + mv(t.b) : ''); });
        if (nr !== cell.raw) s2.setRaw(KR(k), KC(k), nr, true);
      }
    }
  });
  if (src.cut){ CLIP.box = null; CLIP.cells = null; CLIP.cut = false; }
  selectRange({r1:SEL.r1, c1:SEL.c1, r2:SEL.r1 + h * reps[0] - 1, c2:SEL.c1 + w * reps[1] - 1}, {r:SEL.r1, c:SEL.c1});
}
