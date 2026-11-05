/* ---------- Formes, lignes, zones de texte, icônes et images posées sur la feuille (plus riche que Canva) ---------- */
const SHP = {sel:null, drag:null, edit:null, tab:'shapes'};
const poly = (pts, w, h) => 'M' + pts.map(p => `${(p[0] * w).toFixed(1)},${(p[1] * h).toFixed(1)}`).join('L') + 'Z';
const ngon = (n, rot = -Math.PI / 2) => Array.from({length:n}, (_, i) => [.5 + .5 * Math.cos(rot + i * 2 * Math.PI / n), .5 + .5 * Math.sin(rot + i * 2 * Math.PI / n)]);
const starP = (n, ri) => Array.from({length:n * 2}, (_, i) => { const r = i % 2 ? ri * .5 : .5, a = -Math.PI / 2 + i * Math.PI / n; return [.5 + r * Math.cos(a), .5 + r * Math.sin(a)]; });
const rrect = (w, h, r) => { r = Math.min(r, w / 2, h / 2); return `M${r},0H${w - r}Q${w},0 ${w},${r}V${h - r}Q${w},${h} ${w - r},${h}H${r}Q0,${h} 0,${h - r}V${r}Q0,0 ${r},0Z`; };
const ell = (w, h) => `M0,${h / 2}A${w / 2},${h / 2} 0 1 1 ${w},${h / 2}A${w / 2},${h / 2} 0 1 1 0,${h / 2}Z`;
const SHAPES = {
  rect:['Rectangle', (w, h) => `M0,0H${w}V${h}H0Z`], round:['Rectangle arrondi', (w, h, s) => rrect(w, h, Math.min(w, h) * (s.r ?? .2))], pill:['Pilule', (w, h) => rrect(w, h, h)], ellipse:['Ellipse', ell],
  tri:['Triangle', (w, h) => poly([[.5, 0], [1, 1], [0, 1]], w, h)], rtri:['Triangle rectangle', (w, h) => poly([[0, 0], [1, 1], [0, 1]], w, h)], diamond:['Losange', (w, h) => poly([[.5, 0], [1, .5], [.5, 1], [0, .5]], w, h)],
  para:['Parallélogramme', (w, h) => poly([[.2, 0], [1, 0], [.8, 1], [0, 1]], w, h)], trap:['Trapèze', (w, h) => poly([[.2, 0], [.8, 0], [1, 1], [0, 1]], w, h)],
  pent:['Pentagone', (w, h) => poly(ngon(5), w, h)], hex:['Hexagone', (w, h) => poly(ngon(6, 0), w, h)], oct:['Octogone', (w, h) => poly(ngon(8, Math.PI / 8), w, h)],
  star4:['Étoile 4', (w, h) => poly(starP(4, .38), w, h)], star5:['Étoile 5', (w, h) => poly(starP(5, .4), w, h)], star6:['Étoile 6', (w, h) => poly(starP(6, .55), w, h)], burst:['Explosion', (w, h) => poly(starP(12, .78), w, h)],
  arrR:['Flèche droite', (w, h) => poly([[0, .3], [.6, .3], [.6, 0], [1, .5], [.6, 1], [.6, .7], [0, .7]], w, h)], arrL:['Flèche gauche', (w, h) => poly([[1, .3], [.4, .3], [.4, 0], [0, .5], [.4, 1], [.4, .7], [1, .7]], w, h)],
  arrU:['Flèche haut', (w, h) => poly([[.3, 1], [.3, .4], [0, .4], [.5, 0], [1, .4], [.7, .4], [.7, 1]], w, h)], arrD:['Flèche bas', (w, h) => poly([[.3, 0], [.3, .6], [0, .6], [.5, 1], [1, .6], [.7, .6], [.7, 0]], w, h)],
  arrLR:['Double flèche', (w, h) => poly([[0, .5], [.25, 0], [.25, .3], [.75, .3], [.75, 0], [1, .5], [.75, 1], [.75, .7], [.25, .7], [.25, 1]], w, h)], chev:['Chevron', (w, h) => poly([[0, 0], [.7, 0], [1, .5], [.7, 1], [0, 1], [.3, .5]], w, h)], home:['Étape', (w, h) => poly([[0, 0], [.75, 0], [1, .5], [.75, 1], [0, 1]], w, h)],
  cross:['Croix', (w, h) => poly([[.35, 0], [.65, 0], [.65, .35], [1, .35], [1, .65], [.65, .65], [.65, 1], [.35, 1], [.35, .65], [0, .65], [0, .35], [.35, .35]], w, h)],
  ring:['Anneau', (w, h) => ell(w, h) + ell(w * .56, h * .56).replace(/([\d.]+),([\d.]+)/g, (m, x, y) => `${(+x + w * .22).toFixed(1)},${(+y + h * .22).toFixed(1)}`), 'evenodd'],
  heart:['Cœur', (w, h) => `M${w / 2},${h}C${-w * .15},${h * .55} ${w * .1},${-h * .1} ${w / 2},${h * .28}C${w * .9},${-h * .1} ${w * 1.15},${h * .55} ${w / 2},${h}Z`],
  moon:['Lune', (w, h) => `M${w * .7},0A${w * .5},${h / 2} 0 1 0 ${w * .7},${h}A${w * .38},${h * .5} 0 1 1 ${w * .7},0Z`],
  cloud:['Nuage', (w, h) => `M${w * .25},${h * .85}A${w * .2},${h * .2} 0 0 1 ${w * .22},${h * .45}A${w * .22},${h * .24} 0 0 1 ${w * .5},${h * .2}A${w * .22},${h * .22} 0 0 1 ${w * .78},${h * .38}A${w * .2},${h * .24} 0 0 1 ${w * .78},${h * .85}Z`],
  drop:['Goutte', (w, h) => `M${w / 2},0C${w * .6},${h * .3} ${w},${h * .5} ${w},${h * .68}A${w / 2},${h * .32} 0 0 1 0,${h * .68}C0,${h * .5} ${w * .4},${h * .3} ${w / 2},0Z`],
  bolt:['Éclair', (w, h) => poly([[.6, 0], [.15, .55], [.45, .55], [.35, 1], [.85, .4], [.55, .4]], w, h)], check:['Coche', (w, h) => poly([[.05, .55], [.2, .4], [.4, .6], [.8, .1], [.95, .25], [.4, .9]], w, h)],
  bubble:['Bulle', (w, h) => `M${w * .1},0H${w * .9}Q${w},0 ${w},${h * .1}V${h * .62}Q${w},${h * .72} ${w * .9},${h * .72}H${w * .4}L${w * .2},${h}L${w * .25},${h * .72}H${w * .1}Q0,${h * .72} 0,${h * .62}V${h * .1}Q0,0 ${w * .1},0Z`],
  banner:['Bandeau', (w, h) => poly([[0, 0], [1, 0], [.94, .5], [1, 1], [0, 1], [.06, .5]], w, h)], frame:['Cadre', (w, h) => `M0,0H${w}V${h}H0Z` + `M${w * .08},${h * .1}V${h * .9}H${w * .92}V${h * .1}Z`, 'evenodd'], arc:['Arc épais', (w, h) => `M0,${h}A${w / 2},${h} 0 0 1 ${w},${h}H${w * .75}A${w * .25},${h * .5} 0 0 0 ${w * .25},${h}Z`.replace(/A([\d.]+),([\d.]+) 0 0 0 ([\d.]+),([\d.]+)Z/, (m, a, b, c, d) => `A${w * .25},${h * .5} 0 0 0 ${w * .25},${h}Z`)],
};
const LINES = {ln:['Ligne', 0, 0], arr:['Flèche', 0, 1], darr:['Double flèche', 1, 1], curve:['Courbe', 2, 0], elb:['Coude', 3, 1]};
const SHAPE_PRESETS = [ // éléments prêts à l'emploi (style Canva)
  {n:'Carte', k:'round', w:220, h:120, fill:'#ffffff', stroke:'#E3E0EE', sw:1, sh:1, text:'Titre de la carte\nVotre texte ici', fs:14, fc:'#1A1726', b:1, ha:'l', va:'m'},
  {n:'Chiffre clé', k:'round', w:200, h:110, fill:'#7B3FF2', fill2:'#3D63FF', gdeg:135, sw:0, sh:1, text:'1 250 €\nChiffre d\'affaires', fs:22, fc:'#ffffff', b:1, ha:'c', va:'m'},
  {n:'Badge Nouveau', k:'pill', w:110, h:34, fill:'#F2387A', sw:0, text:'NOUVEAU', fs:12, fc:'#ffffff', b:1, ha:'c', va:'m'},
  {n:'Promo', k:'burst', w:130, h:130, fill:'#F5B82E', sw:0, text:'-20 %', fs:26, fc:'#1A1726', b:1, ha:'c', va:'m', rot:-10},
  {n:'Étoile', k:'star5', w:110, h:110, fill:'#F5B82E', stroke:'#B8860B', sw:2},
  {n:'Bandeau titre', k:'banner', w:360, h:64, fill:'#1A1726', sw:0, text:'Titre de section', fs:22, fc:'#ffffff', b:1, ha:'c', va:'m', ff:'Poppins'},
  {n:'Note adhésive', k:'rect', w:170, h:150, fill:'#FFF1A8', sw:0, sh:1, text:'Idée à noter…', fs:15, fc:'#5E4B00', ha:'l', va:'t', ff:'Caveat', rot:-3},
  {n:'Étape', k:'home', w:180, h:60, fill:'#12B5E5', sw:0, text:'Étape 1', fs:15, fc:'#ffffff', b:1, ha:'c', va:'m'},
  {n:'Citation', k:'bubble', w:240, h:130, fill:'#E9D5FF', sw:0, text:'« Une belle citation »', fs:16, fc:'#3E2FC7', i:1, ha:'c', va:'m', ff:'Playfair Display'},
  {n:'Alerte', k:'round', w:260, h:56, fill:'#FFE4E4', stroke:'#D92D20', sw:2, text:'⚠ Attention : à vérifier', fs:14, fc:'#9C0006', b:1, ha:'l', va:'m'},
  {n:'Validé', k:'round', w:200, h:50, fill:'#C6EFCE', stroke:'#13925C', sw:2, text:'✔ Validé', fs:15, fc:'#006100', b:1, ha:'c', va:'m'},
  {n:'Cercle numéroté', k:'ellipse', w:70, h:70, fill:'#2FBF71', sw:0, text:'1', fs:28, fc:'#ffffff', b:1, ha:'c', va:'m'}];
