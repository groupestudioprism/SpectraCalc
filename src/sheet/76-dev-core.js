/* ---------- Développeur : macros, fonctions personnalisées, bac à sable, enregistreur ----------
   Le code de l'utilisateur ne tourne JAMAIS dans la page : il s'exécute dans un Web Worker hébergé par un iframe « sandbox »
   (origine opaque, politique CSP sans réseau, aucun accès au DOM, aux cookies, au stockage ni à Firebase). Le script reçoit une copie du
   classeur et renvoie une liste d'opérations, que l'application applique en une seule étape annulable. */
const DEV = {open:false, sel:'', run:false, con:[], rec:null, applying:false, tab:'edit'};
const DEV_LIMIT = {macros:60, code:60000, runMs:10000, fnMs:3000};
const validFnName = n => /^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(n);
const macrosOf = () => WB.macros || (WB.macros = []);
const macroBy = id => macrosOf().find(m => m.id === id);
function cleanMacro(m){
  if (!m || typeof m !== 'object') return null;
  return {id:String(m.id || uidS()).slice(0, 20), name:String(m.name || 'Macro').slice(0, 40), kind:m.kind === 'function' ? 'function' : 'macro',
    code:String(m.code || '').slice(0, DEV_LIMIT.code), desc:String(m.desc || '').slice(0, 200), ...(m.from ? {from:String(m.from).slice(0, 40)} : {})};
}

/* ---------- bac à sable ---------- */
const SBX = {frame:null, ready:null, cur:null, seq:0, q:Promise.resolve()};
function sbxKill(){ if (SBX.frame){ SBX.frame.remove(); SBX.frame = null; SBX.ready = null; } if (SBX.cur){ const c = SBX.cur; SBX.cur = null; c.done({ok:false, error:{message:'Exécution interrompue.', line:0}}); } }
function sbxStart(){
  if (SBX.ready) return SBX.ready;
  const src = document.getElementById('scWorkerSrc')?.textContent || '';
  const csp = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; child-src blob:";
  const html = `<!doctype html><meta http-equiv="Content-Security-Policy" content="${csp}"><script>
const w=new Worker(URL.createObjectURL(new Blob([${JSON.stringify(src).replace(/</g, '\\u003c')}])));
w.onmessage=e=>parent.postMessage(e.data,'*');w.onerror=e=>parent.postMessage({fatal:String(e.message||'erreur')},'*');
addEventListener('message',e=>{if(e.source===parent)w.postMessage(e.data)});<\/script>`;
  const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-scripts'); f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.title = 'Bac à sable des macros';
  f.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;visibility:hidden'; f.srcdoc = html;
  SBX.frame = f;
  SBX.ready = new Promise((ok, ko) => { SBX.onReady = ok; setTimeout(() => ko(new Error('Le bac à sable n\'a pas démarré.')), 6000); });
  SBX.ready.catch(() => { if (SBX.frame === f) sbxKill(); });
  document.body.appendChild(f);
  return SBX.ready;
}
window.addEventListener('message', e => {
  if (!SBX.frame || e.source !== SBX.frame.contentWindow) return;
  const d = e.data; if (!d || typeof d !== 'object') return;
  if (d.ready){ SBX.onReady && SBX.onReady(); return; }
  if (d.fatal && SBX.cur){ const c = SBX.cur; SBX.cur = null; c.done({ok:false, error:{message:String(d.fatal).slice(0, 300), line:0}}); return; }
  if (SBX.cur && d.id === SBX.cur.id){ const c = SBX.cur; SBX.cur = null; c.done(d); }
});
function sbxExec(msg, ms){
  return new Promise(async res => {
    try { await sbxStart(); } catch(e){ return res({ok:false, error:{message:String(e.message || e), line:0}}); }
    const id = ++SBX.seq;
    const timer = setTimeout(() => { SBX.cur = null; sbxKill(); res({ok:false, timeout:true, error:{message:`Temps dépassé (${ms / 1000} s) : le script a été arrêté (boucle infinie ?).`, line:0}}); }, ms);
    SBX.cur = {id, done:r => { clearTimeout(timer); res(r); }};
    SBX.frame.contentWindow.postMessage({...msg, id}, '*');
  });
}
const sbxRun = (msg, ms) => { const p = SBX.q.then(() => sbxExec(msg, ms)); SBX.q = p.catch(() => {}); return p; };

