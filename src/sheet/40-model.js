/* ---------- Modèle : classeur, feuilles, cellules, recalcul, propagation, annuler / rétablir ---------- */
const KEY = (r, c) => r * MAXC + c;
const KR = k => Math.floor(k / MAXC), KC = k => k % MAXC;
const DEF_CW = 100, DEF_RH = 24, HDR_W = 46, HDR_H = 26;
const cloneS = s => s ? JSON.parse(JSON.stringify(s)) : undefined;
const cloneCell = c => c ? {raw:c.raw, s:cloneS(c.s), note:c.note} : null;

class Sheet {
  constructor(wb, o = {}){
    this.wb = wb; this.id = o.id || uidS(); this.name = o.name || 'Feuille 1';
    this.cells = new Map(); this.cw = {}; this.rh = {}; this.merges = []; this.freeze = {r:0, c:0};
    this.cf = []; this.charts = []; this.dv = []; this.tables = []; this.hr = new Set(); this.hc = new Set(); this.filter = null;
    this.tab = o.tab || ''; this.grid = o.grid !== false; this.spill = new Map(); this.spillNew = null; this._used = null; this.zoom = 1;
  }
  get(r, c){ return this.cells.get(KEY(r, c)); }
  colW(c){ return this.hc.has(c) ? 0 : (this.cw[c] ?? DEF_CW); }
  rowH(r){ return this.hr.has(r) ? 0 : (this.rh[r] ?? this.autoH?.get(r) ?? DEF_RH); }
  /* hauteur automatique des lignes qui contiennent du texte plus grand */
  calcAutoH(){ const m = new Map(); for (const [k, cell] of this.cells){ const fs = cell.s?.fs; if (fs && fs > 11){ const r = KR(k); if (this.mergeAt(r, KC(k))?.r2 > r) continue; const h = Math.ceil(fs * 4 / 3 * 1.3 + 8); if (h > (m.get(r) || DEF_RH)) m.set(r, h); } } this.autoH = m; }
  used(){
    if (this._used) return this._used;
    let r = 0, c = 0;
    for (const k of this.cells.keys()){ const rr = KR(k), cc = KC(k); if (rr > r) r = rr; if (cc > c) c = cc; }
    for (const [k, o] of this.spill){ const rr = KR(k), cc = KC(k); if (rr > r) r = rr; if (cc > c) c = cc; }
    return (this._used = {r, c});
  }
  /* écrit le contenu brut d'une cellule (texte, nombre, formule) en gardant son style */
  setRaw(r, c, raw, keepNf){
    const k = KEY(r, c); let cell = this.cells.get(k);
    this.wb.rec(this, k, cell);
    raw = raw == null ? '' : String(raw);
    if (raw === '' && (!cell || (!cell.s && !cell.note))){ this.cells.delete(k); this._used = null; return; }
    if (!cell){ cell = {}; this.cells.set(k, cell); this._used = null; }
    cell.raw = raw; delete cell.ast; delete cell.arr; cell.cid = -1;
    if (raw.startsWith('=') && raw.length > 1){
      try { cell.ast = parseFormula(raw.slice(1)); cell.v = null; }
      catch(e){ cell.ast = {t:'err', v:'#NAME?'}; cell.v = ER.name; cell.bad = true; }
      // un format adapté au résultat (dates, euros…) quand la cellule n'en a pas
      if (!keepNf && !cell.s?.nf){ const nf = inferNf(cell.ast, this); if (nf) cell.s = {...(cell.s || {}), nf}; }
    } else {
      const p = parseInput(raw); cell.v = p.v;
      if (p.nf && !keepNf && !cell.s?.nf){ cell.s = {...(cell.s || {}), nf:p.nf}; }
      if (p.text) cell.v = String(p.v);
      if (cell.s?.nf === '@' && raw !== '') cell.v = raw;
    }
  }
  setStyle(r, c, patch){
    const k = KEY(r, c); let cell = this.cells.get(k); this.wb.rec(this, k, cell);
    if (!cell){ cell = {raw:'', v:null}; this.cells.set(k, cell); this._used = null; }
    const s = {...(cell.s || {})};
    for (const [key, val] of Object.entries(patch)){ if (val == null || val === '' || val === false) delete s[key]; else s[key] = val; }
    cell.s = Object.keys(s).length ? s : undefined;
    if (!cell.s && cell.raw === '' && !cell.note){ this.cells.delete(k); this._used = null; }
  }
  setCell(r, c, data){   // data : {raw, s, note} ou null
    const k = KEY(r, c); this.wb.rec(this, k, this.cells.get(k));
    if (!data || (data.raw === '' && !data.s && !data.note)){ this.cells.delete(k); this._used = null; return; }
    this.cells.delete(k); this._used = null;
    const cell = {s:cloneS(data.s), note:data.note}; this.cells.set(k, cell);
    this.setRawSilent(r, c, data.raw ?? '');
  }
  setRawSilent(r, c, raw){ const rec = this.wb.recording; this.wb.recording = null; this.setRaw(r, c, raw, true); this.wb.recording = rec; }
  mergeAt(r, c){ for (const m of this.merges){ if (r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2) return m; } return null; }
  /* métadonnées (sans les cellules) */
  meta(){ return {name:this.name, cw:this.cw, rh:this.rh, merges:this.merges, freeze:this.freeze, cf:this.cf, charts:this.charts, dv:this.dv, tables:this.tables, hr:[...this.hr], hc:[...this.hc], filter:this.filter, tab:this.tab, grid:this.grid}; }
  setMeta(m){ m = JSON.parse(JSON.stringify(m)); this.name = m.name; this.cw = m.cw || {}; this.rh = m.rh || {}; this.merges = m.merges || []; this.freeze = m.freeze || {r:0, c:0}; this.cf = m.cf || []; this.charts = m.charts || []; this.dv = m.dv || []; this.tables = m.tables || []; this.hr = new Set(m.hr || []); this.hc = new Set(m.hc || []); this.filter = m.filter || null; this.tab = m.tab || ''; this.grid = m.grid !== false; }
  toJSON(){
    const cells = {};
    for (const [k, cell] of this.cells){ const a = A1(KR(k), KC(k)); cells[a] = cell.s || cell.note ? {r:cell.raw, ...(cell.s ? {s:cell.s} : {}), ...(cell.note ? {n:cell.note} : {})} : cell.raw; }
    const m = this.meta(); const cw = {}; for (const [c, w] of Object.entries(m.cw)) cw[colName(+c)] = w;
    return {...m, cw, cells, merges:m.merges.map(rangeA1)};
  }
  load(o){
    this.setMeta({...o, cw:Object.fromEntries(Object.entries(o.cw || {}).map(([k, v]) => [/^\d+$/.test(k) ? +k : colIdx(k), v])), merges:(o.merges || []).map(x => typeof x === 'string' ? parseRange(x) : x).filter(Boolean)});
    this.cells.clear();
    for (const [a, v] of Object.entries(o.cells || {})){ const p = parseA1(a); if (!p) continue; const d = typeof v === 'string' || typeof v === 'number' ? {raw:String(v)} : {raw:v.r ?? '', s:v.s, note:v.n}; this.cells.set(KEY(p.r, p.c), {s:d.s, note:d.note}); this.setRawSilent(p.r, p.c, d.raw); }
    this._used = null;
  }
}

