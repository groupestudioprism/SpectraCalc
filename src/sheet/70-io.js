/* ---------- Import / export : Excel (.xlsx), CSV, PDF, page web, sauvegarde SPECTRA Calc ---------- */
const LIB_EXCEL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
function loadScriptOnce(src){ return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src === src) && window.ExcelJS) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('bibliothèque indisponible (connexion ?)')); document.head.appendChild(s); }); }
async function excelJS(){ if (!window.ExcelJS) await loadScriptOnce(LIB_EXCEL); return window.ExcelJS; }
const argb = c => { if (!c) return undefined; const h = String(c).replace('#', ''); return 'FF' + (h.length === 3 ? [...h].map(x => x + x).join('') : h).toUpperCase(); };
const fromArgb = c => c && c.argb && c.argb.length >= 6 ? '#' + c.argb.slice(-6) : undefined;
function xlNumFmt(nf){ if (!nf || nf === 'chk' || nf === '@') return nf === '@' ? '@' : undefined; return nf.replace(/ €/g, ' [$€-40C]').replace(/^\$/, '[$$-409]'); }
function nfFromXl(f){ if (!f || f === 'General') return undefined; let s = f.replace(/\[\$€-[0-9A-F]+\]/gi, '€').replace(/\[\$\$-409\]/g, '$').replace(/"€"/g, '€').replace(/\\ /g, ' ').replace(/_\)|_-|\(\*|\*\s/g, '');
  s = s.replace(/\[\$-[0-9A-F]+\]/gi, ''); return s.trim() || undefined; }
