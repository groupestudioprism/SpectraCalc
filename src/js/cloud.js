/* =====================================================================
   Cloud SPECTRA Calc : classeurs enregistrés automatiquement, dossiers (partagés ou non), partage par email ou par lien,
   quotas de stockage, bibliothèque personnelle (modèles et blocs enregistrés).
   Firestore (même projet que le site Studio Prism) : swDocs/{id} (+ content/main), swFolders/{id} (pids : classeurs du dossier),
   swShares/{cible}__{email} (cible = id du classeur, ou F_{id} pour un dossier), swGrants/{cible}__{uid} (accès par lien),
   swUsage/{uid} (octets utilisés), swLibrary/{uid} (modèles personnels).
   Offres : gratuit 10 Mo, licence 50 Mo, administrateur 1 Go ; 5 dossiers et 3 dossiers partagés.
   Tant que les règles Firestore de SPECTRA Calc ne sont pas publiées (firebase/firestore-spectracalc.rules), l'app bascule
   d'elle-même sur un stockage « sur cet appareil » rattaché au compte : rien n'est perdu, tout pourra être envoyé au cloud ensuite.
   ===================================================================== */
const APP_URL = location.origin + location.pathname;
const MAX_DATA = 950000;
const PLANS = {free:{label:'Gratuit', bytes:10e6}, pro:{label:'Licence SPECTRA Calc', bytes:50e6}, admin:{label:'Administrateur', bytes:1e9}};
const FOLDER_LIMITS = {priv:5, shared:3};
const planKey = () => access.level === 'admin' ? 'admin' : access.level === 'licensed' ? 'pro' : 'free';
const canCloud = () => !!me && access.level !== 'pending';
const fullAccess = () => access.level === 'admin' || access.level === 'licensed';
const emailKey = e => String(e || '').trim().toLowerCase();
const withTimeout = (p, ms, code = 'app/timeout') => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({code}), ms))]);
async function sha256hex(s){ const h = await crypto.subtle.digest('SHA-256', enc.encode(s)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
const randTok = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
const fullName = () => `${me?.firstName || ''} ${me?.lastName || ''}`.trim() || me?.email || '';
const ms = t => (t && typeof t.toMillis === 'function') ? t.toMillis() : (typeof t === 'number' ? t : Date.now());
const byteLen = s => new TextEncoder().encode(s || '').length;
const mb = n => (n / 1e6).toLocaleString('fr-FR', {maximumFractionDigits:n < 1e7 ? 1 : 0}) + ' Mo';
const META_KEYS = ['preview', 'theme', 'words', 'tpl', 'pageSize'];
const pickMeta = x => { const o = {}; META_KEYS.forEach(k => { if (x && x[k] !== undefined) o[k] = x[k]; }); return o; };

/* ---------- Stockage dans ce navigateur (mode démo, ou « sur cet appareil » tant que le cloud n'est pas activé) ---------- */
function makeLocalCloud(keyFn, local){
  return {
    local,
    db(){ const d = store.get(keyFn()) || {}; return {docs:{}, content:{}, folders:{}, shares:{}, grants:{}, libs:{}, ...d}; },
    put(d){ try { localStorage.setItem(keyFn(), JSON.stringify(d)); } catch(e){ throw {code:'app/device-full'}; } },
    uid(){ return me.uid; }, email(){ return emailKey(me.email); },
    quotaOf(uid){ return uid === this.uid() ? PLANS[planKey()].bytes : PLANS.pro.bytes; },
    usedBy(d, uid){ return Object.values(d.docs).filter(p => p.ownerUid === uid).reduce((s, p) => s + (p.size || 0), 0); },
    async usage(){ const d = this.db(); return {bytes:this.usedBy(d, this.uid())}; },
    async listMine(){ await sleep(60); const d = this.db(), u = this.uid();
      return {docs:Object.values(d.docs).filter(p => p.ownerUid === u), folders:Object.values(d.folders).filter(f => f.ownerUid === u)}; },
    folderRole(d, fid){ const f = d.folders[fid]; if (!f) return ''; if (f.ownerUid === this.uid()) return 'owner'; const s = d.shares['F_' + fid + '__' + this.email()]; if (s) return s.role;
      const g = d.grants['F_' + fid + '__' + this.uid()]; return g && f.linkMode !== 'off' && g.key === f.linkKey ? f.linkMode : ''; },
    roleOf(d, p){ if (p.ownerUid === this.uid()) return 'owner'; const s = d.shares[p.id + '__' + this.email()]; if (s) return s.role;
      const g = d.grants[p.id + '__' + this.uid()]; if (g && p.linkMode !== 'off' && g.key === p.linkKey) return p.linkMode;
      return p.folderId ? this.folderRole(d, p.folderId) : ''; },
    async listShared(){ await sleep(60); if (local) return {docs:[], folders:[]}; const d = this.db(), docs = [], folders = [], seenP = new Set(), seenF = new Set();
      const addF = (f, role, via) => { if (seenF.has(f.id)) return; seenF.add(f.id); folders.push({...f, role, via, docs:(f.pids || []).map(id => d.docs[id]).filter(Boolean).map(p => ({...p, role}))}); };
      const addP = (p, role, via) => { if (seenP.has(p.id)) return; seenP.add(p.id); docs.push({...p, role, via}); };
      Object.values(d.shares).filter(s => s.email === this.email()).forEach(s => { if (s.kind === 'folder'){ const f = d.folders[s.fid]; if (f) addF(f, s.role, 'email'); } else { const p = d.docs[s.pid]; if (p) addP(p, s.role, 'email'); } });
      Object.values(d.grants).filter(g => g.uid === this.uid()).forEach(g => { if (g.kind === 'folder'){ const f = d.folders[g.fid]; if (f && f.linkMode !== 'off' && f.linkKey === g.key) addF(f, f.linkMode, 'link'); } else { const p = d.docs[g.pid]; if (p && p.linkMode !== 'off' && p.linkKey === g.key) addP(p, p.linkMode, 'link'); } });
      return {docs, folders}; },
    async open(pid){ await sleep(50); const d = this.db(), p = d.docs[pid]; if (!p) throw {code:'app/not-found'};
      const role = this.roleOf(d, p); if (!role) throw {code:'permission-denied'}; return {meta:{...p}, data:d.content[pid] || '', role}; },
    checkQuota(d, ownerUid, delta){ if (delta > 0 && this.usedBy(d, ownerUid) + delta > this.quotaOf(ownerUid)) throw {code:'app/quota'}; },
    async create({name, folderId = '', data, meta = {}}){ await sleep(50); const d = this.db(), id = randId('d'), now = Date.now();
      let owner = this.uid();
      if (folderId){ const f = d.folders[folderId]; if (!f) throw {code:'app/not-found'}; const r = this.folderRole(d, folderId); if (!(r === 'owner' || r === 'edit')) throw {code:'permission-denied'}; owner = f.ownerUid; }
      this.checkQuota(d, owner, byteLen(data));
      d.docs[id] = {id, ownerUid:owner, ownerEmail:owner === this.uid() ? this.email() : d.folders[folderId].ownerEmail, ownerName:owner === this.uid() ? fullName() : d.folders[folderId].ownerName, name, folderId, size:byteLen(data), ...pickMeta(meta), starred:false, linkMode:'off', linkKey:'', linkToken:'', linkPw:false, createdAt:now, updatedAt:now, updatedBy:this.uid(), updatedByName:fullName()};
      d.content[id] = data; if (folderId) d.folders[folderId].pids = [...(d.folders[folderId].pids || []), id]; this.put(d); return {...d.docs[id]}; },
    async save(pid, data, extra = {}){ await sleep(30); const d = this.db(), p = d.docs[pid]; if (!p) throw {code:'app/not-found'};
      const r = this.roleOf(d, p); if (!(r === 'owner' || r === 'edit')) throw {code:'permission-denied'};
      this.checkQuota(d, p.ownerUid, byteLen(data) - (p.size || 0));
      d.content[pid] = data; Object.assign(p, {size:byteLen(data), updatedAt:Date.now(), updatedBy:this.uid(), updatedByName:fullName()}, pickMeta(extra), extra.name ? {name:extra.name} : {}); this.put(d); },
    async update(pid, fields){ const d = this.db(), p = d.docs[pid]; if (!p || p.ownerUid !== this.uid()) throw {code:'permission-denied'}; Object.assign(p, fields, {updatedAt:Date.now()}); this.put(d); },
    async move(p, fid){ const d = this.db(), P = d.docs[p.id]; if (!P || P.ownerUid !== this.uid()) throw {code:'permission-denied'};
      if (P.folderId && d.folders[P.folderId]) d.folders[P.folderId].pids = (d.folders[P.folderId].pids || []).filter(x => x !== p.id);
      if (fid && d.folders[fid]) d.folders[fid].pids = [...(d.folders[fid].pids || []), p.id]; P.folderId = fid; P.updatedAt = Date.now(); this.put(d); },
    async remove(pid){ const d = this.db(), p = d.docs[pid]; if (p?.ownerUid !== this.uid()) throw {code:'permission-denied'};
      if (p.folderId && d.folders[p.folderId]) d.folders[p.folderId].pids = (d.folders[p.folderId].pids || []).filter(x => x !== pid);
      delete d.docs[pid]; delete d.content[pid];
      Object.keys(d.shares).forEach(k => d.shares[k].pid === pid && delete d.shares[k]); Object.keys(d.grants).forEach(k => d.grants[k].pid === pid && delete d.grants[k]); this.put(d); },
    async leave(item, kind){ const d = this.db(), key = kind === 'folder' ? 'F_' + item.id : item.id; delete d.shares[key + '__' + this.email()]; delete d.grants[key + '__' + this.uid()]; this.put(d); },
    async createFolder(name, parentId = ''){ const d = this.db(), id = randId('f'); d.folders[id] = {id, ownerUid:this.uid(), ownerEmail:this.email(), ownerName:fullName(), name, parentId, shared:false, pids:[], linkMode:'off', linkKey:'', linkToken:'', linkPw:false, createdAt:Date.now(), updatedAt:Date.now()}; this.put(d); return {...d.folders[id]}; },
    async updateFolder(fid, fields){ const d = this.db(); Object.assign(d.folders[fid], fields, {updatedAt:Date.now()}); this.put(d); },
    async removeFolder(fid){ const d = this.db(), f = d.folders[fid]; if (!f) return;
      Object.values(d.docs).forEach(p => { if (p.ownerUid === this.uid() && p.folderId === fid){ p.folderId = f.parentId || ''; if (p.folderId && d.folders[p.folderId]) d.folders[p.folderId].pids = [...(d.folders[p.folderId].pids || []), p.id]; } });
      Object.values(d.folders).forEach(x => { if (x.parentId === fid) x.parentId = f.parentId || ''; });
      Object.keys(d.shares).forEach(k => d.shares[k].fid === fid && delete d.shares[k]); delete d.folders[fid]; this.put(d); },
    async listShares(target){ if (local) return []; const key = target.kind === 'folder' ? 'F_' + target.id : target.id; return Object.values(this.db().shares).filter(s => (s.kind === 'folder' ? 'F_' + s.fid : s.pid) === key); },
    async addShare(target, email, role){ if (local) throw {code:'app/local-only'}; const d = this.db(), e = emailKey(email), folder = target.kind === 'folder';
      const key = (folder ? 'F_' + target.id : target.id) + '__' + e;
      d.shares[key] = folder ? {kind:'folder', fid:target.id, email:e, role, ownerUid:this.uid(), name:target.name, ownerName:fullName(), createdAt:Date.now()} : {kind:'doc', pid:target.id, email:e, role, ownerUid:this.uid(), name:target.name, ownerName:fullName(), createdAt:Date.now()};
      if (folder){ d.folders[target.id].shared = true; target.shared = true; } this.put(d); },
    async removeShare(target, email){ const d = this.db(), key = (target.kind === 'folder' ? 'F_' + target.id : target.id) + '__' + emailKey(email); delete d.shares[key];
      if (target.kind === 'folder'){ const f = d.folders[target.id]; f.shared = f.linkMode !== 'off' || Object.values(d.shares).some(s => s.kind === 'folder' && s.fid === f.id); target.shared = f.shared; } this.put(d); },
    async setLink(target, mode, password){ if (local) throw {code:'app/local-only'}; const token = mode === 'off' ? '' : randTok(); const key = mode === 'off' ? '' : password ? await sha256hex(token + ':' + password) : token;
      const fields = {linkMode:mode, linkKey:key, linkToken:token, linkPw:!!password && mode !== 'off'};
      if (target.kind === 'folder'){ const d = this.db(); const f = d.folders[target.id]; Object.assign(f, fields); f.shared = mode !== 'off' || Object.values(d.shares).some(s => s.kind === 'folder' && s.fid === f.id); target.shared = f.shared; this.put(d); }
      else await this.update(target.id, fields); return token; },
    async claimLink(kind, id, token, password){ const d = this.db(), T = kind === 'folder' ? d.folders[id] : d.docs[id]; const key = password ? await sha256hex(token + ':' + password) : token;
      if (!T || T.linkMode === 'off' || T.linkKey !== key) throw {code:'permission-denied'};
      d.grants[(kind === 'folder' ? 'F_' : '') + id + '__' + this.uid()] = kind === 'folder' ? {kind, fid:id, uid:this.uid(), key, createdAt:Date.now()} : {kind:'doc', pid:id, uid:this.uid(), key, createdAt:Date.now()}; this.put(d); },
    async isVerified(){ return true; },
    async loadLib(){ return this.db().libs[this.uid()] || null; },
    async saveLib(lib){ const d = this.db(); d.libs[this.uid()] = lib; this.put(d); },
  };
}
const DemoCloud = makeLocalCloud(() => 'sp.demo.sccloud', false);
const LocalCloud = makeLocalCloud(() => 'sc.local.' + (me?.uid || 'anon'), true);

/* ---------- Firebase ---------- */
const FirebaseCloud = {
  get db(){ return FirebaseAuth.db; },
  ts(){ return FirebaseAuth.ts(); },
  inc(n){ return firebase.firestore.FieldValue.increment(n); },
  aU(v){ return firebase.firestore.FieldValue.arrayUnion(v); }, aR(v){ return firebase.firestore.FieldValue.arrayRemove(v); },
  user(){ return FirebaseAuth.fa.currentUser; },
  uid(){ return this.user().uid; }, email(){ return emailKey(this.user().email); },
  P(pid){ return this.db.collection('scDocs').doc(pid); },
  C(pid){ return this.P(pid).collection('content').doc('main'); },
  F(fid){ return this.db.collection('scFolders').doc(fid); },
  U(uid){ return this.db.collection('scUsage').doc(uid); },
  meta(d){ const x = d.data(); return {...x, id:d.id, updatedAt:ms(x.updatedAt), createdAt:ms(x.createdAt)}; },
  async usage(docs){
    const s = await this.U(this.uid()).get(); if (s.exists) return {bytes:s.data().bytes || 0};
    const bytes = (docs || []).reduce((a, p) => a + (p.size || 0), 0);
    await this.U(this.uid()).set({bytes, lastPid:'', updatedAt:this.ts()}); return {bytes};
  },
  async listMine(){
    const u = this.uid();
    const [p, f] = await Promise.all([this.db.collection('scDocs').where('ownerUid', '==', u).get(), this.db.collection('scFolders').where('ownerUid', '==', u).get()]);
    return {docs:p.docs.map(d => this.meta(d)), folders:f.docs.map(d => ({...d.data(), id:d.id}))};
  },
  async listShared(){
    const [s, g] = await Promise.all([this.db.collection('scShares').where('email', '==', this.email()).get().catch(e => { if (e?.code === 'permission-denied') return {docs:[], size:0, empty:true, forEach(){}}; throw e; }), this.db.collection('scGrants').where('uid', '==', this.uid()).get()]);
    const docs = [], folders = [], seenP = new Set(), seenF = new Set();
    const getP = async (pid, role, via, extra = {}) => { if (seenP.has(pid)) return null; seenP.add(pid); try { const d = await this.P(pid).get(); if (!d.exists) return null; const m = this.meta(d); return {...m, role:role === 'link' ? m.linkMode : role, via, ...extra}; } catch(e){ return extra.fallback || null; } };
    const getF = async (fid, role, via, name, ownerName) => {
      if (seenF.has(fid)) return; seenF.add(fid);
      try { const d = await this.F(fid).get(); if (!d.exists) return; const f = {...d.data(), id:fid}; const r = role === 'link' ? f.linkMode : role;
        const ps = (await Promise.all((f.pids || []).slice(0, 200).map(pid => getP(pid, r, 'folder', {folderName:f.name})))).filter(Boolean);
        folders.push({...f, role:r, via, docs:ps}); }
      catch(e){ folders.push({id:fid, name:name || 'Dossier partagé', ownerName:ownerName || '', role, via, docs:[], locked:true}); }
    };
    const jobs = [];
    s.docs.forEach(d => { const x = d.data();
      if (x.kind === 'folder') jobs.push(getF(x.fid, x.role, 'email', x.name, x.ownerName));
      else jobs.push(getP(x.pid, x.role, 'email', {fallback:{id:x.pid, name:x.name || 'Classeur partagé', ownerName:x.ownerName || '', role:x.role, via:'email', locked:true, updatedAt:0}}).then(p => p && docs.push(p))); });
    g.docs.forEach(d => { const x = d.data(); if (x.kind === 'folder') jobs.push(getF(x.fid, 'link', 'link')); else jobs.push(getP(x.pid, 'link', 'link').then(p => p && docs.push(p))); });
    await Promise.all(jobs);
    return {docs, folders};
  },
  async roleOf(m){
    if (m.ownerUid === this.uid()) return 'owner';
    try { const s = await this.db.collection('scShares').doc(m.id + '__' + this.email()).get(); if (s.exists) return s.data().role; } catch(e){}
    if (m.folderId){ try { const s = await this.db.collection('scShares').doc('F_' + m.folderId + '__' + this.email()).get(); if (s.exists) return s.data().role; } catch(e){}
      try { const f = await this.F(m.folderId).get(); if (f.exists && f.data().linkMode !== 'off') return f.data().linkMode; } catch(e){} }
    return m.linkMode && m.linkMode !== 'off' ? m.linkMode : 'view';
  },
  async open(pid){
    const p = await this.P(pid).get(); if (!p.exists) throw {code:'app/not-found'};
    const m = this.meta(p); const [c, role] = await Promise.all([this.C(pid).get(), this.roleOf(m)]);
    return {meta:m, data:c.exists ? c.data().data : '', role};
  },
  async create({name, folderId = '', data, meta = {}}){
    if (byteLen(data) > MAX_DATA) throw {code:'app/too-big'};
    let owner = this.uid(), oEmail = this.email(), oName = fullName();
    if (folderId){ const f = await this.F(folderId).get(); if (!f.exists) throw {code:'app/not-found'}; owner = f.data().ownerUid; oEmail = f.data().ownerEmail || ''; oName = f.data().ownerName || ''; }
    if (owner === this.uid()) await this.usage();
    const ref = this.db.collection('scDocs').doc(), u = this.user();
    const m = {ownerUid:owner, ownerEmail:oEmail, ownerName:oName.slice(0, 160), name:name.slice(0, 120), folderId, size:byteLen(data), ...cleanMeta(meta), starred:false,
      linkMode:'off', linkKey:'', linkToken:'', linkPw:false, createdAt:this.ts(), updatedAt:this.ts(), updatedBy:u.uid, updatedByName:fullName().slice(0, 160)};
    const b = this.db.batch(); b.set(ref, m); b.set(ref.collection('content').doc('main'), {data, updatedAt:this.ts()});
    b.set(this.U(owner), {bytes:this.inc(byteLen(data)), lastPid:ref.id, updatedAt:this.ts()}, {merge:true});
    if (folderId) b.update(this.F(folderId), {pids:this.aU(ref.id), updatedAt:this.ts()});
    try { await b.commit(); } catch(e){ throw e?.code === 'permission-denied' ? {code:'app/quota-or-denied'} : e; }
    return {...m, id:ref.id, createdAt:Date.now(), updatedAt:Date.now()};
  },
  async save(pid, data, extra = {}, prevSize, ownerUid){
    if (byteLen(data) > MAX_DATA) throw {code:'app/too-big'};
    const delta = byteLen(data) - (prevSize ?? byteLen(data)), b = this.db.batch();
    b.set(this.C(pid), {data, updatedAt:this.ts()});
    const up = {size:byteLen(data), updatedAt:this.ts(), updatedBy:this.uid(), updatedByName:fullName().slice(0, 160), ...cleanMeta(extra)};
    if (extra.name) up.name = extra.name.slice(0, 120);
    b.update(this.P(pid), up);
    if (delta !== 0) b.set(this.U(ownerUid || this.uid()), {bytes:this.inc(delta), lastPid:pid, updatedAt:this.ts()}, {merge:true});
    try { await b.commit(); } catch(e){ throw e?.code === 'permission-denied' ? {code:'app/quota-or-denied'} : e; }
  },
  async update(pid, fields){ await this.P(pid).update({...fields, updatedAt:this.ts()}); },
  async move(p, fid){
    const b = this.db.batch(); b.update(this.P(p.id), {folderId:fid, updatedAt:this.ts()});
    if (p.folderId) b.update(this.F(p.folderId), {pids:this.aR(p.id), updatedAt:this.ts()});
    if (fid) b.update(this.F(fid), {pids:this.aU(p.id), updatedAt:this.ts()});
    await b.commit();
  },
  async remove(pid){
    const pd = await this.P(pid).get(); if (!pd.exists) return; const p = pd.data();
    const sh = await this.db.collection('scShares').where('ownerUid', '==', this.uid()).where('pid', '==', pid).get();
    const us = await this.U(this.uid()).get().catch(() => null);
    const b = this.db.batch(); sh.docs.forEach(d => b.delete(d.ref)); b.delete(this.C(pid)); b.delete(this.P(pid));
    if (us?.exists && (p.size || 0) > 0 && (us.data().bytes || 0) >= p.size) b.update(this.U(this.uid()), {bytes:this.inc(-p.size), lastPid:pid, updatedAt:this.ts()});
    if (p.folderId) b.update(this.F(p.folderId), {pids:this.aR(pid), updatedAt:this.ts()});
    await b.commit();
  },
  async leave(item, kind){
    const key = kind === 'folder' ? 'F_' + item.id : item.id;
    await Promise.all([this.db.collection('scShares').doc(key + '__' + this.email()).delete().catch(() => {}), this.db.collection('scGrants').doc(key + '__' + this.uid()).delete().catch(() => {})]);
  },
  async createFolder(name, parentId = ''){
    const ref = this.db.collection('scFolders').doc();
    const f = {ownerUid:this.uid(), ownerEmail:this.email(), ownerName:fullName().slice(0, 160), name:name.slice(0, 80), parentId, shared:false, pids:[], linkMode:'off', linkKey:'', linkToken:'', linkPw:false, createdAt:this.ts(), updatedAt:this.ts()};
    await ref.set(f); return {...f, id:ref.id};
  },
  async updateFolder(fid, fields){ await this.F(fid).update({...fields, updatedAt:this.ts()}); },
  async removeFolder(fid, all){
    const f = all.folders.find(x => x.id === fid); const parent = f?.parentId || '';
    const sh = await this.db.collection('scShares').where('ownerUid', '==', this.uid()).where('fid', '==', fid).get();
    const b = this.db.batch(); sh.docs.forEach(d => b.delete(d.ref));
    const moved = all.docs.filter(p => p.folderId === fid);
    moved.forEach(p => b.update(this.P(p.id), {folderId:parent, updatedAt:this.ts()}));
    if (parent && moved.length) b.update(this.F(parent), {pids:firebase.firestore.FieldValue.arrayUnion(...moved.map(p => p.id)), updatedAt:this.ts()});
    all.folders.filter(x => x.parentId === fid).forEach(x => b.update(this.F(x.id), {parentId:parent, updatedAt:this.ts()}));
    b.delete(this.F(fid)); await b.commit();
  },
  shareRef(target, email){ return this.db.collection('scShares').doc((target.kind === 'folder' ? 'F_' + target.id : target.id) + '__' + emailKey(email)); },
  async listShares(target){
    const q = this.db.collection('scShares').where('ownerUid', '==', this.uid());
    const s = await (target.kind === 'folder' ? q.where('fid', '==', target.id) : q.where('pid', '==', target.id)).get();
    return s.docs.map(d => d.data());
  },
  async addShare(target, email, role){
    const e = emailKey(email), base = {email:e, role, ownerUid:this.uid(), name:target.name.slice(0, 120), ownerName:fullName().slice(0, 160), createdAt:this.ts()};
    const b = this.db.batch();
    b.set(this.shareRef(target, e), target.kind === 'folder' ? {kind:'folder', fid:target.id, ...base} : {kind:'doc', pid:target.id, ...base});
    if (target.kind === 'folder' && !target.shared) b.update(this.F(target.id), {shared:true, updatedAt:this.ts()});
    await b.commit(); if (target.kind === 'folder') target.shared = true;
  },
  async removeShare(target, email){
    await this.shareRef(target, email).delete();
    if (target.kind === 'folder'){ const rest = await this.listShares(target); const shared = rest.length > 0 || (target.linkMode && target.linkMode !== 'off'); if (!shared){ await this.updateFolder(target.id, {shared:false}); target.shared = false; } }
  },
  async setLink(target, mode, password){
    const token = mode === 'off' ? '' : randTok();
    const key = mode === 'off' ? '' : password ? await sha256hex(token + ':' + password) : token;
    const fields = {linkMode:mode, linkKey:key, linkToken:token, linkPw:!!password && mode !== 'off'};
    if (target.kind === 'folder'){ let shared = mode !== 'off'; if (!shared) shared = (await this.listShares(target)).length > 0; await this.updateFolder(target.id, {...fields, shared}); target.shared = shared; }
    else await this.update(target.id, fields);
    return token;
  },
  async claimLink(kind, id, token, password){
    const key = password ? await sha256hex(token + ':' + password) : token;
    const doc = kind === 'folder' ? {kind:'folder', fid:id, uid:this.uid(), key, createdAt:this.ts()} : {kind:'doc', pid:id, uid:this.uid(), key, createdAt:this.ts()};
    await this.db.collection('scGrants').doc((kind === 'folder' ? 'F_' : '') + id + '__' + this.uid()).set(doc);
  },
  async isVerified(){ const u = this.user(); if (u.emailVerified) return true; await u.reload(); if (u.emailVerified){ await u.getIdToken(true); return true; } return false; },
  async loadLib(){ const s = await this.db.collection('scLibrary').doc(this.uid()).get(); if (!s.exists) return null; try { return JSON.parse(s.data().data || 'null'); } catch(e){ return null; } },
  async saveLib(lib){ const data = JSON.stringify(lib); if (byteLen(data) > 900000) throw {code:'app/too-big'}; await this.db.collection('scLibrary').doc(this.uid()).set({data, updatedAt:this.ts()}); },
};
function cleanMeta(x){
  const m = pickMeta(x), o = {};
  if (m.preview !== undefined) o.preview = String(m.preview).slice(0, 6000);
  if (m.theme !== undefined) o.theme = String(m.theme).slice(0, 40);
  if (m.tpl !== undefined) o.tpl = String(m.tpl).slice(0, 40);
  if (m.pageSize !== undefined) o.pageSize = String(m.pageSize).slice(0, 12);
  if (m.words !== undefined) o.words = Math.max(0, Math.min(10000000, Math.round(+m.words || 0)));
  return o;
}
/* Mode du stockage : cloud Studio Prism, démo, ou « sur cet appareil » (règles Firestore de SPECTRA Calc pas encore publiées) */
let cloudMode = FIREBASE_CONFIG ? 'firebase' : 'demo';
const Cloud = () => cloudMode === 'demo' ? DemoCloud : cloudMode === 'local' ? LocalCloud : FirebaseCloud;
let cloudErr = '';
function goLocal(e){ if (cloudMode !== 'firebase') return; cloudMode = 'local'; cloudErr = (e?.code || '') + (e?.message ? ' · ' + e.message : ''); console.warn('[SPECTRA Calc] Cloud refusé, stockage sur cet appareil :', e); }
/* Classeurs gardés sur l'appareil (cloud pas encore activé) : envoyés au cloud dès qu'il répond */
function localDocs(){ try { const d = LocalCloud.db(); return Object.values(d.docs).filter(p => p.ownerUid === me?.uid).map(p => ({...p, data:d.content[p.id] || ''})); } catch(e){ return []; } }
async function migrateLocal(){
  const list = localDocs(); if (!list.length || cloudMode !== 'firebase') return;
  showBusy(`Envoi de ${list.length} classeur${list.length > 1 ? 's' : ''} au cloud…`); let ok = 0, fail = 0;
  for (const p of list){
    try { const m = await withTimeout(FirebaseCloud.create({name:p.name, folderId:'', data:p.data, meta:pickMeta(p)}), 20000); H.mine?.docs.push(m); if (H.usage != null) H.usage += byteLen(p.data);
      const d = LocalCloud.db(); delete d.docs[p.id]; delete d.content[p.id]; LocalCloud.put(d); ok++; }
    catch(e){ fail++; console.warn('[SPECTRA Calc] envoi au cloud impossible', p.name, e); }
  }
  hideBusy(); renderHome(); toastA(fail ? `${ok} envoyé${ok > 1 ? 's' : ''}, ${fail} en échec (espace cloud plein ?)` : `${ok} classeur${ok > 1 ? 's' : ''} envoyé${ok > 1 ? 's' : ''} dans le cloud`);
}

/* Bibliothèque personnelle (modèles enregistrés), partagée avec l'éditeur */
let libTimer = 0;
window.SWLib = {
  save(lib){ clearTimeout(libTimer); libTimer = setTimeout(async () => { try { await withTimeout(Cloud().saveLib(lib), 15000); } catch(e){ toastA(e?.code === 'app/too-big' ? 'Bibliothèque personnelle trop volumineuse' : 'Bibliothèque non synchronisée (hors ligne ?)'); } }, 800); },
};
let userLib = {};
async function loadUserLib(){ try { userLib = (await withTimeout(Cloud().loadLib(), 12000)) || {}; } catch(e){ if (e?.code === 'permission-denied'){ goLocal(e); try { userLib = (await LocalCloud.loadLib()) || {}; } catch(x){} } }
  try { await withTimeout(editorReady, 20000); window.SWEditor.setUserLib(userLib); } catch(e){} if (typeof renderHome === 'function') renderHome(); }

/* ---------- Enregistrement automatique du classeur ouvert ---------- */
const Save = {
  pid:null, role:'', meta:null, last:'', timer:0, first:0, busy:false, again:false, state:'', err:0,
  canWrite(){ return !!this.pid && (this.role === 'owner' || this.role === 'edit') && canCloud(); },
  begin(meta, role, data){ window.SWCloudActive = true; this.pid = meta.id; this.meta = meta; this.role = role; this.last = data; this.err = 0; clearTimeout(this.timer); this.first = 0;
    this.set(this.canWrite() ? 'saved' : 'ro'); window.SWEditor?.setReadOnly(!this.canWrite()); },
  end(){ window.SWCloudActive = false; clearTimeout(this.timer); this.pid = null; this.meta = null; this.role = ''; this.set(''); },
  changed(){
    if (!this.pid) return;
    if (!this.canWrite()){ this.set('ro'); return; }
    if (!this.first) this.first = Date.now();
    this.set('dirty'); clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), Date.now() - this.first > 10000 ? 0 : 1500);
  },
  async flush(force){
    if (!this.pid || !this.canWrite() || !window.SWEditor) return;
    if (this.busy){ this.again = true; return; }
    clearTimeout(this.timer); this.first = 0;
    const data = window.SWEditor.get(), pid = this.pid, meta = this.meta;
    const name = window.SWEditor.title();
    if (data === this.last && name === meta.name && !force){ this.set('saved'); return; }
    if (data === this.last && name === meta.name){ this.set('saved'); return; }
    if (byteLen(data) > MAX_DATA){ this.set('big'); return; }
    if (meta.ownerUid === me.uid && H.usage != null && byteLen(data) - (meta.size || 0) > 0 && H.usage + byteLen(data) - (meta.size || 0) > PLANS[planKey()].bytes){ this.set('quota'); return; }
    this.busy = true; this.set('saving');
    try {
      const extra = window.SWEditor.meta(); if (name && name !== meta.name && this.role === 'owner') extra.name = name;
      await withTimeout(Cloud().save(pid, data, extra, meta.size || 0, meta.ownerUid), 20000);
      if (this.pid === pid){ if (meta.ownerUid === me.uid && H.usage != null) H.usage += byteLen(data) - (meta.size || 0); meta.size = byteLen(data); Object.assign(meta, pickMeta(extra)); if (extra.name) meta.name = extra.name; meta.updatedAt = Date.now(); this.last = data; this.err = 0; this.set('saved'); syncHomeMeta(meta); }
    } catch(e){
      if (this.pid === pid){ this.err++; const c = e?.code; this.set(c === 'app/quota' || c === 'app/quota-or-denied' ? 'quota' : c === 'permission-denied' ? 'denied' : c === 'app/device-full' ? 'device' : 'error'); if (!['permission-denied', 'app/quota', 'app/quota-or-denied', 'app/device-full'].includes(c)) this.timer = setTimeout(() => this.flush(), Math.min(60000, 5000 * this.err)); }
    } finally { this.busy = false; if (this.again){ this.again = false; this.flush(); } }
  },
  pending(){ return !!this.pid && this.canWrite() && (this.state === 'dirty' || this.state === 'saving' || this.state === 'error'); },
  set(s){
    this.state = s; const el = $a('#cloudState'); if (!el) return;
    const hm = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    const where = cloudMode === 'local' ? 'sur cet appareil' : cloudMode === 'demo' ? 'dans ce navigateur' : 'dans le cloud';
    const T = {saved:`Enregistré ${where} · ${hm}`, saving:'Enregistrement…', dirty:'Modifications…', error:'Hors ligne · nouvel essai…', denied:'Enregistrement refusé',
      big:'Classeur trop volumineux', quota:'Espace cloud plein', ro:'Lecture seule', device:'Mémoire de l\'appareil pleine'};
    el.hidden = !s; el.textContent = T[s] || ''; el.className = 'cs ' + s;
    el.title = s === 'ro' ? 'Ce classeur vous est partagé en lecture : vos modifications ne sont pas enregistrées.' : s === 'quota' ? 'Le stockage du propriétaire est plein : libérez de la place ou passez à une licence SPECTRA Calc (50 Mo).' : s === 'big' ? 'Réduisez la taille des images du document.' : '';
    if (s === 'quota' && !this.quotaWarned){ this.quotaWarned = true; toastA(this.meta?.ownerUid === me?.uid ? 'Votre espace cloud est plein : vos dernières modifications ne sont pas enregistrées.' : 'L\'espace cloud du propriétaire est plein : modifications non enregistrées.'); }
  },
};
window.addEventListener('sw:changed', () => Save.changed());
window.addEventListener('beforeunload', e => { if (Save.pending()){ Save.flush(); e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && Save.pending()) Save.flush(); });
function syncHomeMeta(meta){ const p = (H.mine?.docs || []).find(x => x.id === meta.id); if (p) Object.assign(p, {name:meta.name, size:meta.size, updatedAt:meta.updatedAt, updatedBy:me.uid, ...pickMeta(meta)}); }