/* format deviné pour une formule : =A1+30 garde le format date de A1, =SOMME(B2:B9) garde les euros… */
function inferNf(n, sh, depth = 0){
  if (!n || depth > 4) return '';
  if (n.t === 'fn'){ const d = FN[n.name] || FN[FN_ALIAS[n.name]]; if (d?.nf) return d.nf;
    if (['SUM', 'MIN', 'MAX', 'AVERAGE', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'SUMIF', 'SUMIFS', 'AVERAGEIF', 'AVERAGEIFS', 'MAXIFS', 'MINIFS', 'MEDIAN', 'LARGE', 'SMALL', 'SUBTOTAL', 'ABS', 'IF', 'IFERROR', 'VLOOKUP', 'XLOOKUP', 'INDEX'].includes(FN_ALIAS[n.name] || n.name)){
      const nm = FN_ALIAS[n.name] || n.name; const arg = nm === 'SUMIF' || nm === 'AVERAGEIF' ? n.args[2] || n.args[0] : nm === 'IF' ? n.args[1] : nm === 'VLOOKUP' || nm === 'INDEX' ? null : nm === 'XLOOKUP' ? n.args[2] : n.args[0];
      return arg ? inferNf(arg, sh, depth + 1) : ''; }
    return ''; }
  if (n.t === 'ref' && !n.sheet){ const nf = sh.get(n.r, n.c)?.s?.nf || ''; return nf === '@' ? '' : nf; }
  if (n.t === 'range' && !n.sheet && !n.whole){ for (let r = n.r1; r <= Math.min(n.r2, n.r1 + 30); r++){ const nf = sh.get(r, n.c1)?.s?.nf; if (nf && nf !== '@') return nf; } return ''; }
  if (n.t === 'bin' && (n.op === '+' || n.op === '-')){ const a = inferNf(n.a, sh, depth + 1); if (a && n.op === '-' && compileFmt(a).kind === 'date' && inferNf(n.b, sh, depth + 1) === a) return ''; return a || inferNf(n.b, sh, depth + 1); }
  if (n.t === 'bin' && (n.op === '*' || n.op === '/')){ const a = inferNf(n.a, sh, depth + 1), b = inferNf(n.b, sh, depth + 1); const money = x => x && /[€$]/.test(x); return money(a) ? a : money(b) && n.op === '*' ? b : ''; }
  if (n.t === 'neg') return inferNf(n.a, sh, depth + 1);
  return '';
}

