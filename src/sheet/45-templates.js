/* ---------- Modèles de classeurs (construits à la création : dates du jour, formules en français) ---------- */
function TS(name, o = {}){ return {name, cells:{}, cw:{}, rh:{}, merges:[], freeze:{r:0, c:0}, cf:[], charts:[], dv:[], tables:[], ...o}; }
/* écrit un bloc de lignes à partir d'une cellule ; chaque valeur : texte brut, ou {r:brut, s:style} */
function put(sh, at, rows, style){
  const p = parseA1(at);
  rows.forEach((row, i) => row.forEach((v, j) => { if (v == null) return; const a = A1(p.r + i, p.c + j); const d = typeof v === 'object' ? v : {r:String(v)}; const prev = sh.cells[a]; const ps = prev && typeof prev === 'object' ? prev.s : null;
    const s = {...(ps || {}), ...(style || {}), ...(d.s || {})}; sh.cells[a] = Object.keys(s).length ? {r:d.r, s} : d.r; }));
}
function sty(sh, rg, style){ const g = parseRange(rg); for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++){ const a = A1(r, c), prev = sh.cells[a]; const raw = prev == null ? '' : typeof prev === 'object' ? prev.r : prev; const s = {...(typeof prev === 'object' ? prev.s : {}), ...style}; sh.cells[a] = {r:raw, s}; } }
const W = (sh, o) => Object.assign(sh.cw, o);
const dF = s => fmtDate(s, 'dd/mm/yyyy');
const EUR = '#,##0.00 €', EUR0 = '#,##0 €', PCT = '0%', PCT1 = '0.0%', DATE = 'dd/mm/yyyy';
const H1 = {b:1, fs:18}, SUB = {fc:'#7B7690'}, LBL = {fc:'#4B465E'}, TOT = {b:1};
function wbJSON(title, theme, sheets){ return {v:1, app:'spectracalc', title, theme:{id:theme}, active:0, sheets}; }

