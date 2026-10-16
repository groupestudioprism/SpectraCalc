/* ---------- Le Spectre (Ctrl + K) : actions, phrases comprises sur place, et IA pour le reste ---------- */
const SPX = {items:[], all:[], i:0};
const AIS = {busy:false, res:null, prompt:'', ctx:null, ctl:0};
function spectreActions(){
  const A = [], add = (g, t, run, k = '') => A.push({g, t, run, k});
  add('Calculer', 'Somme automatique', () => autoSum('SOMME'), 'total sigma'); add('Calculer', 'Moyenne', () => autoSum('MOYENNE')); add('Calculer', 'Compter', () => autoSum('NB'), 'nombre nb'); add('Calculer', 'Maximum', () => autoSum('MAX')); add('Calculer', 'Minimum', () => autoSum('MIN'));
  add('Calculer', 'Insérer une fonction…', fnDialog, 'fx formule'); add('Calculer', 'Part du total (%)', () => helperFormula('pct')); add('Calculer', 'Évolution en %', () => helperFormula('evo')); add('Calculer', 'Cumul', () => helperFormula('cumul'));
  add('Mise en forme', 'Embellir le tableau', () => beautify(), 'style tableau beau joli'); add('Mise en forme', 'Gras', () => toggleStyle('b')); add('Mise en forme', 'Italique', () => toggleStyle('i'));
  NFORMATS.forEach(([k, n]) => add('Format', 'Format ' + n.toLowerCase(), () => styleSel({nf:k || null}, 'Format'), 'nombre'));
  add('Mise en forme', 'Fusionner et centrer', toggleMerge); add('Mise en forme', 'Renvoyer à la ligne', () => toggleStyle('wrap')); add('Mise en forme', 'Bordures partout', () => applyBorders('all')); add('Mise en forme', 'Effacer la mise en forme', () => clearSel('format'));
  CHART_TYPES.forEach(([k, n]) => add('Graphique', 'Graphique : ' + n.toLowerCase(), () => addChart(k), 'chart diagramme'));
  [['scale', 'Dégradé de couleurs'], ['bar', 'Barres de données'], ['icons', 'Flèches'], ['neg', 'Négatifs en rouge'], ['dup', 'Surligner les doublons'], ['top', 'Les 10 plus grandes valeurs']].forEach(([k, n]) => add('Couleurs', n, () => addCf(k), 'mise en forme conditionnelle'));
  add('Données', 'Trier de A à Z', () => sortSel(true)); add('Données', 'Trier de Z à A', () => sortSel(false)); add('Données', 'Tri personnalisé…', sortDialog); add('Données', 'Filtrer', toggleFilter);
  add('Données', 'Supprimer les doublons', removeDuplicates); add('Données', 'Convertir en colonnes…', splitDialog); add('Données', 'Transposer', transposeSel); add('Données', 'Formules → valeurs', () => dataAction('values'));
  add('Données', 'Liste déroulante…', dvDialog, 'validation choix'); add('Données', 'Cases à cocher', makeCheckboxes, 'checkbox'); add('Données', 'Figer la première ligne', () => dataAction('freeze1'), 'volets'); add('Données', 'Figer jusqu\'à la cellule', () => dataAction('freezehere'));
  add('Lignes', 'Insérer une ligne au-dessus', () => insertRows(SEL.r1, 1)); add('Lignes', 'Insérer une colonne à gauche', () => insertCols(SEL.c1, 1)); add('Lignes', 'Supprimer la ligne', () => deleteRows(SEL.r1, 1)); add('Lignes', 'Supprimer la colonne', () => deleteCols(SEL.c1, 1));
  add('Lignes', 'Largeur automatique des colonnes', () => autofitCols(range(Math.max(0, SEL.c1), Math.min(SEL.c2, sh0().used().c)))); add('Insérer', 'Note', noteDlg); add('Insérer', 'Nommer la plage…', nameDlg);
  add('Feuilles', 'Nouvelle feuille', addSheet); add('Feuilles', 'Renommer la feuille', () => renameSheet(WB.active));
  WB.sheets.forEach((s, i) => { if (i !== WB.active) add('Feuilles', 'Aller à « ' + s.name + ' »', () => switchSheet(i)); });
  THEMES.forEach(t => add('Thème', 'Thème ' + t.name, () => { tx('Thème', () => { WB.theme = {id:t.id}; }, {full:true}); WB.recalc(); afterChange(true); }, 'couleur'));
  [['xlsx', 'Exporter en Excel (.xlsx)'], ['pdf', 'Exporter en PDF'], ['csv', 'Exporter en CSV'], ['html', 'Exporter en page web'], ['json', 'Télécharger une sauvegarde']].forEach(([k, n]) => add('Exporter', n, () => doExport(k), 'telecharger fichier'));
  add('Classeur', 'Rechercher', () => openFind(false), 'Ctrl F'); add('Classeur', 'Remplacer', () => openFind(true), 'Ctrl H'); add('Classeur', 'Importer des feuilles (Excel, CSV)', () => g$('edInsFile').click());
  add('Classeur', 'Imprimer', () => printSheet(false)); add('Classeur', 'Partager', () => window.SWShareCurrent?.()); add('Classeur', 'Dupliquer le classeur', () => window.SWHome?.duplicateCurrent());
  add('Classeur', 'Enregistrer comme modèle', saveTplDlg); add('Classeur', 'Publier dans la Communauté', () => window.SWHome?.publishCurrent?.());
  add('Classeur', 'Interface claire ou sombre', () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; lsSet('sc.theme', t); }, 'sombre nuit');
  add('Aller', 'Accueil', () => window.SWHome?.show('home')); add('Aller', 'Nouveau classeur', () => window.SWHome?.show('templates'));
  return A;
}
const SP_START = ['Embellir le tableau', 'Somme automatique', 'Graphique : colonnes', 'Trier de A à Z', 'Filtrer', 'Dégradé de couleurs', 'Liste déroulante…', 'Exporter en Excel (.xlsx)'];
/* ---------- phrases comprises sur place ---------- */
const COLOR_FR = [['rouge', '#D92D20'], ['vert', '#16A34A'], ['bleu', '#2563EB'], ['jaune', '#CA8A04'], ['orange', '#EA580C'], ['violet', '#7C3AED'], ['rose', '#DB2777'], ['noir', '#000000'], ['gris', '#6B7280'], ['blanc', '#FFFFFF']];
const FILL_FR = [['jaune', '#FFF1A8'], ['vert', '#CFF5E7'], ['rouge', '#FFD1D1'], ['bleu', '#D6E4FF'], ['orange', '#FFE0B2'], ['violet', '#E9D5FF'], ['rose', '#FFD1DC'], ['gris', '#E2E8F0']];
const nW = s => nrmTxt(s).replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
const hasW = (n, w) => new RegExp('(^|[^a-z0-9])' + w + '($|[^a-z0-9])').test(n);
/* colonne désignée par une lettre (« colonne C ») ou par son en-tête (« colonne prix ») */
function findCol(n){
  let m = /\bcolonne\s+([a-z]{1,3})\b/.exec(n); if (m && !/^(de|du|la|le|les|des)$/.test(m[1])) return {c:colIdx(m[1])};
  const sh = sh0(), g = trimTotal(sh, currentRegion(SEL.r, SEL.c));
  for (let r = g.r1; r <= Math.min(g.r1 + 2, g.r2); r++) for (let c = g.c1; c <= g.c2; c++){ const v = WB.val(sh, r, c); if (typeof v === 'string' && v.length > 1 && hasW(n, nW(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) return {c, hdr:r, g}; }
  return null;
}
function parseCalc(raw){
  const n = nW(raw).replace(/^(peux tu|pourrais tu|stp|s il te plait|je veux|j aimerais)\s+/, ''), out = [], add = (t, run) => out.push({t, run});
  let m;
  const rg = /\b([a-z]{1,3}\d+(?::[a-z]{1,3}\d+)?)\b/.exec(n), R = rg ? parseRange(rg[1]) : null;
  // aller à une cellule
  if ((m = /^(?:va|aller|vas|direction|selectionne)\w*\s*(?:a|en|sur)?\s*(?:la cellule\s*)?([a-z]{1,3}\d+(?::[a-z]{1,3}\d+)?)$/.exec(n))){ const g = parseRange(m[1]); return [{t:'Aller en ' + rangeA1(g), run:() => g.r1 === g.r2 && g.c1 === g.c2 ? selectCell(g.r1, g.c1) : selectRange(g)}]; }
  // feuille
  if ((m = /^(?:va|aller|ouvre)\w*\s*(?:a|sur|dans)?\s*(?:la\s*)?feuille\s+(.+)$/.exec(n))){ const i = WB.sheets.findIndex(s => nW(s.name) === m[1] || nW(s.name).includes(m[1])); if (i >= 0) return [{t:'Aller à la feuille « ' + WB.sheets[i].name + ' »', run:() => switchSheet(i)}]; }
  if ((m = /renomm\w*\s+(?:la\s+)?feuille\s+(?:en\s+)?(.+)$/i.exec(raw.trim()))) { const nm = m[1].replace(/^["«]|["»]$/g, '').trim(); return [{t:`Renommer la feuille en « ${nm} »`, run:() => wbOp('Renommer la feuille', () => { const s = WB.sh, old = s.name; s.name = nm.slice(0, 31); for (const o of WB.sheets) for (const [k, cell] of o.cells) if (cell.raw && cell.raw.includes(old)) o.setRaw(KR(k), KC(k), '=' + renameSheetInFormula(cell.raw.slice(1), old, s.name), true); })}]; }
  if (/\b(nouvelle|ajoute|cree)\w*\s+(une\s+)?feuille\b/.test(n)) return [{t:'Nouvelle feuille', run:addSheet}];
  // remplacer
  if ((m = /^(?:remplace\w*|change\w*)\s+(.+?)\s+par\s+(.+)$/i.exec(raw.trim()))){ const a = m[1].replace(/^["«]|["»]$/g, ''), b = m[2].replace(/^["«]|["»]$/g, ''); return [{t:`Remplacer « ${a} » par « ${b} »`, run:() => { g$('frQ').value = a; g$('frR').value = b; g$('frCase').checked = false; g$('frAll').checked = false; frSearch(); frReplace(true); }}]; }
  // calculs
  const FN_W = [['somme|total|additionne', 'SOMME', 'Total'], ['moyenne', 'MOYENNE', 'Moyenne'], ['max|maximum|plus grand', 'MAX', 'Maximum'], ['min|minimum|plus petit', 'MIN', 'Minimum'], ['compte|nombre|combien', 'NB', 'Nombre'], ['mediane', 'MEDIANE', 'Médiane']];
  for (const [w, f, lab] of FN_W){ if (!new RegExp('\\b(' + w + ')\\b').test(n)) continue;
    if (R) return [{t:`${lab} de ${rangeA1(R)} dans ${A1(SEL.r, SEL.c)}`, run:() => tx(lab, () => sh0().setRaw(SEL.r, SEL.c, `=${f}(${rangeA1(R)})`))}];
    const col = findCol(n); if (col){ const g = col.g || currentRegion(SEL.r, col.c); const r1 = (col.hdr ?? g.r1) + (typeof WB.val(sh0(), g.r1, col.c) === 'string' ? 1 : 0), r2 = g.r2;
      const tot = rangeA1({r1, c1:col.c, r2, c2:col.c}); return [{t:`${lab} de la colonne ${colName(col.c)} (${tot}) sous le tableau`, run:() => { tx(lab, () => { const sh = sh0(); sh.setRaw(r2 + 1, col.c, `=${f}(${tot})`); sh.setStyle(r2 + 1, col.c, {b:1, ...(sh.get(r2, col.c)?.s?.nf ? {nf:sh.get(r2, col.c).s.nf} : {})}); if (col.c > 0 && WB.val(sh, r2 + 1, g.c1) == null && g.c1 < col.c) sh.setRaw(r2 + 1, g.c1, lab); }); selectCell(r2 + 1, col.c); }}]; }
    if (/\b(selection|ici)\b/.test(n) || SEL.r1 !== SEL.r2) return [{t:`${lab} de la sélection`, run:() => autoSum(f)}];
  }
  // tri
  if (/\b(trie|trier|classe|range|ordonne)\w*\b/.test(n)){ const desc = /\b(decroissant|z a|plus grand|du plus haut|inverse)\b/.test(n); const col = findCol(n.replace(/\b(trie\w*|par|selon)\b/g, ' colonne ')) || findCol(n);
    if (col){ const g = col.g || trimTotal(sh0(), currentRegion(SEL.r, col.c)); return [{t:`Trier ${desc ? 'de Z à A' : 'de A à Z'} selon la colonne ${colName(col.c)}`, run:() => { const hdr = typeof WB.val(sh0(), g.r1, col.c) === 'string'; sortRows(sh0(), {r1:hdr ? g.r1 + 1 : g.r1, c1:g.c1, r2:g.r2, c2:g.c2}, [{c:col.c, asc:!desc}]); }}]; }
    return [{t:`Trier ${desc ? 'de Z à A' : 'de A à Z'}`, run:() => sortSel(!desc)}]; }
  if (/\b(filtre|filtrer)\b/.test(n) && !/\bretire|enleve|supprime\b/.test(n)) add('Filtrer le tableau', () => { if (!sh0().filter) toggleFilter(); });
  if (/\b(retire|enleve|supprime)\w* (le )?filtre\b/.test(n)) return [{t:'Retirer le filtre', run:() => { if (sh0().filter) toggleFilter(); }}];
  // graphique
  if (/\b(graphique|graph|diagramme|courbe|camembert|histogramme|secteurs?|anneau|donut|barres?)\b/.test(n) && !/\bdonnees? (en )?barres?\b/.test(n)){
    const t = /\b(courbe|ligne|evolution)\b/.test(n) ? 'line' : /\b(camembert|secteur|part|repartition)\b/.test(n) ? 'pie' : /\b(anneau|donut)\b/.test(n) ? 'donut' : /\b(aire)\b/.test(n) ? 'area' : /\bempile\b/.test(n) ? 'stack' : /\b(nuage|dispersion)\b/.test(n) ? 'scatter' : /\bbarres?\b/.test(n) && !/\bverticales?\b/.test(n) ? 'bar' : 'col';
    return [{t:'Graphique : ' + CHART_TYPES.find(x => x[0] === t)[1].toLowerCase() + (R ? ' de ' + rangeA1(R) : ''), run:() => addChart(t, R ? rangeA1(R) : undefined)}]; }
  // embellir
  if (/\b(embelli\w*|joli|beau|mets? en forme le tableau|mise en forme du tableau|style de tableau)\b/.test(n)) return [{t:'Embellir le tableau', run:() => beautify()}];
  // couleurs conditionnelles : « colore en vert les valeurs supérieures à 1000 »
  if ((m = /(superieur\w*|plus grand\w*|au dessus|>|inferieur\w*|plus petit\w*|en dessous|<|egal\w*|=)\s*(?:a|de|que)?\s*(-?[\d\s.,]+)/.exec(n)) && /\b(colore|couleur|surligne|mets? en|met en|rouge|vert|jaune|bleu|orange)\b/.test(n)){
    const v = parseNumberFr(m[2]); const op = /^(sup|plus grand|au dessus|>)/.test(m[1]) ? 'gt' : /^(inf|plus petit|en dessous|<)/.test(m[1]) ? 'lt' : 'eq';
    const c = FILL_FR.find(([w]) => hasW(n, w)) || ['vert', '#CFF5E7']; const fc = COLOR_FR.find(([w]) => w === c[0])?.[1];
    return [{t:`Colorer en ${c[0]} les valeurs ${op === 'gt' ? 'supérieures à' : op === 'lt' ? 'inférieures à' : 'égales à'} ${fmtGeneral(v)}`, run:() => { const sh = sh0(), rr = cfRange(); tx('Couleurs automatiques', () => sh.cf.push({range:rr, type:op, a:v, style:{bg:c[1], fc:mix(fc || '#1A1726', '#000000', .35)}})); }}]; }
  if (/\b(degrade|carte de chaleur|heatmap)\b/.test(n)) return [{t:'Dégradé de couleurs', run:() => addCf('scale')}];
  if (/\bbarres? de donnees\b|\bdonnees? en barres?\b/.test(n)) return [{t:'Barres de données', run:() => addCf('bar')}];
  if (/\bdoublons?\b/.test(n)) return /\b(supprime|enleve|retire|efface)\w*\b/.test(n) ? [{t:'Supprimer les doublons', run:removeDuplicates}] : [{t:'Surligner les doublons', run:() => addCf('dup')}];
  // formats
  if (/\b(euros?|€|monetaire|devise)\b/.test(n)) add('Format euros', () => styleSel({nf:/sans (les )?centimes|entier/.test(n) ? '#,##0 €' : '#,##0.00 €'}, 'Format'));
  if (/\b(pourcentage|pourcent|%)\b/.test(n) && !/\bpart\b/.test(n)) add('Format pourcentage', () => styleSel({nf:'0%'}, 'Format'));
  if (/\bformat\s+date\b|\ben date\b/.test(n)) add('Format date', () => styleSel({nf:'dd/mm/yyyy'}, 'Format'));
  if ((m = /(\d)\s*decimales?/.exec(n))) add(`${m[1]} décimale${+m[1] > 1 ? 's' : ''}`, () => styleSel({nf:'#,##0' + (+m[1] ? '.' + '0'.repeat(+m[1]) : '')}, 'Décimales'));
  if (/\bgras\b/.test(n)) add('Gras', () => styleSel({b:1}));
  if (/\bitalique\b/.test(n)) add('Italique', () => styleSel({i:1}));
  if (/\bfond\b|\bsurlign/.test(n)){ const c = FILL_FR.find(([w]) => hasW(n, w)); if (c) add(`Fond ${c[0]}`, () => styleSel({bg:c[1]}, 'Remplissage')); }
  else { const c = COLOR_FR.find(([w]) => hasW(n, w)); if (c && /\b(en|texte|couleur|ecris|mets|met)\b/.test(n)) add(`Texte en ${c[0]}`, () => styleSel({fc:c[1]}, 'Couleur')); }
  if (/\b(centre|centrer|au milieu)\b/.test(n)) add('Centrer', () => styleSel({ha:'c'}, 'Alignement'));
  if (/\ba droite\b/.test(n)) add('Aligner à droite', () => styleSel({ha:'r'}, 'Alignement'));
  if (/\bbordures?\b/.test(n)) add('Bordures', () => applyBorders(/\bcontour\b/.test(n) ? 'out' : /\b(aucune|sans|retire|enleve)\b/.test(n) ? 'none' : 'all'));
  if (/\bfusionn?e\w*\b/.test(n)) add('Fusionner et centrer', toggleMerge);
  if (out.length) return out;
  // lignes et colonnes
  if ((m = /\b(insere|ajoute|rajoute)\w*\s+(\d+|une?|deux|trois|quatre|cinq|dix)?\s*(lignes?|colonnes?)\b/.exec(n))){ const k = m[2] ? (numOf(m[2]) || 1) : 1; return /^ligne/.test(m[3]) ? [{t:`Insérer ${k} ligne${k > 1 ? 's' : ''} au-dessus`, run:() => insertRows(SEL.r1, k)}] : [{t:`Insérer ${k} colonne${k > 1 ? 's' : ''} à gauche`, run:() => insertCols(SEL.c1, k)}]; }
  if ((m = /\b(supprime|efface|enleve)\w*\s+(?:la |les )?(lignes?|colonnes?)\b/.exec(n))) return /^ligne/.test(m[2]) ? [{t:'Supprimer les lignes sélectionnées', run:() => deleteRows(SEL.r1, SEL.r2 - SEL.r1 + 1 > 10000 ? 1 : SEL.r2 - SEL.r1 + 1)}] : [{t:'Supprimer les colonnes sélectionnées', run:() => deleteCols(SEL.c1, SEL.c2 - SEL.c1 + 1 > 1000 ? 1 : SEL.c2 - SEL.c1 + 1)}];
  if (/\b(fige|figer|bloque)\w*\b/.test(n)) return [{t:/premiere colonne/.test(n) ? 'Figer la première colonne' : /ici|cellule|jusqu/.test(n) ? 'Figer jusqu\'à la cellule' : 'Figer la première ligne', run:() => tx('Figer', () => { sh0().freeze = /premiere colonne/.test(n) ? {r:0, c:1} : /ici|cellule|jusqu/.test(n) ? {r:SEL.r, c:SEL.c} : {r:1, c:0}; })}];
  if (/\b(libere|defige|debloque)\w*\b/.test(n)) return [{t:'Libérer les volets', run:() => tx('Libérer les volets', () => { sh0().freeze = {r:0, c:0}; })}];
  if (/\b(largeur|ajuste)\w*\s+(auto|automatique|les colonnes)\b/.test(n)) return [{t:'Largeur automatique des colonnes', run:() => autofitCols(range(0, sh0().used().c))}];
  if (/\b(liste deroulante|menu deroulant)\b/.test(n)) return [{t:'Liste déroulante…', run:dvDialog}];
  if (/\bcases? a cocher\b/.test(n)) return [{t:'Cases à cocher', run:makeCheckboxes}];
  // thème, export, zoom, annuler
  const th = THEMES.find(t => hasW(n, nrmTxt(t.name)) || hasW(n, t.id)); if (th && /\b(theme|style|couleurs?)\b/.test(n)) return [{t:'Thème ' + th.name, run:() => { tx('Thème', () => { WB.theme = {id:th.id}; }, {full:true}); WB.recalc(); afterChange(true); }}];
  if (/\b(export\w*|telecharg\w*|enregistre\w* (en|sous))\b/.test(n)){ const k = /\b(excel|xlsx)\b/.test(n) ? 'xlsx' : /\bpdf\b/.test(n) ? 'pdf' : /\bcsv\b/.test(n) ? 'csv' : /\b(html|web)\b/.test(n) ? 'html' : ''; if (k) return [{t:'Exporter en ' + {xlsx:'Excel', pdf:'PDF', csv:'CSV', html:'page web'}[k], run:() => doExport(k)}]; }
  if (/^imprim/.test(n)) return [{t:'Imprimer', run:() => printSheet(false)}];
  if ((m = /\bzoom\w*\s*(?:a|de)?\s*(\d{2,3})/.exec(n))){ const z = clamp(+m[1], 50, 200); return [{t:`Zoom ${z} %`, run:() => setZoom(z / 100)}]; }
  if (/^(annule|annuler|defais)/.test(n)) return [{t:'Annuler', run:undo}];
  if (/^(retablis|refais)/.test(n)) return [{t:'Rétablir', run:redo}];
  return null;
}
const numOf = s => /^\d+$/.test(s) ? +s : ({un:1, une:1, deux:2, trois:3, quatre:4, cinq:5, six:6, dix:10})[s] || NaN;
function parseIntent(raw){
  const s = String(raw || '').trim(); if (s.length < 2) return null;
  const parts = s.split(/\s*(?:;|,?\s+puis\s+|,?\s+ensuite\s+|,?\s+et apr[eè]s\s+)\s*/i).filter(Boolean);
  if (parts.length > 1){ const all = parts.map(parseCalc); if (all.every(Boolean)) return all.flat(); }
  return parseCalc(s);
}
function runIntents(list){ list.forEach((a, i) => setTimeout(() => { try { a.run(); } catch(e){ console.warn(e); } }, 10 + i * 60)); }
/* ---------- interface du Spectre ---------- */
function openSpectre(){ if (EDIT.on) commitEdit(0, 0); closePop(); g$('spectre').hidden = false; const q = g$('spQ'); q.value = ''; SPX.all = spectreActions(); SPX.i = 0; drawSpectre(); setTimeout(() => q.focus(), 10); }
function closeSpectre(){ g$('spectre').hidden = true; g$('spectre').classList.remove('ai'); AIS.ctl++; AIS.busy = false; g$('grid').focus({preventScroll:true}); }
const AI_QUICK = [
  {t:'Analyser ces données', p:'Analyse les données sélectionnées (ou le tableau autour) : tendances, valeurs remarquables, totaux utiles. Ajoute un petit bloc de synthèse à droite du tableau avec les formules adaptées.'},
  {t:'Ajouter les totaux et moyennes', p:'Ajoute une ligne de totaux (et une ligne de moyennes si utile) sous le tableau, avec les bonnes formules et le bon format.'},
  {t:'Créer le graphique le plus parlant', p:'Crée le graphique le plus adapté pour présenter ce tableau, avec un titre clair.'},
  {t:'Colorer ce qui compte', p:'Ajoute des couleurs automatiques utiles sur ce tableau (valeurs élevées ou faibles, retards, négatifs…).'},
  {t:'Écrire une formule…', prefill:'Écris une formule qui '},
  {t:'Créer un tableau…', prefill:'Crée un tableau pour '},
];
function spAiItem(q){ return {g:'IA', t:q ? `Demander à l'IA : « ${q.length > 70 ? q.slice(0, 68) + '…' : q} »` : 'Demander à l\'IA', ai:true, run:() => aiAsk(q)}; }
function drawSpectre(){
  g$('spectre').classList.remove('ai'); AIS.ctl++; AIS.busy = false;
  const raw = g$('spQ').value.trim(), q = nrmTxt(raw), words = q.split(/\s+/).filter(Boolean); let l, head = '';
  if (words.length){
    const fz = SPX.all.map(a => { const hay = nrmTxt(a.t + ' ' + a.g + ' ' + a.k); if (!words.every(w => hay.includes(w))) return null; const tt = nrmTxt(a.t); return {...a, sc:tt.startsWith(words[0]) ? 0 : tt.includes(words[0]) ? 1 : 2}; }).filter(Boolean).sort((a, b) => a.sc - b.sc);
    const it = parseIntent(raw); l = [];
    if (it) l.push({g:'Compris', t:it.map(a => a.t).join(' · '), run:() => runIntents(it), intent:true});
    const ai = raw.length >= 3 ? spAiItem(raw) : null;
    if (ai && !it && (!fz.length || words.length >= 3)) l.push(ai, ...fz.slice(0, 40)); else { l.push(...fz.slice(0, 40)); if (ai) l.push(ai); }
  } else {
    l = [...AI_QUICK.map(x => ({g:'IA', t:x.t, ai:true, prefill:x.prefill, run:() => aiAsk(x.p)})), ...SP_START.map(t => SPX.all.find(a => a.t === t)).filter(Boolean)];
    head = `<p class="sp-h">Suggestions <small>Écrivez aussi une phrase : « total de la colonne prix », « trie par date », « graphique en courbes », « colore en vert les valeurs supérieures à 1000 »…</small></p>`;
  }
  SPX.items = l.slice(0, 60); SPX.i = clamp(SPX.i, 0, Math.max(0, SPX.items.length - 1));
  g$('spList').innerHTML = head + (SPX.items.length ? SPX.items.map((a, i) => `<button type="button" data-sp="${i}" class="${i === SPX.i ? 'on' : ''}${a.ai ? ' k-ai' : ''}${a.intent ? ' k-do' : ''}" role="option">${a.ai ? '<i class="sp-ai">✦</i>' : a.intent ? '<i class="sp-do">↵</i>' : ''}<span>${escH(a.t)}</span><small>${escH(a.intent ? 'Entrée pour exécuter' : a.g)}</small></button>`).join('') : '<p class="sp-none">Rien ne correspond.</p>');
  g$('spList').querySelector('.on')?.scrollIntoView({block:'nearest'});
}
function runSpectre(i){
  const a = SPX.items[i]; if (!a) return;
  if (a.prefill){ const q = g$('spQ'); q.value = a.prefill; q.focus(); q.setSelectionRange(q.value.length, q.value.length); SPX.i = 0; drawSpectre(); return; }
  if (a.ai) return a.run();
  closeSpectre(); setTimeout(() => a.run(), 10);
}
/* ---------- l'IA ---------- */
function aiContext(){
  const sh = sh0(), u = sh.used(); const g = SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2 ? currentRegion(SEL.r, SEL.c) : {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, u.r), c2:Math.min(SEL.c2, u.c)};
  const dump = (r1, c1, r2, c2, maxR = 80, maxC = 26) => { const lines = []; for (let r = r1; r <= Math.min(r2, r1 + maxR - 1); r++){ const row = []; for (let c = c1; c <= Math.min(c2, c1 + maxC - 1); c++){ const cell = sh.get(r, c); if (!cell && WB.val(sh, r, c) == null) continue; const v = WB.val(sh, r, c); row.push(`${A1(r, c)}=${cell?.ast ? cell.raw + ' → ' : ''}${v == null ? '' : formatValue(v, cell?.s?.nf).t}`); } if (row.length) lines.push(row.join(' | ')); } return lines.join('\n'); };
  return {title:WB.title, sheet:sh.name, sheets:WB.sheets.map(s => s.name).join(', '), active:A1(SEL.r, SEL.c), selection:rangeA1({...SEL, r2:Math.min(SEL.r2, Math.max(u.r, SEL.r1)), c2:Math.min(SEL.c2, Math.max(u.c, SEL.c1))}), region:rangeA1(g), used:u.r || u.c || sh.cells.size ? rangeA1({r1:0, c1:0, r2:u.r, c2:u.c}) : 'vide',
    data:dump(g.r1, g.c1, g.r2, g.c2), sheetData:(g.r2 - g.r1 < 60 ? dump(0, 0, u.r, u.c, 60, 20) : ''), empty:!sh.cells.size, themes:THEMES.map(t => t.id).join(', ')};
}
async function aiAsk(prompt){
  prompt = String(prompt || '').trim(); if (!prompt){ g$('spQ').focus(); return; }
  const box = g$('spList'); g$('spectre').hidden = false; g$('spectre').classList.add('ai');
  if (!window.SWAI || !window.SWAI.available()) return aiShow({err:window.SWAI?.why?.() || 'L\'IA de SPECTRA Calc fonctionne sur le site en ligne, avec un compte Studio Prism.'});
  AIS.busy = true; AIS.prompt = prompt; AIS.res = null; const ctl = ++AIS.ctl; AIS.ctx = aiContext();
  box.innerHTML = `<div class="ai-view"><p class="ai-q">${escH(prompt)}</p><div class="ai-wait"><i></i><span>Spectra prépare votre demande…</span></div></div>`;
  try {
    const res = await window.SWAI.run(prompt, AIS.ctx, sec => { if (ctl !== AIS.ctl) return; const w = g$('spList').querySelector('.ai-wait span'); if (!w) return; let k = sec; const tick = () => { if (ctl !== AIS.ctl || !w.isConnected) return; w.textContent = k > 0 ? `Quota gratuit atteint : nouvel essai automatique dans ${k} s…` : 'Spectra prépare votre demande…'; if (k-- > 0) setTimeout(tick, 1000); }; tick(); });
    if (ctl !== AIS.ctl || g$('spectre').hidden) return; AIS.res = res; aiShow(res);
  } catch(e){ if (ctl === AIS.ctl) aiShow({err:e?.message || String(e)}); }
  finally { if (ctl === AIS.ctl) AIS.busy = false; }
}
const ACT_LABEL = {set:'Remplir', formula:'Formule', style:'Mise en forme', table:'Embellir', chart:'Graphique', cf:'Couleurs automatiques', sort:'Trier', sheet:'Nouvelle feuille', width:'Largeur', freeze:'Figer', filter:'Filtre', dv:'Liste déroulante', theme:'Thème', merge:'Fusion', select:'Sélection'};
function aiShow(res){
  const box = g$('spList');
  if (res.err){ box.innerHTML = `<div class="ai-view"><p class="ai-q">${escH(AIS.prompt || '')}</p><div class="ai-err"><b>L'IA n'a pas pu répondre</b><p>${escH(res.err)}</p></div><div class="ai-acts"><button type="button" class="ap-btn alt" data-ai="back">Retour</button>${AIS.prompt && window.SWAI?.available() ? '<button type="button" class="ap-btn" data-ai="retry">Réessayer</button>' : ''}</div></div>`; return; }
  const acts = (res.actions || []).filter(a => ACT_LABEL[a.do]);
  const chips = acts.map(a => `${ACT_LABEL[a.do]}${a.at ? ' ' + a.at : a.range ? ' ' + a.range : a.name ? ' « ' + a.name + ' »' : ''}`);
  const sets = acts.filter(a => a.do === 'set' && Array.isArray(a.values)).slice(0, 2);
  const prev = sets.map(a => `<table class="ai-tbl">${a.values.slice(0, 14).map((row, i) => `<tr>${(Array.isArray(row) ? row : [row]).slice(0, 10).map(v => `<${i === 0 ? 'th' : 'td'}>${escH(String(v ?? ''))}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</table>${a.values.length > 14 ? `<p class="ai-foot">… ${a.values.length - 14} ligne(s) de plus</p>` : ''}`).join('');
  const fm = acts.filter(a => a.do === 'formula').slice(0, 3).map(a => `<code class="ai-f">${escH(a.at)} : ${escH(a.formula)}</code>`).join('');
  box.innerHTML = `<div class="ai-view"><p class="ai-q">${escH(AIS.prompt)}</p>${res.reply ? `<p class="ai-reply">${escH(res.reply)}</p>` : ''}${chips.length ? `<ul class="ai-chips">${chips.map(c => `<li>${escH(c)}</li>`).join('')}</ul>` : ''}${fm}${prev ? `<div class="ai-prev">${prev}</div>` : ''}
    <div class="ai-acts"><button type="button" class="ap-btn alt" data-ai="back">Retour</button><button type="button" class="ap-btn alt" data-ai="retry">Autre proposition</button>${acts.length ? '<button type="button" class="ap-btn" data-ai="apply">Appliquer</button>' : ''}</div>
    <p class="ai-foot">Généré par l'IA : vérifiez les chiffres importants. Ctrl + Z annule tout d'un coup.</p></div>`;
  box.querySelector('[data-ai="apply"]')?.focus();
}
function aiApply(){
  const res = AIS.res; if (!res) return; closeSpectre(); const acts = (res.actions || []).filter(a => ACT_LABEL[a.do]); let target = null;
  const okRange = x => x && parseRange(String(x)) ? parseRange(String(x)) : null;
  tx('Assistant IA', () => {
    for (const a of acts){ try {
      let sh = a.sheet ? WB.byName(a.sheet) : sh0();
      if (a.do === 'sheet'){ const nm = uniqueSheetName(String(a.name || 'Feuille').slice(0, 31)); WB.addSheet(nm); WB.active = WB.sheets.length - 1; continue; }
      if (!sh) sh = sh0();
      if (a.do === 'set'){ const p = parseA1(a.at || 'A1'); if (!p) continue; (a.values || []).slice(0, 2000).forEach((row, i) => (Array.isArray(row) ? row : [row]).slice(0, 100).forEach((v, j) => { if (v === null || v === undefined) return; sh.setRaw(p.r + i, p.c + j, String(v)); })); const h = (a.values || []).length, w = Math.max(1, ...(a.values || []).map(r => Array.isArray(r) ? r.length : 1)); target = {r1:p.r, c1:p.c, r2:p.r + h - 1, c2:p.c + w - 1}; }
      if (a.do === 'formula'){ const p = parseA1(a.at); if (!p || !a.formula) continue; const f = String(a.formula).startsWith('=') ? a.formula : '=' + a.formula; sh.setRaw(p.r, p.c, f); const fill = okRange(a.fill); if (fill){ for (let r = fill.r1; r <= Math.min(fill.r2, fill.r1 + 5000); r++) for (let c = fill.c1; c <= fill.c2; c++) if (r !== p.r || c !== p.c) sh.setRaw(r, c, '=' + shiftFormula(f.slice(1), r - p.r, c - p.c)); } if (!target) target = fill || {r1:p.r, c1:p.c, r2:p.r, c2:p.c}; }
      if (a.do === 'style'){ const g = okRange(a.range); if (!g) continue; const st = {}; const S0 = a.style || {}; for (const k of ['b', 'i', 'u', 'wrap']) if (S0[k]) st[k] = 1; for (const k of ['fc', 'bg']) if (/^#[0-9a-f]{3,6}$/i.test(S0[k] || '')) st[k] = S0[k]; if (S0.nf) st.nf = String(S0.nf); if (['l', 'c', 'r'].includes(S0.ha)) st.ha = S0.ha; if (+S0.fs) st.fs = +S0.fs; for (let r = g.r1; r <= Math.min(g.r2, g.r1 + 5000); r++) for (let c = g.c1; c <= g.c2; c++) sh.setStyle(r, c, st); }
      if (a.do === 'width'){ const c = typeof a.col === 'string' ? colIdx(a.col) : +a.col; if (c >= 0 && +a.w > 10) sh.cw[c] = Math.min(600, +a.w); }
      if (a.do === 'freeze'){ sh.freeze = {r:Math.max(0, +a.r || 0), c:Math.max(0, +a.c || 0)}; }
      if (a.do === 'merge'){ const g = okRange(a.range); if (g) sh.merges.push(g); }
      if (a.do === 'table'){ const g = okRange(a.range); if (g){ sh.tables = sh.tables.filter(t => t.range !== rangeA1(g)); sh.tables.push({range:rangeA1(g), color:a.color || '', header:a.header !== false, banded:true, total:!!a.total}); for (let c = g.c1; c <= g.c2; c++) if (!sh.cw[c]) sh.cw[c] = 120; } }
      if (a.do === 'chart'){ const parts = String(a.range || '').split(/[;,]/).map(x => parseRange(x.trim())).filter(Boolean); if (!parts.length) continue; const last = parts[parts.length - 1]; const pos = contentXY(parts[0].r1, last.c2 + 2); sh.charts.push({id:uidS(), type:CHART_TYPES.some(x => x[0] === a.type) ? a.type : 'col', range:a.range, title:a.title || '', x:pos.x + 10, y:pos.y, w:480, h:300, legend:true}); }
      if (a.do === 'cf'){ const g = okRange(a.range); if (!g) continue; const rule = {range:rangeA1(g), type:a.type || 'scale'}; if (a.a != null) rule.a = a.type === 'formula' ? String(a.a).replace(/^=/, '') : a.a; if (a.b != null) rule.b = a.b; if (a.style) rule.style = {bg:a.style.bg, fc:a.style.fc, b:a.style.b ? 1 : undefined}; if (a.colors) rule.colors = a.colors; if (a.color) rule.color = a.color; sh.cf.push(rule); }
      if (a.do === 'sort'){ const g = okRange(a.range); if (!g) continue; const c = typeof a.col === 'string' ? colIdx(a.col) : +a.col; if (c >= g.c1 && c <= g.c2) sortRows(sh, g, [{c, asc:a.asc !== false}]); }
      if (a.do === 'filter'){ const g = okRange(a.range); if (g) sh.filter = {range:rangeA1(g), crit:{}}; }
      if (a.do === 'dv'){ const g = okRange(a.range); if (g && Array.isArray(a.list)) sh.dv.push({range:rangeA1(g), list:a.list.map(String).slice(0, 100), colors:a.colors && typeof a.colors === 'object' ? a.colors : null}); }
      if (a.do === 'theme' && THEMES.some(t => t.id === a.id)) WB.theme = {id:a.id};
      if (a.do === 'select'){ const g = okRange(a.range); if (g) target = g; }
    } catch(e){ console.warn('[SPECTRA Calc] action IA', a, e); } }
  }, {full:true});
  WB.recalc(); V.nr = 120; V.nc = 26; layout(); renderTabs();
  if (target) selectRange(target, {r:target.r1, c:target.c1}); else schedule();
  toast(res.reply ? res.reply.slice(0, 140) : 'Fait');
}