/* ---------- console ---------- */
function devLog(t, text, extra){ DEV.con.push({t, text:String(text).slice(0, 600), at:Date.now(), ...extra}); if (DEV.con.length > 300) DEV.con.shift(); if (DEV.open) devDrawCon(); }

/* ---------- copie du classeur envoyée au script ---------- */
function snapshotWB(){
  const cap = 300000; let n = 0;
  const sheets = WB.sheets.map(s => { const cells = [];
    for (const [k, c] of s.cells){ if (c.raw === '' && !c.s) continue; if (++n > cap) break; let v = c.raw === '' ? null : WB.val(s, KR(k), KC(k)); if (isErr(v)) v = String(v); else if (v !== null && typeof v === 'object') v = null; cells.push([KR(k), KC(k), c.raw, v, c.s || 0]); }
    return {name:s.name, cells}; });
  return {title:WB.title, active:WB.active, sel:rangeA1({r1:SEL.r1, c1:SEL.c1, r2:SEL.r2, c2:SEL.c2}), sheets};
}

/* ---------- application des opérations (une seule étape annulable) ---------- */
function applyOps(ops, label){
  const struct = ops.some(o => ['addSheet', 'delSheet', 'renSheet', 'activate'].includes(o.t));
  const msgs = [];
  DEV.applying = true;
  try {
    tx(label, () => {
      const S = n => WB.byName(n);
      for (const o of ops){
        const sh = o.s ? S(o.s) : null;
        switch (o.t){
          case 'raw': if (sh) sh.setRaw(o.r, o.c, o.v); break;
          case 'style': if (sh){ const p = {}; for (const [k, v] of Object.entries(o.p || {})) if (/^(b|i|u|st|fc|bg|fs|ff|ha|nf|wrap)$/.test(k)) p[k] = v === 0 ? false : v; sh.setStyle(o.r, o.c, p); } break;
          case 'clear': if (sh){ for (const [k, cell] of [...sh.cells]){ const r = KR(k), c = KC(k); if (r < o.r1 || r > o.r2 || c < o.c1 || c > o.c2) continue;
            if (o.w === 'all') sh.setCell(r, c, null); else if (o.w === 'content') sh.setRaw(r, c, ''); else if (cell.s) sh.setStyle(r, c, Object.fromEntries(Object.keys(cell.s).map(x => [x, false]))); } } break;
          case 'merge': if (sh && !sh.merges.some(m => m.r1 === o.r1 && m.c1 === o.c1 && m.r2 === o.r2 && m.c2 === o.c2)) sh.merges.push({r1:o.r1, c1:o.c1, r2:o.r2, c2:o.c2}); break;
          case 'colw': if (sh) sh.cw[o.c] = o.w; break;
          case 'rowh': if (sh) sh.rh[o.r] = o.h; break;
          case 'chart': if (sh && CHART_TYPES.some(t => t[0] === o.ch.type) && parseRange(o.ch.range)) sh.charts.push({...o.ch, id:uidS(), title:String(o.ch.title || '').slice(0, 120)}); break;
          case 'addSheet': if (!S(o.name)) WB.addSheet(String(o.name).replace(/[\\/?*[\]:]/g, '').slice(0, 31)); break;
          case 'delSheet': { const i = WB.sheets.findIndex(x => x.name === o.name); if (i >= 0 && WB.sheets.length > 1){ WB.sheets.splice(i, 1); WB.active = clamp(WB.active, 0, WB.sheets.length - 1); } break; }
          case 'renSheet': { const s = S(o.from); if (s && !S(o.to)){ const nn = String(o.to).replace(/[\\/?*[\]:]/g, '').slice(0, 31); s.name = nn; for (const x of WB.sheets) for (const [k, cell] of x.cells) if (cell.raw && cell.raw[0] === '=' && cell.raw.includes(o.from)){ const nr = '=' + renameSheetInFormula(cell.raw.slice(1), o.from, nn); if (nr !== cell.raw) x.setRaw(KR(k), KC(k), nr, true); } } break; }
          case 'activate': { const i = WB.sheets.findIndex(x => x.name === o.name); if (i >= 0) WB.active = i; break; }
          case 'toast': msgs.push(o.text); break;
        }
      }
    }, struct ? {full:true} : undefined);
    if (struct){ WB.recalc(); V.nr = Math.max(120, V.nr); layout(); renderTabs(); schedule(); selChanged(); }
  } finally { DEV.applying = false; }
  return msgs;
}

