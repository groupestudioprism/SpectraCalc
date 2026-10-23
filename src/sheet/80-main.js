/* ---------- Démarrage du tableur, liens avec le cloud (window.SWEditor), raccourcis ---------- */
const E2 = {userLib:{}, ro:false, loaded:false};
function getJSON(){ const j = WB.toJSON(); j.sheets.forEach((s, i) => { delete s.selSave; }); return JSON.stringify(j); }
function parseWB(data){
  let j = null; try { j = typeof data === 'string' ? JSON.parse(data || '{}') : data; } catch(e){ j = null; }
  if (!j || typeof j !== 'object' || !Array.isArray(j.sheets)) j = {v:1, app:'spectracalc', title:'Classeur sans titre', theme:{id:'spectra'}, sheets:[TS('Feuille 1')]};
  return j;
}
/* aperçu (cartes de l'accueil, Communauté) : le haut de la première feuille */
const PREV_CACHE = new Map();
function previewOfJSON(j, rows = 16, cols = 7){
  const w = new Workbook(); try { w.load(j); } catch(e){ return ''; }
  const sh = w.sheets[w.active] || w.sheets[0]; const keep = WB; WB = w;
  let html = ''; try { html = `<div class="sc-prev" style="--cfont:${fontStack(themeVals(w.theme).fb).replace(/"/g, "'")}">${sheetHTML(sh, {maxR:rows - 1, maxC:cols - 1})}</div>`; } catch(e){ console.warn(e); } finally { WB = keep; }
  return html.length > 5900 ? previewOfJSON(j, Math.max(4, rows - 5), Math.max(3, cols - 1)) : html;
}
function metaOf(json){ const j = parseWB(json); const cells = j.sheets.reduce((n, s) => n + Object.keys(s.cells || {}).length, 0);
  return {preview:previewOfJSON(j), theme:themeKey(j.theme || {id:'spectra'}), words:cells, pageSize:'grille'}; }
