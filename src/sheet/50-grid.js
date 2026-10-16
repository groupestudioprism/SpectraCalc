/* ---------- Grille : mise en page, rendu virtualisé (seules les cellules visibles existent), volets figés ---------- */
let WB = new Workbook();
const SEL = {r:0, c:0, r1:0, c1:0, r2:0, c2:0};
const V = {z:1, sx:0, sy:0, vw:800, vh:600, nr:200, nc:30, cx:[0], ry:[0], fr:0, fc:0, fw:0, fh:0, raf:0, dirty:true, ro:false};
const g$ = id => document.getElementById(id);
function layout(){
  const sh = WB.sh, u = sh.used(), z = V.z;
  sh.calcAutoH();
  V.nr = Math.max(V.nr, u.r + 60, 120); V.nc = Math.max(V.nc, u.c + 8, 26);
  for (const ch of sh.charts){ const g = cellAtContent(ch.x + ch.w, ch.y + ch.h, true); if (g){ V.nr = Math.max(V.nr, g.r + 10); V.nc = Math.max(V.nc, g.c + 4); } }
  V.nr = Math.min(V.nr, MAXR); V.nc = Math.min(V.nc, MAXC);
  const cx = new Float64Array(V.nc + 1), ry = new Float64Array(V.nr + 1);
  for (let c = 0; c < V.nc; c++) cx[c + 1] = cx[c] + Math.round(sh.colW(c) * z);
  for (let r = 0; r < V.nr; r++) ry[r + 1] = ry[r] + Math.round(sh.rowH(r) * z);
  V.cx = cx; V.ry = ry;
  V.fr = Math.min(sh.freeze.r || 0, V.nr - 1); V.fc = Math.min(sh.freeze.c || 0, V.nc - 1);
  V.fw = cx[V.fc]; V.fh = ry[V.fr]; V.hw = Math.round(HDR_W * Math.max(.85, Math.min(z, 1.3))); V.hh = Math.round(HDR_H * Math.max(.85, Math.min(z, 1.3)));
  const sp = g$('gSpace'); sp.style.width = (V.hw + cx[V.nc] + 60) + 'px'; sp.style.height = (V.hh + ry[V.nr] + 80) + 'px';
  const sc = g$('gScroll'); V.vw = sc.clientWidth; V.vh = sc.clientHeight;
  const vw = g$('gView'); vw.style.width = V.vw + 'px'; vw.style.height = V.vh + 'px'; sp.style.marginTop = -V.vh + 'px';
  vw.style.setProperty('--hw', V.hw + 'px'); vw.style.setProperty('--hh', V.hh + 'px'); vw.style.setProperty('--z', z);
  const bx = V.hw + V.fw, by = V.hh + V.fh;
  place('pTL', V.hw, V.hh, V.fw, V.fh); place('pT', bx, V.hh, Math.max(0, V.vw - bx), V.fh); place('pL', V.hw, by, V.fw, Math.max(0, V.vh - by)); place('pM', bx, by, Math.max(0, V.vw - bx), Math.max(0, V.vh - by));
  place('gObjs', V.hw, V.hh, Math.max(0, V.vw - V.hw), Math.max(0, V.vh - V.hh));
  g$('gView').classList.toggle('frz-r', V.fr > 0); g$('gView').classList.toggle('frz-c', V.fc > 0);
  V.dirty = true;
}
function place(id, x, y, w, h){ const e = g$(id); e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.width = w + 'px'; e.style.height = h + 'px'; }
/* recherche binaire dans un tableau de positions cumulées */
function idxAt(arr, n, v){ let lo = 0, hi = n - 1; while (lo < hi){ const m = (lo + hi + 1) >> 1; if (arr[m] <= v) lo = m; else hi = m - 1; } return lo; }
/* position à l'écran (dans g-view) */
const colLeft = c => c < V.fc ? V.hw + V.cx[c] : V.hw + V.fw + V.cx[c] - V.cx[V.fc] - V.sx;
const rowTop = r => r < V.fr ? V.hh + V.ry[r] : V.hh + V.fh + V.ry[r] - V.ry[V.fr] - V.sy;
const colW = c => V.cx[Math.min(c + 1, V.nc)] - V.cx[Math.min(c, V.nc)];
const rowH = r => V.ry[Math.min(r + 1, V.nr)] - V.ry[Math.min(r, V.nr)];
/* cellule sous un point de g-view */
function cellAt(x, y){
  let c, r;
  if (x < V.hw + V.fw) c = idxAt(V.cx, V.fc + 1, Math.max(0, x - V.hw)); else c = idxAt(V.cx, V.nc, x - V.hw - V.fw + V.sx + V.cx[V.fc]);
  if (y < V.hh + V.fh) r = idxAt(V.ry, V.fr + 1, Math.max(0, y - V.hh)); else r = idxAt(V.ry, V.nr, y - V.hh - V.fh + V.sy + V.ry[V.fr]);
  if (V.fc && x < V.hw + V.fw) c = Math.min(c, V.fc - 1); if (V.fr && y < V.hh + V.fh) r = Math.min(r, V.fr - 1);
  return {r:clamp(r, 0, V.nr - 1), c:clamp(c, 0, V.nc - 1)};
}
/* coordonnées « contenu » (zoom 1, depuis A1) → cellule */
function cellAtContent(x, y, quiet){ const sh = WB.sh; let c = 0, acc = 0; while (c < 20000 && acc + sh.colW(c) <= x){ acc += sh.colW(c); c++; } let r = 0; acc = 0; while (r < 200000 && acc + sh.rowH(r) <= y){ acc += sh.rowH(r); r++; } return {r, c}; }
function contentXY(r, c){ const sh = WB.sh; let x = 0, y = 0; for (let i = 0; i < c; i++) x += sh.colW(i); for (let i = 0; i < r; i++) y += sh.rowH(i); return {x, y}; }
/* plage visible (pour une zone : figée ou non) */
function visRange(){
  const mx = V.sx + V.cx[V.fc], my = V.sy + V.ry[V.fr];
  const c1 = idxAt(V.cx, V.nc, mx), c2 = idxAt(V.cx, V.nc, mx + V.vw - V.hw - V.fw);
  const r1 = idxAt(V.ry, V.nr, my), r2 = idxAt(V.ry, V.nr, my + V.vh - V.hh - V.fh);
  return {r1, r2:Math.min(r2, V.nr - 1), c1, c2:Math.min(c2, V.nc - 1)};
}
function schedule(){ if (V.raf) return; V.raf = requestAnimationFrame(() => { V.raf = 0; render(); }); }
/* ---------- styles calculés : style de la cellule + tableau mis en forme + mise en forme conditionnelle ---------- */
function themeColors(){ return themeVals(WB.theme); }
function tableStyleAt(sh, r, c){
  for (const t of sh.tables){ const g = parseRange(t.range); if (!g || r < g.r1 || r > g.r2 || c < g.c1 || c > g.c2) continue;
    const tv = themeColors(), ac = t.color || tv.ac;
    const s = {};
    if (t.header !== false && r === g.r1){ s.bg = ac; s.fc = '#ffffff'; s.b = 1; }
    else if (t.total && r === g.r2){ s.b = 1; s.bt = '2px ' + ac; s.bg = mix(ac, '#ffffff', .86); }
    else if (t.banded !== false && (r - g.r1) % 2 === 0) s.bg = mix(ac, '#ffffff', .91);
    if (t.style === 'line'){ delete s.bg; if (r === g.r1){ s.fc = ac; s.bb = '2px ' + ac; } else s.bb = '1px ' + mix(ac, '#ffffff', .75); }
    return s;
  }
  return null;
}
const CF_CACHE = {cid:-1, map:new Map()};
const CF_AST = new WeakMap();
function cfStats(sh, rule, g){
  const key = sh.id + rule.range + rule.type; let st = CF_CACHE.map.get(key);
  if (CF_CACHE.cid !== WB.cid){ CF_CACHE.map.clear(); CF_CACHE.cid = WB.cid; st = null; }
  if (st) return st;
  const list = [], cnt = new Map();
  for (let r = g.r1; r <= Math.min(g.r2, g.r1 + 20000); r++) for (let c = g.c1; c <= g.c2; c++){ const v = WB.val(sh, r, c); if (typeof v === 'number') list.push(v); if (v != null && v !== ''){ const k = typeof v === 'string' ? v.toLowerCase() : v; cnt.set(k, (cnt.get(k) || 0) + 1); } }
  const s = [...list].sort((a, b) => a - b);
  st = {min:s[0] ?? 0, max:s[s.length - 1] ?? 0, mean:list.length ? sum(list) / list.length : 0, sorted:s, cnt};
  CF_CACHE.map.set(key, st); return st;
}
function cfApply(sh, r, c, v){
  let out = null;
  for (const rule of sh.cf){
    const g = parseRange(rule.range); if (!g || r < g.r1 || r > g.r2 || c < g.c1 || c > g.c2) continue;
    const n = typeof v === 'number' ? v : null, st = ['scale', 'bar', 'icons', 'top', 'bottom', 'above', 'below', 'dup', 'uniq'].includes(rule.type) ? cfStats(sh, rule, g) : null;
    let hit = false, s = null;
    const a = rule.a != null ? (typeof rule.a === 'number' ? rule.a : parseNumberFr(rule.a) ?? rule.a) : null, b = rule.b != null ? (parseNumberFr(rule.b) ?? +rule.b) : null;
    switch (rule.type){
      case 'gt': hit = n != null && n > a; break; case 'lt': hit = n != null && n < a; break; case 'ge': hit = n != null && n >= a; break; case 'le': hit = n != null && n <= a; break;
      case 'eq': hit = v != null && (n != null ? n === a : String(v).toLowerCase() === String(rule.a).toLowerCase()); break; case 'ne': hit = v != null && v !== '' && (n != null ? n !== a : String(v).toLowerCase() !== String(rule.a).toLowerCase()); break;
      case 'between': hit = n != null && n >= Math.min(a, b) && n <= Math.max(a, b); break;
      case 'text': hit = typeof v === 'string' && v.toLowerCase().includes(String(rule.a).toLowerCase()); break;
      case 'empty': hit = v == null || v === ''; break; case 'notempty': hit = v != null && v !== ''; break;
      case 'neg': hit = n != null && n < 0; break; case 'pos': hit = n != null && n > 0; break;
      case 'above': hit = n != null && n > st.mean; break; case 'below': hit = n != null && n < st.mean; break;
      case 'top': hit = n != null && st.sorted.length && n >= st.sorted[Math.max(0, st.sorted.length - (rule.a || 10))]; break;
      case 'bottom': hit = n != null && st.sorted.length && n <= st.sorted[Math.min(st.sorted.length - 1, (rule.a || 10) - 1)]; break;
      case 'dup': hit = v != null && v !== '' && (st.cnt.get(typeof v === 'string' ? v.toLowerCase() : v) || 0) > 1; break;
      case 'uniq': hit = v != null && v !== '' && (st.cnt.get(typeof v === 'string' ? v.toLowerCase() : v) || 0) === 1; break;
      case 'date': { if (n == null) break; const t = todaySerial(), d = Math.floor(n); hit = rule.a === 'today' ? d === t : rule.a === 'past' ? d < t : rule.a === 'future' ? d > t : rule.a === 'week' ? Math.abs(d - t) <= 7 && d >= t - ((fromSerial(t).wd + 6) % 7) && d < t - ((fromSerial(t).wd + 6) % 7) + 7 : rule.a === 'late' ? d < t : false; break; }
      case 'formula': { try { let M = CF_AST.get(rule); if (!M || M.src !== rule.a){ M = new Map(); M.src = rule.a; CF_AST.set(rule, M); } const key = (r - g.r1) + ',' + (c - g.c1); let ast = M.get(key); if (!ast){ ast = parseFormula(shiftFormula(String(rule.a).replace(/^=/, ''), r - g.r1, c - g.c1)); if (M.size < 20000) M.set(key, ast); } hit = toBool(scalar(ev(ast, {wb:WB, sh, r, c}))); } catch(e){ hit = false; } break; }
      case 'scale': if (n != null){ const t = st.max > st.min ? (n - st.min) / (st.max - st.min) : .5; const cols = rule.colors || ['#F8696B', '#FFEB84', '#63BE7B']; const col = cols.length === 3 ? (t < .5 ? mix(cols[0], cols[1], t * 2) : mix(cols[1], cols[2], (t - .5) * 2)) : mix(cols[0], cols[1], t); s = {bg:col}; } break;
      case 'bar': if (n != null){ const t = st.max > Math.min(0, st.min) ? (n - Math.min(0, st.min)) / (st.max - Math.min(0, st.min)) : 0; s = {_bar:clamp(t, 0, 1), _barc:rule.color || themeColors().ac}; } break;
      case 'icons': if (n != null){ const t = st.max > st.min ? (n - st.min) / (st.max - st.min) : .5; s = {_icon:rule.set === 'arrows' ? (t >= .67 ? '▲' : t >= .33 ? '▶' : '▼') : t >= .67 ? '●' : t >= .33 ? '●' : '●', _iconc:t >= .67 ? '#13925C' : t >= .33 ? '#E0A100' : '#D13B3B'}; } break;
    }
    if (hit) s = {...rule.style};
    if (s){ out = {...(out || {}), ...s}; if (rule.stop) break; }
  }
  return out;
}
/* ---------- rendu ---------- */
function cellCss(s, w, h){
  let css = '';
  if (!s) return css;
  if (s.bg) css += `background:${s.bg};`;
  if (s.fc) css += `color:${s.fc};`;
  if (s.b) css += 'font-weight:700;';
  if (s.i) css += 'font-style:italic;';
  if (s.u || s.st) css += `text-decoration:${s.u ? 'underline ' : ''}${s.st ? 'line-through' : ''};`;
  if (s.fs) css += `font-size:${(s.fs * 4 / 3 * V.z).toFixed(1)}px;`;
  if (s.ff){ ensureFont(s.ff); css += `font-family:${fontStack(s.ff).replace(/"/g, "'")};`; }
  for (const [k, side] of [['bt', 'top'], ['br', 'right'], ['bb', 'bottom'], ['bl', 'left']]) if (s[k]){ const [wd, col] = String(s[k]).split(' '); css += `border-${side}:${wd || '1px'} ${/dash/.test(s[k]) ? 'dashed' : 'solid'} ${col || '#1A1726'};`; }
  if (s.ind) css += `padding-left:${4 + s.ind * 12 * V.z}px;`;
  return css;
}
function renderPane(cid, lnid, r1, r2, c1, c2, ox, oy){
  const sh = WB.sh, cells = [], lines = [];
  const X = c => V.cx[c] - ox, Y = r => V.ry[r] - oy;
  // lignes de quadrillage
  if (sh.grid){
    const H = V.ry[r2 + 1] - oy, W = V.cx[c2 + 1] - ox;
    for (let c = c1; c <= c2; c++){ if (sh.hc.has(c)) continue; lines.push(`<i style="left:${X(c + 1) - 1}px;top:0;width:1px;height:${H}px"></i>`); }
    for (let r = r1; r <= r2; r++){ if (sh.hr.has(r)) continue; lines.push(`<i style="top:${Y(r + 1) - 1}px;left:0;height:1px;width:${W}px"></i>`); }
  }
  g$(lnid).innerHTML = lines.join('');
  // fusions qui touchent la zone
  const skip = new Set(), mergesHere = [];
  for (const m of sh.merges){ if (m.r2 < r1 || m.r1 > r2 || m.c2 < c1 || m.c1 > c2) continue; mergesHere.push(m); for (let r = Math.max(m.r1, r1); r <= Math.min(m.r2, r2); r++) for (let c = Math.max(m.c1, c1); c <= Math.min(m.c2, c2); c++) skip.add(KEY(r, c)); }
  const dvAt = dvIndex(sh);
  const one = (r, c, w, h, merged) => {
    const cell = sh.get(r, c), v = WB.val(sh, r, c);
    const ts = sh.tables.length ? tableStyleAt(sh, r, c) : null;
    const cf = sh.cf.length ? cfApply(sh, r, c, v) : null;
    if (!cell && v == null && !ts && !cf && !dvAt.has(KEY(r, c))) return;
    const s = cf || ts ? {...(ts || {}), ...(cell?.s || {}), ...(cf || {})} : cell?.s;
    const fv = formatValue(v, s?.nf);
    let txt = fv.t, ha = s?.ha || fv.a, cls = 'c';
    if (s?.wrap) cls += ' w';
    if (fv.err) cls += ' e';
    if (typeof v === 'string' && /^https?:\/\/\S+$/i.test(v)) cls += ' lk';
    let css = `left:${X(c)}px;top:${Y(r)}px;width:${w}px;height:${h}px;` + cellCss(s) + (fv.c ? `color:${fv.c};` : '');
    if (ha !== 'l') css += `justify-content:${ha === 'r' ? 'flex-end' : ha === 'c' ? 'center' : 'flex-start'};text-align:${ha === 'r' ? 'right' : ha === 'c' ? 'center' : 'left'};`;
    if (s?.va) css += `align-items:${s.va === 't' ? 'flex-start' : s.va === 'm' ? 'center' : 'flex-end'};`; else if (s?.wrap) css += 'align-items:flex-start;';
    // le texte déborde sur les cellules vides de droite
    if (!merged && !s?.wrap && !s?.bg && typeof v === 'string' && ha === 'l' && txt){
      let ww = w, cc = c + 1; while (cc <= c2 + 6 && cc < V.nc){ if (WB.val(sh, r, cc) != null || sh.mergeAt(r, cc)) break; ww += colW(cc); cc++; if (ww > 2000) break; }
      if (ww > w){ css = css.replace(`width:${w}px`, `width:${ww}px`); cls += ' ov'; }
    }
    if (s?.chk || (typeof v === 'boolean' && s?.nf === 'chk')) txt = `<span class="cb${v === true ? ' on' : ''}" data-cb="${r},${c}"></span>`;
    else txt = escH(txt);
    let extra = '';
    if (s?._bar != null) extra += `<b class="dbar" style="width:${(s._bar * 100).toFixed(1)}%;background:linear-gradient(90deg,${s._barc},${mix(s._barc, '#ffffff', .55)})"></b>`;
    if (s?._icon) extra += `<em class="ico" style="color:${s._iconc}">${s._icon}</em>`;
    if (cell?.note) extra += '<u class="nt"></u>';
    if (dvAt.has(KEY(r, c)) && r === SEL.r && c === SEL.c) extra += `<button class="dvb" data-dv="${r},${c}" tabindex="-1">▾</button>`;
    if (sh.filter){ const fg = parseRange(sh.filter.range); if (fg && r === fg.r1 && c >= fg.c1 && c <= fg.c2) extra += `<button class="flb${sh.filter.crit?.[c - fg.c1] ? ' on' : ''}" data-flt="${c}" tabindex="-1">▾</button>`; }
    cells.push(`<div class="${cls}" style="${css}">${extra}<span>${txt}</span></div>`);
  };
  for (const m of mergesHere){ let w = 0, h = 0; for (let c = m.c1; c <= m.c2; c++) w += colW(c); for (let r = m.r1; r <= m.r2; r++) h += rowH(r); one(m.r1, m.c1, w, h, true); }
  for (let r = r1; r <= r2; r++){
    const h = rowH(r); if (!h) continue;
    for (let c = c1; c <= c2; c++){ if (skip.size && skip.has(KEY(r, c))) continue; const w = colW(c); if (!w) continue; one(r, c, w, h, false); }
  }
  g$(cid).innerHTML = cells.join('');
}
function dvIndex(sh){ const s = new Set(); for (const d of sh.dv){ const g = parseRange(d.range); if (!g) continue; for (let r = g.r1; r <= Math.min(g.r2, g.r1 + 5000); r++) for (let c = g.c1; c <= g.c2; c++) s.add(KEY(r, c)); } return s; }
function render(){
  if (!g$('gView') || g$('app').hidden) return;
  const sc = g$('gScroll'); V.sx = sc.scrollLeft; V.sy = sc.scrollTop;
  // agrandir la grille quand on approche du bord
  if (V.sy + V.vh > V.ry[V.nr] - 200 && V.nr < MAXR){ V.nr += 200; layout(); }
  if (V.sx + V.vw > V.cx[V.nc] - 200 && V.nc < MAXC){ V.nc += 10; layout(); }
  const vr = visRange();
  renderPane('cM', 'lnM', vr.r1, vr.r2, vr.c1, vr.c2, V.cx[V.fc] + V.sx + (V.cx[vr.c1] - V.cx[vr.c1]), V.ry[V.fr] + V.sy);
  if (V.fr) renderPane('cT', 'lnT', 0, V.fr - 1, vr.c1, vr.c2, V.cx[V.fc] + V.sx, 0); else { g$('cT').innerHTML = ''; g$('lnT').innerHTML = ''; }
  if (V.fc) renderPane('cL', 'lnL', vr.r1, vr.r2, 0, V.fc - 1, 0, V.ry[V.fr] + V.sy); else { g$('cL').innerHTML = ''; g$('lnL').innerHTML = ''; }
  if (V.fr && V.fc) renderPane('cTL', 'lnTL', 0, V.fr - 1, 0, V.fc - 1, 0, 0); else { g$('cTL').innerHTML = ''; g$('lnTL').innerHTML = ''; }
  renderHeaders(vr);
  renderSel();
  renderObjects();
  if (EDIT.on) placeEditor();
}
function renderHeaders(vr){
  const sh = WB.sh, a = [], b = [];
  const cols = [...Array(V.fc).keys(), ...range(vr.c1, vr.c2)], rows = [...Array(V.fr).keys(), ...range(vr.r1, vr.r2)];
  const full = SEL.r1 === 0 && SEL.r2 >= V.nr - 1, fullC = SEL.c1 === 0 && SEL.c2 >= V.nc - 1;
  for (const c of cols){ const w = colW(c); if (!w){ a.push(`<i class="hid" style="left:${colLeft(c) - V.hw - 2}px" data-unhide-c="${c}" title="Afficher la colonne masquée"></i>`); continue; }
    const on = c >= SEL.c1 && c <= SEL.c2, all = on && full; a.push(`<b class="${all ? 'all' : on ? 'on' : ''}" style="left:${colLeft(c) - V.hw}px;width:${w}px" data-col="${c}">${colName(c)}</b>`); }
  for (const r of rows){ const h = rowH(r); if (!h){ b.push(`<i class="hid" style="top:${rowTop(r) - V.hh - 2}px" data-unhide-r="${r}" title="Afficher la ligne masquée"></i>`); continue; }
    const on = r >= SEL.r1 && r <= SEL.r2, all = on && fullC; b.push(`<b class="${all ? 'all' : on ? 'on' : ''}" style="top:${rowTop(r) - V.hh}px;height:${h}px" data-row="${r}">${r + 1}</b>`); }
  g$('gColH').innerHTML = a.join(''); g$('gRowH').innerHTML = b.join('');
}
const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
/* rectangle à l'écran d'une plage (coupé aux zones visibles) */
function rectOf(r1, c1, r2, c2){
  const x1 = colLeft(c1), y1 = rowTop(r1), x2 = colLeft(c2) + colW(c2), y2 = rowTop(r2) + rowH(r2);
  return {x:x1, y:y1, w:x2 - x1, h:y2 - y1};
}
function clipRect(rc){
  const minX = V.hw, minY = V.hh; const x = Math.max(rc.x, rc.x < V.hw + V.fw ? minX : minX), y = Math.max(rc.y, minY);
  return {x, y, w:Math.max(0, rc.x + rc.w - x), h:Math.max(0, rc.y + rc.h - y)};
}
function setBox(el, rc, show = true){ if (!show || rc.w <= 0 || rc.h <= 0){ el.style.display = 'none'; return; } el.style.display = ''; el.style.left = rc.x + 'px'; el.style.top = rc.y + 'px'; el.style.width = rc.w + 'px'; el.style.height = rc.h + 'px'; }
function selMergeExpand(){
  const sh = WB.sh; let changed = true, g = {r1:SEL.r1, c1:SEL.c1, r2:SEL.r2, c2:SEL.c2}, n = 0;
  while (changed && n++ < 20){ changed = false; for (const m of sh.merges){ if (m.r2 < g.r1 || m.r1 > g.r2 || m.c2 < g.c1 || m.c1 > g.c2) continue; if (m.r1 < g.r1 || m.c1 < g.c1 || m.r2 > g.r2 || m.c2 > g.c2){ g = {r1:Math.min(g.r1, m.r1), c1:Math.min(g.c1, m.c1), r2:Math.max(g.r2, m.r2), c2:Math.max(g.c2, m.c2)}; changed = true; } } }
  Object.assign(SEL, g);
}
function renderSel(){
  const sh = WB.sh, m = sh.mergeAt(SEL.r, SEL.c);
  const act = m ? rectOf(m.r1, m.c1, m.r2, m.c2) : rectOf(SEL.r, SEL.c, SEL.r, SEL.c);
  const rs = rectOf(SEL.r1, SEL.c1, Math.min(SEL.r2, V.nr - 1), Math.min(SEL.c2, V.nc - 1));
  const single = SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2 || (m && SEL.r1 === m.r1 && SEL.r2 === m.r2 && SEL.c1 === m.c1 && SEL.c2 === m.c2);
  setBox(g$('gSel'), clipRect(rs), !single);
  setBox(g$('gAct'), clipRect(act), true);
  const fh = g$('gFill'); const fx = rs.x + rs.w, fy = rs.y + rs.h;
  if (fx > V.hw && fy > V.hh && fx < V.vw && fy < V.vh && !V.ro){ fh.style.display = ''; fh.style.left = (fx - 4) + 'px'; fh.style.top = (fy - 4) + 'px'; } else fh.style.display = 'none';
  if (CLIP.box && CLIP.sheet === sh.id){ setBox(g$('gCopy'), clipRect(rectOf(CLIP.box.r1, CLIP.box.c1, CLIP.box.r2, CLIP.box.c2))); g$('gCopy').hidden = false; } else g$('gCopy').hidden = true;
  if (FILLP.box) setBox(g$('gFillP'), clipRect(rectOf(FILLP.box.r1, FILLP.box.c1, FILLP.box.r2, FILLP.box.c2))); g$('gFillP').hidden = !FILLP.box;
  // références colorées pendant la saisie d'une formule
  const refs = EDIT.on ? EDIT.refs || [] : [];
  g$('gRefs').innerHTML = refs.filter(x => !x.sheet || x.sheet === sh.name).map((x, i) => { const rc = clipRect(rectOf(x.r1, x.c1, x.r2, x.c2)); return rc.w > 0 && rc.h > 0 ? `<i style="left:${rc.x}px;top:${rc.y}px;width:${rc.w}px;height:${rc.h}px;--rc:${REF_COLORS[i % REF_COLORS.length]}"></i>` : ''; }).join('');
  const nb = g$('nameBox'); if (nb && document.activeElement !== nb) nb.value = single ? A1(SEL.r, SEL.c) : rangeA1(SEL);
}
const REF_COLORS = ['#3D63FF', '#E5484D', '#2FBF71', '#9B51E0', '#F5A524', '#12B5E5', '#FF7A2F'];
function scrollToCell(r, c){
  const sc = g$('gScroll');
  if (c >= V.fc){ const x = V.cx[c] - V.cx[V.fc], w = colW(c), view = V.vw - V.hw - V.fw - 18; if (x < V.sx) sc.scrollLeft = x; else if (x + w > V.sx + view) sc.scrollLeft = x + w - view; }
  if (r >= V.fr){ const y = V.ry[r] - V.ry[V.fr], h = rowH(r), view = V.vh - V.hh - V.fh - 18; if (y < V.sy) sc.scrollTop = y; else if (y + h > V.sy + view) sc.scrollTop = y + h - view; }
  V.sx = sc.scrollLeft; V.sy = sc.scrollTop;
}