/* ---------- Pont avec l'éditeur ---------- */
let editorReady = window.SWEditor ? Promise.resolve() : new Promise(res => window.addEventListener('sw:ready', res, {once:true}));
async function openInEditor(data, meta, role){
  await withTimeout(editorReady, 20000, 'app/engine');
  if (Save.pending()) try { await withTimeout(Save.flush(true), 8000); } catch(e){}
  Save.end(); Save.quotaWarned = false;
  window.SWEditor.load(data, {name:meta ? meta.name : 'Classeur', readOnly:meta ? !(role === 'owner' || role === 'edit') : false, owner:meta ? (role === 'owner' ? '' : (meta.ownerName || meta.ownerEmail || '')) : '', role:role || 'owner', canRename:!meta || role === 'owner', id:meta?.id || ''});
  if (meta) Save.begin(meta, role, window.SWEditor.get()); else Save.end();
  ctx.where = 'app'; hideHome();
  try { history.replaceState(null, '', meta ? '#/doc/' + meta.id : location.pathname + location.search); } catch(e){}
}
async function downloadBlob(filename, blob){
  try { const dl = window.claude?.use ? await window.claude.use('downloads') : null; if (dl){ await dl.save({filename, data:typeof blob === 'string' ? blob : await blob.text()}); return; } } catch(e){ if (e?.code === 'declined') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(typeof blob === 'string' ? new Blob([blob], {type:'text/plain'}) : blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
window.SWDownload = downloadBlob;
const safeName = s => (String(s || 'classeur').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'classeur').slice(0, 60);
window.SWSafeName = safeName;

/* ---------- Accueil (façon Word : modèles, récents, classeurs, partagés) ---------- */
const H = {tab:'home', folder:'', sharedFolder:'', mine:null, shared:null, usage:null, loading:false, err:'', q:'', view:'grid', cat:'Tous', sort:'recent'};
const ago = t => { if (!t) return ''; const s = (Date.now() - t) / 1000; if (s < 60) return 'à l\'instant'; if (s < 3600) return `il y a ${Math.round(s / 60)} min`; if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  if (s < 172800) return 'hier'; return new Date(t).toLocaleDateString('fr-FR', {day:'numeric', month:'short', year:new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric'}); };
const kb = n => n > 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round((n || 0) / 1000)) + ' Ko';
const ROLE = {owner:'Propriétaire', edit:'Modification', view:'Lecture'};
const ICON = {
  folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  dots:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
  doc:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 5h17l9 9v29H12z"/><path d="M29 5v9h9M18 22h14M18 28h14M18 34h9"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  starO:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
};
const folderCounts = () => { const fs = H.mine?.folders || []; return {shared:fs.filter(f => f.shared).length, priv:fs.filter(f => !f.shared).length}; };
const TPL = () => window.SW_TEMPLATES || [];

function showHome(tab){
  Save.flush(true); Save.end();
  if (tab) H.tab = tab;
  ctx.where = 'home'; const h = $a('#home'); h.hidden = false; $a('#app').inert = true; $a('#app').hidden = true;
  const hu = $a('#homeUser'); hu.textContent = initials(); hu.title = fullName();
  try { if (/^#\/doc\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } catch(e){}
  renderHome(); loadHome();
}
function hideHome(){ $a('#home').hidden = true; const app = $a('#app'); if (app){ app.inert = false; app.hidden = false; } }
async function loadHome(){
  H.loading = true; H.err = ''; renderHome();
  try {
    await accessReady;
    let mine, shared;
    try { [mine, shared] = await withTimeout(Promise.all([canCloud() ? Cloud().listMine() : Promise.resolve({docs:[], folders:[]}), Cloud().listShared()]), 15000); }
    catch(e){ if (e?.code === 'permission-denied' && cloudMode === 'firebase'){ goLocal(e); [mine, shared] = await Promise.all([Cloud().listMine(), Cloud().listShared()]); } else throw e; }
    H.mine = mine; H.shared = shared;
    if (cloudMode === 'firebase' && localDocs().length && !H.migrated){ H.migrated = true; setTimeout(migrateLocal, 300); }
    try { H.usage = (await withTimeout(Cloud().usage(mine.docs), 10000)).bytes; } catch(e){ H.usage = mine.docs.reduce((s, p) => s + (p.size || 0), 0); }
  } catch(e){ H.err = e?.code === 'app/timeout' ? 'Le cloud ne répond pas. Vérifiez votre connexion.' : errMsg(e); }
  H.loading = false; renderHome();
}
function renderQuota(){
  const q = $a('#homeQuota'); if (!q) return;
  const plan = PLANS[planKey()], used = H.usage ?? 0, pct = Math.min(100, used / plan.bytes * 100), fc = folderCounts();
  q.innerHTML = `<div class="q-h"><span>${cloudMode === 'local' ? 'Sur cet appareil' : 'Mon cloud'}</span><b class="q-plan ${planKey()}">${({free:'Gratuit', pro:'Licence', admin:'Admin'})[planKey()]}</b></div>
    <div class="q-num"><b>${used && used < 1e6 ? kb(used) : mb(used)}</b> / ${mb(plan.bytes)}</div>
    <div class="q-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${pct.toFixed(1)}%" class="${pct > 90 ? 'full' : pct > 70 ? 'mid' : ''}"></i></div>
    <dl class="q-dl"><dt>Classeurs</dt><dd>${H.mine?.docs.length ?? '—'}</dd><dt>Dossiers</dt><dd>${fc.priv} / ${FOLDER_LIMITS.priv}</dd><dt>Partagés</dt><dd>${fc.shared} / ${FOLDER_LIMITS.shared}</dd></dl>
    ${planKey() === 'free' ? `<button type="button" class="q-up" data-hact="upgrade">Passer à 50 Mo</button>` : ''}`;
}
function crumbs(){
  const fs = H.mine?.folders || [], out = []; let f = fs.find(x => x.id === H.folder), guard = 0;
  while (f && guard++ < 20){ out.unshift(f); f = fs.find(x => x.id === f.parentId); }
  return out;
}
/* Aperçu vivant d'une page : le début du classeur, avec son thème (assaini, sans scripts ni images externes) */
function miniPage(html, theme, cls = ''){
  const th = window.SWThemes ? window.SWThemes.css(theme) : '';
  return `<div class="mini ${cls}"><div class="mini-page swdoc" style="${th}">${html || ''}</div></div>`;
}
function previewOf(p){ return window.SWSanitize ? window.SWSanitize(p.preview || '', {preview:true}) : ''; }
function cardHtml(p, shared){
  const sub = shared ? `${esc(p.ownerName || p.ownerEmail || '')} · ${ROLE[p.role] || 'Lecture'}` : `${ago(p.updatedAt)}${p.updatedBy && p.updatedBy !== me.uid && p.updatedByName ? ' par ' + esc(p.updatedByName) : ''}`;
  const badges = (!shared && (p.linkMode && p.linkMode !== 'off') ? `<span class="hb" title="Partagé par lien">${ICON.share}</span>` : '') + (!shared && p.starred ? `<span class="hb star" title="Favori">${ICON.star}</span>` : '');
  return `<article class="hcard${p.locked ? ' locked' : ''}" data-open="${esc(p.id)}" data-shared="${shared ? 1 : ''}" tabindex="0" aria-label="Ouvrir ${esc(p.name)}">
    <div class="hthumb">${p.locked ? `<div class="hlock">${ICON.lock}</div>` : p.preview ? miniPage(previewOf(p), p.theme) : `<div class="hlock">${ICON.doc}</div>`}${badges}</div>
    <div class="hmeta"><b title="${esc(p.name)}">${esc(p.name)}</b><span>${p.locked ? 'Confirmez votre email pour l\'ouvrir' : sub}</span></div>
    <button type="button" class="hdots" data-menu="${esc(p.id)}" data-shared="${shared ? 1 : ''}" aria-label="Gérer ${esc(p.name)}">${ICON.dots}</button></article>`;
}
function rowHtml(p, shared){
  const fold = !shared && p.folderId ? (H.mine?.folders || []).find(f => f.id === p.folderId)?.name : '';
  return `<div class="hrow" data-open="${esc(p.id)}" data-shared="${shared ? 1 : ''}" tabindex="0" role="row">
    <span class="hr-ic">${ICON.doc}</span><span class="hr-n"><b>${esc(p.name)}</b><small>${fold ? esc(fold) : shared ? esc(p.ownerName || '') : 'Mes classeurs'}</small></span>
    <span class="hr-d">${ago(p.updatedAt)}</span><span class="hr-w">${p.words != null ? (p.words).toLocaleString('fr-FR') + ' cellules' : ''}</span><span class="hr-s">${shared ? ROLE[p.role] || '' : kb(p.size)}</span>
    <button type="button" class="hstar${p.starred ? ' on' : ''}" data-star="${esc(p.id)}" aria-label="Favori"${shared ? ' hidden' : ''}>${p.starred ? ICON.star : ICON.starO}</button>
    <button type="button" class="hdots" data-menu="${esc(p.id)}" data-shared="${shared ? 1 : ''}" aria-label="Gérer ${esc(p.name)}">${ICON.dots}</button></div>`;
}
function folderHtml(f, shared){
  const n = shared ? (f.docs || []).length : (H.mine?.docs || []).filter(p => p.folderId === f.id).length;
  const sub = shared ? `${esc(f.ownerName || '')} · ${ROLE[f.role] || 'Lecture'}` : `${n} classeur${n > 1 ? 's' : ''}${f.shared ? ' · partagé' : ''}`;
  return `<div class="hfold${f.shared && !shared ? ' sh' : ''}${f.locked ? ' locked' : ''}" data-folder="${esc(f.id)}" data-shared="${shared ? 1 : ''}" tabindex="0">${f.locked ? ICON.lock : ICON.folder}<div><b>${esc(f.name)}</b><small>${f.locked ? 'Email à confirmer' : sub}</small></div>
    ${f.shared && !shared ? `<span class="hb2" title="Dossier partagé">${ICON.share}</span>` : ''}<button type="button" class="hdots" data-fmenu="${esc(f.id)}" data-shared="${shared ? 1 : ''}" aria-label="Gérer le dossier ${esc(f.name)}">${ICON.dots}</button></div>`;
}
function tplCard(t, big){
  return `<button type="button" class="tcard${big ? ' big' : ''}" data-tpl="${esc(t.id)}" aria-label="Nouveau : ${esc(t.name)}">
    <div class="tthumb">${t.id === 'blank' ? '<div class="mini"><div class="mini-page swdoc blank"><span class="plus">+</span></div></div>' : miniPage(t.html, t.theme, t.page?.orient === 'l' ? 'land' : '')}</div>
    <b>${esc(t.name)}</b>${big ? `<small>${esc(t.desc || '')}</small>` : `<small>${esc(t.cat || '')}</small>`}</button>`;
}
function myTplCards(){ const l = userLib?.templates || []; return l.map(t => ({...t, mine:true})); }
function renderOffer(){
  const el = $a('#homeOffer'); if (!el) return;
  if (cloudMode === 'local'){ el.hidden = false; el.className = 'h-offer local';
    el.innerHTML = `<div class="ho-in"><div><b>Enregistrement sur cet appareil</b><span>Le serveur Studio Prism refuse encore l'accès au cloud SPECTRA Calc (règles Firestore non publiées) : vos classeurs sont gardés dans ce navigateur, rattachés à votre compte. Ils partiront dans le cloud tout seuls dès son activation.${cloudErr ? `<br><small style="opacity:.7">Détail : ${esc(cloudErr.slice(0, 160))}</small>` : ''}</span></div><div class="ho-a"><button type="button" class="ho-b" data-hact="retry-cloud">Réessayer</button></div></div>`; return; }
  const pend = cloudMode === 'firebase' && me ? localDocs().length : 0;
  if (pend){ el.hidden = false; el.className = 'h-offer';
    el.innerHTML = `<div class="ho-in"><div><b>Le cloud SPECTRA Calc est activé</b><span>${pend} classeur${pend > 1 ? 's sont restés' : ' est resté'} sur cet appareil. Envoyez-le${pend > 1 ? 's' : ''} dans le cloud pour le${pend > 1 ? 's' : ''} retrouver partout.</span></div><div class="ho-a"><button type="button" class="ho-b" data-hact="migrate">Envoyer au cloud</button></div></div>`; return; }
  el.className = 'h-offer';
  const hide = planKey() !== 'free' || access.level === 'pending' || !me || store.get('sc.offerHide.' + me.uid);
  el.hidden = !!hide; if (hide) return;
  el.innerHTML = `<div class="ho-in"><div><b>Offre gratuite</b><span>Toutes les fonctions, graphiques, modèles et thèmes, 10 Mo de cloud, exports PDF et CSV. L'export Excel (.xlsx) et la page web demandent une licence SPECTRA Calc.</span></div>
    <div class="ho-a"><a class="ho-b" href="${OFFERS_URL}" target="_blank" rel="noopener">Voir les offres</a><button type="button" class="ho-b" data-hact="key">J'ai une clé</button><button type="button" class="ho-x" data-hact="offer-hide" aria-label="Masquer">✕</button></div></div>`;
}
function allMine(){ return H.mine?.docs || []; }
function sortDocs(l){ const s = [...l]; if (H.sort === 'name') s.sort((a, b) => a.name.localeCompare(b.name, 'fr')); else if (H.sort === 'size') s.sort((a, b) => (b.size || 0) - (a.size || 0)); else s.sort((a, b) => b.updatedAt - a.updatedAt); return s; }
function filterQ(l){ const q = H.q.trim().toLowerCase(); if (!q) return l; return l.filter(p => (p.name || '').toLowerCase().includes(q) || String(p.preview || '').replace(/<[^>]+>/g, ' ').toLowerCase().includes(q)); }
function docsBlock(list, shared, emptyHtml){
  if (!list.length) return emptyHtml || '';
  return H.view === 'list' ? `<div class="hlist" role="table"><div class="hrow head" role="row"><span></span><span>Nom</span><span>Modifié</span><span>Mots</span><span>${shared ? 'Droits' : 'Taille'}</span><span></span><span></span></div>${list.map(p => rowHtml(p, shared)).join('')}</div>`
    : `<div class="hgrid">${list.map(p => cardHtml(p, shared)).join('')}</div>`;
}
function toolsBar(){
  return `<div class="htools"><label class="hsearch"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="homeQ" type="search" placeholder="Rechercher dans vos classeurs" value="${esc(H.q)}" aria-label="Rechercher"></label>
    <select id="homeSort" aria-label="Trier"><option value="recent"${H.sort === 'recent' ? ' selected' : ''}>Les plus récents</option><option value="name"${H.sort === 'name' ? ' selected' : ''}>Nom (A → Z)</option><option value="size"${H.sort === 'size' ? ' selected' : ''}>Taille</option></select>
    <div class="hview" role="group" aria-label="Affichage"><button type="button" data-hview="grid" aria-pressed="${H.view === 'grid'}" title="Vignettes"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg></button><button type="button" data-hview="list" aria-pressed="${H.view === 'list'}" title="Liste"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div></div>`;
}
function renderHome(){
  const body = $a('#homeBody'); if (!body || !me) return;
  $a('#homeNav').querySelectorAll('[data-htab]').forEach(b => b.setAttribute('aria-current', b.dataset.htab === H.tab ? 'page' : 'false'));
  const lb = $a('#homeLic'); if (lb) lb.hidden = planKey() !== 'free' || access.level === 'pending';
  const hour = new Date().getHours(); const hh = $a('#homeHello'); if (hh) hh.textContent = `${hour < 18 && hour > 4 ? 'Bonjour' : 'Bonsoir'} ${me?.firstName || ''}`.trim();
  renderQuota(); renderOffer();
  const focusQ = document.activeElement?.id === 'homeQ', caret = focusQ ? document.activeElement.selectionStart : 0;
  const loadingSk = `<div class="hgrid">${'<div class="hcard sk"><div class="hthumb"></div><div class="hmeta"><b></b><span></span></div></div>'.repeat(4)}</div>`;
  let h = '';
  if (H.tab === 'home'){
    const tpls = TPL().filter(t => t.id !== 'blank').slice(0, 10);
    h += `<section class="hsec-wrap"><div class="hsec-h"><h2 class="hsec">Commencer avec un modèle</h2><button type="button" class="hmore" data-htab="templates">Voir les ${TPL().length - 1} modèles</button></div><div class="tstrip">${tpls.map(t => tplCard(t)).join('')}</div></section>`;
    const fav = allMine().filter(p => p.starred);
    if (fav.length) h += `<section class="hsec-wrap"><div class="hsec-h"><h2 class="hsec">Favoris</h2></div>${docsBlock(sortDocs(fav).slice(0, 8), false)}</section>`;
    h += `<section class="hsec-wrap"><div class="hsec-h"><h2 class="hsec">Vos classeurs récents</h2>${toolsBar()}</div>`;
    if (H.loading && !H.mine) h += loadingSk;
    else if (H.err) h += `<div class="hempty"><p>${esc(H.err)}</p><button type="button" class="ap-btn alt" data-hact="reload">Réessayer</button></div>`;
    else { const all = [...allMine(), ...(H.shared?.docs || []).map(p => ({...p, _sh:1}))];
      const list = filterQ(sortDocs(all)).slice(0, H.q ? 60 : 16);
      h += !list.length ? `<div class="hempty"><div class="hic">${ICON.doc}</div><h3>${H.q ? 'Aucun classeur trouvé' : 'Votre premier classeur vous attend'}</h3><p>${H.q ? 'Essayez un autre mot.' : 'Choisissez un modèle ci-dessus, ou partez d\'une page blanche : tout s\'enregistre tout seul.'}</p>${H.q ? '' : '<button type="button" class="ap-btn" data-tpl="blank">Classeur vierge</button>'}</div>`
        : H.view === 'list' ? `<div class="hlist" role="table"><div class="hrow head" role="row"><span></span><span>Nom</span><span>Modifié</span><span>Mots</span><span>Taille</span><span></span><span></span></div>${list.map(p => rowHtml(p, !!p._sh)).join('')}</div>` : `<div class="hgrid">${list.map(p => cardHtml(p, !!p._sh)).join('')}</div>`; }
    h += '</section>';
  } else if (H.tab === 'templates'){
    h += renderTemplatesTab();
  } else if (H.tab === 'mine'){
    if (H.loading && !H.mine) h = loadingSk;
    else if (H.err) h = `<div class="hempty"><p>${esc(H.err)}</p><button type="button" class="ap-btn alt" data-hact="reload">Réessayer</button></div>`;
    else {
      const fs = (H.mine?.folders || []).filter(f => (f.parentId || '') === H.folder).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      const ps = filterQ(sortDocs(allMine().filter(p => H.q ? true : (p.folderId || '') === H.folder))), cr = crumbs();
      h += `<div class="hbar"><nav class="hcrumbs" aria-label="Dossiers"><button type="button" data-folder="">Mes classeurs</button>${cr.map(f => `<span>›</span><button type="button" data-folder="${esc(f.id)}">${esc(f.name)}</button>`).join('')}</nav>
        <div class="hbar-a"><button type="button" class="hbtn" data-hact="newf"${!canCloud() || curFolderShared() ? ' disabled' : ''}>${ICON.folder}<span>Nouveau dossier</span></button><button type="button" class="hbtn" data-hact="import">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 15V3M7 8l5-5 5 5M5 21h14"/></svg>'}<span>Importer</span></button><button type="button" class="hbtn primary" data-tpl="blank">+ <span>Nouveau</span></button></div></div>${toolsBar()}`;
      if (fs.length && !H.q) h += `<h2 class="hsec">Dossiers</h2><div class="hfolders">${fs.map(f => folderHtml(f, false)).join('')}</div>`;
      h += `<h2 class="hsec">${H.q ? 'Résultats' : H.folder ? 'Classeurs du dossier' : 'Classeurs'}</h2>` + docsBlock(ps, false, `<div class="hempty"><div class="hic">${ICON.doc}</div><h3>${H.folder ? 'Ce dossier est vide' : 'Aucun classeur pour l\'instant'}</h3><p>Créez un classeur : il s'enregistre tout seul, à chaque modification.</p><button type="button" class="ap-btn" data-tpl="blank">Nouveau classeur</button></div>`);
    }
  } else if (H.tab === 'shared'){
    const sf = H.sharedFolder ? (H.shared?.folders || []).find(f => f.id === H.sharedFolder) : null;
    if (H.loading && !H.shared) h = loadingSk;
    else if (cloudMode === 'local') h = `<div class="hempty"><div class="hic">${ICON.share}</div><h3>Partage bientôt disponible</h3><p>Le partage entre comptes Studio Prism s'activera avec le cloud SPECTRA Calc.</p></div>`;
    else if (sf){
      h = `<nav class="hcrumbs"><button type="button" data-sfolder="">Partagés avec moi</button><span>›</span><button type="button">${esc(sf.name)}</button></nav>
      <p class="hint">Dossier de ${esc(sf.ownerName || '—')} · ${ROLE[sf.role] || 'Lecture'}${sf.role === 'edit' ? ' : vous pouvez y créer des classeurs (stockés chez le propriétaire).' : '.'}</p>
      ${sf.role === 'edit' ? '<p><button type="button" class="hbtn primary" data-tpl="blank">+ <span>Nouveau classeur ici</span></button></p>' : ''}
      ${docsBlock(sortDocs(sf.docs || []), true, '<div class="hempty"><h3>Dossier vide</h3></div>')}`;
    } else {
      const fs = H.shared?.folders || [], ps = sortDocs(H.shared?.docs || []), locked = fs.some(f => f.locked) || ps.some(p => p.locked);
      h = (locked ? `<div class="hlocal"><div><b>Confirmez votre adresse email</b><span>Les classeurs partagés ne s'ouvrent qu'avec un compte Studio Prism vérifié.</span></div><button type="button" class="ap-btn alt" data-hact="verify">Vérifier mon email</button></div>` : '')
        + (fs.length ? `<h2 class="hsec">Dossiers partagés</h2><div class="hfolders">${fs.map(f => folderHtml(f, true)).join('')}</div>` : '')
        + (ps.length ? `<h2 class="hsec">Classeurs partagés</h2>${docsBlock(ps, true)}` : '')
        + (!fs.length && !ps.length ? `<div class="hempty"><div class="hic">${ICON.share}</div><h3>Rien de partagé avec vous</h3><p>Quand quelqu'un vous partage un classeur ou un dossier SPECTRA avec l'adresse ${esc(me.email)}, ou vous envoie un lien, il apparaît ici.</p></div>` : '');
    }
  }
  body.innerHTML = h;
  const titles = {home:['Accueil', ''], templates:['Modèles', 'Partez d\'un modèle conçu par Studio Prism : tout se personnalise en un clic.'], mine:['Mes classeurs', 'Vos classeurs s\'enregistrent tout seuls.'], shared:['Partagés avec moi', 'Les classeurs et dossiers que l\'on vous a partagés.']};
  const ht = $a('#homeTitle'); if (ht){ ht.hidden = H.tab === 'home'; ht.innerHTML = H.tab === 'home' ? '' : `<h1>${titles[H.tab][0]}</h1><p>${titles[H.tab][1]}</p>`; }
  $a('#homeHero').hidden = H.tab !== 'home';
  window.SWScaleMinis?.(body);
  if (focusQ){ const q = $a('#homeQ'); if (q){ q.focus(); try { q.setSelectionRange(caret, caret); } catch(e){} } }
}
const curFolderShared = () => !!(H.mine?.folders || []).find(f => f.id === H.folder)?.shared;
const findP = (id, shared) => shared ? [...(H.shared?.docs || []), ...(H.shared?.folders || []).flatMap(f => f.docs || [])].find(p => p.id === id) : allMine().find(p => p.id === id);
async function openDoc(p){
  if (p.locked) return verifyEmailFlow();
  showBusy(`Ouverture de « ${p.name} »…`);
  try { const r = await withTimeout(Cloud().open(p.id), 20000); hideBusy(); await openInEditor(r.data, r.meta, r.role); if (!(r.role === 'owner' || r.role === 'edit')) toastA('Ouvert en lecture seule'); }
  catch(e){ hideBusy(); toastA(e?.code === 'permission-denied' ? 'Accès refusé à ce document.' : errMsg(e)); }
}
function quotaBlock(size){ if (H.usage != null && H.usage + size > PLANS[planKey()].bytes){ show('licence', {reason:'quota'}); return true; } return false; }
/* Nouveau classeur : depuis un modèle (ou un classeur importé), enregistré tout de suite */
async function newDoc(tplId, opts = {}){
  if (!canCloud()) return;
  await withTimeout(editorReady, 20000, 'app/engine').catch(() => {});
  const folderId = H.tab === 'shared' ? H.sharedFolder : H.tab === 'mine' ? H.folder : '';
  const json = opts.data || window.SWEditor.fromTemplate(tplId, userLib);
  let name = opts.name; if (!name){ try { name = JSON.parse(json).title; } catch(e){} } name = (name || 'Classeur sans titre').slice(0, 120);
  if (H.tab !== 'shared' && quotaBlock(byteLen(json))) return;
  showBusy('Création du classeur…');
  try {
    const meta = window.SWEditor.metaOf(json);
    let m; try { m = await withTimeout(Cloud().create({name, folderId, data:json, meta}), 20000); }
    catch(e){ if ((e?.code === 'permission-denied' || e?.code === 'app/quota-or-denied') && cloudMode === 'firebase' && !H.mine?.docs.length){ goLocal(e); m = await Cloud().create({name, folderId:'', data:json, meta}); renderOffer(); } else throw e; }
    hideBusy();
    if (m.ownerUid === me.uid){ H.mine?.docs.push(m); if (H.usage != null) H.usage += byteLen(json); if (folderId){ const f = H.mine?.folders.find(x => x.id === folderId); if (f) f.pids = [...(f.pids || []), m.id]; } }
    await openInEditor(json, m, m.ownerUid === me.uid ? 'owner' : 'edit');
    if (!opts.data) setTimeout(() => window.SWEditor.focusTitle?.(tplId === 'blank'), 60);
  } catch(e){ hideBusy(); toastA(e?.code === 'app/too-big' ? 'Classeur trop volumineux pour le cloud.' : e?.code === 'app/quota' || e?.code === 'app/quota-or-denied' ? 'Espace cloud plein (ou accès refusé) : libérez de la place.' : e?.code === 'permission-denied' ? 'Création refusée.' : errMsg(e)); }
}
window.SWHome = {newDoc, show:showHome, publishCurrent:() => publishCurrent(), saveTemplate, flush:() => Save.flush(true), canExport:() => fullAccess(), licence:reason => show('licence', {reason}), duplicateCurrent};
function showBusy(t){ const b = $a('#homeBusy'); b.querySelector('span').textContent = t; b.hidden = false; }
function hideBusy(){ $a('#homeBusy').hidden = true; }
async function duplicateCurrent(){
  if (!Save.pid) return toastA('Ce classeur n\'est pas enregistré.');
  const data = window.SWEditor.get(), name = window.SWEditor.title() + ' (copie)';
  if (quotaBlock(byteLen(data))) return;
  try { const m = await Cloud().create({name, folderId:'', data, meta:window.SWEditor.meta()}); H.mine?.docs.push(m); if (H.usage != null) H.usage += byteLen(data); await openInEditor(data, m, 'owner'); toastA('Copie créée et ouverte'); } catch(e){ toastA(errMsg(e)); }
}
/* Enregistrer le classeur comme modèle personnel (bibliothèque du compte) */
async function saveTemplate(name){
  const data = window.SWEditor.get(), meta = window.SWEditor.meta();
  const list = (userLib.templates || []).filter(t => t.name !== name);
  list.unshift({id:'my_' + Date.now().toString(36), name, cat:'Mes modèles', desc:'Modèle personnel', data, html:meta.preview, theme:meta.theme});
  // la bibliothèque est limitée : on retire les plus anciens si besoin
  let lib = {...userLib, templates:list.slice(0, 20)}; while (byteLen(JSON.stringify(lib)) > 850000 && lib.templates.length > 1) lib.templates.pop();
  userLib = lib; window.SWLib.save(userLib); window.SWEditor.setUserLib(userLib); toastA(`Modèle « ${name} » enregistré`);
}

/* Boîte de dialogue */
function eyes(root){
  root.querySelectorAll('[data-eye]').forEach(b => b.onclick = () => { const i = root.querySelector('#' + b.dataset.eye); if (!i) return; const on = i.type === 'password'; i.type = on ? 'text' : 'password'; i.classList.add('pw'); b.textContent = on ? 'Masquer' : 'Afficher'; b.setAttribute('aria-label', on ? 'Masquer le mot de passe' : 'Afficher le mot de passe'); i.focus(); });
}
function dlg(html, wire, cls = ''){
  const d = $a('#apDlg'); const c = d.querySelector('.dlg-card'); c.className = 'dlg-card ' + cls; c.innerHTML = html; d.hidden = false;
  d.querySelectorAll('[data-dlg="close"]').forEach(b => b.onclick = closeDlg);
  const f = d.querySelector('input:not([type=checkbox]):not([type=radio]):not([type=color]),select,textarea'); if (f) setTimeout(() => f.focus(), 40);
  wire && wire(d);
}
function closeDlg(){ $a('#apDlg').hidden = true; window.SWEditor?.restoreSel?.(); }
window.SWDlg = {open:dlg, close:closeDlg};
$a('#apDlg').addEventListener('mousedown', e => { if (e.target.id === 'apDlg') closeDlg(); });
function askText(title, label, value, okLabel, onOk){
  dlg(`<h3>${esc(title)}</h3><form id="dlgF"><label class="ap-field"><span>${esc(label)}</span><span class="ap-in"><input id="dlgIn" maxlength="120" value="${esc(value || '')}"></span></label><p class="ap-err" id="dlgErr"></p>
    <div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" type="submit">${esc(okLabel)}</button></div></form>`, d => {
    const i = d.querySelector('#dlgIn'); i.select();
    d.querySelector('#dlgF').onsubmit = async e => { e.preventDefault(); const v = i.value.trim(); if (!v) return d.querySelector('#dlgErr').textContent = 'Indiquez un nom.';
      const b = d.querySelector('[type=submit]'); busy(b, true); try { await onOk(v); closeDlg(); } catch(err){ busy(b, false); d.querySelector('#dlgErr').textContent = err?.message && !err.code ? err.message : errMsg(err); } };
  });
}
window.SWAsk = askText;
function confirmDlg(title, text, okLabel, onOk){
  dlg(`<h3>${esc(title)}</h3><p class="dlg-p">${text}</p><p class="ap-err" id="dlgErr"></p><div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Annuler</button><button type="button" class="ap-btn danger" id="dlgOk">${esc(okLabel)}</button></div>`, d => {
    d.querySelector('#dlgOk').onclick = async e => { busy(e.currentTarget, true); try { await onOk(); closeDlg(); } catch(err){ busy(e.currentTarget, false); d.querySelector('#dlgErr').textContent = errMsg(err); } };
  });
}
function moveDlg(p){
  const fs = H.mine.folders, path = f => { const n = []; let x = f, g = 0; while (x && g++ < 20){ n.unshift(x.name); x = fs.find(y => y.id === x.parentId); } return n.join(' › '); };
  const opts = [{id:'', label:'Mes classeurs (racine)'}, ...fs.map(f => ({id:f.id, label:path(f) + (f.shared ? ' · partagé' : '')})).sort((a, b) => a.label.localeCompare(b.label, 'fr'))];
  dlg(`<h3>Déplacer « ${esc(p.name)} »</h3><div class="dlg-list">${opts.map(o => `<button type="button" data-to="${esc(o.id)}" class="${(p.folderId || '') === o.id ? 'cur' : ''}">${ICON.folder}<span>${esc(o.label)}</span></button>`).join('')}</div>
    <div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Annuler</button></div>`, d => {
    d.querySelectorAll('[data-to]').forEach(b => b.onclick = async () => { const to = b.dataset.to; if (to === (p.folderId || '')) return closeDlg();
      try { await Cloud().move(p, to); const old = fs.find(f => f.id === p.folderId); if (old) old.pids = (old.pids || []).filter(x => x !== p.id); const nf2 = fs.find(f => f.id === to); if (nf2) nf2.pids = [...(nf2.pids || []), p.id];
        p.folderId = to; closeDlg(); renderHome(); toastA(nf2?.shared ? 'Classeur déplacé dans un dossier partagé : il devient visible par ses invités' : 'Classeur déplacé'); } catch(e){ toastA(errMsg(e)); } });
  });
}
function linkUrl(t){ return t.linkToken ? `${APP_URL}#/${t.kind === 'folder' ? 'd' : 'p'}/${encodeURIComponent(t.id)}?k=${t.linkToken}${t.linkPw ? '&pw=1' : ''}` : ''; }
async function shareDlg(target){
  if (cloudMode === 'local') return dlg(`<h3>Partage bientôt disponible</h3><p class="dlg-p">Le partage par email ou par lien s'activera dès que le cloud SPECTRA Calc sera ouvert sur le serveur Studio Prism. En attendant, vous pouvez exporter le classeur (PDF) et l'envoyer.</p><div class="dlg-acts"><button class="ap-btn" data-dlg="close">Compris</button></div>`);
  const folder = target.kind === 'folder';
  if (folder && !target.shared){
    const fc = folderCounts();
    if (fc.shared >= FOLDER_LIMITS.shared) return dlg(`<h3>Limite atteinte</h3><p class="dlg-p">Vous avez déjà ${FOLDER_LIMITS.shared} dossiers partagés. Arrêtez le partage d'un autre dossier pour partager celui-ci.</p><div class="dlg-acts"><button class="ap-btn" data-dlg="close">Compris</button></div>`);
    if ((H.mine?.folders || []).some(f => f.parentId === target.id)) return dlg(`<h3>Dossier non partageable</h3><p class="dlg-p">Un dossier partagé ne peut pas contenir de sous-dossiers. Déplacez ou supprimez d'abord ses sous-dossiers.</p><div class="dlg-acts"><button class="ap-btn" data-dlg="close">Compris</button></div>`);
  }
  let shares = []; try { shares = await Cloud().listShares(target); } catch(e){}
  const render = () => `<h3>Partager ${folder ? 'le dossier' : ''} « ${esc(target.name)} »</h3>
    <p class="dlg-p">${folder ? 'Les invités voient tous les classeurs du dossier. Avec « Modification », ils peuvent aussi y créer des classeurs : tout reste stocké sur votre espace.' : 'Les invités ouvrent le classeur avec leur compte Studio Prism vérifié.'}</p>
    <form id="shF" class="dlg-row"><input id="shEmail" type="email" placeholder="email@exemple.fr" autocomplete="off" aria-label="Email de la personne"><select id="shRole" aria-label="Droits"><option value="view">Lecture</option><option value="edit">Modification</option></select><button class="ap-btn" type="submit">Inviter</button></form>
    <p class="ap-err" id="dlgErr"></p>
    <ul class="dlg-people">${shares.length ? shares.map(s => `<li><span class="av">${esc(s.email.charAt(0).toUpperCase())}</span><span class="em">${esc(s.email)}</span>
      <select data-role="${esc(s.email)}" aria-label="Droits de ${esc(s.email)}"><option value="view"${s.role === 'view' ? ' selected' : ''}>Lecture</option><option value="edit"${s.role === 'edit' ? ' selected' : ''}>Modification</option></select>
      <a class="ap-link" href="mailto:${esc(s.email)}?subject=${encodeURIComponent(`${folder ? 'Dossier' : 'Classeur'} SPECTRA Calc partagé : ${target.name}`)}&body=${encodeURIComponent(`Bonjour,\n\nJe vous ai partagé ${folder ? 'le dossier' : 'le classeur'} « ${target.name} » sur SPECTRA Calc. Ouvrez-le avec votre compte Studio Prism (${s.email}) :\n${APP_URL}\n\n${fullName()}`)}" title="Prévenir par email">Prévenir</a>
      <button type="button" class="ap-link danger" data-rm="${esc(s.email)}" aria-label="Retirer ${esc(s.email)}">Retirer</button></li>`).join('') : '<li class="none">Personne pour l\'instant.</li>'}</ul>
    <div class="dlg-sec"><b>Accès par lien</b>
      <div class="dlg-row"><select id="lkMode" aria-label="Accès par lien"><option value="off"${target.linkMode === 'off' || !target.linkMode ? ' selected' : ''}>Désactivé</option><option value="view"${target.linkMode === 'view' ? ' selected' : ''}>Toute personne avec le lien · Lecture</option><option value="edit"${target.linkMode === 'edit' ? ' selected' : ''}>Toute personne avec le lien · Modification</option></select></div>
      <label class="ap-check"><input type="checkbox" id="lkPwOn"${target.linkPw ? ' checked' : ''}><span>Protéger par un mot de passe</span></label>
      <div class="dlg-row" id="lkPwRow"${target.linkPw ? '' : ' hidden'}><span class="ap-in"><input id="lkPw" type="password" placeholder="${target.linkPw ? 'Nouveau mot de passe (vide = garder le lien actuel)' : 'Mot de passe du lien'}" autocomplete="new-password"><button type="button" class="ap-eye" data-eye="lkPw" aria-label="Afficher le mot de passe">Afficher</button></span></div>
      <div class="dlg-row"><input id="lkUrl" readonly value="${esc(linkUrl(target))}" placeholder="Aucun lien actif" aria-label="Lien de partage"><button type="button" class="ap-btn alt" id="lkCopy"${target.linkToken ? '' : ' disabled'}>Copier</button></div>
      <div class="dlg-row"><button type="button" class="ap-btn" id="lkApply">Appliquer</button></div>
      <p class="dlg-p small">Changer le mode ou le mot de passe crée un nouveau lien : l'ancien cesse de fonctionner. Il faut un compte Studio Prism vérifié pour ouvrir un lien.</p></div>
    <div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Terminé</button></div>`;
  const wire = d => {
    const err = t => d.querySelector('#dlgErr').textContent = t || '';
    d.querySelector('#shF').onsubmit = async e => {
      e.preventDefault(); const em = d.querySelector('#shEmail').value.trim().toLowerCase(), role = d.querySelector('#shRole').value;
      if (!emailOK(em) || em.includes('/')) return err('Entrez une adresse email valide.');
      if (em === emailKey(me.email)) return err('C\'est votre propre adresse.');
      try { await Cloud().addShare(target, em, role); shares = shares.filter(s => s.email !== em).concat([{email:em, role}]); dlg(render(), wire); renderHome(); toastA(`Partagé avec ${em}`); } catch(x){ err(errMsg(x)); }
    };
    d.querySelectorAll('[data-role]').forEach(s => s.onchange = async () => { try { await Cloud().addShare(target, s.dataset.role, s.value); shares.find(x => x.email === s.dataset.role).role = s.value; toastA('Droits modifiés'); } catch(x){ err(errMsg(x)); } });
    d.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { try { await Cloud().removeShare(target, b.dataset.rm); shares = shares.filter(s => s.email !== b.dataset.rm); dlg(render(), wire); renderHome(); } catch(x){ err(errMsg(x)); } });
    eyes(d);
    const pwOn = d.querySelector('#lkPwOn'); pwOn.onchange = () => d.querySelector('#lkPwRow').hidden = !pwOn.checked;
    d.querySelector('#lkCopy').onclick = async () => { const u = d.querySelector('#lkUrl').value; if (!u) return; try { await navigator.clipboard.writeText(u); toastA('Lien copié'); } catch(e){ d.querySelector('#lkUrl').select(); document.execCommand('copy'); toastA('Lien copié'); } };
    d.querySelector('#lkApply').onclick = async e => {
      const mode = d.querySelector('#lkMode').value, pw = pwOn.checked ? d.querySelector('#lkPw').value : '';
      if (mode !== 'off' && pwOn.checked && !pw && !(target.linkPw && target.linkMode === mode)) return err('Choisissez le mot de passe du lien.');
      if (mode !== 'off' && pwOn.checked && !pw && target.linkPw && target.linkMode === mode) return err('');
      if (pw && pw.length < 4) return err('Mot de passe trop court (4 caractères minimum).');
      busy(e.currentTarget, true, 'Création du lien…');
      try { const tok = await Cloud().setLink(target, mode, pw); Object.assign(target, {linkMode:mode, linkToken:tok, linkPw:!!pw && mode !== 'off'}); const mp = findP(target.id, false); if (mp && !folder) Object.assign(mp, {linkMode:mode, linkToken:tok, linkPw:!!pw && mode !== 'off'}); dlg(render(), wire); renderHome(); toastA(mode === 'off' ? 'Lien désactivé' : 'Nouveau lien prêt à copier'); }
      catch(x){ busy(e.currentTarget, false); err(errMsg(x)); }
    };
  };
  dlg(render(), wire);
}
window.SWShareCurrent = () => { if (!Save.pid || Save.role !== 'owner') return toastA(Save.pid ? 'Seul le propriétaire peut partager ce document.' : 'Classeur non enregistré.'); const p = findP(Save.pid, false) || Save.meta; shareDlg({...p, kind:'doc'}); };

/* Menus ⋮ */
const hm = () => $a('#homeMenu');
let menuCancel = null;
function openMenu(anchor, items){
  const m = hm(); m.innerHTML = items.map(i => i === '-' ? '<hr>' : `<button type="button" data-mi="${i.k}" class="${i.danger ? 'danger' : ''}"${i.off ? ' disabled' : ''}><b>${esc(i.t)}</b>${i.s ? `<span>${esc(i.s)}</span>` : ''}</button>`).join('');
  m.hidden = false; const r = anchor.getBoundingClientRect();
  m.style.top = Math.min(r.bottom + 4, innerHeight - m.offsetHeight - 12) + 'px';
  m.style.left = Math.max(12, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 12)) + 'px';
  return new Promise(res => { m.onclick = e => { const b = e.target.closest('[data-mi]'); if (!b) return; m.hidden = true; res(b.dataset.mi); }; menuCancel = () => res(null); });
}
document.addEventListener('click', e => { const m = hm(); if (m && !m.hidden && !m.contains(e.target) && !e.target.closest('[data-menu],[data-fmenu]')){ m.hidden = true; menuCancel && menuCancel(); } });
async function docMenu(btn, p, shared){
  const full = fullAccess();
  const items = shared ? [
    {k:'open', t:'Ouvrir'},
    {k:'copy', t:'Faire une copie', s:'Dans mes classeurs (mon stockage)', off:p.locked},
    '-', {k:'leave', t:'Retirer de ma liste', danger:true, off:p.via === 'folder'}] : [
    {k:'open', t:'Ouvrir'}, {k:'rename', t:'Renommer'}, {k:'star', t:p.starred ? 'Retirer des favoris' : 'Ajouter aux favoris'}, {k:'dup', t:'Dupliquer'},
    {k:'backup', t:'Télécharger une sauvegarde', s:full ? 'Fichier .spectracalc, à garder sur votre appareil' : 'Licence SPECTRA Calc requise'}, {k:'move', t:'Déplacer vers…'},
    {k:'share', t:'Partager…', s:p.linkMode && p.linkMode !== 'off' ? 'Lien actif' : ''}, '-', {k:'del', t:'Supprimer', danger:true}];
  const k = await openMenu(btn, items); if (!k) return;
  if (k === 'open') return openDoc(p);
  if (k === 'star') return toggleStar(p);
  if (k === 'rename') return askText('Renommer le classeur', 'Nom du classeur', p.name, 'Renommer', async v => { await Cloud().update(p.id, {name:v}); p.name = v; renderHome(); });
  if (k === 'dup' || k === 'copy') return askText(k === 'dup' ? 'Dupliquer le classeur' : 'Faire une copie', 'Nom de la copie', `${p.name} (copie)`, 'Créer la copie', async v => {
    const r = await Cloud().open(p.id); if (H.usage != null && H.usage + byteLen(r.data) > PLANS[planKey()].bytes) throw {code:'app/quota'};
    const m = await Cloud().create({name:v, folderId:k === 'dup' ? (p.folderId || '') : '', data:r.data, meta:pickMeta(p)});
    H.mine?.docs.push(m); if (H.usage != null) H.usage += byteLen(r.data); renderHome(); toastA('Copie créée');
  });
  if (k === 'backup'){
    if (!full) return show('licence', {reason:'export'});
    try { const r = await Cloud().open(p.id); await downloadBlob(`${safeName(p.name)}.spectracalc`, new Blob([r.data], {type:'application/json'})); toastA('Sauvegarde téléchargée'); } catch(e){ toastA(errMsg(e)); }
    return;
  }
  if (k === 'move') return moveDlg(p);
  if (k === 'share') return shareDlg({...p, kind:'doc'}).then(() => {});
  if (k === 'del') return confirmDlg('Supprimer le classeur', `« <b>${esc(p.name)}</b> » sera supprimé définitivement, pour vous et pour les personnes avec qui il est partagé.`, 'Supprimer', async () => {
    await Cloud().remove(p.id); H.mine.docs = H.mine.docs.filter(x => x.id !== p.id); if (H.usage != null) H.usage = Math.max(0, H.usage - (p.size || 0)); renderHome(); toastA('Classeur supprimé');
  });
  if (k === 'leave') return confirmDlg('Retirer de ma liste', `Vous n'aurez plus accès à « <b>${esc(p.name)}</b> », sauf si on vous le partage à nouveau.`, 'Retirer', async () => {
    await Cloud().leave(p, 'doc'); H.shared.docs = H.shared.docs.filter(x => x.id !== p.id); renderHome();
  });
}
async function toggleStar(p){ try { await Cloud().update(p.id, {starred:!p.starred}); p.starred = !p.starred; renderHome(); } catch(e){ toastA(errMsg(e)); } }
async function folderMenu(btn, f, shared){
  if (shared){
    const k = await openMenu(btn, [{k:'open', t:'Ouvrir'}, '-', {k:'leave', t:'Retirer de ma liste', danger:true}]); if (!k) return;
    if (k === 'open'){ H.sharedFolder = f.id; return renderHome(); }
    return confirmDlg('Retirer de ma liste', `Vous n'aurez plus accès au dossier « <b>${esc(f.name)}</b> ».`, 'Retirer', async () => { await Cloud().leave(f, 'folder'); H.shared.folders = H.shared.folders.filter(x => x.id !== f.id); renderHome(); });
  }
  const k = await openMenu(btn, [{k:'open', t:'Ouvrir'}, {k:'rename', t:'Renommer'}, {k:'share', t:'Partager…', s:f.shared ? 'Dossier partagé' : `${folderCounts().shared} / ${FOLDER_LIMITS.shared} dossiers partagés`}, '-', {k:'del', t:'Supprimer le dossier', s:'Son contenu remonte d\'un niveau', danger:true}]); if (!k) return;
  if (k === 'open'){ H.folder = f.id; return renderHome(); }
  if (k === 'rename') return askText('Renommer le dossier', 'Nom du dossier', f.name, 'Renommer', async v => { await Cloud().updateFolder(f.id, {name:v}); f.name = v; renderHome(); });
  if (k === 'share') return shareDlg(Object.assign(f, {kind:'folder'}));
  if (k === 'del') return confirmDlg('Supprimer le dossier', `Le dossier « <b>${esc(f.name)}</b> » sera supprimé${f.shared ? ' et ses invités perdront l\'accès' : ''}. Les classeurs et sous-dossiers qu'il contient ne sont pas supprimés : ils remontent d'un niveau.`, 'Supprimer le dossier', async () => {
    await Cloud().removeFolder(f.id, H.mine); const parent = f.parentId || '';
    H.mine.docs.forEach(p => { if (p.folderId === f.id) p.folderId = parent; }); H.mine.folders.forEach(x => { if (x.parentId === f.id) x.parentId = parent; });
    H.mine.folders = H.mine.folders.filter(x => x.id !== f.id); if (H.folder === f.id) H.folder = parent; renderHome();
  });
}
async function verifyEmailFlow(){
  dlg(`<h3>Confirmez votre adresse email</h3><p class="dlg-p">Pour ouvrir un classeur partagé, votre compte Studio Prism doit être vérifié. Ouvrez le lien reçu à <b>${esc(me.email)}</b>, puis touchez « J'ai confirmé ».</p><p class="ap-err" id="dlgErr"></p>
    <div class="dlg-acts"><button type="button" class="ap-btn alt" id="vfSend">Renvoyer l'email</button><button type="button" class="ap-btn" id="vfOk">J'ai confirmé</button></div>`, d => {
    d.querySelector('#vfSend').onclick = async e => { busy(e.currentTarget, true, 'Envoi…'); try { await Auth.resendVerification(); busy(e.currentTarget, false); toastA('Email envoyé'); } catch(x){ busy(e.currentTarget, false); d.querySelector('#dlgErr').textContent = errMsg(x); } };
    d.querySelector('#vfOk').onclick = async e => { busy(e.currentTarget, true, 'Vérification…'); try { if (await Cloud().isVerified()){ closeDlg(); toastA('Email confirmé'); loadHome(); } else { busy(e.currentTarget, false); d.querySelector('#dlgErr').textContent = 'Pas encore confirmé. Ouvrez le lien reçu par email, puis réessayez.'; } } catch(x){ busy(e.currentTarget, false); d.querySelector('#dlgErr').textContent = errMsg(x); } };
  });
}

/* Liens : #/p/<classeur>?k=<jeton>&pw=1 · #/d/<dossier>?k=… · #/doc/<id> (réouverture après rechargement) */
function readLinkFromUrl(){
  const d = location.hash.match(/^#\/doc\/([\w-]{4,60})$/); if (d) return {kind:'doc', pid:d[1], token:'', pw:false, own:true};
  const m = location.hash.match(/^#\/([pd])\/([\w-]{4,60})(?:\?(.*))?$/); if (!m) return null;
  const q = new URLSearchParams(m[3] || ''); return {kind:m[1] === 'd' ? 'folder' : 'doc', pid:decodeURIComponent(m[2]), token:q.get('k') || '', pw:q.get('pw') === '1'};
}
async function openPendingLink(){
  const L = ctx.pendingLink; if (!L) return false; ctx.pendingLink = null;
  try { sessionStorage.removeItem('sc.pendingLink'); history.replaceState(null, '', location.pathname + location.search); } catch(e){}
  const folder = L.kind === 'folder';
  const tryOpen = async () => {
    if (folder){ await loadHome(); const f = (H.shared?.folders || []).find(x => x.id === L.pid); if (!f) throw {code:'permission-denied'}; H.tab = 'shared'; H.sharedFolder = f.id; renderHome(); toastA(`Dossier « ${f.name} » ouvert`); return; }
    const r = await withTimeout(Cloud().open(L.pid), 20000); await openInEditor(r.data, r.meta, r.role); if (!L.own) toastA(r.role === 'owner' || r.role === 'edit' ? 'Classeur partagé ouvert · enregistrement automatique' : 'Classeur partagé ouvert en lecture seule');
  };
  showBusy(folder ? 'Ouverture du dossier partagé…' : 'Ouverture du classeur…');
  try { await tryOpen(); hideBusy(); return true; }
  catch(e){
    hideBusy();
    if (L.own) return false;
    if (e?.code === 'app/not-found'){ toastA('Ce classeur n\'existe plus.'); return false; }
    if (!(await Cloud().isVerified().catch(() => false))){ verifyEmailFlow(); return false; }
    if (!L.token){ toastA('Vous n\'avez pas accès. Demandez à son propriétaire de vous le partager.'); return false; }
    const claim = async pw => { await Cloud().claimLink(L.kind, L.pid, L.token, pw); await tryOpen(); };
    if (!L.pw){ try { await claim(''); return true; } catch(x){ toastA('Ce lien n\'est plus valide. Demandez un nouveau lien.'); return false; } }
    dlg(`<h3>${folder ? 'Dossier' : 'Classeur'} protégé</h3><p class="dlg-p">Ce lien est protégé par un mot de passe. Saisissez celui que le propriétaire vous a communiqué.</p>
      <form id="dlgF"><label class="ap-field"><span>Mot de passe du lien</span><span class="ap-in"><input id="dlgIn" type="password" autocomplete="off"><button type="button" class="ap-eye" data-eye="dlgIn" aria-label="Afficher le mot de passe">Afficher</button></span></label><p class="ap-err" id="dlgErr"></p>
      <div class="dlg-acts"><button type="button" class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" type="submit">Ouvrir</button></div></form>`, d => {
      eyes(d);
      d.querySelector('#dlgF').onsubmit = async ev => { ev.preventDefault(); const b = d.querySelector('[type=submit]'); busy(b, true, 'Vérification…');
        try { await claim(d.querySelector('#dlgIn').value); closeDlg(); } catch(x){ busy(b, false); d.querySelector('#dlgErr').textContent = 'Mot de passe incorrect, ou lien qui n\'est plus valide.'; } };
    });
    return false;
  }
}

/* Import de fichiers : .xlsx (Excel), .csv, .spectracalc → nouveau classeur */
async function importFile(f){
  if (!f) return;
  showBusy(`Import de « ${f.name} »…`);
  try { await withTimeout(editorReady, 20000, 'app/engine'); const json = await window.SWEditor.importFile(f); hideBusy(); await newDoc('', {data:json, name:JSON.parse(json).title}); toastA('Classeur importé'); }
  catch(e){ hideBusy(); toastA(e?.message && !e.code ? e.message : errMsg(e)); }
}
window.SWImport = importFile;

/* Câblage de l'accueil */
$a('#homeNav').addEventListener('click', e => { const b = e.target.closest('[data-htab]'); if (!b) return; H.tab = b.dataset.htab; H.sharedFolder = ''; H.q = ''; renderHome(); $a('#homeMain').scrollTop = 0; });
$a('#homeFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; importFile(f); });
$a('#homeLic').addEventListener('click', () => show('licence'));
$a('#homeQuota').addEventListener('click', e => { if (e.target.closest('[data-hact="upgrade"]')) show('licence'); });
$a('#homeOffer').addEventListener('click', e => { const a = e.target.closest('[data-hact]'); if (!a) return; if (a.dataset.hact === 'key') show('licence'); if (a.dataset.hact === 'retry-cloud'){ cloudMode = FIREBASE_CONFIG ? 'firebase' : 'demo'; cloudErr = ''; H.mine = H.shared = null; loadHome(); } if (a.dataset.hact === 'migrate') migrateLocal(); if (a.dataset.hact === 'offer-hide'){ store.set('sc.offerHide.' + me.uid, 1); renderOffer(); } });
$a('#homeHero').addEventListener('click', e => { const t = e.target.closest('[data-tpl]'); if (t) newDoc(t.dataset.tpl); const a = e.target.closest('[data-hact="import"]'); if (a) $a('#homeFile').click(); const h = e.target.closest('[data-htab]'); if (h){ H.tab = h.dataset.htab; H.cat = 'Tous'; renderHome(); } });
$a('#homeMain').addEventListener('input', e => { if (e.target.id === 'homeQ'){ H.q = e.target.value; renderHome(); } });
$a('#homeMain').addEventListener('change', e => { if (e.target.id === 'homeSort'){ H.sort = e.target.value; renderHome(); } });
$a('#homeBody').addEventListener('click', async e => {
  const t = e.target;
  const st = t.closest('[data-star]'); if (st){ e.stopPropagation(); const p = findP(st.dataset.star, false); if (p) toggleStar(p); return; }
  const pm = t.closest('[data-menu]'); if (pm){ e.stopPropagation(); const p = findP(pm.dataset.menu, !!pm.dataset.shared); if (p) docMenu(pm, p, !!pm.dataset.shared); return; }
  const fm = t.closest('[data-fmenu]'); if (fm){ e.stopPropagation(); const sh = !!fm.dataset.shared; const f = (sh ? H.shared.folders : H.mine.folders).find(x => x.id === fm.dataset.fmenu); if (f) folderMenu(fm, f, sh); return; }
  const tp = t.closest('[data-tpl]'); if (tp) return newDoc(tp.dataset.tpl);
  const tb = t.closest('[data-htab]'); if (tb){ H.tab = tb.dataset.htab; return renderHome(); }
  const ct = t.closest('[data-cat]'); if (ct){ H.cat = ct.dataset.cat; return renderHome(); }
  const hv = t.closest('[data-hview]'); if (hv){ H.view = hv.dataset.hview; store.set('sc.homeView', H.view); return renderHome(); }
  const sfo = t.closest('[data-sfolder]'); if (sfo){ H.sharedFolder = sfo.dataset.sfolder; return renderHome(); }
  const fo = t.closest('[data-folder]'); if (fo){ if (fo.dataset.shared){ const f = H.shared.folders.find(x => x.id === fo.dataset.folder); if (f?.locked) return verifyEmailFlow(); H.sharedFolder = fo.dataset.folder; } else H.folder = fo.dataset.folder; return renderHome(); }
  const op = t.closest('[data-open]'); if (op){ const p = findP(op.dataset.open, !!op.dataset.shared); if (p) openDoc(p); return; }
  const a = t.closest('[data-hact]'); if (!a) return;
  const k = a.dataset.hact;
  if (k === 'reload') loadHome();
  else if (k === 'verify') verifyEmailFlow();
  else if (k === 'import') $a('#homeFile').click();
  else if (k === 'newf'){
    if (folderCounts().priv >= FOLDER_LIMITS.priv) return dlg(`<h3>Limite atteinte</h3><p class="dlg-p">Vous avez déjà ${FOLDER_LIMITS.priv} dossiers (non partagés). Supprimez-en un ou partagez-en un (jusqu'à ${FOLDER_LIMITS.shared} dossiers partagés).</p><div class="dlg-acts"><button class="ap-btn" data-dlg="close">Compris</button></div>`);
    askText('Nouveau dossier', 'Nom du dossier', 'Nouveau dossier', 'Créer', async v => { const f = await Cloud().createFolder(v, H.folder); H.mine.folders.push(f); renderHome(); });
  }
});
$a('#homeBody').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target.matches('[data-open]') || e.target.matches('[data-folder]'))) e.target.click(); });
/* Glisser un fichier sur l'accueil : import */
$a('#home').addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')){ e.preventDefault(); $a('#home').classList.add('drop'); } });
$a('#home').addEventListener('dragleave', e => { if (e.target === $a('#home') || !$a('#home').contains(e.relatedTarget)) $a('#home').classList.remove('drop'); });
$a('#home').addEventListener('drop', e => { e.preventDefault(); $a('#home').classList.remove('drop'); const f = e.dataTransfer.files[0]; if (f) importFile(f); });
H.view = store.get('sc.homeView') || 'grid';
window.addEventListener('resize', () => { if (!$a('#home').hidden) window.SWScaleMinis?.($a('#homeBody')); });
if (!FIREBASE_CONFIG) window.__swT = {PLANS, H, renderHome, FOLDER_LIMITS, Cloud};

/* « Que voulez-vous calculer ? » : propose le bon modèle ou un classeur existant dès les premières lettres */
const ASK = {items:[], i:0};
const nrm = x => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function askDraw(){
  const box = $a('#homeAskRes'), q = nrm($a('#homeAsk').value.trim());
  if (!q){ box.hidden = true; ASK.items = []; return; }
  const words = q.split(/\s+/);
  const tpl = TPL().filter(t => t.id !== 'blank').map(t => ({k:'tpl', id:t.id, t:t.name, s:t.desc || t.cat, hay:nrm(t.name + ' ' + t.cat + ' ' + (t.desc || '') + ' ' + t.id.replace(/-/g, ' '))})).filter(x => words.every(w => x.hay.includes(w)));
  const docs = allMine().map(p => ({k:'doc', id:p.id, t:p.name, s:'Ouvrir · ' + ago(p.updatedAt), hay:nrm(p.name)})).filter(x => words.every(w => x.hay.includes(w))).slice(0, 4);
  const typed = $a('#homeAsk').value.trim(), aiIt = window.SWAI?.available() && typed.length > 3 ? [{k:'ai', t:`Créer avec l'IA : « ${typed.slice(0, 60)} »`, s:'Spectra crée le tableau, les formules et le graphique'}] : [];
  ASK.items = [...(words.length >= 3 ? aiIt : []), ...tpl.slice(0, 5), ...(words.length < 3 ? aiIt : []), ...docs, {k:'blank', t:`Classeur vierge « ${$a('#homeAsk').value.trim().slice(0, 50)} »`, s:'Un classeur vide, avec ce titre'}];
  ASK.i = Math.min(ASK.i, ASK.items.length - 1);
  box.hidden = false;
  box.innerHTML = ASK.items.map((x, i) => `<button type="button" data-ask="${i}" class="${i === ASK.i ? 'on' : ''} k-${x.k}" role="option"><b>${x.k === 'tpl' ? 'Nouveau : ' : ''}${esc(x.t)}</b><span>${esc(x.s.replace(' · ', ', '))}</span></button>`).join('');
}
async function askRun(i){
  const x = ASK.items[i]; if (!x) return; const typed = $a('#homeAsk').value.trim();
  $a('#homeAsk').value = ''; $a('#homeAskRes').hidden = true;
  if (x.k === 'tpl') return newDoc(x.id);
  if (x.k === 'ai'){ await newDoc('blank', {name:typed.slice(0, 80)}); setTimeout(() => window.SWEditor?.ai('Crée un classeur complet, avec des données d\'exemple réalistes, les formules, un beau tableau et un graphique si utile : ' + typed), 250); return; }
  if (x.k === 'doc'){ const p = findP(x.id, false); if (p) return openDoc(p); }
  if (x.k === 'blank'){ await newDoc('blank', {name:typed.slice(0, 80) || undefined}); }
}
$a('#homeAsk').addEventListener('input', () => { ASK.i = 0; askDraw(); });
$a('#homeAsk').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown'){ e.preventDefault(); ASK.i = Math.min(ASK.items.length - 1, ASK.i + 1); askDraw(); }
  else if (e.key === 'ArrowUp'){ e.preventDefault(); ASK.i = Math.max(0, ASK.i - 1); askDraw(); }
  else if (e.key === 'Enter'){ e.preventDefault(); if (!$a('#homeAsk').value.trim()) return newDoc('blank'); askRun(ASK.i); }
  else if (e.key === 'Escape'){ $a('#homeAsk').value = ''; askDraw(); }
});
$a('#homeAskRes').addEventListener('mousedown', e => { e.preventDefault(); const b = e.target.closest('[data-ask]'); if (b) askRun(+b.dataset.ask); });
$a('#homeAsk').addEventListener('blur', () => setTimeout(() => { $a('#homeAskRes').hidden = true; }, 120));
