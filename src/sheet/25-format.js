/* ---------- Nombres, dates et formats (à la française : 1 234,56 · 16/10/2026) ---------- */
const DAY0 = Date.UTC(1899, 11, 30);           // origine des dates d'Excel (série 1 = 01/01/1900)
const MS_DAY = 86400000;
const toSerial = (y, m, d, hh = 0, mi = 0, ss = 0) => (Date.UTC(y, m - 1, d, hh, mi, ss) - DAY0) / MS_DAY;
const fromSerial = s => { const t = new Date(Math.round(DAY0 + s * MS_DAY)); return {y:t.getUTCFullYear(), m:t.getUTCMonth() + 1, d:t.getUTCDate(), hh:t.getUTCHours(), mi:t.getUTCMinutes(), ss:t.getUTCSeconds(), wd:t.getUTCDay()}; };
const todaySerial = () => { const n = new Date(); return toSerial(n.getFullYear(), n.getMonth() + 1, n.getDate()); };
const nowSerial = () => { const n = new Date(); return toSerial(n.getFullYear(), n.getMonth() + 1, n.getDate(), n.getHours(), n.getMinutes(), n.getSeconds()); };
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_S = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const nrmTxt = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const MONTH_RX = MONTHS.map(m => nrmTxt(m));

/* Erreurs de formule (affichées en français, comme dans Excel en français) */
class CErr { constructor(code){ this.code = code; } toString(){ return ERR_FR[this.code] || this.code; } }
const ERR_FR = {'#DIV/0!':'#DIV/0!', '#VALUE!':'#VALEUR!', '#REF!':'#REF!', '#NAME?':'#NOM?', '#N/A':'#N/A', '#NUM!':'#NOMBRE!', '#NULL!':'#NUL!', '#CIRC!':'#CIRC!', '#SPILL!':'#PROPAGATION!', '#CALC!':'#CALC!'};
const ER = {div0:new CErr('#DIV/0!'), value:new CErr('#VALUE!'), ref:new CErr('#REF!'), name:new CErr('#NAME?'), na:new CErr('#N/A'), num:new CErr('#NUM!'), circ:new CErr('#CIRC!'), spill:new CErr('#SPILL!'), calc:new CErr('#CALC!')};
const isErr = v => v instanceof CErr;

/* Saisie d'une cellule → valeur typée et format suggéré */
const NUM_RE = /^[+-]?(?:\d{1,3}(?:[   ]\d{3})+|\d+)?(?:[,.]\d+)?$/;
function parseNumberFr(s){
  s = String(s).trim().replace(/[  ]/g, ' ');
  if (!s || !/\d/.test(s)) return null;
  let t = s;
  if (/^[+-]?\d{1,3}(\.\d{3}){2,}(,\d+)?$/.test(t) || /^[+-]?\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, '');   // 1.234.567,89
  if (/,/.test(t) && /\./.test(t)){ t = t.indexOf(',') > t.indexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, ''); }
  else if (/^[+-]?\d{1,3}(,\d{3}){2,}$/.test(t)) t = t.replace(/,/g, '');
  else t = t.replace(',', '.');
  t = t.replace(/ /g, '');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return null;
  const n = parseFloat(t); return isFinite(n) ? n : null;
}
function parseDateFr(s){
  s = String(s).trim(); let m;
  if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?(?:\s+(\d{1,2})[:h](\d{2})(?::(\d{2}))?)?$/))){
    let d = +m[1], mo = +m[2], y = m[3] ? +m[3] : new Date().getFullYear(); if (y < 100) y += y < 70 ? 2000 : 1900;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return {v:toSerial(y, mo, d, +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)), nf:m[4] ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy'};
  }
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/))) return {v:toSerial(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)), nf:m[4] ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy'};
  const n = nrmTxt(s).replace(/\./g, '');
  if ((m = n.match(/^(?:(?:lun|mar|mer|jeu|ven|sam|dim)\w*\s+)?(\d{1,2})(?:er)?\s+([a-z]+)\.?(?:\s+(\d{4}))?$/))){
    const mi = MONTH_RX.findIndex(x => x.startsWith(m[2].slice(0, 3)) && (m[2].length >= 3)); if (mi < 0) return null;
    return {v:toSerial(m[3] ? +m[3] : new Date().getFullYear(), mi + 1, +m[1]), nf:'d mmmm yyyy'};
  }
  if ((m = n.match(/^([a-z]+)\.?\s+(\d{4})$/))){ const mi = MONTH_RX.findIndex(x => x.startsWith(m[1].slice(0, 3)) && m[1].length >= 3); if (mi >= 0) return {v:toSerial(+m[2], mi + 1, 1), nf:'mmmm yyyy'}; }
  return null;
}
function parseInput(raw){
  const s = String(raw ?? '');
  if (s === '') return {v:null};
  if (s[0] === "'") return {v:s.slice(1), text:true};
  const t = s.trim();
  if (/^(vrai|true)$/i.test(t)) return {v:true};
  if (/^(faux|false)$/i.test(t)) return {v:false};
  let m;
  if ((m = t.match(/^(-?[\d\s  .,]+)\s*%$/))){ const n = parseNumberFr(m[1]); if (n != null) return {v:n / 100, nf:/[.,]\d/.test(m[1]) ? '0.00%' : '0%'}; }
  if ((m = t.match(/^(-?)\s*€\s*([\d\s  .,]+)$/) || t.match(/^(-?)([\d\s  .,]+)\s*(?:€|eur|euros?)$/i))){ const n = parseNumberFr(m[2]); if (n != null) return {v:m[1] ? -n : n, nf:'#,##0.00 €'}; }
  if ((m = t.match(/^(-?)\$\s*([\d\s.,]+)$/))){ const n = parseNumberFr(m[2]); if (n != null) return {v:m[1] ? -n : n, nf:'$#,##0.00'}; }
  if ((m = t.match(/^(\d{1,2})[:h](\d{2})(?::(\d{2}))?$/))){ const hh = +m[1], mi = +m[2]; if (hh < 48 && mi < 60) return {v:(hh * 3600 + mi * 60 + +(m[3] || 0)) / 86400, nf:m[3] ? 'hh:mm:ss' : 'hh:mm'}; }
  if (NUM_RE.test(t.replace(/\s/g, ' ')) || /^[+-]?\d+(\.\d+)?e[+-]?\d+$/i.test(t)){ const n = parseNumberFr(t); if (n != null) return {v:n, nf:/\d[   ]\d{3}/.test(t) ? '#,##0' + (/[.,]\d+$/.test(t) ? '.' + '0'.repeat(t.split(/[.,]/).pop().length) : '') : ''}; }
  const d = parseDateFr(t); if (d) return d;
  return {v:s};
}

