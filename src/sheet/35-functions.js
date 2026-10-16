/* ---------- Évaluation des formules et bibliothèque de fonctions (noms français et anglais) ---------- */
class Rng {
  constructor(sh, r1, c1, r2, c2){ this.sh = sh; this.r1 = r1; this.c1 = c1; this.r2 = r2; this.c2 = c2; }
  clip(){ const u = this.sh.used(); return new Rng(this.sh, this.r1, this.c1, Math.min(this.r2, Math.max(this.r1, u.r)), Math.min(this.c2, Math.max(this.c1, u.c))); }
  get h(){ return this.r2 - this.r1 + 1; } get w(){ return this.c2 - this.c1 + 1; }
  v(i, j){ return this.sh.wb.val(this.sh, this.r1 + i, this.c1 + j); }
  arr(){ const g = this.clip(), out = []; for (let i = 0; i < g.h; i++){ const row = []; for (let j = 0; j < g.w; j++) row.push(g.v(i, j)); out.push(row); } return out; }
}
const isArr = x => Array.isArray(x);
const isRng = x => x instanceof Rng;
/* Rng ou tableau → tableau 2D ; scalaire → [[x]] */
const to2D = x => isRng(x) ? x.arr() : isArr(x) ? x : [[x]];
const scalar = x => { if (isRng(x)){ if (x.h === 1 && x.w === 1) return x.v(0, 0); return x.h === 1 || x.w === 1 ? x.v(0, 0) : ER.value; } if (isArr(x)) return x[0]?.[0] ?? null; return x; };