/* ---------- exécution d'une macro ---------- */
async function runMacro(m, quiet){
  if (!m) return;
  if (V.ro) return toast('Classeur en lecture seule : les macros sont désactivées');
  if (DEV.run) return toast('Une macro est déjà en cours');
  if (EDIT.on) commitEdit(0, 0);
  DEV.run = true; if (DEV.open) devDrawBar();
  const t0 = performance.now();
  devLog('info', `▶ ${m.name} : exécution…`);
  let res;
  try { res = await sbxRun({type:'run', code:m.code, snap:snapshotWB()}, DEV_LIMIT.runMs); }
  catch(e){ res = {ok:false, error:{message:String(e.message || e), line:0}}; }
  DEV.run = false;
  (res.logs || []).forEach(l => devLog(l.t, l.text));
  if (!res.ok){
    devLog('error', `${res.error?.name && res.error.name !== 'Error' ? res.error.name + ' : ' : ''}${res.error?.message || 'Erreur inconnue'}`, {macro:m.id, line:res.error?.line || 0});
    devLog('warn', 'Aucune modification n\'a été appliquée au classeur.');
    toast(`Erreur dans « ${m.name} » : voir la console Développeur`); if (DEV.open) devDrawBar();
    return false;
  }
  const msgs = res.ops.length ? applyOps(res.ops, 'Macro : ' + m.name) : [];
  devLog('ok', `✓ ${m.name} terminée en ${Math.round(performance.now() - t0)} ms · ${res.ops.filter(o => o.t !== 'toast').length} opération(s)`);
  if (msgs.length) toast(msgs[msgs.length - 1]); else if (!quiet) toast(`Macro « ${m.name} » terminée`);
  if (DEV.open) devDrawBar();
  return true;
}

/* ---------- fonctions personnalisées utilisables dans les formules ---------- */
const UDF = {names:new Set(), cache:new Map(), pend:new Map(), dead:new Set(), timer:0, builtin:null};
function devSyncFns(){
  if (!UDF.builtin) UDF.builtin = new Set(Object.keys(FN));
  for (const n of UDF.names){ delete FN[n]; }
  for (let i = FN_INFO.length - 1; i >= 0; i--) if (FN_INFO[i].custom) FN_INFO.splice(i, 1);
  UDF.names.clear();
  for (const m of macrosOf()){
    if (m.kind !== 'function' || !validFnName(m.name)) continue;
    const N = m.name.toUpperCase(); if (UDF.builtin.has(N) || FN_ALIAS[N]) continue;
    const nm = m.name;
    FN[N] = {f:args => udfCall(nm, args)}; UDF.names.add(N);
    const params = /function\s+[A-Za-z_]\w*\s*\(([^)]*)\)/.exec(m.code)?.[1]?.replace(/\s+/g, '').split(',').filter(Boolean).join('; ') || '';
    FN_INFO.push({en:N, fr:N, cat:'Personnalisées', syn:params, desc:m.desc || 'Fonction personnalisée (Développeur)', custom:true});
  }
}
function udfArg(v){ if (isRng(v)) return v.h === 1 && v.w === 1 ? udfArg(v.v(0, 0)) : v.arr().map(r => r.map(udfArg)); if (isErr(v)) return String(v); if (isArr(v)) return v.map(r => Array.isArray(r) ? r.map(udfArg) : udfArg(r)); return v === MISSING ? null : v; }
function udfCall(name, args){
  const a = args.map(udfArg), key = name.toUpperCase() + '\u0001' + JSON.stringify(a);
  const hit = UDF.cache.get(key);
  if (hit){ if (hit.e) throw ER.value; const v = hit.v; if (Array.isArray(v)) return Array.isArray(v[0]) ? v : [v]; if (typeof v === 'number' && !isFinite(v)) throw ER.num; return v; }
  if (UDF.dead.has(name.toUpperCase())) throw ER.value;
  if (!UDF.pend.has(key)){ UDF.pend.set(key, {fn:name, args:a}); clearTimeout(UDF.timer); UDF.timer = setTimeout(udfFlush, 15); }
  throw ER.calc;
}
async function udfFlush(){
  const batch = [...UDF.pend]; UDF.pend.clear(); if (!batch.length) return;
  const by = new Map(); for (const [k, c] of batch){ const L = by.get(c.fn.toUpperCase()) || []; L.push({k, fn:c.fn, args:c.args}); by.set(c.fn.toUpperCase(), L); }
  for (const [N, calls] of by){
    const m = macrosOf().find(x => x.kind === 'function' && x.name.toUpperCase() === N); if (!m) continue;
    for (let i = 0; i < calls.length; i += 300){
      const part = calls.slice(i, i + 300);
      const r = await sbxRun({type:'calls', code:m.code, fnames:[m.name], calls:part}, DEV_LIMIT.fnMs);
      if (!r.ok){ part.forEach(c => UDF.cache.set(c.k, {e:1})); if (r.timeout) UDF.dead.add(N); devLog('error', `Fonction ${m.name} : ${r.error?.message}`, {macro:m.id, line:r.error?.line || 0}); break; }
      for (const o of r.out){ if (o.e){ UDF.cache.set(o.k, {e:1}); devLog('warn', `${m.name} : ${o.e}`, {macro:m.id}); } else UDF.cache.set(o.k, {v:o.v}); }
    }
  }
  if (UDF.cache.size > 20000) for (const k of [...UDF.cache.keys()].slice(0, 5000)) UDF.cache.delete(k);
  if (!UDF.pend.size){ WB.recalc(); layout(); schedule(); }
}
function udfReset(){ UDF.cache.clear(); UDF.pend.clear(); UDF.dead.clear(); }
function devOnLoad(wb){ if (wb !== WB || window.__swPreview) return; udfReset(); devSyncFns(); }