/* ---------- export .xlsx ---------- */
async function exportXlsx(){
  const X = await excelJS(); const wb = new X.Workbook(); wb.creator = 'SPECTRA Calc · Studio Prism'; wb.created = new Date();
  for (const sh of WB.sheets){
    const ws = wb.addWorksheet(sh.name.slice(0, 31), {properties:{tabColor:sh.tab ? {argb:argb(sh.tab)} : undefined}, views:[{state:sh.freeze.r || sh.freeze.c ? 'frozen' : 'normal', xSplit:sh.freeze.c || 0, ySplit:sh.freeze.r || 0, showGridLines:sh.grid}]});
    const u = sh.used();
    for (let c = 0; c <= u.c; c++){ const w = sh.cw[c]; if (w != null) ws.getColumn(c + 1).width = Math.max(1, w / 7); if (sh.hc.has(c)) ws.getColumn(c + 1).hidden = true; }
    for (const [r, h] of Object.entries(sh.rh)) ws.getRow(+r + 1).height = h * .75;
    for (const r of sh.hr) ws.getRow(r + 1).hidden = true;
    const keys = new Set(sh.cells.keys()); for (const t of sh.tables){ const g = parseRange(t.range); if (g) for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) keys.add(KEY(r, c)); }
    for (const k of keys){
      const r = KR(k), c = KC(k), cell = sh.get(r, c), v = WB.val(sh, r, c), xc = ws.getCell(r + 1, c + 1);
      const ts = sh.tables.length ? tableStyleAt(sh, r, c) : null; const s = {...(ts || {}), ...(cell?.s || {})};
      if (cell?.ast){ const res = isErr(v) ? undefined : v; xc.value = {formula:toExcelFormula(cell.raw.slice(1)), result:res ?? undefined}; }
      else if (v != null) xc.value = v;
      const nf = xlNumFmt(s.nf); if (nf) xc.numFmt = nf;
      const font = {}; if (s.b) font.bold = true; if (s.i) font.italic = true; if (s.u) font.underline = true; if (s.st) font.strike = true; if (s.fc) font.color = {argb:argb(s.fc)}; if (s.fs) font.size = s.fs; if (s.ff) font.name = s.ff;
      if (Object.keys(font).length) xc.font = {name:s.ff || themeColors().fb, size:s.fs || 10, ...font};
      if (s.bg) xc.fill = {type:'pattern', pattern:'solid', fgColor:{argb:argb(s.bg)}};
      const al = {}; if (s.ha) al.horizontal = {l:'left', c:'center', r:'right'}[s.ha]; if (s.va) al.vertical = {t:'top', m:'middle', b:'bottom'}[s.va]; if (s.wrap) al.wrapText = true; if (s.ind) al.indent = s.ind; if (Object.keys(al).length) xc.alignment = al;
      const bd = {}; for (const [kk, side] of [['bt', 'top'], ['br', 'right'], ['bb', 'bottom'], ['bl', 'left']]) if (s[kk]){ const [w, col, kind] = String(s[kk]).split(' '); bd[side] = {style:kind === 'double' ? 'double' : parseInt(w) >= 2 ? 'medium' : 'thin', color:{argb:argb(col || '#1A1726')}}; }
      if (Object.keys(bd).length) xc.border = bd;
      if (cell?.note) xc.note = cell.note;
    }
    for (const m of sh.merges) try { ws.mergeCells(m.r1 + 1, m.c1 + 1, m.r2 + 1, m.c2 + 1); } catch(e){}
    for (const d of sh.dv){ const g = parseRange(d.range); if (!g) continue; const list = dvItems(d).join(',').replace(/"/g, ''); if (list.length > 250) continue; for (let r = g.r1; r <= Math.min(g.r2, g.r1 + 999); r++) for (let c = g.c1; c <= g.c2; c++) ws.getCell(r + 1, c + 1).dataValidation = {type:'list', allowBlank:true, formulae:[`"${list}"`]}; }
    for (const rule of sh.cf){
      const ref = rule.range; let rules = null;
      const st = rule.style ? {font:rule.style.fc || rule.style.b ? {color:rule.style.fc ? {argb:argb(rule.style.fc)} : undefined, bold:!!rule.style.b} : undefined, fill:rule.style.bg ? {type:'pattern', pattern:'solid', bgColor:{argb:argb(rule.style.bg)}} : undefined} : undefined;
      const op = {gt:'greaterThan', lt:'lessThan', ge:'greaterThanOrEqual', le:'lessThanOrEqual', eq:'equal', ne:'notEqual', between:'between'}[rule.type];
      const q = x => typeof x === 'number' || parseNumberFr(x) != null ? String(parseNumberFr(String(x)) ?? x) : `"${x}"`;
      if (rule.type === 'scale'){ const cols = rule.colors || ['#F8696B', '#FFEB84', '#63BE7B']; rules = [{type:'colorScale', cfvo:cols.length === 3 ? [{type:'min'}, {type:'percentile', value:50}, {type:'max'}] : [{type:'min'}, {type:'max'}], color:cols.map(x => ({argb:argb(x)}))}]; }
      else if (rule.type === 'bar') rules = [{type:'dataBar', cfvo:[{type:'min'}, {type:'max'}], color:{argb:argb(rule.color || themeColors().ac)}}];
      else if (op) rules = [{type:'cellIs', operator:op, formulae:rule.type === 'between' ? [q(rule.a), q(rule.b)] : [q(rule.a)], style:st}];
      else if (rule.type === 'neg') rules = [{type:'cellIs', operator:'lessThan', formulae:['0'], style:st}];
      else if (rule.type === 'formula') rules = [{type:'expression', formulae:[toExcelFormula(String(rule.a))], style:st}];
      else if (rule.type === 'dup') rules = [{type:'duplicateValues', style:st}];
      else if (rule.type === 'top') rules = [{type:'top10', rank:rule.a || 10, style:st}];
      else if (rule.type === 'above') rules = [{type:'aboveAverage', style:st}];
      else if (rule.type === 'text') rules = [{type:'containsText', operator:'containsText', text:String(rule.a), style:st}];
      if (rules) try { ws.addConditionalFormatting({ref, rules}); } catch(e){}
    }
  }
  for (const [k, n] of Object.entries(WB.names || {})){ const g = parseRange(n.ref); if (!g) continue; try { wb.definedNames.add(`'${n.sheet}'!$${colName(g.c1)}$${g.r1 + 1}:$${colName(g.c2)}$${g.r2 + 1}`, n.label || k); } catch(e){} }
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
/* ---------- import .xlsx ---------- */
async function importXlsx(file){
  const X = await excelJS(); const wb = new X.Workbook(); await wb.xlsx.load(await file.arrayBuffer());
  const out = {v:1, app:'spectracalc', title:file.name.replace(/\.[^.]+$/, ''), theme:{id:'spectra'}, active:0, sheets:[], names:{}};
  wb.eachSheet(ws => {
    const s = TS(ws.name.slice(0, 31)); s.grid = ws.views?.[0]?.showGridLines !== false;
    const v0 = ws.views?.[0]; if (v0?.state === 'frozen') s.freeze = {r:v0.ySplit || 0, c:v0.xSplit || 0};
    if (ws.properties?.tabColor?.argb) s.tab = fromArgb(ws.properties.tabColor);
    (ws.columns || []).forEach((col, i) => { if (col.width && Math.abs(col.width - 9.140625) > .05 && Math.abs(col.width - 8.43) > .05) s.cw[colName(i)] = Math.round(col.width * 7.2); if (col.hidden) (s.hc = s.hc || []).push(i); });
    let n = 0;
    ws.eachRow({includeEmpty:false}, (row, rn) => {
      if (row.height && row.customHeight !== false && Math.abs(row.height - 15) > .5) s.rh[rn - 1] = Math.round(row.height / .75);
      if (row.hidden) (s.hr = s.hr || []).push(rn - 1);
      row.eachCell({includeEmpty:false}, (cell, cn) => {
        if (++n > 400000) return;
        let raw = '', v = cell.value; const st = {};
        if (v && typeof v === 'object' && !(v instanceof Date)){
          if (v.formula || v.sharedFormula){ let f = v.formula || cell.formula; if (!f && v.sharedFormula){ const m = ws.getCell(v.sharedFormula); const mf = m.value?.formula; if (mf){ const a = parseA1(v.sharedFormula); f = shiftFormula(mf, rn - 1 - a.r, cn - 1 - a.c); } } raw = f ? '=' + toFrenchFormula(f) : String(v.result ?? ''); }
          else if (v.richText) raw = v.richText.map(t => t.text).join('');
          else if (v.text != null) raw = String(v.text);
          else if (v.error) raw = v.error;
          else if (v.result != null) raw = String(v.result);
        } else if (v instanceof Date){ raw = String(+(((v.getTime() - DAY0) / MS_DAY).toFixed(8))); st.nf = nfFromXl(cell.numFmt) || DATE; }
        else if (typeof v === 'number') raw = String(v);
        else if (typeof v === 'boolean') raw = v ? 'VRAI' : 'FAUX';
        else if (v != null) raw = String(v);
        if (typeof v === 'string' && (parseInput(raw).v !== raw)) raw = "'" + raw;    // texte qui ressemble à un nombre : on le garde en texte
        const f = cell.font || {}; if (f.bold) st.b = 1; if (f.italic) st.i = 1; if (f.underline) st.u = 1; if (f.strike) st.st = 1; if (f.color?.argb && !/^FF000000$/i.test(f.color.argb)) st.fc = fromArgb(f.color); if (f.size && f.size !== 11 && f.size !== 10) st.fs = f.size;
        const fill = cell.fill; if (fill?.type === 'pattern' && fill.pattern === 'solid' && fill.fgColor?.argb) st.bg = fromArgb(fill.fgColor);
        const al = cell.alignment || {}; if (al.horizontal && al.horizontal !== 'general') st.ha = {left:'l', center:'c', right:'r', centerContinuous:'c', justify:'l', fill:'l', distributed:'c'}[al.horizontal]; if (al.vertical) st.va = {top:'t', middle:'m', bottom:null}[al.vertical] || undefined; if (al.wrapText) st.wrap = 1; if (al.indent) st.ind = al.indent;
        const b = cell.border || {}; for (const [side, kk] of [['top', 'bt'], ['right', 'br'], ['bottom', 'bb'], ['left', 'bl']]) if (b[side]?.style){ st[kk] = (b[side].style === 'medium' || b[side].style === 'thick' ? '2px ' : b[side].style === 'double' ? '3px ' : '1px ') + (fromArgb(b[side].color) || '#1A1726') + (b[side].style === 'double' ? ' double' : ''); }
        if (!st.nf){ const nf = nfFromXl(cell.numFmt); if (nf && typeof v !== 'string') st.nf = nf; }
        if (st.va == null) delete st.va;
        const a = A1(rn - 1, cn - 1); s.cells[a] = Object.keys(st).length || cell.note ? {r:raw, ...(Object.keys(st).length ? {s:st} : {}), ...(cell.note ? {n:typeof cell.note === 'string' ? cell.note : cell.note.texts?.map(t => t.text).join('')} : {})} : raw;
      });
    });
    s.merges = (ws.model?.merges || []).slice(0, 5000);
    out.sheets.push(s);
  });
  try { (wb.definedNames?.model || []).forEach(d => { const m = /^'?([^'!]+)'?!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/.exec(d.ranges?.[0] || ''); if (m) out.names[d.name.toUpperCase()] = {ref:m[2] + m[3] + (m[4] ? ':' + m[4] + m[5] : ''), sheet:m[1], label:d.name}; }); } catch(e){}
  if (!out.sheets.length) out.sheets.push(TS('Feuille 1'));
  return out;
}
/* ---------- CSV ---------- */
function parseCSV(text){
  text = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const head = text.slice(0, 5000), cnt = ch => (head.match(new RegExp(ch === '\t' ? '\t' : '\\' + ch, 'g')) || []).length;
  const sep = ['\t', ';', ','].sort((a, b) => cnt(b) - cnt(a))[0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++){ const ch = text[i];
    if (q){ if (ch === '"'){ if (text[i + 1] === '"'){ cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"' && cur === ''){ q = true; continue; }
    if (ch === sep){ row.push(cur); cur = ''; } else if (ch === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch; }
  if (cur !== '' || row.length){ row.push(cur); rows.push(row); }
  return rows;
}
function csvImportJSON(text, name){
  const rows = parseCSV(text), s = TS(name.slice(0, 31) || 'Données');
  rows.slice(0, 200000).forEach((row, r) => row.forEach((v, c) => { if (v !== '') s.cells[A1(r, c)] = /^=/.test(v) ? "'" + v : v; }));
  if (rows.length > 1 && rows[0].every(x => x && isNaN(parseNumberFr(x) ?? NaN))) { rows[0].forEach((v, c) => { s.cells[A1(0, c)] = {r:v, s:{b:1}}; }); s.freeze = {r:1, c:0}; }
  rows[0]?.forEach((_, c) => { let w = 60; for (let r = 0; r < Math.min(rows.length, 300); r++) w = Math.max(w, String(rows[r][c] || '').length * 7.4 + 16); s.cw[colName(c)] = Math.min(320, Math.round(w)); });
  return {v:1, app:'spectracalc', title:name.replace(/\.[^.]+$/, ''), theme:{id:'spectra'}, active:0, sheets:[s]};
}
function exportCSV(sh = sh0()){
  const u = sh.used(), lines = [];
  for (let r = 0; r <= u.r; r++){ const row = []; for (let c = 0; c <= u.c; c++){ const v = WB.val(sh, r, c), nf = sh.get(r, c)?.s?.nf; let t = v == null || isErr(v) ? '' : typeof v === 'number' ? (nf && compileFmt(nf).kind === 'date' ? formatValue(v, nf).t : String(+v.toPrecision(15)).replace('.', ',')) : typeof v === 'boolean' ? (v ? 'VRAI' : 'FAUX') : String(v); if (/[;"\n]/.test(t)) t = '"' + t.replace(/"/g, '""') + '"'; row.push(t); } lines.push(row.join(';')); }
  return new Blob(['﻿' + lines.join('\r\n')], {type:'text/csv;charset=utf-8'});
}
/* ---------- HTML (export, impression, aperçus) ---------- */
function sheetHTML(sh, opts = {}){
  const u = sh.used(), maxR = Math.min(u.r, opts.maxR ?? u.r), maxC = Math.min(u.c, opts.maxC ?? u.c);
  const skip = new Set(); const span = new Map();
  for (const m of sh.merges){ span.set(KEY(m.r1, m.c1), m); for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) if (r !== m.r1 || c !== m.c1) skip.add(KEY(r, c)); }
  let h = `<table class="sc-tbl"><colgroup>${range(0, maxC).map(c => `<col style="width:${sh.hc.has(c) ? 0 : sh.colW(c)}px">`).join('')}</colgroup>`;
  for (let r = 0; r <= maxR; r++){
    if (sh.hr.has(r)) continue; h += `<tr style="height:${sh.rowH(r)}px">`;
    for (let c = 0; c <= maxC; c++){
      const k = KEY(r, c); if (skip.has(k) || sh.hc.has(c)) continue;
      const cell = sh.get(r, c), v = WB.val(sh, r, c), ts = sh.tables.length ? tableStyleAt(sh, r, c) : null, cf = sh.cf.length ? cfApply(sh, r, c, v) : null;
      const s = {...(ts || {}), ...(cell?.s || {}), ...(cf || {})}; const fv = formatValue(v, s.nf); const m = span.get(k);
      let css = cellCss(s).replace(/font-size:([\d.]+)px/, (x, n) => `font-size:${(+n / V.z).toFixed(1)}px`); const ha = s.ha || fv.a; if (ha !== 'l') css += `text-align:${ha === 'r' ? 'right' : 'center'};`; if (s.wrap) css += 'white-space:pre-wrap;';
      if (s._bar != null) css += `background:linear-gradient(90deg,${s._barc} ${(s._bar * 100).toFixed(0)}%,transparent ${(s._bar * 100).toFixed(0)}%);`;
      const txt = s.chk ? (v === true ? '☑' : '☐') : escH(fv.t);
      h += `<td${m ? ` colspan="${m.c2 - m.c1 + 1}" rowspan="${m.r2 - m.r1 + 1}"` : ''}${css ? ` style="${css}"` : ''}>${s._icon ? `<span style="color:${s._iconc}">${s._icon}</span> ` : ''}${txt}</td>`;
    }
    h += '</tr>';
  }
  return h + '</table>';
}
const PRINT_CSS = `.sc-tbl{border-collapse:collapse;table-layout:fixed;font:13px var(--cfont,Inter,system-ui,sans-serif);color:#1A1726}
.sc-tbl td{padding:2px 5px;overflow:hidden;white-space:nowrap;text-overflow:clip;vertical-align:bottom;border:1px solid #E6E3EE}
.sc-sheet h2{font:700 15px Inter,system-ui,sans-serif;margin:0 0 10px}.sc-charts{display:flex;flex-wrap:wrap;gap:16px;margin-top:18px}.sc-charts svg{max-width:100%;height:auto;border:1px solid #eee;border-radius:10px}`;
function exportHTMLDoc(all = true){
  const sheets = all ? WB.sheets : [sh0()]; const t = themeColors();
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escH(WB.title)}</title><style>body{margin:0;padding:28px;font-family:${fontStack(t.fb).replace(/"/g, "'")};background:#fff}${PRINT_CSS}.sc-sheet{margin-bottom:40px;overflow:auto}h1{font:800 24px Inter,system-ui,sans-serif;margin:0 0 20px}</style></head><body><h1>${escH(WB.title)}</h1>${sheets.map(sh => `<section class="sc-sheet"><h2>${escH(sh.name)}</h2>${sheetHTML(sh)}${sh.charts.length ? `<div class="sc-charts">${sh.charts.map(ch => chartSVG(ch, ch.w, ch.h)).join('')}</div>` : ''}</section>`).join('')}</body></html>`;
}
function printSheet(all){
  const sheets = all ? WB.sheets : [sh0()];
  let pa = g$('printArea'); if (!pa){ pa = document.createElement('div'); pa.id = 'printArea'; document.body.appendChild(pa); }
  const wide = sheets.some(sh => { let w = 0; for (let c = 0; c <= sh.used().c; c++) w += sh.colW(c); return w > 720; });
  pa.innerHTML = `<style>@page{size:A4 ${wide ? 'landscape' : 'portrait'};margin:12mm}${PRINT_CSS}</style>` + sheets.map((sh, i) => `<section class="sc-sheet" style="${i ? 'page-break-before:always' : ''}">${sheets.length > 1 ? `<h2>${escH(sh.name)}</h2>` : `<h2>${escH(WB.title)}</h2>`}${sheetHTML(sh)}${sh.charts.length ? `<div class="sc-charts">${sh.charts.map(ch => chartSVG(ch, ch.w, ch.h)).join('')}</div>` : ''}</section>`).join('');
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); pa.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => { window.print(); setTimeout(() => { if (document.body.classList.contains('printing')) done(); }, 2000); }, 80);
}
async function doExport(kind){
  closePop(); if (EDIT.on) commitEdit(0, 0);
  const name = window.SWSafeName ? SWSafeName(WB.title || 'classeur') : 'classeur';
  const free = kind === 'pdf' || kind === 'pdfall' || kind === 'csv';
  if (!free && window.SWHome && !SWHome.canExport()) return SWHome.licence('export');
  try {
    if (kind === 'pdf' || kind === 'pdfall') return printSheet(kind === 'pdfall');
    if (kind === 'csv') return SWDownload(SWSafeName(WB.title + ' - ' + sh0().name) + '.csv', exportCSV());
    if (kind === 'html') return SWDownload(name + '.html', new Blob([exportHTMLDoc()], {type:'text/html;charset=utf-8'}));
    if (kind === 'json') return SWDownload(name + '.spectracalc', new Blob([getJSON()], {type:'application/json'}));
    if (kind === 'xlsx'){ toast('Création du fichier Excel…'); const b = await exportXlsx(); await SWDownload(name + '.xlsx', b); toast(WB.sheets.some(s => s.charts.length) ? 'Fichier Excel téléchargé (les graphiques restent dans SPECTRA Calc)' : 'Fichier Excel téléchargé'); }
  } catch(e){ console.error(e); toast(e.message ? 'Export impossible : ' + e.message : 'Export impossible'); }
}
function exportPop(anchor){
  const lic = !window.SWHome || SWHome.canExport();
  const it = (k, t, s, free) => `<button type="button" data-x="${k}"><b>${t}${!free && !lic ? ' <span class="lk">Licence</span>' : ''}</b><span>${s}</span></button>`;
  openPop(anchor, `<div class="pop-menu">${it('xlsx', 'Excel (.xlsx)', 'Formules, formats, couleurs et règles conservés')}${it('pdf', 'PDF de la feuille', 'Impression ou « Enregistrer au format PDF »', true)}${WB.sheets.length > 1 ? it('pdfall', 'PDF de tout le classeur', 'Une page par feuille', true) : ''}${it('csv', 'CSV (.csv)', 'Les valeurs de la feuille, séparées par « ; »', true)}${it('html', 'Page web (.html)', 'Toutes les feuilles et les graphiques')}<hr>${it('json', 'Sauvegarde SPECTRA Calc', 'Fichier .spectracalc, à réimporter tel quel')}</div>`, p => {
    p.onclick = e => { const b = e.target.closest('[data-x]'); if (b) doExport(b.dataset.x); };
  }, 'menu');
}
/* fichier → JSON de classeur (accueil : nouveau classeur ; éditeur : feuilles ajoutées) */
async function importFile(f){
  const n = f.name.toLowerCase();
  if (/\.(xlsx|xlsm)$/.test(n)) return JSON.stringify(await importXlsx(f));
  if (/\.xls$/.test(n)) throw new Error('Ancien format .xls : enregistrez-le en .xlsx depuis Excel, puis réessayez.');
  const text = await f.text();
  if (/\.(spectracalc|json)$/.test(n)){ const j = JSON.parse(text); if (j.app !== 'spectracalc' || !j.sheets) throw new Error('Ce fichier n\'est pas un classeur SPECTRA Calc'); return JSON.stringify(j); }
  return JSON.stringify(csvImportJSON(text, f.name));
}
async function insertFileSheets(f){
  try { const j = JSON.parse(await importFile(f)); wbOp('Importer des feuilles', () => { for (const so of j.sheets){ const s = WB.addSheet(uniqueSheetName(so.name)); const nm = s.name; s.load({...so, name:nm}); } WB.active = WB.sheets.length - 1; }); toast(`${j.sheets.length} feuille${j.sheets.length > 1 ? 's' : ''} ajoutée${j.sheets.length > 1 ? 's' : ''}`); }
  catch(e){ toast(e.message || 'Import impossible'); }
}
