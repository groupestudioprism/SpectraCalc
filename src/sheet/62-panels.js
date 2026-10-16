/* ---------- Tiroirs (Insérer, Données, Couleurs, Thème, Modèles), Embellir, Rechercher, assistant de fonctions ---------- */
let panel = '';
function openPanel(k){
  if (panel === k || !k){ panel = ''; g$('edPanel').hidden = true; g$('edRail').querySelectorAll('.ray').forEach(r => r.setAttribute('aria-pressed', 'false')); return; }
  panel = k; const ray = g$('edRail').querySelector(`[data-panel="${k}"]`);
  g$('edRail').querySelectorAll('.ray').forEach(r => r.setAttribute('aria-pressed', r === ray ? 'true' : 'false'));
  g$('edPanel').style.setProperty('--ray', ray?.style.getPropertyValue('--ray') || 'var(--r-v)');
  g$('edPanel').hidden = false; renderPanel();
}
function panelRefresh(){ if (panel === 'theme' || panel === 'cf') renderPanel(); }
const PANEL_T = {insert:['Insérer', 'Graphiques, fonctions, lignes, listes déroulantes'], data:['Données', 'Trier, filtrer, nettoyer, figer'], cf:['Couleurs automatiques', 'Les cellules se colorent selon leurs valeurs'], theme:['Thème', 'Couleurs et police de tout le classeur'], templates:['Modèles', 'Repartir d\'un modèle, ou enregistrer le vôtre']};
function renderPanel(){
  const [t, sub] = PANEL_T[panel] || ['', '']; g$('edPanelTitle').textContent = t; g$('edPanelSub').textContent = sub;
  const body = g$('edPanelBody'); const sel = rangeA1({...SEL, r2:Math.min(SEL.r2, Math.max(sh0().used().r, SEL.r1)), c2:Math.min(SEL.c2, Math.max(sh0().used().c, SEL.c1))});
  if (panel === 'insert'){
    body.innerHTML = `<p class="pn-h">Graphique <small>à partir de ${escH(sel)}</small></p><div class="pn-charts">${CHART_TYPES.map(([k, n]) => `<button type="button" data-ins-ch="${k}">${chartIcon(k)}<span>${n}</span></button>`).join('')}</div>
      <p class="pn-h">Lignes et colonnes</p><div class="pn-acts">
        <button type="button" data-ins="ra">${IC.plus}Ligne au-dessus</button><button type="button" data-ins="rb">${IC.plus}Ligne en dessous</button><button type="button" data-ins="cl">${IC.plus}Colonne à gauche</button><button type="button" data-ins="cr">${IC.plus}Colonne à droite</button>
        <button type="button" data-ins="dr">${IC.trash}Supprimer la ligne</button><button type="button" data-ins="dc">${IC.trash}Supprimer la colonne</button></div>
      <p class="pn-h">Dans les cellules</p><div class="pn-acts">
        <button type="button" data-ins="fn"><b class="pn-fx">ƒx</b>Fonction…</button><button type="button" data-ins="chk"><b class="pn-fx">☑</b>Cases à cocher</button><button type="button" data-ins="dv"><b class="pn-fx">▾</b>Liste déroulante…</button>
        <button type="button" data-ins="note"><b class="pn-fx">✎</b>Note</button><button type="button" data-ins="date"><b class="pn-fx">📅</b>Date du jour</button><button type="button" data-ins="seq"><b class="pn-fx">1·2·3</b>Numéroter</button><button type="button" data-ins="name"><b class="pn-fx">⌘</b>Nommer la plage</button></div>
      <p class="pn-h">Formules toutes prêtes <small>sur la sélection</small></p><div class="pn-acts">${[['SOMME', 'Total'], ['MOYENNE', 'Moyenne'], ['NB', 'Compter'], ['MAX', 'Maximum'], ['MIN', 'Minimum']].map(([f, n]) => `<button type="button" data-ins-sum="${f}"><b class="pn-fx">Σ</b>${n}</button>`).join('')}<button type="button" data-ins="pct"><b class="pn-fx">%</b>Part du total</button><button type="button" data-ins="evo"><b class="pn-fx">↗</b>Évolution en %</button><button type="button" data-ins="cumul"><b class="pn-fx">∑</b>Cumul</button></div>`;
  } else if (panel === 'data'){
    const sh = sh0();
    body.innerHTML = `<div class="pn-acts">
      <button type="button" data-da="sorta">${TB_IC.sortA}Trier A → Z</button><button type="button" data-da="sortz">${TB_IC.sortA}Trier Z → A</button><button type="button" data-da="sortm">${TB_IC.sortA}Tri personnalisé…</button>
      <button type="button" data-da="filter">${TB_IC.filter}${sh.filter ? 'Retirer le filtre' : 'Filtrer'}</button><button type="button" data-da="dups">${IC.copy}Supprimer les doublons</button><button type="button" data-da="split">${IC.table}Convertir en colonnes…</button>
      <button type="button" data-da="trim">${IC.clear}Nettoyer les espaces</button><button type="button" data-da="tonum"><b class="pn-fx">123</b>Texte → nombres</button><button type="button" data-da="values"><b class="pn-fx">=→1</b>Formules → valeurs</button>
      <button type="button" data-da="transpose"><b class="pn-fx">⤡</b>Transposer</button><button type="button" data-da="freeze1"><b class="pn-fx">❄</b>${sh.freeze.r || sh.freeze.c ? 'Libérer les volets' : 'Figer la 1re ligne'}</button><button type="button" data-da="freezehere"><b class="pn-fx">❄</b>Figer jusqu'à la cellule</button>
      <button type="button" data-da="unhide"><b class="pn-fx">👁</b>Tout afficher</button><button type="button" data-da="find">${IC.search}Rechercher et remplacer</button><button type="button" data-da="stats"><b class="pn-fx">∑</b>Statistiques de la sélection</button></div>
      <p class="pn-hint">Astuce : Ctrl + A sélectionne le tableau autour de la cellule. Les filtres et tris gardent la ligne d'en-tête.</p>`;
  } else if (panel === 'cf'){
    const sh = sh0(), tv = themeColors();
    const rules = sh.cf.map((r, i) => `<div class="cf-rule"><span class="cf-sw" style="${r.type === 'scale' ? `background:linear-gradient(90deg,${(r.colors || ['#F8696B', '#FFEB84', '#63BE7B']).join(',')})` : r.type === 'bar' ? `background:linear-gradient(90deg,${r.color || tv.ac} 60%,transparent 60%)` : `background:${r.style?.bg || '#fff'};color:${r.style?.fc || '#000'}`}">${r.type === 'icons' ? '▲▶▼' : 'Aa'}</span><span><b>${escH(cfLabel(r))}</b><small>${escH(r.range)}</small></span><button type="button" class="ib" data-cfdel="${i}" aria-label="Supprimer">${IC.trash}</button></div>`).join('');
    body.innerHTML = `<p class="pn-h">Embellir en un clic <small>sur ${escH(sel)}</small></p><div class="pn-tbls">${[['', 'Couleur du thème'], ['line', 'Lignes fines']].concat([['#2FBF71', 'Vert'], ['#3D63FF', 'Bleu'], ['#F5B82E', 'Ambre'], ['#F2387A', 'Rose'], ['#1A1726', 'Encre']].map(([c, n]) => [c, n])).map(([c, n]) => `<button type="button" data-tbl="${c}">${tableMini(c === 'line' ? '' : c || tv.ac, c === 'line')}<span>${n}</span></button>`).join('')}<button type="button" data-tbl="none"><span class="tm none">×</span><span>Retirer</span></button></div>
      <p class="pn-h">Colorer selon les valeurs <small>sur ${escH(sel)}</small></p><div class="pn-cf">
        <button type="button" data-cf="scale"><span class="cf-ex" style="background:linear-gradient(90deg,#F8696B,#FFEB84,#63BE7B)"></span>Dégradé rouge → vert</button>
        <button type="button" data-cf="scale2"><span class="cf-ex" style="background:linear-gradient(90deg,#ffffff,${tv.ac})"></span>Dégradé du thème</button>
        <button type="button" data-cf="bar"><span class="cf-ex" style="background:linear-gradient(90deg,${tv.ac} 65%,#eee 65%)"></span>Barres de données</button>
        <button type="button" data-cf="icons"><span class="cf-ex ic">▲ ▶ ▼</span>Flèches</button>
        <button type="button" data-cf="neg"><span class="cf-ex" style="color:#D92D20;background:#FFE4E4">-12</span>Négatifs en rouge</button>
        <button type="button" data-cf="top"><span class="cf-ex" style="background:#CFF5E7">10</span>Les 10 plus grandes</button>
        <button type="button" data-cf="above"><span class="cf-ex" style="background:#D6E4FF">&gt; moy.</span>Au-dessus de la moyenne</button>
        <button type="button" data-cf="dup"><span class="cf-ex" style="background:#FFE0B2">2×</span>Doublons</button>
        <button type="button" data-cf="late"><span class="cf-ex" style="background:#FFD1D1">📅</span>Dates dépassées</button>
        <button type="button" data-cf="rule"><span class="cf-ex">…</span>Règle personnalisée</button></div>
      ${rules ? `<p class="pn-h">Règles de la feuille</p><div class="cf-rules">${rules}</div>` : ''}`;
  } else if (panel === 'theme'){
    const cur = WB.theme.id;
    body.innerHTML = `<div class="th-row">${THEMES.map(t => `<button type="button" class="pn-theme${t.id === cur ? ' on' : ''}" data-thm="${t.id}"><span class="th-card" style="background:#fff"><span class="th-band" style="background:${t.grad}"></span><span class="th-aa" style="font-family:${fontStack(t.fb).replace(/"/g, "'")};color:${t.ink}">123</span><span class="th-line" style="background:${t.ac}"></span><span class="th-line s" style="background:${t.ac2}"></span></span><b>${escH(t.name)}</b><small>${escH(t.fb)}</small></button>`).join('')}</div>
      <div class="th-custom"><label>Couleur principale<span class="pn-color"><input type="color" id="thAc" value="${themeColors().ac}"><code>${themeColors().ac}</code></span></label>
      <label>Police des cellules<select id="thFont">${FONTS.map(([f]) => `<option${f === themeColors().fb ? ' selected' : ''}>${escH(f)}</option>`).join('')}</select></label></div>
      <p class="pn-hint">Le thème colore les tableaux embellis, les graphiques et les couleurs proposées. Il ne touche pas aux couleurs choisies à la main.</p>`;
  } else if (panel === 'templates'){
    const lib = (E2.userLib?.templates || []);
    body.innerHTML = `<div class="pn-tpls">${SC_TEMPLATES.filter(t => t.id !== 'blank').map(t => `<button type="button" class="pn-tpl" data-tplc="${t.id}"><span class="tthumb">${tplMini(t)}</span><b>${escH(t.name)}</b></button>`).join('')}${lib.map(t => `<button type="button" class="pn-tpl" data-tplc="${t.id}"><span class="tthumb">${tplMini(t)}</span><b>${escH(t.name)}</b></button>`).join('')}</div>
      <button type="button" class="pn-wide" data-tpl-save="1">${IC.plus}Enregistrer ce classeur comme modèle</button><button type="button" class="pn-wide" data-tpl-pub="1">Publier dans la Communauté</button>`;
    window.SWScaleMinis?.(body);
  }
}
function cfLabel(r){ return ({scale:'Dégradé', bar:'Barres de données', icons:'Flèches', neg:'Négatifs', pos:'Positifs', top:'Plus grandes valeurs', bottom:'Plus petites valeurs', above:'Au-dessus de la moyenne', below:'Sous la moyenne', dup:'Doublons', uniq:'Valeurs uniques', gt:'Supérieur à ' + r.a, lt:'Inférieur à ' + r.a, ge:'Au moins ' + r.a, le:'Au plus ' + r.a, eq:'Égal à ' + r.a, ne:'Différent de ' + r.a, between:`Entre ${r.a} et ${r.b}`, text:`Contient « ${r.a} »`, empty:'Vide', notempty:'Non vide', date:'Dates', formula:'Formule ' + r.a})[r.type] || r.type; }
function tableMini(c, line){ const h = line ? `border-bottom:2px solid var(--ac,#6D3BFF)` : `background:${c}`; return `<span class="tm"><i style="${line ? 'border-bottom:2px solid #6D3BFF;background:#fff' : `background:${c}`}"></i>${[0, 1, 2, 3].map(i => `<i style="background:${line ? '#fff' : i % 2 ? '#fff' : mix(c, '#ffffff', .88)};${line ? 'border-bottom:1px solid #ddd' : ''}"></i>`).join('')}</span>`; }
function onPanelClick(e){
  const t = e.target;
  const ich = t.closest('[data-ins-ch]'); if (ich) return addChart(ich.dataset.insCh);
  const ins = t.closest('[data-ins]'); if (ins) return insertAction(ins.dataset.ins);
  const isum = t.closest('[data-ins-sum]'); if (isum) return autoSum(isum.dataset.insSum);
  const da = t.closest('[data-da]'); if (da) return dataAction(da.dataset.da);
  const tb = t.closest('[data-tbl]'); if (tb) return tb.dataset.tbl === 'none' ? removeTableStyle() : beautify(tb.dataset.tbl === 'line' ? {style:'line'} : {color:tb.dataset.tbl || ''});
  const cf = t.closest('[data-cf]'); if (cf) return addCf(cf.dataset.cf);
  const cfd = t.closest('[data-cfdel]'); if (cfd){ const sh = sh0(); tx('Supprimer la règle', () => { sh.cf.splice(+cfd.dataset.cfdel, 1); }); return renderPanel(); }
  const th = t.closest('[data-thm]'); if (th){ tx('Thème', () => { WB.theme = {id:th.dataset.thm}; }, {full:true}); WB.recalc(); afterChange(true); renderPanel(); return; }
  const tp = t.closest('[data-tplc]'); if (tp) return tplChoice(tp.dataset.tplc);
  if (t.closest('[data-tpl-save]')) return saveTplDlg();
  if (t.closest('[data-tpl-pub]')) return window.SWHome?.publishCurrent?.();
}
function onPanelInput(e){
  if (e.target.id === 'thAc'){ WB.theme = {...WB.theme, ac:e.target.value}; e.target.nextElementSibling.textContent = e.target.value; schedule(); renderObjects(); emitChange(); }
  if (e.target.id === 'thFont'){ WB.theme = {...WB.theme, fb:e.target.value}; ensureFont(e.target.value); applyThemeCss(); schedule(); emitChange(); }
}
function applyThemeCss(){ const v = themeColors(); ensureFont(v.fb); g$('grid').style.setProperty('--cfont', fontStack(v.fb).replace(/"/g, "'")); g$('grid').style.setProperty('--ac', v.ac); }
function insertAction(k){
  const sh = sh0();
  switch (k){
    case 'ra': return insertRows(SEL.r1, 1); case 'rb': return insertRows(SEL.r2 + 1, 1); case 'cl': return insertCols(SEL.c1, 1); case 'cr': return insertCols(SEL.c2 + 1, 1);
    case 'dr': return deleteRows(SEL.r1, Math.min(SEL.r2, sh.used().r + 1) - SEL.r1 + 1); case 'dc': return deleteCols(SEL.c1, Math.min(SEL.c2, sh.used().c + 1) - SEL.c1 + 1);
    case 'fn': return fnDialog(); case 'chk': return makeCheckboxes(); case 'dv': return dvDialog(); case 'note': return noteDlg(); case 'name': return nameDlg();
    case 'date': return setSelRaw(fmtDate(todaySerial(), 'dd/mm/yyyy'));
    case 'seq': { const n = Math.max(1, SEL.r2 - SEL.r1 + 1 > 5000 ? 10 : SEL.r2 - SEL.r1 + 1); tx('Numéroter', () => { for (let i = 0; i < n; i++) sh.setRaw(SEL.r1 + i, SEL.c1, String(i + 1)); }); return; }
    case 'pct': case 'evo': case 'cumul': return helperFormula(k);
  }
}
/* colonnes calculées toutes prêtes, à droite de la sélection */
function helperFormula(k){
  const sh = sh0(); const g = {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, sh.used().r), c2:SEL.c1};
  if (g.r1 === g.r2) return toast('Sélectionnez une colonne de nombres');
  let c = SEL.c2 + 1; while (c < SEL.c2 + 6 && [...range(g.r1, g.r2)].some(r => WB.val(sh, r, c) != null)) c++;
  const col = colName(g.c1), ref = r => col + (r + 1), abs = `$${col}$${g.r1 + 1}:$${col}$${g.r2 + 1}`;
  tx(k === 'pct' ? 'Part du total' : k === 'evo' ? 'Évolution' : 'Cumul', () => {
    for (let r = g.r1; r <= g.r2; r++){
      if (k === 'pct') sh.setRaw(r, c, `=SIERREUR(${ref(r)}/SOMME(${abs});0)`);
      if (k === 'evo') sh.setRaw(r, c, r === g.r1 ? '' : `=SIERREUR(${ref(r)}/${ref(r - 1)}-1;"")`);
      if (k === 'cumul') sh.setRaw(r, c, `=SOMME($${col}$${g.r1 + 1}:${ref(r)})`);
      sh.setStyle(r, c, {nf:k === 'cumul' ? (sh.get(r, g.c1)?.s?.nf || null) : '0.0%'});
    }
    if (g.r1 > 0 && typeof WB.val(sh, g.r1 - 1, g.c1) === 'string'){ sh.setRaw(g.r1 - 1, c, k === 'pct' ? '% du total' : k === 'evo' ? 'Évolution' : 'Cumul'); const hs = sh.get(g.r1 - 1, g.c1)?.s; if (hs) sh.setStyle(g.r1 - 1, c, hs); }
  });
  selectRange({r1:g.r1, c1:c, r2:g.r2, c2:c});
}
function dataAction(k){
  const sh = sh0();
  switch (k){
    case 'sorta': return sortSel(true); case 'sortz': return sortSel(false); case 'sortm': return sortDialog();
    case 'filter': toggleFilter(); return renderPanel();
    case 'dups': return removeDuplicates();
    case 'split': return splitDialog();
    case 'trim': return transformSel(v => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : null, 'Nettoyer les espaces');
    case 'tonum': return transformSel(v => { if (typeof v !== 'string') return null; const p = parseInput(v.trim()); return typeof p.v === 'number' ? v.trim() : null; }, 'Texte en nombres');
    case 'values': { tx('Formules en valeurs', () => eachSel((r, c) => { const cell = sh.get(r, c); if (cell?.ast){ const v = WB.val(sh, r, c); sh.setRaw(r, c, v == null ? '' : isErr(v) ? '' : editText(v, cell.s?.nf), true); } })); return toast('Les formules sont remplacées par leurs résultats'); }
    case 'transpose': return transposeSel();
    case 'freeze1': tx('Figer', () => { sh.freeze = sh.freeze.r || sh.freeze.c ? {r:0, c:0} : {r:1, c:0}; }); g$('gScroll').scrollTo(0, 0); return renderPanel();
    case 'freezehere': tx('Figer', () => { sh.freeze = {r:SEL.r, c:SEL.c}; }); g$('gScroll').scrollTo(0, 0); return;
    case 'unhide': return tx('Tout afficher', () => { sh.hr = new Set(); sh.hc = new Set(); if (sh.filter) sh.filter.crit = {}; });
    case 'find': return openFind(true);
    case 'stats': return statsDlg();
  }
}
function transformSel(fn, label){ const sh = sh0(); let n = 0; tx(label, () => eachSel((r, c) => { const cell = sh.get(r, c); if (!cell || cell.ast) return; const out = fn(cell.v); if (out != null && out !== cell.raw){ sh.setRaw(r, c, out); n++; } })); toast(`${n} cellule${n > 1 ? 's' : ''} modifiée${n > 1 ? 's' : ''}`); }
function transposeSel(){
  const sh = sh0(), u = sh.used(), g = {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, u.r), c2:Math.min(SEL.c2, u.c)}; const h = g.r2 - g.r1 + 1, w = g.c2 - g.c1 + 1;
  const data = []; for (let r = 0; r < h; r++){ const row = []; for (let c = 0; c < w; c++){ const cell = sh.get(g.r1 + r, g.c1 + c); const v = WB.val(sh, g.r1 + r, g.c1 + c); row.push(cell ? {raw:cell.ast ? (v == null ? '' : editText(v, cell.s?.nf)) : cell.raw, s:cell.s} : null); } data.push(row); }
  tx('Transposer', () => { for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) sh.setCell(g.r1 + r, g.c1 + c, null); for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) sh.setCell(g.r1 + c, g.c1 + r, data[r][c]); });
  selectRange({r1:g.r1, c1:g.c1, r2:g.r1 + w - 1, c2:g.c1 + h - 1});
}
function removeDuplicates(){
  const sh = sh0(); const g = SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2 ? currentRegion(SEL.r, SEL.c) : {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, sh.used().r), c2:Math.min(SEL.c2, sh.used().c)};
  const hdr = typeof WB.val(sh, g.r1, g.c1) === 'string' && sh.get(g.r1, g.c1)?.s?.b; const r0 = hdr ? g.r1 + 1 : g.r1;
  const seen = new Set(), keep = [], rows = [];
  for (let r = r0; r <= g.r2; r++){ const key = range(g.c1, g.c2).map(c => { const v = WB.val(sh, r, c); return typeof v === 'string' ? v.trim().toLowerCase() : String(v); }).join('\u0001'); const row = range(g.c1, g.c2).map(c => cloneCell(sh.get(r, c))); if (seen.has(key)) continue; seen.add(key); keep.push(row); }
  const removed = g.r2 - r0 + 1 - keep.length; if (!removed) return toast('Aucun doublon trouvé');
  tx('Supprimer les doublons', () => { for (let r = r0; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) sh.setCell(r, c, null); keep.forEach((row, i) => row.forEach((d, j) => sh.setCell(r0 + i, g.c1 + j, d))); });
  toast(`${removed} ligne${removed > 1 ? 's' : ''} en double supprimée${removed > 1 ? 's' : ''}`);
}
function splitDialog(){
  SWDlg.open(`<h3>Convertir en colonnes</h3><p class="dlg-p">Découpe le texte des cellules sélectionnées (colonne ${colName(SEL.c1)}) dans les colonnes de droite.</p>
    <div class="seg" id="spSep">${[[';', 'Point-virgule'], [',', 'Virgule'], ['\t', 'Tabulation'], [' ', 'Espace'], ['-', 'Tiret'], ['/', 'Barre']].map(([k, n], i) => `<button type="button" data-s="${escH(k)}" aria-checked="${i === 0}">${n}</button>`).join('')}</div>
    <div class="dlg-acts"><button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="spOk">Convertir</button></div>`, d => {
    let sep = ';'; d.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sep = b.dataset.s; d.querySelectorAll('[data-s]').forEach(x => x.setAttribute('aria-checked', x === b)); });
    d.querySelector('#spOk').onclick = () => { SWDlg.close(); const sh = sh0(); tx('Convertir en colonnes', () => { for (let r = SEL.r1; r <= Math.min(SEL.r2, sh.used().r); r++){ const v = WB.val(sh, r, SEL.c1); if (typeof v !== 'string') continue; v.split(sep).forEach((p, j) => sh.setRaw(r, SEL.c1 + j, p.trim())); } }); };
  });
}
function sortDialog(){
  const sh = sh0(); const g = SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2 ? trimTotal(sh, currentRegion(SEL.r, SEL.c)) : {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, sh.used().r), c2:Math.min(SEL.c2, sh.used().c)};
  const hdrName = c => { const v = WB.val(sh, g.r1, c); return typeof v === 'string' ? `${v} (${colName(c)})` : 'Colonne ' + colName(c); };
  const opts = range(g.c1, g.c2).map(c => `<option value="${c}">${escH(hdrName(c))}</option>`).join('');
  SWDlg.open(`<h3>Trier ${escH(rangeA1(g))}</h3><label class="pop-toggle"><input type="checkbox" id="soH" checked><span><b>La première ligne contient des en-têtes</b></span></label>
    <div class="so-keys">${[0, 1, 2].map(i => `<div class="dlg-row"><select data-k="${i}"><option value="">${i ? '(puis par…)' : 'Trier par…'}</option>${opts}</select><select data-o="${i}"><option value="1">Croissant (A → Z)</option><option value="0">Décroissant (Z → A)</option></select></div>`).join('')}</div>
    <div class="dlg-acts"><button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="soOk">Trier</button></div>`, d => {
    d.querySelector('[data-k="0"]').value = String(SEL.c >= g.c1 && SEL.c <= g.c2 ? SEL.c : g.c1);
    d.querySelector('#soOk').onclick = () => { const keys = [0, 1, 2].map(i => ({c:d.querySelector(`[data-k="${i}"]`).value, asc:d.querySelector(`[data-o="${i}"]`).value === '1'})).filter(k => k.c !== '').map(k => ({c:+k.c, asc:k.asc}));
      if (!keys.length) return; SWDlg.close(); sortRows(sh, {r1:d.querySelector('#soH').checked ? g.r1 + 1 : g.r1, c1:g.c1, r2:g.r2, c2:g.c2}, keys); };
  }, 'wide');
}
function statsDlg(){
  const sh = sh0(), l = []; let cnt = 0, empty = 0, txt = 0; eachSel((r, c) => { const v = WB.val(sh, r, c); if (v == null || v === ''){ empty++; return; } cnt++; if (typeof v === 'number') l.push(v); else txt++; });
  const s = sortNum(l), f = x => formatValue(x, '#,##0.##').t;
  const rows = l.length ? [['Somme', f(sum(l))], ['Moyenne', f(sum(l) / l.length)], ['Médiane', f(percentile(l, .5))], ['Minimum', f(s[0])], ['Maximum', f(s[s.length - 1])], ['Écart type', l.length > 1 ? f(Math.sqrt(variance(l))) : '—']] : [];
  SWDlg.open(`<h3>Statistiques de ${escH(rangeA1(SEL))}</h3><dl class="info-dl"><dt>Cellules remplies</dt><dd>${cnt}</dd><dt>Nombres</dt><dd>${l.length}</dd><dt>Textes</dt><dd>${txt}</dd>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl><div class="dlg-acts"><button class="ap-btn" data-dlg="close">Fermer</button></div>`);
}
/* ---------- Embellir : la sélection devient un beau tableau ---------- */
function beautify(opts = {}){
  if (V.ro) return; const sh = sh0();
  let g = SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2 ? currentRegion(SEL.r, SEL.c) : {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, sh.used().r), c2:Math.min(SEL.c2, sh.used().c)};
  if (g.r1 === g.r2 && g.c1 === g.c2) return toast('Sélectionnez un tableau (ou une cellule dedans)');
  const hasTotal = range(g.c1, g.c2).some(c => { const cell = sh.get(g.r2, c); return cell?.ast && /SOMME|SUM|TOTAL/i.test(cell.raw); }) || /total/i.test(String(WB.val(sh, g.r2, g.c1) ?? ''));
  tx('Embellir', () => {
    sh.tables = sh.tables.filter(t => { const x = parseRange(t.range); return !x || x.r2 < g.r1 || x.r1 > g.r2 || x.c2 < g.c1 || x.c1 > g.c2; });
    sh.tables.push({range:rangeA1(g), color:opts.color || '', style:opts.style || '', header:true, banded:true, total:hasTotal});
    // largeur des colonnes et format des nombres
    for (let c = g.c1; c <= g.c2; c++){
      let w = 40; const nums2 = []; for (let r = g.r1; r <= g.r2; r++){ const v = WB.val(sh, r, c), cell = sh.get(r, c); if (v == null) continue; if (typeof v === 'number' && r > g.r1) nums2.push([r, cell]); w = Math.max(w, measureText(formatValue(v, cell?.s?.nf).t, {b:r === g.r1, ...(cell?.s || {})}) + 22); }
      if (!sh.cw[c] || sh.cw[c] < w) sh.cw[c] = Math.min(320, Math.ceil(w));
      if (nums2.length && nums2.every(([, cell]) => !cell?.s?.nf)){ const big = nums2.some(([r]) => Math.abs(WB.val(sh, r, c)) >= 1000); const dec = nums2.some(([r]) => WB.val(sh, r, c) % 1); if (big || dec) for (const [r] of nums2) sh.setStyle(r, c, {nf:dec ? '#,##0.00' : '#,##0'}); }
    }
    if (!sh.rh[g.r1]) sh.rh[g.r1] = 30;
    if (sh.freeze.r === 0 && g.r1 === 0 && g.r2 > 25) sh.freeze = {r:1, c:0};
  });
  toast('Tableau embelli · Couleurs automatiques dans le rayon « Couleurs »');
  layout(); schedule();
}
function removeTableStyle(){ const sh = sh0(); tx('Retirer le style', () => { sh.tables = sh.tables.filter(t => { const x = parseRange(t.range); return !x || !(SEL.r >= x.r1 && SEL.r <= x.r2 && SEL.c >= x.c1 && SEL.c <= x.c2); }); }); }
/* ---------- mise en forme conditionnelle ---------- */
function cfRange(){ const sh = sh0(); const g = SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2 ? currentRegion(SEL.r, SEL.c) : {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, Math.max(sh.used().r, SEL.r1)), c2:Math.min(SEL.c2, Math.max(sh.used().c, SEL.c1))};
  // on ignore la ligne d'en-tête textuelle
  if (g.r2 > g.r1 && range(g.c1, g.c2).every(c => typeof WB.val(sh, g.r1, c) === 'string' || WB.val(sh, g.r1, c) == null) && range(g.c1, g.c2).some(c => typeof WB.val(sh, g.r1 + 1, c) === 'number')) g.r1++;
  return rangeA1(g); }
