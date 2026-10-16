/* ---------- Formules : références A1, analyse (« ; » à la française ou « , »), réécriture des références ---------- */
const MAXR = 1048576, MAXC = 16384;
function colName(c){ let s = ''; c++; while (c > 0){ const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = (c - m - 1) / 26; } return s; }
function colIdx(s){ let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }
const A1 = (r, c) => colName(c) + (r + 1);
function parseA1(s){ const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(String(s).trim()); if (!m) return null; const r = +m[2] - 1, c = colIdx(m[1]); return r >= 0 && r < MAXR && c >= 0 && c < MAXC ? {r, c} : null; }
function parseRange(s){
  s = String(s).trim().replace(/^'?([^'!]*)'?!/, '');
  const [a, b] = s.split(':'); const p = parseA1(a), q = b ? parseA1(b) : p; if (!p || !q) return null;
  return {r1:Math.min(p.r, q.r), c1:Math.min(p.c, q.c), r2:Math.max(p.r, q.r), c2:Math.max(p.c, q.c)};
}
const rangeA1 = g => g.r1 === g.r2 && g.c1 === g.c2 ? A1(g.r1, g.c1) : A1(g.r1, g.c1) + ':' + A1(g.r2, g.c2);
const quoteSheet = n => /^[A-Za-z_][\w.]*$/.test(n) && !parseA1(n) ? n : `'${n.replace(/'/g, "''")}'`;

