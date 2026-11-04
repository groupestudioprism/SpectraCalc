/* ---------- Analyse : validation des données, tableau croisé, mini-graphiques, protection, valeur cible, mise en page et impression ---------- */
const frN = n => FN_FR_OF[n] || n;
const qSh = n => /^[A-Za-z0-9_]+$/.test(n) ? n : `'${n.replace(/'/g, "''")}'`;
/* ----- validation avec règles (nombre, date, longueur, formule) ----- */
const DV_TYPES = [['list', 'Liste'], ['whole', 'Nombre entier'], ['decimal', 'Nombre décimal'], ['date', 'Date'], ['len', 'Longueur du texte'], ['custom', 'Formule personnalisée']];
const DV_OPS = [['between', 'entre'], ['notbetween', 'pas entre'], ['eq', 'égal à'], ['ne', 'différent de'], ['gt', 'supérieur à'], ['lt', 'inférieur à'], ['ge', 'supérieur ou égal à'], ['le', 'inférieur ou égal à']];
const vrAt = (sh, r, c) => sh.dv.find(d => d.type && d.type !== 'list' && (() => { const g = parseRange(d.range); return g && r >= g.r1 && r <= g.r2 && c >= g.c1 && c <= g.c2; })());
function dvValue(x, type){ if (type === 'date'){ const d = parseDateFr(String(x)); if (d) return d.v; } const n = parseNumberFr(String(x)); return n != null ? n : (typeof x === 'number' ? x : null); }
function dvCheck(sh, r, c, raw){
  const d = vrAt(sh, r, c); if (!d || raw === '' || raw == null) return true; let ok = true;
  const txt = String(raw);
  if (d.type === 'custom'){ try { ok = toBool(scalar(ev(parseFormula(shiftFormula(String(d.a || '').replace(/^=/, ''), r - (parseRange(d.range)?.r1 || r), c - (parseRange(d.range)?.c1 || c))), {wb:WB, sh, r, c, override:{r, c, raw}}))); } catch(e){ ok = false; } }
  else if (d.type === 'len'){ const n = txt.length, a = +d.a, b = +d.b; ok = cmpOp(n, d.op, a, b); }
  else { const v = raw[0] === '=' ? null : dvValue(raw, d.type); if (v == null) ok = false; else { if (d.type === 'whole' && !Number.isInteger(v)) ok = false; else ok = cmpOp(v, d.op, dvValue(d.a, d.type), dvValue(d.b, d.type)); } }
  return ok;
}
function cmpOp(v, op, a, b){ switch (op){ case 'between': return v >= Math.min(a, b) && v <= Math.max(a, b); case 'notbetween': return v < Math.min(a, b) || v > Math.max(a, b); case 'eq': return v === a; case 'ne': return v !== a; case 'gt': return v > a; case 'lt': return v < a; case 'ge': return v >= a; case 'le': return v <= a; } return true; }
function dvMessage(d){ return d.err || ({whole:'Entrez un nombre entier', decimal:'Entrez un nombre', date:'Entrez une date', len:'Longueur du texte non valide', custom:'Valeur non valide'}[d.type] + (d.type !== 'custom' && d.op ? ' ' + (DV_OPS.find(o => o[0] === d.op)?.[1] || '') + ' ' + d.a + (d.op.endsWith('between') ? ' et ' + d.b : '') : '') + '.'); }
function dvRuleDlg(){
  const sh = sh0(), rg = rangeA1({...SEL, r2:Math.min(SEL.r2, SEL.r1 + 4999), c2:Math.min(SEL.c2, SEL.c1 + 50)}), cur = vrAt(sh, SEL.r, SEL.c);
  SWDlg.open(`<h3>Règle de validation</h3><p class="dlg-p">Les cellules ${escH(rg)} n'accepteront que les valeurs autorisées.</p>
    <label class="pgf">Autoriser<select id="vrT">${DV_TYPES.map(([k, n]) => `<option value="${k}"${(cur?.type || 'whole') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    <div id="vrNum"><label class="pgf">Condition<select id="vrO">${DV_OPS.map(([k, n]) => `<option value="${k}"${(cur?.op || 'between') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="vr-2"><label class="pgf">Valeur<input id="vrA" value="${escH(cur?.a ?? '')}"></label><label class="pgf" id="vrBw">et<input id="vrB" value="${escH(cur?.b ?? '')}"></label></div></div>
    <label class="pgf" id="vrF" hidden>Formule (VRAI = valide), par exemple =ESTNUM(A1)<input id="vrFx" value="${escH(cur?.type === 'custom' ? cur.a : '')}"></label>
    <label class="pgf">Message d'erreur<input id="vrE" value="${escH(cur?.err || '')}" placeholder="Message personnalisé (facultatif)"></label>
    <div class="pgf">En cas d'erreur<div class="seg" id="vrS">${[['stop', 'Refuser'], ['warn', 'Avertir'], ['info', 'Informer']].map(([k, n]) => `<button type="button" data-s="${k}" aria-checked="${(cur?.style || 'stop') === k}">${n}</button>`).join('')}</div></div>
    <div class="dlg-acts">${cur ? '<button class="ap-btn alt danger-t" id="vrDel">Retirer</button>' : ''}<button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="vrOk">Appliquer</button></div>`, d => {
    let style = cur?.style || 'stop'; const T = d.querySelector('#vrT'), sync = () => { d.querySelector('#vrNum').hidden = T.value === 'custom' || T.value === 'list'; d.querySelector('#vrF').hidden = T.value !== 'custom'; d.querySelector('#vrBw').hidden = !d.querySelector('#vrO').value.endsWith('between'); };
    T.onchange = () => { if (T.value === 'list'){ SWDlg.close(); return dvDialog(); } sync(); }; d.querySelector('#vrO').onchange = sync; sync();
    d.querySelectorAll('#vrS [data-s]').forEach(b => b.onclick = () => { style = b.dataset.s; d.querySelectorAll('#vrS [data-s]').forEach(x => x.setAttribute('aria-checked', x === b)); });
    d.querySelector('#vrOk').onclick = () => { const type = T.value, o = d.querySelector('#vrO').value; const a = type === 'custom' ? d.querySelector('#vrFx').value : d.querySelector('#vrA').value, b = d.querySelector('#vrB').value; if (!a) return toast('Indiquez la valeur ou la formule'); if (type !== 'custom' && dvValue(a, type) == null) return toast('Valeur non reconnue');
      SWDlg.close(); tx('Validation des données', () => { sh.dv = sh.dv.filter(x => x !== cur); sh.dv.push({range:rg, type, op:o, a, b, err:d.querySelector('#vrE').value.trim() || undefined, style}); }); schedule(); toast('Règle de validation appliquée'); };
    const del = d.querySelector('#vrDel'); if (del) del.onclick = () => { SWDlg.close(); tx('Retirer la validation', () => { sh.dv = sh.dv.filter(x => x !== cur); }); };
  });
}
/* appelée à la validation d'une saisie : renvoie false si la saisie est refusée */
function dvGuard(sh, r, c, raw){
  if (dvCheck(sh, r, c, raw)) return true; const d = vrAt(sh, r, c); const msg = dvMessage(d);
  if (d.style === 'info'){ toast('Attention : ' + msg); return true; }
  if (d.style === 'warn') return confirm(msg + '\n\nConserver quand même cette valeur ?');
  toast(msg); return false;
}
/* ----- protection ----- */
async function sha(t){ const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sc:' + t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const cellLocked = (sh, r, c) => !(sh.get(r, c)?.s?.ul);
function protectDlg(){
  const sh = sh0(), p = sh.prot;
  if (p?.on){ return SWDlg.open(`<h3>Feuille protégée</h3><p class="dlg-p">Les cellules verrouillées ne peuvent plus être modifiées.${p.h ? ' Entrez le mot de passe pour retirer la protection.' : ''}</p>${p.h ? '<label class="pgf">Mot de passe<input id="pwI" type="password" autocomplete="off"></label>' : ''}<div class="dlg-acts"><button class="ap-btn alt" data-dlg="close">Fermer</button><button class="ap-btn" id="pwOk">Retirer la protection</button></div>`, d => {
    d.querySelector('#pwOk').onclick = async () => { if (p.h && await sha(d.querySelector('#pwI').value) !== p.h) return toast('Mot de passe incorrect'); SWDlg.close(); tx('Retirer la protection', () => { sh.prot = null; }); renderTabs(); schedule(); toast('Protection retirée'); }; }); }
  SWDlg.open(`<h3>Protéger la feuille « ${escH(sh.name)} »</h3><p class="dlg-p">Toutes les cellules sont verrouillées par défaut. Pour laisser des cellules modifiables, sélectionnez-les puis utilisez « Déverrouiller les cellules » avant de protéger.</p>
    <label class="pgf">Mot de passe (facultatif)<input id="pwI" type="password" autocomplete="new-password"></label><label class="pop-toggle"><input type="checkbox" id="pwS" checked><span><b>Autoriser la sélection et la mise en forme des lignes et colonnes</b></span></label>
    <div class="dlg-acts"><button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="pwOk">Protéger</button></div>`, d => {
    d.querySelector('#pwOk').onclick = async () => { const pw = d.querySelector('#pwI').value, h = pw ? await sha(pw) : ''; SWDlg.close(); tx('Protéger la feuille', () => { sh.prot = {on:true, ...(h ? {h} : {})}; }); renderTabs(); schedule(); toast('Feuille protégée'); }; });
}
function lockCells(lock){ styleSel({ul:lock ? null : 1}, lock ? 'Verrouiller les cellules' : 'Déverrouiller les cellules'); toast(lock ? 'Cellules verrouillées' : 'Cellules déverrouillées : modifiables même si la feuille est protégée'); }
/* ----- mini-graphiques ----- */
const SPK = [['line', 'Courbe'], ['col', 'Colonnes'], ['win', 'Gain / perte']];
function sparkIndex(sh){ const m = new Map(); for (const s of sh.spark || []) m.set(KEY(s.r, s.c), s); return m; }
function sparkSVG(s, sh, w, h){
  const g = parseRange(s.src); if (!g) return ''; const sr = s.sheet ? WB.byName(s.sheet) || sh : sh, v = []; for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++){ const x = WB.val(sr, r, c); v.push(typeof x === 'number' ? x : null); }
  const nums = v.filter(x => x != null); if (!nums.length) return ''; const col = okC(s.color, '#7B3FF2'), neg = okC(s.neg, '#F2387A'), mn = Math.min(...nums, s.type === 'line' ? Infinity : 0), mx = Math.max(...nums, s.type === 'line' ? -Infinity : 0), span = mx - mn || 1, n = v.length, pad = 3;
  const X = i => pad + (n > 1 ? i * (w - 2 * pad) / (n - 1) : (w - 2 * pad) / 2), Y = x => pad + (1 - (x - mn) / span) * (h - 2 * pad);
  let o = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="spk">`;
  if (s.type === 'line'){ const pts = v.map((x, i) => x == null ? null : [X(i), Y(x)]).filter(Boolean); o += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('')}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`; const hi = nums.indexOf(mx), lo = v.indexOf(mn), last = v.length - 1; if (s.pts !== false){ const mk = (i, c2) => v[i] != null ? `<circle cx="${X(i).toFixed(1)}" cy="${Y(v[i]).toFixed(1)}" r="2.4" fill="${c2}"/>` : ''; o += mk(v.indexOf(mx), '#2FBF71') + mk(v.indexOf(mn), neg) + mk(last, col); } }
  else { const bw = Math.max(1.5, (w - 2 * pad) / n - 1.5), z = s.type === 'win' ? h / 2 : Y(0); v.forEach((x, i) => { if (x == null) return; const cx = pad + i * ((w - 2 * pad) / n) + .75; if (s.type === 'win'){ const up = x >= 0; o += `<rect x="${cx.toFixed(1)}" y="${up ? 3 : z}" width="${bw.toFixed(1)}" height="${z - 3}" rx="1" fill="${up ? col : neg}"/>`; } else { const y = Y(x); o += `<rect x="${cx.toFixed(1)}" y="${Math.min(y, z).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, Math.abs(z - y)).toFixed(1)}" rx="1" fill="${x < 0 ? neg : col}"/>`; } }); }
  return o + '</svg>';
}
function sparkDlg(){
  const sh = sh0(), g = {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, sh.used().r), c2:Math.min(SEL.c2, sh.used().c)}; if (g.r2 < g.r1 || g.c2 < g.c1 || (g.c1 === g.c2 && g.r1 === g.r2)) return toast('Sélectionnez les valeurs (une ligne par mini-graphique), par exemple B2:G10');
  const byRow = g.c2 - g.c1 >= g.r2 - g.r1;
  SWDlg.open(`<h3>Mini-graphiques</h3><p class="dlg-p">Un petit graphique par ${byRow ? 'ligne' : 'colonne'} de ${escH(rangeA1(g))}, placé ${byRow ? 'dans la colonne qui suit la sélection' : 'sous la sélection'}.</p>
    <div class="pgf">Type<div class="seg" id="spT">${SPK.map(([k, n], i) => `<button type="button" data-t="${k}" aria-checked="${!i}">${n}</button>`).join('')}</div></div>
    <label class="pgf ce-col">Couleur<span><input type="color" id="spC" value="#7B3FF2"></span></label><div class="dlg-acts"><button class="ap-btn alt" data-dlg="close">Annuler</button>${(sh.spark || []).length ? '<button class="ap-btn alt danger-t" id="spX">Tout retirer</button>' : ''}<button class="ap-btn" id="spOk">Créer</button></div>`, d => {
    let type = 'line'; d.querySelectorAll('#spT [data-t]').forEach(b => b.onclick = () => { type = b.dataset.t; d.querySelectorAll('#spT [data-t]').forEach(x => x.setAttribute('aria-checked', x === b)); });
    d.querySelector('#spOk').onclick = () => { SWDlg.close(); tx('Mini-graphiques', () => { const col = d.querySelector('#spC').value, keep = (sh.spark || []).filter(x => !(byRow ? x.c === g.c2 + 1 && x.r >= g.r1 && x.r <= g.r2 : x.r === g.r2 + 1 && x.c >= g.c1 && x.c <= g.c2)); sh.spark = keep;
      if (byRow) for (let r = g.r1; r <= g.r2; r++) sh.spark.push({r, c:g.c2 + 1, src:rangeA1({r1:r, c1:g.c1, r2:r, c2:g.c2}), type, color:col}); else for (let c = g.c1; c <= g.c2; c++) sh.spark.push({r:g.r2 + 1, c, src:rangeA1({r1:g.r1, c1:c, r2:g.r2, c2:c}), type, color:col});
      if (byRow && !sh.cw[g.c2 + 1]) sh.cw[g.c2 + 1] = 130; }); layout(); schedule(); };
    const x = d.querySelector('#spX'); if (x) x.onclick = () => { SWDlg.close(); tx('Retirer les mini-graphiques', () => { sh.spark = []; }); schedule(); };
  });
}
/* ----- valeur cible ----- */
function goalDlg(){
  SWDlg.open(`<h3>Valeur cible</h3><p class="dlg-p">Trouve la valeur à saisir dans une cellule pour qu'une formule atteigne le résultat voulu.</p>
    <label class="pgf">Cellule à définir (formule)<input id="gsF" value="${A1(SEL.r, SEL.c)}"></label><label class="pgf">Pour obtenir la valeur<input id="gsV" placeholder="Par exemple 10000"></label><label class="pgf">En modifiant la cellule<input id="gsC" placeholder="Par exemple B2"></label>
    <div class="dlg-acts"><button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="gsOk">Résoudre</button></div>`, d => {
    d.querySelector('#gsOk').onclick = () => { const f = parseA1(d.querySelector('#gsF').value.trim().toUpperCase()), c = parseA1(d.querySelector('#gsC').value.trim().toUpperCase()), t = parseNumberFr(d.querySelector('#gsV').value); if (!f || !c || t == null) return toast('Renseignez les trois champs'); const sh = sh0();
      const cur = WB.val(sh, c.r, c.c); const x0 = typeof cur === 'number' ? cur : 0;
      const ev1 = x => { sh.setRawSilent(c.r, c.c, String(x)); WB.recalc(); const y = WB.val(sh, f.r, f.c); if (typeof y !== 'number') throw 0; return y - t; };
      const orig = sh.get(c.r, c.c)?.raw ?? ''; let res = null;
      try { let a = x0, b = x0 + Math.max(1, Math.abs(x0) * .1), fa = ev1(a), fb = ev1(b); for (let i = 0; i < 60 && Math.abs(fb) > 1e-9; i++){ if (fb === fa) break; const n = b - fb * (b - a) / (fb - fa); a = b; fa = fb; b = n; fb = ev1(b); } if (Math.abs(fb) < 1e-6) res = b; } catch(e){}
      sh.setRawSilent(c.r, c.c, orig); WB.recalc();
      if (res == null){ schedule(); return toast('Aucune solution trouvée : vérifiez que la formule dépend bien de la cellule modifiée'); }
      SWDlg.close(); const v = +res.toPrecision(10); tx('Valeur cible', () => { sh.setRaw(c.r, c.c, String(v).replace('.', ',')); }); schedule(); toast(`Solution : ${A1(c.r, c.c)} = ${String(v).replace('.', ',')}`); };
  });
}
/* ----- tableau croisé dynamique (formules vivantes dans une nouvelle feuille) ----- */
function pivotDlg(){
  const sh = sh0(), g = trimTotal(sh, SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2 ? currentRegion(SEL.r, SEL.c) : {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, sh.used().r), c2:Math.min(SEL.c2, sh.used().c)});
  if (g.r2 <= g.r1 || g.c2 <= g.c1) return toast('Cliquez dans un tableau avec des en-têtes de colonnes');
  const hd = range(g.c1, g.c2).map(c => ({c, n:String(WB.val(sh, g.r1, c) ?? 'Colonne ' + colName(c))})), opt = (sel, none) => `${none ? '<option value="">(aucun)</option>' : ''}${hd.map((h, i) => `<option value="${h.c}"${sel === i ? ' selected' : ''}>${escH(h.n)}</option>`).join('')}`;
  const numCol = hd.findIndex(h => typeof WB.val(sh, g.r1 + 1, h.c) === 'number'), AG = [['sum', 'Somme'], ['count', 'Nombre'], ['avg', 'Moyenne'], ['min', 'Minimum'], ['max', 'Maximum']];
  SWDlg.open(`<h3>Tableau croisé dynamique</h3><p class="dlg-p">Source : ${escH(rangeA1(g))}. Le résultat est créé dans une nouvelle feuille, avec des formules qui suivent vos données.</p>
    <div class="vr-2"><label class="pgf">Lignes<select id="pvR">${opt(0)}</select></label><label class="pgf">Colonnes<select id="pvC">${opt(-1, true)}</select></label></div>
    <div class="vr-2"><label class="pgf">Valeurs<select id="pvV">${opt(numCol >= 0 ? numCol : 1)}</select></label><label class="pgf">Calcul<select id="pvA">${AG.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label></div>
    <label class="pgf" id="pvGw">Grouper les dates<select id="pvG"><option value="">Non</option><option value="yyyy">Par année</option><option value="yyyy-mm">Par mois</option></select></label>
    <label class="pop-toggle"><input type="checkbox" id="pvT" checked><span><b>Totaux</b></span></label><label class="pop-toggle"><input type="checkbox" id="pvCh"><span><b>Ajouter un graphique</b></span></label>
    <div class="dlg-acts"><button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="pvOk">Créer</button></div>`, d => {
    d.querySelector('#pvOk').onclick = () => {
      const rc = +d.querySelector('#pvR').value, cc = d.querySelector('#pvC').value === '' ? null : +d.querySelector('#pvC').value, vc = +d.querySelector('#pvV').value, ag = d.querySelector('#pvA').value, grp = d.querySelector('#pvG').value, tot = d.querySelector('#pvT').checked, chart = d.querySelector('#pvCh').checked;
      if (rc === cc) return toast('Choisissez des champs différents pour les lignes et les colonnes');
      if (grp && (ag === 'min' || ag === 'max')) return toast('Min et max ne se combinent pas avec le groupement de dates');
      const last = g.r2 + 500, S = (c, a = true) => `${qSh(sh.name)}!${a ? '$' : ''}${colName(c)}${a ? '$' : ''}${g.r1 + 2}:${a ? '$' : ''}${colName(c)}${a ? '$' : ''}${last}`, Rg = S(rc), Cg = cc != null ? S(cc) : '', Vg = S(vc);
      const uniq = c => { const m = new Map(); for (let r = g.r1 + 1; r <= g.r2; r++){ const v = WB.val(sh, r, c); if (v == null || v === '') continue; const key = grp && typeof v === 'number' ? fmtDate(v, grp) : v; if (!m.has(typeof key === 'string' ? key.toLowerCase() : key)) m.set(typeof key === 'string' ? key.toLowerCase() : key, key); } return [...m.values()].sort((a, b) => cmpVal(a, b)); };
      const rows = uniq(rc), cols = cc != null ? uniq(cc) : [null]; if (!rows.length) return toast('Aucune donnée dans le champ des lignes'); if (rows.length * cols.length > 5000) return toast('Trop de combinaisons : choisissez d\'autres champs');
      const cell = (rl, cl) => { const rK = grp ? `TEXTE(${Rg};"${grp}")` : null;
        if (grp){ const cond = `(${rK}=${rl})` + (cl ? `*(${Cg}=${cl})` : ''); const sm = `SOMMEPROD(${cond}*${Vg}*1)`, ct = `SOMMEPROD(${cond}*1)`; return ag === 'sum' ? sm : ag === 'count' ? ct : `SIERREUR(${sm}/${ct};0)`; }
        const F = {sum:frN('SUMIFS'), count:frN('COUNTIFS'), avg:frN('AVERAGEIFS'), min:frN('MINIFS'), max:frN('MAXIFS')}[ag]; const crit = `${Rg};${rl}` + (cl ? `;${Cg};${cl}` : ''); const f = ag === 'count' ? `${F}(${crit})` : `${F}(${Vg};${crit})`; return ag === 'avg' || ag === 'min' || ag === 'max' ? `SIERREUR(${f};0)` : f; };
      const aggFn = {sum:frN('SUM'), count:frN('SUM'), avg:frN('AVERAGE'), min:frN('MIN'), max:frN('MAX')}[ag];
      wbOp('Tableau croisé dynamique', () => {
        const ns = WB.addSheet(uniqueSheetName('Tableau croisé'), WB.active + 1); WB.active = WB.sheets.indexOf(ns);
        const title = `${{sum:'Somme', count:'Nombre', avg:'Moyenne', min:'Minimum', max:'Maximum'}[ag]} de ${hd.find(h => h.c === vc).n}`; ns.setRaw(0, 0, title); ns.setStyle(0, 0, {b:1, fs:14});
        const hr = 2, c0 = 0; ns.setRaw(hr, 0, hd.find(h => h.c === rc).n + (cc != null ? ' \\ ' + hd.find(h => h.c === cc).n : ''));
        cols.forEach((cv, j) => { if (cv != null) ns.setRaw(hr, 1 + j, typeof cv === 'string' && /^[=+\-@]/.test(cv) ? "'" + cv : String(cv)); }); if (cc == null) ns.setRaw(hr, 1, 'Valeur'); const nc = Math.max(1, cols.length);
        if (tot && cc != null) ns.setRaw(hr, 1 + nc, 'Total');
        rows.forEach((rv, i) => { const rr = hr + 1 + i; ns.setRaw(rr, 0, typeof rv === 'string' && /^[=+\-@]/.test(rv) ? "'" + rv : grp ? "'" + rv : String(rv));
          for (let j = 0; j < nc; j++){ const cl = cc != null ? `${colName(1 + j)}$${hr + 1}` : null; ns.setRaw(rr, 1 + j, '=' + cell(`$A${rr + 1}`, cl)); }
          if (tot && cc != null) ns.setRaw(rr, 1 + nc, `=${aggFn}(B${rr + 1}:${colName(nc)}${rr + 1})`); });
        const er = hr + rows.length; if (tot){ ns.setRaw(er + 1, 0, 'Total'); const tc = cc != null ? nc + 1 : 1; for (let j = 0; j < tc; j++) ns.setRaw(er + 1, 1 + j, `=${aggFn}(${colName(1 + j)}${hr + 2}:${colName(1 + j)}${er + 1})`); }
        const lastC = (cc != null ? nc + (tot ? 1 : 0) : 1), lastR = er + (tot ? 1 : 0); ns.tables.push({range:`A${hr + 1}:${colName(lastC)}${lastR + 1}`, total:tot}); ns.cw[0] = 170;
        const nf = ag === 'count' ? '#,##0' : sh.get(g.r1 + 1, vc)?.s?.nf; if (nf) for (let r = hr + 1; r <= lastR; r++) for (let c = 1; c <= lastC; c++) ns.setStyle(r, c, {nf});
        if (chart){ const rg = `A${hr + 1}:${colName(cc != null ? nc : 1)}${er + 1}`; ns.charts.push({id:uidS(), type:cc != null ? 'stack' : 'col', range:rg, title, x:contentXY(hr, lastC + 2).x + 10, y:contentXY(hr, 0).y, w:520, h:320, legend:cc != null}); } });
      SWDlg.close(); toast('Tableau croisé créé dans une nouvelle feuille');
    };
  });
}
/* ----- mise en page et impression ----- */
const PAGE_DEF = {orient:'auto', size:'A4', mar:12, scale:100, fit:false, grid:true, head:false, title:'', foot:'', num:true, area:'', ctr:false, objs:true};
const PAGE_MM = {A4:[210, 297], A3:[297, 420], A5:[148, 210], Letter:[216, 279], Legal:[216, 356]};
const pageCfg = sh => ({...PAGE_DEF, ...(sh.page || {})});
function pageDlg(){
  const sh = sh0(), p = pageCfg(sh), chk = (k, n, h = '') => `<label class="pop-toggle"><input type="checkbox" id="pg_${k}"${p[k] ? ' checked' : ''}><span><b>${n}</b>${h ? `<small>${h}</small>` : ''}</span></label>`;
  SWDlg.open(`<h3>Mise en page et impression</h3><div class="pg-grid">
    <label class="pgf">Orientation<select id="pg_orient">${[['auto', 'Automatique'], ['p', 'Portrait'], ['l', 'Paysage']].map(([k, n]) => `<option value="${k}"${p.orient === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="pgf">Format<select id="pg_size">${Object.keys(PAGE_MM).map(k => `<option${p.size === k ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
    <label class="pgf">Marges (mm)<input id="pg_mar" type="number" min="0" max="50" value="${p.mar}"></label><label class="pgf">Échelle (%)<input id="pg_scale" type="number" min="20" max="200" value="${p.scale}"></label>
    <label class="pgf pg-w">Zone d'impression (vide = tout)<input id="pg_area" value="${escH(p.area)}" placeholder="A1:H40" spellcheck="false"></label><label class="pgf pg-w">En-tête de page<input id="pg_title" value="${escH(p.title)}" placeholder="Titre répété en haut de chaque page"></label><label class="pgf pg-w">Pied de page<input id="pg_foot" value="${escH(p.foot)}" placeholder="Texte en bas de chaque page"></label></div>
    ${chk('fit', 'Ajuster à la largeur de la page', 'Réduit la feuille pour qu\'elle tienne sur une page de large')}${chk('grid', 'Imprimer le quadrillage')}${chk('head', 'Imprimer les en-têtes de lignes et de colonnes (A, B, 1, 2…)')}${chk('num', 'Numéroter les pages')}${chk('ctr', 'Centrer horizontalement')}${chk('objs', 'Imprimer les graphiques, formes et images')}
    <div class="dlg-acts"><button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn alt" id="pgSave">Enregistrer</button><button class="ap-btn" id="pgPrint">Imprimer</button></div>`, d => {
    const read = () => { const o = {}; for (const k of Object.keys(PAGE_DEF)){ const e = d.querySelector('#pg_' + k); if (!e) continue; o[k] = e.type === 'checkbox' ? e.checked : e.type === 'number' ? +e.value || PAGE_DEF[k] : e.value.trim(); } if (o.area && !parseRange(o.area.toUpperCase())) o.area = ''; else o.area = o.area.toUpperCase(); return o; };
    d.querySelector('#pgSave').onclick = () => { const o = read(); SWDlg.close(); tx('Mise en page', () => { sh.page = o; }); toast('Mise en page enregistrée'); };
    d.querySelector('#pgPrint').onclick = () => { const o = read(); SWDlg.close(); tx('Mise en page', () => { sh.page = o; }); printSheet(false); };
  }, 'wide');
}
function objectsHTML(sh, ox, oy, area){
  const o = []; for (const ch of sh.charts) o.push(`<div style="position:absolute;left:${ch.x - ox}px;top:${ch.y - oy}px;width:${ch.w}px;height:${ch.h}px">${chartSVG(ch, ch.w, ch.h)}</div>`);
  for (const s of sh.shapes) o.push(`<div style="position:absolute;left:${s.x - ox}px;top:${s.y - oy}px;width:${s.w}px;height:${s.h}px;transform:rotate(${s.rot || 0}deg)">${shapeSVG(s)}</div>`); return o.join('');
}
function sectionHTML(sh, cfg, heading){
  const u = sh.used(), a = cfg.area ? parseRange(cfg.area) : null, area = a ? {r1:a.r1, c1:a.c1, r2:a.r2, c2:a.c2} : {r1:0, c1:0, r2:u.r, c2:u.c};
  let tw = 0, th = 0; for (let c = area.c1; c <= area.c2; c++) tw += sh.colW(c); for (let r = area.r1; r <= area.r2; r++) th += sh.rowH(r);
  const hw = cfg.head ? 36 : 0, hh = cfg.head ? 22 : 0, o = contentXY(area.r1, area.c1), objs = cfg.objs ? objectsHTML(sh, o.x - hw, o.y - hh) : '';
  let h = 0; if (cfg.objs){ for (const x of [...sh.charts, ...sh.shapes]) h = Math.max(h, x.y + x.h - o.y); } const H = Math.max(th + hh, h + hh), W = Math.max(tw + hw, cfg.objs ? Math.max(0, ...[...sh.charts, ...sh.shapes].map(x => x.x + x.w - o.x + hw)) : 0);
  return `<section class="sc-sheet"${cfg._brk ? ' style="page-break-before:always"' : ''}><h2>${escH(heading)}</h2><div class="sc-wrap${cfg.grid ? '' : ' ng'}" style="position:relative;width:${W}px;height:${H}px;${cfg.fit || cfg.scale !== 100 ? `zoom:${(cfg._z || cfg.scale) / 100};` : ''}">${sheetHTML(sh, {area, head:cfg.head})}<div style="position:absolute;left:0;top:0;pointer-events:none">${objs}</div></div></section>`;
}
function pageCSS(cfg, wide, boxW){
  const [w, h] = PAGE_MM[cfg.size] || PAGE_MM.A4, esc = t => String(t).replace(/[\\"]/g, '\\$&').replace(/\n/g, ' ');
  return `@page{size:${cfg.size} ${wide ? 'landscape' : 'portrait'};margin:${cfg.mar}mm;${cfg.title ? `@top-center{content:"${esc(cfg.title)}";font:11px Inter,sans-serif;color:#7B7690}` : ''}${cfg.foot ? `@bottom-left{content:"${esc(cfg.foot)}";font:11px Inter,sans-serif;color:#7B7690}` : ''}${cfg.num ? '@bottom-right{content:counter(page) " / " counter(pages);font:11px Inter,sans-serif;color:#7B7690}' : ''}}${cfg.ctr ? '.sc-wrap{margin-left:auto;margin-right:auto}' : ''}`;
}
/* ----- panneau « Analyse » ----- */
function analyseHTML(){
  const sh = sh0(), B = (k, ic, n, hint = '') => `<button type="button" data-an="${k}"><b class="pn-fx">${ic}</b>${n}</button>`;
  return `<p class="pn-h">Analyser</p><div class="pn-acts">${B('pivot', '▦', 'Tableau croisé dynamique…')}${B('spark', '〰', 'Mini-graphiques…')}${B('goal', '◎', 'Valeur cible…')}${B('stats', '∑', 'Statistiques de la sélection')}</div>
    <p class="pn-h">Contrôle des données</p><div class="pn-acts">${B('dv', '▾', 'Liste déroulante…')}${B('vr', '✓', 'Règle de validation…')}${B('dvc', '○', 'Entourer les valeurs non valides')}${B('names', 'ƒ', 'Noms définis…')}</div>
    <p class="pn-h">Protection</p><div class="pn-acts">${B('prot', sh.prot?.on ? '🔓' : '🔒', sh.prot?.on ? 'Retirer la protection' : 'Protéger la feuille…')}${B('lock', '🔒', 'Verrouiller les cellules')}${B('unlock', '🔓', 'Déverrouiller les cellules')}</div>
    <p class="pn-h">Affichage et impression</p><div class="pn-acts">${B('formulas', 'ƒx', V.showF ? 'Masquer les formules' : 'Afficher les formules')}${B('grid', '▦', sh.grid ? 'Masquer le quadrillage' : 'Afficher le quadrillage')}${B('page', '🖨', 'Mise en page et impression…')}${B('print', '⎙', 'Imprimer')}
      ${B('freeze', '❄', sh.freeze.r || sh.freeze.c ? 'Libérer les volets' : 'Figer les volets ici')}${B('tab', '●', 'Couleur de l\'onglet…')}</div>
    <p class="pn-hint">Ctrl + apostrophe inversée affiche les formules. Les mini-graphiques se placent à droite des données sélectionnées.</p>`;
}
function analyseAction(k){
  const sh = sh0();
  if (k === 'pivot') pivotDlg(); else if (k === 'spark') sparkDlg(); else if (k === 'goal') goalDlg(); else if (k === 'stats') statsDlg();
  else if (k === 'dv') dvDialog(); else if (k === 'vr') dvRuleDlg(); else if (k === 'names') nameDlg(); else if (k === 'dvc') circleInvalid();
  else if (k === 'prot') protectDlg(); else if (k === 'lock') lockCells(true); else if (k === 'unlock') lockCells(false);
  else if (k === 'formulas') toggleFormulas(); else if (k === 'grid'){ tx('Quadrillage', () => { sh.grid = !sh.grid; }); schedule(); renderPanel(); }
  else if (k === 'page') pageDlg(); else if (k === 'print') printSheet(false);
  else if (k === 'freeze') dataAction('freeze1'); else if (k === 'tab') tabColorDlg();
}
function toggleFormulas(){ V.showF = !V.showF; schedule(); if (panel === 'analyse') renderPanel(); toast(V.showF ? 'Formules affichées' : 'Valeurs affichées'); }
function circleInvalid(){ const sh = sh0(); let n = 0; V.bad = new Set(); for (const d of sh.dv){ if (!d.type || d.type === 'list'){ const g = parseRange(d.range), items = dvItems(d).map(x => String(x).toLowerCase()); if (!g) continue; for (let r = g.r1; r <= Math.min(g.r2, sh.used().r); r++) for (let c = g.c1; c <= g.c2; c++){ const v = WB.val(sh, r, c); if (v != null && v !== '' && items.length && !items.includes(String(formatValue(v, sh.get(r, c)?.s?.nf).t).toLowerCase())){ V.bad.add(KEY(r, c)); n++; } } } else { const g = parseRange(d.range); if (!g) continue; for (let r = g.r1; r <= Math.min(g.r2, sh.used().r); r++) for (let c = g.c1; c <= g.c2; c++){ const cell = sh.get(r, c); if (cell && cell.raw !== '' && !dvCheck(sh, r, c, cell.raw)){ V.bad.add(KEY(r, c)); n++; } } } }
  schedule(); toast(n ? `${n} valeur${n > 1 ? 's' : ''} non valide${n > 1 ? 's' : ''} entourée${n > 1 ? 's' : ''} en rouge (cliquez ailleurs pour effacer)` : 'Toutes les valeurs respectent les règles'); if (!n) V.bad = null; }
function tabColorDlg(){ const TC = ['#7B3FF2', '#3D63FF', '#12B5E5', '#2FBF71', '#F5B82E', '#FF7A2F', '#F2387A', '#8D88A3']; openPop(g$('edRail'), `<p class="pop-h">Couleur de l'onglet</p><div class="pop-sw">${TC.map(c => `<button type="button" data-c="${c}" style="background:${c}"></button>`).join('')}</div><button type="button" class="pop-link" data-c="">Aucune</button>`, p => { p.onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; closePop(); tx('Couleur de l\'onglet', () => { sh0().tab = b.dataset.c; }); renderTabs(); }; }); }
function extraActions(add){
  add('Analyse', 'Tableau croisé dynamique', pivotDlg, 'pivot tcd synthèse'); add('Analyse', 'Mini-graphiques', sparkDlg, 'sparkline'); add('Analyse', 'Valeur cible', goalDlg, 'goal seek'); add('Analyse', 'Règle de validation des données', dvRuleDlg, 'validation nombre date');
  add('Analyse', 'Protéger la feuille', protectDlg, 'verrouiller mot de passe'); add('Analyse', 'Mise en page et impression', pageDlg, 'imprimer orientation marges'); add('Analyse', 'Afficher les formules', toggleFormulas, 'ctrl `');
  add('Insérer', 'Formes et images', () => openPanel('shapes'), 'forme rectangle flèche texte image logo'); add('Insérer', 'Importer une image', pickImage, 'photo png jpg'); add('Style', 'Styles de cellule', () => openPanel('style'), 'titre bon mauvais neutre');
}
