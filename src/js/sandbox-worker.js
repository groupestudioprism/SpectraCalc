/* SPECTRA Calc : moteur d'exécution des macros (Web Worker, dans un iframe sandbox sans réseau).
   Aucun accès au DOM, au stockage ni au réseau : le script travaille sur une COPIE du classeur et renvoie une liste d'opérations,
   appliquée ensuite par l'application en une seule étape annulable (Ctrl + Z). */
'use strict';
const post = self.postMessage.bind(self);
const addL = self.addEventListener.bind(self);
const _Fn = Object.getPrototypeOf(async function(){}).constructor, _Sync = Function;
const BLOCK = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'BroadcastChannel', 'SharedWorker', 'Worker', 'WebTransport', 'navigator', 'postMessage', 'close', 'location', 'Request', 'Response', 'Headers', 'FileReaderSync', 'localStorage', 'sessionStorage', 'openDatabase', 'WebAssembly'];
for (const k of BLOCK){ try { delete self[k]; } catch(e){} try { Object.defineProperty(self, k, {value:undefined, configurable:false, writable:false}); } catch(e){} }
try { Object.defineProperty(self, 'onmessage', {value:null, writable:false, configurable:false}); } catch(e){}

const colName = c => { let s = ''; c++; while (c > 0){ const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = (c - m - 1) / 26; } return s; };
const colIdx = s => { let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
const A1 = (r, c) => colName(c) + (r + 1);
const MAXOPS = 400000;
const ST = {gras:'b', italique:'i', souligne:'u', barre:'st', couleurTexte:'fc', couleurFond:'bg', taille:'fs', police:'ff', alignement:'ha', formatNombre:'nf', renvoi:'wrap'};
const EN_ST = {Bold:'gras', Italic:'italique', Underline:'souligne', Color:'couleurTexte', FillColor:'couleurFond', Size:'taille', FontName:'police', Align:'alignement', NumberFormat:'formatNombre', Wrap:'renvoi'};
const HA = {gauche:'l', centre:'c', droite:'r', left:'l', center:'c', right:'r'}, HA_R = {l:'gauche', c:'centre', r:'droite'};

let ops, logs, WBS, active, titre, cnt, selAddr, selSheet;
const push = o => { if (++cnt > MAXOPS) throw new Error('Trop d\'opérations dans une seule macro (limite : ' + MAXOPS + ').'); ops.push(o); };
const fmtArg = a => { if (typeof a === 'string') return a; try { return typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a); } catch(e){ return String(a); } };
const log = lvl => (...a) => { if (logs.length < 500) logs.push({t:lvl, text:a.map(fmtArg).join(' ')}); };
const parseRaw = raw => {
  if (raw === '' || raw == null) return null;
  if (raw[0] === '=') return null;
  const t = String(raw).trim();
  if (/^-?\d+([.,]\d+)?$/.test(t)) return parseFloat(t.replace(',', '.'));
  if (/^(vrai|true)$/i.test(t)) return true; if (/^(faux|false)$/i.test(t)) return false;
  return raw;
};
const sheetByName = n => WBS.find(s => s.name.toLowerCase() === String(n).toLowerCase());
const bad = (m) => { throw new Error(m); };

