/* =====================================================================
   Communauté des scripts (macros et fonctions personnalisées) : couche de données.
   Collection Firestore scScripts (+ content/main pour le code). Tout script soumis reste « en attente » (pending) jusqu'à
   ce qu'un administrateur Studio Prism ait relu le code et l'ait publié (published) ou refusé (rejected, avec un motif).
   Critère d'administrateur : le même que le site Studio Prism (profil users/{uid} avec role « admin » et status « active »,
   lu dans auth.js → access.level === 'admin'), appliqué aussi par les règles Firestore (isAdmin()). Interface : onglet
   Communauté de l'interface Développeur (src/sheet/77-dev-ui.js), via window.SWScripts.
   ===================================================================== */
const SCR_MAX_CODE = 40000, SCR_MAX_PENDING = 10, SCR_HIDE_REPORTS = 3;
const scrAdm = () => access.level === 'admin';
const ScrLocal = {
  key:'sp.demo.scscripts',
  db(){ const d = store.get(this.key) || {}; return {items:{}, content:{}, ...d}; },
  put(d){ try { localStorage.setItem(this.key, JSON.stringify(d)); } catch(e){ throw {code:'app/device-full'}; } },
  async list(kind){ await sleep(60); const all = Object.values(this.db().items);
    return kind === 'published' ? all.filter(x => x.status === 'published') : kind === 'mine' ? all.filter(x => x.ownerUid === me.uid) : all.filter(x => x.status === 'pending' || (x.reports || 0) > 0); },
  async get(id){ const d = this.db(), x = d.items[id]; if (!x || !(x.status === 'published' || x.ownerUid === me.uid || scrAdm())) throw {code:'permission-denied'}; return d.content[id] || ''; },
  async create(f){ await sleep(60); const d = this.db(), id = randId('s'), now = Date.now();
    d.items[id] = {id, ownerUid:me.uid, ownerName:f.ownerName, name:f.name, desc:f.desc, cat:f.cat, kind:f.kind, status:'pending', reason:'', size:f.size, installs:0, reports:0, reporters:[], createdAt:now, updatedAt:now};
    d.content[id] = f.code; this.put(d); return {...d.items[id]}; },
  async review(id, status, reason = ''){ if (!scrAdm()) throw {code:'permission-denied'}; const d = this.db(), x = d.items[id]; if (!x) throw {code:'app/not-found'};
    Object.assign(x, {status, reason, reviewedAt:Date.now(), reviewedBy:me.uid, updatedAt:Date.now()}); if (status === 'published'){ x.reports = 0; x.reporters = []; } this.put(d); },
  async remove(id){ const d = this.db(), x = d.items[id]; if (x && x.ownerUid !== me.uid && !scrAdm()) throw {code:'permission-denied'}; delete d.items[id]; delete d.content[id]; this.put(d); },
  async install(id){ const d = this.db(); if (d.items[id]){ d.items[id].installs = (d.items[id].installs || 0) + 1; this.put(d); } },
  async report(id){ const d = this.db(), x = d.items[id]; if (!x || (x.reporters || []).includes(me.uid)) return; x.reporters = [...(x.reporters || []), me.uid]; x.reports = x.reporters.length; this.put(d); },
};
const ScrFB = {
  get db(){ return FirebaseAuth.db; }, ts(){ return FirebaseAuth.ts(); },
  T(id){ return this.db.collection('scScripts').doc(id); }, C(id){ return this.T(id).collection('content').doc('main'); },
  m(d){ const x = d.data(); return {...x, id:d.id, createdAt:ms(x.createdAt), updatedAt:ms(x.updatedAt)}; },
  async list(kind){
    const c = this.db.collection('scScripts');
    if (kind === 'published') return (await c.where('status', '==', 'published').limit(400).get()).docs.map(d => this.m(d));
    if (kind === 'mine') return (await c.where('ownerUid', '==', me.uid).limit(100).get()).docs.map(d => this.m(d));
    const [a, b] = await Promise.all([c.where('status', '==', 'pending').limit(200).get(), c.where('reports', '>', 0).limit(200).get()]);
    const out = new Map(); [...a.docs, ...b.docs].forEach(d => out.set(d.id, this.m(d))); return [...out.values()];
  },
  async get(id){ const s = await this.C(id).get(); return s.exists ? s.data().data : ''; },
  async create(f){
    const ref = this.db.collection('scScripts').doc(), b = this.db.batch();
    const rec = {ownerUid:me.uid, ownerName:f.ownerName, name:f.name, desc:f.desc, cat:f.cat, kind:f.kind, status:'pending', reason:'', size:f.size, installs:0, reports:0, reporters:[], createdAt:this.ts(), updatedAt:this.ts()};
    b.set(ref, rec); b.set(ref.collection('content').doc('main'), {data:f.code, updatedAt:this.ts()}); await b.commit();
    return {...rec, id:ref.id, createdAt:Date.now(), updatedAt:Date.now()};
  },
  async review(id, status, reason = ''){ const f = {status, reason, reviewedAt:this.ts(), reviewedBy:me.uid, updatedAt:this.ts()}; if (status === 'published'){ f.reports = 0; f.reporters = []; } await this.T(id).update(f); },
  async remove(id){ const b = this.db.batch(); b.delete(this.C(id)); b.delete(this.T(id)); await b.commit(); },
  async install(id){ await this.T(id).update({installs:firebase.firestore.FieldValue.increment(1)}); },
  async report(id){ await this.T(id).update({reports:firebase.firestore.FieldValue.increment(1), reporters:firebase.firestore.FieldValue.arrayUnion(me.uid)}); },
};
const Scr = () => cloudMode === 'firebase' ? ScrFB : cloudMode === 'demo' ? ScrLocal : null;
const scrErr = e => e?.code === 'permission-denied' ? 'La Communauté des scripts s\'ouvrira dès que les règles Firestore de SPECTRA Calc (bloc scScripts) seront publiées.' : (e?.message && !e.code ? e.message : errMsg(e));
window.SWScripts = {
  available:() => !!Scr() && !!me,
  isAdmin:() => !!me && scrAdm(),
  uid:() => me?.uid || '',
  maxCode:SCR_MAX_CODE, maxPending:SCR_MAX_PENDING, hideReports:SCR_HIDE_REPORTS,
  list:async kind => { const api = Scr(); if (!api) throw {code:'app/offline'}; try { return await withTimeout(api.list(kind), 15000); } catch(e){ throw {message:scrErr(e)}; } },
  getCode:async id => { try { return await withTimeout(Scr().get(id), 15000); } catch(e){ throw {message:scrErr(e)}; } },
  submit:async f => { try { return await withTimeout(Scr().create({...f, ownerName:fullName(), size:byteLen(f.code)}), 20000); } catch(e){ throw {message:scrErr(e)}; } },
  review:async (id, status, reason) => { try { await withTimeout(Scr().review(id, status, reason), 15000); } catch(e){ throw {message:scrErr(e)}; } },
  remove:async id => { try { await withTimeout(Scr().remove(id), 15000); } catch(e){ throw {message:scrErr(e)}; } },
  install:id => Scr().install(id).catch(() => {}),
  report:async id => { try { await withTimeout(Scr().report(id), 15000); } catch(e){ throw {message:scrErr(e)}; } },
};