/* Format → texte affiché. Codes à la Excel ('0.00', '#,##0 €', '0%', 'dd/mm/yyyy', 'hh:mm', '@'…) */
const FMT_CACHE = new Map();
function compileFmt(nf){
  if (FMT_CACHE.has(nf)) return FMT_CACHE.get(nf);
  let f;
  const sec = String(nf).split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  const main = sec[0], plain = main.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '');
  if (nf === '@') f = {kind:'text'};
  else if (/[dmyhs]/i.test(plain) && !/[0#]/.test(plain)) f = {kind:'date', code:main.replace(/\[[^\]]*\]/g, '')};
  else {
    const m = plain.match(/[#0][#0,\s ]*(?:\.([0#]+))?/);
    const lit = main.replace(/\[[^\]]*\]/g, '');
    const i0 = m ? lit.indexOf(m[0].trim()[0]) : -1;
    const sci = /E\+/i.test(plain);
    f = {kind:'num', dec:m && m[1] ? m[1].length : 0, opt:m && m[1] ? (m[1].match(/#/g) || []).length : 0, group:m ? /[#0][,\s ][#0]/.test(m[0]) : false, pct:/%/.test(plain), sci,
      pre:m ? lit.slice(0, Math.max(0, i0)).replace(/"/g, '').replace(/\\/g, '') : '', post:m ? lit.slice(i0 + m[0].trim().length).replace(/"/g, '').replace(/\\/g, '').replace(/^0+/, '').replace(/E\+0+/i, '') : '',
      neg:sec[1] != null ? sec[1] : null, red:/\[(red|rouge)\]/i.test(sec[1] || ''), zero:sec[2] != null ? sec[2].replace(/"/g, '') : null};
    if (!m) f = {kind:'num', dec:0, opt:0, group:false, pct:false, pre:'', post:lit.replace(/"/g, ''), neg:null};
  }
  FMT_CACHE.set(nf, f); return f;
}
const NF_FR = new Map();
function fmtNum(n, dec, group, opt = 0){
  const k = dec + '|' + group + '|' + opt; let F = NF_FR.get(k);
  if (!F){ F = new Intl.NumberFormat('fr-FR', {minimumFractionDigits:dec - opt, maximumFractionDigits:dec, useGrouping:group}); NF_FR.set(k, F); }
  return F.format(n).replace(/ /g, ' ');
}
function fmtGeneral(v){
  if (Math.abs(v) >= 1e15 || (Math.abs(v) < 1e-9 && v !== 0)) return v.toExponential(5).replace('.', ',').replace(/0+e/, 'e').replace(/,e/, 'e').toUpperCase();
  const r = +v.toPrecision(15); const s = String(r);
  const dec = s.includes('.') ? Math.min(10, s.split('.')[1].length) : 0;
  return fmtNum(r, dec, false);
}
function fmtDate(v, code){
  const t = fromSerial(v), p2 = x => String(x).padStart(2, '0');
  const hasAmPm = /am\/pm/i.test(code);
  return code.replace(/"([^"]*)"|\\(.)|yyyy|yy|mmmmm|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|am\/pm/gi, (tok, q, esc, off, str) => {
    if (q != null) return q; if (esc != null) return esc;
    const lt = tok.toLowerCase();
    // « m » après h ou avant s = minutes
    const before = str.slice(0, off).replace(/"[^"]*"/g, ''), after = str.slice(off + tok.length);
    const isMin = (lt === 'm' || lt === 'mm') && (/h+[^dmy]*$/i.test(before) || /^[^dmy]*s/i.test(after));
    switch (lt){
      case 'yyyy': return t.y; case 'yy': return p2(t.y % 100);
      case 'mmmmm': return MONTHS[t.m - 1][0].toUpperCase();
      case 'mmmm': return MONTHS[t.m - 1]; case 'mmm': return MONTHS_S[t.m - 1];
      case 'mm': return isMin ? p2(t.mi) : p2(t.m); case 'm': return isMin ? t.mi : t.m;
      case 'dddd': return DAYS[t.wd]; case 'ddd': return DAYS[t.wd].slice(0, 3) + '.';
      case 'dd': return p2(t.d); case 'd': return t.d;
      case 'hh': return p2(hasAmPm ? (t.hh % 12 || 12) : (v >= 1 && /\[h\]/.test(code) ? Math.floor(v * 24) : t.hh)); case 'h': return hasAmPm ? (t.hh % 12 || 12) : t.hh;
      case 'ss': return p2(t.ss); case 's': return t.ss;
      case 'am/pm': return t.hh < 12 ? 'AM' : 'PM';
    }
    return tok;
  });
}
/* renvoie {t:texte, c:couleur éventuelle, a:alignement naturel} */
function formatValue(v, nf){
  if (v == null || v === '') return {t:'', a:'l'};
  if (isErr(v)) return {t:v.toString(), a:'c', err:true};
  if (typeof v === 'boolean') return {t:v ? 'VRAI' : 'FAUX', a:'c'};
  if (typeof v === 'string') return {t:v, a:'l'};
  if (typeof v !== 'number' || !isFinite(v)) return {t:'#NOMBRE!', a:'c', err:true};
  if (!nf) return {t:fmtGeneral(v), a:'r'};
  const f = compileFmt(nf);
  if (f.kind === 'text') return {t:fmtGeneral(v), a:'l'};
  if (f.kind === 'date'){ if (v < 0 || v > 2958465) return {t:'#'.repeat(8), a:'r'}; return {t:fmtDate(v, f.code), a:'r'}; }
  if (v === 0 && f.zero != null) return {t:f.zero.trim() || '', a:'r'};
  let x = f.pct ? v * 100 : v; const neg = x < 0; if (neg && f.neg != null) x = -x;
  let body = f.sci ? x.toExponential(f.dec).replace('.', ',').toUpperCase() : fmtNum(x, f.dec, f.group, f.opt);
  let t = f.pre + body + f.post + (f.pct && !/%/.test(f.post) ? '%' : '');
  if (f.pct) t = t.replace(/(\d)\s?%$/, '$1\u00a0%');
  if (neg && f.neg != null){ const ng = f.neg.replace(/\[[^\]]*\]/g, ''); t = /\(/.test(ng) ? `(${t})` : '-' + t; }
  return {t, a:'r', c:neg && f.red ? '#D92D20' : ''};
}
/* Valeur → texte brut pour l'édition (ce que l'utilisateur retape) */
function editText(v, nf){
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'VRAI' : 'FAUX';
  if (typeof v === 'number'){
    if (nf){ const f = compileFmt(nf); if (f.kind === 'date') return fmtDate(v, /h/.test(f.code) ? (/[dy]/.test(f.code) ? 'dd/mm/yyyy hh:mm' : 'hh:mm') : 'dd/mm/yyyy');
      if (f.pct) return fmtGeneral(+(v * 100).toPrecision(15)) .replace(/ /g, '') + '%'; }
    return fmtGeneral(v).replace(/ /g, '');
  }
  return String(v);
}
/* Formats proposés dans l'interface */
const NFORMATS = [
  ['', 'Automatique', '1234,5'], ['#,##0.00', 'Nombre', '1 234,50'], ['#,##0', 'Nombre entier', '1 235'], ['#,##0.00 €', 'Euros', '1 234,50 €'], ['#,##0 €', 'Euros sans centimes', '1 235 €'],
  ['0%', 'Pourcentage', '12 %'], ['0.0%', 'Pourcentage (1 déc.)', '12,5 %'], ['dd/mm/yyyy', 'Date', '16/10/2026'], ['d mmmm yyyy', 'Date longue', '16 octobre 2026'], ['dddd d mmmm', 'Jour et date', 'vendredi 16 octobre'],
  ['mmmm yyyy', 'Mois', 'octobre 2026'], ['hh:mm', 'Heure', '14:30'], ['[h]:mm', 'Durée', '37:30'], ['dd/mm/yyyy hh:mm', 'Date et heure', '16/10/2026 14:30'], ['0.00E+00', 'Scientifique', '1,23E+03'], ['$#,##0.00', 'Dollars', '$1 234,50'], ['@', 'Texte', 'abc'],
];