function parseAddr(a, sh){
  a = String(a).trim(); let m = /^(?:'([^']+)'|([^!']+))!(.+)$/.exec(a);
  if (m){ sh = sheetByName(m[1] || m[2]) || bad(`Feuille introuvable : « ${m[1] || m[2]} »`); a = m[3]; }
  m = /^\$?([A-Za-z]{1,3})\$?(\d+)(?::\$?([A-Za-z]{1,3})\$?(\d+))?$/.exec(a);
  if (!m){ const mc = /^\$?([A-Za-z]{1,3}):\$?([A-Za-z]{1,3})$/.exec(a); if (mc) return {sh, r1:0, c1:colIdx(mc[1]), r2:Math.max(0, usedR(sh)), c2:colIdx(mc[2])}; const mr = /^\$?(\d+):\$?(\d+)$/.exec(a); if (mr) return {sh, r1:+mr[1] - 1, c1:0, r2:+mr[2] - 1, c2:Math.max(0, usedC(sh))}; bad(`Adresse invalide : « ${a} »`); }
  const r1 = +m[2] - 1, c1 = colIdx(m[1]), r2 = m[4] ? +m[4] - 1 : r1, c2 = m[3] ? colIdx(m[3]) : c1;
  return {sh, r1:Math.min(r1, r2), c1:Math.min(c1, c2), r2:Math.max(r1, r2), c2:Math.max(c1, c2)};
}
const usedR = sh => { let r = -1; for (const o of sh.cells.values()) if (o.raw !== '' && o.r > r) r = o.r; return r; };
const usedC = sh => { let c = -1; for (const o of sh.cells.values()) if (o.raw !== '' && o.c > c) c = o.c; return c; };
const K = (r, c) => r + ',' + c;
const cellOf = (sh, r, c) => sh.cells.get(K(r, c));
function setLocal(sh, r, c, raw){
  raw = raw == null ? '' : typeof raw === 'number' ? String(raw).replace('.', ',') : typeof raw === 'boolean' ? (raw ? 'VRAI' : 'FAUX') : String(raw);
  if (raw.length > 32000) bad('Texte trop long pour une cellule (32 000 caractères maximum).');
  if (r < 0 || c < 0 || r > 1048575 || c > 16383) bad('Cellule hors de la feuille : ' + A1(r, c));
  let o = sh.cells.get(K(r, c)); if (!o){ o = {r, c, raw:'', v:null, s:null}; sh.cells.set(K(r, c), o); }
  o.raw = raw; o.v = parseRaw(raw); if (raw[0] === '=') o.v = null;
  push({t:'raw', s:sh.name, r, c, v:raw});
}
function styleLocal(sh, r, c, patch){
  let o = sh.cells.get(K(r, c)); if (!o){ o = {r, c, raw:'', v:null, s:null}; sh.cells.set(K(r, c), o); }
  o.s = {...(o.s || {})}; for (const [k, v] of Object.entries(patch)){ if (v == null || v === false || v === '') delete o.s[k]; else o.s[k] = v; }
  push({t:'style', s:sh.name, r, c, p:patch});
}

