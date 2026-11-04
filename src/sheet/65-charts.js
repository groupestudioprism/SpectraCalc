/* ---------- Graphiques (SVG vivant, relié à une plage) ---------- */
const CHART_TYPES = [['col', 'Colonnes'], ['bar', 'Barres'], ['line', 'Courbes'], ['area', 'Aires'], ['pie', 'Secteurs'], ['donut', 'Anneau'], ['scatter', 'Nuage de points'], ['stack', 'Colonnes empilées'], ['stack100', 'Colonnes 100 %'], ['barstack', 'Barres empilées'], ['areastack', 'Aires empilées'], ['combo', 'Combiné'], ['radar', 'Radar'], ['bubble', 'Bulles'], ['waterfall', 'Cascade'], ['funnel', 'Entonnoir'], ['gauge', 'Jauge'], ['histo', 'Histogramme']];
const CHART_PALS = [['', 'Thème'], ['vif', 'Vif', ['#3D63FF', '#F2387A', '#F5B82E', '#2FBF71', '#7B3FF2', '#12B5E5', '#FF7A2F', '#8A8FA6']], ['pastel', 'Pastel', ['#8FB8FF', '#FFB3C7', '#FFE08A', '#A8E6C1', '#C9B3FF', '#9FE3F5', '#FFC9A3', '#CFD3E0']], ['mer', 'Océan', ['#0B3C5D', '#1D70A2', '#328CC1', '#5BB3D9', '#8FD0E8', '#BCE6F3', '#D9B310', '#F5E6A8']], ['feu', 'Feu', ['#7A0C0C', '#C21E1E', '#F2552C', '#FF8A3D', '#FFB84D', '#FFD98A', '#5C2A0E', '#A8531F']], ['foret', 'Forêt', ['#0E4D2C', '#1F7A44', '#3FA65F', '#7BC77D', '#B7E1A1', '#E2F2C2', '#8A6A2F', '#C9A55A']], ['mono', 'Monochrome', ['#1A1726', '#3E3A52', '#625E78', '#88849B', '#AEABBC', '#D0CEDA', '#E8E7EE', '#F4F3F8']], ['neon', 'Néon', ['#00E5FF', '#FF2E93', '#B6FF00', '#FFD400', '#8A2BE2', '#00FF9C', '#FF6A00', '#4D6BFF']], ['daltonien', 'Daltonien', ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00', '#F0E442', '#000000']]];
const palOf = ch => ch.colors?.length ? ch.colors : (CHART_PALS.find(x => x[0] && x[0] === ch.pal)?.[2] || chartPalette());
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
  const d = chartData(ch), pal = palOf(ch), t = themeColors();
  const font = `font-family="${escH(fontStack(t.fb).replace(/"/g, "'"))}"`;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${font} font-size="12">`;
  o += `<defs><linearGradient id="cg${ch.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${escH(ch.bg || '#ffffff')}"/><stop offset="1" stop-color="${escH(ch.bg2 || ch.bg || '#ffffff')}"/></linearGradient></defs><rect width="${W}" height="${H}" rx="${ch.round ?? 10}" fill="url(#cg${ch.id})"${ch.border ? ` stroke="${escH(ch.border)}" stroke-width="1.5"` : ''}/>`;
  const title = ch.title ?? '', tsz = ch.tsize || 16, tal = ch.talign || 'l', tx0 = tal === 'c' ? W / 2 : 18, tan = tal === 'c' ? 'middle' : 'start';
  let top = 14; if (title){ o += `<text x="${tx0}" y="${14 + tsz}" text-anchor="${tan}" font-size="${tsz}" font-weight="700" fill="${t.ink}">${escH(title)}</text>`; top = 14 + tsz + 14; }
  if (ch.sub){ o += `<text x="${tx0}" y="${top + 2}" text-anchor="${tan}" font-size="12" fill="#7B7690">${escH(ch.sub)}</text>`; top += 20; }
  if (!d || !d.series.length){ return o + `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#999">Aucune donnée numérique dans ${escH(ch.range)}</text></svg>`; }
  let S = d.series; const legend = ch.legend !== false && (S.length > 1 || ['pie', 'donut', 'funnel', 'waterfall'].includes(ch.type)), legTop = ch.legendPos === 'top';
  const legH = legend ? 26 : 0; if (legend && legTop) top += 22;
  if (['radar', 'waterfall', 'funnel', 'gauge', 'bubble', 'histo'].includes(ch.type)) return chartSVGx(ch, d, W, H, o, top, pal, t, legend ? legH : 0);
  if (ch.type === 'pie' || ch.type === 'donut'){
    const s = ch.pick === 'last' ? S[S.length - 1] : S[+ch.pick || 0] || S[0], vals = s.vals.map(v => Math.max(0, v || 0)), tot = sum(vals) || 1;
    const cx = W / 2, cy = top + (H - top - legH) / 2, R = Math.max(10, Math.min(W / 2 - 20, (H - top - legH) / 2 - 10)), r0 = ch.type === 'donut' ? R * (ch.hole ?? .58) : 0;
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
  const horiz = ch.type === 'bar' || ch.type === 'barstack', stacked = ['stack', 'barstack', 'stack100'].includes(ch.type), cum = ch.type === 'areastack', pct100 = ch.type === 'stack100', combo = ch.type === 'combo';
  if (pct100){ const tot = d.cats.map((_, i) => sum(S.map(s => Math.abs(s.vals[i] || 0))) || 1); S = S.map(s => ({...s, nf:'0"%"', vals:s.vals.map((v, i) => v == null ? null : v / tot[i] * 100)})); }
  if (cum){ const acc = d.cats.map(() => 0); S = S.map(s => ({...s, vals:s.vals.map((v, i) => v == null ? null : (acc[i] += v))})); }
  let all = []; if (stacked){ d.cats.forEach((_, i) => { let p = 0, n = 0; S.forEach(s => { const v = s.vals[i] || 0; if (v >= 0) p += v; else n += v; }); all.push(p, n); }); } else S.forEach(s => s.vals.forEach(v => v != null && all.push(v)));
  if (ch.type === 'scatter'){ /* x = première série */ }
  if (cum){ all = []; S.forEach(s => s.vals.forEach(v => v != null && all.push(v))); }
  let mn = Math.min(0, ...all), mx = Math.max(0, ...all); if (ch.ymin != null && ch.ymin !== '') mn = +ch.ymin; if (ch.ymax != null && ch.ymax !== '') mx = +ch.ymax; if (mx <= mn) mx = mn + 1; if (ch.type === 'line' && all.length && Math.min(...all) > 0 && Math.min(...all) > (Math.max(...all) - Math.min(...all)) * 1.5) mn = Math.min(...all) * .9;
  const ticks = niceTicks(mn, mx, Math.max(3, Math.round((horiz ? W : H) / 70)));
  const lo = ticks[0], hi = ticks[ticks.length - 1], nf = S[0].nf;
  const labW = Math.max(...ticks.map(v => fmtAxis(v, nf).length)) * 6.6 + 12;
  const catW = horiz ? Math.min(140, Math.max(...d.cats.map(c => c.length)) * 6.6 + 12) : 0;
  const L = horiz ? catW + 10 + (ch.yTitle ? 16 : 0) : labW + 10 + (ch.yTitle ? 16 : 0), Rr = 16, T = top + 6, B = H - (legend && !legTop ? legH : 0) - (horiz ? 24 : 30) - (ch.xTitle ? 16 : 0);
  const pw = W - L - Rr, ph = B - T; if (pw < 20 || ph < 20) return o + '</svg>';
  const sc = v => horiz ? L + (v - lo) / (hi - lo) * pw : B - (v - lo) / (hi - lo) * ph;
  // grille et axe des valeurs
  if (ch.xTitle) o += `<text x="${L + pw / 2}" y="${B + (horiz ? 40 : 46)}" text-anchor="middle" font-size="11.5" fill="#7B7690">${escH(horiz ? ch.yTitle || ch.xTitle : ch.xTitle)}</text>`;
  if (ch.yTitle) o += `<text transform="translate(12 ${T + ph / 2}) rotate(-90)" text-anchor="middle" font-size="11.5" fill="#7B7690">${escH(horiz ? ch.xTitle || ch.yTitle : ch.yTitle)}</text>`;
  for (const v of ticks){ const p = sc(v); const gc = v === 0 ? '#9A94B2' : (ch.grid === false ? 'none' : ch.gridc || '#ECEAF2');
    o += horiz ? `<line x1="${p}" y1="${T}" x2="${p}" y2="${B}" stroke="${gc}"/><text x="${p}" y="${B + 16}" text-anchor="middle" fill="#7B7690" font-size="11">${escH(fmtAxis(v, nf))}</text>`
      : `<line x1="${L}" y1="${p}" x2="${L + pw}" y2="${p}" stroke="${gc}"/><text x="${L - 8}" y="${p + 4}" text-anchor="end" fill="#7B7690" font-size="11">${escH(fmtAxis(v, nf))}</text>`; }
  const n = d.cats.length, band = (horiz ? ph : pw) / Math.max(1, n);
  // étiquettes des catégories
  const every = Math.ceil(n / Math.max(1, Math.floor((horiz ? ph / 16 : pw / 60))));
  d.cats.forEach((c, i) => { if (i % every) return; const p = (horiz ? T : L) + band * (i + .5); const txt = c.length > 18 ? c.slice(0, 17) + '…' : c;
    o += horiz ? `<text x="${L - 8}" y="${p + 4}" text-anchor="end" fill="#4B465E" font-size="11">${escH(txt)}</text>` : `<text x="${p}" y="${B + 18}" text-anchor="middle" fill="#4B465E" font-size="11">${escH(txt)}</text>`; });
  const z = sc(Math.max(lo, Math.min(0, hi)));
  if (['col', 'bar'].includes(ch.type) || stacked || combo){
    const CS = combo ? S.slice(0, 1) : S, gw = band * (1 - (ch.gap ?? .28)), bw = stacked ? gw : gw / CS.length, rad = ch.rad ?? 3;
    d.cats.forEach((cat, i) => { let pos = 0, neg = 0;
      CS.forEach((s, j) => { const v = s.vals[i]; if (v == null) return; const c = pal[j % pal.length];
        let a, b2; if (stacked){ if (v >= 0){ a = sc(pos); b2 = sc(pos + v); pos += v; } else { a = sc(neg); b2 = sc(neg + v); neg += v; } } else { a = z; b2 = sc(v); }
        const off = (horiz ? T : L) + band * i + (band - gw) / 2 + (stacked ? 0 : bw * j);
        const tip = `<title>${escH(s.name)} · ${escH(cat)} : ${escH(formatValue(v, s.nf).t)}</title>`;
        o += horiz ? `<rect x="${Math.min(a, b2)}" y="${off}" width="${Math.max(1, Math.abs(b2 - a))}" height="${Math.max(1, bw - 2)}" rx="${rad}" fill="${c}">${tip}</rect>` : `<rect x="${off}" y="${Math.min(a, b2)}" width="${Math.max(1, bw - 2)}" height="${Math.max(1, Math.abs(b2 - a))}" rx="${rad}" fill="${c}">${tip}</rect>`;
        if (ch.labels){ o += horiz ? `<text x="${b2 + 4}" y="${off + bw / 2 + 4}" font-size="10.5" fill="#4B465E">${escH(fmtAxis(v, s.nf))}</text>` : `<text x="${off + bw / 2}" y="${Math.min(a, b2) - 4}" text-anchor="middle" font-size="10.5" fill="#4B465E">${escH(fmtAxis(v, s.nf))}</text>`; }
      }); });
  }
  if (['line', 'area', 'areastack'].includes(ch.type) || combo){
    const LS = combo ? S.slice(1) : S, off0 = combo ? 1 : 0, isArea = ch.type === 'area' || cum;
    const smooth = (pts) => { if (!ch.smooth || pts.length < 3) return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(''); let d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1); for (let i = 0; i < pts.length - 1; i++){ const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; } return d; };
    const lw = ch.lw || 2.5;
    LS.forEach((s, jj) => { const j = jj + off0, c = pal[j % pal.length]; const pts = s.vals.map((v, i) => v == null ? null : [L + band * (i + .5), sc(v)]);
      const segs = []; let cur = []; pts.forEach(p => { if (p) cur.push(p); else if (cur.length){ segs.push(cur); cur = []; } }); if (cur.length) segs.push(cur);
      for (const sg of segs){ const dd = smooth(sg);
        if (isArea){ const base = cum && jj > 0 ? S[jj - 1 + off0].vals.map((v, i) => [L + band * (i + .5), sc(v ?? 0)]).slice(0, 0) : null; o += `<path d="${dd}L${sg[sg.length - 1][0].toFixed(1)},${z}L${sg[0][0].toFixed(1)},${z}Z" fill="${c}" fill-opacity="${cum ? .55 : .18}"/>`; }
        o += `<path d="${dd}" fill="none" stroke="${c}" stroke-width="${lw}" stroke-linejoin="round" stroke-linecap="round"${ch.dash ? ' stroke-dasharray="6 4"' : ''}/>`; }
      if (ch.markers !== false && n <= 40) pts.forEach((p, i) => { if (p) o += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" stroke="${c}" stroke-width="2"><title>${escH(s.name)} · ${escH(d.cats[i])} : ${escH(formatValue(s.vals[i], s.nf).t)}</title></circle>`; });
      if (ch.labels) pts.forEach((p, i) => { if (p) o += `<text x="${p[0]}" y="${p[1] - 8}" text-anchor="middle" font-size="10.5" fill="#4B465E">${escH(fmtAxis(s.vals[i], s.nf))}</text>`; });
    });
    if (ch.trend && !cum){ S.slice(combo ? 1 : 0, (combo ? 1 : 0) + 1).forEach(s => { const pts = s.vals.map((v, i) => v == null ? null : [i, v]).filter(Boolean); if (pts.length > 1){ const mx = mean(pts.map(p => p[0])), my = mean(pts.map(p => p[1])), den = sum(pts.map(p => (p[0] - mx) ** 2)) || 1, sl = sum(pts.map(p => (p[0] - mx) * (p[1] - my))) / den, ic = my - sl * mx; o += `<line x1="${L + band * .5}" y1="${sc(ic)}" x2="${L + band * (n - .5)}" y2="${sc(ic + sl * (n - 1))}" stroke="#7B7690" stroke-width="1.8" stroke-dasharray="5 4"><title>Tendance linéaire</title></line>`; } }); }
  }
  if (ch.type === 'scatter'){
    const xs = S[0].vals, ys = S.length > 1 ? S.slice(1) : [{...S[0], vals:S[0].vals.map((_, i) => i + 1)}];
    const xv = xs.filter(v => v != null), xt = niceTicks(Math.min(...xv), Math.max(...xv), 5), xl = xt[0], xh = xt[xt.length - 1];
    ys.forEach((s, j) => s.vals.forEach((v, i) => { if (v == null || xs[i] == null) return; const x = L + (xs[i] - xl) / (xh - xl) * pw; o += `<circle cx="${x}" cy="${sc(v)}" r="4.5" fill="${pal[j % pal.length]}" fill-opacity=".8"><title>${escH(fmtAxis(xs[i]))} ; ${escH(fmtAxis(v, s.nf))}</title></circle>`; }));
    if (ch.trend) ys.forEach((s, j) => { const pts = s.vals.map((v, i) => v == null || xs[i] == null ? null : [xs[i], v]).filter(Boolean); if (pts.length > 1){ const mx = mean(pts.map(p => p[0])), my = mean(pts.map(p => p[1])), den = sum(pts.map(p => (p[0] - mx) ** 2)) || 1, sl = sum(pts.map(p => (p[0] - mx) * (p[1] - my))) / den, ic = my - sl * mx; o += `<line x1="${L}" y1="${sc(ic + sl * xl)}" x2="${L + pw}" y2="${sc(ic + sl * xh)}" stroke="${pal[j % pal.length]}" stroke-width="1.8" stroke-dasharray="5 4"/>`; } });
  }
  if (legend) o += legendSVG(S.map(s => s.name), pal, W, legTop ? top - 4 : H - 12);
  return o + '</svg>';
}
/* types spéciaux : radar, cascade, entonnoir, jauge, bulles, histogramme */
function chartSVGx(ch, d, W, H, o, top, pal, t, legH){
  const S = d.series, B = H - legH - 12, cx = W / 2, T = ch.type, ink = '#4B465E';
  const nf = S[0].nf, F = v => escH(fmtAxis(v, nf));
  if (T === 'radar'){
    const cy = top + (B - top) / 2, R = Math.max(20, Math.min(W / 2 - 50, (B - top) / 2 - 22)), n = d.cats.length; if (n < 3) return o + `<text x="${cx}" y="${cy}" text-anchor="middle" fill="#999">Au moins 3 catégories</text></svg>`;
    const all = S.flatMap(s => s.vals.filter(v => v != null)), mx = niceTicks(0, Math.max(...all, 1), 4).pop();
    const pt = (i, f) => [cx + Math.cos(-Math.PI / 2 + i * 2 * Math.PI / n) * R * f, cy + Math.sin(-Math.PI / 2 + i * 2 * Math.PI / n) * R * f];
    for (let k = 1; k <= 4; k++) o += `<polygon points="${range(0, n - 1).map(i => pt(i, k / 4).join(',')).join(' ')}" fill="none" stroke="#ECEAF2"/>`;
    d.cats.forEach((c, i) => { const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.12); o += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#ECEAF2"/><text x="${lx}" y="${ly + 4}" text-anchor="${Math.abs(lx - cx) < 6 ? 'middle' : lx > cx ? 'start' : 'end'}" font-size="11" fill="${ink}">${escH(c.length > 14 ? c.slice(0, 13) + '…' : c)}</text>`; });
    S.forEach((s, j) => { const c = pal[j % pal.length], pts = range(0, n - 1).map(i => pt(i, (s.vals[i] || 0) / mx)); o += `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/>` + pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" stroke="${c}" stroke-width="2"><title>${escH(s.name)} · ${escH(d.cats[i])} : ${escH(formatValue(s.vals[i], s.nf).t)}</title></circle>`).join(''); });
  } else if (T === 'waterfall'){
    const s = S[0], n = s.vals.length; let acc = 0; const bars = s.vals.map((v, i) => { v = v || 0; const a = acc; acc += v; return {a, b:acc, v, i}; }); bars.push({a:0, b:acc, v:acc, i:n, total:true});
    const lo = Math.min(0, ...bars.flatMap(b => [b.a, b.b])), hi = Math.max(0, ...bars.flatMap(b => [b.a, b.b])), ticks = niceTicks(lo, hi, 5), mn = ticks[0], mx = ticks[ticks.length - 1];
    const L = Math.max(...ticks.map(v => F(v).length)) * 6.6 + 24, Tp = top + 6, Bt = B - 24, pw = W - L - 16, ph = Bt - Tp, sc = v => Bt - (v - mn) / (mx - mn) * ph, band = pw / bars.length;
    for (const v of ticks) o += `<line x1="${L}" y1="${sc(v)}" x2="${L + pw}" y2="${sc(v)}" stroke="${v === 0 ? '#9A94B2' : '#ECEAF2'}"/><text x="${L - 8}" y="${sc(v) + 4}" text-anchor="end" fill="#7B7690" font-size="11">${F(v)}</text>`;
    bars.forEach((b, i) => { const c = b.total ? pal[0] : b.v >= 0 ? '#2FBF71' : '#F2387A', x = L + band * i + band * .15, w = band * .7, y1 = sc(Math.max(b.a, b.b)), y2 = sc(Math.min(b.a, b.b)); const cat = b.total ? 'Total' : d.cats[i];
      o += `<rect x="${x}" y="${y1}" width="${w}" height="${Math.max(1, y2 - y1)}" rx="3" fill="${c}"><title>${escH(cat)} : ${F(b.v)}</title></rect>`;
      if (i < bars.length - 1) o += `<line x1="${x + w}" y1="${sc(b.b)}" x2="${x + band}" y2="${sc(b.b)}" stroke="#9A94B2" stroke-dasharray="3 3"/>`;
      if (ch.labels !== false) o += `<text x="${x + w / 2}" y="${y1 - 4}" text-anchor="middle" font-size="10.5" fill="${ink}">${b.total ? '' : b.v > 0 ? '+' : ''}${F(b.v)}</text>`;
      if (i % Math.ceil(bars.length / Math.max(1, Math.floor(pw / 60))) === 0) o += `<text x="${x + w / 2}" y="${Bt + 16}" text-anchor="middle" font-size="11" fill="${ink}">${escH(cat.length > 12 ? cat.slice(0, 11) + '…' : cat)}</text>`; });
  } else if (T === 'funnel'){
    const s = S[0], items = d.cats.map((c, i) => ({c, v:Math.max(0, s.vals[i] || 0)})).sort((a, b) => b.v - a.v), mxv = items[0]?.v || 1, h = (B - top - 4) / items.length, maxW = W - 150;
    items.forEach((it, i) => { const w = Math.max(24, it.v / mxv * maxW), y = top + i * h, nw = Math.max(24, (items[i + 1]?.v ?? it.v * .6) / mxv * maxW), col = pal[i % pal.length];
      o += `<path d="M${cx - w / 2},${y + 2} L${cx + w / 2},${y + 2} L${cx + nw / 2},${y + h - 2} L${cx - nw / 2},${y + h - 2} Z" fill="${col}"><title>${escH(it.c)} : ${F(it.v)}</title></path><text x="${cx}" y="${y + h / 2 + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${F(it.v)}</text><text x="${cx + maxW / 2 + 8}" y="${y + h / 2 + 4}" font-size="11" fill="${ink}">${escH(it.c.length > 12 ? it.c.slice(0, 11) + '…' : it.c)}</text>`; });
  } else if (T === 'gauge'){
    const v = S[0].vals.find(x => x != null) ?? 0, mx = ch.ymax != null && ch.ymax !== '' ? +ch.ymax : S[0].vals[1] != null ? S[0].vals[1] : niceTicks(0, Math.max(v, 1), 4).pop(), f = clamp(v / (mx || 1), 0, 1);
    const R = Math.max(30, Math.min(W / 2 - 24, B - top - 30)), cy = Math.min(B - 28, top + R + 10), P = (a, r) => `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`, r0 = R * .68, a0 = Math.PI, a1 = a0 + f * Math.PI;
    o += `<path d="M${P(a0, R)} A${R},${R} 0 0 1 ${P(2 * Math.PI, R)} L${P(2 * Math.PI, r0)} A${r0},${r0} 0 0 0 ${P(a0, r0)} Z" fill="#ECEAF2"/>`;
    if (f > 0) o += `<path d="M${P(a0, R)} A${R},${R} 0 ${f > 1 ? 1 : 0} 1 ${P(a1, R)} L${P(a1, r0)} A${r0},${r0} 0 ${f > 1 ? 1 : 0} 0 ${P(a0, r0)} Z" fill="${pal[0]}"/>`;
    o += `<text x="${cx}" y="${cy - R * .12}" text-anchor="middle" font-size="${Math.round(R * .3)}" font-weight="800" fill="${t.ink}">${F(v)}</text><text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="12" fill="#7B7690">${Math.round(f * 100)} % de ${F(mx)}</text>`;
  } else if (T === 'bubble'){
    if (S.length < 3) return o + `<text x="${cx}" y="${H / 2}" text-anchor="middle" fill="#999">Bulles : 3 colonnes (X, Y, taille)</text></svg>`;
    const xs = S[0].vals, ys = S[1].vals, zs = S[2].vals, ok = xs.map((x, i) => x != null && ys[i] != null && zs[i] != null);
    const xv = xs.filter((_, i) => ok[i]), yv = ys.filter((_, i) => ok[i]), zv = zs.filter((_, i) => ok[i]); if (!xv.length) return o + '</svg>';
    const xt = niceTicks(Math.min(...xv), Math.max(...xv), 5), yt = niceTicks(Math.min(0, ...yv), Math.max(...yv), 5), L = 52, Tp = top + 30, Bt = B - 26, pw = W - L - 50, ph = Bt - Tp, sx = v => L + (v - xt[0]) / (xt[xt.length - 1] - xt[0]) * pw, sy = v => Bt - (v - yt[0]) / (yt[yt.length - 1] - yt[0]) * ph, zm = Math.max(...zv) || 1;
    for (const v of yt) o += `<line x1="${L}" y1="${sy(v)}" x2="${L + pw}" y2="${sy(v)}" stroke="#ECEAF2"/><text x="${L - 8}" y="${sy(v) + 4}" text-anchor="end" fill="#7B7690" font-size="11">${escH(fmtAxis(v))}</text>`;
    for (const v of xt) o += `<text x="${sx(v)}" y="${Bt + 16}" text-anchor="middle" fill="#7B7690" font-size="11">${escH(fmtAxis(v))}</text>`;
    xs.forEach((x, i) => { if (ok[i]) o += `<circle cx="${sx(x)}" cy="${sy(ys[i])}" r="${6 + Math.sqrt(zs[i] / zm) * 22}" fill="${pal[i % pal.length]}" fill-opacity=".55" stroke="${pal[i % pal.length]}" stroke-width="1.5"><title>${escH(d.cats[i])} : ${escH(fmtAxis(x))} ; ${escH(fmtAxis(ys[i]))} ; ${escH(fmtAxis(zs[i]))}</title></circle>`; });
  } else if (T === 'histo'){
    const v = S[0].vals.filter(x => x != null); if (v.length < 2) return o + '</svg>';
    const k = clamp(ch.bins || Math.ceil(Math.sqrt(v.length)) + 1, 2, 40), mn = Math.min(...v), mx = Math.max(...v), w = (mx - mn) / k || 1, bins = Array(k).fill(0); v.forEach(x => bins[Math.min(k - 1, Math.floor((x - mn) / w))]++);
    const ticks = niceTicks(0, Math.max(...bins, 2), 5).filter(v => Number.isInteger(v)), hi = ticks[ticks.length - 1], L = 40, Tp = top + 6, Bt = B - 26, pw = W - L - 16, ph = Bt - Tp, bw = pw / k;
    for (const tk of ticks) o += `<line x1="${L}" y1="${Bt - tk / hi * ph}" x2="${L + pw}" y2="${Bt - tk / hi * ph}" stroke="${tk === 0 ? '#9A94B2' : '#ECEAF2'}"/><text x="${L - 6}" y="${Bt - tk / hi * ph + 4}" text-anchor="end" fill="#7B7690" font-size="11">${tk}</text>`;
    bins.forEach((n, i) => { const h = n / hi * ph; o += `<rect x="${L + bw * i + 1}" y="${Bt - h}" width="${bw - 2}" height="${h}" rx="2" fill="${pal[0]}"><title>${escH(fmtAxis(mn + w * i))} à ${escH(fmtAxis(mn + w * (i + 1)))} : ${n}</title></rect>`; if (k <= 14 || i % 2 === 0) o += `<text x="${L + bw * i}" y="${Bt + 16}" text-anchor="middle" font-size="10.5" fill="#7B7690">${escH(fmtAxis(mn + w * i))}</text>`; });
  }
  if (legH && ['radar', 'bubble'].includes(T)) o += legendSVG(T === 'radar' ? S.map(s => s.name) : [], pal, W, H - 12);
  if (legH && ['funnel', 'waterfall'].includes(T) && false) o += '';
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
  bar.innerHTML = CHART_TYPES.slice(0, 8).map(([k, n]) => `<button type="button" class="tb tb-txt${ch.type === k ? ' on' : ''}" data-ct="${k}" title="${n}">${chartIcon(k)}</button>`).join('') + '<span class="fsep"></span><button type="button" class="tb tb-txt" data-co="edit">Modifier</button><button type="button" class="tb" data-co="del" title="Supprimer">' + IC.trash + '</button>';
  bar.style.left = clamp(r.left, 8, innerWidth - bar.offsetWidth - 8) + 'px'; bar.style.top = Math.max(8, r.top - bar.offsetHeight - 8) + 'px';
}
function chartIcon(k){ return {col:'<svg viewBox="0 0 24 24"><path d="M5 20V11M10 20V5M15 20V9M20 20V14"/></svg>', bar:'<svg viewBox="0 0 24 24"><path d="M4 5h9M4 10h15M4 15h6M4 20h12"/></svg>', line:'<svg viewBox="0 0 24 24"><path d="m3 17 5-6 4 3 4-7 5 5"/></svg>', area:'<svg viewBox="0 0 24 24"><path d="m3 17 5-6 4 3 4-7 5 5v8H3z" fill="currentColor" fill-opacity=".3"/></svg>', pie:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M14 3.2A9 9 0 0 1 20.8 10H14z"/></svg>', donut:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/></svg>', scatter:'<svg viewBox="0 0 24 24"><circle cx="6" cy="16" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="15" cy="13" r="1.6"/><circle cx="18" cy="6" r="1.6"/></svg>', stack:'<svg viewBox="0 0 24 24"><path d="M6 20v-5h4v5M6 15V9h4v6M14 20v-8h4v8M14 12V5h4v7"/></svg>',
  stack100:'<svg viewBox="0 0 24 24"><path d="M5 4h6v16H5zM13 4h6v16h-6zM5 11h6M13 14h6"/></svg>', barstack:'<svg viewBox="0 0 24 24"><path d="M4 5h9v4H4zM13 5h5v4h-5zM4 14h5v4H4zM9 14h10v4H9z"/></svg>', areastack:'<svg viewBox="0 0 24 24"><path d="m3 18 6-5 5 3 7-6v10H3z" fill="currentColor" fill-opacity=".25"/><path d="m3 13 6-5 5 3 7-6"/></svg>',
  combo:'<svg viewBox="0 0 24 24"><path d="M5 20v-7M10 20V9M15 20v-5M20 20v-8"/><path d="m3 9 6-4 6 4 6-5"/></svg>', radar:'<svg viewBox="0 0 24 24"><path d="m12 3 8.5 6.2-3.2 10H6.7l-3.2-10z"/><path d="m12 8 4 3-1.5 5h-5L8 11z"/></svg>', bubble:'<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><circle cx="16" cy="9" r="3"/><circle cx="17" cy="17" r="2"/></svg>',
  waterfall:'<svg viewBox="0 0 24 24"><path d="M4 12h4v8H4zM10 6h4v6h-4zM16 6h4v10h-4z"/></svg>', funnel:'<svg viewBox="0 0 24 24"><path d="M3 5h18l-3 5H6zM7 12h10l-2 4H9zM10 18h4v2h-4z"/></svg>', gauge:'<svg viewBox="0 0 24 24"><path d="M3.5 17a8.5 8.5 0 0 1 17 0"/><path d="m12 17 4-6"/></svg>', histo:'<svg viewBox="0 0 24 24"><path d="M4 20v-6h4v6M8 20V6h4v14M12 20V9h4v11M16 20v-5h4v5"/></svg>'}[k] || ''; }
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
/* clic droit sur un graphique : modifier, changer de type, dupliquer, supprimer */
function chartMenu(e, id){
  const ch = chartById(id); if (!ch) return; OBJ.sel = id; renderObjects();
  const ro = V.ro ? ' disabled' : '';
  openPop({x:e.clientX, y:e.clientY, getBoundingClientRect:() => ({left:e.clientX, right:e.clientX, top:e.clientY, bottom:e.clientY})},
    `<div class="pop-list ctx"><button type="button" data-cc="edit"${ro}>Modifier le graphique…</button><hr><p class="pop-h">Type de graphique</p>${CHART_TYPES.slice(0, 8).map(([k, n]) => `<button type="button" data-ct="${k}" class="${ch.type === k ? 'on' : ''}"${ro}>${n}</button>`).join('')}<hr>
    <button type="button" data-cc="dup"${ro}>Dupliquer</button><button type="button" data-cc="del" class="danger"${ro}>Supprimer</button></div>`, pp => {
    pp.onclick = ev => { const b = ev.target.closest('button'); if (!b || b.disabled) return; closePop();
      if (b.dataset.ct){ tx('Type de graphique', () => { ch.type = b.dataset.ct; }); renderObjects(); return; }
      if (b.dataset.cc === 'edit') return chartEditor(id);
      if (b.dataset.cc === 'dup'){ const c = {...JSON.parse(JSON.stringify(ch)), id:uidS(), x:ch.x + 24, y:ch.y + 24}; tx('Dupliquer le graphique', () => { sh0().charts.push(c); }); OBJ.sel = c.id; layout(); schedule(); return; }
      if (b.dataset.cc === 'del') deleteChart(id); };
  }, 'menu');
}
function deleteChart(id){ const sh = sh0(); tx('Supprimer le graphique', () => { sh.charts = sh.charts.filter(c => c.id !== id); }); OBJ.sel = null; renderObjects(); }
function chartEditor(id){
  const ch = chartById(id); if (!ch) return;
  const chk = (k, n, v) => `<label class="pop-toggle"><input type="checkbox" data-ck="${k}"${v ? ' checked' : ''}><span><b>${n}</b></span></label>`;
  const txt = (k, n, ph = '') => `<label class="pgf">${n}<input data-tx="${k}" value="${escH(ch[k] ?? '')}" placeholder="${ph}"></label>`;
  const col = (k, n, def) => `<label class="pgf ce-col">${n}<span><input type="color" data-cl="${k}" value="${ch[k] || def}"><button type="button" class="pop-link" data-clx="${k}">Aucune</button></span></label>`;
  const rng = (k, n, min, max, st, def) => `<label class="pgf">${n}<input type="range" data-rg="${k}" min="${min}" max="${max}" step="${st}" value="${ch[k] ?? def}"></label>`;
  SWDlg.open(`<h3>Graphique</h3>
    <div class="ce"><div class="ce-prev" id="cePrev"></div><div class="ce-f">
      <div class="seg ce-tabs" id="ceTabs"><button type="button" data-tab="d" aria-checked="true">Données</button><button type="button" data-tab="s" aria-checked="false">Style</button><button type="button" data-tab="a" aria-checked="false">Axes</button></div>
      <div data-pane="d">
        ${txt('title', 'Titre', 'Sans titre')}${txt('sub', 'Sous-titre')}
        <label class="pgf">Données<input id="ceR" value="${escH(ch.range)}" spellcheck="false"></label>
        <div class="pgf">Type<div class="ce-types">${CHART_TYPES.map(([k, n]) => `<button type="button" data-ct="${k}" class="${ch.type === k ? 'on' : ''}" title="${n}">${chartIcon(k)}<span>${n}</span></button>`).join('')}</div></div>
        <div class="pgf">Séries<div class="seg" id="ceBy"><button type="button" data-by="" aria-checked="${!ch.by}">Auto</button><button type="button" data-by="cols" aria-checked="${ch.by === 'cols'}">En colonnes</button><button type="button" data-by="rows" aria-checked="${ch.by === 'rows'}">En lignes</button></div></div>
      </div>
      <div data-pane="s" hidden>
        <div class="pgf">Palette<div class="ce-pals">${CHART_PALS.map(([k, n, c]) => `<button type="button" data-pal="${k}" class="${(ch.pal || '') === k && !ch.colors?.length ? 'on' : ''}" title="${n}"><span>${(c || chartPalette()).slice(0, 5).map(x => `<i style="background:${x}"></i>`).join('')}</span>${n}</button>`).join('')}</div></div>
        ${chk('legend', 'Légende', ch.legend !== false)}<div class="pgf">Position de la légende<div class="seg" id="ceLp"><button type="button" data-lp="" aria-checked="${ch.legendPos !== 'top'}">Bas</button><button type="button" data-lp="top" aria-checked="${ch.legendPos === 'top'}">Haut</button></div></div>
        ${chk('labels', 'Valeurs sur le graphique', ch.labels)}${chk('smooth', 'Courbes lissées', ch.smooth)}${chk('markers', 'Points sur les courbes', ch.markers !== false)}${chk('trend', 'Courbe de tendance', ch.trend)}${chk('dash', 'Traits pointillés', ch.dash)}${chk('grid', 'Quadrillage', ch.grid !== false)}
        <div class="pgf">Titre : alignement<div class="seg" id="ceTa"><button type="button" data-ta="" aria-checked="${ch.talign !== 'c'}">Gauche</button><button type="button" data-ta="c" aria-checked="${ch.talign === 'c'}">Centré</button></div></div>
        ${rng('tsize', 'Taille du titre', 12, 32, 1, 16)}${rng('rad', 'Coins des barres', 0, 12, 1, 3)}${rng('gap', 'Espace entre les barres', 0, .8, .02, .28)}${rng('round', 'Coins du cadre', 0, 28, 1, 10)}${rng('hole', 'Trou de l\'anneau', .2, .85, .01, .58)}${rng('lw', 'Épaisseur des courbes', 1, 6, .5, 2.5)}
        ${col('bg', 'Fond', '#ffffff')}${col('bg2', 'Fond (dégradé vers)', '#eef2ff')}${col('border', 'Cadre', '#d8d4e6')}
      </div>
      <div data-pane="a" hidden>
        ${txt('xTitle', 'Titre de l\'axe horizontal')}${txt('yTitle', 'Titre de l\'axe vertical')}
        <label class="pgf">Minimum de l'axe<input data-tx="ymin" inputmode="decimal" value="${ch.ymin ?? ''}" placeholder="Auto"></label><label class="pgf">Maximum de l'axe (ou cible de la jauge)<input data-tx="ymax" inputmode="decimal" value="${ch.ymax ?? ''}" placeholder="Auto"></label>
        <label class="pgf">Classes de l'histogramme<input data-tx="bins" inputmode="numeric" value="${ch.bins ?? ''}" placeholder="Auto"></label>
        ${col('gridc', 'Couleur du quadrillage', '#ECEAF2')}
      </div>
    </div></div>
    <div class="dlg-acts"><button class="ap-btn alt danger-t" id="ceDel">Supprimer</button><button class="ap-btn alt" data-dlg="close">Annuler</button><button class="ap-btn" id="ceOk">Appliquer</button></div>`, d => {
    const tmp = {...ch}, num = ['ymin', 'ymax', 'bins'];
    const draw = () => { d.querySelector('#cePrev').innerHTML = chartSVG(tmp, 420, 270); };
    const seg = (sel, attr, key, conv = v => v) => d.querySelectorAll(sel).forEach(b => b.onclick = () => { tmp[key] = conv(b.dataset[attr]); d.querySelectorAll(sel).forEach(x => x.setAttribute('aria-checked', x === b)); draw(); });
    d.querySelectorAll('#ceTabs [data-tab]').forEach(b => b.onclick = () => { d.querySelectorAll('#ceTabs [data-tab]').forEach(x => x.setAttribute('aria-checked', x === b)); d.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab); });
    d.querySelectorAll('[data-tx]').forEach(i => i.oninput = () => { const k = i.dataset.tx; tmp[k] = i.value === '' ? undefined : num.includes(k) ? (parseNumberFr(i.value) ?? undefined) : i.value; draw(); });
    d.querySelectorAll('[data-ck]').forEach(i => i.onchange = () => { tmp[i.dataset.ck] = i.checked; draw(); });
    d.querySelectorAll('[data-rg]').forEach(i => i.oninput = () => { tmp[i.dataset.rg] = +i.value; draw(); });
    d.querySelectorAll('[data-cl]').forEach(i => i.oninput = () => { tmp[i.dataset.cl] = i.value; draw(); });
    d.querySelectorAll('[data-clx]').forEach(i => i.onclick = () => { tmp[i.dataset.clx] = undefined; draw(); });
    d.querySelector('#ceR').oninput = e => { if (parseRange(e.target.value)){ tmp.range = e.target.value.toUpperCase(); draw(); } };
    d.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { tmp.type = b.dataset.ct; d.querySelectorAll('[data-ct]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    d.querySelectorAll('[data-pal]').forEach(b => b.onclick = () => { tmp.pal = b.dataset.pal || undefined; tmp.colors = undefined; d.querySelectorAll('[data-pal]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    seg('#ceBy [data-by]', 'by', 'by', v => v || undefined); seg('#ceLp [data-lp]', 'lp', 'legendPos', v => v || undefined); seg('#ceTa [data-ta]', 'ta', 'talign', v => v || undefined);
    d.querySelector('#ceOk').onclick = () => { SWDlg.close(); tx('Modifier le graphique', () => { for (const k of Object.keys(ch)) if (!(k in tmp)) delete ch[k]; for (const [k, v] of Object.entries(tmp)){ if (v === undefined) delete ch[k]; else ch[k] = v; } }); renderObjects(); };
    d.querySelector('#ceDel').onclick = () => { SWDlg.close(); deleteChart(id); };
    draw();
  }, 'wide');
}