const TEXT_PRESETS = [{n:'Titre', fs:34, b:1, ff:'Poppins', text:'Votre titre'}, {n:'Sous-titre', fs:20, b:1, fc:'#5B5670', text:'Sous-titre'}, {n:'Texte', fs:14, text:'Zone de texte'}, {n:'Légende', fs:11, fc:'#7B7690', i:1, text:'Légende'},
  {n:'Manuscrit', fs:28, ff:'Caveat', fc:'#B3175F', text:'Écrit à la main'}, {n:'Élégant', fs:30, ff:'Playfair Display', i:1, text:'Élégance'}, {n:'Code', fs:13, ff:'JetBrains Mono', fc:'#B3175F', fill:'#F1EFF8', text:'=SOMME(A1:A9)'}, {n:'Néon', fs:30, b:1, fc:'#00E5FF', fill:'#0C0A16', ff:'Space Grotesk', text:'NÉON', glow:1}];
const EMOJIS = {Symboles:'⭐ ❤️ ✅ ❌ ⚠️ ❓ ❗ 💡 🔥 ⚡ 🎯 🏆 🚀 💎 🔒 🔔 📌 📎 ✏️ 🔍 📈 📉 📊 💰 💶 🧾 🛒 📦 🚚 🏠 🏗️ 🔧 ⚙️ 📅 ⏰ 📧 📞 👍 👎 👏 💬 🌍 ☀️ 🌧️ 🍀 🎉 🎁 🏁 🔴 🟠 🟡 🟢 🔵 🟣 ⬛ ⬜'.split(' '), Visages:'😀 😍 🤔 😎 😅 😭 😡 🤝 🙏 💪 👀 🧠'.split(' '), Flèches:'➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ 🔄 ↩️ ▶️ ⏸️ ⏹️ ➕ ➖ ✖️ ➗ ♻️'.split(' ')};
const okC = (c, d) => okCol(c) ? c : d;
const shpAsset = s => { const a = WB.assets?.[s.asset]; return typeof a === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(a) ? a : ''; };
function wrapLines(text, maxW, s){ const out = []; for (const para of String(text ?? '').split('\n')){ const words = para.split(/(\s+)/); let cur = ''; for (const w of words){ const t = cur + w; if (cur && measureText(t.trimEnd(), s) > maxW){ out.push(cur.trimEnd()); cur = w.trimStart(); } else cur = t; } out.push(cur.trimEnd()); } return out; }
/* SVG complet d'une forme (affichage, impression, export image) : w × h en pixels */
function shapeSVG(s, edit){
  const w = Math.max(2, s.w), h = Math.max(2, s.h), id = 'sp' + String(s.id).replace(/\W/g, ''), fill = s.fill === 'none' ? 'none' : okC(s.fill, s.k === 'text' || s.k === 'emoji' || s.k === 'img' ? 'none' : '#7B3FF2'), stroke = okC(s.stroke, ''), sw = s.sw ?? (s.k === 'text' || s.k === 'emoji' || s.k === 'img' ? 0 : 0);
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="overflow:visible"><defs>`;
  if (s.fill2 && okCol(s.fill2) && fill !== 'none'){ const a = (+s.gdeg || 0) * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a); o += `<linearGradient id="${id}g" x1="${.5 - dx / 2}" y1="${.5 - dy / 2}" x2="${.5 + dx / 2}" y2="${.5 + dy / 2}"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="${s.fill2}"/></linearGradient>`; }
  if (s.sh) o += `<filter id="${id}s" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="${s.sh === 2 ? 6 : 0}" dy="${s.sh === 2 ? 6 : 4}" stdDeviation="${s.sh === 2 ? 0 : 6}" flood-color="${s.sh === 2 ? '#1A1726' : '#16131F'}" flood-opacity="${s.sh === 2 ? .85 : .28}"/></filter>`;
  if (s.glow) o += `<filter id="${id}n" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  if (s.k === 'img') o += `<clipPath id="${id}c"><path d="${rrect(w, h, s.r != null ? Math.min(w, h) * s.r : 0)}"/></clipPath>`;
  o += '</defs>';
  const fl = s.fill2 && okCol(s.fill2) && fill !== 'none' ? `url(#${id}g)` : fill, st = stroke && sw > 0 ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${s.dash === 'd' ? ' stroke-dasharray="9 6"' : s.dash === 'o' ? ` stroke-dasharray="1 ${Math.max(4, sw * 2)}"` : ''}` : '';
  o += `<g opacity="${clamp(s.op ?? 1, 0, 1)}"${s.sh ? ` filter="url(#${id}s)"` : ''}${s.flip ? ` transform="translate(${w} 0) scale(-1 1)"` : ''}>`;
  const L = LINES[s.k];
  if (L){ const y = h / 2, c = okC(s.stroke, '#1A1726'), t = Math.max(1, s.sw ?? 3), dd = L[1] === 3 ? `M0,${y}H${w / 2}V${y}H${w - 8}` : L[1] === 2 ? '' : `M0,${y}H${w}`;
    const path = L[1] === 2 ? `M0,${h}C${w * .4},${h} ${w * .6},0 ${w},0` : L[1] === 3 ? `M0,${h}H${w / 2}V0H${w}` : `M0,${y}H${w}`;
    o += `<path d="${path}" fill="none" stroke="${c}" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round"${s.dash === 'd' ? ' stroke-dasharray="10 7"' : s.dash === 'o' ? ` stroke-dasharray="1 ${t * 2 + 2}"` : ''}/>`;
    const tip = (x, y2, dir) => `<path d="M${x - dir * t * 4},${y2 - t * 2.6}L${x},${y2}L${x - dir * t * 4},${y2 + t * 2.6}" fill="none" stroke="${c}" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const endY = L[1] === 2 || L[1] === 3 ? 0 : y; if (L[2]) o += tip(w, endY, 1); if (s.k === 'darr') o += tip(0, y, -1);
  } else if (s.k === 'img'){ const src = shpAsset(s); const flt = {gray:'grayscale(1)', sepia:'sepia(.9)', blur:'blur(3px)', bright:'brightness(1.25)', dark:'brightness(.7)', contrast:'contrast(1.4)', sat:'saturate(1.8)', invert:'invert(1)'}[s.flt] || ''; o += src ? `<g clip-path="url(#${id}c)"><image href="${src}" width="${w}" height="${h}" preserveAspectRatio="${s.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'}"${flt ? ` style="filter:${flt}"` : ''}/></g>` : `<rect width="${w}" height="${h}" fill="#ECEAF2"/>`; if (stroke && sw) o += `<path d="${rrect(w, h, s.r != null ? Math.min(w, h) * s.r : 0)}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>`;
  } else if (s.k === 'emoji'){ o += `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central" font-size="${Math.min(w, h) * .82}">${escH(s.text || '⭐')}</text>`;
  } else if (s.k === 'text'){ if (fill !== 'none') o += `<path d="${rrect(w, h, Math.min(w, h) * (s.r ?? 0))}" fill="${fl}"${st}/>`; else if (stroke && sw) o += `<path d="${rrect(w, h, 0)}" fill="none"${st}/>`;
  } else { const def = SHAPES[s.k] || SHAPES.rect; o += `<path d="${def[1](w, h, s)}" fill="${fl}"${def[2] ? ' fill-rule="evenodd"' : ''}${st}/>`; }
  o += '</g>';
  if (s.text && s.k !== 'emoji' && !edit){ o += shapeTextSVG(s, w, h, id); }
  return o + '</svg>';
}
function shapeTextSVG(s, w, h, id){
  const fs = s.fs || 14, st = {fs:fs * 3 / 4, b:s.b, i:s.i, ff:okFont(s.ff)}, pad = s.k === 'text' ? 6 : Math.max(6, Math.min(w, h) * .08), inset = ['tri', 'rtri', 'diamond', 'hex', 'oct', 'pent', 'heart', 'cloud', 'drop', 'star4', 'star5', 'star6', 'moon', 'ellipse', 'ring', 'burst', 'bolt', 'cross', 'check'].includes(s.k) ? .16 : 0, maxW = Math.max(10, w * (1 - 2 * inset) - 2 * pad);
  const lines = wrapLines(s.text, maxW, st), lh = fs * 1.25, tot = lines.length * lh, ha = s.ha || 'c', va = s.va || 'm';
  let y0 = va === 't' ? pad + fs * .95 : va === 'b' ? h - pad - tot + fs * .95 : (h - tot) / 2 + fs * .95; const x = ha === 'l' ? w * inset + pad : ha === 'r' ? w * (1 - inset) - pad : w / 2;
  const ff = fontStack(okFont(s.ff) || themeColors().fb).replace(/"/g, "'");
  return `<g font-family="${escH(ff)}" font-size="${fs}" fill="${okC(s.fc, '#1A1726')}" text-anchor="${ha === 'l' ? 'start' : ha === 'r' ? 'end' : 'middle'}"${s.b ? ' font-weight="700"' : ''}${s.i ? ' font-style="italic"' : ''}${s.u ? ' text-decoration="underline"' : ''}${s.glow ? ` filter="url(#${id}n)"` : ''}${s.tls ? ` letter-spacing="${+s.tls || 0}"` : ''}>${lines.map((l, i) => `<text x="${x}" y="${(y0 + i * lh).toFixed(1)}">${escH(s.tt === 'u' ? l.toUpperCase() : l) || ' '}</text>`).join('')}</g>`;
}
const okFont = f => FONTS.some(x => x[0] === f) ? f : '';
function shapeById(id){ return sh0().shapes.find(s => s.id === id); }
function shpPos(s){ const z = V.z, fw = V.cx[V.fc], fh = V.ry[V.fr], X = s.x * z, Y = s.y * z; return {x:X >= fw ? X - V.sx : X, y:Y >= fh ? Y - V.sy : Y}; }
function renderShapes(){
  const sh = sh0(), layer = g$('gObjs'), z = V.z, keep = new Set();
  for (const s of sh.shapes){
    keep.add(s.id); let el = layer.querySelector(`[data-shp="${s.id}"]`);
    if (!el){ el = document.createElement('div'); el.className = 'g-shp'; el.dataset.shp = s.id; el.innerHTML = '<div class="gs-in"></div>'; layer.appendChild(el); }
    const p = shpPos(s); el.style.cssText = `left:${p.x}px;top:${p.y}px;width:${s.w * z}px;height:${s.h * z}px;transform:rotate(${s.rot || 0}deg);z-index:${1 + sh.shapes.indexOf(s)}`;
    el.classList.toggle('on', SHP.sel === s.id); el.classList.toggle('lk', !!s.lock);
    const sig = z + '|' + WB.theme.fb + '|' + JSON.stringify(s) + '|' + (SHP.edit === s.id ? 'e' : ''); if (el.dataset.sig !== sig){ el.dataset.sig = sig; el.querySelector('.gs-in').innerHTML = shapeSVG(s, SHP.edit === s.id); const sv = el.querySelector('svg'); if (sv){ sv.style.width = '100%'; sv.style.height = '100%'; } }
    el.querySelectorAll('.gs-h').forEach(x => x.remove());
    if (SHP.sel === s.id && !s.lock && !V.ro){ for (const [d, cls] of [['nw', 'nw'], ['n', 'n'], ['ne', 'ne'], ['e', 'e'], ['se', 'se'], ['s', 's'], ['sw', 'sw'], ['w', 'w']]){ if (LINES[s.k] && !['e', 'w'].includes(d)) continue; el.insertAdjacentHTML('beforeend', `<i class="gs-h ${cls}" data-h="${d}"></i>`); } el.insertAdjacentHTML('beforeend', '<i class="gs-h rot" data-h="rot" title="Pivoter"></i>'); }
  }
  layer.querySelectorAll('.g-shp').forEach(el => { if (!keep.has(el.dataset.shp)) el.remove(); });
  placeShpBar();
}
function placeShpBar(){
  let bar = g$('shpBar'); if (!bar){ bar = document.createElement('div'); bar.className = 'ctx-bar'; bar.id = 'shpBar'; bar.hidden = true; g$('app').appendChild(bar); bar.addEventListener('click', onShpBar); bar.addEventListener('input', onShpBarInput); }
  const s = SHP.sel && shapeById(SHP.sel); if (!s || EDIT.on || SHP.drag?.moved){ bar.hidden = true; return; }
  const el = g$('gObjs').querySelector(`[data-shp="${s.id}"]`); if (!el){ bar.hidden = true; return; }
  const r = el.getBoundingClientRect(), L = !!LINES[s.k];
  const sig = s.id + s.fill + s.stroke + s.k; if (bar.dataset.sig !== sig){ bar.dataset.sig = sig; bar.innerHTML = `${L ? '' : `<label class="tb tcolr" title="Remplissage"><input type="color" data-sc="fill" value="${okC(s.fill, '#7B3FF2')}"><span>Remplir</span></label>`}<label class="tb tcolr" title="Couleur du trait"><input type="color" data-sc="stroke" value="${okC(s.stroke, '#1A1726')}"><span>Trait</span></label><span class="fsep"></span>
    <button type="button" class="tb tb-txt" data-so="text">Texte</button><button type="button" class="tb tb-txt" data-so="front" title="Premier plan">↑ Devant</button><button type="button" class="tb tb-txt" data-so="back" title="Arrière-plan">↓ Derrière</button><button type="button" class="tb tb-txt" data-so="dup">Dupliquer</button><button type="button" class="tb tb-txt" data-so="png" title="Télécharger en image">PNG</button><button type="button" class="tb tb-txt" data-so="panel">Plus…</button><button type="button" class="tb" data-so="del" title="Supprimer">${IC.trash}</button>`; }
  bar.hidden = false; bar.style.left = clamp(r.left, 8, innerWidth - bar.offsetWidth - 8) + 'px'; bar.style.top = Math.max(8, r.top - bar.offsetHeight - 40) + 'px';
}
function onShpBar(e){ const b = e.target.closest('[data-so]'); const s = SHP.sel && shapeById(SHP.sel); if (!b || !s) return; const k = b.dataset.so;
  if (k === 'text') shapeEditText(s.id); else if (k === 'front') shapeZ(s.id, 'front'); else if (k === 'back') shapeZ(s.id, 'back'); else if (k === 'dup') dupShape(s.id); else if (k === 'del') delShape(s.id); else if (k === 'png') shapePNG(s); else if (k === 'panel'){ SHP.tab = 'shapes'; if (panel !== 'shapes') openPanel('shapes'); else renderPanel(); } }
function onShpBarInput(e){ const t = e.target, s = SHP.sel && shapeById(SHP.sel); if (!s || !t.dataset.sc) return; s[t.dataset.sc] = t.value; if (t.dataset.sc === 'stroke' && !s.sw) s.sw = 2; renderShapes(); clearTimeout(SHP.t); SHP.t = setTimeout(() => { const v = {...s}; tx('Couleur de la forme', () => {}); schedule(); }, 400); }
function selShape(id){ if (SHP.sel === id) return; SHP.sel = id; if (id) OBJ.sel = null; renderObjects(); if (panel === 'shapes') renderPanel(); }
function viewCenterXY(){ const vr = visRange(), p = contentXY(vr.r1, vr.c1); return {x:p.x + 80 + (SHP.n = ((SHP.n || 0) + 1) % 6) * 22, y:p.y + 60 + SHP.n * 22}; }
function addShape(o){
  if (V.ro) return; const sh = sh0(), p = viewCenterXY(), s = {id:uidS(), k:'rect', x:p.x, y:p.y, w:160, h:100, rot:0, fill:'#7B3FF2', sw:0, ...o};
  tx('Ajouter une forme', () => { sh.shapes.push(s); }); SHP.sel = s.id; OBJ.sel = null; layout(); renderObjects(); schedule(); if (panel === 'shapes') renderPanel(); return s;
}
function newShape(k){ const L = LINES[k]; if (L) return addShape({k, w:200, h:LINES[k][1] >= 2 ? 80 : 24, stroke:'#1A1726', sw:3, fill:'none'}); const sq = ['ellipse', 'star4', 'star5', 'star6', 'burst', 'heart', 'cloud', 'moon', 'drop', 'pent', 'hex', 'oct', 'cross', 'ring', 'check', 'bolt', 'diamond'].includes(k); return addShape({k, w:sq ? 120 : 160, h:sq ? 120 : 100}); }
function delShape(id){ if (V.ro) return; tx('Supprimer la forme', () => { sh0().shapes = sh0().shapes.filter(s => s.id !== id); }); SHP.sel = null; renderObjects(); if (panel === 'shapes') renderPanel(); }
function dupShape(id){ const s = shapeById(id); if (!s) return; const c = {...JSON.parse(JSON.stringify(s)), id:uidS(), x:s.x + 20, y:s.y + 20}; tx('Dupliquer la forme', () => { sh0().shapes.push(c); }); SHP.sel = c.id; renderObjects(); if (panel === 'shapes') renderPanel(); }
function shapeZ(id, how){ const a = sh0().shapes, i = a.findIndex(s => s.id === id); if (i < 0) return; const [s] = a.splice(i, 1); const j = how === 'front' ? a.length : how === 'back' ? 0 : how === 'up' ? Math.min(a.length, i + 1) : Math.max(0, i - 1); tx('Ordre des formes', () => { a.splice(j, 0, s); }); renderObjects(); }
function updShape(id, patch, label = 'Modifier la forme'){ const s = shapeById(id); if (!s) return; tx(label, () => { for (const [k, v] of Object.entries(patch)){ if (v === undefined || v === null || v === '') delete s[k]; else s[k] = v; } }); renderObjects(); }
function shapeEditText(id){
  const s = shapeById(id); if (!s || V.ro || s.k === 'img' || LINES[s.k]) return; selShape(id); SHP.edit = id; renderObjects();
  const el = g$('gObjs').querySelector(`[data-shp="${id}"]`); if (!el) return; const ta = document.createElement('textarea'); ta.className = 'gs-ta'; ta.value = s.text || ''; ta.spellcheck = false;
  const fs = (s.fs || 14) * V.z; ta.style.cssText = `font:${s.i ? 'italic ' : ''}${s.b ? '700 ' : ''}${fs}px ${fontStack(okFont(s.ff) || themeColors().fb)};color:${okC(s.fc, '#1A1726')};text-align:${s.ha === 'l' ? 'left' : s.ha === 'r' ? 'right' : 'center'};padding-top:${s.va === 't' ? 6 : s.va === 'b' ? Math.max(6, el.clientHeight - fs * 1.4) : Math.max(6, (el.clientHeight - fs * 1.3) / 2)}px`;
  el.appendChild(ta); ta.focus(); ta.select();
  const done = ok => { if (!ta.isConnected) return; const v = ta.value; ta.remove(); SHP.edit = null; if (ok && v !== (s.text || '')) updShape(id, {text:v}, 'Texte de la forme'); else renderObjects(); g$('grid').focus({preventScroll:true}); };
  ta.onblur = () => done(true); ta.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape'){ e.preventDefault(); done(false); } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); done(true); } };
  ta.onmousedown = e => e.stopPropagation();
}
function onShapeDown(e){
  const el = e.target.closest('.g-shp'); if (!el) return false; if (e.target.closest('.gs-ta')) return true;
  e.preventDefault(); e.stopPropagation(); if (EDIT.on) commitEdit(0, 0); const s = shapeById(el.dataset.shp); if (!s) return true;
  selShape(s.id); g$('grid').focus({preventScroll:true}); if (V.ro || s.lock) return true;
  const r = el.getBoundingClientRect(), h = e.target.dataset.h;
  SHP.drag = {shift:e.shiftKey, mode:h ? (h === 'rot' ? 'rot' : 'rs') : 'mv', h, x:e.clientX, y:e.clientY, o:{...s}, s, moved:false, cx:r.left + r.width / 2, cy:r.top + r.height / 2};
  return true;
}
function onShapeMove(e){
  const d = SHP.drag; if (!d) return false; const dx = (e.clientX - d.x) / V.z, dy = (e.clientY - d.y) / V.z; if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true; if (!d.moved) return true;
  const s = d.s, o = d.o;
  if (d.mode === 'mv'){ s.x = Math.max(0, Math.round(o.x + dx)); s.y = Math.max(0, Math.round(o.y + dy)); if (!e.altKey){ s.x = Math.round(s.x / 4) * 4; s.y = Math.round(s.y / 4) * 4; } }
  else if (d.mode === 'rot'){ let a = Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180 / Math.PI + 90; if (e.shiftKey) a = Math.round(a / 15) * 15; s.rot = Math.round(((a % 360) + 360) % 360 * 10) / 10; }
  else { const th = (o.rot || 0) * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th), ldx = dx * c + dy * sn, ldy = -dx * sn + dy * c, h = d.h, hx = h.includes('e') ? 1 : h.includes('w') ? -1 : 0, hy = h.includes('s') ? 1 : h.includes('n') ? -1 : 0;
    let nw = Math.max(8, o.w + hx * ldx), nh = Math.max(8, o.h + hy * ldy); if (e.shiftKey && hx && hy){ const f = Math.max(nw / o.w, nh / o.h); nw = o.w * f; nh = o.h * f; }
    const ddx = hx * (nw - o.w) / 2, ddy = hy * (nh - o.h) / 2, ocx = o.x + o.w / 2, ocy = o.y + o.h / 2, ncx = ocx + ddx * c - ddy * sn, ncy = ocy + ddx * sn + ddy * c;
    s.w = Math.round(nw); s.h = Math.round(nh); s.x = Math.round(ncx - s.w / 2); s.y = Math.round(ncy - s.h / 2); }
  renderShapes(); return true;
}
function onShapeUp(){
  const d = SHP.drag; if (!d) return false; SHP.drag = null;
  if (d.moved){ const after = {x:d.s.x, y:d.s.y, w:d.s.w, h:d.s.h, rot:d.s.rot}; Object.assign(d.s, {x:d.o.x, y:d.o.y, w:d.o.w, h:d.o.h, rot:d.o.rot}); tx(d.mode === 'mv' ? 'Déplacer la forme' : d.mode === 'rot' ? 'Pivoter la forme' : 'Redimensionner la forme', () => Object.assign(d.s, after)); layout(); schedule(); if (panel === 'shapes') renderPanel(); }
  else { renderShapes(); if (d.s.macro && d.mode === 'mv' && !d.shift) runShapeMacro(d.s); } return true;
}
function onShapeKey(e){
  const s = SHP.sel && shapeById(SHP.sel); if (!s || EDIT.on || SHP.edit) return false; const k = e.key, mod = e.ctrlKey || e.metaKey;
  if (document.activeElement !== g$('grid') && document.activeElement !== document.body) return false;
  if (k === 'Delete' || k === 'Backspace'){ e.preventDefault(); delShape(s.id); return true; }
  if (k === 'Escape'){ selShape(null); return true; }
  if (mod && k.toLowerCase() === 'd'){ e.preventDefault(); dupShape(s.id); return true; }
  if (k === 'Enter' || k === 'F2'){ e.preventDefault(); shapeEditText(s.id); return true; }
  if (k.startsWith('Arrow') && !s.lock){ e.preventDefault(); const n = e.shiftKey ? 10 : 1; updShape(s.id, {x:Math.max(0, s.x + (k === 'ArrowRight' ? n : k === 'ArrowLeft' ? -n : 0)), y:Math.max(0, s.y + (k === 'ArrowDown' ? n : k === 'ArrowUp' ? -n : 0))}, 'Déplacer la forme'); return true; }
  return false;
}
function shapeMenu(e, id){
  const s = shapeById(id); if (!s) return; selShape(id); const ro = V.ro ? ' disabled' : '';
  openPop({x:e.clientX, y:e.clientY, getBoundingClientRect:() => ({left:e.clientX, right:e.clientX, top:e.clientY, bottom:e.clientY})},
    `<div class="pop-list ctx"><button type="button" data-sm="text"${ro}>Modifier le texte</button><button type="button" data-sm="dup"${ro}>Dupliquer</button><button type="button" data-sm="macro"${ro}>Affecter une macro…</button><hr><button type="button" data-sm="front"${ro}>Premier plan</button><button type="button" data-sm="up"${ro}>Avancer</button><button type="button" data-sm="down"${ro}>Reculer</button><button type="button" data-sm="back"${ro}>Arrière-plan</button><hr><button type="button" data-sm="flip"${ro}>Retourner horizontalement</button><button type="button" data-sm="lock"${ro}>${s.lock ? 'Déverrouiller' : 'Verrouiller'}</button><button type="button" data-sm="png">Télécharger en image (PNG)</button><button type="button" data-sm="panel">Propriétés…</button><hr><button type="button" data-sm="del" class="danger"${ro}>Supprimer</button></div>`, pp => {
      pp.onclick = ev => { const b = ev.target.closest('button'); if (!b || b.disabled) return; closePop(); const k = b.dataset.sm;
        if (k === 'text') shapeEditText(id); else if (k === 'dup') dupShape(id); else if (k === 'macro') linkMacroDlg(id); else if (['front', 'up', 'down', 'back'].includes(k)) shapeZ(id, k); else if (k === 'flip') updShape(id, {flip:s.flip ? undefined : 1}); else if (k === 'lock') updShape(id, {lock:s.lock ? undefined : 1}); else if (k === 'png') shapePNG(s); else if (k === 'panel'){ SHP.tab = 'shapes'; if (panel !== 'shapes') openPanel('shapes'); else renderPanel(); } else if (k === 'del') delShape(id); }; }, 'menu');
}
/* export PNG d'une forme ou d'un graphique */
async function svgToPNG(svg, w, h, name){
  const img = new Image(); const url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml;charset=utf-8'}));
  await new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; img.src = url; }).catch(() => {});
  const sc = 2, cv = document.createElement('canvas'); cv.width = Math.ceil(w * sc); cv.height = Math.ceil(h * sc); const cx = cv.getContext('2d'); cx.scale(sc, sc); cx.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
  cv.toBlob(b => { if (b) SWDownload(name + '.png', b); }, 'image/png');
}
function shapePNG(s){ const pad = s.sh ? 20 : 4; let svg = shapeSVG(s).replace('viewBox="0 0 ' + Math.max(2, s.w) + ' ' + Math.max(2, s.h) + '"', `viewBox="${-pad} ${-pad} ${s.w + 2 * pad} ${s.h + 2 * pad}"`).replace(/width="[\d.]+" height="[\d.]+"/, `width="${s.w + 2 * pad}" height="${s.h + 2 * pad}"`); svgToPNG(svg, s.w + 2 * pad, s.h + 2 * pad, 'forme'); }
async function svgDataURL(svg, w, h, rot = 0){
  const th = rot * Math.PI / 180, W = Math.ceil(Math.abs(w * Math.cos(th)) + Math.abs(h * Math.sin(th))), H = Math.ceil(Math.abs(w * Math.sin(th)) + Math.abs(h * Math.cos(th)));
  const img = new Image(), url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml;charset=utf-8'})); await new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; img.src = url; });
  const sc = 2, cv = document.createElement('canvas'); cv.width = W * sc; cv.height = H * sc; const cx = cv.getContext('2d'); cx.scale(sc, sc); cx.translate(W / 2, H / 2); cx.rotate(th); cx.drawImage(img, -w / 2, -h / 2, w, h); URL.revokeObjectURL(url);
  return {data:cv.toDataURL('image/png'), W, H};
}
function pxAnchor(sh, x, y){ let c = 0, acc = 0; while (c < 3000 && acc + sh.colW(c) <= x){ acc += sh.colW(c); c++; } let r = 0, ay = 0; while (r < 100000 && ay + sh.rowH(r) <= y){ ay += sh.rowH(r); r++; } return {col:c + (sh.colW(c) ? (x - acc) / sh.colW(c) : 0), row:r + (sh.rowH(r) ? (y - ay) / sh.rowH(r) : 0)}; }
async function xlsxObjects(wb, ws, sh){
  const items = [...sh.charts.map(c => ({x:c.x, y:c.y, w:c.w, h:c.h, rot:0, svg:chartSVG(c, c.w, c.h)})), ...sh.shapes.map(s => ({x:s.x, y:s.y, w:s.w, h:s.h, rot:s.rot || 0, svg:shapeSVG(s), shape:1}))];
  for (const it of items){ const o = await svgDataURL(it.svg, it.w, it.h, it.rot); const cx = it.x + it.w / 2, cy = it.y + it.h / 2, a = pxAnchor(sh, Math.max(0, cx - o.W / 2), Math.max(0, cy - o.H / 2)); const id = wb.addImage({base64:o.data, extension:'png'}); ws.addImage(id, {tl:{col:a.col, row:a.row}, ext:{width:o.W, height:o.H}}); }
}
function chartPNG(ch){ svgToPNG(chartSVG(ch, ch.w, ch.h), ch.w, ch.h, (ch.title || 'graphique').replace(/[^\w\- ]+/g, '').trim() || 'graphique'); }
/* images */
function pickImage(){ let f = g$('shpFile'); if (!f){ f = document.createElement('input'); f.type = 'file'; f.id = 'shpFile'; f.accept = 'image/png,image/jpeg,image/webp,image/gif'; f.hidden = true; document.body.appendChild(f); f.onchange = () => { const file = f.files[0]; f.value = ''; if (file) importImage(file); }; } f.click(); }
function importImage(file){
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return toast('Format non pris en charge (PNG, JPEG, WebP ou GIF)');
  const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => {
    const mx = 1000, k = Math.min(1, mx / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k)), cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(im, 0, 0, w, h);
    const png = file.type === 'image/png' || file.type === 'image/gif'; let url = cv.toDataURL(png ? 'image/png' : 'image/jpeg', .82); if (png && url.length > 450000) url = cv.toDataURL('image/jpeg', .8);
    if (url.length > 700000) return toast('Image trop lourde : choisissez une image plus petite');
    const aid = 'a' + uidS(); WB.assets = WB.assets || {}; WB.assets[aid] = url; const dw = Math.min(320, w), dh = Math.round(dw * h / w); addShape({k:'img', asset:aid, w:dw, h:dh, fill:'none', sw:0}); toast('Image ajoutée'); }; im.onerror = () => toast('Image illisible'); im.src = fr.result; };
  fr.readAsDataURL(file);
}
/* tiroir « Formes » */
function shapesPanelHTML(){
  const s = SHP.sel && shapeById(SHP.sel), tabs = [['shapes', 'Formes'], ['lines', 'Lignes'], ['text', 'Texte'], ['elems', 'Éléments'], ['img', 'Images']];
  const lib = (() => { const t = SHP.tab;
    if (t === 'shapes') return `<div class="shp-grid">${Object.entries(SHAPES).map(([k, [n, f, eo]]) => `<button type="button" data-nsh="${k}" title="${n}"><svg viewBox="0 0 40 40"><path d="${f(34, 34, {})}" transform="translate(3 3)" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.6"${eo ? ' fill-rule="evenodd"' : ''}/></svg></button>`).join('')}</div>`;
    if (t === 'lines') return `<div class="shp-lines">${Object.entries(LINES).map(([k, [n]]) => `<button type="button" data-nsh="${k}"><svg viewBox="0 0 80 24"><path d="${k === 'curve' ? 'M4,20C30,20 50,4 74,4' : k === 'elb' ? 'M4,20H40V4H74' : 'M4,12H74'}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>${k !== 'ln' && k !== 'curve' ? '<path d="M66,6l8,' + (k === 'elb' ? '-2' : '6') + 'l-8,6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" transform="translate(0 ' + (k === 'elb' ? '-4' : '0') + ')"/>' : ''}</svg>${n}</button>`).join('')}</div>`;
    if (t === 'text') return `<div class="shp-txt">${TEXT_PRESETS.map((p, i) => `<button type="button" data-ntx="${i}" style="font:${p.i ? 'italic ' : ''}${p.b ? '700 ' : ''}${Math.min(22, p.fs * .7)}px ${fontStack(p.ff || 'Inter')};color:${p.fc || '#1A1726'};${p.fill ? `background:${p.fill};` : ''}">${p.n}</button>`).join('')}</div>`;
    if (t === 'elems') return `<div class="shp-pre">${SHAPE_PRESETS.map((p, i) => `<button type="button" data-npre="${i}"><span class="shp-pv"><svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">${shapeSVG({...p, id:'pv' + i, w:100, h:60, text:'', sh:0}).replace(/<svg[^>]*>/, '').replace('</svg>', '')}</svg></span>${p.n}</button>`).join('')}</div>` + Object.entries(EMOJIS).map(([g, l]) => `<p class="pn-h">${g}</p><div class="shp-emo">${l.map(e => `<button type="button" data-nem="${e}">${e}</button>`).join('')}</div>`).join('');
    return `<button type="button" class="pn-wide" data-nimg="1">${IC.plus}Importer une image…</button><p class="pn-hint">PNG, JPEG, WebP ou GIF. L'image est réduite pour rester légère. Formats acceptés aussi par glisser-déposer sur la feuille.</p>`; })();
  let props = '';
  if (s){ const L = !!LINES[s.k], T = s.k !== 'img' && !L, cl = (k, d, n) => `<label class="shp-c">${n}<input type="color" data-sp="${k}" value="${okC(s[k], d)}"></label>`, rg = (k, n, a, b, st, d) => `<label class="shp-r">${n}<input type="range" data-spr="${k}" min="${a}" max="${b}" step="${st}" value="${s[k] ?? d}"><output>${s[k] ?? d}</output></label>`;
    props = `<div class="shp-props"><p class="pn-h">Propriétés <small>${escH((SHAPES[s.k]?.[0] || LINES[s.k]?.[0] || {text:'Texte', emoji:'Icône', img:'Image'}[s.k] || ''))}</small></p>
      ${L ? '' : `<div class="shp-row">${s.k === 'img' ? '' : cl('fill', '#7B3FF2', 'Remplissage')}${s.k === 'img' || !s.fill2 ? '' : cl('fill2', '#3D63FF', 'Dégradé')}${cl('stroke', '#1A1726', 'Trait')}</div>`}
      ${L ? cl('stroke', '#1A1726', 'Couleur') : ''}${s.k === 'img' || L ? '' : `<div class="shp-row"><button type="button" data-sf="grad">${s.fill2 ? 'Retirer le dégradé' : 'Dégradé'}</button><button type="button" data-sf="nofill">${s.fill === 'none' ? 'Remplir' : 'Sans remplissage'}</button></div>`}
      ${rg('sw', 'Épaisseur du trait', 0, 16, 1, L ? 3 : 0)}${s.fill2 ? rg('gdeg', 'Angle du dégradé', 0, 360, 15, 0) : ''}${rg('op', 'Opacité', 0, 1, .05, 1)}${rg('rot', 'Rotation', 0, 360, 1, 0)}${['round', 'text'].includes(s.k) ? rg('r', 'Arrondi', 0, .5, .02, s.k === 'round' ? .2 : 0) : ''}${s.k === 'img' ? rg('r', 'Arrondi (0,5 = cercle)', 0, .5, .02, 0) : ''}
      <div class="shp-row"><span>Trait</span><div class="seg" data-segf="dash">${[['', 'Plein'], ['d', 'Tirets'], ['o', 'Points']].map(([k, n]) => `<button type="button" data-sd="${k}" aria-checked="${(s.dash || '') === k}">${n}</button>`).join('')}</div></div>
      <div class="shp-row"><span>Ombre</span><div class="seg">${[[0, 'Aucune'], [1, 'Douce'], [2, 'Nette']].map(([k, n]) => `<button type="button" data-ssh="${k}" aria-checked="${(s.sh || 0) === k}">${n}</button>`).join('')}</div></div>
      ${s.k === 'img' ? `<div class="shp-row"><span>Filtre</span><select data-sflt>${[['', 'Aucun'], ['gray', 'Noir et blanc'], ['sepia', 'Sépia'], ['blur', 'Flou'], ['bright', 'Éclairci'], ['dark', 'Assombri'], ['contrast', 'Contraste'], ['sat', 'Saturé'], ['invert', 'Inversé']].map(([k, n]) => `<option value="${k}"${(s.flt || '') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div><div class="shp-row"><span>Cadrage</span><div class="seg">${[['', 'Remplir'], ['contain', 'Ajuster']].map(([k, n]) => `<button type="button" data-sfit="${k}" aria-checked="${(s.fit || '') === k}">${n}</button>`).join('')}</div></div>` : ''}
      ${T ? `<p class="pn-h">Texte</p><textarea class="shp-ta" data-stext rows="2" placeholder="Écrivez ici…">${escH(s.text || '')}</textarea>
        <div class="shp-row"><select data-sfont>${FONTS.map(([f]) => `<option${(s.ff || themeColors().fb) === f ? ' selected' : ''}>${escH(f)}</option>`).join('')}</select><input type="number" min="6" max="200" data-sfs value="${s.fs || 14}" title="Taille"></div>
        <div class="shp-row">${cl('fc', '#1A1726', 'Couleur')}<button type="button" data-stg="b" class="${s.b ? 'on' : ''}"><b>G</b></button><button type="button" data-stg="i" class="${s.i ? 'on' : ''}"><i>I</i></button><button type="button" data-stg="u" class="${s.u ? 'on' : ''}"><u>S</u></button><button type="button" data-stg="glow" class="${s.glow ? 'on' : ''}">Néon</button></div>
        <div class="shp-row"><div class="seg">${[['l', 'Gauche'], ['c', 'Centre'], ['r', 'Droite']].map(([k, n]) => `<button type="button" data-sha="${k}" aria-checked="${(s.ha || 'c') === k}">${n}</button>`).join('')}</div><div class="seg">${[['t', 'Haut'], ['m', 'Milieu'], ['b', 'Bas']].map(([k, n]) => `<button type="button" data-sva="${k}" aria-checked="${(s.va || 'm') === k}">${n}</button>`).join('')}</div></div>` : ''}
      <div class="shp-row"><button type="button" data-so2="front">Premier plan</button><button type="button" data-so2="up">Avancer</button><button type="button" data-so2="down">Reculer</button><button type="button" data-so2="back">Arrière</button></div>
      <div class="shp-row"><button type="button" data-so2="dup">Dupliquer</button><button type="button" data-so2="flip">Retourner</button><button type="button" data-so2="lock">${s.lock ? 'Déverrouiller' : 'Verrouiller'}</button><button type="button" data-so2="png">PNG</button><button type="button" data-so2="del" class="danger">Supprimer</button></div></div>`; }
  return `${props}<div class="seg shp-tabs">${tabs.map(([k, n]) => `<button type="button" data-stab="${k}" aria-checked="${SHP.tab === k}">${n}</button>`).join('')}</div>${lib}`;
}
function onShapesPanelClick(e){
  const t = e.target, q = a => t.closest(`[${a}]`); let b;
  if ((b = q('data-stab'))){ SHP.tab = b.dataset.stab; return renderPanel(), true; }
  if ((b = q('data-nsh'))){ newShape(b.dataset.nsh); return true; }
  if ((b = q('data-ntx'))){ const p = TEXT_PRESETS[+b.dataset.ntx]; const s = addShape({k:'text', w:Math.max(160, p.fs * 8), h:Math.round(p.fs * 2.2), fill:p.fill || 'none', sw:0, ...p, ha:'l', n:undefined}); if (s) setTimeout(() => shapeEditText(s.id), 50); return true; }
  if ((b = q('data-npre'))){ const p = {...SHAPE_PRESETS[+b.dataset.npre]}; delete p.n; addShape(p); return true; }
  if ((b = q('data-nem'))){ addShape({k:'emoji', text:b.dataset.nem, w:80, h:80, fill:'none', sw:0}); return true; }
  if (q('data-nimg')){ pickImage(); return true; }
  const s = SHP.sel && shapeById(SHP.sel); if (!s) return false;
  if ((b = q('data-so2'))){ const k = b.dataset.so2; if (k === 'dup') dupShape(s.id); else if (k === 'del') delShape(s.id); else if (k === 'flip') updShape(s.id, {flip:s.flip ? undefined : 1}); else if (k === 'lock') updShape(s.id, {lock:s.lock ? undefined : 1}); else if (k === 'png') shapePNG(s); else shapeZ(s.id, k); renderPanel(); return true; }
  if ((b = q('data-sf'))){ if (b.dataset.sf === 'grad') updShape(s.id, s.fill2 ? {fill2:null} : {fill2:'#3D63FF', gdeg:135}); else updShape(s.id, {fill:s.fill === 'none' ? '#7B3FF2' : 'none'}); renderPanel(); return true; }
  if ((b = q('data-sd'))){ updShape(s.id, {dash:b.dataset.sd}); renderPanel(); return true; }
  if ((b = q('data-ssh'))){ updShape(s.id, {sh:+b.dataset.ssh}); renderPanel(); return true; }
  if ((b = q('data-sfit'))){ updShape(s.id, {fit:b.dataset.sfit}); renderPanel(); return true; }
  if ((b = q('data-stg'))){ updShape(s.id, {[b.dataset.stg]:s[b.dataset.stg] ? null : 1}); renderPanel(); return true; }
  if ((b = q('data-sha'))){ updShape(s.id, {ha:b.dataset.sha}); renderPanel(); return true; }
  if ((b = q('data-sva'))){ updShape(s.id, {va:b.dataset.sva}); renderPanel(); return true; }
  return false;
}
function onShapesPanelInput(e){
  const t = e.target, s = SHP.sel && shapeById(SHP.sel); if (!s) return false; const d = t.dataset;
  if (d.sp){ updShape(s.id, {[d.sp]:t.value}, 'Couleur'); if (d.sp === 'stroke' && !s.sw) updShape(s.id, {sw:2}); return true; }
  if (d.spr){ t.nextElementSibling.textContent = t.value; updShape(s.id, {[d.spr]:+t.value}, 'Forme'); return true; }
  if (d.stext != null){ updShape(s.id, {text:t.value}, 'Texte de la forme'); return true; }
  if (d.sfont != null){ ensureFont(t.value); updShape(s.id, {ff:t.value}, 'Police'); return true; }
  if (d.sfs != null){ updShape(s.id, {fs:clamp(+t.value || 14, 6, 200)}, 'Taille'); return true; }
  if (d.sflt != null){ updShape(s.id, {flt:t.value}, 'Filtre'); return true; }
  return false;
}
