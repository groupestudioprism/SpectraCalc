/* =====================================================================
   Communauté : bibliothèque publique de modèles.
   Chacun peut proposer un de ses classeurs comme modèle ; il reste « en attente » jusqu'à ce qu'un administrateur
   Studio Prism le publie ou le refuse (onglet Modération, réservé aux administrateurs). Les membres peuvent signaler
   un modèle publié : il remonte alors dans la file de modération. Collection Firestore swPublic (+ content/main).
   ===================================================================== */
const PUB_MAX_SIZE = 400000, PUB_MAX_PENDING = 10, PUB_HIDE_REPORTS = 3;
const isAdm = () => access.level === 'admin';
const PUB_STATUS = {pending:'En attente de vérification', published:'Publié', rejected:'Refusé'};
/* premier filtre, côté navigateur, avant même la modération humaine */
const PUB_BAD = /\b(porn\w*|sexe?|xxx|nazi\w*|hitler|terroris\w*|bombe artisanale|suicide|viol(?:er|s)?|p[eé]dophil\w*|encul\w*|salope|connard|nique|fdp|ntm|bite|chatte|nègre|negro|bougnoule|youpin|pd)\b/i;

const PubLocal = {
  key:'sp.demo.scpublic',
  db(){ const d = store.get(this.key) || {}; return {items:{}, content:{}, ...d}; },
  put(d){ try { localStorage.setItem(this.key, JSON.stringify(d)); } catch(e){ throw {code:'app/device-full'}; } },
  async list(kind){ await sleep(80); const all = Object.values(this.db().items);
    return kind === 'published' ? all.filter(x => x.status === 'published') : kind === 'mine' ? all.filter(x => x.ownerUid === me.uid) : all.filter(x => x.status === 'pending' || (x.reports || 0) > 0); },
  async get(id){ const d = this.db(), x = d.items[id]; if (!x || !(x.status === 'published' || x.ownerUid === me.uid || isAdm())) throw {code:'permission-denied'}; return d.content[id] || ''; },
  async create(f){ await sleep(80); const d = this.db(), id = randId('t'), now = Date.now();
    d.items[id] = {id, ownerUid:me.uid, ownerName:f.ownerName, name:f.name, desc:f.desc, cat:f.cat, status:'pending', reason:'', preview:f.preview, theme:f.theme, pageSize:f.pageSize, size:f.size, uses:0, reports:0, reporters:[], createdAt:now, updatedAt:now};
    d.content[id] = f.data; this.put(d); return {...d.items[id]}; },
  async review(id, status, reason = ''){ if (!isAdm()) throw {code:'permission-denied'}; const d = this.db(), x = d.items[id]; if (!x) throw {code:'app/not-found'};
    Object.assign(x, {status, reason, reviewedAt:Date.now(), reviewedBy:me.uid, updatedAt:Date.now()}); if (status === 'published'){ x.reports = 0; x.reporters = []; } this.put(d); },
  async remove(id){ const d = this.db(), x = d.items[id]; if (x && x.ownerUid !== me.uid && !isAdm()) throw {code:'permission-denied'}; delete d.items[id]; delete d.content[id]; this.put(d); },
  async use(id){ const d = this.db(); if (d.items[id]){ d.items[id].uses = (d.items[id].uses || 0) + 1; this.put(d); } },
  async report(id){ const d = this.db(), x = d.items[id]; if (!x || (x.reporters || []).includes(me.uid)) return; x.reporters = [...(x.reporters || []), me.uid]; x.reports = x.reporters.length; this.put(d); },
};
const PubFB = {
  get db(){ return FirebaseAuth.db; }, ts(){ return FirebaseAuth.ts(); },
  T(id){ return this.db.collection('scPublic').doc(id); }, C(id){ return this.T(id).collection('content').doc('main'); },
  m(d){ const x = d.data(); return {...x, id:d.id, createdAt:ms(x.createdAt), updatedAt:ms(x.updatedAt)}; },
  async list(kind){
    const c = this.db.collection('scPublic');
    if (kind === 'published') return (await c.where('status', '==', 'published').limit(400).get()).docs.map(d => this.m(d));
    if (kind === 'mine') return (await c.where('ownerUid', '==', me.uid).limit(100).get()).docs.map(d => this.m(d));
    const [a, b] = await Promise.all([c.where('status', '==', 'pending').limit(200).get(), c.where('reports', '>', 0).limit(200).get()]);
    const out = new Map(); [...a.docs, ...b.docs].forEach(d => out.set(d.id, this.m(d))); return [...out.values()];
  },
  async get(id){ const s = await this.C(id).get(); return s.exists ? s.data().data : ''; },
  async create(f){
    const ref = this.db.collection('scPublic').doc(), b = this.db.batch();
    const rec = {ownerUid:me.uid, ownerName:f.ownerName, name:f.name, desc:f.desc, cat:f.cat, status:'pending', reason:'', preview:f.preview, theme:f.theme, pageSize:f.pageSize, size:f.size,
      uses:0, reports:0, reporters:[], createdAt:this.ts(), updatedAt:this.ts()};
    b.set(ref, rec); b.set(ref.collection('content').doc('main'), {data:f.data, updatedAt:this.ts()}); await b.commit();
    return {...rec, id:ref.id, createdAt:Date.now(), updatedAt:Date.now()};
  },
  async review(id, status, reason = ''){ const f = {status, reason, reviewedAt:this.ts(), reviewedBy:me.uid, updatedAt:this.ts()}; if (status === 'published'){ f.reports = 0; f.reporters = []; } await this.T(id).update(f); },
  async remove(id){ const b = this.db.batch(); b.delete(this.C(id)); b.delete(this.T(id)); await b.commit(); },
  async use(id){ await this.T(id).update({uses:firebase.firestore.FieldValue.increment(1)}); },
  async report(id){ await this.T(id).update({reports:firebase.firestore.FieldValue.increment(1), reporters:firebase.firestore.FieldValue.arrayUnion(me.uid)}); },
};
const Pub = () => cloudMode === 'firebase' ? PubFB : cloudMode === 'demo' ? PubLocal : null;
const P = {published:null, mine:null, mod:null, loading:false, err:'', q:'', cat:'Toutes', sort:'pop'};
async function loadPub(kinds){
  const api = Pub(); if (!api) return;
  P.loading = true; P.err = ''; renderHome();
  try {
    const res = await Promise.all(kinds.map(k => withTimeout(api.list(k), 15000)));
    kinds.forEach((k, i) => { P[k === 'pending' ? 'mod' : k] = res[i]; });
  } catch(e){ P.err = e?.code === 'permission-denied' ? 'La Communauté s\'ouvrira dès que les règles Firestore de SPECTRA Calc seront publiées.' : errMsg(e); console.warn('[SPECTRA Calc] Communauté', e); }
  P.loading = false; renderHome();
}