class Workbook {
  constructor(){ this.sheets = []; this.active = 0; this.cid = 0; this.names = {}; this.recording = null; this.title = 'Classeur sans titre'; this.theme = {id:'spectra'}; }
  get sh(){ return this.sheets[this.active]; }
  byName(n){ const l = String(n).toLowerCase(); return this.sheets.find(s => s.name.toLowerCase() === l) || null; }
  addSheet(name, at){ const s = new Sheet(this, {name:name || this.freeName()}); if (at == null) this.sheets.push(s); else this.sheets.splice(at, 0, s); return s; }
  freeName(base = 'Feuille'){ let i = this.sheets.length + 1; while (this.byName(`${base} ${i}`)) i++; return `${base} ${i}`; }
  /* enregistrement des cellules modifiées pour annuler */
  rec(sh, k, cell){ const R = this.recording; if (!R) return; const key = sh.id + ':' + k; if (!R.cells.has(key)) R.cells.set(key, {sh, k, before:cloneCell(cell)}); }
  /* valeur calculée d'une cellule */
  val(sh, r, c){
    const k = KEY(r, c), cell = sh.cells.get(k);
    if (cell && cell.ast){
      if (cell.cid === this.cid) return cell.v;
      if (cell.busy) return ER.circ;
      cell.busy = true; let res;
      try { res = ev(cell.ast, {wb:this, sh, r, c}); } catch(e){ res = isErr(e) ? e : ER.value; if (!isErr(e)) console.warn(e); }
      finally { cell.busy = false; }
      if (isRng(res)) res = res.h === 1 && res.w === 1 ? res.v(0, 0) : res.arr();
      if (res === MISSING || res === undefined) res = 0;
      cell.arr = null;
      if (isArr(res)){
        if (res.length === 1 && res[0].length === 1) res = res[0][0];
        else if (!res.length || !res[0].length) res = ER.calc;
        else {
          const h = Math.min(res.length, 5000), w = Math.min(res[0].length, 500); let blocked = false;
          for (let i = 0; i < h && !blocked; i++) for (let j = 0; j < w; j++){ if (!i && !j) continue; const o = sh.cells.get(KEY(r + i, c + j)); if (o && o.raw !== ''){ blocked = true; break; } const ow = sh.spillNew?.get(KEY(r + i, c + j)); if (ow != null && ow !== k){ blocked = true; break; } }
          if (blocked) res = ER.spill;
          else { cell.arr = res; cell.ah = h; cell.aw = w; const map = sh.spillNew || sh.spill; for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) if (i || j) map.set(KEY(r + i, c + j), k); res = res[0][0]; }
        }
      }
      if (res == null) res = 0;
      cell.v = res; cell.cid = this.cid; return res;
    }
    if (!cell || cell.raw === ''){
      const own = (sh.spillNew && sh.spillNew.get(k)) ?? sh.spill.get(k);
      if (own != null){ const oc = sh.cells.get(own); if (oc && oc.ast){ this.val(sh, KR(own), KC(own)); if (oc.arr) return oc.arr[r - KR(own)]?.[c - KC(own)] ?? null; } }
      return null;
    }
    return cell.v;
  }
  hasFormulas(){ for (const s of this.sheets) for (const c of s.cells.values()) if (c.ast) return true; return false; }
  recalc(){
    for (let pass = 0; pass < 2; pass++){
      this.cid++;
      let changed = false;
      for (const sh of this.sheets){ sh.spillNew = new Map(); }
      for (const sh of this.sheets) for (const [k, cell] of sh.cells) if (cell.ast) this.val(sh, KR(k), KC(k));
      for (const sh of this.sheets){
        if (sh.spillNew.size !== sh.spill.size) changed = true; else for (const [k, v] of sh.spillNew) if (sh.spill.get(k) !== v){ changed = true; break; }
        sh.spill = sh.spillNew; sh.spillNew = null; if (changed) sh._used = null;
      }
      if (!changed) break;
    }
  }
  toJSON(){ return {v:1, app:'spectracalc', title:this.title, theme:this.theme, active:this.active, names:this.names, sheets:this.sheets.map(s => s.toJSON())}; }
  load(o){
    this.sheets = []; this.title = o.title || 'Classeur sans titre'; this.theme = o.theme || {id:'spectra'}; this.names = o.names || {};
    for (const so of (o.sheets && o.sheets.length ? o.sheets : [{name:'Feuille 1'}])){ const s = new Sheet(this, {name:so.name}); this.sheets.push(s); }
    (o.sheets || []).forEach((so, i) => this.sheets[i].load(so));
    this.active = clamp(o.active || 0, 0, this.sheets.length - 1);
    this.recalc();
  }
}

