/* ---------- Interface Développeur : éditeur de code, exemples, console, Communauté ---------- */
const DV_KW = 'async await break case catch class const continue default do else export finally for function if in instanceof let new of return switch throw try typeof var while yield'.split(' ');
const DV_LIT = ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'this'];
const DV_API = ['classeur', 'Classeur', 'FeuilleActive', 'Feuille', 'Plage', 'Cellule', 'selection', 'message', 'journal', 'console', 'maintenant', 'aujourdhui', 'Range', 'Cells', 'Sheets', 'ActiveSheet', 'MsgBox', 'Selection'];
const DV_RX = new RegExp('(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$))|("(?:\\\\.|[^"\\\\\\n])*"?|\'(?:\\\\.|[^\'\\\\\\n])*\'?|`(?:\\\\[\\s\\S]|[^`\\\\])*`?)|\\b(\\d+(?:\\.\\d+)?)\\b|\\b([A-Za-z_$][\\w$]*)\\b', 'g');
function dvHL(code){
  let out = '', last = 0, m;
  DV_RX.lastIndex = 0;
  while ((m = DV_RX.exec(code))){
    out += escH(code.slice(last, m.index)); last = m.index + m[0].length;
    const t = escH(m[0]);
    if (m[1]) out += `<i class="c">${t}</i>`; else if (m[2]) out += `<i class="s">${t}</i>`; else if (m[3]) out += `<i class="n">${t}</i>`;
    else if (DV_KW.includes(m[4])) out += `<i class="k">${t}</i>`; else if (DV_LIT.includes(m[4])) out += `<i class="l">${t}</i>`;
    else if (DV_API.includes(m[4])) out += `<i class="a">${t}</i>`; else out += t;
  }
  return out + escH(code.slice(last));
}
/* analyse rapide du code (aide à la relecture ; le bac à sable reste la vraie protection) */
const SCAN = [
  [/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|import\s*\()/, 'danger', 'Tentative d\'accès au réseau ou chargement de code externe (bloqué par le bac à sable).'],
  [/\b(eval|Function)\s*\(|\.constructor\b|\bconstructor\s*\(/, 'danger', 'Exécution de code construit dynamiquement (eval, Function, constructor).'],
  [/\b(document|window|globalThis|self|parent|top|localStorage|sessionStorage|indexedDB|cookie|navigator|location|postMessage|Worker)\b/, 'danger', 'Référence à l\'environnement du navigateur (inaccessible depuis le bac à sable).'],
  [/\b(while\s*\(\s*(true|1)\s*\)|for\s*\(\s*;\s*;\s*\))/, 'warn', 'Boucle potentiellement infinie (le script serait arrêté après 10 s).'],
  [/\.(effacer|supprimer)\s*\(/, 'warn', 'Efface des données ou supprime une feuille.'],
  [/\\u00[0-9a-f]{2}|\\x[0-9a-f]{2}|fromCharCode|atob\s*\(/i, 'warn', 'Texte encodé ou obfusqué : à relire avec attention.'],
];
const scanCode = code => SCAN.filter(([rx]) => rx.test(code)).map(([, lvl, msg]) => ({lvl, msg}));

const EX_API = `// Aucune installation : le code s'exécute dans un bac à sable sécurisé (sans accès au navigateur ni au réseau).`;
const DEV_EX = [
  {kind:'macro', name:'Mettre en forme les en-têtes', desc:'Première ligne en gras, fond violet, texte blanc, colonnes élargies.', code:`${EX_API}
const f = classeur.feuilleActive;
const u = f.plageUtilisee;
const entete = f.plage(1, 1, 1, u.nbColonnes);
entete.format.gras = true;
entete.format.couleurFond = "#7B3FF2";
entete.format.couleurTexte = "#ffffff";
entete.format.alignement = "centre";
for (let c = 1; c <= u.nbColonnes; c++) f.largeurColonne(c, 130);
message("En-têtes mis en forme");`},
  {kind:'macro', name:'Ajouter une ligne de total', desc:'Somme chaque colonne numérique sous les données.', code:`const f = classeur.feuilleActive;
const u = f.plageUtilisee;
const l = u.nbLignes + 1;
f.cellule(l, 1).valeur = "Total";
for (let c = 2; c <= u.nbColonnes; c++) {
  const col = f.plage(2, c, u.nbLignes, c);
  if (col.nb() > 0) f.cellule(l, c).formule = "=SOMME(" + col.adresse + ")";
}
f.plage(l, 1, l, u.nbColonnes).format.gras = true;
f.plage(l, 1, l, u.nbColonnes).format.couleurFond = "#EDE7FF";`},
  {kind:'macro', name:'Trier par la première colonne', desc:'Trie les données (en-tête conservé) de A à Z.', code:`const f = classeur.feuilleActive;
const u = f.plageUtilisee;
if (u.nbLignes < 3) message("Pas assez de lignes à trier");
else {
  f.plage(2, 1, u.nbLignes, u.nbColonnes).trier(1, true);
  message("Données triées");
}`},
  {kind:'macro', name:'Alterner les couleurs des lignes', desc:'Bandes de couleur sur la sélection.', code:`const s = selection;
for (let i = 0; i < s.nbLignes; i++) {
  const ligne = s.decaler(i).redimensionner(1, s.nbColonnes);
  ligne.format.couleurFond = i % 2 === 0 ? "#F3EFFF" : "#FFFFFF";
}
message("Lignes alternées sur " + s.adresse);`},
  {kind:'macro', name:'Graphique de la sélection', desc:'Crée un histogramme à partir des cellules sélectionnées.', code:`const s = selection;
if (s.nbLignes < 2 || s.nbColonnes < 2) {
  message("Sélectionnez d'abord un tableau (libellés + valeurs)");
} else {
  classeur.feuilleActive.ajouterGraphique({ type: "col", plage: s.adresse, titre: "Graphique de " + s.adresse });
}`},
  {kind:'macro', name:'Calendrier du mois', desc:'Écrit les jours du mois courant dans une nouvelle feuille.', code:`const d = new Date();
const mois = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const nb = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const f = classeur.ajouterFeuille("Calendrier " + (classeur.feuilles.length + 1));
f.cellule("A1").valeur = mois;
f.cellule("A1").format.gras = true;
f.cellule("A1").format.taille = 16;
for (let j = 1; j <= nb; j++) {
  const jour = new Date(d.getFullYear(), d.getMonth(), j);
  f.cellule(j + 2, 1).valeur = jour.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
}
f.largeurColonne(1, 160);
f.activer();`},
  {kind:'macro', name:'Nettoyer les espaces', desc:'Supprime les espaces en trop dans les textes de la feuille.', code:`const u = classeur.feuilleActive.plageUtilisee;
const v = u.valeurs.map(l => l.map(x => typeof x === "string" ? x.replace(/\\s+/g, " ").trim() : x));
u.valeurs = v;
message("Espaces nettoyés");`},
  {kind:'function', name:'TVA', desc:'TVA d\'un montant HT : =TVA(100; 0,2)', code:`// Utilisable dans une cellule : =TVA(montant_HT; taux)
function TVA(ht, taux) {
  if (taux === undefined || taux === null) taux = 0.2;
  return Math.round(ht * taux * 100) / 100;
}`},
  {kind:'function', name:'MAJ_PREMIER', desc:'Met une majuscule à chaque mot : =MAJ_PREMIER(A1)', code:`function MAJ_PREMIER(texte) {
  return String(texte).toLowerCase().replace(/(^|[\\s'-])(\\p{L})/gu, (m, a, b) => a + b.toUpperCase());
}`},
  {kind:'function', name:'MOYPOND', desc:'Moyenne pondérée : =MOYPOND(valeurs; poids)', code:`function MOYPOND(valeurs, poids) {
  const v = [].concat(...[].concat(valeurs)), p = [].concat(...[].concat(poids));
  let s = 0, w = 0;
  for (let i = 0; i < v.length; i++) {
    if (typeof v[i] === "number" && typeof p[i] === "number") { s += v[i] * p[i]; w += p[i]; }
  }
  if (!w) throw new Error("Somme des poids nulle");
  return s / w;
}`},
  {kind:'function', name:'JOURS_OUVRES_ENTRE', desc:'Nombre de jours ouvrés entre deux dates : =JOURS_OUVRES_ENTRE(A1; B1)', code:`function JOURS_OUVRES_ENTRE(debut, fin) {
  let n = 0;
  for (let d = Math.floor(debut); d <= Math.floor(fin); d++) {
    const jour = (d - 2 + 7000) % 7; // 0 = samedi dans la numérotation tableur
    if (jour !== 0 && jour !== 1) n++;
  }
  return n;
}`},
];
const DV_HELP = `<h3>Référence de l'API</h3><div class="dv-help-c">
<p>Le code est du JavaScript, exécuté dans un bac à sable : <b>aucun accès au navigateur, au réseau ni à vos autres données</b>. Il travaille sur une copie du classeur ; les modifications sont appliquées d'un bloc à la fin (annulables avec Ctrl + Z). En cas d'erreur, rien n'est modifié.</p>
<table class="dv-api"><tr><th>Objet</th><th>Contenu</th></tr>
<tr><td><code>classeur</code></td><td><code>feuilleActive</code> · <code>feuilles</code> · <code>feuille("Nom")</code> · <code>ajouterFeuille("Nom")</code> · <code>titre</code></td></tr>
<tr><td><code>feuille</code></td><td><code>plage("A1:C5")</code> · <code>cellule(ligne, colonne)</code> · <code>colonne("B")</code> · <code>ligne(3)</code> · <code>plageUtilisee</code> · <code>largeurColonne(c, px)</code> · <code>hauteurLigne(l, px)</code> · <code>ajouterGraphique({type, plage, titre})</code> · <code>activer()</code> · <code>supprimer()</code> · <code>nom</code></td></tr>
<tr><td><code>plage</code></td><td><code>valeur</code> · <code>valeurs</code> (tableau 2D) · <code>formule</code> · <code>format</code> · <code>effacer()</code> · <code>effacerContenu()</code> · <code>effacerFormat()</code> · <code>cellules</code> · <code>pourChaque(fn)</code> · <code>somme()</code> · <code>moyenne()</code> · <code>min()</code> · <code>max()</code> · <code>nb()</code> · <code>decaler(l, c)</code> · <code>redimensionner(l, c)</code> · <code>fusionner()</code> · <code>trier(col, croissant)</code> · <code>copierVers("E1")</code> · <code>adresse</code> · <code>nbLignes</code> · <code>nbColonnes</code></td></tr>
<tr><td><code>format</code></td><td><code>gras</code> · <code>italique</code> · <code>souligne</code> · <code>barre</code> · <code>couleurTexte</code> · <code>couleurFond</code> · <code>taille</code> · <code>police</code> · <code>alignement</code> ("gauche", "centre", "droite") · <code>formatNombre</code> · <code>renvoi</code></td></tr>
<tr><td>Globales</td><td><code>selection</code> · <code>message("texte")</code> · <code>journal(...)</code> / <code>console.log(...)</code> · <code>Plage("A1")</code> · <code>Cellule(l, c)</code></td></tr>
<tr><td>Comme VBA</td><td><code>Range("A1").Value</code> · <code>Cells(2, 3).Formula</code> · <code>Sheets("Feuil1")</code> · <code>ActiveSheet</code> · <code>MsgBox("…")</code></td></tr></table>
<p><b>Fonctions personnalisées</b> : créez un script de type « Fonction » qui déclare <code>function MAFONCTION(a, b) { … }</code> (même nom que le script). Elle s'utilise ensuite dans une cellule : <code>=MAFONCTION(A1; B1)</code>. Elle doit être pure : pas d'accès au classeur, résultat immédiat, 3 s maximum.</p>
<p><b>Boutons</b> : « Ajouter un bouton » place sur la feuille un bouton qui lance la macro d'un clic (Maj + clic pour le sélectionner sans l'exécuter).</p></div>
<div class="dlg-acts"><button type="button" class="ap-btn" data-dlg="close">Fermer</button></div>`;

/* ---------- ouverture / fermeture ---------- */
function devRoot(){
  let r = document.getElementById('devUi'); if (r) return r;
  r = document.createElement('div'); r.id = 'devUi'; r.className = 'dev'; r.hidden = true; r.setAttribute('role', 'dialog'); r.setAttribute('aria-modal', 'true'); r.setAttribute('aria-label', 'Développeur');
  r.innerHTML = `<div class="dev-box"><header class="dev-h"><span class="dev-t"><svg viewBox="0 0 24 24"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/></svg><b>Développeur</b></span>
    <nav class="dev-tabs" role="tablist"><button type="button" role="tab" data-dv="tab" data-tab="edit">Éditeur de code</button><button type="button" role="tab" data-dv="tab" data-tab="examples">Exemples</button><button type="button" role="tab" data-dv="tab" data-tab="community">Communauté</button></nav>
    <button type="button" class="dev-x" data-dv="close" aria-label="Fermer l'interface Développeur">✕</button></header><div class="dev-main" id="devMain"></div></div>`;
  document.body.appendChild(r);
  r.addEventListener('click', devClick); r.addEventListener('input', devInput); r.addEventListener('keydown', devKey);
  r.addEventListener('mousedown', e => { if (e.target === r) closeDev(); });
  return r;
}
function openDev(tab){
  if (g$('edPanel') && panel) openPanel(panel);
  if (EDIT.on) commitEdit(0, 0);
  const r = devRoot(); DEV.open = true; r.hidden = false; if (tab) DEV.tab = tab;
  if (!DEV.sel || !macroBy(DEV.sel)) DEV.sel = macrosOf()[0]?.id || '';
  g$('edRail').querySelectorAll('.ray').forEach(x => x.setAttribute('aria-pressed', x.dataset.panel === 'dev' ? 'true' : 'false'));
  devDraw();
}
function closeDev(){
  const r = document.getElementById('devUi'); if (!r) return; devFlushCode(); DEV.open = false; r.hidden = true;
  g$('edRail').querySelectorAll('.ray').forEach(x => x.setAttribute('aria-pressed', 'false')); g$('grid').focus({preventScroll:true});
}
function devDraw(){
  const r = devRoot(); r.querySelectorAll('[data-dv="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === DEV.tab)));
  if (DEV.tab === 'edit') devDrawEdit(); else if (DEV.tab === 'examples') devDrawExamples(); else devDrawCom();
}

/* ---------- onglet Éditeur ---------- */
function devDrawEdit(){
  const main = document.getElementById('devMain'), L = macrosOf();
  const li = m => `<li><button type="button" class="dv-li${m.id === DEV.sel ? ' on' : ''}" data-dv="sel" data-id="${m.id}"><span>${escH(m.name)}</span>${m.kind === 'macro' ? `<i class="dv-run" data-dv="runid" data-id="${m.id}" title="Exécuter" role="button">▶</i>` : ''}</button></li>`;
  main.innerHTML = `<aside class="dv-side"><div class="dv-sh"><span>Macros</span><button type="button" data-dv="new-macro" title="Nouvelle macro" aria-label="Nouvelle macro">+</button></div>
      <ul>${L.filter(m => m.kind === 'macro').map(li).join('') || '<li class="dv-none">Aucune macro</li>'}</ul>
      <div class="dv-sh"><span>Fonctions</span><button type="button" data-dv="new-fn" title="Nouvelle fonction personnalisée" aria-label="Nouvelle fonction">+</button></div>
      <ul>${L.filter(m => m.kind === 'function').map(li).join('') || '<li class="dv-none">Aucune fonction</li>'}</ul>
      <div class="dv-side-b"><button type="button" class="dv-rec" data-dv="rec" id="dvRec"></button><button type="button" class="dv-link" data-dv="help">Référence de l'API</button></div></aside>
    <section class="dv-work"><div class="dv-bar" id="dvBar"></div><div class="dv-ed" id="dvEd"><div class="dv-ln" id="dvLn" aria-hidden="true"></div><div class="dv-code"><pre aria-hidden="true"><code id="dvHl"></code></pre><textarea id="dvTa" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Code du script" wrap="off"></textarea></div></div>
      <div class="dv-con"><div class="dv-con-h"><b>Console</b><span id="dvConN"></span><button type="button" data-dv="conclear">Effacer</button></div><div class="dv-con-l" id="dvCon" role="log" aria-live="polite"></div></div></section>`;
  DEV.ed = document.getElementById('dvTa'); devLoadCode(); devDrawBar(); devDrawCon();
  const ta = DEV.ed;
  ta.addEventListener('scroll', devSyncScroll);
}
function devLoadCode(){
  const m = macroBy(DEV.sel), ta = document.getElementById('dvTa'); if (!ta) return;
  ta.value = m ? m.code : ''; ta.disabled = !m || V.ro; ta.placeholder = m ? '' : 'Créez une macro avec « + », ou ajoutez un exemple depuis l\'onglet Exemples.';
  devPaint();
}
function devPaint(){
  const ta = document.getElementById('dvTa'); if (!ta) return;
  document.getElementById('dvHl').innerHTML = dvHL(ta.value) + '\n ';
  const n = ta.value.split('\n').length, err = DEV.errLine;
  document.getElementById('dvLn').innerHTML = Array.from({length:n}, (_, i) => `<span${err === i + 1 ? ' class="err"' : ''}>${i + 1}</span>`).join('');
  devSyncScroll();
}
function devSyncScroll(){ const ta = document.getElementById('dvTa'); if (!ta) return; const p = ta.parentElement.querySelector('pre'); p.scrollTop = ta.scrollTop; p.scrollLeft = ta.scrollLeft; document.getElementById('dvLn').scrollTop = ta.scrollTop; }
function devDrawBar(){
  const bar = document.getElementById('dvBar'); if (!bar) return; const m = macroBy(DEV.sel);
  const rb = document.getElementById('dvRec'); if (rb){ rb.className = 'dv-rec' + (DEV.rec ? ' on' : ''); rb.innerHTML = DEV.rec ? '<i></i>Arrêter l\'enregistrement' : '<i></i>Enregistrer une macro'; }
  if (!m){ bar.innerHTML = '<span class="dv-hint">Aucun script sélectionné.</span>'; return; }
  const fn = m.kind === 'function';
  bar.innerHTML = `<input id="dvName" class="dv-name" value="${escH(m.name)}" maxlength="40" aria-label="Nom du script"${V.ro ? ' disabled' : ''}><span class="dv-kind ${m.kind}">${fn ? 'Fonction' : 'Macro'}</span>
    ${fn ? `<span class="dv-hint">Dans une cellule : <code>=${escH(m.name.toUpperCase())}(…)</code></span>` : `<button type="button" class="dv-btn go" data-dv="run"${DEV.run || V.ro ? ' disabled' : ''}>${DEV.run ? 'En cours…' : '▶ Exécuter'}</button><button type="button" class="dv-btn" data-dv="addbtn"${V.ro ? ' disabled' : ''}>Ajouter un bouton</button>`}
    <span class="dv-sp"></span><button type="button" class="dv-btn" data-dv="share">Partager</button><button type="button" class="dv-btn danger" data-dv="del"${V.ro ? ' disabled' : ''}>Supprimer</button>`;
}
function devDrawCon(){
  const c = document.getElementById('dvCon'); if (!c) return;
  c.innerHTML = DEV.con.length ? DEV.con.map((e, i) => `<div class="dv-ce ${e.t}"${e.line ? ` data-dv="goline" data-i="${i}" role="button" tabindex="0"` : ''}><time>${new Date(e.at).toLocaleTimeString('fr-FR')}</time><span>${escH(e.text)}</span>${e.line ? `<em>ligne ${e.line}</em>` : ''}</div>`).join('') : '<div class="dv-ce info"><span>Les messages (journal), résultats et erreurs de vos scripts s\'affichent ici.</span></div>';
  c.scrollTop = c.scrollHeight; const n = DEV.con.filter(e => e.t === 'error').length; const el = document.getElementById('dvConN'); if (el) el.innerHTML = n ? `<i class="bad">${n} erreur${n > 1 ? 's' : ''}</i>` : '';
}
let devSaveT = 0;
function devFlushCode(){
  clearTimeout(devSaveT); const m = macroBy(DEV.sel), ta = document.getElementById('dvTa'); if (!m || !ta || ta.value === m.code) return;
  m.code = ta.value.slice(0, DEV_LIMIT.code); devCommit(m.kind === 'function');
}
function devInput(e){
  const t = e.target;
  if (t.id === 'dvTa'){ DEV.errLine = 0; devPaint(); clearTimeout(devSaveT); devSaveT = setTimeout(devFlushCode, 600); }
  else if (t.id === 'dvName'){ /* validé à la sortie du champ */ }
  else if (t.id === 'cmQ'){ DEV.com.q = t.value; devDrawComList(); }
}
function devKey(e){
  const t = e.target;
  if (t.id === 'dvTa'){
    DEV.ed.composing = e.isComposing;
    if (e.key === 'Tab'){ e.preventDefault(); const a = t.selectionStart, b = t.selectionEnd; t.setRangeText('  ', a, b, 'end'); t.dispatchEvent(new Event('input', {bubbles:true})); }
    else if (e.key === 'Enter'){ const a = t.selectionStart, before = t.value.slice(0, a), ln = before.slice(before.lastIndexOf('\n') + 1), ind = /^\s*/.exec(ln)[0] + (/[{(\[]\s*$/.test(ln) ? '  ' : ''); e.preventDefault(); t.setRangeText('\n' + ind, a, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input', {bubbles:true})); }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); devFlushCode(); const m = macroBy(DEV.sel); if (m?.kind === 'macro') runMacro(m); }
  } else if (t.id === 'dvName' && e.key === 'Enter'){ t.blur(); }
  else if (e.key === 'Enter' && t.dataset?.dv === 'goline') devClick({target:t});
}
document.addEventListener('focusout', e => { if (e.target.id === 'dvName') devRename(e.target.value); });
function devRename(v){
  const m = macroBy(DEV.sel); if (!m) return; v = v.trim().slice(0, 40); if (!v || v === m.name) return devDrawBar();
  if (m.kind === 'function' && !validFnName(v)){ toast('Nom de fonction : lettres, chiffres et _ (sans espace ni accent), sans commencer par un chiffre'); return devDrawBar(); }
  if (macrosOf().some(x => x !== m && x.name.toLowerCase() === v.toLowerCase())){ toast('Un script porte déjà ce nom'); return devDrawBar(); }
  if (m.kind === 'function'){ const re = new RegExp('\\bfunction\\s+' + m.name + '\\b'); if (re.test(m.code)) m.code = m.code.replace(re, 'function ' + v); }
  m.name = v; devCommit(m.kind === 'function'); devDraw();
}

/* ---------- clics ---------- */
async function devClick(e){
  const b = e.target.closest ? e.target.closest('[data-dv]') : e.target; if (!b) return; const a = b.dataset.dv; if (!a) return;
  if (b.disabled || b.tagName === 'SELECT') return;
  if (a === 'close') return closeDev();
  if (a === 'tab'){ devFlushCode(); DEV.tab = b.dataset.tab; return devDraw(); }
  if (a === 'sel'){ devFlushCode(); DEV.sel = b.dataset.id; DEV.errLine = 0; return devDrawEdit(); }
  if (a === 'runid'){ e.stopPropagation?.(); devFlushCode(); return runMacro(macroBy(b.dataset.id)); }
  if (a === 'new-macro' || a === 'new-fn'){
    devFlushCode(); if (V.ro) return toast('Classeur en lecture seule');
    const fn = a === 'new-fn', name = fn ? uniqueMacroName('MaFonction', 'function') : uniqueMacroName('Macro', 'macro');
    const m = newMacro(fn ? 'function' : 'macro', name, fn ? `// Fonction personnalisée : utilisable dans une cellule avec =${name.toUpperCase()}(valeur)\nfunction ${name}(valeur) {\n  return valeur;\n}\n` : `// Nouvelle macro : écrivez votre code ici.\n// Exemple : classeur.feuilleActive.cellule("A1").valeur = "Bonjour";\njournal("Macro lancée sur la feuille", classeur.feuilleActive.nom);\n`);
    if (m){ DEV.sel = m.id; DEV.tab = 'edit'; devDraw(); } return;
  }
  if (a === 'run'){ devFlushCode(); return runMacro(macroBy(DEV.sel)); }
  if (a === 'rec'){ if (V.ro) return toast('Classeur en lecture seule'); if (DEV.rec) recStop(); else { devFlushCode(); recStart(); closeDev(); toast('Enregistrement : faites vos actions puis cliquez sur « Arrêter »'); } return; }
  if (a === 'help') return SWDlg.open(DV_HELP, null, 'wide dv-dlg');
  if (a === 'conclear'){ DEV.con = []; DEV.errLine = 0; devPaint(); return devDrawCon(); }
  if (a === 'goline'){ const en = DEV.con[+b.dataset.i]; if (!en) return; if (en.macro && en.macro !== DEV.sel){ DEV.sel = en.macro; devDrawEdit(); } const ta = document.getElementById('dvTa'); if (!ta) return; const lines = ta.value.split('\n'); const ln = clamp(en.line, 1, lines.length); DEV.errLine = ln; devPaint();
    const start = lines.slice(0, ln - 1).join('\n').length + (ln > 1 ? 1 : 0); ta.focus(); ta.setSelectionRange(start, start + lines[ln - 1].length); ta.scrollTop = Math.max(0, (ln - 4) * 20); devSyncScroll(); return; }
  if (a === 'del'){ const m = macroBy(DEV.sel); if (!m) return; return SWDlg.open(`<h3>Supprimer « ${escH(m.name)} » ?</h3><p class="dlg-p">Le script sera retiré de ce classeur (et les boutons qui l'utilisent ne feront plus rien).</p><div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Annuler</button><button type="button" class="ap-btn danger" id="dvDelOk">Supprimer</button></div>`, d => { d.querySelector('#dvDelOk').onclick = () => { SWDlg.close(); deleteMacro(m.id); DEV.sel = macrosOf()[0]?.id || ''; devDraw(); }; }); }
  if (a === 'addbtn'){ const m = macroBy(DEV.sel); if (!m) return; closeDev(); addShape({k:'round', w:170, h:46, fill:'#7B3FF2', text:m.name, fc:'#FFFFFF', fs:14, b:1, macro:m.id, r:.3}); return toast('Bouton ajouté : cliquez dessus pour lancer la macro (Maj + clic pour le sélectionner)'); }
  if (a === 'share'){ devFlushCode(); DEV.tab = 'community'; DEV.com.view = 'submit'; DEV.com.pick = DEV.sel; return devDraw(); }
  if (a === 'ex-add'){ const ex = DEV_EX[+b.dataset.i]; if (!ex || V.ro) return V.ro ? toast('Classeur en lecture seule') : 0; const m = newMacro(ex.kind, ex.name, ex.code, {desc:ex.desc}); if (m){ DEV.sel = m.id; DEV.tab = 'edit'; devDraw(); toast(`« ${m.name} » ajouté`); } return; }
  if (a.startsWith('cm-')) return devComClick(a, b);
}
function linkMacroDlg(shapeId){
  const s = shapeById(shapeId); if (!s) return; const L = macrosOf().filter(m => m.kind === 'macro');
  SWDlg.open(`<h3>Affecter une macro</h3><p class="dlg-p">Un clic sur cette forme lancera la macro choisie.</p><div class="dv-pick">${[['', 'Aucune macro'], ...L.map(m => [m.id, m.name])].map(([id, n]) => `<label><input type="radio" name="lm" value="${escH(id)}"${(s.macro || '') === id ? ' checked' : ''}><span>${escH(n)}</span></label>`).join('')}</div>${L.length ? '' : '<p class="dlg-p small">Vous n\'avez pas encore de macro : ouvrez l\'interface Développeur pour en créer ou en installer.</p>'}<div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Annuler</button><button type="button" class="ap-btn" id="lmOk">Valider</button></div>`, d => {
    d.querySelector('#lmOk').onclick = () => { const v = d.querySelector('input[name=lm]:checked')?.value || ''; SWDlg.close(); tx('Affecter une macro', () => { if (v) s.macro = v; else delete s.macro; }); renderShapes(); schedule(); };
  });
}

/* ---------- onglet Exemples ---------- */
function devDrawExamples(){
  document.getElementById('devMain').innerHTML = `<div class="dv-page"><div class="dv-page-h"><h2>Exemples prêts à l'emploi</h2><p>Ajoutez un exemple à votre classeur, lisez-le, modifiez-le : c'est le meilleur moyen d'apprendre. Les <b>macros</b> agissent sur le classeur ; les <b>fonctions</b> s'utilisent dans les formules.</p></div>
    <div class="dv-cards">${DEV_EX.map((x, i) => `<article class="dv-card"><div class="dv-card-h"><span class="dv-kind ${x.kind}">${x.kind === 'macro' ? 'Macro' : 'Fonction'}</span><b>${escH(x.name)}</b></div><p>${escH(x.desc)}</p><pre class="dv-pre">${dvHL(x.code.split('\n').slice(0, 5).join('\n'))}${x.code.split('\n').length > 5 ? '\n…' : ''}</pre><button type="button" class="dv-btn go" data-dv="ex-add" data-i="${i}">Ajouter à mon classeur</button></article>`).join('')}</div></div>`;
}

/* ---------- onglet Communauté ---------- */
const DV_CATS = ['Mise en forme', 'Calculs', 'Données', 'Graphiques', 'Utilitaires', 'Autre'];
DEV.com = {view:'browse', published:null, mine:null, mod:null, loading:false, err:'', q:'', cat:'Toutes', sort:'pop', pick:''};
const comStatus = {pending:'En attente de validation', published:'Validé', rejected:'Refusé'};
const comShort = n => { const p = String(n || '').trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0] || 'Membre'; };
async function comLoad(kinds){
  const C = DEV.com; C.loading = true; C.err = ''; devDrawCom();
  try { const res = await Promise.all(kinds.map(k => window.SWScripts.list(k))); kinds.forEach((k, i) => { C[k === 'pending' ? 'mod' : k] = res[i]; }); }
  catch(e){ C.err = e?.message || 'Impossible de joindre la Communauté.'; }
  C.loading = false; if (DEV.open && DEV.tab === 'community') devDrawCom();
}
function devDrawCom(){
  const C = DEV.com, main = document.getElementById('devMain'), S = window.SWScripts;
  if (!S || !S.available()){ main.innerHTML = `<div class="dv-page"><div class="dv-empty"><h3>Communauté indisponible</h3><p>Connectez-vous à votre compte Studio Prism (cloud activé) pour parcourir, installer et partager des scripts.</p></div></div>`; return; }
  const adm = S.isAdmin(), modN = (C.mod || []).length;
  if (C.published === null && !C.loading && !C.err) setTimeout(() => comLoad(['published', 'mine', ...(adm ? ['pending'] : [])]), 0);
  const tabs = [['browse', 'Parcourir'], ['mine', 'Mes partages'], ['submit', 'Partager un script'], ...(adm ? [['mod', `File de validation${modN ? ` <i class="hot">${modN}</i>` : ''}`]] : [])];
  let h = `<div class="dv-page"><nav class="dv-sub" role="tablist">${tabs.map(([k, t]) => `<button type="button" role="tab" data-dv="cm-view" data-v="${k}" aria-selected="${C.view === k}">${t}</button>`).join('')}</nav>`;
  if (C.err) h += `<div class="dv-empty"><p>${escH(C.err)}</p><button type="button" class="dv-btn" data-dv="cm-reload">Réessayer</button></div>`;
  else if (C.loading && C.published === null) h += '<div class="dv-empty"><p>Chargement…</p></div>';
  else if (C.view === 'browse') h += `<div class="dv-tools"><input id="cmQ" type="search" placeholder="Rechercher un script (nom, description, auteur)" value="${escH(C.q)}" aria-label="Rechercher"><select data-dv="cm-cat" aria-label="Catégorie">${['Toutes', ...DV_CATS].map(c => `<option${c === C.cat ? ' selected' : ''}>${escH(c)}</option>`).join('')}</select><select data-dv="cm-sort" aria-label="Trier"><option value="pop"${C.sort === 'pop' ? ' selected' : ''}>Les plus installés</option><option value="new"${C.sort === 'new' ? ' selected' : ''}>Les plus récents</option></select></div><div class="dv-cards" id="cmList"></div>`;
  else if (C.view === 'mine') h += comMineHtml();
  else if (C.view === 'submit') h += comSubmitHtml();
  else if (C.view === 'mod') h += comModHtml();
  main.innerHTML = h + '</div>';
  if (C.view === 'browse' && !C.err) devDrawComList();
}
function devDrawComList(){
  const C = DEV.com, box = document.getElementById('cmList'); if (!box) return;
  const q = nrmTxt(C.q), S = window.SWScripts;
  let L = (C.published || []).filter(x => (x.reports || 0) < S.hideReports || S.isAdmin());
  if (C.cat !== 'Toutes') L = L.filter(x => x.cat === C.cat);
  if (q) L = L.filter(x => nrmTxt(`${x.name} ${x.desc} ${x.ownerName} ${x.cat}`).includes(q));
  L.sort((a, b) => C.sort === 'new' ? b.createdAt - a.createdAt : (b.installs || 0) - (a.installs || 0));
  box.innerHTML = L.length ? L.map(x => `<article class="dv-card"><div class="dv-card-h"><span class="dv-kind ${x.kind}">${x.kind === 'function' ? 'Fonction' : 'Macro'}</span><b>${escH(x.name)}</b></div><p>${escH(x.desc || '')}</p>
      <div class="dv-meta"><span>${escH(comShort(x.ownerName))}</span><span>${escH(x.cat || '')}</span><span>${(x.installs || 0).toLocaleString('fr-FR')} installation${(x.installs || 0) > 1 ? 's' : ''}</span></div>
      <div class="dv-card-a"><button type="button" class="dv-btn go" data-dv="cm-install" data-id="${escH(x.id)}">Voir et installer</button><button type="button" class="dv-btn" data-dv="cm-report" data-id="${escH(x.id)}" title="Signaler ce script" aria-label="Signaler ${escH(x.name)}">Signaler</button></div></article>`).join('')
    : `<div class="dv-empty"><h3>${(C.published || []).length ? 'Aucun résultat' : 'La Communauté démarre'}</h3><p>${(C.published || []).length ? 'Essayez d\'autres mots-clés.' : 'Aucun script publié pour l\'instant. Partagez le premier !'}</p></div>`;
}
function comMineHtml(){
  const L = (DEV.com.mine || []).slice().sort((a, b) => b.createdAt - a.createdAt);
  if (!L.length) return '<div class="dv-empty"><h3>Aucun partage</h3><p>Partagez un de vos scripts : il sera publié après validation par l\'équipe Studio Prism.</p></div>';
  return `<div class="dv-list">${L.map(x => `<div class="dv-row"><div class="dv-row-i"><b>${escH(x.name)}</b><span class="dv-st ${x.status}">${comStatus[x.status] || x.status}</span>${x.status === 'rejected' && x.reason ? `<small>Motif : ${escH(x.reason)}</small>` : x.status === 'published' ? `<small>${(x.installs || 0).toLocaleString('fr-FR')} installation(s)</small>` : '<small>Relecture du code par un administrateur en cours.</small>'}</div>
    <button type="button" class="dv-btn" data-dv="cm-del" data-id="${escH(x.id)}">${x.status === 'published' ? 'Retirer' : 'Supprimer'}</button></div>`).join('')}</div>`;
}
function comSubmitHtml(){
  const C = DEV.com, L = macrosOf(); if (!L.length) return '<div class="dv-empty"><h3>Rien à partager</h3><p>Créez d\'abord une macro ou une fonction dans l\'éditeur.</p></div>';
  const m = macroBy(C.pick) || L[0];
  return `<form id="cmForm" class="dv-form"><p class="dv-note"><b>Publication après validation.</b> Votre script reste « en attente » jusqu'à ce qu'un administrateur Studio Prism ait relu son code. Il peut être refusé. Les scripts tournent toujours dans un bac à sable.</p>
    <label>Script à partager<select id="cmPick">${L.map(x => `<option value="${x.id}"${x.id === m.id ? ' selected' : ''}>${escH(x.name)} (${x.kind === 'function' ? 'fonction' : 'macro'})</option>`).join('')}</select></label>
    <label>Titre public<input id="cmName" maxlength="60" value="${escH(m.name)}" required></label>
    <label>Description (ce que fait le script)<textarea id="cmDesc" rows="3" maxlength="200" placeholder="Ex. : met en forme les en-têtes et ajoute une ligne de total">${escH(m.desc || '')}</textarea></label>
    <label>Catégorie<select id="cmCat">${DV_CATS.map(c => `<option>${escH(c)}</option>`).join('')}</select></label>
    <label class="dv-chk"><input type="checkbox" id="cmOk"><span>Je confirme être l'auteur de ce script (ou avoir le droit de le partager), qu'il ne contient rien de malveillant ni de personnel, et j'accepte sa relecture par l'équipe Studio Prism.</span></label>
    <p class="dv-err" id="cmErr"></p><button type="submit" class="dv-btn go">Soumettre pour validation</button></form>`;
}
function comModHtml(){
  const L = (DEV.com.mod || []).slice().sort((a, b) => a.createdAt - b.createdAt);
  if (!L.length) return '<div class="dv-empty"><h3>File vide</h3><p>Aucun script en attente ni signalé. Bravo !</p></div>';
  return `<p class="dv-note">Réservé aux administrateurs. Le code doit être <b>relu en entier</b> avant approbation.</p><div class="dv-list">${L.map(x => `<div class="dv-row"><div class="dv-row-i"><b>${escH(x.name)}</b> <span class="dv-kind ${x.kind}">${x.kind === 'function' ? 'Fonction' : 'Macro'}</span><span class="dv-st ${x.status}">${comStatus[x.status] || x.status}</span>
      <small>${escH(x.ownerName || '')} · ${new Date(x.createdAt).toLocaleDateString('fr-FR')}${x.reports ? ` · <b class="bad">${x.reports} signalement${x.reports > 1 ? 's' : ''}</b>` : ''}</small><small>${escH(x.desc || '')}</small></div>
    <button type="button" class="dv-btn go" data-dv="cm-review" data-id="${escH(x.id)}">Relire le code</button></div>`).join('')}</div>`;
}
const comFind = id => [DEV.com.published, DEV.com.mine, DEV.com.mod].flatMap(l => l || []).find(x => x.id === id);
function codeViewDlg(x, code, actions, wire){
  const sc = scanCode(code);
  SWDlg.open(`<h3>${escH(x.name)}</h3><p class="dlg-p small">${x.kind === 'function' ? 'Fonction personnalisée' : 'Macro'} · ${escH(x.ownerName || 'Membre')} · ${escH(x.desc || '')}</p>
    ${sc.length ? `<ul class="dv-scan">${sc.map(s => `<li class="${s.lvl}">${escH(s.msg)}</li>`).join('')}</ul>` : '<p class="dv-scan ok">Analyse automatique : rien de suspect détecté (ne remplace pas la relecture).</p>'}
    <pre class="dv-pre big" tabindex="0">${dvHL(code)}</pre>${actions}`, wire, 'wide dv-dlg');
}
async function devComClick(a, b){
  const C = DEV.com, S = window.SWScripts;
  if (a === 'cm-view'){ C.view = b.dataset.v; return devDrawCom(); }
  if (a === 'cm-reload'){ C.published = null; C.err = ''; return devDrawCom(); }
  if (a === 'cm-cat'){ C.cat = b.value; return devDrawComList(); }
  if (a === 'cm-sort'){ C.sort = b.value; return devDrawComList(); }
  const id = b.dataset.id, x = id && comFind(id);
  if (a === 'cm-install' && x){
    let code; try { code = await S.getCode(id); } catch(e){ return toast(e.message); }
    codeViewDlg(x, code, `<p class="dlg-p small">L'installation copie ce script dans le classeur ouvert. Il s'exécute dans le bac à sable, uniquement quand vous le lancez${x.kind === 'function' ? ' ou quand une cellule utilise la fonction' : ''}.</p><div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Annuler</button><button type="button" class="ap-btn" id="inOk"${V.ro ? ' disabled' : ''}>Installer dans ce classeur</button></div>`, d => {
      d.querySelector('#inOk').onclick = () => {
        if (x.kind === 'function' && (!validFnName(x.name) || macrosOf().some(m => m.name.toLowerCase() === x.name.toLowerCase()))){ SWDlg.close(); return toast(`Une fonction « ${x.name} » existe déjà dans ce classeur : renommez-la ou supprimez-la d'abord`); }
        const m = newMacro(x.kind === 'function' ? 'function' : 'macro', x.name, code, {desc:x.desc, from:x.id}); SWDlg.close();
        if (m){ S.install(x.id); x.installs = (x.installs || 0) + 1; DEV.sel = m.id; toast(`« ${m.name} » installé`); DEV.tab = 'edit'; devDraw(); }
      };
    });
    return;
  }
  if (a === 'cm-report' && x){
    return SWDlg.open(`<h3>Signaler « ${escH(x.name)} »</h3><p class="dlg-p">Ce script sera mis en file de vérification pour les administrateurs.</p><div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Annuler</button><button type="button" class="ap-btn danger" id="rpOk">Signaler</button></div>`, d => {
      d.querySelector('#rpOk').onclick = async () => { try { await S.report(id); x.reports = (x.reports || 0) + 1; SWDlg.close(); toast('Merci, signalement envoyé'); } catch(e){ toast(e.message); } };
    });
  }
  if (a === 'cm-del' && x){ try { await S.remove(id); C.mine = (C.mine || []).filter(y => y.id !== id); C.published = (C.published || []).filter(y => y.id !== id); toast(x.status === 'published' ? 'Script retiré' : 'Partage supprimé'); } catch(e){ toast(e.message); } return devDrawCom(); }
  if (a === 'cm-review' && x){
    let code; try { code = await S.getCode(id); } catch(e){ return toast(e.message); }
    codeViewDlg(x, code, `<label class="dv-chk"><input type="checkbox" id="rvOk"><span>J'ai relu l'intégralité du code ci-dessus.</span></label><p class="ap-err" id="dlgErr"></p><div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Fermer</button><button type="button" class="ap-btn danger" id="rvNo">${x.status === 'published' ? 'Retirer' : 'Refuser'}</button>${x.status === 'published' ? '<button type="button" class="ap-btn alt" id="rvKeep">Conserver</button>' : '<button type="button" class="ap-btn" id="rvYes" disabled>Approuver et publier</button>'}</div>`, d => {
      const ok = d.querySelector('#rvOk'), yes = d.querySelector('#rvYes'); ok.onchange = () => { if (yes) yes.disabled = !ok.checked; };
      const done = (status, reason) => { C.mod = (C.mod || []).filter(y => y.id !== id); C.published = (C.published || []).filter(y => y.id !== id); if (status === 'published') C.published.push({...x, status, reports:0}); SWDlg.close(); toast(status === 'published' ? 'Script publié' : status === 'rejected' ? 'Script refusé' : 'Signalements ignorés'); devDrawCom(); };
      if (yes) yes.onclick = async () => { if (!ok.checked) return; try { await S.review(id, 'published', ''); done('published'); } catch(e){ d.querySelector('#dlgErr').textContent = e.message; } };
      const keep = d.querySelector('#rvKeep'); if (keep) keep.onclick = async () => { if (!ok.checked) return d.querySelector('#dlgErr').textContent = 'Cochez la relecture du code.'; try { await S.review(id, 'published', ''); done('kept'); } catch(e){ d.querySelector('#dlgErr').textContent = e.message; } };
      d.querySelector('#rvNo').onclick = () => { SWDlg.close(); SWAsk('Motif du refus', 'Motif (visible par l\'auteur)', '', x.status === 'published' ? 'Retirer' : 'Refuser', async v => { v = v.trim().slice(0, 280); if (!v) throw new Error('Indiquez un motif.'); await S.review(id, 'rejected', v); done('rejected', v); }); };
    });
  }
}
document.addEventListener('submit', async e => {
  if (e.target.id !== 'cmForm') return; e.preventDefault();
  const C = DEV.com, S = window.SWScripts, q = i => document.getElementById(i), err = q('cmErr'), m = macroBy(q('cmPick').value);
  if (!m) return; const name = q('cmName').value.trim(), desc = q('cmDesc').value.trim(), cat = q('cmCat').value;
  if (name.length < 2) return err.textContent = 'Donnez un titre au script.';
  if (desc.length < 10) return err.textContent = 'Décrivez en une phrase ce que fait le script (10 caractères minimum).';
  if (m.code.trim().length < 20) return err.textContent = 'Ce script est presque vide.';
  if (m.code.length > S.maxCode) return err.textContent = `Script trop long pour la Communauté (${S.maxCode.toLocaleString('fr-FR')} caractères maximum).`;
  if (!q('cmOk').checked) return err.textContent = 'Cochez la case de confirmation.';
  const btn = e.submitter; if (btn) btn.disabled = true;
  try {
    if (C.mine === null) C.mine = await S.list('mine');
    if ((C.mine || []).filter(x => x.status === 'pending').length >= S.maxPending) throw {message:`Vous avez déjà ${S.maxPending} scripts en attente de validation.`};
    const rec = await S.submit({name, desc, cat, kind:m.kind, code:m.code});
    C.mine = [rec, ...(C.mine || [])]; if (S.isAdmin() && C.mod) C.mod.push(rec); C.view = 'mine';
    devDrawCom(); SWDlg.open(`<h3>Merci, c'est envoyé</h3><p class="dlg-p">« ${escH(name)} » est <b>en attente de validation</b> : un administrateur Studio Prism relira le code avant de le publier. Suivez son statut dans « Mes partages ».</p><div class="dlg-acts"><button type="button" class="ap-btn" data-dlg="close">Compris</button></div>`);
  } catch(x){ if (btn) btn.disabled = false; err.textContent = x?.message || 'Envoi impossible.'; }
});
document.addEventListener('change', e => {
  const t = e.target; if (!t.closest || !t.closest('#devUi')) return;
  if (t.id === 'cmPick'){ DEV.com.pick = t.value; const m = macroBy(t.value); if (m){ document.getElementById('cmName').value = m.name; document.getElementById('cmDesc').value = m.desc || ''; } }
  else if (t.dataset.dv === 'cm-cat' || t.dataset.dv === 'cm-sort') devComClick(t.dataset.dv, t);
});