/* ---------- enregistreur de macros ---------- */
const REC_KEYS = {b:'gras', i:'italique', u:'souligne', st:'barre', fc:'couleurTexte', bg:'couleurFond', fs:'taille', ff:'police', ha:'alignement', nf:'formatNombre', wrap:'renvoi'};
const HA_NAME = {l:'gauche', c:'centre', r:'droite'};
const jsLit = v => typeof v === 'number' ? String(v) : JSON.stringify(v);
function recStart(){ DEV.rec = {lines:[], shs:new Map(), n:0, t0:Date.now()}; devLog('info', '● Enregistrement démarré : agissez dans le classeur, puis arrêtez l\'enregistreur.'); if (DEV.open) devDrawBar(); drawRecPill(); }
function drawRecPill(){
  let p = document.getElementById('devRecPill');
  if (!DEV.rec){ p && p.remove(); return; }
  if (!p){ p = document.createElement('button'); p.id = 'devRecPill'; p.type = 'button'; p.className = 'dev-pill'; p.innerHTML = '<i></i><span>Enregistrement…</span><b>Arrêter</b>'; p.onclick = () => recStop(); document.body.appendChild(p); }
}
function recSheetVar(name){ const R = DEV.rec; if (!R.shs.has(name)) R.shs.set(name, 'f' + (R.shs.size + 1)); return R.shs.get(name); }
function devRecStep(step){
  const R = DEV.rec; if (!R || DEV.applying) return;
  if (step.fullB || step.fullA){ R.lines.push(`// Action « ${step.label} » non enregistrable (structure du classeur) : à ajouter à la main.`); return; }
  const sh = WB.sheets.find(s => s.id === step.sheet); if (!sh) return;
  const fv = recSheetVar(sh.name), out = [`// ${step.label}`];
  const raws = [], styles = new Map();
  for (const c of step.cells || []){
    const r = KR(c.k), cc = KC(c.k), b = c.b || {raw:'', s:null}, a = c.a || {raw:'', s:null};
    if ((b.raw || '') !== (a.raw || '')) raws.push([r, cc, a.raw || '']);
    const sa = a.s || {}, sb = b.s || {}, patch = {};
    for (const k of Object.keys(REC_KEYS)) if (JSON.stringify(sa[k] ?? null) !== JSON.stringify(sb[k] ?? null)) patch[k] = sa[k] ?? null;
    if (Object.keys(patch).length){ const sig = JSON.stringify(patch); if (!styles.has(sig)) styles.set(sig, {patch, cells:[]}); styles.get(sig).cells.push([r, cc]); }
  }
  for (const [r, c, raw] of raws.slice(0, 60)){
    const n = raw !== '' && /^-?\d+(,\d+)?$/.test(raw) ? parseFloat(raw.replace(',', '.')) : raw;
    out.push(`${fv}.plage(${JSON.stringify(A1(r, c))}).valeur = ${jsLit(n)};`);
  }
  if (raws.length > 60) out.push(`// … ${raws.length - 60} autres cellules`);
  for (const {patch, cells} of styles.values()){
    const r1 = Math.min(...cells.map(x => x[0])), r2 = Math.max(...cells.map(x => x[0])), c1 = Math.min(...cells.map(x => x[1])), c2 = Math.max(...cells.map(x => x[1]));
    const boxes = cells.length === (r2 - r1 + 1) * (c2 - c1 + 1) ? [[r1, c1, r2, c2]] : cells.slice(0, 40).map(x => [x[0], x[1], x[0], x[1]]);
    for (const [a, b, c, d] of boxes){
      const addr = a === c && b === d ? A1(a, b) : A1(a, b) + ':' + A1(c, d);
      for (const [k, v] of Object.entries(patch)){ const val = k === 'ha' ? (HA_NAME[v] || 'gauche') : (k === 'b' || k === 'i' || k === 'u' || k === 'st' || k === 'wrap') ? !!v : v;
        out.push(`${fv}.plage(${JSON.stringify(addr)}).format.${REC_KEYS[k]} = ${jsLit(val)};`); }
    }
  }
  if (step.metaB){
    try { const B = JSON.parse(step.metaB), A = JSON.parse(step.metaA);
      for (const ch of A.charts || []) if (!(B.charts || []).some(x => x.id === ch.id)) out.push(`${fv}.ajouterGraphique({ type: ${JSON.stringify(ch.type)}, plage: ${JSON.stringify(ch.range)}, titre: ${JSON.stringify(ch.title || '')} });`);
      for (const [c, w] of Object.entries(A.cw || {})) if (B.cw?.[c] !== w) out.push(`${fv}.largeurColonne(${+c + 1}, ${Math.round(w)});`);
      for (const [r, h] of Object.entries(A.rh || {})) if (B.rh?.[r] !== h) out.push(`${fv}.hauteurLigne(${+r + 1}, ${Math.round(h)});`);
      for (const m of A.merges || []) if (!(B.merges || []).some(x => x.r1 === m.r1 && x.c1 === m.c1 && x.r2 === m.r2 && x.c2 === m.c2)) out.push(`${fv}.plage(${JSON.stringify(rangeA1(m))}).fusionner();`);
    } catch(e){}
  }
  if (out.length > 1){ R.lines.push(out.join('\n')); R.n++; if (R.lines.length > 400) R.lines.shift(); }
}
function recStop(save = true){
  const R = DEV.rec; DEV.rec = null; drawRecPill();
  if (!R) return null;
  if (!R.n){ devLog('warn', 'Rien n\'a été enregistré.'); toast('Enregistrement arrêté : aucune action'); if (DEV.open) devDrawBar(); return null; }
  const head = [...R.shs].map(([name, v]) => `const ${v} = classeur.feuille(${JSON.stringify(name)});`).join('\n');
  const m = newMacro('macro', 'Macro enregistrée', `// Macro enregistrée automatiquement le ${new Date().toLocaleString('fr-FR')}\n${head}\n\n${R.lines.join('\n\n')}\n`);
  devLog('ok', `■ Enregistrement terminé : « ${m.name} » créée (${R.n} action${R.n > 1 ? 's' : ''}).`);
  toast('Macro enregistrée'); DEV.sel = m.id; openDev('edit'); return m;
}

