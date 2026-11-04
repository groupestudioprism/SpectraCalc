/* ---------- Tiroir « Style » : styles de cellule, texte, orientation, dégradés, bordures, pinceau ---------- */
const CELL_STYLES = [
  ['Titre', {b:1, fs:20, fc:'#1A1726'}], ['Sous-titre', {b:1, fs:14, fc:'#5B5670'}], ['En-tête', {b:1, fc:'#ffffff', bg:'#3E2FC7', ha:'c'}], ['Section', {b:1, fc:'#3E2FC7', bb:'2px #3E2FC7'}],
  ['Bon', {bg:'#C6EFCE', fc:'#006100'}], ['Mauvais', {bg:'#FFC7CE', fc:'#9C0006'}], ['Neutre', {bg:'#FFEB9C', fc:'#7A5200'}], ['Avertissement', {bg:'#FFE0B2', fc:'#B23B00', b:1}],
  ['Information', {bg:'#D6E4FF', fc:'#1D3F9E'}], ['Note', {bg:'#FFF8C5', fc:'#5E4B00', i:1}], ['Entrée', {bg:'#FFF2CC', fc:'#1F4E9E', bt:'1px #7F7F7F', br:'1px #7F7F7F', bb:'1px #7F7F7F', bl:'1px #7F7F7F'}], ['Calcul', {bg:'#F2F2F2', fc:'#FA7D00', b:1}],
  ['Total', {b:1, bt:'1px #1A1726', bb:'3px #1A1726 double'}], ['Lien', {fc:'#2563EB', u:1}], ['Badge', {b:1, fc:'#ffffff', bg:'#7B3FF2', ha:'c', fs:9}], ['Étiquette', {b:1, fc:'#B3175F', bg:'#FFE0EC', ha:'c'}],
  ['Code', {ff:'JetBrains Mono', bg:'#F1EFF8', fc:'#B3175F'}], ['Citation', {i:1, fc:'#5B5670', bl:'3px #7B3FF2', ind:1}], ['Discret', {fc:'#8D88A3', fs:9}], ['Néon', {b:1, fc:'#00E5FF', bg:'#0C0A16', fs:12}]];
