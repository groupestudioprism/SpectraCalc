/* ---------- Graphiques (SVG vivant, relié à une plage) ---------- */
const CHART_TYPES = [['col', 'Colonnes'], ['bar', 'Barres'], ['line', 'Courbes'], ['area', 'Aires'], ['pie', 'Secteurs'], ['donut', 'Anneau'], ['scatter', 'Nuage de points'], ['stack', 'Colonnes empilées']];
const OBJ = {sel:null, drag:null};
function chartPalette(){ const t = themeColors(); const base = [t.ac, t.ac2, t.ac3, '#2FBF71', '#F5B82E', '#FF7A2F', '#F2387A', '#3D63FF', '#12B5E5', '#7B3FF2']; return [...new Set(base.map(c => c.toLowerCase()))]; }
/* données d'une plage : catégories + séries */
function chartData(ch){
  const sh = ch.sheet ? WB.byName(ch.sheet) || sh0() : sh0();
  // plusieurs plages séparées par « ; » : leurs colonnes sont mises côte à côte (ex. A2:A8;F2:F8)
  const parts = String(ch.range).split(/[;,]/).map(x => parseRange(x.trim())).filter(Boolean); if (!parts.length) return null;
  const u = sh.used(); for (const g of parts){ g.r2 = Math.min(g.r2, Math.max(u.r, g.r1)); g.c2 = Math.min(g.c2, Math.max(u.c, g.c1)); }
  const h = Math.min(...parts.map(g => g.r2 - g.r1 + 1));
  const V2 = []; for (let i = 0; i < h; i++){ const row = []; for (const g of parts) for (let c = g.c1; c <= g.c2; c++) row.push({v:WB.val(sh, g.r1 + i, c), nf:sh.get(g.r1 + i, c)?.s?.nf}); V2.push(row); }
  if (!V2.length || !V2[0].length) return null;
  const isTxt = x => x.v != null && typeof x.v !== 'number';
  const hdrRow = V2[0].slice(1).some(isTxt) || (V2[0].length === 1 && isTxt(V2[0][0]));
  const firstColCat = V2.slice(hdrRow ? 1 : 0).some(r => isTxt(r[0])) || (V2[0].length > 1 && V2.slice(hdrRow ? 1 : 0).every(r => r[0].nf && compileFmt(r[0].nf).kind === 'date'));
  let rows = V2.slice(hdrRow ? 1 : 0); const hdr = hdrRow ? V2[0] : null;
  const byCols = ch.by ? ch.by === 'cols' : rows.length >= (V2[0].length - (firstColCat ? 1 : 0));
  let cats, series;
  if (byCols){
    cats = rows.map((r, i) => firstColCat ? formatValue(r[0].v, r[0].nf).t : String(i + 1));
    series = []; for (let j = firstColCat ? 1 : 0; j < V2[0].length; j++) series.push({name:hdr ? formatValue(hdr[j].v, hdr[j].nf).t : `Série ${series.length + 1}`, vals:rows.map(r => typeof r[j].v === 'number' ? r[j].v : null), nf:rows.find(r => r[j].nf)?.[j].nf});
  } else {
    cats = (hdr || V2[0]).slice(firstColCat ? 1 : 0).map((x, i) => hdr ? formatValue(x.v, x.nf).t : String(i + 1));
    series = rows.map((r, i) => ({name:firstColCat ? formatValue(r[0].v, r[0].nf).t : `Série ${i + 1}`, vals:r.slice(firstColCat ? 1 : 0).map(x => typeof x.v === 'number' ? x.v : null), nf:r.find(x => x.nf && typeof x.v === 'number')?.nf}));
  }
  series = series.filter(s => s.vals.some(v => v != null));
  return {cats, series};
}
function niceTicks(min, max, n = 5){
  if (min === max){ max = min + 1; min = Math.min(0, min); }
  const span = max - min, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), f = step0 / mag;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toPrecision(12));
  return out;
}
const fmtAxis = (v, nf) => { if (nf && /€|%/.test(nf)) return formatValue(v, nf.replace(/\.0+/, '')).t; const a = Math.abs(v); return a >= 1e6 ? fmtNum(v / 1e6, a >= 1e7 ? 0 : 1, false) + ' M' : a >= 1e4 ? fmtNum(v / 1e3, 0, false) + ' k' : fmtNum(v, a < 10 && v % 1 ? 1 : 0, true); };
function chartSVG(ch, W, H){
  const d = chartData(ch), pal = ch.colors?.length ? ch.colors : chartPalette(), t = themeColors();
  const font = `font-family="${escH(fontStack(t.fb).replace(/"/g, "'"))}"`;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${font} font-size="12">`;
  o += `<rect width="${W}" height="${H}" rx="10" fill="#fff"/>`;
  const title = ch.title ?? '';
  let top = 14; if (title){ o += `<text x="18" y="30" font-size="16" font-weight="700" fill="${t.ink}">${escH(title)}</text>`; top = 44; }
  if (!d || !d.series.length){ return o + `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#999">Aucune donnée numérique dans ${escH(ch.range)}</text></svg>`; }
  const S = d.series, legend = ch.legend !== false && (S.length > 1 || ch.type === 'pie' || ch.type === 'donut');
  const legH = legend ? 26 : 0;
  if (ch.type === 'pie' || ch.type === 'donut'){
    const s = ch.pick === 'last' ? S[S.length - 1] : S[+ch.pick || 0] || S[0], vals = s.vals.map(v => Math.max(0, v || 0)), tot = sum(vals) || 1;
    const cx = W / 2, cy = top + (H - top - legH) / 2, R = Math.max(10, Math.min(W / 2 - 20, (H - top - legH) / 2 - 10)), r0 = ch.type === 'donut' ? R * .58 : 0;
    let a = -Math.PI / 2;
    vals.forEach((v, i) => { const a2 = a + v / tot * Math.PI * 2, large = a2 - a > Math.PI ? 1 : 0, c = pal[i % pal.length];
      const p = (ang, rr) => `${(cx + Math.cos(ang) * rr).toFixed(2)},${(cy + Math.sin(ang) * rr).toFixed(2)}`;
      if (v / tot >= .9999) o += r0 ? `<circle cx="${cx}" cy="${cy}" r="${(R + r0) / 2}" fill="none" stroke="${c}" stroke-width="${R - r0}"/>` : `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${c}"/>`;
      else if (v > 0) o += `<path d="M${p(a, R)} A${R},${R} 0 ${large} 1 ${p(a2, R)} ${r0 ? `L${p(a2, r0)} A${r0},${r0} 0 ${large} 0 ${p(a, r0)}` : `L${cx},${cy}`} Z" fill="${c}" stroke="#fff" stroke-width="2"><title>${escH(d.cats[i])} : ${escH(formatValue(v, s.nf).t)} (${Math.round(v / tot * 100)} %)</title></path>`;
      const mid = (a + a2) / 2, pct = v / tot; if (pct > .05){ const lr = r0 ? (R + r0) / 2 : R * .64; o += `<text x="${cx + Math.cos(mid) * lr}" y="${cy + Math.sin(mid) * lr + 4}" text-anchor="middle" fill="#fff" font-weight="700" font-size="12">${Math.round(pct * 100)} %</text>`; }
      a = a2; });
    if (r0) o += `<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="16" font-weight="800" fill="${t.ink}">${escH(fmtAxis(tot, s.nf))}</text>`;
    if (legend) o += legendSVG(d.cats.slice(0, 12), pal, W, H - 14);
    return o + '</svg>';
  }
  const horiz = ch.type === 'bar', stacked = ch.type === 'stack';
  let all = []; if (stacked){ d.cats.forEach((_, i) => { let p = 0, n = 0; S.forEach(s => { const v = s.vals[i] || 0; if (v >= 0) p += v; else n += v; }); all.push(p, n); }); } else S.forEach(s => s.vals.forEach(v => v != null && all.push(v)));
  if (ch.type === 'scatter'){ /* x = première série */ }
  let mn = Math.min(0, ...all), mx = Math.max(0, ...all); if (ch.type === 'line' && all.length && Math.min(...all) > 0 && Math.min(...all) > (Math.max(...all) - Math.min(...all)) * 1.5) mn = Math.min(...all) * .9;
  const ticks = niceTicks(mn, mx, Math.max(3, Math.round((horiz ? W : H) / 70)));
  const lo = ticks[0], hi = ticks[ticks.length - 1], nf = S[0].nf;
  const labW = Math.max(...ticks.map(v => fmtAxis(v, nf).length)) * 6.6 + 12;
  const catW = horiz ? Math.min(140, Math.max(...d.cats.map(c => c.length)) * 6.6 + 12) : 0;
  const L = horiz ? catW + 10 : labW + 10, Rr = 16, T = top + 6, B = H - legH - (horiz ? 24 : 30);
  const pw = W - L - Rr, ph = B - T; if (pw < 20 || ph < 20) return o + '</svg>';
  const sc = v => horiz ? L + (v - lo) / (hi - lo) * pw : B - (v - lo) / (hi - lo) * ph;
  // grille et axe des valeurs
  for (const v of ticks){ const p = sc(v);
    o += horiz ? `<line x1="${p}" y1="${T}" x2="${p}" y2="${B}" stroke="${v === 0 ? '#9A94B2' : '#ECEAF2'}"/><text x="${p}" y="${B + 16}" text-anchor="middle" fill="#7B7690" font-size="11">${escH(fmtAxis(v, nf))}</text>`
      : `<line x1="${L}" y1="${p}" x2="${L + pw}" y2="${p}" stroke="${v === 0 ? '#9A94B2' : '#ECEAF2'}"/><text x="${L - 8}" y="${p + 4}" text-anchor="end" fill="#7B7690" font-size="11">${escH(fmtAxis(v, nf))}</text>`; }
  const n = d.cats.length, band = (horiz ? ph : pw) / Math.max(1, n);
  // étiquettes des catégories
  const every = Math.ceil(n / Math.max(1, Math.floor((horiz ? ph / 16 : pw / 60))));
  d.cats.forEach((c, i) => { if (i % every) return; const p = (horiz ? T : L) + band * (i + .5); const txt = c.length > 18 ? c.slice(0, 17) + '…' : c;
    o += horiz ? `<text x="${L - 8}" y="${p + 4}" text-anchor="end" fill="#4B465E" font-size="11">${escH(txt)}</text>` : `<text x="${p}" y="${B + 18}" text-anchor="middle" fill="#4B465E" font-size="11">${escH(txt)}</text>`; });
  const z = sc(Math.max(lo, Math.min(0, hi)));
  if (ch.type === 'col' || ch.type === 'bar' || stacked){
    const gw = band * .72, bw = stacked ? gw : gw / S.length;
    d.cats.forEach((cat, i) => { let pos = 0, neg = 0;
      S.forEach((s, j) => { const v = s.vals[i]; if (v == null) return; const c = pal[j % pal.length];
        let a, b2; if (stacked){ if (v >= 0){ a = sc(pos); b2 = sc(pos + v); pos += v; } else { a = sc(neg); b2 = sc(neg + v); neg += v; } } else { a = z; b2 = sc(v); }
        const off = (horiz ? T : L) + band * i + (band - gw) / 2 + (stacked ? 0 : bw * j);
        const tip = `<title>${escH(s.name)} · ${escH(cat)} : ${escH(formatValue(v, s.nf).t)}</title>`;
        o += horiz ? `<rect x="${Math.min(a, b2)}" y="${off}" width="${Math.max(1, Math.abs(b2 - a))}" height="${Math.max(1, bw - 2)}" rx="3" fill="${c}">${tip}</rect>` : `<rect x="${off}" y="${Math.min(a, b2)}" width="${Math.max(1, bw - 2)}" height="${Math.max(1, Math.abs(b2 - a))}" rx="3" fill="${c}">${tip}</rect>`;
        if (ch.labels && !stacked){ o += horiz ? `<text x="${b2 + 4}" y="${off + bw / 2 + 4}" font-size="10.5" fill="#4B465E">${escH(fmtAxis(v, s.nf))}</text>` : `<text x="${off + bw / 2}" y="${Math.min(a, b2) - 4}" text-anchor="middle" font-size="10.5" fill="#4B465E">${escH(fmtAxis(v, s.nf))}</text>`; }
      }); });
  } else if (ch.type === 'line' || ch.type === 'area'){
    S.forEach((s, j) => { const c = pal[j % pal.length]; const pts = s.vals.map((v, i) => v == null ? null : [L + band * (i + .5), sc(v)]);
      const segs = []; let cur = []; pts.forEach(p => { if (p) cur.push(p); else if (cur.length){ segs.push(cur); cur = []; } }); if (cur.length) segs.push(cur);
      for (const sg of segs){ const dd = sg.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
        if (ch.type === 'area') o += `<path d="${dd}L${sg[sg.length - 1][0].toFixed(1)},${z}L${sg[0][0].toFixed(1)},${z}Z" fill="${c}" fill-opacity=".18"/>`;
        o += `<path d="${dd}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`; }
      if (n <= 40) pts.forEach((p, i) => { if (p) o += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" stroke="${c}" stroke-width="2"><title>${escH(s.name)} · ${escH(d.cats[i])} : ${escH(formatValue(s.vals[i], s.nf).t)}</title></circle>`; });
      if (ch.labels) pts.forEach((p, i) => { if (p) o += `<text x="${p[0]}" y="${p[1] - 8}" text-anchor="middle" font-size="10.5" fill="#4B465E">${escH(fmtAxis(s.vals[i], s.nf))}</text>`; });
    });
  } else if (ch.type === 'scatter'){
    const xs = S[0].vals, ys = S.length > 1 ? S.slice(1) : [{...S[0], vals:S[0].vals.map((_, i) => i + 1)}];
    const xv = xs.filter(v => v != null), xt = niceTicks(Math.min(...xv), Math.max(...xv), 5), xl = xt[0], xh = xt[xt.length - 1];
    ys.forEach((s, j) => s.vals.forEach((v, i) => { if (v == null || xs[i] == null) return; const x = L + (xs[i] - xl) / (xh - xl) * pw; o += `<circle cx="${x}" cy="${sc(v)}" r="4.5" fill="${pal[j % pal.length]}" fill-opacity=".8"><title>${escH(fmtAxis(xs[i]))} ; ${escH(fmtAxis(v, s.nf))}</title></circle>`; }));
  }
  if (legend) o += legendSVG(S.map(s => s.name), pal, W, H - 12);
  return o + '</svg>';
}
function legendSVG(names, pal, W, y){
  let x = 18, o = ''; const items = names.map((n, i) => ({n:n.length > 22 ? n.slice(0, 21) + '…' : n, c:pal[i % pal.length]}));
  const total = items.reduce((s, it) => s + it.n.length * 6.6 + 30, 0); x = Math.max(18, (W - total) / 2);
  for (const it of items){ if (x > W - 40) break; o += `<rect x="${x}" y="${y - 9}" width="11" height="11" rx="3" fill="${it.c}"/><text x="${x + 16}" y="${y}" font-size="11.5" fill="#4B465E">${escH(it.n)}</text>`; x += it.n.length * 6.6 + 30; }
  return o;
}
/* ---------- objets posés sur la feuille ---------- */
function renderObjects(){
  const sh = sh0(), layer = g$('gObjs'), z = V.z;
  const fw = V.cx[V.fc], fh = V.ry[V.fr];
  const keep = new Set();
  for (const ch of sh.charts){
    keep.add(ch.id); let el = layer.querySelector(`[data-obj="${ch.id}"]`);
    if (!el){ el = document.createElement('div'); el.className = 'g-obj'; el.dataset.obj = ch.id; el.innerHTML = '<div class="go-in"></div><i class="go-rs" data-rs="1"></i>'; layer.appendChild(el); }
    const X = ch.x * z, Y = ch.y * z, x = X >= fw ? X - V.sx : X, y = Y >= fh ? Y - V.sy : Y, w = ch.w * z, h = ch.h * z;
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px';
    el.classList.toggle('on', OBJ.sel === ch.id);
    const sig = WB.cid + '|' + JSON.stringify(ch) + '|' + JSON.stringify(WB.theme);
    if (el.dataset.sig !== sig){ el.dataset.sig = sig; el.querySelector('.go-in').innerHTML = chartSVG(ch, ch.w, ch.h); }
  }
  layer.querySelectorAll('.g-obj').forEach(el => { if (!keep.has(el.dataset.obj)) el.remove(); });
  placeObjBar();
}
function addChart(type, rangeStr){
  if (V.ro) return; const sh = sh0();
  let g = rangeStr ? parseRange(rangeStr) : (SEL.r1 === SEL.r2 && SEL.c1 === SEL.c2 ? currentRegion(SEL.r, SEL.c) : {r1:SEL.r1, c1:SEL.c1, r2:Math.min(SEL.r2, sh.used().r), c2:Math.min(SEL.c2, sh.used().c)});
  if (!g || (g.r1 === g.r2 && g.c1 === g.c2)) return toast('Sélectionnez d\'abord les données à représenter');
  if (!rangeStr) g = trimTotal(sh, g);
  const pos = contentXY(g.r1, g.c2 + 2);
  const hdr = WB.val(sh, g.r1, g.c1 + 1) ?? WB.val(sh, g.r1, g.c1);
  const ch = {id:uidS(), type, range:rangeA1(g), title:typeof hdr === 'string' && g.c2 === g.c1 + 1 ? hdr : '', x:pos.x + 10, y:pos.y, w:480, h:300, legend:true};
  tx('Graphique', () => { sh.charts.push(ch); });
  OBJ.sel = ch.id; layout(); schedule();
  const scx = ch.x * V.z - V.cx[V.fc]; if (scx + 200 > V.sx + V.vw || scx < V.sx) g$('gScroll').scrollLeft = Math.max(0, scx - 80);
  toast('Graphique ajouté : glissez-le, double-cliquez pour le modifier');
  return ch;
}
function chartById(id){ return sh0().charts.find(c => c.id === id); }
function placeObjBar(){
  const bar = g$('objBar'); if (!bar) return;
  const ch = OBJ.sel && chartById(OBJ.sel); if (!ch || EDIT.on){ bar.hidden = true; return; }
  const el = g$('gObjs').querySelector(`[data-obj="${ch.id}"]`); if (!el){ bar.hidden = true; return; }
  const r = el.getBoundingClientRect(); bar.hidden = false;
  bar.innerHTML = CHART_TYPES.map(([k, n]) => `<button type="button" class="tb tb-txt${ch.type === k ? ' on' : ''}" data-ct="${k}" title="${n}">${chartIcon(k)}</button>`).join('') + '<span class="fsep"></span><button type="button" class="tb tb-txt" data-co="edit">Modifier</button><button type="button" class="tb" data-co="del" title="Supprimer">' + IC.trash + '</button>';
  bar.style.left = clamp(r.left, 8, innerWidth - bar.offsetWidth - 8) + 'px'; bar.style.top = Math.max(8, r.top - bar.offsetHeight - 8) + 'px';
}
function chartIcon(k){ return {col:'<svg viewBox="0 0 24 24"><path d="M5 20V11M10 20V5M15 20V9M20 20V14"/></svg>', bar:'<svg viewBox="0 0 24 24"><path d="M4 5h9M4 10h15M4 15h6M4 20h12"/></svg>', line:'<svg viewBox="0 0 24 24"><path d="m3 17 5-6 4 3 4-7 5 5"/></svg>', area:'<svg viewBox="0 0 24 24"><path d="m3 17 5-6 4 3 4-7 5 5v8H3z" fill="currentColor" fill-opacity=".3"/></svg>', pie:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M14 3.2A9 9 0 0 1 20.8 10H14z"/></svg>', donut:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/></svg>', scatter:'<svg viewBox="0 0 24 24"><circle cx="6" cy="16" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="15" cy="13" r="1.6"/><circle cx="18" cy="6" r="1.6"/></svg>', stack:'<svg viewBox="0 0 24 24"><path d="M6 20v-5h4v5M6 15V9h4v6M14 20v-8h4v8M14 12V5h4v7"/></svg>'}[k] || ''; }
function onObjDown(e){
  const el = e.target.closest('.g-obj'); if (!el) return false;
  e.preventDefault(); e.stopPropagation(); if (EDIT.on) commitEdit(0, 0);
  const ch = chartById(el.dataset.obj); if (!ch) return true;
  OBJ.sel = ch.id; renderObjects(); g$('grid').focus({preventScroll:true});
  if (V.ro) return true;
  OBJ.drag = {mode:e.target.dataset.rs ? 'rs' : 'mv', x:e.clientX, y:e.clientY, o:{...ch}, ch, moved:false};
  return true;
}
function onObjMove(e){
  const d = OBJ.drag; if (!d) return false;
  const dx = (e.clientX - d.x) / V.z, dy = (e.clientY - d.y) / V.z; if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
  if (d.mode === 'mv'){ d.ch.x = Math.max(0, Math.round(d.o.x + dx)); d.ch.y = Math.max(0, Math.round(d.o.y + dy)); }
  else { d.ch.w = Math.max(200, Math.round(d.o.w + dx)); d.ch.h = Math.max(140, Math.round(d.o.h + dy)); }
  renderObjects(); return true;
}
function onObjUp(){
  const d = OBJ.drag; if (!d) return false; OBJ.drag = null;
  if (d.moved){ const after = {...d.ch}; Object.assign(d.ch, d.o); tx(d.mode === 'mv' ? 'Déplacer le graphique' : 'Redimensionner le graphique', () => Object.assign(d.ch, after)); layout(); schedule(); }
  return true;
}
function deleteChart(id){ const sh = sh0(); tx('Supprimer le graphique', () => { sh.charts = sh.charts.filter(c => c.id !== id); }); OBJ.sel = null; renderObjects(); }
function chartEditor(id){
  const ch = chartById(id); if (!ch) return;
  SWDlg.open(`<h3>Graphique</h3>
    <div class="ce"><div class="ce-prev" id="cePrev"></div><div class="ce-f">
      <label class="pgf">Titre<input id="ceT" value="${escH(ch.title || '')}" placeholder="Sans titre"></label>
      <label class="pgf">Données<input id="ceR" value="${escH(ch.range)}" spellcheck="false"></label>
      <div class="pgf">Type<div class="ce-types">${CHART_TYPES.map(([k, n]) => `<button type="button" data-ct="${k}" class="${ch.type === k ? 'on' : ''}" title="${n}">${chartIcon(k)}<span>${n}</span></button>`).join('')}</div></div>
      <div class="pgf">Séries<div class="seg" id="ceBy"><button type="button" data-by="" aria-checked="${!ch.by}">Auto</button><button type="button" data-by="cols" aria-checked="${ch.by === 'cols'}">En colonnes</button><button type="button" data-by="rows" aria-checked="${ch.by === 'rows'}">En lignes</button></div></div>
      <label class="pop-toggle"><input type="checkbox" id="ceL"${ch.legend !== false ? ' checked' : ''}><span><b>Légende</b></span></label>
      <label class="pop-toggle"><input type="checkbox" id="ceV"${ch.labels ? ' checked' : ''}><span><b>Valeurs sur le graphique</b></span></label>
    </div></div>
    <div class="dlg-acts"><button class="ap-btn alt danger-t" id="ceDel">Supprimer</button><button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="ceOk">Appliquer</button></div>`, d => {
    const tmp = {...ch};
    const draw = () => { d.querySelector('#cePrev').innerHTML = chartSVG(tmp, 420, 270); };
    d.querySelector('#ceT').oninput = e => { tmp.title = e.target.value; draw(); };
    d.querySelector('#ceR').oninput = e => { if (parseRange(e.target.value)){ tmp.range = e.target.value.toUpperCase(); draw(); } };
    d.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { tmp.type = b.dataset.ct; d.querySelectorAll('[data-ct]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    d.querySelectorAll('[data-by]').forEach(b => b.onclick = () => { tmp.by = b.dataset.by || undefined; d.querySelectorAll('[data-by]').forEach(x => x.setAttribute('aria-checked', x === b)); draw(); });
    d.querySelector('#ceL').onchange = e => { tmp.legend = e.target.checked; draw(); };
    d.querySelector('#ceV').onchange = e => { tmp.labels = e.target.checked; draw(); };
    d.querySelector('#ceOk').onclick = () => { SWDlg.close(); tx('Modifier le graphique', () => Object.assign(ch, tmp)); };
    d.querySelector('#ceDel').onclick = () => { SWDlg.close(); deleteChart(id); };
    draw();
  }, 'wide');
}