function addCf(kind){
  const sh = sh0(), rg = cfRange(), tv = themeColors();
  const add = rule => { tx('Couleurs automatiques', () => sh.cf.push({range:rg, ...rule})); renderPanel(); toast('Règle ajoutée sur ' + rg); };
  switch (kind){
    case 'scale': return add({type:'scale', colors:['#F8696B', '#FFEB84', '#63BE7B']});
    case 'scale2': return add({type:'scale', colors:['#ffffff', tv.ac]});
    case 'bar': return add({type:'bar', color:tv.ac});
    case 'icons': return add({type:'icons', set:'arrows'});
    case 'neg': return add({type:'neg', style:{fc:'#D92D20', bg:'#FFE4E4'}});
    case 'top': return add({type:'top', a:10, style:{bg:'#CFF5E7', fc:'#0F6E45', b:1}});
    case 'above': return add({type:'above', style:{bg:'#D6E4FF'}});
    case 'dup': return add({type:'dup', style:{bg:'#FFE0B2'}});
    case 'late': return add({type:'date', a:'late', style:{bg:'#FFD1D1', fc:'#A12A2A'}});
    case 'rule': return cfDialog(rg);
  }
}
function cfDialog(rg){
  const T = [['gt', 'Supérieur à'], ['lt', 'Inférieur à'], ['ge', 'Supérieur ou égal à'], ['le', 'Inférieur ou égal à'], ['between', 'Entre'], ['eq', 'Égal à'], ['ne', 'Différent de'], ['text', 'Contient le texte'], ['empty', 'Est vide'], ['notempty', 'N\'est pas vide'], ['formula', 'La formule est VRAIE']];
  const C = [['#FFE4E4', '#A12A2A', 'Rouge'], ['#E8F7EF', '#0F6E45', 'Vert'], ['#FFF4E5', '#8A5300', 'Orange'], ['#EEF2FF', '#3730A3', 'Bleu'], ['#F3E8FF', '#6B21A8', 'Violet'], ['#1A1726', '#ffffff', 'Noir']];
  SWDlg.open(`<h3>Règle personnalisée</h3><div class="dlg-row"><input id="cfR" value="${escH(rg)}" aria-label="Plage"></div>
    <div class="dlg-row"><select id="cfT">${T.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select><input id="cfA" placeholder="Valeur (ex. 1000)"><input id="cfB" placeholder="et" hidden></div>
    <p class="pop-h">Couleur</p><div class="cf-cols">${C.map(([bg, fc, n], i) => `<button type="button" data-bg="${bg}" data-fc="${fc}" aria-pressed="${i === 0}" style="background:${bg};color:${fc}">${n}</button>`).join('')}</div>
    <label class="pop-toggle"><input type="checkbox" id="cfBold"><span><b>En gras</b></span></label>
    <p class="ap-err" id="dlgErr"></p><div class="dlg-acts"><button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="cfOk">Ajouter</button></div>`, d => {
    let st = {bg:C[0][0], fc:C[0][1]};
    d.querySelector('#cfT').onchange = e => { const v = e.target.value; d.querySelector('#cfB').hidden = v !== 'between'; d.querySelector('#cfA').hidden = v === 'empty' || v === 'notempty'; d.querySelector('#cfA').placeholder = v === 'formula' ? 'Ex. =$C2>$D2' : v === 'text' ? 'Texte' : 'Valeur (ex. 1000)'; };
    d.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => { st = {bg:b.dataset.bg, fc:b.dataset.fc}; d.querySelectorAll('[data-bg]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    d.querySelector('#cfOk').onclick = () => { const r = d.querySelector('#cfR').value.toUpperCase(); if (!parseRange(r)) return d.querySelector('#dlgErr').textContent = 'Plage invalide';
      const type = d.querySelector('#cfT').value, a = d.querySelector('#cfA').value, b = d.querySelector('#cfB').value; if (d.querySelector('#cfBold').checked) st.b = 1;
      SWDlg.close(); const sh = sh0(); tx('Couleurs automatiques', () => sh.cf.push({range:r, type, a:type === 'formula' ? a.replace(/^=/, '') : a, b, style:st})); renderPanel(); };
  });
}
/* ---------- liste déroulante ---------- */
function dvDialog(){
  const sh = sh0(), rg = rangeA1({...SEL, r2:Math.min(SEL.r2, SEL.r1 + 4999), c2:Math.min(SEL.c2, SEL.c1 + 50)}), cur = dvAtCell(sh, SEL.r, SEL.c);
  SWDlg.open(`<h3>Liste déroulante</h3><p class="dlg-p">Les cellules ${escH(rg)} proposeront un choix dans une liste. Mettez un élément par ligne ; ajoutez une couleur à chaque choix si vous le souhaitez.</p>
    <textarea id="dvL" class="dlg-ta" rows="6" placeholder="À faire&#10;En cours&#10;Terminé">${escH((cur?.list || []).join('\n'))}</textarea>
    <label class="pop-toggle"><input type="checkbox" id="dvC"${cur?.colors || !cur ? ' checked' : ''}><span><b>Couleurs automatiques par choix</b><small>Chaque choix colore la cellule (statuts, priorités…)</small></span></label>
    <div class="dlg-acts">${cur ? '<button class="ap-btn alt danger-t" id="dvDel">Retirer la liste</button>' : ''}<button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="dvOk">Créer la liste</button></div>`, d => {
    d.querySelector('#dvOk').onclick = () => { const list = d.querySelector('#dvL').value.split('\n').map(x => x.trim()).filter(Boolean); if (!list.length) return; SWDlg.close();
      const pal = ['#E8F7EF', '#FFF4E5', '#FFE4E4', '#EEF2FF', '#F3E8FF', '#E0F7FA', '#FFF1A8', '#FCE7F3']; const colors = d.querySelector('#dvC').checked ? Object.fromEntries(list.map((x, i) => [x, pal[i % pal.length]])) : null;
      tx('Liste déroulante', () => { sh.dv = sh.dv.filter(x => x !== cur); sh.dv.push({range:rg, list, colors}); }); schedule(); toast('Cliquez sur ▾ dans la cellule pour choisir'); };
    const del = d.querySelector('#dvDel'); if (del) del.onclick = () => { SWDlg.close(); tx('Retirer la liste', () => { sh.dv = sh.dv.filter(x => x !== cur); }); };
  });
}
/* ---------- assistant de fonctions ---------- */
function fnDialog(){
  const cats = ['Toutes', ...new Set(FN_INFO.map(f => f.cat))]; let cat = 'Toutes', q = '';
  SWDlg.open(`<h3>Insérer une fonction</h3><div class="dlg-row"><input id="fnQ" placeholder="Chercher : somme, date, recherche, arrondi…" autocomplete="off"></div>
    <div class="pn-chips" id="fnCats">${cats.map(c => `<button type="button" data-c="${escH(c)}" aria-pressed="${c === cat}">${escH(c)}</button>`).join('')}</div><div class="fn-list" id="fnL"></div>`, d => {
    const draw = () => { const n = nrmTxt(q); const L = FN_INFO.filter(f => (cat === 'Toutes' || f.cat === cat) && (!n || nrmTxt(f.fr + ' ' + f.en + ' ' + f.desc).includes(n))).slice(0, 120);
      d.querySelector('#fnL').innerHTML = L.map(f => `<button type="button" data-fn="${escH(f.fr)}"><b>${escH(f.fr)}(${escH(f.syn)})</b><span>${escH(f.desc)}${f.fr !== f.en ? ` · en anglais : ${escH(f.en)}` : ''}</span></button>`).join('') || '<p class="pn-hint">Aucune fonction ne correspond.</p>'; };
    d.querySelector('#fnQ').oninput = e => { q = e.target.value; draw(); };
    d.querySelector('#fnCats').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; d.querySelectorAll('#fnCats [data-c]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); };
    d.querySelector('#fnL').onclick = e => { const b = e.target.closest('[data-fn]'); if (!b) return; SWDlg.close(); startEdit(`=${b.dataset.fn}(`); };
    draw();
  }, 'wide');
}
/* ---------- rechercher / remplacer ---------- */
const FR = {hits:[], i:-1};
function frSearch(){
  const q = g$('frQ').value, cs = g$('frCase').checked, all = g$('frAll').checked; FR.hits = []; FR.i = -1;
  if (q){ const qq = cs ? q : q.toLowerCase();
    for (const sh of all ? WB.sheets : [sh0()]){ const L = []; for (const [k, cell] of sh.cells){ const v = WB.val(sh, KR(k), KC(k)); const t = v == null ? '' : formatValue(v, cell.s?.nf).t + ' ' + (cell.raw || ''); if ((cs ? t : t.toLowerCase()).includes(qq)) L.push({sh, r:KR(k), c:KC(k)}); } L.sort((a, b) => a.r - b.r || a.c - b.c); FR.hits.push(...L); } }
  g$('frN').textContent = q ? (FR.hits.length ? `0 / ${FR.hits.length}` : 'aucun') : '';
}
function frGo(d){ if (!FR.hits.length) return; FR.i = (FR.i + d + FR.hits.length) % FR.hits.length; const h = FR.hits[FR.i]; const i = WB.sheets.indexOf(h.sh); if (i !== WB.active) switchSheet(i); selectCell(h.r, h.c); g$('frN').textContent = `${FR.i + 1} / ${FR.hits.length}`; }
function frReplace(all){
  if (V.ro) return; const q = g$('frQ').value, rep = g$('frR').value, cs = g$('frCase').checked; if (!q) return;
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), cs ? 'g' : 'gi'); let n = 0;
  const list = all ? FR.hits : FR.i >= 0 ? [FR.hits[FR.i]] : FR.hits.slice(0, 1);
  tx('Remplacer', () => { for (const h of list){ const cell = h.sh.get(h.r, h.c); if (!cell) continue; const nr = cell.raw.replace(rx, rep); if (nr !== cell.raw){ h.sh.setRaw(h.r, h.c, nr); n++; } } }, {full:all && g$('frAll').checked});
  toast(`${n} remplacement${n > 1 ? 's' : ''}`); frSearch(); if (!all) frGo(1);
}
function openFind(replace){ const b = g$('findBar'); b.hidden = false; b.classList.toggle('rep', !!replace); const q = g$('frQ'); q.focus(); q.select(); frSearch(); }
function closeFind(){ g$('findBar').hidden = true; g$('grid').focus({preventScroll:true}); }