class Plage {
  constructor(sh, r1, c1, r2, c2){ this._ = {sh, r1, c1, r2, c2}; Object.freeze(this); }
  get adresse(){ const g = this._; return g.r1 === g.r2 && g.c1 === g.c2 ? A1(g.r1, g.c1) : A1(g.r1, g.c1) + ':' + A1(g.r2, g.c2); }
  get nbLignes(){ return this._.r2 - this._.r1 + 1; } get nbColonnes(){ return this._.c2 - this._.c1 + 1; }
  get ligne(){ return this._.r1 + 1; } get colonne(){ return this._.c1 + 1; }
  _each(fn){ const g = this._; for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) fn(r, c); }
  _grid(f){ const g = this._, out = []; for (let r = g.r1; r <= g.r2; r++){ const row = []; for (let c = g.c1; c <= g.c2; c++) row.push(f(cellOf(g.sh, r, c))); out.push(row); } return out; }
  get valeurs(){ return this._grid(o => o ? o.v : null); }
  get formules(){ return this._grid(o => o ? o.raw : ''); }
  get valeur(){ const g = this._; if (g.r1 === g.r2 && g.c1 === g.c2) return cellOf(g.sh, g.r1, g.c1)?.v ?? null; return this.valeurs; }
  set valeur(v){ this._write(v); }
  get formule(){ const g = this._; if (g.r1 === g.r2 && g.c1 === g.c2) return cellOf(g.sh, g.r1, g.c1)?.raw ?? ''; return this.formules; }
  set formule(v){ this._write(v); }
  set valeurs(v){ this._write(v); } set formules(v){ this._write(v); }
  _write(v){
    const g = this._;
    if (Array.isArray(v)){
      const rows = Array.isArray(v[0]) ? v : [v];
      rows.forEach((row, i) => (Array.isArray(row) ? row : [row]).forEach((x, j) => { if (g.r1 + i <= 1048575) setLocal(g.sh, g.r1 + i, g.c1 + j, x); }));
    } else {
      const n = (g.r2 - g.r1 + 1) * (g.c2 - g.c1 + 1); if (n > 200000) bad('Plage trop grande pour une écriture groupée.');
      this._each((r, c) => setLocal(g.sh, r, c, v));
    }
  }
  get format(){
    const self = this, g = this._, F = {};
    const first = () => cellOf(g.sh, g.r1, g.c1)?.s || {};
    for (const [fr, k] of Object.entries(ST)) Object.defineProperty(F, fr, {enumerable:true,
      get(){ const v = first()[k]; return k === 'ha' ? (HA_R[v] || 'gauche') : (k === 'b' || k === 'i' || k === 'u' || k === 'st' || k === 'wrap') ? !!v : v ?? null; },
      set(v){ const val = k === 'ha' ? (HA[String(v).toLowerCase()] || bad('Alignement : gauche, centre ou droite')) : (k === 'b' || k === 'i' || k === 'u' || k === 'st' || k === 'wrap') ? (v ? 1 : 0) : k === 'fs' ? +v : v;
        if (k === 'fc' || k === 'bg') if (v && !/^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(String(v))) bad('Couleur invalide : ' + v);
        self._each((r, c) => styleLocal(g.sh, r, c, {[k]:val})); } });
    for (const [en, fr] of Object.entries(EN_ST)) Object.defineProperty(F, en, {get(){ return F[fr]; }, set(v){ F[fr] = v; }});
    return F;
  }
  effacer(){ const g = this._; this._each((r, c) => { const o = g.sh.cells.get(K(r, c)); if (o){ o.raw = ''; o.v = null; o.s = null; } }); push({t:'clear', s:g.sh.name, r1:g.r1, c1:g.c1, r2:g.r2, c2:g.c2, w:'all'}); }
  effacerContenu(){ const g = this._; this._each((r, c) => { const o = g.sh.cells.get(K(r, c)); if (o){ o.raw = ''; o.v = null; } }); push({t:'clear', s:g.sh.name, r1:g.r1, c1:g.c1, r2:g.r2, c2:g.c2, w:'content'}); }
  effacerFormat(){ const g = this._; this._each((r, c) => { const o = g.sh.cells.get(K(r, c)); if (o) o.s = null; }); push({t:'clear', s:g.sh.name, r1:g.r1, c1:g.c1, r2:g.r2, c2:g.c2, w:'format'}); }
  get cellules(){ const g = this._, out = []; this._each((r, c) => out.push(new Plage(g.sh, r, c, r, c))); return out; }
  pourChaque(fn){ this.cellules.forEach(fn); }
  _nums(){ const o = []; for (const row of this.valeurs) for (const v of row) if (typeof v === 'number') o.push(v); return o; }
  somme(){ return this._nums().reduce((a, b) => a + b, 0); }
  moyenne(){ const n = this._nums(); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0; }
  max(){ const n = this._nums(); return n.length ? Math.max(...n) : 0; } min(){ const n = this._nums(); return n.length ? Math.min(...n) : 0; }
  nb(){ return this._nums().length; }
  decaler(dl, dc = 0){ const g = this._; return new Plage(g.sh, g.r1 + dl, g.c1 + dc, g.r2 + dl, g.c2 + dc); }
  redimensionner(nl, nc){ const g = this._; return new Plage(g.sh, g.r1, g.c1, g.r1 + nl - 1, g.c1 + nc - 1); }
  fusionner(){ const g = this._; push({t:'merge', s:g.sh.name, r1:g.r1, c1:g.c1, r2:g.r2, c2:g.c2}); }
  copierVers(dest){ const g = this._, d = typeof dest === 'string' ? parseAddr(dest, active) : dest._; const rows = []; for (let r = g.r1; r <= g.r2; r++){ const row = []; for (let c = g.c1; c <= g.c2; c++){ const o = cellOf(g.sh, r, c); row.push(o ? {raw:o.raw, s:o.s} : null); } rows.push(row); }
    rows.forEach((row, i) => row.forEach((o, j) => { const sh = d.sh; setLocal(sh, d.r1 + i, d.c1 + j, o ? o.raw : ''); if (o && o.s) styleLocal(sh, d.r1 + i, d.c1 + j, o.s); })); }
  trier(colonne = 1, croissant = true){ const g = this._, ci = g.c1 + (colonne - 1), rows = [];
    for (let r = g.r1; r <= g.r2; r++){ const row = []; for (let c = g.c1; c <= g.c2; c++){ const o = cellOf(g.sh, r, c); row.push(o ? {raw:o.raw, v:o.v, s:o.s} : null); } rows.push(row); }
    const kI = ci - g.c1, key = x => { const o = x[kI]; return o ? o.v : null; };
    rows.sort((a, b) => { const x = key(a), y = key(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; const t = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'fr', {numeric:true}); return croissant ? t : -t; });
    rows.forEach((row, i) => row.forEach((o, j) => { setLocal(g.sh, g.r1 + i, g.c1 + j, o ? o.raw : ''); styleLocal(g.sh, g.r1 + i, g.c1 + j, o && o.s ? o.s : {b:0}); })); }
}
const ALIAS = {Value:'valeur', Formula:'formule', Address:'adresse', Rows:'nbLignes', Columns:'nbColonnes', Row:'ligne', Column:'colonne', Clear:'effacer', ClearContents:'effacerContenu', Offset:'decaler', Resize:'redimensionner', Merge:'fusionner', Sum:'somme', Average:'moyenne', Max:'max', Min:'min', Count:'nb', Format:'format', Values:'valeurs', Formulas:'formules'};
for (const [en, fr] of Object.entries(ALIAS)) Object.defineProperty(Plage.prototype, en, Object.getOwnPropertyDescriptor(Plage.prototype, fr) || {value:Plage.prototype[fr]});