const GRADS = [['#7B3FF2', '#3D63FF'], ['#FF7A2F', '#F2387A'], ['#12B5E5', '#2FBF71'], ['#F5B82E', '#FF7A2F'], ['#1A1726', '#3E3A52'], ['#FFE0EC', '#E9D5FF'], ['#D6E4FF', '#CFF5E7'], ['#FFF1A8', '#FFE0B2']];
const ROTS = [[0, 'Horizontal', 'M4 12h16'], [45, 'Monter 45°', 'm5 19 14-14'], [-45, 'Descendre 45°', 'm5 5 14 14'], [90, 'Monter 90°', 'M12 20V4'], [-90, 'Descendre 90°', 'M12 4v16'], ['v', 'Empilé', 'M12 4v16']];
const BST = {w:1, st:'solid', col:'#1A1726'};
const PAINT = {s:null, on:false};
const okCol = c => /^#[0-9a-f]{3,8}$/i.test(String(c || ''));
function styleHTML(){
  const s = sh0().get(SEL.r, SEL.c)?.s || {}, g = s.grad || [], cl = (k, d) => okCol(s[k]) ? s[k] : d;
  const prev = p => `${p.bg ? `background:${p.bg};` : ''}${p.fc ? `color:${p.fc};` : ''}${p.b ? 'font-weight:700;' : ''}${p.i ? 'font-style:italic;' : ''}${p.u ? 'text-decoration:underline;' : ''}${p.fs ? `font-size:${Math.min(16, p.fs * .9)}px;` : ''}${p.ff ? `font-family:'${p.ff}',monospace;` : ''}${p.bb ? `border-bottom:${p.bb.includes('double') ? '3px double' : '2px solid'} ${p.bb.split(' ')[1]};` : ''}${p.bl ? `border-left:3px solid ${p.bl.split(' ')[1]};padding-left:6px;` : ''}`;
  const T = (k, n) => `<button type="button" data-sty="t:${k}" class="${s[k] ? 'on' : ''}">${n}</button>`;
  return `<p class="pn-h">Styles de cellule <small>sur ${escH(rangeA1(SEL))}</small></p><div class="sty-gal">${CELL_STYLES.map(([n, p], i) => `<button type="button" data-sty="cs:${i}"><span style="${prev(p)}">${n}</span></button>`).join('')}</div>
    <p class="pn-h">Texte</p><div class="sty-tg">${T('st', '<s>Barré</s>')}${T('b', '<b>Gras</b>')}${T('i', '<i>Italique</i>')}${T('u', '<u>Souligné</u>')}${T('sh', 'Ombre')}${T('shr', 'Réduire')}
      <button type="button" data-sty="tt:u" class="${s.tt === 'u' ? 'on' : ''}">MAJ</button><button type="button" data-sty="tt:l" class="${s.tt === 'l' ? 'on' : ''}">min</button><button type="button" data-sty="tt:c" class="${s.tt === 'c' ? 'on' : ''}">Abc</button></div>
    <label class="sty-rg">Espacement des lettres<input type="range" min="-1" max="8" step=".5" value="${s.ls || 0}" data-sty-rg="ls"><output>${s.ls || 0}</output></label>
    <p class="pn-h">Orientation du texte</p><div class="sty-rot">${ROTS.map(([v, n, d]) => `<button type="button" data-sty="rot:${v}" class="${(s.rot || 0) === v ? 'on' : ''}" title="${n}"><svg viewBox="0 0 24 24"><path d="${d}"/>${v === 'v' ? '<path d="M9 8h6M9 12h6M9 16h6" opacity=".5"/>' : ''}</svg></button>`).join('')}</div>
    <p class="pn-h">Remplissage dégradé</p><div class="sty-grads">${GRADS.map(([a, b], i) => `<button type="button" data-sty="gr:${i}" style="background:linear-gradient(135deg,${a},${b})" title="Dégradé ${i + 1}"></button>`).join('')}<button type="button" data-sty="gr:x" class="sty-none" title="Retirer">∅</button></div>
    <div class="sty-gc"><label>De<input type="color" data-sty-gc="0" value="${cl('x', g[0] && okCol(g[0]) ? g[0] : '#7B3FF2')}"></label><label>À<input type="color" data-sty-gc="1" value="${g[1] && okCol(g[1]) ? g[1] : '#3D63FF'}"></label><label>Angle<input type="range" min="0" max="360" step="15" value="${g[2] ?? 135}" data-sty-gc="2"></label></div>
    <p class="pn-h">Bordures <small>style appliqué au prochain tracé</small></p><div class="sty-b"><div class="seg" id="styBs">${[['solid', 'Plein'], ['dashed', 'Tirets'], ['dotted', 'Points'], ['double', 'Double']].map(([k, n]) => `<button type="button" data-sty="bs:${k}" aria-checked="${BST.st === k}">${n}</button>`).join('')}</div>
      <div class="seg" id="styBw">${[1, 2, 3, 4].map(w => `<button type="button" data-sty="bw:${w}" aria-checked="${BST.w === w}">${w} px</button>`).join('')}</div><label class="sty-bc">Couleur<input type="color" data-sty-bc="1" value="${BST.col}"></label></div>
    <div class="pn-acts"><button type="button" data-sty="bd:out">Contour</button><button type="button" data-sty="bd:all">Toutes</button><button type="button" data-sty="bd:in">Intérieures</button><button type="button" data-sty="bd:bottom">Bas</button><button type="button" data-sty="bd:top">Haut</button><button type="button" data-sty="bd:none">Aucune</button></div>
    <p class="pn-h">Outils</p><div class="pn-acts"><button type="button" data-sty="paint" class="${PAINT.on ? 'on' : ''}">${IC.copy}Pinceau de format</button><button type="button" data-sty="clear">${IC.clear}Effacer la mise en forme</button></div>
    <p class="pn-hint">Pinceau : cliquez-le (Maj + clic = plusieurs fois), puis sélectionnez les cellules à mettre en forme. Raccourci : Ctrl + Maj + C puis Ctrl + Maj + V.</p>`;
}
function bdStr(){ return `${BST.w}px ${BST.col}` + (BST.st === 'solid' ? '' : ' ' + BST.st); }
function applyBordersStyled(kind){
  const sh = sh0(), g = {...SEL}, u = sh.used(); g.r2 = Math.min(g.r2, Math.max(u.r, g.r1)); g.c2 = Math.min(g.c2, Math.max(u.c, g.c1)); const L = bdStr();
  tx('Bordures', () => { for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++){
    const top = r === g.r1, bot = r === g.r2, lef = c === g.c1, rig = c === g.c2, p = {};
    if (kind === 'none') Object.assign(p, {bt:null, br:null, bb:null, bl:null}); if (kind === 'all') Object.assign(p, {bt:L, br:L, bb:L, bl:L});
    if (kind === 'out'){ if (top) p.bt = L; if (bot) p.bb = L; if (lef) p.bl = L; if (rig) p.br = L; }
    if (kind === 'in'){ if (!bot) p.bb = L; if (!rig) p.br = L; } if (kind === 'top' && top) p.bt = L; if (kind === 'bottom' && bot) p.bb = L;
    if (Object.keys(p).length) sh.setStyle(r, c, p); } });
}
function styleAction(k, el){
  const [a, v] = [k.split(':')[0], k.slice(k.indexOf(':') + 1)], s = sh0().get(SEL.r, SEL.c)?.s || {};
  if (a === 'cs'){ const p = CELL_STYLES[+v][1]; styleSel({bg:null, fc:null, b:null, i:null, u:null, fs:null, ff:null, ha:null, ind:null, grad:null, ...p}, 'Style de cellule'); layoutRowsForFont(); }
  else if (a === 't') styleSel({[v]:s[v] ? null : 1}, 'Texte');
  else if (a === 'tt') styleSel({tt:s.tt === v ? null : v}, 'Casse');
  else if (a === 'rot') styleSel({rot:(s.rot || 0) === (v === 'v' ? 'v' : +v) ? null : (v === 'v' ? 'v' : +v)}, 'Orientation');
  else if (a === 'gr'){ styleSel(v === 'x' ? {grad:null} : {grad:[...GRADS[+v], 135], bg:null}, 'Dégradé'); }
  else if (a === 'bs'){ BST.st = v; } else if (a === 'bw'){ BST.w = +v; } else if (a === 'bd') applyBordersStyled(v);
  else if (a === 'clear') clearSel('format');
  else if (a === 'paint'){ if (PAINT.on){ PAINT.on = false; } else { PAINT.s = cloneS(s); PAINT.on = true; toast('Pinceau : sélectionnez les cellules à mettre en forme'); } }
  else return;
  renderPanel(); refreshToolbar(); schedule();
}
function paintApply(){
  if (!PAINT.on || !PAINT.s && PAINT.s !== null) return; const st = PAINT.s || {}, sh = sh0(); const keys = ['bg', 'fc', 'b', 'i', 'u', 'st', 'fs', 'ff', 'ha', 'va', 'wrap', 'ind', 'nf', 'bt', 'br', 'bb', 'bl', 'grad', 'rot', 'sh', 'shr', 'tt', 'ls'];
  const patch = {}; for (const k of keys) patch[k] = st[k] ?? null; PAINT.on = false; styleSel(patch, 'Pinceau de format'); layoutRowsForFont(); if (panel === 'style') renderPanel();
}
function onStyleInput(e){
  const t = e.target, rg = t.dataset.styRg, gc = t.dataset.styGc, bc = t.dataset.styBc;
  if (rg){ t.nextElementSibling.textContent = t.value; styleSel({[rg]:+t.value || null}, 'Espacement'); }
  if (gc != null){ const s = sh0().get(SEL.r, SEL.c)?.s || {}, g = [...(s.grad || ['#7B3FF2', '#3D63FF', 135])]; g[+gc] = +gc === 2 ? +t.value : t.value; styleSel({grad:g, bg:null}, 'Dégradé'); }
  if (bc) BST.col = t.value;
}