/* --- conversions --- */
function toNum(v){
  if (isErr(v)) throw v;
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v).trim(); const n = parseNumberFr(s); if (n != null) return n;
  const p = parseInput(s); if (typeof p.v === 'number') return p.v;
  throw ER.value;
}
function toStr(v){
  if (isErr(v)) throw v;
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'VRAI' : 'FAUX';
  if (typeof v === 'number') return fmtGeneral(v).replace(/\u00a0/g, '');
  return String(v);
}
function toBool(v){
  if (isErr(v)) throw v;
  if (typeof v === 'boolean') return v; if (v == null) return false; if (typeof v === 'number') return v !== 0;
  const s = String(v).toUpperCase(); if (s === 'VRAI' || s === 'TRUE') return true; if (s === 'FAUX' || s === 'FALSE') return false; throw ER.value;
}
const N = a => toNum(scalar(a)), S = a => toStr(scalar(a)), B = a => toBool(scalar(a));
const optN = (a, d) => a === undefined || a === MISSING ? d : N(a);
const MISSING = Symbol('missing');
/* tous les nombres d'arguments (dans les plages : on ignore le texte et les cases vides, comme Excel) */
function nums(args, opts = {}){
  const out = [];
  for (const a of args){
    if (a === MISSING) continue;
    if (isRng(a) || isArr(a)){ for (const row of to2D(a)) for (const v of row){ if (isErr(v)){ if (opts.skipErr) continue; throw v; } if (typeof v === 'number') out.push(v); else if (opts.textAsZero && (typeof v === 'string' || typeof v === 'boolean')) out.push(typeof v === 'boolean' ? +v : 0); } }
    else out.push(toNum(a));
  }
  return out;
}
function vals(args){ const out = []; for (const a of args){ if (a === MISSING) continue; if (isRng(a) || isArr(a)) for (const row of to2D(a)) for (const v of row) out.push(v); else out.push(a); } return out; }
/* critères : ">10", "<>x", "=a", "a*", nombres… */
function crit(c){
  c = scalar(c);
  if (typeof c === 'number' || typeof c === 'boolean') return v => v === c || (typeof c === 'number' && typeof v === 'string' && parseNumberFr(v) === c);
  const s = toStr(c); const m = /^(<=|>=|<>|=|<|>)?(.*)$/s.exec(s); const op = m[1] || '=', rhs = m[2];
  const n = parseNumberFr(rhs) ?? (parseDateFr(rhs)?.v ?? null);
  if (n != null && rhs.trim() !== ''){
    return v => { if (v == null || v === '') return op === '<>' ; const x = typeof v === 'number' ? v : typeof v === 'string' ? parseNumberFr(v) : null; if (x == null) return op === '<>';
      return op === '=' ? x === n : op === '<>' ? x !== n : op === '<' ? x < n : op === '>' ? x > n : op === '<=' ? x <= n : x >= n; };
  }
  if (op === '=' || op === '<>'){
    if (rhs === '') return op === '=' ? (v => v == null || v === '') : (v => !(v == null || v === ''));
    const rx = /[*?]/.test(rhs) ? new RegExp('^' + rhs.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/~\*/g, '\u0001').replace(/~\?/g, '\u0002').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\u0001/g, '\\*').replace(/\u0002/g, '\\?') + '$', 'is') : null;
    const low = rhs.toLowerCase();
    const eq = v => { if (v == null) return false; const t = toStr(v).toLowerCase(); return rx ? rx.test(t) : t === low; };
    return op === '=' ? eq : v => !eq(v);
  }
  const low = rhs.toLowerCase();
  return v => { if (typeof v !== 'string') return false; const t = v.toLowerCase(); return op === '<' ? t < low : op === '>' ? t > low : op === '<=' ? t <= low : t >= low; };
}
/* comparaison à la Excel : nombres < textes < booléens, texte sans casse */
function cmpVal(a, b){
  const rank = v => v == null ? 0 : typeof v === 'number' ? 1 : typeof v === 'string' ? 2 : typeof v === 'boolean' ? 3 : 4;
  if (a == null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b == null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  const ra = rank(a), rb = rank(b); if (ra !== rb) return ra - rb;
  if (typeof a === 'string') return a.localeCompare(b, 'fr', {sensitivity:'base'});
  return a < b ? -1 : a > b ? 1 : 0;
}
const flat1 = x => to2D(x).flat();
function mapArr(x, f){ if (isRng(x) || isArr(x)) return to2D(x).map(r => r.map(v => { try { return f(v); } catch(e){ if (isErr(e)) return e; throw e; } })); return f(x); }
function broadcast(a, b, f){
  const A = isRng(a) || isArr(a), Bb = isRng(b) || isArr(b);
  if (!A && !Bb) return f(a, b);
  const x = A ? to2D(a) : null, y = Bb ? to2D(b) : null;
  const h = Math.max(x ? x.length : 1, y ? y.length : 1), w = Math.max(x ? x[0].length : 1, y ? y[0].length : 1), out = [];
  for (let i = 0; i < h; i++){ const row = []; for (let j = 0; j < w; j++){
    const av = x ? (x.length === 1 ? x[0] : x[i])?.[x[0].length === 1 ? 0 : j] : a, bv = y ? (y.length === 1 ? y[0] : y[i])?.[y[0].length === 1 ? 0 : j] : b;
    try { row.push(av === undefined || bv === undefined ? ER.na : f(av, bv)); } catch(e){ if (isErr(e)) row.push(e); else throw e; } } out.push(row); }
  return out;
}
const BINOPS = {
  '+':(a, b) => toNum(a) + toNum(b), '-':(a, b) => toNum(a) - toNum(b), '*':(a, b) => toNum(a) * toNum(b),
  '/':(a, b) => { const d = toNum(b); if (d === 0){ toNum(a); throw ER.div0; } return toNum(a) / d; },
  '^':(a, b) => { const r = Math.pow(toNum(a), toNum(b)); if (!isFinite(r)) throw ER.num; return r; },
  '&':(a, b) => toStr(a) + toStr(b),
  '=':(a, b) => { if (isErr(a)) throw a; if (isErr(b)) throw b; return cmpVal(a, b) === 0; }, '<>':(a, b) => { if (isErr(a)) throw a; if (isErr(b)) throw b; return cmpVal(a, b) !== 0; },
  '<':(a, b) => { if (isErr(a)) throw a; if (isErr(b)) throw b; return cmpVal(a, b) < 0; }, '>':(a, b) => { if (isErr(a)) throw a; if (isErr(b)) throw b; return cmpVal(a, b) > 0; },
  '<=':(a, b) => { if (isErr(a)) throw a; if (isErr(b)) throw b; return cmpVal(a, b) <= 0; }, '>=':(a, b) => { if (isErr(a)) throw a; if (isErr(b)) throw b; return cmpVal(a, b) >= 0; },
};
/* évaluation d'un nœud : renvoie une valeur, une plage (Rng) ou un tableau 2D */
function ev(n, ctx){
  switch (n.t){
    case 'num': case 'str': case 'bool': return n.v;
    case 'err': return new CErr(({'#VALEUR!':'#VALUE!', '#NOM?':'#NAME?', '#NOMBRE!':'#NUM!', '#NUL!':'#NULL!', '#PROPAGATION!':'#SPILL!'})[n.v] || n.v);
    case 'missing': return MISSING;
    case 'ref': { const sh = n.sheet != null ? ctx.wb.byName(n.sheet) : ctx.sh; if (!sh) return ER.ref; return ctx.wb.val(sh, n.r, n.c); }
    case 'range': { const sh = n.sheet != null ? ctx.wb.byName(n.sheet) : ctx.sh; if (!sh) return ER.ref; return new Rng(sh, n.r1, n.c1, n.r2, n.c2); }
    case 'name': { if (ctx.local && n.v.toUpperCase() in ctx.local) return ctx.local[n.v.toUpperCase()]; const nm = ctx.wb.names?.[n.v.toUpperCase()]; if (nm){ const g = parseRange(nm.ref), sh = ctx.wb.byName(nm.sheet) || ctx.sh; if (g) return g.r1 === g.r2 && g.c1 === g.c2 ? ctx.wb.val(sh, g.r1, g.c1) : new Rng(sh, g.r1, g.c1, g.r2, g.c2); } return ER.name; }
    case 'neg': { const a = ev(n.a, ctx); return mapArr(a, v => -toNum(v)); }
    case 'pct': { const a = ev(n.a, ctx); return mapArr(a, v => toNum(v) / 100); }
    case 'arr': return n.rows.map(r => r.map(x => { const v = ev(x, ctx); return isRng(v) ? scalar(v) : v; }));
    case 'bin': {
      let a = ev(n.a, ctx), b = ev(n.b, ctx);
      if (isRng(a) && a.h === 1 && a.w === 1) a = a.v(0, 0); if (isRng(b) && b.h === 1 && b.w === 1) b = b.v(0, 0);
      return broadcast(a, b, BINOPS[n.op]);
    }
    case 'fn': {
      const def = FN[n.name] || FN[FN_ALIAS[n.name]];
      if (!def) return ER.name;
      try {
        if (def.lazy) return def.f(n.args, ctx);
        const args = n.args.map(a => ev(a, ctx));
        if (!def.err) for (const a of args) if (isErr(a)) return a;
        if (def.min != null && args.length < def.min) return ER.value;
        return def.f(args, ctx);
      } catch(e){ if (isErr(e)) return e; console.warn(e); return ER.value; }
    }
  }
  return ER.value;
}
/* --- utilitaires mathématiques --- */
const round = (x, d) => { const m = Math.pow(10, d); const v = Math.round(Math.abs(x) * m + 1e-9) / m; return x < 0 ? -v : v; };
const sum = a => a.reduce((s, x) => s + x, 0);
const mean = a => { if (!a.length) throw ER.div0; return sum(a) / a.length; };
const variance = (a, pop) => { if (a.length < (pop ? 1 : 2)) throw ER.div0; const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - (pop ? 0 : 1)); };
const sortNum = a => [...a].sort((x, y) => x - y);
function percentile(a, p){ const s = sortNum(a); if (!s.length || p < 0 || p > 1) throw ER.num; const k = (s.length - 1) * p, f = Math.floor(k); return s[f] + (k - f) * ((s[f + 1] ?? s[f]) - s[f]); }
const gcd2 = (a, b) => { a = Math.abs(Math.trunc(a)); b = Math.abs(Math.trunc(b)); while (b){ [a, b] = [b, a % b]; } return a; };
/* plages parallèles pour SOMME.SI.ENS & co */
function ifsMask(args, start){
  const pairs = []; for (let i = start; i < args.length; i += 2){ if (args[i + 1] === undefined) throw ER.value; pairs.push([to2D(args[i]), crit(args[i + 1])]); }
  return pairs;
}
function ifsIter(target, args, start, fn){
  const T = to2D(target), P = ifsMask(args, start);
  for (const [R] of P) if (R.length !== T.length || R[0].length !== T[0].length){ if (!(isRng(args[start]) && args[start].h === (isRng(target) ? target.h : T.length))) throw ER.value; }
  for (let i = 0; i < T.length; i++) for (let j = 0; j < T[0].length; j++){ if (P.every(([R, f]) => f(R[i]?.[j]))) fn(T[i][j]); }
}
function sumifLike(rng, cr, sumRng, fn){
  const R = to2D(rng), f = crit(cr), Sm = sumRng && sumRng !== MISSING ? (isRng(sumRng) ? new Rng(sumRng.sh, sumRng.r1, sumRng.c1, sumRng.r1 + (isRng(rng) ? rng.h : R.length) - 1, sumRng.c1 + (isRng(rng) ? rng.w : R[0].length) - 1).arr() : to2D(sumRng)) : R;
  for (let i = 0; i < R.length; i++) for (let j = 0; j < R[0].length; j++) if (f(R[i][j])) fn(Sm[i]?.[j]);
}
/* recherche */
function findIn(list, key, mode){   // mode : 0 exact, 1 inférieur ou égal (trié), -1 supérieur ou égal (trié décroissant), 2 joker
  if (mode === 0 || mode === 2){
    const f = typeof key === 'string' && /[*?]/.test(key) ? crit('=' + key) : null;
    for (let i = 0; i < list.length; i++){ const v = list[i]; if (f ? f(v) : cmpVal(v, key) === 0 && (v != null)) return i; }
    return -1;
  }
  let best = -1;
  for (let i = 0; i < list.length; i++){ const v = list[i]; if (v == null) continue; const c = cmpVal(v, key); if (mode === 1){ if (c <= 0 && typeof v === typeof key) best = i; else if (c > 0) break; } else { if (c >= 0) best = i; else break; } }
  return best;
}
/* dates */
const dateArg = a => { const v = scalar(a); if (typeof v === 'string'){ const d = parseDateFr(v); if (d) return d.v; } return toNum(v); };
function addMonths(s, n){ const t = fromSerial(s); const y = t.y + Math.floor((t.m - 1 + n) / 12), m = ((t.m - 1 + n) % 12 + 12) % 12 + 1; const last = new Date(Date.UTC(y, m, 0)).getUTCDate(); return toSerial(y, m, Math.min(t.d, last)); }
const isWeekend = s => { const w = fromSerial(s).wd; return w === 0 || w === 6; };
function holidaysSet(h){ return new Set(h && h !== MISSING ? nums([h]).map(Math.floor) : []); }
/* finance */
function pmt(rate, nper, pv, fv = 0, type = 0){ if (rate === 0) return -(pv + fv) / nper; const p = Math.pow(1 + rate, nper); return -(rate * (pv * p + fv)) / ((1 + rate * type) * (p - 1)); }
function fvf(rate, nper, pmtv, pv = 0, type = 0){ if (rate === 0) return -(pv + pmtv * nper); const p = Math.pow(1 + rate, nper); return -(pv * p + pmtv * (1 + rate * type) * (p - 1) / rate); }
function pvf(rate, nper, pmtv, fv = 0, type = 0){ if (rate === 0) return -(fv + pmtv * nper); const p = Math.pow(1 + rate, nper); return -(fv + pmtv * (1 + rate * type) * (p - 1) / rate) / p; }
function ipmt(rate, per, nper, pv, fv = 0, type = 0){ const p = pmt(rate, nper, pv, fv, type); if (per === 1 && type === 1) return 0; const bal = fvf(rate, per - 1 - type, p, pv, type); return bal * rate * (type ? 1 / (1 + rate) : 1) ; }
/* texte d'une valeur selon un format (TEXTE) */
function textFmt(v, fmt){ fmt = String(fmt).replace(/j/gi, 'd').replace(/a/gi, (c, i, s) => /aaaa|aa/i.test(s) ? 'y' : c).replace(/\bss\b/, 'ss'); if (/^[^0#]*$/i.test(fmt) && /[dmyhs]/i.test(fmt)) return fmtDate(toNum(v), fmt); return formatValue(toNum(v), fmt.replace(/,(?=0)/, '.')).t; }

/* ---------------- la bibliothèque ---------------- */
const FN = {}, FN_ALIAS = {}, FN_FR_OF = {}, FN_INFO = [];
/* def(nom anglais, nom français, catégorie, syntaxe française, description, fonction, options) */
function def(en, fr, cat, syn, desc, f, o = {}){ FN[en] = {f, ...o}; if (fr && fr !== en){ FN_ALIAS[fr] = en; FN_FR_OF[en] = fr; } FN_INFO.push({en, fr:fr || en, cat, syn, desc}); }
const M = 'Maths', ST = 'Statistiques', LG = 'Logique', LK = 'Recherche', TX = 'Texte', DT = 'Date et heure', FI = 'Finances', IN = 'Informations', AR = 'Tableaux';

// Maths
def('SUM', 'SOMME', M, 'nombre1; [nombre2]…', 'Additionne des nombres ou des plages', a => sum(nums(a)));
def('PRODUCT', 'PRODUIT', M, 'nombre1; [nombre2]…', 'Multiplie des nombres', a => nums(a).reduce((p, x) => p * x, 1));
def('ROUND', 'ARRONDI', M, 'nombre; décimales', 'Arrondit à un nombre de décimales', a => round(N(a[0]), optN(a[1], 0)), {min:1});
def('ROUNDUP', 'ARRONDI.SUP', M, 'nombre; décimales', 'Arrondit en s\'éloignant de zéro', a => { const m = Math.pow(10, optN(a[1], 0)), x = N(a[0]); return Math.sign(x) * Math.ceil(Math.abs(x) * m - 1e-9) / m; }, {min:1});
def('ROUNDDOWN', 'ARRONDI.INF', M, 'nombre; décimales', 'Arrondit vers zéro', a => { const m = Math.pow(10, optN(a[1], 0)), x = N(a[0]); return Math.sign(x) * Math.floor(Math.abs(x) * m + 1e-9) / m; }, {min:1});
def('MROUND', 'ARRONDI.AU.MULTIPLE', M, 'nombre; multiple', 'Arrondit au multiple le plus proche', a => { const m = N(a[1]); if (!m) return 0; return round(Math.round(N(a[0]) / m) * m, 10); }, {min:2});
def('CEILING', 'PLAFOND', M, 'nombre; [précision]', 'Arrondit au multiple supérieur', a => { const s = optN(a[1], 1); return s ? Math.ceil(N(a[0]) / s - 1e-12) * s : 0; }, {min:1});
def('FLOOR', 'PLANCHER', M, 'nombre; [précision]', 'Arrondit au multiple inférieur', a => { const s = optN(a[1], 1); return s ? Math.floor(N(a[0]) / s + 1e-12) * s : 0; }, {min:1});
FN['CEILING.MATH'] = FN.CEILING; FN_ALIAS['PLAFOND.MATH'] = 'CEILING'; FN['FLOOR.MATH'] = FN.FLOOR; FN_ALIAS['PLANCHER.MATH'] = 'FLOOR';
def('INT', 'ENT', M, 'nombre', 'Partie entière (vers le bas)', a => Math.floor(N(a[0])), {min:1});
def('TRUNC', 'TRONQUE', M, 'nombre; [décimales]', 'Supprime les décimales', a => { const m = Math.pow(10, optN(a[1], 0)); return Math.trunc(N(a[0]) * m) / m; }, {min:1});
def('MOD', 'MOD', M, 'nombre; diviseur', 'Reste d\'une division', a => { const d = N(a[1]); if (!d) throw ER.div0; const x = N(a[0]); return x - d * Math.floor(x / d); }, {min:2});
def('QUOTIENT', 'QUOTIENT', M, 'numérateur; dénominateur', 'Partie entière d\'une division', a => { const d = N(a[1]); if (!d) throw ER.div0; return Math.trunc(N(a[0]) / d); }, {min:2});
def('ABS', 'ABS', M, 'nombre', 'Valeur absolue', a => Math.abs(N(a[0])), {min:1});
def('SIGN', 'SIGNE', M, 'nombre', 'Signe d\'un nombre (-1, 0 ou 1)', a => Math.sign(N(a[0])), {min:1});
def('SQRT', 'RACINE', M, 'nombre', 'Racine carrée', a => { const x = N(a[0]); if (x < 0) throw ER.num; return Math.sqrt(x); }, {min:1});
def('POWER', 'PUISSANCE', M, 'nombre; puissance', 'Élève à une puissance', a => BINOPS['^'](N(a[0]), N(a[1])), {min:2});
def('EXP', 'EXP', M, 'nombre', 'e puissance nombre', a => Math.exp(N(a[0])), {min:1});
def('LN', 'LN', M, 'nombre', 'Logarithme népérien', a => { const x = N(a[0]); if (x <= 0) throw ER.num; return Math.log(x); }, {min:1});
def('LOG', 'LOG', M, 'nombre; [base]', 'Logarithme (base 10 par défaut)', a => { const x = N(a[0]), b = optN(a[1], 10); if (x <= 0 || b <= 0 || b === 1) throw ER.num; return Math.log(x) / Math.log(b); }, {min:1});
def('LOG10', 'LOG10', M, 'nombre', 'Logarithme décimal', a => { const x = N(a[0]); if (x <= 0) throw ER.num; return Math.log10(x); }, {min:1});
def('PI', 'PI', M, '', 'Le nombre π', () => Math.PI);
def('RAND', 'ALEA', M, '', 'Nombre aléatoire entre 0 et 1', () => Math.random(), {volatile:true});
def('RANDBETWEEN', 'ALEA.ENTRE.BORNES', M, 'min; max', 'Entier aléatoire entre deux bornes', a => { const lo = Math.ceil(N(a[0])), hi = Math.floor(N(a[1])); return lo + Math.floor(Math.random() * (hi - lo + 1)); }, {min:2, volatile:true});
def('FACT', 'FACT', M, 'nombre', 'Factorielle', a => { let n = Math.floor(N(a[0])), r = 1; if (n < 0) throw ER.num; while (n > 1) r *= n--; return r; }, {min:1});
def('GCD', 'PGCD', M, 'nombre1; [nombre2]…', 'Plus grand commun diviseur', a => nums(a).reduce(gcd2));
def('LCM', 'PPCM', M, 'nombre1; [nombre2]…', 'Plus petit commun multiple', a => nums(a).reduce((x, y) => x && y ? Math.abs(x * y) / gcd2(x, y) : 0));
def('EVEN', 'PAIR', M, 'nombre', 'Arrondit au nombre pair supérieur', a => { const x = N(a[0]); const v = Math.ceil(Math.abs(x) / 2) * 2; return x < 0 ? -v : v; }, {min:1});
def('ODD', 'IMPAIR', M, 'nombre', 'Arrondit au nombre impair supérieur', a => { const x = N(a[0]); let v = Math.ceil(Math.abs(x)); if (v % 2 === 0) v++; return x < 0 ? -v : v; }, {min:1});
def('SUMPRODUCT', 'SOMMEPROD', M, 'matrice1; [matrice2]…', 'Somme des produits terme à terme', a => { const A = a.map(to2D); const h = A[0].length, w = A[0][0].length; if (A.some(x => x.length !== h || x[0].length !== w)) throw ER.value; let s = 0; for (let i = 0; i < h; i++) for (let j = 0; j < w; j++){ let p = 1; for (const x of A){ const v = x[i][j]; if (isErr(v)) throw v; p *= typeof v === 'number' ? v : typeof v === 'boolean' ? +v : 0; } s += p; } return s; }, {min:1});
def('SUMSQ', 'SOMME.CARRES', M, 'nombre1; [nombre2]…', 'Somme des carrés', a => sum(nums(a).map(x => x * x)));
def('SUMIF', 'SOMME.SI', M, 'plage; critère; [plage_somme]', 'Additionne les cellules qui répondent à un critère', a => { let s = 0; sumifLike(a[0], a[1], a[2], v => { if (typeof v === 'number') s += v; }); return s; }, {min:2});
def('SUMIFS', 'SOMME.SI.ENS', M, 'plage_somme; plage1; critère1; …', 'Additionne selon plusieurs critères', a => { let s = 0; ifsIter(a[0], a, 1, v => { if (typeof v === 'number') s += v; }); return s; }, {min:3});
def('SUBTOTAL', 'SOUS.TOTAL', M, 'fonction; plage1; …', 'Sous-total (9 = somme, 1 = moyenne…)', a => { const k = N(a[0]) % 100, map = {1:'AVERAGE', 2:'COUNT', 3:'COUNTA', 4:'MAX', 5:'MIN', 6:'PRODUCT', 7:'STDEV', 8:'STDEVP', 9:'SUM', 10:'VAR', 11:'VARP'}; if (!map[k]) throw ER.value; return FN[map[k]].f(a.slice(1)); }, {min:2});
def('AGGREGATE', 'AGREGAT', M, 'fonction; options; plage', 'Comme SOUS.TOTAL, en ignorant les erreurs', a => { const k = N(a[0]), list = nums(a.slice(2), {skipErr:true}); const m = {1:mean, 2:l => l.length, 4:l => Math.max(...l), 5:l => Math.min(...l), 9:sum, 12:l => percentile(l, .5)}; if (!m[k]) throw ER.value; return m[k](list); }, {min:3, err:true});
def('ROMAN', 'ROMAIN', M, 'nombre', 'Chiffres romains', a => { let n = Math.floor(N(a[0])); if (n < 0 || n > 3999) throw ER.value; const t = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of t) while (n >= v){ s += r; n -= v; } return s; }, {min:1});
for (const [en, fr, f] of [['SIN', 'SIN', Math.sin], ['COS', 'COS', Math.cos], ['TAN', 'TAN', Math.tan], ['ASIN', 'ASIN', Math.asin], ['ACOS', 'ACOS', Math.acos], ['ATAN', 'ATAN', Math.atan]]) def(en, fr, M, 'nombre', 'Trigonométrie (radians)', a => f(N(a[0])), {min:1});
def('RADIANS', 'RADIANS', M, 'angle', 'Degrés → radians', a => N(a[0]) * Math.PI / 180, {min:1});
def('DEGREES', 'DEGRES', M, 'angle', 'Radians → degrés', a => N(a[0]) * 180 / Math.PI, {min:1});
def('ATAN2', 'ATAN2', M, 'x; y', 'Arc tangente de x et y', a => Math.atan2(N(a[1]), N(a[0])), {min:2});

// Statistiques
def('AVERAGE', 'MOYENNE', ST, 'nombre1; [nombre2]…', 'Moyenne arithmétique', a => mean(nums(a)));
def('AVERAGEA', 'AVERAGEA', ST, 'valeur1; …', 'Moyenne (texte = 0)', a => mean(nums(a, {textAsZero:true})));
def('MIN', 'MIN', ST, 'nombre1; [nombre2]…', 'Plus petite valeur', a => { const l = nums(a); return l.length ? Math.min(...l) : 0; });
def('MAX', 'MAX', ST, 'nombre1; [nombre2]…', 'Plus grande valeur', a => { const l = nums(a); return l.length ? Math.max(...l) : 0; });
def('COUNT', 'NB', ST, 'valeur1; [valeur2]…', 'Nombre de cellules contenant des nombres', a => { let n = 0; for (const x of a){ if (isRng(x) || isArr(x)) n += flat1(x).filter(v => typeof v === 'number').length; else if (x !== MISSING) try { toNum(x); n++; } catch(e){} } return n; }, {err:true});
def('COUNTA', 'NBVAL', ST, 'valeur1; [valeur2]…', 'Nombre de cellules non vides', a => vals(a).filter(v => v != null && v !== '').length, {err:true});
def('COUNTBLANK', 'NB.VIDE', ST, 'plage', 'Nombre de cellules vides', a => { const r = a[0]; if (!isRng(r)) return 0; let n = 0; for (let i = 0; i < r.h; i++) for (let j = 0; j < r.w; j++){ const v = r.v(i, j); if (v == null || v === '') n++; } return n; }, {min:1});
def('COUNTIF', 'NB.SI', ST, 'plage; critère', 'Compte les cellules qui répondent à un critère', a => { let n = 0; sumifLike(a[0], a[1], null, () => n++); return n; }, {min:2});
def('COUNTIFS', 'NB.SI.ENS', ST, 'plage1; critère1; …', 'Compte selon plusieurs critères', a => { let n = 0; ifsIter(a[0], a, 0, () => n++); return n; }, {min:2});
def('AVERAGEIF', 'MOYENNE.SI', ST, 'plage; critère; [plage_moyenne]', 'Moyenne des cellules qui répondent à un critère', a => { const l = []; sumifLike(a[0], a[1], a[2], v => { if (typeof v === 'number') l.push(v); }); return mean(l); }, {min:2});
def('AVERAGEIFS', 'MOYENNE.SI.ENS', ST, 'plage_moyenne; plage1; critère1; …', 'Moyenne selon plusieurs critères', a => { const l = []; ifsIter(a[0], a, 1, v => { if (typeof v === 'number') l.push(v); }); return mean(l); }, {min:3});
def('MAXIFS', 'MAX.SI.ENS', ST, 'plage_max; plage1; critère1; …', 'Maximum selon des critères', a => { const l = []; ifsIter(a[0], a, 1, v => { if (typeof v === 'number') l.push(v); }); return l.length ? Math.max(...l) : 0; }, {min:3});
def('MINIFS', 'MIN.SI.ENS', ST, 'plage_min; plage1; critère1; …', 'Minimum selon des critères', a => { const l = []; ifsIter(a[0], a, 1, v => { if (typeof v === 'number') l.push(v); }); return l.length ? Math.min(...l) : 0; }, {min:3});
def('MEDIAN', 'MEDIANE', ST, 'nombre1; …', 'Valeur médiane', a => percentile(nums(a), .5));
def('MODE', 'MODE', ST, 'nombre1; …', 'Valeur la plus fréquente', a => { const c = new Map(); let best = null, bn = 1; for (const x of nums(a)){ const n = (c.get(x) || 0) + 1; c.set(x, n); if (n > bn){ bn = n; best = x; } } if (best == null) throw ER.na; return best; });
FN['MODE.SNGL'] = FN.MODE; FN_ALIAS['MODE.SIMPLE'] = 'MODE';
def('STDEV', 'ECARTYPE', ST, 'nombre1; …', 'Écart type (échantillon)', a => Math.sqrt(variance(nums(a))));
def('STDEVP', 'ECARTYPEP', ST, 'nombre1; …', 'Écart type (population)', a => Math.sqrt(variance(nums(a), true)));
FN['STDEV.S'] = FN.STDEV; FN['STDEV.P'] = FN.STDEVP; FN_ALIAS['ECARTYPE.STANDARD'] = 'STDEV'; FN_ALIAS['ECARTYPE.PEARSON'] = 'STDEVP';
def('VAR', 'VAR', ST, 'nombre1; …', 'Variance (échantillon)', a => variance(nums(a)));
def('VARP', 'VAR.P', ST, 'nombre1; …', 'Variance (population)', a => variance(nums(a), true));
FN['VAR.S'] = FN.VAR; FN_ALIAS['VAR.S'] = 'VAR';
def('LARGE', 'GRANDE.VALEUR', ST, 'plage; k', 'k-ième plus grande valeur', a => { const s = sortNum(nums([a[0]])).reverse(), k = N(a[1]); if (k < 1 || k > s.length) throw ER.num; return s[k - 1]; }, {min:2});
def('SMALL', 'PETITE.VALEUR', ST, 'plage; k', 'k-ième plus petite valeur', a => { const s = sortNum(nums([a[0]])), k = N(a[1]); if (k < 1 || k > s.length) throw ER.num; return s[k - 1]; }, {min:2});
def('RANK', 'RANG', ST, 'nombre; plage; [ordre]', 'Rang d\'un nombre dans une liste', a => { const x = N(a[0]), l = nums([a[1]]), asc = optN(a[2], 0); if (!l.includes(x)) throw ER.na; return 1 + l.filter(v => asc ? v < x : v > x).length; }, {min:2});
FN['RANK.EQ'] = FN.RANK; FN_ALIAS['EQUATION.RANG'] = 'RANK';
def('PERCENTILE', 'CENTILE', ST, 'plage; k', 'k-ième centile (0 à 1)', a => percentile(nums([a[0]]), N(a[1])), {min:2});
FN['PERCENTILE.INC'] = FN.PERCENTILE; FN_ALIAS['CENTILE.INCLURE'] = 'PERCENTILE';
def('QUARTILE', 'QUARTILE', ST, 'plage; quart', 'Quartile (0 à 4)', a => percentile(nums([a[0]]), N(a[1]) / 4), {min:2});
def('CORREL', 'COEFFICIENT.CORRELATION', ST, 'plage1; plage2', 'Coefficient de corrélation', a => { const x = flat1(a[0]), y = flat1(a[1]); const p = x.map((v, i) => [v, y[i]]).filter(([u, w]) => typeof u === 'number' && typeof w === 'number'); const mx = mean(p.map(q => q[0])), my = mean(p.map(q => q[1])); let sxy = 0, sx = 0, sy = 0; for (const [u, w] of p){ sxy += (u - mx) * (w - my); sx += (u - mx) ** 2; sy += (w - my) ** 2; } if (!sx || !sy) throw ER.div0; return sxy / Math.sqrt(sx * sy); }, {min:2});
def('SLOPE', 'PENTE', ST, 'y_connus; x_connus', 'Pente de la droite de régression', a => { const y = flat1(a[0]), x = flat1(a[1]); const p = x.map((v, i) => [v, y[i]]).filter(([u, w]) => typeof u === 'number' && typeof w === 'number'); const mx = mean(p.map(q => q[0])), my = mean(p.map(q => q[1])); let n = 0, d = 0; for (const [u, w] of p){ n += (u - mx) * (w - my); d += (u - mx) ** 2; } if (!d) throw ER.div0; return n / d; }, {min:2});
def('INTERCEPT', 'ORDONNEE.ORIGINE', ST, 'y_connus; x_connus', 'Ordonnée à l\'origine de la régression', a => { const y = flat1(a[0]), x = flat1(a[1]); const p = x.map((v, i) => [v, y[i]]).filter(([u, w]) => typeof u === 'number' && typeof w === 'number'); const mx = mean(p.map(q => q[0])), my = mean(p.map(q => q[1])); return my - FN.SLOPE.f(a) * mx; }, {min:2});
def('FORECAST', 'PREVISION', ST, 'x; y_connus; x_connus', 'Prévision par régression linéaire', a => FN.INTERCEPT.f([a[1], a[2]]) + FN.SLOPE.f([a[1], a[2]]) * N(a[0]), {min:3});
FN['FORECAST.LINEAR'] = FN.FORECAST; FN_ALIAS['PREVISION.LINEAIRE'] = 'FORECAST';

// Logique
def('IF', 'SI', LG, 'test; valeur_si_vrai; [valeur_si_faux]', 'Choisit une valeur selon une condition', (args, ctx) => {
  const t = ev(args[0], ctx); if (isErr(t)) return t;
  if (isRng(t) && (t.h > 1 || t.w > 1) || isArr(t)){ const T = to2D(t); const y = args[1] ? ev(args[1], ctx) : true, n = args[2] ? ev(args[2], ctx) : false;
    return T.map((r, i) => r.map((v, j) => { try { const pick = toBool(v) ? y : n; return isRng(pick) || isArr(pick) ? to2D(pick)[i]?.[j] ?? ER.na : pick === MISSING ? 0 : pick; } catch(e){ return isErr(e) ? e : ER.value; } })); }
  const b = toBool(scalar(t)); const n = b ? args[1] : args[2];
  if (!n) return b; const v = ev(n, ctx); return v === MISSING ? 0 : v;
}, {lazy:true});
def('IFS', 'SI.CONDITIONS', LG, 'test1; valeur1; [test2; valeur2]…', 'Première valeur dont la condition est vraie', (args, ctx) => { for (let i = 0; i + 1 < args.length; i += 2){ const t = ev(args[i], ctx); if (isErr(t)) return t; if (toBool(scalar(t))) return ev(args[i + 1], ctx); } return ER.na; }, {lazy:true});
def('SWITCH', 'SI.MULTIPLE', LG, 'expression; valeur1; résultat1; …; [défaut]', 'Compare une valeur à une liste', (args, ctx) => { const x = scalar(ev(args[0], ctx)); if (isErr(x)) return x; let i = 1; for (; i + 1 < args.length; i += 2) if (cmpVal(scalar(ev(args[i], ctx)), x) === 0) return ev(args[i + 1], ctx); return i < args.length ? ev(args[i], ctx) : ER.na; }, {lazy:true});
def('IFERROR', 'SIERREUR', LG, 'valeur; valeur_si_erreur', 'Remplace une erreur par une valeur', (args, ctx) => { const v = ev(args[0], ctx); const s = isRng(v) && v.h === 1 && v.w === 1 ? v.v(0, 0) : v; if (isErr(s)) return args[1] ? ev(args[1], ctx) : 0; if (isArr(s) || isRng(s)){ const alt = args[1] ? ev(args[1], ctx) : 0; return to2D(s).map(r => r.map(x => isErr(x) ? scalar(alt) : x)); } return s; }, {lazy:true});
def('IFNA', 'SI.NON.DISP', LG, 'valeur; valeur_si_na', 'Remplace #N/A par une valeur', (args, ctx) => { const v = scalar(ev(args[0], ctx)); return isErr(v) && v.code === '#N/A' ? ev(args[1], ctx) : v; }, {lazy:true});
def('AND', 'ET', LG, 'logique1; [logique2]…', 'VRAI si toutes les conditions sont vraies', a => { let r = true; for (const v of vals(a)){ if (isErr(v)) throw v; if (v == null || typeof v === 'string') continue; if (!toBool(v)) r = false; } return r; }, {min:1});
def('OR', 'OU', LG, 'logique1; [logique2]…', 'VRAI si au moins une condition est vraie', a => { let r = false; for (const v of vals(a)){ if (isErr(v)) throw v; if (v == null || typeof v === 'string') continue; if (toBool(v)) r = true; } return r; }, {min:1});
def('XOR', 'OUX', LG, 'logique1; …', 'OU exclusif', a => vals(a).filter(v => v != null && typeof v !== 'string' && toBool(v)).length % 2 === 1, {min:1});
def('NOT', 'NON', LG, 'logique', 'Inverse une condition', a => mapArr(a[0], v => !toBool(v)), {min:1});
def('TRUE', 'VRAI', LG, '', 'La valeur VRAI', () => true);
def('FALSE', 'FAUX', LG, '', 'La valeur FAUX', () => false);
def('CHOOSE', 'CHOISIR', LG, 'index; valeur1; [valeur2]…', 'Choisit une valeur dans une liste', (args, ctx) => { const i = Math.floor(toNum(scalar(ev(args[0], ctx)))); if (i < 1 || i >= args.length) return ER.value; return ev(args[i], ctx); }, {lazy:true});
def('LET', 'LET', LG, 'nom1; valeur1; …; calcul', 'Nomme des valeurs intermédiaires', (args, ctx) => { const c2 = {...ctx, local:{...(ctx.local || {})}}; for (let i = 0; i + 1 < args.length; i += 2){ if (args[i].t !== 'name') return ER.value; c2.local[args[i].v.toUpperCase()] = ev(args[i + 1], c2); } return ev(args[args.length - 1], c2); }, {lazy:true});

// Recherche
def('VLOOKUP', 'RECHERCHEV', LK, 'valeur; table; colonne; [proche]', 'Cherche une valeur dans la 1re colonne et renvoie une colonne', a => { const key = scalar(a[0]); if (isErr(key)) throw key; const T = to2D(a[1]), col = Math.floor(N(a[2])); if (col < 1 || col > T[0].length) throw ER.ref; const approx = a[3] === undefined || a[3] === MISSING ? true : B(a[3]); const i = findIn(T.map(r => r[0]), key, approx ? 1 : 2); if (i < 0) throw ER.na; return T[i][col - 1]; }, {min:3});
def('HLOOKUP', 'RECHERCHEH', LK, 'valeur; table; ligne; [proche]', 'Cherche dans la 1re ligne et renvoie une ligne', a => { const key = scalar(a[0]); const T = to2D(a[1]), row = Math.floor(N(a[2])); if (row < 1 || row > T.length) throw ER.ref; const approx = a[3] === undefined || a[3] === MISSING ? true : B(a[3]); const i = findIn(T[0], key, approx ? 1 : 2); if (i < 0) throw ER.na; return T[row - 1][i]; }, {min:3});
def('XLOOKUP', 'RECHERCHEX', LK, 'valeur; plage_cherchée; plage_renvoyée; [si_absent]; [mode]', 'Recherche moderne dans une ligne ou colonne', a => { const key = scalar(a[0]); const L = flat1(a[1]); const R = to2D(a[2]); const mode = optN(a[4], 0); let i;
  if (mode === 0) i = findIn(L, key, 2); else { let best = -1; for (let k = 0; k < L.length; k++){ const c = cmpVal(L[k], key); if (c === 0){ best = k; break; } if (mode === -1 && c < 0 && (best < 0 || cmpVal(L[k], L[best]) > 0)) best = k; if (mode === 1 && c > 0 && (best < 0 || cmpVal(L[k], L[best]) < 0)) best = k; } i = best; }
  if (i < 0){ if (a[3] !== undefined && a[3] !== MISSING) return scalar(a[3]); throw ER.na; }
  const vertical = isRng(a[1]) ? a[1].w === 1 : to2D(a[1])[0].length === 1;
  return vertical ? (R[0].length === 1 ? R[i][0] : [R[i]]) : (R.length === 1 ? R[0][i] : R.map(r => [r[i]])); }, {min:3});
def('MATCH', 'EQUIV', LK, 'valeur; plage; [type]', 'Position d\'une valeur dans une plage', a => { const key = scalar(a[0]); const L = flat1(a[1]); const t = optN(a[2], 1); const i = findIn(L, key, t === 0 ? 2 : t > 0 ? 1 : -1); if (i < 0) throw ER.na; return i + 1; }, {min:2});
def('XMATCH', 'EQUIVX', LK, 'valeur; plage; [mode]', 'Position (exacte par défaut)', a => { const i = findIn(flat1(a[1]), scalar(a[0]), 2); if (i < 0) throw ER.na; return i + 1; }, {min:2});
def('INDEX', 'INDEX', LK, 'plage; ligne; [colonne]', 'Valeur à une position dans une plage', a => { const r = optN(a[1], 0), c = optN(a[2], 0);
  if (isRng(a[0])){ const g = a[0]; if (r < 0 || c < 0 || r > g.h || c > g.w) throw ER.ref;
    if (g.h === 1 && a[2] === undefined) return g.v(0, r - 1);
    if (r === 0) return new Rng(g.sh, g.r1, g.c1 + c - 1, g.r2, g.c1 + c - 1); if (c === 0 && g.w > 1) return new Rng(g.sh, g.r1 + r - 1, g.c1, g.r1 + r - 1, g.c2);
    return g.v(r - 1, Math.max(0, c - 1)); }
  const T = to2D(a[0]); if (T.length === 1 && a[2] === undefined) return T[0][r - 1] ?? ER.ref; return T[r - 1]?.[Math.max(0, c - 1)] ?? ER.ref; }, {min:2});
def('LOOKUP', 'RECHERCHE', LK, 'valeur; plage_cherchée; [plage_résultat]', 'Recherche approchée', a => { const L = flat1(a[1]); const i = findIn(L, scalar(a[0]), 1); if (i < 0) throw ER.na; const R = a[2] ? flat1(a[2]) : L; return R[i]; }, {min:2});
def('ROW', 'LIGNE', LK, '[référence]', 'Numéro de ligne', (args, ctx) => { if (!args.length || args[0].t === 'missing') return ctx.r + 1; const n = args[0]; return n.t === 'ref' ? n.r + 1 : n.t === 'range' ? n.r1 + 1 : ER.value; }, {lazy:true});
def('COLUMN', 'COLONNE', LK, '[référence]', 'Numéro de colonne', (args, ctx) => { if (!args.length || args[0].t === 'missing') return ctx.c + 1; const n = args[0]; return n.t === 'ref' ? n.c + 1 : n.t === 'range' ? n.c1 + 1 : ER.value; }, {lazy:true});
def('ROWS', 'LIGNES', LK, 'plage', 'Nombre de lignes', a => isRng(a[0]) ? a[0].h : to2D(a[0]).length, {min:1});
def('COLUMNS', 'COLONNES', LK, 'plage', 'Nombre de colonnes', a => isRng(a[0]) ? a[0].w : to2D(a[0])[0].length, {min:1});
def('OFFSET', 'DECALER', LK, 'réf; lignes; colonnes; [hauteur]; [largeur]', 'Plage décalée à partir d\'une référence', (args, ctx) => { const base = ev(args[0], ctx); let sh = ctx.sh, r, c, h = 1, w = 1;
  if (isRng(base)){ sh = base.sh; r = base.r1; c = base.c1; h = base.h; w = base.w; } else if (args[0].t === 'ref'){ r = args[0].r; c = args[0].c; if (args[0].sheet) sh = ctx.wb.byName(args[0].sheet); } else return ER.value;
  const dr = toNum(scalar(ev(args[1], ctx))), dc = toNum(scalar(ev(args[2], ctx))); if (args[3] && args[3].t !== 'missing') h = toNum(scalar(ev(args[3], ctx))); if (args[4] && args[4].t !== 'missing') w = toNum(scalar(ev(args[4], ctx)));
  if (r + dr < 0 || c + dc < 0 || h < 1 || w < 1) return ER.ref; const g = new Rng(sh, r + dr, c + dc, r + dr + h - 1, c + dc + w - 1); return h === 1 && w === 1 ? g.v(0, 0) : g; }, {lazy:true, volatile:true});
def('INDIRECT', 'INDIRECT', LK, 'texte_réf', 'Référence décrite par un texte', (a, ctx) => { const s = S(a[0]); const m = /^(?:'?([^'!]+)'?!)?(.+)$/.exec(s); const sh = m[1] ? ctx.wb.byName(m[1]) : ctx.sh; const g = parseRange(m[2]); if (!sh || !g) throw ER.ref; return g.r1 === g.r2 && g.c1 === g.c2 ? ctx.wb.val(sh, g.r1, g.c1) : new Rng(sh, g.r1, g.c1, g.r2, g.c2); }, {min:1, volatile:true});
def('ADDRESS', 'ADRESSE', LK, 'ligne; colonne; [abs]', 'Adresse d\'une cellule en texte', a => { const r = N(a[0]), c = N(a[1]), t = optN(a[2], 1); return (t === 1 || t === 3 ? '$' : '') + colName(c - 1) + (t === 1 || t === 2 ? '$' : '') + r; }, {min:2});
def('HYPERLINK', 'LIEN_HYPERTEXTE', LK, 'url; [nom]', 'Lien cliquable', a => a[1] !== undefined ? S(a[1]) : S(a[0]), {min:1});

// Tableaux dynamiques
def('SEQUENCE', 'SEQUENCE', AR, 'lignes; [colonnes]; [début]; [pas]', 'Suite de nombres', a => { const r = N(a[0]), c = optN(a[1], 1), s = optN(a[2], 1), st = optN(a[3], 1); if (r < 1 || c < 1 || r * c > 100000) throw ER.value; return Array.from({length:r}, (_, i) => Array.from({length:c}, (_, j) => s + (i * c + j) * st)); }, {min:1});
def('UNIQUE', 'UNIQUE', AR, 'plage', 'Valeurs sans doublons', a => { const T = to2D(a[0]); const seen = new Set(), out = []; for (const row of T){ const k = row.map(v => typeof v === 'string' ? v.toLowerCase() : String(v)).join('\u0001'); if (row.every(v => v == null)) continue; if (!seen.has(k)){ seen.add(k); out.push(row); } } return out.length ? out : ER.calc; }, {min:1});
def('SORT', 'TRIER', AR, 'plage; [colonne]; [ordre]', 'Trie une plage', a => { const T = to2D(a[0]).filter(r => r.some(v => v != null)); const k = optN(a[1], 1) - 1, o = optN(a[2], 1); return [...T].sort((x, y) => cmpVal(x[k], y[k]) * (o < 0 ? -1 : 1)); }, {min:1});
def('SORTBY', 'TRIERPAR', AR, 'plage; par; [ordre]', 'Trie une plage selon une autre', a => { const T = to2D(a[0]), K = flat1(a[1]), o = optN(a[2], 1); return T.map((r, i) => [r, K[i]]).sort((x, y) => cmpVal(x[1], y[1]) * (o < 0 ? -1 : 1)).map(x => x[0]); }, {min:2});
def('FILTER', 'FILTRE', AR, 'plage; condition; [si_vide]', 'Garde les lignes qui remplissent une condition', a => { const T = to2D(a[0]), C = flat1(a[1]); const out = T.filter((_, i) => { const v = C[i]; return !isErr(v) && v != null && toBool(v); }); if (!out.length){ if (a[2] !== undefined) return scalar(a[2]); throw ER.calc; } return out; }, {min:2});
def('TRANSPOSE', 'TRANSPOSE', AR, 'plage', 'Échange lignes et colonnes', a => { const T = to2D(a[0]); return T[0].map((_, j) => T.map(r => r[j])); }, {min:1});
def('TAKE', 'PRENDRE', AR, 'plage; lignes; [colonnes]', 'Premières lignes d\'une plage', a => { const T = to2D(a[0]), r = N(a[1]), c = optN(a[2], 0); let o = r >= 0 ? T.slice(0, r) : T.slice(r); if (c) o = o.map(x => c > 0 ? x.slice(0, c) : x.slice(c)); return o; }, {min:2});
def('VSTACK', 'ASSEMB.V', AR, 'plage1; plage2…', 'Empile des plages verticalement', a => { const L = a.map(to2D), w = Math.max(...L.map(x => x[0].length)); return L.flatMap(x => x.map(r => [...r, ...Array(w - r.length).fill(ER.na)])); });
def('HSTACK', 'ASSEMB.H', AR, 'plage1; plage2…', 'Juxtapose des plages', a => { const L = a.map(to2D), h = Math.max(...L.map(x => x.length)); return Array.from({length:h}, (_, i) => L.flatMap(x => x[i] || Array(x[0].length).fill(ER.na))); });

// Texte
def('CONCAT', 'CONCAT', TX, 'texte1; [texte2]…', 'Assemble des textes', a => vals(a).map(toStr).join(''));
def('CONCATENATE', 'CONCATENER', TX, 'texte1; [texte2]…', 'Assemble des textes', a => a.map(x => S(x)).join(''));
def('TEXTJOIN', 'JOINDRE.TEXTE', TX, 'séparateur; ignorer_vides; texte1; …', 'Assemble avec un séparateur', a => { const sep = S(a[0]), ig = B(a[1]); return vals(a.slice(2)).filter(v => !ig || (v != null && v !== '')).map(toStr).join(sep); }, {min:3});
def('LEFT', 'GAUCHE', TX, 'texte; [nb]', 'Premiers caractères', a => S(a[0]).slice(0, optN(a[1], 1)), {min:1});
def('RIGHT', 'DROITE', TX, 'texte; [nb]', 'Derniers caractères', a => { const s = S(a[0]), n = optN(a[1], 1); return n ? s.slice(-n) : ''; }, {min:1});
def('MID', 'STXT', TX, 'texte; début; nb', 'Caractères au milieu d\'un texte', a => S(a[0]).substr(N(a[1]) - 1, N(a[2])), {min:3});
def('LEN', 'NBCAR', TX, 'texte', 'Nombre de caractères', a => mapArr(a[0], v => toStr(v).length), {min:1});
def('UPPER', 'MAJUSCULE', TX, 'texte', 'En majuscules', a => mapArr(a[0], v => toStr(v).toLocaleUpperCase('fr-FR')), {min:1});
def('LOWER', 'MINUSCULE', TX, 'texte', 'En minuscules', a => mapArr(a[0], v => toStr(v).toLocaleLowerCase('fr-FR')), {min:1});
def('PROPER', 'NOMPROPRE', TX, 'texte', 'Majuscule à chaque mot', a => mapArr(a[0], v => toStr(v).toLocaleLowerCase('fr-FR').replace(/(^|[^\p{L}'])(\p{L})/gu, (_, x, y) => x + y.toLocaleUpperCase('fr-FR'))), {min:1});
def('TRIM', 'SUPPRESPACE', TX, 'texte', 'Supprime les espaces en trop', a => mapArr(a[0], v => toStr(v).replace(/\s+/g, ' ').trim()), {min:1});
def('CLEAN', 'EPURAGE', TX, 'texte', 'Supprime les caractères non imprimables', a => S(a[0]).replace(/[\x00-\x1f]/g, ''), {min:1});
def('SUBSTITUTE', 'SUBSTITUE', TX, 'texte; ancien; nouveau; [occurrence]', 'Remplace un texte par un autre', a => { const s = S(a[0]), o = S(a[1]), n = S(a[2]); if (!o) return s; if (a[3] === undefined) return s.split(o).join(n); let k = N(a[3]), i = -1; while (k-- > 0){ i = s.indexOf(o, i + 1); if (i < 0) return s; } return s.slice(0, i) + n + s.slice(i + o.length); }, {min:3});
def('REPLACE', 'REMPLACER', TX, 'texte; début; nb; nouveau', 'Remplace des caractères à une position', a => { const s = S(a[0]), st = N(a[1]) - 1, n = N(a[2]); return s.slice(0, st) + S(a[3]) + s.slice(st + n); }, {min:4});
def('FIND', 'TROUVE', TX, 'cherché; texte; [début]', 'Position d\'un texte (sensible à la casse)', a => { const i = S(a[1]).indexOf(S(a[0]), optN(a[2], 1) - 1); if (i < 0) throw ER.value; return i + 1; }, {min:2});
def('SEARCH', 'CHERCHE', TX, 'cherché; texte; [début]', 'Position d\'un texte (sans casse, jokers)', a => { const q = S(a[0]), s = S(a[1]); const rx = new RegExp(q.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.'), 'i'); const st = optN(a[2], 1) - 1; const m = rx.exec(s.slice(st)); if (!m) throw ER.value; return m.index + st + 1; }, {min:2});
def('TEXT', 'TEXTE', TX, 'valeur; format', 'Met en forme une valeur en texte', a => textFmt(scalar(a[0]), S(a[1])), {min:2});
def('VALUE', 'CNUM', TX, 'texte', 'Convertit un texte en nombre', a => toNum(scalar(a[0])), {min:1});
def('NUMBERVALUE', 'VALEURNOMBRE', TX, 'texte', 'Convertit un texte en nombre', a => toNum(scalar(a[0])), {min:1});
def('REPT', 'REPT', TX, 'texte; nb', 'Répète un texte', a => S(a[0]).repeat(Math.max(0, Math.min(10000, N(a[1])))), {min:2});
def('EXACT', 'EXACT', TX, 'texte1; texte2', 'Compare exactement deux textes', a => S(a[0]) === S(a[1]), {min:2});
def('CHAR', 'CAR', TX, 'code', 'Caractère d\'un code', a => String.fromCharCode(N(a[0])), {min:1});
def('UNICHAR', 'UNICAR', TX, 'code', 'Caractère Unicode', a => String.fromCodePoint(N(a[0])), {min:1});
def('CODE', 'CODE', TX, 'texte', 'Code du premier caractère', a => S(a[0]).charCodeAt(0) || 0, {min:1});
def('T', 'T', TX, 'valeur', 'Le texte, ou vide', a => { const v = scalar(a[0]); return typeof v === 'string' ? v : ''; }, {min:1});
def('N', 'N', TX, 'valeur', 'Le nombre, ou 0', a => { const v = scalar(a[0]); return typeof v === 'number' ? v : typeof v === 'boolean' ? +v : 0; }, {min:1});
def('TEXTBEFORE', 'TEXTE.AVANT', TX, 'texte; délimiteur', 'Texte avant un délimiteur', a => { const s = S(a[0]), d = S(a[1]), i = s.indexOf(d); if (i < 0) throw ER.na; return s.slice(0, i); }, {min:2});
def('TEXTAFTER', 'TEXTE.APRES', TX, 'texte; délimiteur', 'Texte après un délimiteur', a => { const s = S(a[0]), d = S(a[1]), i = s.indexOf(d); if (i < 0) throw ER.na; return s.slice(i + d.length); }, {min:2});
def('TEXTSPLIT', 'FRACTIONNER.TEXTE', TX, 'texte; séparateur_colonnes; [séparateur_lignes]', 'Découpe un texte en cellules', a => { const s = S(a[0]), dc = S(a[1]), dr = a[2] !== undefined && a[2] !== MISSING ? S(a[2]) : null; const rows = dr ? s.split(dr) : [s]; const out = rows.map(r => r.split(dc)); const w = Math.max(...out.map(r => r.length)); return out.map(r => [...r, ...Array(w - r.length).fill(ER.na)]); }, {min:2});
def('FIXED', 'CTXT', TX, 'nombre; [décimales]', 'Nombre en texte avec décimales', a => fmtNum(N(a[0]), optN(a[1], 2), true), {min:1});
def('DOLLAR', 'EURO', TX, 'nombre; [décimales]', 'Montant en texte (€)', a => fmtNum(N(a[0]), optN(a[1], 2), true) + '\u00a0€', {min:1});

// Dates
def('TODAY', 'AUJOURDHUI', DT, '', 'Date du jour', () => todaySerial(), {volatile:true, nf:'dd/mm/yyyy'});
def('NOW', 'MAINTENANT', DT, '', 'Date et heure actuelles', () => nowSerial(), {volatile:true, nf:'dd/mm/yyyy hh:mm'});
def('DATE', 'DATE', DT, 'année; mois; jour', 'Construit une date', a => { let y = N(a[0]); if (y < 1900) y += 1900; const m = N(a[1]), d = N(a[2]); return (Date.UTC(y, m - 1, d) - DAY0) / MS_DAY; }, {min:3, nf:'dd/mm/yyyy'});
def('TIME', 'TEMPS', DT, 'heure; minute; seconde', 'Construit une heure', a => ((N(a[0]) * 3600 + N(a[1]) * 60 + N(a[2])) / 86400) % 1, {min:3, nf:'hh:mm'});
def('YEAR', 'ANNEE', DT, 'date', 'Année d\'une date', a => fromSerial(dateArg(a[0])).y, {min:1});
def('MONTH', 'MOIS', DT, 'date', 'Mois d\'une date (1 à 12)', a => fromSerial(dateArg(a[0])).m, {min:1});
def('DAY', 'JOUR', DT, 'date', 'Jour du mois', a => fromSerial(dateArg(a[0])).d, {min:1});
def('HOUR', 'HEURE', DT, 'heure', 'Heure (0 à 23)', a => fromSerial(dateArg(a[0])).hh, {min:1});
def('MINUTE', 'MINUTE', DT, 'heure', 'Minutes', a => fromSerial(dateArg(a[0])).mi, {min:1});
def('SECOND', 'SECONDE', DT, 'heure', 'Secondes', a => fromSerial(dateArg(a[0])).ss, {min:1});
def('WEEKDAY', 'JOURSEM', DT, 'date; [type]', 'Jour de la semaine (1 = dimanche ; type 2 : 1 = lundi)', a => { const w = fromSerial(dateArg(a[0])).wd, t = optN(a[1], 1); return t === 2 ? (w + 6) % 7 + 1 : t === 3 ? (w + 6) % 7 : w + 1; }, {min:1});
def('WEEKNUM', 'NO.SEMAINE', DT, 'date; [type]', 'Numéro de semaine', a => { const s = dateArg(a[0]), t = fromSerial(s), jan1 = toSerial(t.y, 1, 1), w1 = fromSerial(jan1).wd, type = optN(a[1], 1); const off = type === 2 ? (w1 + 6) % 7 : w1; return Math.floor((s - jan1 + off) / 7) + 1; }, {min:1});
def('ISOWEEKNUM', 'NO.SEMAINE.ISO', DT, 'date', 'Numéro de semaine ISO (France)', a => { const s = Math.floor(dateArg(a[0])); const wd = (fromSerial(s).wd + 6) % 7; const th = s - wd + 3; const y = fromSerial(th).y; return Math.floor((th - toSerial(y, 1, 1)) / 7) + 1; }, {min:1});
def('EDATE', 'MOIS.DECALER', DT, 'date; mois', 'Date décalée de n mois', a => addMonths(dateArg(a[0]), N(a[1])), {min:2, nf:'dd/mm/yyyy'});
def('EOMONTH', 'FIN.MOIS', DT, 'date; mois', 'Dernier jour du mois, n mois plus tard', a => { const t = fromSerial(addMonths(dateArg(a[0]), N(a[1]))); return toSerial(t.y, t.m + 1, 0); }, {min:2, nf:'dd/mm/yyyy'});
def('DAYS', 'JOURS', DT, 'date_fin; date_début', 'Nombre de jours entre deux dates', a => Math.floor(dateArg(a[0])) - Math.floor(dateArg(a[1])), {min:2});
def('DATEDIF', 'DATEDIF', DT, 'début; fin; unité ("A", "M", "J")', 'Écart entre deux dates en années, mois ou jours', a => { const s = fromSerial(dateArg(a[0])), e = fromSerial(dateArg(a[1])), u = S(a[2]).toUpperCase(); if (dateArg(a[0]) > dateArg(a[1])) throw ER.num;
  let m = (e.y - s.y) * 12 + e.m - s.m; if (e.d < s.d) m--; if (u === 'Y' || u === 'A') return Math.floor(m / 12); if (u === 'M') return m; if (u === 'D' || u === 'J') return Math.floor(dateArg(a[1])) - Math.floor(dateArg(a[0])); if (u === 'YM' || u === 'AM') return m % 12; if (u === 'MD' || u === 'MJ'){ let d = e.d - s.d; if (d < 0) d += new Date(Date.UTC(e.y, e.m - 1, 0)).getUTCDate(); return d; } throw ER.num; }, {min:3});
def('NETWORKDAYS', 'NB.JOURS.OUVRES', DT, 'début; fin; [fériés]', 'Jours ouvrés entre deux dates', a => { let s = Math.floor(dateArg(a[0])), e = Math.floor(dateArg(a[1])), sg = 1; if (s > e){ [s, e] = [e, s]; sg = -1; } const H = holidaysSet(a[2]); let n = 0; for (let d = s; d <= e; d++) if (!isWeekend(d) && !H.has(d)) n++; return n * sg; }, {min:2});
def('WORKDAY', 'SERIE.JOUR.OUVRE', DT, 'début; jours; [fériés]', 'Date après n jours ouvrés', a => { let d = Math.floor(dateArg(a[0])), n = N(a[1]); const H = holidaysSet(a[2]), st = n < 0 ? -1 : 1; while (n !== 0){ d += st; if (!isWeekend(d) && !H.has(d)) n -= st; } return d; }, {min:2, nf:'dd/mm/yyyy'});
def('DATEVALUE', 'DATEVAL', DT, 'texte', 'Texte → date', a => { const d = parseDateFr(S(a[0])); if (!d) throw ER.value; return Math.floor(d.v); }, {min:1, nf:'dd/mm/yyyy'});
def('YEARFRAC', 'FRACTION.ANNEE', DT, 'début; fin', 'Fraction d\'année entre deux dates', a => Math.abs(dateArg(a[1]) - dateArg(a[0])) / 365.25, {min:2});
def('DAYS360', 'JOURS360', DT, 'début; fin', 'Jours sur la base 360', a => { const s = fromSerial(dateArg(a[0])), e = fromSerial(dateArg(a[1])); const d1 = Math.min(s.d, 30), d2 = e.d === 31 && d1 === 30 ? 30 : e.d; return (e.y - s.y) * 360 + (e.m - s.m) * 30 + d2 - d1; }, {min:2});

// Finances
def('PMT', 'VPM', FI, 'taux; nb_périodes; va; [vc]; [type]', 'Mensualité d\'un emprunt', a => pmt(N(a[0]), N(a[1]), N(a[2]), optN(a[3], 0), optN(a[4], 0)), {min:3, nf:'#,##0.00 €'});
def('IPMT', 'INTPER', FI, 'taux; période; nb_périodes; va', 'Part d\'intérêts d\'une échéance', a => ipmt(N(a[0]), N(a[1]), N(a[2]), N(a[3]), optN(a[4], 0), optN(a[5], 0)), {min:4, nf:'#,##0.00 €'});
def('PPMT', 'PRINCPER', FI, 'taux; période; nb_périodes; va', 'Part de capital d\'une échéance', a => pmt(N(a[0]), N(a[2]), N(a[3]), optN(a[4], 0), optN(a[5], 0)) - ipmt(N(a[0]), N(a[1]), N(a[2]), N(a[3]), optN(a[4], 0), optN(a[5], 0)), {min:4, nf:'#,##0.00 €'});
def('FV', 'VC', FI, 'taux; nb_périodes; vpm; [va]; [type]', 'Valeur future d\'un placement', a => fvf(N(a[0]), N(a[1]), N(a[2]), optN(a[3], 0), optN(a[4], 0)), {min:3, nf:'#,##0.00 €'});
def('PV', 'VA', FI, 'taux; nb_périodes; vpm; [vc]; [type]', 'Valeur actuelle', a => pvf(N(a[0]), N(a[1]), N(a[2]), optN(a[3], 0), optN(a[4], 0)), {min:3, nf:'#,##0.00 €'});
def('NPER', 'NPM', FI, 'taux; vpm; va; [vc]', 'Nombre de périodes', a => { const r = N(a[0]), p = N(a[1]), v = N(a[2]), f = optN(a[3], 0); if (!r) return -(v + f) / p; return Math.log((p - f * r) / (p + v * r)) / Math.log(1 + r); }, {min:3});
def('RATE', 'TAUX', FI, 'nb_périodes; vpm; va; [vc]', 'Taux d\'intérêt par période', a => { const n = N(a[0]), p = N(a[1]), v = N(a[2]), f = optN(a[3], 0); let r = .01; for (let i = 0; i < 100; i++){ const y = fvf(r, n, p, v) - f; const y2 = fvf(r + 1e-6, n, p, v) - f; const d = (y2 - y) / 1e-6; if (!d) break; const nr = r - y / d; if (Math.abs(nr - r) < 1e-10){ r = nr; break; } r = nr; } if (!isFinite(r)) throw ER.num; return r; }, {min:3, nf:'0.00%'});
def('NPV', 'VAN', FI, 'taux; flux1; …', 'Valeur actuelle nette', a => { const r = N(a[0]); return nums(a.slice(1)).reduce((s, x, i) => s + x / Math.pow(1 + r, i + 1), 0); }, {min:2, nf:'#,##0.00 €'});
def('IRR', 'TRI', FI, 'flux; [estimation]', 'Taux de rendement interne', a => { const f = nums([a[0]]); let r = optN(a[1], .1); for (let i = 0; i < 200; i++){ let y = 0, d = 0; f.forEach((x, k) => { y += x / Math.pow(1 + r, k); d -= k * x / Math.pow(1 + r, k + 1); }); if (!d) break; const nr = r - y / d; if (Math.abs(nr - r) < 1e-10){ r = nr; break; } r = nr; } if (!isFinite(r)) throw ER.num; return r; }, {min:1, nf:'0.00%'});
def('EFFECT', 'TAUX.EFFECTIF', FI, 'taux_nominal; nb_périodes', 'Taux effectif annuel', a => Math.pow(1 + N(a[0]) / N(a[1]), N(a[1])) - 1, {min:2, nf:'0.00%'});
def('SLN', 'AMORLIN', FI, 'coût; valeur_résiduelle; durée', 'Amortissement linéaire', a => (N(a[0]) - N(a[1])) / N(a[2]), {min:3, nf:'#,##0.00 €'});

// Informations
def('ISBLANK', 'ESTVIDE', IN, 'valeur', 'VRAI si la cellule est vide', a => { const v = scalar(a[0]); return v == null; }, {min:1, err:true});
def('ISNUMBER', 'ESTNUM', IN, 'valeur', 'VRAI si c\'est un nombre', a => mapArr(a[0], v => typeof v === 'number'), {min:1, err:true});
def('ISTEXT', 'ESTTEXTE', IN, 'valeur', 'VRAI si c\'est du texte', a => typeof scalar(a[0]) === 'string', {min:1, err:true});
def('ISNONTEXT', 'ESTNONTEXTE', IN, 'valeur', 'VRAI si ce n\'est pas du texte', a => typeof scalar(a[0]) !== 'string', {min:1, err:true});
def('ISLOGICAL', 'ESTLOGIQUE', IN, 'valeur', 'VRAI si c\'est VRAI ou FAUX', a => typeof scalar(a[0]) === 'boolean', {min:1, err:true});
def('ISERROR', 'ESTERREUR', IN, 'valeur', 'VRAI si c\'est une erreur', a => isErr(scalar(a[0])), {min:1, err:true});
def('ISERR', 'ESTERR', IN, 'valeur', 'VRAI si erreur autre que #N/A', a => { const v = scalar(a[0]); return isErr(v) && v.code !== '#N/A'; }, {min:1, err:true});
def('ISNA', 'ESTNA', IN, 'valeur', 'VRAI si #N/A', a => { const v = scalar(a[0]); return isErr(v) && v.code === '#N/A'; }, {min:1, err:true});
def('ISEVEN', 'EST.PAIR', IN, 'nombre', 'VRAI si pair', a => Math.floor(Math.abs(N(a[0]))) % 2 === 0, {min:1});
def('ISODD', 'EST.IMPAIR', IN, 'nombre', 'VRAI si impair', a => Math.floor(Math.abs(N(a[0]))) % 2 === 1, {min:1});
def('ISFORMULA', 'ESTFORMULE', IN, 'référence', 'VRAI si la cellule contient une formule', (args, ctx) => { const n = args[0]; if (n?.t !== 'ref') return ER.value; const sh = n.sheet ? ctx.wb.byName(n.sheet) : ctx.sh; return !!sh?.get(n.r, n.c)?.f; }, {lazy:true});
def('NA', 'NA', IN, '', 'La valeur #N/A', () => ER.na);
def('TYPE', 'TYPE', IN, 'valeur', 'Type de valeur (1 nombre, 2 texte, 4 logique, 16 erreur)', a => { const v = scalar(a[0]); return typeof v === 'number' || v == null ? 1 : typeof v === 'string' ? 2 : typeof v === 'boolean' ? 4 : isErr(v) ? 16 : 64; }, {min:1, err:true});
def('ERROR.TYPE', 'TYPE.ERREUR', IN, 'erreur', 'Numéro du type d\'erreur', a => { const v = scalar(a[0]); if (!isErr(v)) throw ER.na; return ({'#NULL!':1, '#DIV/0!':2, '#VALUE!':3, '#REF!':4, '#NAME?':5, '#NUM!':6, '#N/A':7})[v.code] || 8; }, {min:1, err:true});
def('SHEET', 'FEUILLE', IN, '', 'Numéro de la feuille', (a, ctx) => ctx.wb.sheets.indexOf(ctx.sh) + 1);