const SC_TEMPLATES = [
  {id:'blank', name:'Classeur vierge', cat:'Essentiels', desc:'Une grille vide, toutes les fonctions', theme:'spectra', build:() => wbJSON('Classeur sans titre', 'spectra', [TS('Feuille 1')])},

  {id:'budget', name:'Budget mensuel', cat:'Finances perso', desc:'Revenus, dépenses, écarts et graphique', featured:true, theme:'spectra', build:() => {
    const s = TS('Budget', {freeze:{r:0, c:0}});
    const m = MONTHS[new Date().getMonth()], y = new Date().getFullYear();
    const dm = /^[aeiou]/.test(m) ? 'd\'' : 'de '; put(s, 'B2', [[{r:`Budget ${dm}${m} ${y}`, s:H1}]]); put(s, 'B3', [[{r:'Saisissez vos montants prévus et réels : tout se calcule.', s:SUB}]]);
    put(s, 'B5', [['Revenus', 'Prévu', 'Réel', 'Écart']]);
    put(s, 'B6', [['Salaire', '2400', '2400'], ['Primes', '0', '150'], ['Autres revenus', '100', '80']]);
    for (let r = 6; r <= 8; r++) put(s, 'E' + r, [[`=D${r}-C${r}`]]);
    put(s, 'B9', [[{r:'Total revenus', s:TOT}, {r:'=SOMME(C6:C8)', s:TOT}, {r:'=SOMME(D6:D8)', s:TOT}, {r:'=D9-C9', s:TOT}]]);
    put(s, 'B11', [['Dépenses', 'Prévu', 'Réel', 'Écart']]);
    const dep = [['Loyer ou crédit', 750, 750], ['Énergie et eau', 120, 134], ['Courses', 420, 465], ['Transports', 160, 142], ['Assurances', 85, 85], ['Téléphone et internet', 45, 45], ['Loisirs', 120, 168], ['Santé', 40, 22], ['Épargne', 300, 300], ['Divers', 80, 61]];
    put(s, 'B12', dep.map(([a, b, c]) => [a, String(b), String(c)]));
    for (let r = 12; r < 12 + dep.length; r++) put(s, 'E' + r, [[`=C${r}-D${r}`]]);
    const e = 11 + dep.length;
    put(s, 'B' + (e + 1), [[{r:'Total dépenses', s:TOT}, {r:`=SOMME(C12:C${e})`, s:TOT}, {r:`=SOMME(D12:D${e})`, s:TOT}, {r:`=C${e + 1}-D${e + 1}`, s:TOT}]]);
    put(s, 'G5', [[{r:'En bref', s:{b:1, fs:13}}], ['Reste à vivre (réel)'], [{r:`=D9-D${e + 1}`, s:{b:1, fs:20, nf:EUR}}], ['Taux d\'épargne'], [{r:`=SIERREUR(D20/D9;0)`, s:{b:1, fs:16, nf:PCT}}], ['Plus gros poste'], [{r:`=INDEX(B12:B${e};EQUIV(MAX(D12:D${e});D12:D${e};0))`, s:{b:1}}]]);
    sty(s, `C6:E${e + 1}`, {nf:EUR}); sty(s, 'C9:E9', {nf:EUR});
    s.tables.push({range:'B5:E9', total:true}, {range:`B11:E${e + 1}`, total:true, color:'#F2387A'});
    s.cf.push({range:'E6:E8', type:'neg', style:{fc:'#D92D20'}}, {range:`E12:E${e}`, type:'neg', style:{fc:'#D92D20', bg:'#FFE4E4'}}, {range:`D12:D${e}`, type:'bar', color:'#F2387A'});
    s.charts.push({id:'c1', type:'donut', range:`B11:B${e};D11:D${e}`, title:'Où va l\'argent (réel)', x:600, y:300, w:380, h:300, legend:true});
    W(s, {A:24, B:190, C:110, D:110, E:110, F:30, G:190}); s.rh = {1:34};
    return wbJSON(`Budget ${dm}${m} ${y}`, 'spectra', [s]);
  }},

  {id:'facture', name:'Facture', cat:'Commercial', desc:'Lignes, HT, TVA, TTC calculés, mentions légales', featured:true, theme:'studio', build:() => {
    const s = TS('Facture', {grid:false}); const t = todaySerial();
    put(s, 'B2', [[{r:'Votre entreprise', s:{b:1, fs:16}}], [{r:'12 rue de l\'Exemple · 59000 Lille', s:SUB}], [{r:'SIRET 000 000 000 00000 · TVA FR00000000000', s:SUB}], [{r:'contact@entreprise.fr · 03 00 00 00 00', s:SUB}]]);
    put(s, 'F2', [[{r:'FACTURE', s:{b:1, fs:22, ha:'r'}}]]); s.merges.push('F2:G2');
    put(s, 'F4', [['N°', {r:`F-${new Date().getFullYear()}-001`, s:{ha:'r'}}], ['Date', {r:dF(t), s:{ha:'r', nf:DATE}}], ['Échéance', {r:'=G5+30', s:{ha:'r', nf:DATE}}]], LBL);
    put(s, 'B8', [[{r:'Facturé à', s:{b:1, fc:'#0A5E8E'}}], ['Nom du client'], ['Adresse'], ['Code postal Ville']]);
    put(s, 'B13', [['Désignation', 'Qté', 'Unité', 'Prix unitaire HT', 'TVA', 'Total HT']]);
    const L = [['Conception et plans', 1, 'forfait', 1800, .2], ['Visite de chantier', 3, 'u', 150, .2], ['Rendu 3D', 2, 'u', 450, .2], ['Fournitures', 1, 'lot', 120, .2]];
    L.forEach(([a, q, u, p, v], i) => { const r = 14 + i; put(s, 'B' + r, [[a, String(q), u, String(p), String(v * 100) + ' %', `=C${r}*E${r}`]]); });
    for (let r = 14 + L.length; r < 22; r++) put(s, 'G' + r, [[`=SI(C${r}="";"";C${r}*E${r})`]]);
    sty(s, 'E14:E21', {nf:EUR}); sty(s, 'G14:G21', {nf:EUR}); sty(s, 'F14:F21', {nf:PCT, ha:'c'}); sty(s, 'C14:D21', {ha:'c'});
    put(s, 'F23', [['Total HT', {r:'=SOMME(G14:G21)', s:{nf:EUR}}], ['TVA', {r:'=SOMMEPROD(G14:G21;F14:F21)', s:{nf:EUR}}], [{r:'Total TTC', s:{b:1}}, {r:'=G23+G24', s:{b:1, nf:EUR, fs:13}}]]);
    sty(s, 'F25:G25', {bt:'2px #0A5E8E'});
    put(s, 'B28', [[{r:'Règlement par virement : IBAN FR76 0000 0000 0000 0000 0000 000 · BIC XXXXXXXX', s:LBL}], [{r:'En cas de retard de paiement, pénalités au taux de trois fois le taux d\'intérêt légal et indemnité forfaitaire de 40 € pour frais de recouvrement.', s:{fc:'#7B7690', fs:8}}]]);
    s.tables.push({range:'B13:G21', style:'line'});
    W(s, {A:24, B:250, C:60, D:70, E:130, F:80, G:120});
    return wbJSON('Facture', 'studio', [s]);
  }},

  {id:'devis', name:'Devis', cat:'Commercial', desc:'Prestations, remise, acompte, bon pour accord', theme:'moderne', build:() => {
    const s = TS('Devis', {grid:false}); const t = todaySerial();
    put(s, 'B2', [[{r:'DEVIS', s:{b:1, fs:24}}], [{r:'Votre entreprise · 12 rue de l\'Exemple, 59000 Lille', s:SUB}]]);
    put(s, 'E2', [['N°', `D-${new Date().getFullYear()}-001`], ['Date', {r:dF(t), s:{nf:DATE}}], ['Valable jusqu\'au', {r:'=F3+30', s:{nf:DATE}}]], LBL);
    put(s, 'B6', [[{r:'Client', s:{b:1}}], ['Nom du client · adresse · email']]);
    put(s, 'B9', [['Prestation', 'Jours', 'Tarif / jour HT', 'Total HT']]);
    [['Atelier de cadrage', 1, 650], ['Conception', 4, 550], ['Réalisation', 6, 550], ['Formation des équipes', 1, 600]].forEach(([a, j, p], i) => put(s, 'B' + (10 + i), [[a, String(j), String(p), `=C${10 + i}*D${10 + i}`]]));
    sty(s, 'D10:E13', {nf:EUR});
    put(s, 'D15', [['Sous-total HT', {r:'=SOMME(E10:E13)', s:{nf:EUR}}], ['Remise', {r:'5 %', s:{nf:PCT}}], ['Total HT', {r:'=E15*(1-E16)', s:{nf:EUR}}], ['TVA 20 %', {r:'=E17*20%', s:{nf:EUR}}], [{r:'Total TTC', s:TOT}, {r:'=E17+E18', s:{b:1, nf:EUR, fs:13}}], ['Acompte 30 %', {r:'=E19*30%', s:{nf:EUR}}]]);
    put(s, 'B22', [[{r:'Bon pour accord : date et signature du client', s:LBL}]]);
    s.tables.push({range:'B9:E13'}); W(s, {A:24, B:260, C:70, D:140, E:130});
    return wbJSON('Devis', 'moderne', [s]);
  }},

  {id:'depenses', name:'Suivi des dépenses', cat:'Finances perso', desc:'Saisie par catégorie, totaux automatiques, graphique', featured:true, theme:'ocean', build:() => {
    const s = TS('Dépenses', {freeze:{r:1, c:0}}), r = TS('Synthèse'); const t = todaySerial();
    const cats = ['Alimentation', 'Transport', 'Logement', 'Loisirs', 'Santé', 'Shopping', 'Autre'];
    put(s, 'A1', [['Date', 'Catégorie', 'Description', 'Montant', 'Payé par']]);
    const rows = [[t - 12, 0, 'Supermarché', 86.4, 'Carte'], [t - 11, 1, 'Plein d\'essence', 62, 'Carte'], [t - 9, 3, 'Cinéma', 24, 'Carte'], [t - 8, 0, 'Marché', 31.5, 'Espèces'], [t - 6, 2, 'Électricité', 74.9, 'Prélèvement'], [t - 5, 4, 'Pharmacie', 18.2, 'Carte'], [t - 3, 5, 'Vêtements', 59.99, 'Carte'], [t - 2, 0, 'Boulangerie', 7.8, 'Espèces'], [t - 1, 1, 'Train', 34, 'Carte']];
    put(s, 'A2', rows.map(([d, c, de, m, p]) => [{r:dF(d), s:{nf:DATE}}, cats[c], de, {r:String(m).replace('.', ','), s:{nf:EUR}}, p]));
    s.dv.push({range:'B2:B500', list:cats, colors:Object.fromEntries(cats.map((c, i) => [c, ['#E8F7EF', '#EEF2FF', '#FFF4E5', '#F3E8FF', '#FFE4E4', '#FCE7F3', '#E2E8F0'][i]]))}, {range:'E2:E500', list:['Carte', 'Espèces', 'Prélèvement', 'Virement']});
    sty(s, 'D2:D500', {nf:EUR}); sty(s, 'A2:A500', {nf:DATE});
    s.tables.push({range:'A1:E10'}); W(s, {A:110, B:140, C:240, D:110, E:120});
    put(r, 'B2', [[{r:'Dépenses par catégorie', s:H1}]]);
    put(r, 'B4', [['Catégorie', 'Total', 'Part']]);
    cats.forEach((c, i) => put(r, 'B' + (5 + i), [[c, `=SOMME.SI(Dépenses!B:B;B${5 + i};Dépenses!D:D)`, `=SIERREUR(C${5 + i}/C${5 + cats.length};0)`]]));
    const e = 5 + cats.length; put(r, 'B' + e, [[{r:'Total', s:TOT}, {r:`=SOMME(C5:C${e - 1})`, s:TOT}, {r:'100 %', s:TOT}]]);
    sty(r, `C5:C${e}`, {nf:EUR}); sty(r, `D5:D${e}`, {nf:PCT1});
    r.tables.push({range:`B4:D${e}`, total:true}); r.cf.push({range:`D5:D${e - 1}`, type:'bar'});
    r.charts.push({id:'c1', type:'col', range:`B4:C${e - 1}`, title:'Total par catégorie', x:460, y:40, w:440, h:300, legend:false});
    W(r, {A:24, B:160, C:120, D:90});
    return wbJSON('Suivi des dépenses', 'ocean', [s, r]);
  }},

  {id:'gantt', name:'Planning de projet', cat:'Gestion de projet', desc:'Diagramme de Gantt automatique, avancement', featured:true, theme:'studio', build:() => {
    const s = TS('Planning', {freeze:{r:4, c:7}}); const t = todaySerial(); const mon = t - ((fromSerial(t).wd + 6) % 7);
    put(s, 'A1', [[{r:'Planning du projet', s:H1}]]); put(s, 'A2', [[{r:'Début du projet', s:LBL}, {r:dF(mon), s:{nf:DATE, b:1}}]]);
    put(s, 'A4', [['Phase', 'Tâche', 'Responsable', 'Début', 'Durée (j)', 'Fin', 'Avancement']]);
    const T = [['Étude', 'Relevés et diagnostic', 'Camille', 0, 5, 1], ['Étude', 'Esquisse', 'Camille', 5, 8, 1], ['Conception', 'Avant-projet', 'Hugo', 13, 10, .6], ['Conception', 'Permis de construire', 'Hugo', 23, 5, .2], ['Consultation', 'Dossier entreprises', 'Léa', 28, 10, 0], ['Consultation', 'Analyse des offres', 'Léa', 38, 5, 0], ['Travaux', 'Gros œuvre', 'Entreprise A', 45, 30, 0], ['Travaux', 'Second œuvre', 'Entreprise B', 70, 25, 0], ['Réception', 'Réception des travaux', 'Camille', 95, 3, 0]];
    T.forEach(([p, ta, re, st, du, av], i) => { const r = 5 + i; put(s, 'A' + r, [[p, ta, re, {r:`=$B$2+${st}`, s:{nf:'dd/mm'}}, String(du), {r:`=SERIE.JOUR.OUVRE(D${r};E${r}-1)`, s:{nf:'dd/mm'}}, {r:String(av * 100) + ' %', s:{nf:PCT}}]]); });
    const end = 4 + T.length, weeks = 16;
    for (let w = 0; w < weeks; w++){ const c = colName(7 + w); put(s, c + '3', [[{r:w === 0 ? '=$B$2' : `=${colName(6 + w)}3+7`, s:{nf:'dd/mm', fs:8, ha:'c', fc:'#7B7690'}}]]); put(s, c + '4', [[{r:'S' + (w + 1), s:{ha:'c'}}]]); s.cw[7 + w] = 34; }
    const lastC = colName(6 + weeks);
    s.cf.push({range:`H5:${lastC}${end}`, type:'formula', a:`ET(H$3<=$F5+0;H$3+6>=$D5;H$3+6<=$D5+($F5-$D5)*$G5+6)`, style:{bg:'#0A5E8E'}, stop:true});
    s.cf.push({range:`H5:${lastC}${end}`, type:'formula', a:`ET(H$3<=$F5;H$3+6>=$D5)`, style:{bg:'#9FD3E8'}});
    s.cf.push({range:`G5:G${end}`, type:'bar', color:'#03A2AC'});
    s.cf.push({range:`H3:${lastC}4`, type:'formula', a:`ET(AUJOURDHUI()>=H$3;AUJOURDHUI()<H$3+7)`, style:{bg:'#F5B82E', fc:'#1A1726', b:1}});
    s.tables.push({range:`A4:G${end}`});
    W(s, {A:110, B:200, C:120, D:70, E:80, F:70, G:100});
    return wbJSON('Planning de projet', 'studio', [s]);
  }},

  {id:'taches', name:'Suivi des tâches', cat:'Gestion de projet', desc:'Statuts et priorités en couleur, retards signalés', theme:'spectra', build:() => {
    const s = TS('Tâches', {freeze:{r:1, c:0}}); const t = todaySerial();
    put(s, 'A1', [['Fait', 'Tâche', 'Responsable', 'Priorité', 'Statut', 'Échéance', 'Notes']]);
    const L = [[true, 'Valider le cahier des charges', 'Camille', 'Haute', 'Terminé', t - 6], [false, 'Préparer la présentation client', 'Hugo', 'Haute', 'En cours', t + 2], [false, 'Commander les échantillons', 'Léa', 'Moyenne', 'À faire', t - 1], [false, 'Mettre à jour le planning', 'Camille', 'Basse', 'À faire', t + 7], [false, 'Relancer le bureau d\'études', 'Hugo', 'Moyenne', 'Bloqué', t + 1]];
    put(s, 'A2', L.map(([f, a, b, p, st, d]) => [f ? 'VRAI' : 'FAUX', a, b, p, st, {r:dF(d), s:{nf:DATE}}, '']));
    sty(s, 'A2:A200', {chk:1, ha:'c'});
    s.dv.push({range:'D2:D200', list:['Haute', 'Moyenne', 'Basse'], colors:{Haute:'#FFE4E4', Moyenne:'#FFF4E5', Basse:'#E8F7EF'}}, {range:'E2:E200', list:['À faire', 'En cours', 'Bloqué', 'Terminé'], colors:{'À faire':'#EEF2FF', 'En cours':'#FFF1A8', 'Bloqué':'#FFE4E4', 'Terminé':'#E8F7EF'}});
    const col = {Haute:'#FFE4E4', Moyenne:'#FFF4E5', Basse:'#E8F7EF', 'À faire':'#EEF2FF', 'En cours':'#FFF1A8', 'Bloqué':'#FFE4E4', 'Terminé':'#E8F7EF'};
    L.forEach(([, , , p, st], i) => { sty(s, 'D' + (2 + i), {bg:col[p]}); sty(s, 'E' + (2 + i), {bg:col[st]}); });
    s.cf.push({range:'F2:F200', type:'formula', a:'ET(F2<>"";F2<AUJOURDHUI();$E2<>"Terminé")', style:{fc:'#D13B3B', b:1}}, {range:'B2:B200', type:'formula', a:'$A2=VRAI', style:{fc:'#9A94B2', st:1}});
    put(s, 'I1', [[{r:'Avancement', s:{b:1}}], [{r:'=SIERREUR(NB.SI(A2:A200;VRAI)/NBVAL(B2:B200);0)', s:{nf:PCT, fs:20, b:1}}], [{r:'=NB.SI(E2:E200;"Bloqué")&" bloquée(s)"', s:{fc:'#D13B3B'}}], [{r:'=SOMMEPROD((F2:F200<AUJOURDHUI())*(F2:F200<>"")*(E2:E200<>"Terminé"))&" en retard"', s:{fc:'#8A5300'}}]]);
    s.tables.push({range:'A1:G6'}); W(s, {A:50, B:260, C:120, D:90, E:100, F:100, G:200, H:24, I:150});
    return wbJSON('Suivi des tâches', 'spectra', [s]);
  }},

  {id:'inventaire', name:'Inventaire', cat:'Commerce', desc:'Stock, valeur, alertes de réapprovisionnement', theme:'nature', build:() => {
    const s = TS('Stock', {freeze:{r:1, c:2}});
    put(s, 'A1', [['Référence', 'Article', 'Catégorie', 'Stock', 'Seuil', 'Prix unitaire', 'Valeur', 'État']]);
    const L = [['A-001', 'Vis inox 4×40 (boîte)', 'Quincaillerie', 42, 20, 8.9], ['A-002', 'Chevilles 8 mm (boîte)', 'Quincaillerie', 12, 15, 6.5], ['B-010', 'Plaque de plâtre BA13', 'Matériaux', 64, 30, 9.8], ['B-011', 'Rail métallique 3 m', 'Matériaux', 18, 25, 4.2], ['C-100', 'Peinture blanche 10 L', 'Finitions', 9, 6, 64], ['C-101', 'Rouleau 180 mm', 'Finitions', 4, 8, 7.5], ['D-200', 'Gants de protection', 'Sécurité', 35, 20, 3.9]];
    L.forEach(([a, b, c, st, se, p], i) => { const r = 2 + i; put(s, 'A' + r, [[a, b, c, String(st), String(se), {r:String(p).replace('.', ','), s:{nf:EUR}}, {r:`=D${r}*F${r}`, s:{nf:EUR}}, `=SI(D${r}<=E${r};"À commander";"OK")`]]); });
    const e = 1 + L.length; put(s, 'A' + (e + 1), [[{r:'Total', s:TOT}, '', '', {r:`=SOMME(D2:D${e})`, s:TOT}, '', '', {r:`=SOMME(G2:G${e})`, s:{b:1, nf:EUR}}, {r:`=NB.SI(H2:H${e};"À commander")&" à commander"`, s:TOT}]]);
    s.cf.push({range:`H2:H${e}`, type:'eq', a:'À commander', style:{bg:'#FFE4E4', fc:'#A12A2A', b:1}}, {range:`H2:H${e}`, type:'eq', a:'OK', style:{bg:'#E8F7EF', fc:'#0F6E45'}}, {range:`D2:D${e}`, type:'bar', color:'#16A34A'});
    s.tables.push({range:`A1:H${e + 1}`, total:true}); W(s, {A:90, B:220, C:120, D:80, E:70, F:110, G:110, H:120});
    return wbJSON('Inventaire', 'nature', [s]);
  }},

  {id:'ventes', name:'Tableau de bord des ventes', cat:'Commerce', desc:'Ventes mensuelles, évolution, graphiques', featured:true, theme:'minuit', build:() => {
    const s = TS('Ventes'), d = TS('Tableau de bord', {grid:false});
    const P = ['Conseil', 'Plans 3D', 'Suivi de chantier'], base = [[4200, 3100, 2600], [4800, 3400, 2900], [5100, 3900, 3100], [4700, 4300, 3500], [5600, 4500, 3800], [6100, 5200, 4100], [5900, 5000, 4300], [5200, 4700, 3900], [6300, 5600, 4600], [6800, 6100, 5000], [7200, 6400, 5300], [7900, 7000, 5800]];
    put(s, 'A1', [['Mois', ...P, 'Total', 'Évolution']]);
    base.forEach((row, i) => { const r = 2 + i; put(s, 'A' + r, [[MONTHS[i][0].toUpperCase() + MONTHS[i].slice(1), ...row.map(String), {r:`=SOMME(B${r}:D${r})`, s:{b:1}}, i ? {r:`=SIERREUR(E${r}/E${r - 1}-1;"")`, s:{nf:PCT1}} : '']]); });
    put(s, 'A14', [[{r:'Total', s:TOT}, ...['B', 'C', 'D', 'E'].map(c => ({r:`=SOMME(${c}2:${c}13)`, s:TOT})), '']]);
    sty(s, 'B2:E14', {nf:EUR0}); s.tables.push({range:'A1:F14', total:true}); s.cf.push({range:'F3:F13', type:'scale', colors:['#F8696B', '#FFFFFF', '#63BE7B']});
    W(s, {A:110, B:110, C:110, D:140, E:120, F:100});
    put(d, 'B2', [[{r:`Ventes ${new Date().getFullYear()}`, s:{b:1, fs:22}}], [{r:'Tableau de bord mis à jour automatiquement depuis la feuille « Ventes »', s:SUB}]]);
    put(d, 'B5', [[{r:'Chiffre d\'affaires', s:LBL}, null, {r:'Meilleur mois', s:LBL}, null, {r:'Moyenne mensuelle', s:LBL}], [{r:'=Ventes!E14', s:{b:1, fs:20, nf:EUR0}}, null, {r:'=INDEX(Ventes!A2:A13;EQUIV(MAX(Ventes!E2:E13);Ventes!E2:E13;0))', s:{b:1, fs:20}}, null, {r:'=MOYENNE(Ventes!E2:E13)', s:{b:1, fs:20, nf:EUR0}}]]);
    d.charts.push({id:'c1', type:'line', range:'A1:D13', sheet:'Ventes', title:'Ventes par mois et par activité', x:24, y:150, w:600, h:330, legend:true}, {id:'c2', type:'donut', range:'A1:D14', sheet:'Ventes', title:'Répartition par activité', x:640, y:150, w:360, h:330, legend:true, by:'rows', pick:'last'});
    W(d, {A:24, B:180, C:24, D:180, E:24, F:180});
    return wbJSON('Tableau de bord des ventes', 'minuit', [d, s]);
  }},

  {id:'pret', name:'Simulateur de prêt', cat:'Finances perso', desc:'Mensualité, coût total, tableau d\'amortissement', theme:'ardoise', build:() => {
    const s = TS('Prêt', {freeze:{r:10, c:0}});
    put(s, 'B2', [[{r:'Simulateur de prêt immobilier', s:H1}], [{r:'Modifiez les cases jaunes : tout se recalcule.', s:SUB}]]);
    put(s, 'B5', [['Montant emprunté', {r:'250 000 €', s:{nf:EUR0, bg:'#FFF1A8'}}], ['Taux annuel', {r:'3,4 %', s:{nf:'0.00%', bg:'#FFF1A8'}}], ['Durée (années)', {r:'20', s:{bg:'#FFF1A8'}}], ['Assurance (taux annuel)', {r:'0,3 %', s:{nf:'0.00%', bg:'#FFF1A8'}}]]);
    put(s, 'E5', [['Mensualité (hors assurance)', {r:'=-VPM(C6/12;C7*12;C5)', s:{nf:EUR, b:1}}], ['Assurance par mois', {r:'=C5*C8/12', s:{nf:EUR}}], [{r:'Mensualité totale', s:TOT}, {r:'=F5+F6', s:{nf:EUR, b:1, fs:14}}], ['Coût total du crédit', {r:'=F7*C7*12-C5', s:{nf:EUR0, fc:'#D13B3B', b:1}}]]);
    put(s, 'B10', [['Mois', 'Date', 'Mensualité', 'Intérêts', 'Capital', 'Restant dû']]);
    const t = todaySerial(), first = fromSerial(t);
    for (let i = 1; i <= 240; i++){ const r = 10 + i;
      put(s, 'B' + r, [[String(i), {r:i === 1 ? `=DATE(${first.y};${first.m + 1};1)` : `=MOIS.DECALER(C${r - 1};1)`, s:{nf:'mmm yyyy'}}, {r:`=SI(B${r}>$C$7*12;"";$F$5)`, s:{nf:EUR}}, {r:`=SI(D${r}="";"";${i === 1 ? '$C$5' : 'G' + (r - 1)}*$C$6/12)`, s:{nf:EUR}}, {r:`=SI(D${r}="";"";D${r}-E${r})`, s:{nf:EUR}}, {r:`=SI(D${r}="";"";MAX(0;${i === 1 ? '$C$5' : 'G' + (r - 1)}-F${r}))`, s:{nf:EUR0}}]]); }
    s.tables.push({range:'B10:G250', style:'line'}); s.cf.push({range:'G11:G250', type:'bar', color:'#475569'});
    s.charts.push({id:'c1', type:'area', range:'C10:C250;G10:G250', title:'Capital restant dû', x:880, y:280, w:420, h:260, legend:false});
    W(s, {A:24, B:190, C:130, D:110, E:190, F:120, G:120});
    return wbJSON('Simulateur de prêt', 'ardoise', [s]);
  }},

  {id:'temps', name:'Feuille de temps', cat:'Travail', desc:'Heures par jour, pauses, total de la semaine', theme:'moderne', build:() => {
    const s = TS('Semaine'); const t = todaySerial(), mon = t - ((fromSerial(t).wd + 6) % 7);
    put(s, 'B2', [[{r:'Feuille de temps', s:H1}], [{r:'Semaine du', s:LBL}, {r:dF(mon), s:{nf:DATE, b:1, bg:'#FFF1A8'}}]]);
    put(s, 'B5', [['Jour', 'Date', 'Arrivée', 'Départ', 'Pause', 'Heures', 'Commentaire']]);
    ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].forEach((j, i) => { const r = 6 + i; const we = i > 4;
      put(s, 'B' + r, [[j, {r:`=$C$3+${i}`, s:{nf:'dd/mm'}}, {r:we ? '' : '08:30', s:{nf:'hh:mm'}}, {r:we ? '' : '17:30', s:{nf:'hh:mm'}}, {r:we ? '' : '01:00', s:{nf:'hh:mm'}}, {r:`=SI(E${r}="";0;E${r}-D${r}-F${r})`, s:{nf:'[h]:mm'}}, '']]); });
    put(s, 'B13', [[{r:'Total semaine', s:TOT}, '', '', '', '', {r:'=SOMME(G6:G12)', s:{b:1, nf:'[h]:mm'}}], ['Heures supplémentaires (au-delà de 35 h)', '', '', '', '', {r:'=MAX(0;G13-35/24)', s:{nf:'[h]:mm', fc:'#D13B3B', b:1}}]]);
    s.tables.push({range:'B5:H13', total:true}); s.cf.push({range:'B11:H12', type:'notempty', style:{fc:'#9A94B2'}});
    W(s, {A:24, B:110, C:80, D:80, E:80, F:80, G:90, H:220});
    return wbJSON('Feuille de temps', 'moderne', [s]);
  }},

  {id:'invites', name:'Liste d\'invités', cat:'Événements', desc:'Réponses en couleur, nombre de personnes, régimes', theme:'pastel', build:() => {
    const s = TS('Invités', {freeze:{r:3, c:0}});
    put(s, 'A1', [[{r:'Liste des invités', s:H1}]]);
    put(s, 'A3', [['Nom', 'Contact', 'Réponse', 'Adultes', 'Enfants', 'Régime', 'Table']]);
    const L = [['Famille Martin', '06 00 00 00 01', 'Oui', 2, 2, '', 1], ['Sophie Bernard', 'sophie@exemple.fr', 'Oui', 1, 0, 'Végétarien', 1], ['Thomas et Julie', '06 00 00 00 02', 'Peut-être', 2, 0, '', 2], ['Famille Dubois', 'dubois@exemple.fr', 'Non', 0, 0, '', ''], ['Marc Petit', '06 00 00 00 03', 'En attente', 1, 0, 'Sans gluten', 2]];
    put(s, 'A4', L.map(x => x.map(String)));
    const col = {Oui:'#E8F7EF', Non:'#FFE4E4', 'Peut-être':'#FFF4E5', 'En attente':'#EEF2FF'};
    s.dv.push({range:'C4:C300', list:Object.keys(col), colors:col}); L.forEach((x, i) => sty(s, 'C' + (4 + i), {bg:col[x[2]]}));
    put(s, 'I3', [[{r:'Résumé', s:{b:1}}], ['Personnes confirmées', {r:'=SOMME.SI(C4:C300;"Oui";D4:D300)+SOMME.SI(C4:C300;"Oui";E4:E300)', s:{b:1, fs:16}}], ['Dont enfants', '=SOMME.SI(C4:C300;"Oui";E4:E300)'], ['Réponses en attente', '=NB.SI(C4:C300;"En attente")+NB.SI(C4:C300;"Peut-être")'], ['Régimes particuliers', '=NB.SI.ENS(C4:C300;"Oui";F4:F300;"<>")']]);
    s.tables.push({range:'A3:G8'}); W(s, {A:180, B:170, C:110, D:80, E:80, F:120, G:70, H:24, I:180, J:80});
    return wbJSON('Liste d\'invités', 'pastel', [s]);
  }},

  {id:'notes', name:'Suivi des notes', cat:'Études', desc:'Moyennes, rang, mentions, couleurs', theme:'manuscrit', build:() => {
    const s = TS('Notes', {freeze:{r:2, c:1}});
    put(s, 'A1', [[{r:'Suivi des notes · trimestre 1', s:H1}]]);
    put(s, 'A2', [['Élève', 'Contrôle 1', 'Contrôle 2', 'Exposé', 'Devoir maison', 'Moyenne', 'Rang', 'Appréciation']]);
    const N = [['Alice', 14, 16, 17, 15], ['Bastien', 9, 11.5, 12, 14], ['Chloé', 18, 17, 19, 16], ['Dylan', 7, 9, 10, 12], ['Emma', 12, 13.5, 15, 13], ['Félix', 15, 12, 14, 17]];
    N.forEach(([n, ...v], i) => { const r = 3 + i; put(s, 'A' + r, [[n, ...v.map(x => String(x).replace('.', ',')), {r:`=ARRONDI(MOYENNE(B${r}:E${r});1)`, s:{b:1, nf:'0.0'}}, `=RANG(F${r};$F$3:$F$8)`, `=SI(F${r}>=16;"Très bien";SI(F${r}>=14;"Bien";SI(F${r}>=12;"Assez bien";SI(F${r}>=10;"Passable";"Insuffisant"))))`]]); });
    put(s, 'A10', [[{r:'Moyenne de la classe', s:TOT}, ...['B', 'C', 'D', 'E', 'F'].map(c => ({r:`=ARRONDI(MOYENNE(${c}3:${c}8);1)`, s:{b:1, nf:'0.0'}}))]]);
    s.cf.push({range:'B3:F8', type:'scale', colors:['#F8696B', '#FFEB84', '#63BE7B']}, {range:'H3:H8', type:'eq', a:'Insuffisant', style:{fc:'#D13B3B', b:1}});
    s.tables.push({range:'A2:H8'}); s.charts.push({id:'c1', type:'bar', range:'A2:A8;F2:F8', title:'Moyennes', x:880, y:30, w:360, h:300, legend:false, labels:true});
    W(s, {A:120, B:90, C:90, D:80, E:110, F:90, G:60, H:140});
    return wbJSON('Suivi des notes', 'manuscrit', [s]);
  }},

  {id:'comparatif', name:'Comparateur de devis', cat:'Commercial', desc:'Critères pondérés, note finale, meilleur choix', theme:'corail', build:() => {
    const s = TS('Comparatif');
    put(s, 'B2', [[{r:'Comparatif des offres', s:H1}], [{r:'Notez chaque offre de 0 à 10 ; le poids indique l\'importance du critère.', s:SUB}]]);
    put(s, 'B5', [['Critère', 'Poids', 'Entreprise A', 'Entreprise B', 'Entreprise C']]);
    const L = [['Prix', '35 %', 7, 9, 6], ['Délais', '20 %', 8, 6, 9], ['Références', '15 %', 9, 7, 8], ['Qualité technique', '20 %', 8, 7, 9], ['Garanties et SAV', '10 %', 6, 8, 7]];
    L.forEach((x, i) => put(s, 'B' + (6 + i), [[x[0], {r:x[1], s:{nf:PCT}}, ...x.slice(2).map(String)]]));
    put(s, 'B11', [[{r:'Note finale /10', s:TOT}, {r:'=SOMME(C6:C10)', s:{nf:PCT, b:1}}, ...['D', 'E', 'F'].map(c => ({r:`=ARRONDI(SOMMEPROD($C$6:$C$10;${c}6:${c}10)/$C$11;2)`, s:{b:1, nf:'0.00', fs:13}}))]]);
    put(s, 'B13', [['Meilleure offre', {r:'=INDEX(D5:F5;EQUIV(MAX(D11:F11);D11:F11;0))', s:{b:1, fs:16, fc:'#E5484D'}}]]);
    s.cf.push({range:'D6:F10', type:'scale', colors:['#FFFFFF', '#FF9E80']}, {range:'D11:F11', type:'formula', a:'D11=MAX($D$11:$F$11)', style:{bg:'#E8F7EF', fc:'#0F6E45'}});
    s.tables.push({range:'B5:F11', total:true}); s.charts.push({id:'c1', type:'col', range:'B5:B10;D5:F10', title:'Notes par critère', x:720, y:40, w:480, h:300, legend:true});
    W(s, {A:24, B:180, C:80, D:120, E:120, F:120});
    return wbJSON('Comparateur de devis', 'corail', [s]);
  }},

  {id:'dpgf', name:'DPGF / métré', cat:'BTP & architecture', desc:'Lots, quantités, prix, sous-totaux, TVA', featured:true, theme:'studio', build:() => {
    const s = TS('DPGF', {freeze:{r:5, c:0}});
    put(s, 'A1', [[{r:'Décomposition du prix global et forfaitaire', s:H1}], [{r:'Opération : [nom] · Maître d\'œuvre : Studio Prism', s:SUB}]]);
    put(s, 'A5', [['N°', 'Désignation', 'Unité', 'Quantité', 'Prix unitaire HT', 'Total HT']]);
    const lots = [['01', 'Gros œuvre', [['01.1', 'Terrassements en pleine masse', 'm³', 120, 28], ['01.2', 'Béton de fondation', 'm³', 34, 185], ['01.3', 'Murs en blocs béton 20 cm', 'm²', 210, 62]]], ['02', 'Charpente et couverture', [['02.1', 'Charpente bois traditionnelle', 'm²', 140, 75], ['02.2', 'Couverture tuiles terre cuite', 'm²', 155, 58]]], ['03', 'Menuiseries extérieures', [['03.1', 'Fenêtres aluminium', 'u', 12, 890], ['03.2', 'Porte d\'entrée', 'u', 1, 2400]]]];
    let r = 6; const totalRows = [];
    for (const [n, name, items] of lots){
      put(s, 'A' + r, [[{r:"'" + n, s:{b:1}}, {r:name, s:{b:1}}]]); sty(s, `A${r}:F${r}`, {bg:'#EDF6F8', b:1}); const head = r; r++;
      const first = r; for (const [k, d, u, q, p] of items){ put(s, 'A' + r, [["'" + k, d, {r:u, s:{ha:'c'}}, String(q), {r:String(p), s:{nf:EUR}}, {r:`=D${r}*E${r}`, s:{nf:EUR}}]]); r++; }
      put(s, 'E' + head, [[{r:'Sous-total', s:{ha:'r', fc:'#4B465E'}}, {r:`=SOUS.TOTAL(9;F${first}:F${r - 1})`, s:{nf:EUR, b:1}}]]); totalRows.push(head);
    }
    r++; put(s, 'E' + r, [[{r:'Total HT', s:{b:1}}, {r:`=SOUS.TOTAL(9;F6:F${r - 2})`, s:{nf:EUR, b:1}}], ['TVA 20 %', {r:`=F${r}*20%`, s:{nf:EUR}}], [{r:'Total TTC', s:{b:1}}, {r:`=F${r}+F${r + 1}`, s:{nf:EUR, b:1, fs:13}}]]);
    sty(s, `E${r + 2}:F${r + 2}`, {bt:'2px #0A5E8E'});
    s.tables.push({range:`A5:F${r - 2}`, style:'line'}); W(s, {A:60, B:320, C:70, D:90, E:140, F:130});
    return wbJSON('DPGF', 'studio', [s]);
  }},

  {id:'surfaces', name:'Tableau des surfaces', cat:'BTP & architecture', desc:'Pièces par niveau, surfaces habitables, totaux', theme:'studio', build:() => {
    const s = TS('Surfaces', {freeze:{r:3, c:0}});
    put(s, 'A1', [[{r:'Tableau des surfaces', s:H1}]]);
    put(s, 'A3', [['Niveau', 'Pièce', 'Surface (m²)', 'Habitable', 'Surface habitable (m²)']]);
    const L = [['RDC', 'Séjour / cuisine', 42.5, 'Oui'], ['RDC', 'Entrée', 6.2, 'Oui'], ['RDC', 'WC', 1.8, 'Oui'], ['RDC', 'Garage', 18.4, 'Non'], ['R+1', 'Chambre 1', 13.6, 'Oui'], ['R+1', 'Chambre 2', 11.9, 'Oui'], ['R+1', 'Salle de bains', 7.4, 'Oui'], ['R+1', 'Dégagement', 5.1, 'Oui'], ['Combles', 'Grenier (h < 1,80 m)', 22, 'Non']];
    L.forEach(([n, p, sf, h], i) => { const r = 4 + i; put(s, 'A' + r, [[n, p, {r:String(sf).replace('.', ','), s:{nf:'0.00'}}, h, {r:`=SI(D${r}="Oui";C${r};0)`, s:{nf:'0.00'}}]]); });
    const e = 3 + L.length; s.dv.push({range:'D4:D200', list:['Oui', 'Non'], colors:{Oui:'#E8F7EF', Non:'#F1F5F9'}});
    put(s, 'A' + (e + 1), [[{r:'Total', s:TOT}, '', {r:`=SOMME(C4:C${e})`, s:{b:1, nf:'0.00'}}, '', {r:`=SOMME(E4:E${e})`, s:{b:1, nf:'0.00'}}]]);
    put(s, 'G3', [[{r:'Par niveau', s:{b:1}}, {r:'Habitable', s:{b:1}}], ['RDC', {r:`=SOMME.SI(A4:A${e};G4;E4:E${e})`, s:{nf:'0.00'}}], ['R+1', {r:`=SOMME.SI(A4:A${e};G5;E4:E${e})`, s:{nf:'0.00'}}], ['Combles', {r:`=SOMME.SI(A4:A${e};G6;E4:E${e})`, s:{nf:'0.00'}}]]);
    s.tables.push({range:`A3:E${e + 1}`, total:true}, {range:'G3:H6', color:'#03A2AC'}); s.cf.push({range:`C4:C${e}`, type:'bar', color:'#0A5E8E'});
    W(s, {A:90, B:200, C:120, D:100, E:170, F:24, G:110, H:110});
    return wbJSON('Tableau des surfaces', 'studio', [s]);
  }},

  {id:'tva', name:'Calcul de TVA', cat:'Commercial', desc:'HT ↔ TTC pour chaque taux', theme:'spectra', build:() => {
    const s = TS('TVA');
    put(s, 'B2', [[{r:'Calcul de TVA', s:H1}], [{r:'Saisissez un montant HT ou TTC dans les cases jaunes.', s:SUB}]]);
    put(s, 'B5', [['Taux', 'Montant HT', 'TVA', 'Montant TTC']]);
    ['20 %', '10 %', '5,5 %', '2,1 %'].forEach((t, i) => { const r = 6 + i; put(s, 'B' + r, [[{r:t, s:{nf:t.includes(',') ? '0.0%' : PCT}}, {r:'100', s:{nf:EUR, bg:'#FFF1A8'}}, {r:`=C${r}*B${r}`, s:{nf:EUR}}, {r:`=C${r}+D${r}`, s:{nf:EUR}}]]); });
    put(s, 'B11', [['Taux', 'Montant TTC', 'Montant HT', 'TVA']]);
    ['20 %', '10 %', '5,5 %', '2,1 %'].forEach((t, i) => { const r = 12 + i; put(s, 'B' + r, [[{r:t, s:{nf:t.includes(',') ? '0.0%' : PCT}}, {r:'120', s:{nf:EUR, bg:'#FFF1A8'}}, {r:`=C${r}/(1+B${r})`, s:{nf:EUR}}, {r:`=C${r}-D${r}`, s:{nf:EUR}}]]); });
    s.tables.push({range:'B5:E9'}, {range:'B11:E15', color:'#12B5E5'}); W(s, {A:24, B:90, C:140, D:140, E:140});
    return wbJSON('Calcul de TVA', 'spectra', [s]);
  }},

  {id:'mois', name:'Planning du mois', cat:'Travail', desc:'Jours du mois, week-ends colorés, notes', theme:'pastel', build:() => {
    const s = TS('Mois', {freeze:{r:3, c:0}}); const n = new Date();
    put(s, 'A1', [[{r:`=TEXTE(B1;"mmmm aaaa")`, s:{b:1, fs:20}}, {r:dF(toSerial(n.getFullYear(), n.getMonth() + 1, 1)), s:{nf:DATE, fc:'#9A94B2', bg:'#FFF1A8'}}]]);
    put(s, 'A3', [['Date', 'Jour', 'Matin', 'Après-midi', 'Soir', 'À ne pas oublier']]);
    for (let i = 0; i < 31; i++){ const r = 4 + i; put(s, 'A' + r, [[{r:`=SI(MOIS($B$1+${i})=MOIS($B$1);$B$1+${i};"")`, s:{nf:'dd/mm'}}, `=SI(A${r}="";"";TEXTE(A${r};"jjjj"))`]]); }
    s.cf.push({range:'A4:F34', type:'formula', a:'ET($A4<>"";JOURSEM($A4;2)>5)', style:{bg:'#F3E8FF'}}, {range:'A4:F34', type:'formula', a:'$A4=AUJOURDHUI()', style:{bg:'#FFF1A8', b:1}});
    s.tables.push({range:'A3:F34', banded:false, style:'line'}); W(s, {A:70, B:110, C:200, D:200, E:200, F:240});
    return wbJSON('Planning du mois', 'pastel', [s]);
  }},
];
window.SW_TEMPLATES = SC_TEMPLATES.map(t => ({...t, html:'', page:{}}));