class Feuille {
  constructor(s){ this._ = s; Object.freeze(this); }
  get nom(){ return this._.name; } set nom(n){ n = String(n).trim(); if (!n || n.length > 60) bad('Nom de feuille invalide.'); if (sheetByName(n) && sheetByName(n) !== this._) bad('Une feuille porte déjà ce nom.'); push({t:'renSheet', from:this._.name, to:n}); this._.name = n; }
  get index(){ return WBS.indexOf(this._) + 1; }
  plage(a, c1, r2, c2){ const s = this._; if (typeof a === 'number') return new Plage(s, a - 1, c1 - 1, (r2 ?? a) - 1, (c2 ?? c1) - 1); const g = parseAddr(a, s); return new Plage(g.sh, g.r1, g.c1, g.r2, g.c2); }
  cellule(l, c){ if (typeof l === 'string') return this.plage(l); return this.plage(l, c, l, c); }
  colonne(c){ const n = typeof c === 'number' ? c - 1 : colIdx(c); return new Plage(this._, 0, n, Math.max(0, usedR(this._)), n); }
  ligne(l){ return new Plage(this._, l - 1, 0, l - 1, Math.max(0, usedC(this._))); }
  get plageUtilisee(){ return new Plage(this._, 0, 0, Math.max(0, usedR(this._)), Math.max(0, usedC(this._))); }
  largeurColonne(c, px){ push({t:'colw', s:this._.name, c:typeof c === 'number' ? c - 1 : colIdx(c), w:Math.max(8, Math.min(2000, +px))}); }
  hauteurLigne(l, px){ push({t:'rowh', s:this._.name, r:l - 1, h:Math.max(6, Math.min(2000, +px))}); }
  ajouterGraphique(o = {}){ const rg = typeof o.plage === 'string' ? o.plage : o.plage?.adresse; if (!rg) bad('ajouterGraphique : indiquez { plage: "A1:B5" }'); const ch = {type:String(o.type || 'col'), range:rg, title:String(o.titre || ''), x:+o.x || 40, y:+o.y || 40, w:+o.largeur || 480, h:+o.hauteur || 300, legend:o.legende !== false}; push({t:'chart', s:this._.name, ch}); return ch; }
  activer(){ active = this._; push({t:'activate', name:this._.name}); }
  supprimer(){ if (WBS.length < 2) bad('Impossible de supprimer la dernière feuille.'); push({t:'delSheet', name:this._.name}); WBS.splice(WBS.indexOf(this._), 1); if (active === this._) active = WBS[0]; }
}
for (const [en, fr] of Object.entries({Range:'plage', Cells:'cellule', Name:'nom', UsedRange:'plageUtilisee', Activate:'activer', Delete:'supprimer', AddChart:'ajouterGraphique'})) Object.defineProperty(Feuille.prototype, en, Object.getOwnPropertyDescriptor(Feuille.prototype, fr) || {value:Feuille.prototype[fr]});

const wrapSheet = s => new Feuille(s);
const feuilleActive = () => wrapSheet(active);
const classeur = Object.freeze({
  get titre(){ return titre; },
  get feuilles(){ return WBS.map(wrapSheet); },
  get feuilleActive(){ return feuilleActive(); },
  feuille(n){ const s = typeof n === 'number' ? WBS[n - 1] : sheetByName(n); if (!s) bad(`Feuille introuvable : « ${n} »`); return wrapSheet(s); },
  ajouterFeuille(nom){ nom = String(nom || 'Feuille ' + (WBS.length + 1)).trim(); if (sheetByName(nom)) bad(`Une feuille « ${nom} » existe déjà.`); if (WBS.length >= 100) bad('Trop de feuilles.'); const s = {name:nom, cells:new Map()}; WBS.push(s); push({t:'addSheet', name:nom}); return wrapSheet(s); },
});