/* ---------- Annuler / rétablir ---------- */
const UNDO = {list:[], i:-1, cur:null};
function beginTx(label, opts = {}){
  if (UNDO.cur){ UNDO.cur.depth++; return; }
  const sh = WB.sh;
  UNDO.cur = {label, depth:1, cells:new Map(), sel:{...SEL}, sheet:sh.id, metaB:JSON.stringify(sh.meta()), full:opts.full ? JSON.stringify(WB.toJSON()) : null};
  WB.recording = UNDO.cur;
}
function endTx(){
  const t = UNDO.cur; if (!t) return; if (--t.depth > 0) return;
  WB.recording = null; UNDO.cur = null;
  const sh = WB.sheets.find(s => s.id === t.sheet);
  const step = {label:t.label, sel:t.sel, selA:{...SEL}, sheet:t.sheet};
  if (t.full){ step.fullB = t.full; step.fullA = JSON.stringify(WB.toJSON()); if (step.fullA === step.fullB) return; }
  else {
    step.cells = [...t.cells.values()].map(x => ({sid:x.sh.id, k:x.k, b:x.before, a:cloneCell(x.sh.cells.get(x.k))})).filter(x => JSON.stringify(x.b) !== JSON.stringify(x.a));
    if (sh){ const ma = JSON.stringify(sh.meta()); if (ma !== t.metaB){ step.metaB = t.metaB; step.metaA = ma; } }
    if (!step.cells.length && !step.metaB) return;
  }
  UNDO.list = UNDO.list.slice(0, UNDO.i + 1); UNDO.list.push(step); if (UNDO.list.length > 200) UNDO.list.shift(); UNDO.i = UNDO.list.length - 1;
  afterChange();
}
function tx(label, fn, opts){ beginTx(label, opts); try { fn(); } finally { endTx(); } }
function applyStep(step, dir){
  const B = dir < 0;
  if (step.fullB){ const keepActive = WB.active; WB.load(JSON.parse(B ? step.fullB : step.fullA)); WB.active = clamp(keepActive, 0, WB.sheets.length - 1); }
  else {
    for (const x of step.cells){ const sh = WB.sheets.find(s => s.id === x.sid); if (!sh) continue; const d = B ? x.b : x.a; const r = KR(x.k), c = KC(x.k);
      if (!d) { sh.cells.delete(x.k); sh._used = null; } else { sh.cells.delete(x.k); sh.cells.set(x.k, {s:cloneS(d.s), note:d.note}); sh.setRawSilent(r, c, d.raw ?? ''); } }
    if (step.metaB){ const sh = WB.sheets.find(s => s.id === step.sheet); if (sh) sh.setMeta(JSON.parse(B ? step.metaB : step.metaA)); }
    const si = WB.sheets.findIndex(s => s.id === step.sheet); if (si >= 0) WB.active = si;
  }
  Object.assign(SEL, B ? step.sel : step.selA);
  WB.recalc(); afterChange(true);
}
function undo(){ if (EDIT.on) return; if (UNDO.i < 0) return; applyStep(UNDO.list[UNDO.i--], -1); toast('Annulé : ' + UNDO.list[UNDO.i + 1].label); }
function redo(){ if (UNDO.i >= UNDO.list.length - 1) return; applyStep(UNDO.list[++UNDO.i], 1); }