/* ---------- Onglet Modèles : Studio Prism · Communauté · Mes modèles · Modération ---------- */
function renderTemplatesTab(){
  if (P.uid !== me?.uid){ Object.assign(P, {uid:me?.uid, published:null, mine:null, mod:null, err:'', q:'', cat:'Toutes'}); }
  if (isAdm() && Pub() && P.mod === null && !P.loading && !P.err) setTimeout(() => loadPub(['pending', 'published', 'mine']), 0);
  const mt = myTplCards(), src = H.src || 'studio';
  const modN = (P.mod || []).length;
  let h = `<div class="hsrc" role="tablist">${[['studio', 'Studio Prism'], ['community', 'Communauté'], ...(mt.length ? [['mine', `Mes modèles <i>${mt.length}</i>`]] : []), ...(isAdm() ? [['mod', `Modération${modN ? ` <i class="hot">${modN}</i>` : ''}`]] : [])]
    .map(([k, t]) => `<button type="button" role="tab" data-src="${k}" aria-selected="${k === src}">${t}</button>`).join('')}</div>`;
  if (src === 'mine') return h + `<div class="tgrid">${mt.map(t => tplCard(t, true)).join('')}</div>`;
  if (src === 'community') return h + communityHtml();
  if (src === 'mod') return h + modHtml();
  const cats = ['Tous', ...new Set(TPL().filter(t => t.id !== 'blank').map(t => t.cat))];
  const list = TPL().filter(t => H.cat === 'Tous' || t.cat === H.cat || t.id === 'blank');
  return h + `<div class="hcats" role="tablist">${cats.map(c => `<button type="button" role="tab" data-cat="${esc(c)}" aria-selected="${c === H.cat}">${esc(c)}</button>`).join('')}</div>
    <div class="tgrid">${list.map(t => tplCard(t, true)).join('')}</div>`;
}
const shortName = n => { const p = String(n || '').trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0] || 'Membre'; };
function pubCard(t){
  return `<article class="tcard big pcard" data-pub="${esc(t.id)}" tabindex="0" aria-label="Utiliser le modèle ${esc(t.name)}">
    <div class="tthumb">${miniPage(previewOf(t), t.theme, /-l$/.test(t.pageSize || '') ? 'land' : '')}</div>
    <b>${esc(t.name)}</b><small>${esc(t.desc || t.cat)}</small>
    <span class="pc-by">${esc(shortName(t.ownerName))}${t.uses ? ` · ${t.uses.toLocaleString('fr-FR')} utilisation${t.uses > 1 ? 's' : ''}` : ''}</span>
    <button type="button" class="pc-flag" data-pact="report" data-id="${esc(t.id)}" title="Signaler ce modèle" aria-label="Signaler ${esc(t.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg></button></article>`;
}
function communityHtml(){
  if (!Pub()) return `<div class="hempty"><div class="hic">${ICON.share}</div><h3>Communauté bientôt disponible</h3><p>La bibliothèque publique s'ouvrira dès que le cloud SPECTRA Calc sera activé sur le serveur Studio Prism.</p></div>`;
  if (P.published === null && !P.loading && !P.err){ setTimeout(() => loadPub(['published', 'mine', ...(isAdm() ? ['pending'] : [])]), 0); }
  const how = `<div class="pub-how"><div><b>Partagez vos plus beaux classeurs</b><span>Ouvrez un classeur, puis Fichier → « Publier dans la Communauté ». L'équipe Studio Prism vérifie chaque modèle avant sa mise en ligne.</span></div></div>`;
  if (P.err) return how + `<div class="hempty"><p>${esc(P.err)}</p><button type="button" class="ap-btn alt" data-pact="reload">Réessayer</button></div>`;
  if (P.loading && P.published === null) return how + `<div class="tgrid">${'<div class="tcard big"><div class="tthumb sk"></div></div>'.repeat(6)}</div>`;
  const pub = (P.published || []).filter(t => (t.reports || 0) < PUB_HIDE_REPORTS || isAdm());
  const cats = ['Toutes', ...new Set(pub.map(t => t.cat).filter(Boolean))];
  let h = how;
  if (pub.length) h += `<div class="pub-tools"><label class="pub-q"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="pubQ" placeholder="Chercher dans la Communauté" value="${esc(P.q)}"></label>
      <div class="hcats">${cats.map(c => `<button type="button" data-pcat="${esc(c)}" aria-selected="${c === P.cat}">${esc(c)}</button>`).join('')}</div>
      <select id="pubSort" aria-label="Trier"><option value="pop"${P.sort === 'pop' ? ' selected' : ''}>Les plus utilisés</option><option value="new"${P.sort === 'new' ? ' selected' : ''}>Les plus récents</option></select></div>
    <div class="tgrid" id="pubGrid">${pubGrid(pub)}</div>`;
  else h += `<div class="hempty"><div class="hic">${ICON.share}</div><h3>La Communauté démarre</h3><p>Aucun modèle publié pour l'instant. Soyez le premier : ouvrez un classeur réussi et publiez-le.</p></div>`;
  const mine = P.mine || [];
  if (mine.length) h += `<section class="hsec-wrap"><div class="hsec-h"><h2 class="hsec">Mes publications</h2></div><div class="pub-mine">${mine.sort((a, b) => b.createdAt - a.createdAt).map(t => `<div class="pm-row">
      <div class="pm-th">${miniPage(previewOf(t), t.theme)}</div><div class="pm-i"><b>${esc(t.name)}</b><span class="pst ${t.status}">${PUB_STATUS[t.status] || t.status}</span>${t.status === 'rejected' && t.reason ? `<small>Motif : ${esc(t.reason)}</small>` : t.status === 'published' ? `<small>${(t.uses || 0).toLocaleString('fr-FR')} utilisation${(t.uses || 0) > 1 ? 's' : ''}</small>` : `<small>Proposé ${ago(t.createdAt)}</small>`}</div>
      <button type="button" class="ap-btn alt" data-pact="delete" data-id="${esc(t.id)}">${t.status === 'published' ? 'Retirer' : 'Supprimer'}</button></div>`).join('')}</div></section>`;
  return h;
}
function pubGrid(pub){
  const q = nrm(P.q), words = q.split(/\s+/).filter(Boolean);
  let l = (pub || (P.published || [])).filter(t => (P.cat === 'Toutes' || t.cat === P.cat) && words.every(w => nrm(t.name + ' ' + t.desc + ' ' + t.cat + ' ' + t.ownerName).includes(w)));
  l = l.sort((a, b) => P.sort === 'new' ? b.createdAt - a.createdAt : (b.uses || 0) - (a.uses || 0) || b.createdAt - a.createdAt);
  return l.length ? l.map(pubCard).join('') : '<p class="pub-none">Aucun modèle ne correspond.</p>';
}
function modHtml(){
  if (!isAdm()) return '';
  if (P.mod === null && !P.loading && !P.err) setTimeout(() => loadPub(['pending', 'published', 'mine']), 0);
  if (P.err) return `<div class="hempty"><p>${esc(P.err)}</p><button type="button" class="ap-btn alt" data-pact="reload">Réessayer</button></div>`;
  if (P.loading && P.mod === null) return '<p class="pub-none">Chargement de la file de modération…</p>';
  const l = (P.mod || []).sort((a, b) => (b.reports || 0) - (a.reports || 0) || a.createdAt - b.createdAt);
  if (!l.length) return `<div class="hempty"><div class="hic">✓</div><h3>Rien à vérifier</h3><p>Tous les modèles proposés ont été traités. Les nouveaux et les signalés apparaîtront ici.</p></div>`;
  return `<p class="pub-modh">${l.length} modèle${l.length > 1 ? 's' : ''} à vérifier. Ouvrez l'aperçu, lancez l'analyse IA si besoin, puis publiez ou refusez (le motif est montré à l'auteur).</p><div class="pub-mod">${l.map(t => `<div class="pm-row mod" data-row="${esc(t.id)}">
    <div class="pm-th" data-pact="preview" data-id="${esc(t.id)}" title="Aperçu">${miniPage(previewOf(t), t.theme)}</div>
    <div class="pm-i"><b>${esc(t.name)}</b>${t.status === 'published' ? `<span class="pst rep">Signalé ${t.reports} fois</span>` : `<span class="pst pending">Nouveau</span>`}
      <small>${esc(t.ownerName || '')} · ${esc(t.cat)} · ${ago(t.createdAt)} · ${kb(t.size)}</small>${t.desc ? `<small>${esc(t.desc)}</small>` : ''}<div class="pm-ai" id="ai_${esc(t.id)}"></div></div>
    <div class="pm-acts"><button type="button" class="ap-btn alt" data-pact="preview" data-id="${esc(t.id)}">Aperçu</button>${window.SWAI?.available() ? `<button type="button" class="ap-btn alt" data-pact="ai" data-id="${esc(t.id)}">Analyse IA</button>` : ''}
      <button type="button" class="ap-btn alt" data-pact="reject" data-id="${esc(t.id)}">${t.status === 'published' ? 'Retirer' : 'Refuser'}</button><button type="button" class="ap-btn" data-pact="approve" data-id="${esc(t.id)}">${t.status === 'published' ? 'Garder' : 'Publier'}</button></div></div>`).join('')}</div>`;
}
const pubFind = id => [...(P.published || []), ...(P.mine || []), ...(P.mod || [])].find(t => t.id === id);
async function pubData(id){ const raw = await withTimeout(Pub().get(id), 15000); const j = JSON.parse(raw || '{}'); if (!j.sheets) throw {code:'app/not-found'}; return {raw, j}; }
async function pubUse(id){
  const t = pubFind(id); if (!t) return;
  showBusy('Préparation du modèle…');
  try { const {j} = await pubData(id); hideBusy();
    j.tpl = ''; j.title = t.name; Pub().use(id).catch(() => {}); t.uses = (t.uses || 0) + 1;
    await newDoc('', {data:JSON.stringify(j), name:t.name}); }
  catch(e){ hideBusy(); toastA(errMsg(e)); }
}
async function pubPreview(id){
  const t = pubFind(id); if (!t) return;
  dlg(`<h3>${esc(t.name)}</h3><p class="dlg-p small">${esc(t.ownerName || '')} · ${esc(t.cat)}${t.desc ? ' · ' + esc(t.desc) : ''}</p><div class="pub-prev"><p class="pub-none">Chargement…</p></div>
    <div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Fermer</button>${t.status === 'published' ? `<button type="button" class="ap-btn" id="pvUse">Utiliser ce modèle</button>` : ''}</div>`, async d => {
    const u = d.querySelector('#pvUse'); if (u) u.onclick = () => { closeDlg(); pubUse(id); };
    try { const {raw} = await pubData(id); d.querySelector('.pub-prev').innerHTML = `<div class="pub-page">${window.SWEditor.previewFull(raw)}</div>`; }
    catch(e){ d.querySelector('.pub-prev').innerHTML = `<p class="pub-none">${esc(errMsg(e))}</p>`; }
  }, 'wide xl');
}
async function pubAi(id, btn){
  const box = $a('#ai_' + id); if (!box) return; busy(btn, true, 'Analyse…');
  try { const {raw} = await pubData(id); const txt = window.SWEditor.textOf(raw).replace(/\s+/g, ' ').slice(0, 20000);
    const r = await window.SWAI.moderate(`Titre : ${pubFind(id)?.name}\nDescription : ${pubFind(id)?.desc || ''}\n\n${txt}`);
    box.innerHTML = `<span class="pst ${r.ok ? 'published' : 'rejected'}">${r.ok ? 'IA : rien à signaler' : 'IA : à vérifier'}</span> <small>${esc(r.summary || '')}${r.reasons?.length ? ' · ' + esc(r.reasons.join(', ')) : ''}</small>`; }
  catch(e){ box.innerHTML = `<small>${esc(e?.message || errMsg(e))}</small>`; }
  busy(btn, false);
}
function pubReject(id){
  const t = pubFind(id); if (!t) return;
  dlg(`<h3>${t.status === 'published' ? 'Retirer' : 'Refuser'} « ${esc(t.name)} »</h3><p class="dlg-p">Le motif est montré à l'auteur dans « Mes publications ».</p>
    <div class="pub-reasons">${['Contenu inapproprié', 'Données personnelles visibles', 'Modèle vide ou inachevé', 'Contenu protégé (droits d\'auteur)', 'Doublon d\'un modèle existant', 'Publicité ou spam'].map(r => `<button type="button" class="ap-btn alt" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div>
    <label class="ap-field"><span>Motif</span><span class="ap-in"><input id="rjIn" maxlength="280" placeholder="Précisez le motif"></span></label><p class="ap-err" id="dlgErr"></p>
    <div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Annuler</button><button type="button" class="ap-btn danger" id="rjOk">${t.status === 'published' ? 'Retirer' : 'Refuser'}</button></div>`, d => {
    d.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { d.querySelector('#rjIn').value = b.dataset.r; });
    d.querySelector('#rjOk').onclick = async e => { const v = d.querySelector('#rjIn').value.trim(); if (!v) return d.querySelector('#dlgErr').textContent = 'Indiquez un motif.';
      busy(e.currentTarget, true); try { await Pub().review(id, 'rejected', v); closeDlg(); pubAfterReview(id, 'rejected', v); toastA('Modèle refusé'); } catch(err){ busy(e.currentTarget, false); d.querySelector('#dlgErr').textContent = errMsg(err); } };
  });
}
function pubAfterReview(id, status, reason){
  const t = pubFind(id); P.mod = (P.mod || []).filter(x => x.id !== id);
  if (t){ Object.assign(t, {status, reason, reports:status === 'published' ? 0 : t.reports});
    P.published = (P.published || []).filter(x => x.id !== id); if (status === 'published') P.published.push({...t}); }
  renderHome();
}
/* Publier le classeur ouvert dans la Communauté */
function publishCurrent(){
  if (!Pub()) return dlg(`<h3>Communauté bientôt disponible</h3><p class="dlg-p">La publication s'ouvrira dès que le cloud SPECTRA Calc sera activé sur le serveur Studio Prism. En attendant, « Enregistrer comme modèle » le garde dans vos modèles personnels.</p><div class="dlg-acts"><button type="button" class="ap-btn" data-dlg="close">Compris</button></div>`);
  const data = window.SWEditor.get(), meta = window.SWEditor.meta(), j = JSON.parse(data), size = byteLen(data);
  if (size > PUB_MAX_SIZE) return dlg(`<h3>Classeur trop lourd</h3><p class="dlg-p">Un modèle public est limité à ${kb(PUB_MAX_SIZE)} (celui-ci fait ${kb(size)}). Réduisez ou retirez quelques images, puis réessayez.</p><div class="dlg-acts"><button type="button" class="ap-btn" data-dlg="close">Compris</button></div>`);
  const cats = [...new Set(TPL().filter(t => t.id !== 'blank').map(t => t.cat)), 'Autre'];
  dlg(`<h3>Publier dans la Communauté</h3><p class="dlg-p">Votre classeur devient un modèle que tous les utilisateurs de SPECTRA Calc pourront utiliser. Il sera vérifié par l'équipe Studio Prism avant sa mise en ligne.</p>
    <form id="pubF"><label class="ap-field"><span>Nom du modèle</span><span class="ap-in"><input id="pbName" maxlength="80" value="${esc(j.title || '')}" required></span></label>
    <label class="ap-field"><span>Description courte</span><span class="ap-in"><input id="pbDesc" maxlength="160" placeholder="Par exemple : devis clair avec totaux automatiques"></span></label>
    <label class="ap-field"><span>Catégorie</span><span class="ap-in"><select id="pbCat">${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></span></label>
    <label class="ap-check"><input type="checkbox" id="pbOk"><span>Je confirme avoir le droit de partager ce contenu, et qu'il ne contient ni données personnelles réelles (noms, adresses, numéros), ni contenu choquant.</span></label>
    <p class="ap-err" id="dlgErr"></p><div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" type="submit">Proposer le modèle</button></div></form>`, d => {
    d.querySelector('#pubF').onsubmit = async e => {
      e.preventDefault(); const err = d.querySelector('#dlgErr'), name = d.querySelector('#pbName').value.trim(), desc = d.querySelector('#pbDesc').value.trim(), cat = d.querySelector('#pbCat').value;
      if (name.length < 2) return err.textContent = 'Donnez un nom au modèle.';
      if (!d.querySelector('#pbOk').checked) return err.textContent = 'Cochez la case de confirmation.';
      const text = window.SWEditor.textOf(data);
      if ((text.match(/[\p{L}\p{N}]+/gu) || []).length < 12) return err.textContent = 'Ce classeur est presque vide : ajoutez du contenu avant de le publier.';
      if (PUB_BAD.test(name + ' ' + desc + ' ' + text)) return err.textContent = 'Ce classeur contient des mots qui ne sont pas acceptés dans la Communauté.';
      const b = e.submitter || d.querySelector('[type=submit]'); busy(b, true, 'Envoi…');
      try {
        if (P.mine === null) P.mine = await withTimeout(Pub().list('mine'), 12000);
        if (P.mine.filter(t => t.status === 'pending').length >= PUB_MAX_PENDING) throw {message:`Vous avez déjà ${PUB_MAX_PENDING} modèles en attente de vérification. Patientez un peu avant d'en proposer d'autres.`};
        const rec = await withTimeout(Pub().create({name, desc, cat, data, size, preview:meta.preview || '', theme:meta.theme || '', pageSize:meta.pageSize || '', ownerName:fullName()}), 20000);
        P.mine = [rec, ...(P.mine || [])]; if (isAdm() && P.mod) P.mod.push(rec);
        closeDlg(); dlg(`<h3>Merci, c'est envoyé</h3><p class="dlg-p">« ${esc(name)} » est en attente de vérification par l'équipe Studio Prism. Vous suivrez son statut dans Modèles → Communauté → Mes publications.</p><div class="dlg-acts"><button type="button" class="ap-btn" data-dlg="close">Parfait</button></div>`);
      } catch(x){ busy(b, false); err.textContent = x?.message && !x.code ? x.message : errMsg(x); }
    };
  });
}
async function pubReport(id){
  const t = pubFind(id); if (!t) return;
  if ((t.reporters || []).includes(me.uid)) return toastA('Vous avez déjà signalé ce modèle. Merci.');
  confirmDlg('Signaler ce modèle ?', `« ${esc(t.name)} » sera revu par l'équipe Studio Prism. Signalez un contenu choquant, haineux, trompeur, ou qui contient des données personnelles.`, 'Signaler', async () => {
    await Pub().report(id); t.reporters = [...(t.reporters || []), me.uid]; t.reports = (t.reports || 0) + 1; toastA('Merci, le modèle a été signalé.'); renderHome(); });
}
/* événements de l'onglet Modèles */
$a('#homeBody').addEventListener('click', async e => {
  const t = e.target;
  const s = t.closest('[data-src]'); if (s){ H.src = s.dataset.src; if (s.dataset.src === 'mod' || s.dataset.src === 'community'){ P.err = ''; } return renderHome(); }
  const pc = t.closest('[data-pcat]'); if (pc){ P.cat = pc.dataset.pcat; return renderHome(); }
  const a = t.closest('[data-pact]');
  if (a){ e.stopPropagation(); const id = a.dataset.id, k = a.dataset.pact;
    if (k === 'reload'){ P.published = P.mine = P.mod = null; P.err = ''; return renderHome(); }
    if (k === 'report') return pubReport(id);
    if (k === 'preview') return pubPreview(id);
    if (k === 'ai') return pubAi(id, a);
    if (k === 'reject') return pubReject(id);
    if (k === 'approve'){ busy(a, true); try { await Pub().review(id, 'published'); pubAfterReview(id, 'published', ''); toastA('Modèle publié dans la Communauté'); } catch(x){ busy(a, false); toastA(errMsg(x)); } return; }
    if (k === 'delete'){ const it = pubFind(id); return confirmDlg('Retirer ce modèle ?', `« ${esc(it?.name || '')} » sera supprimé de la Communauté. Les classeurs déjà créés à partir de lui ne changent pas.`, 'Supprimer', async () => {
      await Pub().remove(id); ['published', 'mine', 'mod'].forEach(k2 => { if (P[k2]) P[k2] = P[k2].filter(x => x.id !== id); }); renderHome(); toastA('Modèle retiré'); }); }
  }
  const pb = t.closest('[data-pub]'); if (pb) return pubUse(pb.dataset.pub);
});
$a('#homeBody').addEventListener('input', e => { if (e.target.id === 'pubQ'){ P.q = e.target.value; const g = $a('#pubGrid'); if (g) g.innerHTML = pubGrid((P.published || []).filter(t => (t.reports || 0) < PUB_HIDE_REPORTS || isAdm())); window.SWScaleMinis?.(g); } });
$a('#homeBody').addEventListener('change', e => { if (e.target.id === 'pubSort'){ P.sort = e.target.value; renderHome(); } });
$a('#homeBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-pub]')) e.target.click(); });