const api = {
  Classeur:classeur, classeur, Workbook:classeur,
  FeuilleActive:feuilleActive, ActiveSheet:undefined,
  Feuille:n => classeur.feuille(n), Sheets:n => classeur.feuille(n),
  Plage:(a, ...r) => feuilleActive().plage(a, ...r), Range:(a, ...r) => feuilleActive().plage(a, ...r),
  Cellule:(l, c) => feuilleActive().cellule(l, c), Cells:(l, c) => feuilleActive().cellule(l, c),
  message:t => push({t:'toast', text:String(t).slice(0, 300)}), MsgBox:t => push({t:'toast', text:String(t).slice(0, 300)}),
  journal:log('log'), console:{log:log('log'), info:log('info'), warn:log('warn'), error:log('error')},
  maintenant:() => Date.now(), aujourdhui:() => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) + 25569); },
};
Object.defineProperty(api, 'ActiveSheet', {get(){ return feuilleActive(); }, enumerable:true});
for (const n of ['selection', 'Selection']) Object.defineProperty(api, n, {get(){ const g = parseAddr(selAddr, selSheet); return new Plage(g.sh, g.r1, g.c1, g.r2, g.c2); }, enumerable:true});
const NAMES = Object.keys(api);
const BLOCKED_NAMES = ['self', 'globalThis', 'window', 'document', 'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'postMessage', 'Function', 'eval', 'indexedDB', 'navigator', 'location', 'addEventListener', 'removeEventListener', 'onmessage', 'close'];

function load(snap){
  ops = []; logs = []; cnt = 0; titre = snap.title || '';
  WBS = snap.sheets.map(s => { const m = new Map(); for (const [r, c, raw, v, st] of s.cells) m.set(K(r, c), {r, c, raw, v, s:st || null}); return {name:s.name, cells:m}; });
  active = WBS[snap.active] || WBS[0]; selSheet = active; selAddr = snap.sel || 'A1';
}
const errInfo = e => {
  const st = String(e && e.stack || ''); let line = 0; const m = /<anonymous>:(\d+):(\d+)/.exec(st) || /eval.*:(\d+):(\d+)/.exec(st); if (m) line = Math.max(1, +m[1] - 3);
  return {message:String(e && e.message || e).slice(0, 400), name:String(e && e.name || 'Error'), line};
};

addL('message', async ev => {
  const d = ev.data || {}, t0 = Date.now();
  try {
    if (d.type === 'run'){
      load(d.snap);
      const body = '"use strict";\n' + d.code;
      const fn = new _Fn(...NAMES, ...BLOCKED_NAMES.filter(n => !NAMES.includes(n) && !['eval'].includes(n)), body);
      await fn(...NAMES.map(n => api[n]), ...BLOCKED_NAMES.filter(n => !NAMES.includes(n) && !['eval'].includes(n)).map(() => undefined));
      post({id:d.id, ok:true, ops, logs, ms:Date.now() - t0});
    } else if (d.type === 'calls'){
      const out = [];
      const names = d.fnames || [];
      const fns = {};
      try {
        const body = '"use strict";\n' + d.code + '\nreturn {' + names.map(n => `${JSON.stringify(n)}: typeof ${n} === "function" ? ${n} : undefined`).join(',') + '};';
        Object.assign(fns, new _Sync(...BLOCKED_NAMES.filter(n => n !== 'eval'), body)(...BLOCKED_NAMES.filter(n => n !== 'eval').map(() => undefined)));
      } catch(e){ post({id:d.id, ok:false, error:errInfo(e)}); return; }
      for (const c of d.calls){
        try { const f = fns[c.fn]; if (!f) throw new Error('Fonction introuvable : ' + c.fn); let v = f(...c.args); if (v && typeof v.then === 'function') throw new Error('Une fonction personnalisée doit répondre immédiatement (pas de await).'); out.push({k:c.k, v:v === undefined ? null : v}); }
        catch(e){ out.push({k:c.k, e:errInfo(e).message}); }
      }
      post({id:d.id, ok:true, out, ms:Date.now() - t0});
    }
  } catch(e){ post({id:d.id, ok:false, error:errInfo(e), ops:[], logs:logs || []}); }
});
post({ready:true});