/* ---------- Opérations sur la structure ---------- */
function shiftRangeObj(g, axis, at, n){
  const lo = axis === 'r' ? 'r1' : 'c1', hi = axis === 'r' ? 'r2' : 'c2', o = {...g};
  if (n > 0){ if (o[lo] >= at) o[lo] += n; if (o[hi] >= at) o[hi] += n; return o; }
  const d0 = at, d1 = at - n - 1;
  if (o[lo] >= d0 && o[hi] <= d1) return null;
  o[lo] = o[lo] > d1 ? o[lo] + n : o[lo] >= d0 ? d0 : o[lo];
  o[hi] = o[hi] > d1 ? o[hi] + n : o[hi] >= d0 ? d0 - 1 : o[hi];
  return o;
}
const shiftRangeStr = (s, axis, at, n) => { const g = parseRange(s); if (!g) return s; const o = shiftRangeObj(g, axis, at, n); return o ? rangeA1(o) : null; };
/* insère (n > 0) ou supprime (n < 0) des lignes / colonnes dans la feuille sh */
function structOp(sh, axis, at, n){
  const moved = new Map();
  for (const [k, cell] of sh.cells){
    let r = KR(k), c = KC(k); const v = axis === 'r' ? r : c;
    if (n < 0 && v >= at && v < at - n) continue;
    if (v >= at){ if (axis === 'r') r += n; else c += n; }
    moved.set(KEY(r, c), cell);
  }
  sh.cells = moved; sh._used = null;
  // formules de toutes les feuilles
  for (const s of WB.sheets) for (const [k, cell] of s.cells){ if (cell.raw && cell.raw[0] === '='){ const nr = '=' + adjustFormula(cell.raw.slice(1), s.name, sh.name, axis, at, n); if (nr !== cell.raw) s.setRawSilent(KR(k), KC(k), nr); } }
  // tailles
  const shiftMap = (m) => { const o = {}; for (const [kk, v] of Object.entries(m)){ let i = +kk; if (n < 0 && i >= at && i < at - n) continue; if (i >= at) i += n; o[i] = v; } return o; };
  if (axis === 'r'){ sh.rh = shiftMap(sh.rh); sh.hr = new Set([...sh.hr].filter(i => !(n < 0 && i >= at && i < at - n)).map(i => i >= at ? i + n : i)); }
  else { sh.cw = shiftMap(sh.cw); sh.hc = new Set([...sh.hc].filter(i => !(n < 0 && i >= at && i < at - n)).map(i => i >= at ? i + n : i)); }
  sh.merges = sh.merges.map(m => shiftRangeObj(m, axis, at, n)).filter(m => m && (m.r2 > m.r1 || m.c2 > m.c1));
  for (const L of [sh.cf, sh.dv, sh.tables]) for (let i = L.length - 1; i >= 0; i--){ const r2 = shiftRangeStr(L[i].range, axis, at, n); if (r2) L[i].range = r2; else L.splice(i, 1); }
  for (const ch of sh.charts){ const r2 = shiftRangeStr(ch.range, axis, at, n); if (r2) ch.range = r2; }
  if (sh.filter){ const r2 = shiftRangeStr(sh.filter.range, axis, at, n); if (r2) sh.filter.range = r2; else sh.filter = null; }
}
/* ---------- Recopie (poignée) : suites de nombres, dates, jours, mois, « Article 1 » ---------- */
const SERIES = [DAYS.map(nrmTxt), ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'], MONTHS.map(nrmTxt), ['janv', 'fevr', 'mars', 'avr', 'mai', 'juin', 'juil', 'aout', 'sept', 'oct', 'nov', 'dec'], ['t1', 't2', 't3', 't4'], ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']];
const DAYS_FR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
function matchCase(model, s){ return model === model.toUpperCase() ? s.toUpperCase() : model[0] === model[0].toUpperCase() ? s[0].toUpperCase() + s.slice(1) : s; }
/* srcs : cellules sources (dans l'ordre), renvoie une fonction k → {raw, s} pour le k-ième élément à créer (k ≥ 0) */
function seriesFn(srcs, dr, dc){
  const n = srcs.length, vals = srcs.map(x => x.cell);
  const raws = vals.map(c => c?.raw ?? '');
  const isF = raws.some(r => r[0] === '=');
  const nums2 = vals.map(c => c && !c.ast && typeof c.v === 'number' ? c.v : null);
  if (!isF && nums2.every(x => x != null)){
    const isDate = vals[0]?.s?.nf && compileFmt(vals[0].s.nf).kind === 'date';
    let step = n > 1 ? (nums2[n - 1] - nums2[0]) / (n - 1) : (isDate ? 1 : 1);
    if (n === 1 && !isDate) step = 1;
    // dates : pas d'un mois si les sources sont au même jour de mois différents
    if (isDate && n > 1){ const a = fromSerial(nums2[0]), b = fromSerial(nums2[1]); if (a.d === b.d && (a.m !== b.m || a.y !== b.y)){ const months = (b.y - a.y) * 12 + b.m - a.m; return k => ({raw:editText(addMonths(nums2[0], months * (n + k)), vals[0].s.nf), s:cloneS(vals[(n + k) % n]?.s)}); } }
    if (n === 1 && !isDate && !(vals[0]?.s?.nf)) return k => ({raw:raws[0], s:cloneS(vals[0]?.s)});   // un seul nombre : on recopie (Ctrl pour incrémenter)
    return k => { const v = +(nums2[n - 1] + step * (k + 1)).toPrecision(15); const s = vals[(n + k) % n]?.s; return {raw:s?.nf ? editText(v, s.nf) : fmtGeneral(v).replace(/ /g, ''), s:cloneS(s)}; };
  }
  if (!isF && n >= 1 && raws.every(r => r !== '')){
    // listes connues (jours, mois…)
    const low = raws.map(nrmTxt);
    for (const L of SERIES){ const idx = low.map(x => L.indexOf(x)); if (idx.every(i => i >= 0)){
      const st = n > 1 ? ((idx[n - 1] - idx[0]) / (n - 1)) || 1 : 1; const full = L === SERIES[0] ? DAYS : L === SERIES[2] ? MONTHS : L;
      return k => ({raw:matchCase(raws[0], full[((idx[n - 1] + st * (k + 1)) % L.length + L.length) % L.length]), s:cloneS(vals[(n + k) % n]?.s)}); } }
    const lowd = DAYS_FR; const ix = low.map(x => lowd.indexOf(x));
    if (ix.every(i => i >= 0)) return k => ({raw:matchCase(raws[0], lowd[(ix[n - 1] + k + 1) % 7]), s:cloneS(vals[(n + k) % n]?.s)});
    // « Article 1 », « Lot 3 » : on incrémente le nombre final
    const m = raws.map(r => /^(.*?)(\d+)(\D*)$/.exec(r));
    if (m.every(Boolean) && m.every(x => x[1] === m[0][1] && x[3] === m[0][3])){
      const ns = m.map(x => +x[2]); const st = n > 1 ? (ns[n - 1] - ns[0]) / (n - 1) || 1 : 1; const pad = m[0][2].length;
      return k => ({raw:m[0][1] + String(ns[n - 1] + st * (k + 1)).padStart(m[0][2][0] === '0' ? pad : 0, '0') + m[0][3], s:cloneS(vals[(n + k) % n]?.s)});
    }
  }
  // recopie simple (formules décalées)
  return k => { const i = (n + k) % n, src = srcs[i]; const c = src.cell; if (!c) return null; const steps = Math.floor((n + k) / n);
    const raw = c.raw && c.raw[0] === '=' ? '=' + shiftFormula(c.raw.slice(1), dr * n * steps, dc * n * steps) : c.raw; return {raw, s:cloneS(c.s), note:c.note}; };
}