/* --- découpage en jetons --- */
const RX_STR = /^"((?:[^"]|"")*)"/;
const RX_ERR = /^#(?:DIV\/0!|VALUE!|VALEUR!|REF!|NAME\?|NOM\?|N\/A|NUM!|NOMBRE!|NULL!|NUL!|CIRC!|SPILL!|CALC!)/i;
const RX_SHEET = /^(?:'((?:[^']|'')+)'|([A-Za-z_À-ɏ][\w.À-ɏ]*))!/;
const RX_CELLRANGE = /^(\$?[A-Za-z]{1,3}\$?\d+)(?::(\$?[A-Za-z]{1,3}\$?\d+))?(?![\w(])/;
const RX_COLRANGE = /^(\$?[A-Za-z]{1,3}):(\$?[A-Za-z]{1,3})(?![\w(])/;
const RX_ROWRANGE = /^(\$?\d+):(\$?\d+)(?![\w(])/;
const RX_FN = /^([A-Za-z_À-ɏ][\w.À-ɏ]*)\s*\(/;
const RX_NAME = /^([A-Za-z_À-ɏ][\w.À-ɏ]*)/;
function argSep(src){ let q = false; for (const ch of src){ if (ch === '"') q = !q; else if (!q && ch === ';') return ';'; } return ','; }
function tokenize(src){
  const sep = argSep(src), dec = sep === ';' ? ',' : '.', out = []; let i = 0;
  const numRx = dec === ',' ? /^(\d+(?:,\d*)?|,\d+)(?:[eE][+-]?\d+)?/ : /^(\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
  while (i < src.length){
    const rest = src.slice(i), ch = src[i]; let m;
    if (/\s/.test(ch)){ i++; continue; }
    if ((m = RX_STR.exec(rest))){ out.push({t:'str', v:m[1].replace(/""/g, '"'), s:i, e:i + m[0].length}); i += m[0].length; continue; }
    if ((m = RX_ERR.exec(rest))){ out.push({t:'err', v:m[0].toUpperCase(), s:i, e:i + m[0].length}); i += m[0].length; continue; }
    // référence éventuellement préfixée par une feuille
    let sh = null, shLen = 0, sm = RX_SHEET.exec(rest);
    if (sm){ sh = sm[1] != null ? sm[1].replace(/''/g, "'") : sm[2]; shLen = sm[0].length; }
    const r2 = rest.slice(shLen);
    const prevT = out[out.length - 1];
    const canRef = !prevT || !['num', 'str', 'ref', 'rp'].includes(prevT.t);
    if (canRef && (m = RX_CELLRANGE.exec(r2))){ out.push({t:'ref', sheet:sh, a:m[1], b:m[2] || null, s:i, e:i + shLen + m[0].length, shs:i, ss:i + shLen}); i += shLen + m[0].length; continue; }
    if (canRef && (m = RX_COLRANGE.exec(r2))){ out.push({t:'ref', sheet:sh, a:m[1], b:m[2], kind:'col', s:i, e:i + shLen + m[0].length, ss:i + shLen}); i += shLen + m[0].length; continue; }
    if (canRef && (m = RX_ROWRANGE.exec(r2))){ out.push({t:'ref', sheet:sh, a:m[1], b:m[2], kind:'row', s:i, e:i + shLen + m[0].length, ss:i + shLen}); i += shLen + m[0].length; continue; }
    if (sh != null){ out.push({t:'bad', s:i, e:i + shLen}); i += shLen; continue; }
    if ((m = numRx.exec(rest))){ out.push({t:'num', v:parseFloat(m[0].replace(',', '.')), s:i, e:i + m[0].length}); i += m[0].length; continue; }
    if ((m = RX_FN.exec(rest))){ out.push({t:'fn', v:m[1].toUpperCase(), s:i, e:i + m[1].length}); out.push({t:'lp', s:i + m[0].length - 1, e:i + m[0].length}); i += m[0].length; continue; }
    if ((m = RX_NAME.exec(rest))){ const u = m[1].toUpperCase(); out.push(u === 'TRUE' || u === 'VRAI' ? {t:'bool', v:true, s:i, e:i + m[0].length} : u === 'FALSE' || u === 'FAUX' ? {t:'bool', v:false, s:i, e:i + m[0].length} : {t:'name', v:m[1], s:i, e:i + m[0].length}); i += m[0].length; continue; }
    if ((m = /^(<>|<=|>=|[-+*/^&=<>%])/.exec(rest))){ out.push({t:'op', v:m[0], s:i, e:i + m[0].length}); i += m[0].length; continue; }
    if (ch === '('){ out.push({t:'lp', s:i, e:i + 1}); i++; continue; }
    if (ch === ')'){ out.push({t:'rp', s:i, e:i + 1}); i++; continue; }
    if (ch === sep){ out.push({t:'sep', s:i, e:i + 1}); i++; continue; }
    if (ch === '{'){ out.push({t:'lb', s:i, e:i + 1}); i++; continue; }
    if (ch === '}'){ out.push({t:'rb', s:i, e:i + 1}); i++; continue; }
    if (sep === ',' && ch === ';'){ out.push({t:'rowsep', s:i, e:i + 1}); i++; continue; }
    if (sep === ';' && (ch === '\\' || ch === '.')){ out.push({t:ch === '\\' ? 'rowsep' : 'colsep', s:i, e:i + 1}); i++; continue; }
    out.push({t:'bad', s:i, e:i + 1}); i++;
  }
  return out;
}
/* --- analyse --- */
class PErr extends Error {}
function refNode(tk){
  if (tk.kind === 'col'){ const a = tk.a.replace(/\$/g, ''), b = tk.b.replace(/\$/g, ''); return {t:'range', sheet:tk.sheet, r1:0, c1:Math.min(colIdx(a), colIdx(b)), r2:MAXR - 1, c2:Math.max(colIdx(a), colIdx(b)), whole:'col'}; }
  if (tk.kind === 'row'){ const a = +tk.a.replace(/\$/g, '') - 1, b = +tk.b.replace(/\$/g, '') - 1; return {t:'range', sheet:tk.sheet, r1:Math.min(a, b), c1:0, r2:Math.max(a, b), c2:MAXC - 1, whole:'row'}; }
  const p = parseA1(tk.a); if (!p) throw new PErr('ref');
  if (!tk.b) return {t:'ref', sheet:tk.sheet, r:p.r, c:p.c};
  const q = parseA1(tk.b); if (!q) throw new PErr('ref');
  return {t:'range', sheet:tk.sheet, r1:Math.min(p.r, q.r), c1:Math.min(p.c, q.c), r2:Math.max(p.r, q.r), c2:Math.max(p.c, q.c)};
}
function parseFormula(src){
  const tks = tokenize(src); let i = 0;
  const peek = () => tks[i], next = () => tks[i++];
  const expectRp = () => { const t = next(); if (!t || t.t !== 'rp') throw new PErr('paren'); };
  const BIN = [['=', '<>', '<', '>', '<=', '>='], ['&'], ['+', '-'], ['*', '/'], ['^']];
  function parseLevel(l){
    if (l >= BIN.length) return parseUnary();
    let a = parseLevel(l + 1);
    for (;;){ const t = peek(); if (t && t.t === 'op' && BIN[l].includes(t.v)){ next(); const b = parseLevel(l === 4 ? l : l + 1); a = {t:'bin', op:t.v, a, b}; if (l === 4) continue; } else break; }
    return a;
  }
  function parseUnary(){ const t = peek(); if (t && t.t === 'op' && (t.v === '-' || t.v === '+')){ next(); const a = parseUnary(); return t.v === '-' ? {t:'neg', a} : a; } return parsePostfix(); }
  function parsePostfix(){ let a = parsePrimary(); while (peek() && peek().t === 'op' && peek().v === '%'){ next(); a = {t:'pct', a}; } return a; }
  function parsePrimary(){
    const t = next(); if (!t) throw new PErr('end');
    switch (t.t){
      case 'num': return {t:'num', v:t.v};
      case 'str': return {t:'str', v:t.v};
      case 'bool': return {t:'bool', v:t.v};
      case 'err': return {t:'err', v:t.v};
      case 'ref': return refNode(t);
      case 'name': return {t:'name', v:t.v};
      case 'lp': { const e = parseLevel(0); expectRp(); return e; }
      case 'lb': { const rows = [[]]; for (;;){ const x = parseUnary(); rows[rows.length - 1].push(x); const s = next(); if (!s) throw new PErr('brace'); if (s.t === 'rb') break; if (s.t === 'rowsep') rows.push([]); else if (s.t !== 'sep' && s.t !== 'colsep') throw new PErr('brace'); } return {t:'arr', rows}; }
      case 'fn': {
        next(); const args = [];
        if (peek() && peek().t === 'rp'){ next(); return {t:'fn', name:t.v, args}; }
        for (;;){
          if (peek() && (peek().t === 'sep' || peek().t === 'rp')) args.push({t:'missing'}); else args.push(parseLevel(0));
          const s = next(); if (!s) throw new PErr('paren'); if (s.t === 'rp') break; if (s.t !== 'sep') throw new PErr('sep');
        }
        return {t:'fn', name:t.v, args};
      }
    }
    throw new PErr('tok');
  }
  const ast = parseLevel(0);
  if (i < tks.length) throw new PErr('trail');
  return ast;
}
/* --- réécriture des références (recopie, insertion/suppression de lignes ou colonnes, renommage de feuille) --- */
function rewriteRefs(src, fn){
  const tks = tokenize(src); let out = '', last = 0;
  for (const t of tks){
    if (t.t !== 'ref') continue;
    const rep = fn(t); if (rep == null) continue;
    out += src.slice(last, t.s) + rep; last = t.e;
  }
  return out + src.slice(last);
}
function shiftPart(p, dr, dc){
  const m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(p); if (!m) return p;
  let c = colIdx(m[2]), r = +m[4] - 1; if (!m[1]) c += dc; if (!m[3]) r += dr;
  if (c < 0 || r < 0 || c >= MAXC || r >= MAXR) return null;
  return m[1] + colName(c) + m[3] + (r + 1);
}
function sheetPrefix(src, t){ return src.slice(t.s, t.ss ?? t.s); }
/* recopie d'une formule décalée de dr lignes et dc colonnes (références relatives ajustées) */
function shiftFormula(src, dr, dc){
  if (!dr && !dc) return src;
  return rewriteRefs(src, t => {
    const pre = sheetPrefix(src, t);
    if (t.kind === 'col'){ const f = x => { const m = /^(\$?)([A-Za-z]+)$/.exec(x); return m[1] ? x : colName(Math.max(0, colIdx(m[2]) + dc)); }; return pre + f(t.a) + ':' + f(t.b); }
    if (t.kind === 'row'){ const f = x => { const m = /^(\$?)(\d+)$/.exec(x); return m[1] ? x : String(Math.max(1, +m[2] + dr)); }; return pre + f(t.a) + ':' + f(t.b); }
    const a = shiftPart(t.a, dr, dc), b = t.b ? shiftPart(t.b, dr, dc) : null;
    if (a == null || (t.b && b == null)) return pre + '#REF!';
    return pre + a + (t.b ? ':' + b : '');
  });
}
/* insertion (n > 0) ou suppression (n < 0) de lignes (axis 'r') ou colonnes ('c') à partir de l'index at, dans la feuille sheetName */
function adjustFormula(src, curSheet, sheetName, axis, at, n){
  return rewriteRefs(src, t => {
    const target = t.sheet != null ? t.sheet : curSheet; if (target !== sheetName) return null;
    const pre = sheetPrefix(src, t);
    const mv = (v) => { if (n > 0) return v >= at ? v + n : v; if (v >= at && v < at - n) return null; return v >= at - n ? v + n : v; };
    const part = x => {
      const m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(x); if (!m) return x;
      let c = colIdx(m[2]), r = +m[4] - 1;
      if (axis === 'r'){ const r2 = mv(r); if (r2 == null) return null; r = r2; } else { const c2 = mv(c); if (c2 == null) return null; c = c2; }
      return m[1] + colName(c) + m[3] + (r + 1);
    };
    if (t.kind === 'col' && axis === 'c'){ const f = x => { const m = /^(\$?)([A-Za-z]+)$/.exec(x); const v = mv(colIdx(m[2])); return v == null ? null : m[1] + colName(v); }; const a = f(t.a), b = f(t.b); return a && b ? pre + a + ':' + b : pre + '#REF!'; }
    if (t.kind === 'row' && axis === 'r'){ const f = x => { const m = /^(\$?)(\d+)$/.exec(x); const v = mv(+m[2] - 1); return v == null ? null : m[1] + (v + 1); }; const a = f(t.a), b = f(t.b); return a && b ? pre + a + ':' + b : pre + '#REF!'; }
    if (t.kind) return null;
    if (t.b){
      // plage : on garde les bornes vivantes (suppression d'une partie seulement)
      const p = parseA1(t.a), q = parseA1(t.b); if (!p || !q) return null;
      let lo = axis === 'r' ? Math.min(p.r, q.r) : Math.min(p.c, q.c), hi = axis === 'r' ? Math.max(p.r, q.r) : Math.max(p.c, q.c);
      if (n > 0){ if (lo >= at) lo += n; if (hi >= at) hi += n; }
      else { const d0 = at, d1 = at - n - 1; if (lo >= d0 && hi <= d1) return pre + '#REF!';
        const nlo = lo > d1 ? lo + n : lo >= d0 ? d0 : lo, nhi = hi > d1 ? hi + n : hi >= d0 ? d0 - 1 : hi; lo = nlo; hi = nhi; }
      const ma = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(t.a), mb = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(t.b);
      if (axis === 'r') return pre + ma[1] + ma[2].toUpperCase() + ma[3] + (lo + 1) + ':' + mb[1] + mb[2].toUpperCase() + mb[3] + (hi + 1);
      return pre + ma[1] + colName(lo) + ma[3] + ma[4] + ':' + mb[1] + colName(hi) + mb[3] + mb[4];
    }
    const a = part(t.a); return a == null ? pre + '#REF!' : pre + a;
  });
}
function renameSheetInFormula(src, oldName, newName){
  return rewriteRefs(src, t => t.sheet === oldName ? quoteSheet(newName) + '!' + src.slice(t.ss, t.e) : null);
}
/* Formule → syntaxe anglaise d'Excel (noms anglais, virgules, point décimal) pour l'export .xlsx */
function toExcelFormula(src){
  const tks = tokenize(src), sep = argSep(src); let out = '', last = 0;
  for (const t of tks){
    let rep = null;
    if (t.t === 'fn'){ const en = FN_ALIAS[t.v] || t.v; rep = en; }
    else if (t.t === 'sep' && sep === ';') rep = ',';
    else if (t.t === 'num' && sep === ';') rep = src.slice(t.s, t.e).replace(',', '.');
    else if (t.t === 'err') rep = ({'#VALEUR!':'#VALUE!', '#NOM?':'#NAME?', '#NOMBRE!':'#NUM!', '#NUL!':'#NULL!'})[t.v] || t.v;
    else if (t.t === 'bool') rep = t.v ? 'TRUE' : 'FALSE';
    else if (t.t === 'rowsep' && sep === ';') rep = ';';
    else if (t.t === 'colsep') rep = ',';
    if (rep == null) continue; out += src.slice(last, t.s) + rep; last = t.e;
  }
  return out + src.slice(last);
}
/* Formule anglaise (import .xlsx) → syntaxe française (noms français, « ; », virgule décimale) */
function toFrenchFormula(src){
  const tks = tokenize(src); if (argSep(src) === ';') return src; let out = '', last = 0;
  for (const t of tks){
    let rep = null;
    if (t.t === 'fn'){ const name = t.v.replace(/^_XLFN\.|^_XLWS\./, ''); rep = FN_FR_OF[name] || name; }
    else if (t.t === 'sep') rep = ';';
    else if (t.t === 'num') rep = src.slice(t.s, t.e).replace('.', ',');
    else if (t.t === 'bool') rep = t.v ? 'VRAI' : 'FAUX';
    else if (t.t === 'rowsep') rep = '\\';
    if (rep == null) continue; out += src.slice(last, t.s) + rep; last = t.e;
  }
  return out + src.slice(last);
}
/* Références d'une formule (pour les colorer pendant la saisie) */
function formulaRefs(src){ try { return tokenize(src).filter(t => t.t === 'ref' && !t.kind); } catch(e){ return []; } }