function textOfJSON(json){ const j = parseWB(json); return j.sheets.map(s => Object.values(s.cells || {}).map(v => typeof v === 'object' ? v.r : v).join(' ')).join(' '); }
function tplJSON(t){ return t.build ? t.build() : parseWB(t.data); }
function fromTemplate(id, lib){
  const mine = (lib?.templates || []).find(x => x.id === id);
  if (mine) return JSON.stringify({...parseWB(mine.data), tpl:id});
  const t = SC_TEMPLATES.find(x => x.id === id) || SC_TEMPLATES[0];
  const j = tplJSON(t); j.tpl = t.id; return JSON.stringify(j);
}
function tplMini(t){ let h = PREV_CACHE.get(t.id); if (!h){ h = previewOfJSON(t.build ? t.build() : parseWB(t.data), 14, 6); PREV_CACHE.set(t.id, h); } return `<div class="mini"><div class="mini-page swdoc">${h}</div></div>`; }
/* les cartes de modèles de l'accueil lisent t.html : aperçu calculé à la demande */
for (const t of window.SW_TEMPLATES){ if (t.id === 'blank') continue; Object.defineProperty(t, 'html', {get(){ let h = PREV_CACHE.get(t.id); if (!h){ h = previewOfJSON(SC_TEMPLATES.find(x => x.id === t.id).build(), 14, 6); PREV_CACHE.set(t.id, h); } return h; }}); t.theme = {id:t.theme}; }
function load(data, opts = {}){
  if (EDIT.on) closeEdit();
  const j = parseWB(data); WB = new Workbook(); WB.load(j); if (opts.name && (!j.title || j.title === 'Classeur sans titre')) WB.title = opts.name;
  UNDO.list = []; UNDO.i = -1; CLIP.box = null; CLIP.cells = null; OBJ.sel = null; FR.hits = [];
  Object.assign(SEL, {r:0, c:0, r1:0, c1:0, r2:0, c2:0, ar:0, ac:0});
  V.ro = !!opts.readOnly; E2.ro = V.ro; document.body.classList.toggle('ro', V.ro);
  const ti = g$('docTitle'); ti.value = WB.title; ti.readOnly = V.ro || opts.canRename === false;
  const sub = g$('docSub'); sub.textContent = opts.owner ? `Partagé par ${opts.owner}${V.ro ? ' · lecture seule' : ''}` : V.ro ? 'Lecture seule' : ''; sub.hidden = !sub.textContent;
  closePop(); closeFind(); if (panel) openPanel(panel);
  V.nr = 120; V.nc = 26; V.z = lsGet('sc.zoom') || (innerWidth < 700 ? .9 : 1);
  applyThemeCss(); renderTabs();
  requestAnimationFrame(() => { layout(); g$('gScroll').scrollTo(0, 0); render(); selChanged(); refreshToolbar(); document.fonts?.ready.then(() => { layout(); schedule(); }); });
  E2.loaded = true;
}
function setReadOnly(ro){ V.ro = ro; document.body.classList.toggle('ro', ro); }
/* après chaque modification : recalcul, rendu, enregistrement automatique */
const emitSoon = debounce(() => window.dispatchEvent(new CustomEvent('sw:changed')), 300);
function emitChange(now){ if (V.ro) return; now ? window.dispatchEvent(new CustomEvent('sw:changed')) : emitSoon(); }
function afterChange(full){
  WB.recalc(); if (sh0().filter) applyFilter(sh0());
  if (full){ V.nr = Math.max(120, V.nr); }
  layout(); schedule(); renderTabs(); emitChange(); selChangedSoon(); if (panel === 'cf' || panel === 'data') renderPanel();
  if (!EDIT.on) syncBar();
}
function setZoom(z){ V.z = clamp(Math.round(z * 100) / 100, .5, 2); lsSet('sc.zoom', V.z); layout(); schedule(); g$('zoomVal') && (g$('zoomVal').textContent = Math.round(V.z * 100) + ' %'); toast(`Zoom ${Math.round(V.z * 100)} %`); }
function tplChoice(id){
  const t = [...(E2.userLib.templates || []), ...SC_TEMPLATES].find(x => x.id === id); if (!t) return;
  SWDlg.open(`<h3>${escH(t.name)}</h3><p class="dlg-p">${escH(t.desc || '')}</p><div class="dlg-acts"><button type="button" class="ap-btn alt" id="tcAdd"${V.ro ? ' disabled' : ''}>Ajouter ses feuilles ici</button><button type="button" class="ap-btn" id="tcNew">Nouveau classeur</button></div>`, d => {
    d.querySelector('#tcNew').onclick = () => { SWDlg.close(); window.SWHome?.newDoc(id); };
    d.querySelector('#tcAdd').onclick = () => { SWDlg.close(); const j = JSON.parse(fromTemplate(id, E2.userLib)); wbOp('Ajouter un modèle', () => { for (const so of j.sheets){ const s = WB.addSheet(uniqueSheetName(so.name)); s.load({...so, name:s.name}); } WB.active = WB.sheets.length - j.sheets.length; }); toast('Feuilles du modèle ajoutées · Ctrl + Z pour annuler'); };
  });
}
function saveTplDlg(){ SWAsk('Enregistrer comme modèle', 'Nom du modèle', WB.title, 'Enregistrer', async v => { await SWHome.saveTemplate(v); }); }
function filePop(anchor){
  openPop(anchor, `<div class="pop-menu">
    <button type="button" data-f="new"><b>Nouveau classeur</b><span>Vierge ou à partir d'un modèle</span></button>
    <button type="button" data-f="dup"><b>Dupliquer</b><span>Une copie, ouverte tout de suite</span></button>
    <button type="button" data-f="import"><b>Ouvrir un fichier</b><span>Excel (.xlsx), CSV ou SPECTRA Calc → nouveau classeur</span></button>
    <button type="button" data-f="ins"><b>Importer des feuilles ici</b><span>Ajoute les feuilles d'un fichier Excel ou CSV</span></button>
    <button type="button" data-f="share"><b>Partager…</b><span>Par email ou par lien, en lecture ou modification</span></button>
    <button type="button" data-f="tpl"><b>Enregistrer comme modèle</b><span>Dans vos modèles personnels</span></button>
    <button type="button" data-f="publish"><b>Publier dans la Communauté</b><span>Proposez ce classeur comme modèle public, vérifié par Studio Prism</span></button>
    <hr><button type="button" data-f="print"><b>Imprimer</b><span>La feuille active</span></button>
    <button type="button" data-f="zoom"><b>Zoom</b><span>${Math.round(V.z * 100)} % · Ctrl + molette</span></button>
    <button type="button" data-f="keys"><b>Raccourcis clavier</b><span>Saisie, formules, sélection</span></button>
    <hr><button type="button" data-f="home"><b>Retour à l'accueil</b><span>Vos classeurs et modèles</span></button></div>`, p => {
    p.onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; closePop(); const k = b.dataset.f;
      if (k === 'new') window.SWHome?.show('templates'); else if (k === 'dup') window.SWHome?.duplicateCurrent(); else if (k === 'import') g$('homeFile').click(); else if (k === 'ins') g$('edInsFile').click();
      else if (k === 'share') window.SWShareCurrent?.(); else if (k === 'tpl') saveTplDlg(); else if (k === 'publish') window.SWHome?.publishCurrent?.(); else if (k === 'print') printSheet(false); else if (k === 'keys') shortcutsDlg(); else if (k === 'home') window.SWHome?.show('home');
      else if (k === 'zoom') zoomPop(anchor); };
  }, 'menu');
}
function zoomPop(anchor){ openPop(anchor, `<p class="pop-h">Zoom</p><div class="pop-sizes">${[50, 75, 90, 100, 110, 125, 150, 200].map(z => `<button type="button" data-z="${z}" style="${Math.round(V.z * 100) === z ? 'background:var(--ink);color:var(--panel)' : ''}">${z} %</button>`).join('')}</div>`, p => { p.onclick = e => { const b = e.target.closest('[data-z]'); if (b){ closePop(); setZoom(+b.dataset.z / 100); } }; }); }
function shortcutsDlg(){
  const k = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
  SWDlg.open(`<h3>Raccourcis et astuces</h3><div class="sc-wrap"><table class="sc">
    ${k('Taper directement', 'Remplace le contenu de la cellule · <kbd>F2</kbd> ou double-clic pour le modifier')}
    ${k('<kbd>=</kbd>', 'Commence une formule : cliquez sur des cellules pour les ajouter, <kbd>F4</kbd> pour les $')}
    ${k('<kbd>Entrée</kbd> · <kbd>Tab</kbd>', 'Valider et descendre · valider et aller à droite')}
    ${k('<kbd>Alt</kbd> <kbd>Entrée</kbd>', 'Retour à la ligne dans la cellule')}
    ${k('<kbd>Ctrl</kbd> <kbd>Entrée</kbd>', 'Remplir toute la sélection avec la saisie')}
    ${k('<kbd>Alt</kbd> <kbd>=</kbd>', 'Somme automatique')}
    ${k('<kbd>Ctrl</kbd> <kbd>flèche</kbd>', 'Aller au bout des données · avec <kbd>Maj</kbd> pour sélectionner')}
    ${k('<kbd>Ctrl</kbd> <kbd>A</kbd>', 'Sélectionner le tableau, puis toute la feuille')}
    ${k('<kbd>Ctrl</kbd> <kbd>C</kbd> / <kbd>X</kbd> / <kbd>V</kbd>', 'Copier, couper, coller (aussi depuis Excel et Google Sheets)')}
    ${k('<kbd>Ctrl</kbd> <kbd>D</kbd> · <kbd>Ctrl</kbd> <kbd>R</kbd>', 'Recopier vers le bas · vers la droite')}
    ${k('Poignée ▪ en bas à droite', 'Glisser pour recopier ou prolonger une suite (1, 2, 3… · lundi, mardi… · janvier…) · double-clic pour recopier jusqu\'au bout')}
    ${k('<kbd>Ctrl</kbd> <kbd>;</kbd>', 'Date du jour · <kbd>Ctrl</kbd> <kbd>Maj</kbd> <kbd>;</kbd> heure')}
    ${k('<kbd>Ctrl</kbd> <kbd>B</kbd> / <kbd>I</kbd> / <kbd>U</kbd>', 'Gras, italique, souligné')}
    ${k('<kbd>Ctrl</kbd> <kbd>Z</kbd> · <kbd>Ctrl</kbd> <kbd>Y</kbd>', 'Annuler · rétablir')}
    ${k('<kbd>Ctrl</kbd> <kbd>F</kbd> · <kbd>Ctrl</kbd> <kbd>H</kbd>', 'Rechercher · remplacer')}
    ${k('<kbd>Ctrl</kbd> <kbd>Pg Suiv</kbd>', 'Feuille suivante')}
    ${k('<kbd>Ctrl</kbd> <kbd>K</kbd>', 'Le Spectre : tapez ce que vous voulez faire, en français, ou demandez à l\'IA')}
  </table></div><div class="dlg-acts"><button type="button" class="ap-btn" data-dlg="close">Compris</button></div>`, null, 'wide');
}
function globalKeys(e){
  if (g$('app').hidden) return;
  const k = e.key, mod = e.ctrlKey || e.metaKey, lk = k.length === 1 ? k.toLowerCase() : k;
  if (mod && (lk === 'k' || k === '/')){ e.preventDefault(); return g$('spectre').hidden ? openSpectre() : closeSpectre(); }
  if (k === 'Escape'){
    if (!g$('spectre').hidden){ if (g$('spectre').classList.contains('ai') && document.activeElement !== g$('spQ')){ drawSpectre(); return g$('spQ').focus(); } return closeSpectre(); }
    if (!g$('edPop').hidden) return closePop(); if (!g$('apDlg').hidden) return; if (panel) return openPanel(panel); if (!g$('findBar').hidden) return closeFind(); if (OBJ.sel){ OBJ.sel = null; renderObjects(); return; }
  }
  if (mod && lk === 'p'){ e.preventDefault(); return printSheet(false); }
  if (mod && lk === 's'){ e.preventDefault(); window.SWHome?.flush?.(); return toast('Enregistré automatiquement'); }
  if (OBJ.sel && (k === 'Delete' || k === 'Backspace') && document.activeElement === g$('grid') && !EDIT.on){ e.preventDefault(); return deleteChart(OBJ.sel); }
  if (!g$('spectre').hidden || !g$('apDlg').hidden || !g$('findBar').hidden && g$('findBar').contains(document.activeElement)) return;
  const ae = document.activeElement; if (ae && ae !== document.body && ae !== g$('grid') && !g$('grid').contains(ae) && ae !== g$('fxIn')) return;
  if (ae === g$('fxIn')) return;
  onGridKey(e);
}
function wire(){
  buildToolbar();
  const view = g$('gView'), sc = g$('gScroll');
  sc.addEventListener('scroll', () => { schedule(); if (OBJ.sel) placeObjBar(); }, {passive:true});
  view.addEventListener('mousedown', e => { if (onObjDown(e)) return; if (OBJ.sel && !e.target.closest('.g-obj')){ OBJ.sel = null; renderObjects(); } onGridDown(e); });
  addEventListener('mousemove', e => { if (onObjMove(e)) return; if (DRAG.mode || e.target.closest?.('#gView')) onGridMove(e); });
  addEventListener('mouseup', e => { if (onObjUp(e)) return; onGridUp(e); });
  view.addEventListener('dblclick', e => { const o = e.target.closest('.g-obj'); if (o){ e.preventDefault(); return chartEditor(o.dataset.obj); } onGridDbl(e); });
  view.addEventListener('contextmenu', e => { const o = e.target.closest('.g-obj'); if (o){ e.preventDefault(); chartMenu(e, o.dataset.obj); return; } ctxMenu(e); });
  view.addEventListener('click', e => { const u = e.target.closest('[data-unhide-c]'), w = e.target.closest('[data-unhide-r]'); if (u){ const sh = sh0(), c = +u.dataset.unhideC; tx('Afficher', () => sh.hc.delete(c)); } if (w){ const sh = sh0(), r = +w.dataset.unhideR; tx('Afficher', () => sh.hr.delete(r)); } });
  view.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey){ e.preventDefault(); setZoom(V.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); } }, {passive:false});
  // tactile : un appui long = menu
  let lp = 0; view.addEventListener('touchstart', e => { const t = e.touches[0]; clearTimeout(lp); lp = setTimeout(() => ctxMenu({preventDefault(){}, clientX:t.clientX, clientY:t.clientY, target:e.target}), 600); }, {passive:true});
  view.addEventListener('touchend', () => clearTimeout(lp)); view.addEventListener('touchmove', () => clearTimeout(lp), {passive:true});
  const ed = g$('gEdit');
  ed.addEventListener('input', () => { EDIT.ptr = null; EDIT.typed = EDIT.typed ?? true; editInput(); });
  ed.addEventListener('keydown', e => { onEditKey(e); if (e.defaultPrevented) e.stopPropagation(); });
  ed.addEventListener('keyup', e => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return; acUpdate(); hintUpdate(); });
  ed.addEventListener('click', () => { EDIT.typed = false; hintUpdate(); });
  g$('gAc').addEventListener('mousedown', e => { e.preventDefault(); const b = e.target.closest('[data-ac]'); if (b) acAccept(+b.dataset.ac); });
  // barre de formule
  const fx = g$('fxIn');
  fx.addEventListener('focus', () => { if (V.ro) return; if (!EDIT.on){ startEdit(null, {bar:true}); } else { EDIT.bar = true; } });
  fx.addEventListener('input', () => { EDIT.ptr = null; if (!EDIT.on) startEdit(null, {bar:true}); EDIT.bar = true; editInput(); autoGrowBar(); });
  fx.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.altKey && !e.shiftKey){ e.preventDefault(); commitEdit(1, 0); } else if (e.key === 'Escape'){ e.preventDefault(); cancelEdit(); } else if (e.key === 'Tab'){ e.preventDefault(); commitEdit(0, e.shiftKey ? -1 : 1); } else onEditKey(e); if (e.defaultPrevented) e.stopPropagation(); });
  fx.addEventListener('keyup', () => { acUpdate(); hintUpdate(); });
  g$('fxOk').addEventListener('mousedown', e => { e.preventDefault(); commitEdit(0, 0); });
  g$('fxFn').addEventListener('click', fnDialog);
  const nb = g$('nameBox');
  nb.addEventListener('focus', () => nb.select());
  nb.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter'){ e.preventDefault(); const v = nb.value.trim(); const nm = WB.names[v.toUpperCase()]; const g = nm ? parseRange(nm.ref) : parseRange(v.replace(/^.*!/, '')); if (nm && nm.sheet !== sh0().name){ const i = WB.sheets.findIndex(s => s.name === nm.sheet); if (i >= 0) switchSheet(i); }
      if (g){ g$('grid').focus(); if (g.r1 === g.r2 && g.c1 === g.c2) selectCell(g.r1, g.c1); else { selectRange(g); scrollToCell(g.r1, g.c1); } } else { toast('Adresse inconnue (exemples : B12, A1:D20)'); } } if (e.key === 'Escape'){ nb.blur(); g$('grid').focus(); } });
  // barre Prisme, tiroirs
  g$('edBar').addEventListener('click', onToolbar);
  g$('edRail').addEventListener('click', e => { const r = e.target.closest('[data-panel]'); if (r) openPanel(r.dataset.panel); });
  g$('edPanelClose').addEventListener('click', () => openPanel(panel));
  g$('edPanelBody').addEventListener('click', onPanelClick);
  g$('edPanelBody').addEventListener('input', onPanelInput);
  // onglets
  const tabs = g$('shTabs');
  tabs.addEventListener('click', e => { if (e.target.closest('[data-sheet-add]')) return addSheet(); const b = e.target.closest('[data-sheet]'); if (!b) return; const i = +b.dataset.sheet; if (i === WB.active && !EDIT.on) return sheetMenu(b, i); switchSheet(i); });
  tabs.addEventListener('dblclick', e => { const b = e.target.closest('[data-sheet]'); if (b) renameSheet(+b.dataset.sheet); });
  tabs.addEventListener('contextmenu', e => { const b = e.target.closest('[data-sheet]'); if (b){ e.preventDefault(); sheetMenu(b, +b.dataset.sheet); } });
  let dragTab = -1; tabs.addEventListener('dragstart', e => { const b = e.target.closest('[data-sheet]'); dragTab = b ? +b.dataset.sheet : -1; });
  tabs.addEventListener('dragover', e => { if (dragTab >= 0) e.preventDefault(); });
  tabs.addEventListener('drop', e => { const b = e.target.closest('[data-sheet]'); if (!b || dragTab < 0) return; e.preventDefault(); const to = +b.dataset.sheet; if (to === dragTab) return; const from = dragTab; wbOp('Déplacer la feuille', () => { const [s] = WB.sheets.splice(from, 1); WB.sheets.splice(to, 0, s); WB.active = to; }); dragTab = -1; });
  g$('shStat').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if (!b) return; const v = g$('shStat').dataset[b.dataset.st]; navigator.clipboard?.writeText(String(+(+v).toPrecision(15)).replace('.', ',')); toast('Valeur copiée'); });
  // objets
  const ob = document.createElement('div'); ob.className = 'ctx-bar'; ob.id = 'objBar'; ob.hidden = true; g$('app').appendChild(ob);
  ob.addEventListener('mousedown', e => e.preventDefault());
  ob.addEventListener('click', e => { const ch = chartById(OBJ.sel); if (!ch) return; const t = e.target.closest('[data-ct]'), o = e.target.closest('[data-co]');
    if (t){ tx('Type de graphique', () => { ch.type = t.dataset.ct; }); renderObjects(); } if (o?.dataset.co === 'del') deleteChart(ch.id); if (o?.dataset.co === 'edit') chartEditor(ch.id); });
  // recherche
  g$('frQ').addEventListener('input', frSearch); g$('frCase').addEventListener('change', frSearch); g$('frAll').addEventListener('change', frSearch);
  g$('frQ').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter'){ e.preventDefault(); frGo(e.shiftKey ? -1 : 1); } if (e.key === 'Escape') closeFind(); });
  g$('findBar').addEventListener('click', e => { const b = e.target.closest('[data-fr]'); if (!b) return; const k = b.dataset.fr; if (k === 'next') frGo(1); else if (k === 'prev') frGo(-1); else if (k === 'rep') frReplace(false); else if (k === 'all') frReplace(true); else if (k === 'close') closeFind(); else if (k === 'more') g$('findBar').classList.toggle('rep'); });
  // Spectre
  g$('spQ').addEventListener('input', () => { SPX.i = 0; drawSpectre(); });
  g$('spQ').addEventListener('keydown', e => { if (!((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key === '/'))) e.stopPropagation(); if (g$('spectre').classList.contains('ai')){ if (e.key === 'Enter'){ e.preventDefault(); const b = g$('spList').querySelector('[data-ai="apply"]') || g$('spList').querySelector('[data-ai="retry"]'); if (b && !AIS.busy) b.click(); } else if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); drawSpectre(); } return; }
    if (e.key === 'ArrowDown'){ e.preventDefault(); SPX.i = Math.min(SPX.items.length - 1, SPX.i + 1); drawSpectre(); } else if (e.key === 'ArrowUp'){ e.preventDefault(); SPX.i = Math.max(0, SPX.i - 1); drawSpectre(); } else if (e.key === 'Enter'){ e.preventDefault(); runSpectre(SPX.i); } else if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closeSpectre(); } });
  g$('spList').addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (b) return runSpectre(+b.dataset.sp); const x = e.target.closest('[data-ai]'); if (!x) return; const k = x.dataset.ai; if (k === 'back'){ drawSpectre(); g$('spQ').focus(); } else if (k === 'retry') aiAsk(AIS.prompt); else if (k === 'apply') aiApply(); });
  g$('spectre').addEventListener('mousedown', e => { if (e.target.id === 'spectre') closeSpectre(); });
  g$('spectreBtn').addEventListener('click', openSpectre);
  // en-tête
  const ti = g$('docTitle');
  ti.addEventListener('input', () => { WB.title = ti.value.trim() || 'Classeur sans titre'; emitChange(); });
  ti.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter'){ e.preventDefault(); g$('grid').focus(); } });
  ti.addEventListener('blur', () => { if (!ti.value.trim()) ti.value = WB.title; });
  g$('exportBtn').addEventListener('click', e => exportPop(e.currentTarget));
  g$('fileBtn').addEventListener('click', e => filePop(e.currentTarget));
  g$('shareBtn').addEventListener('click', () => window.SWShareCurrent?.());
  g$('homeBtn').addEventListener('click', () => { if (EDIT.on) commitEdit(0, 0); window.SWHome?.show('home'); });
  g$('edInsFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) insertFileSheets(f); });
  // presse-papiers et clavier
  document.addEventListener('copy', e => onCopy(e, false)); document.addEventListener('cut', e => { if (!V.ro) onCopy(e, true); }); document.addEventListener('paste', onPaste);
  addEventListener('keydown', globalKeys);
  addEventListener('resize', debounce(() => { if (!g$('app').hidden){ layout(); schedule(); } }, 120));
  // glisser un fichier sur la grille : ajout de feuilles
  g$('grid').addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
  g$('grid').addEventListener('drop', e => { const f = e.dataTransfer?.files?.[0]; if (!f) return; e.preventDefault(); insertFileSheets(f); });
  // l'appli redevient visible : remise en page
  new MutationObserver(() => { if (!g$('app').hidden){ layout(); schedule(); g$('grid').focus({preventScroll:true}); } }).observe(g$('app'), {attributes:true, attributeFilter:['hidden']});
}
function init(){
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) g$('spectreKbd').textContent = '⌘ K';
  wire();
  WB = new Workbook(); WB.load({sheets:[TS('Feuille 1')]}); renderTabs();
  window.SWScaleMinis = root => requestAnimationFrame(() => [...(root || document).querySelectorAll('.mini')].forEach(m => { const w = m.clientWidth; if (w) m.style.setProperty('--s', w / (m.classList.contains('land') ? 1123 : 794)); }));
  window.SWThemes = {css:themeCss, vals:themeVals, list:THEMES, key:themeKey};
  window.SWEditor = {
    load, get:getJSON, title:() => WB.title, meta:() => ({preview:previewOfJSON(WB.toJSON()), theme:themeKey(WB.theme), words:WB.sheets.reduce((n, s) => n + s.cells.size, 0), pageSize:'grille'}),
    metaOf, fromTemplate, importFile:async f => importFile(f), setReadOnly, restoreSel(){ }, setUserLib(l){ E2.userLib = l || {}; if (panel === 'templates') renderPanel(); },
    focusTitle(){ g$('grid').focus({preventScroll:true}); }, paginate(){ layout(); schedule(); }, doExport, textOf:textOfJSON, previewFull:json => { const j = parseWB(json); return previewOfJSON(j, 60, 16); },
    ai(p){ openSpectre(); g$('spQ').value = p; aiAsk(p); },
  };
  window.__swReady = true;
  window.dispatchEvent(new Event('sw:ready'));
}
init();