/* ---------- gestion des macros ---------- */
function uniqueMacroName(base, kind){
  const ok = n => !macrosOf().some(m => m.name.toLowerCase() === n.toLowerCase()); let n = base, i = 1;
  while (!ok(n)) n = `${base}${kind === 'function' ? '_' : ' '}${++i}`; return n;
}
function newMacro(kind, name, code, extra = {}){
  if (macrosOf().length >= DEV_LIMIT.macros){ toast(`Limite de ${DEV_LIMIT.macros} scripts par classeur atteinte`); return null; }
  const nm = uniqueMacroName(kind === 'function' ? String(name || 'MaFonction').replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1') : (name || 'Macro'), kind);
  const m = cleanMacro({id:uidS(), name:nm, kind, code, ...extra});
  macrosOf().push(m); devCommit(kind === 'function'); return m;
}
/* enregistre dans le classeur (annuler/rétablir ne concerne pas l'éditeur de code : il garde son propre historique) */
function devCommit(sync = true){ if (sync){ devSyncFns(); udfReset(); WB.recalc(); layout(); schedule(); } emitChange(); }
function deleteMacro(id){ WB.macros = macrosOf().filter(m => m.id !== id); for (const sh of WB.sheets) for (const s of sh.shapes) if (s.macro === id) delete s.macro; if (DEV.sel === id) DEV.sel = ''; devCommit(); }
function runShapeMacro(shape){ const m = macroBy(shape.macro); if (!m) return toast('La macro liée à ce bouton n\'existe plus'); runMacro(m, true); }
