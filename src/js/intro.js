/* Intro SPECTRA Calc : scène décorative (aucun appel au moteur du tableur).
   Les nombres affichés sont réels : la somme est calculée ici à partir des valeurs montrées.
   Web Animations API : déterministe, pausable, « seekable ». État final = écran de chargement stable. */
(() => {
  'use strict';
  const T0 = performance.now(), KEY = 'prism-intro-calc', HOLD = 3350, SEEN_HOLD = 900, REDUCED_HOLD = 600;
  const $ = id => document.getElementById(id), sp = $('splash');
  if (!sp) return;
  const st = { playing: false, skipped: false, hold: HOLD, onSkip: null };
  window.__spIntro = { remaining: () => st.skipped ? 0 : Math.max(0, st.hold - (performance.now() - T0)), onSkip: null };
  let seen = false, force = false, reduce = false;
  try { force = /[?&]intro=1(&|$)/.test(location.search); } catch (e) {}
  try { seen = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  const A = [];
  const EASE_IN = 'cubic-bezier(.22,.8,.2,1)', EASE_IO = 'cubic-bezier(.65,0,.35,1)', EASE_M = 'cubic-bezier(.4,0,.2,1)';
  const at = (el, kf, start, dur, ease, fill) => { const a = el.animate(kf, { delay: start, duration: dur, easing: ease || EASE_IN, fill: fill || 'both' }); A.push(a); return a; };
  const E = (cls, tag, txt) => { const e = document.createElement(tag || 'div'); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  function finish() {
    A.forEach(a => { try { if (a.effect && a.effect.getComputedTiming().iterations === Infinity) a.cancel(); else a.finish(); } catch (e) { try { a.cancel(); } catch (e2) {} } });
    const sh = $('ciSheet'); if (sh) sh.remove();
    const t = $('ciTiles'); if (t) t.remove();
    const b = $('ciSkip'); if (b) b.remove();
    document.removeEventListener('keydown', onKey, true);
    st.playing = false;
  }
  function skip() {
    if (st.skipped) return; st.skipped = true;
    try { finish(); } catch (e) {}
    const f = window.__spIntro.onSkip; if (typeof f === 'function') f();
  }
  function onKey(e) {
    if (!st.playing) return;
    const t = e.target, ok = !t || t.id === 'ciSkip' || !/^(BUTTON|A|SELECT|TEXTAREA)$/.test(t.tagName);
    
    if (e.key === 'Escape' || (e.key === 'Enter' && ok)) { e.preventDefault(); skip(); }
  }

  function scene() {
    const data = [['Jan.', 120], ['Fév.', 85], ['Mars', 95]];
    const total = data.reduce((s, d) => s + d[1], 0);            // vrai résultat de l'opération affichée
    const FORMULA = '=SOMME(B2:B4)';
    const sheet = $('ciSheet'), mark = $('ciMark'), tiles = $('ciTiles');

    // barre de formule
    const fx = E('ci-fx'), fm = E('ci-fm'), nb = E('ci-nb', 'span', 'B5');
    fx.append(nb, E('ci-fl', 'span', 'fx'), fm);
    const caret0 = E('ci-caret'); fm.append(caret0);
    const chars = [...FORMULA].map((c, i) => { const s = E('ci-ch' + (i >= 7 && i <= 11 ? ' rg' : ''), 'span', c); s.append(E('', 'i')); fm.append(s); return s; });
    // grille
    const grid = E('ci-grid'), cells = [];
    const put = (el, r, c) => { el.style.gridRow = r; el.style.gridColumn = c; grid.append(el); cells.push({ el, r, c }); return el; };
    put(E('ci-c h'), 1, 1);
    ['A', 'B', 'C'].forEach((l, i) => put(E('ci-c h', 'div', l), 1, i + 2));
    for (let r = 1; r <= 5; r++) put(E('ci-c h', 'div', String(r)), r + 1, 1);
    const content = [];
    for (let r = 1; r <= 5; r++) for (let c = 1; c <= 3; c++) {
      let cls = 'ci-c', txt = '';
      if (r === 1 && c === 1) { cls += ' l'; txt = 'Mois'; } else if (r === 1 && c === 2) { cls += ' l n'; txt = 'Ventes'; }
      else if (r >= 2 && r <= 4 && c === 1) { cls += ' l'; txt = data[r - 2][0]; }
      else if (r >= 2 && r <= 4 && c === 2) { cls += ' n'; txt = String(data[r - 2][1]); }
      else if (r === 5 && c === 1) { cls += ' l'; txt = 'Total'; }
      else if (r === 5 && c === 2) cls += ' n r';
      const el = put(E(cls), r + 1, c + 1); if (txt) { const t = E('', 'span', txt); el.append(t); content.push({ el, t, r, c }); }
    }
    const b5 = cells.find(o => o.r === 6 && o.c === 3).el;
    // sommes partielles réelles (cumul des valeurs affichées)
    let run = 0; const partial = data.map(d => { run += d[1]; const b = E('', 'b', String(run)); b5.append(b); return b; });
    const rg = E('ci-ov ci-rg'), ac = E('ci-ov ci-ac'), ring = E('ci-ov ci-ring');
    grid.append(rg, ac, ring);
    const chips = data.map((d, i) => { const c = E('ci-chip', 'div', String(d[1])); c.style.top = (3.9 + 2 * i) + 'em'; grid.append(c); return c; });
    sheet.append(fx, grid);

    // pavage de cellules sur le vrai symbole : elles se retirent et laissent apparaître les vraies formes
    const NS = 'http://www.w3.org/2000/svg', tl = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const r = document.createElementNS(NS, 'rect'); r.setAttribute('class', 'ci-tile');
      r.setAttribute('x', x * 8); r.setAttribute('y', y * 8); r.setAttribute('width', 8); r.setAttribute('height', 8);
      r.style.transformBox = 'fill-box'; r.style.transformOrigin = 'center';
      tiles.append(r); tl.push({ r, d: Math.hypot(x * 8 + 4 - 32, y * 8 + 4 - 32) });
    }

    // 1) environnement
    at($('ciSheet'), [{ opacity: 0, transform: 'translateY(.6em) scale(.97)' }, { opacity: 1, transform: 'none' }], 0, 420);
    cells.forEach(o => at(o.el, [{ opacity: 0 }, { opacity: 1 }], 60 + (o.r + o.c) * 24, 260, EASE_IN));
    at(fx, [{ opacity: 0 }, { opacity: 1 }], 120, 300);
    at(sp.querySelector('.ci-bg'), [{ opacity: 0 }, { opacity: 1 }], 0, 600);
    // valeurs
    content.forEach(o => { at(o.t, [{ opacity: 0, transform: 'translateY(.5em)' }, { opacity: 1, transform: 'none' }], 520 + (o.r * 3 + o.c) * 24, 300, EASE_IN); });
    // 2) formule tapée, caret qui suit
    const S0 = 780, STEP = 38;
    at(ac, [{ opacity: 0 }, { opacity: 1 }], S0 - 40, 160);
    at(caret0, [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 1 }], 380, S0 - 380, 'steps(1,end)', 'both');
    at(caret0, [{ opacity: 0 }, { opacity: 0 }], S0, 1, 'linear', 'forwards');
    chars.forEach((c, i) => {
      at(c, [{ opacity: 0 }, { opacity: 1 }], S0 + i * STEP, 1, 'linear', 'forwards');
      at(c.lastElementChild, [{ opacity: 1 }, { opacity: 1 }], S0 + i * STEP, STEP, 'linear', 'none');
    });
    // (le caret de chaque caractère n'est visible que pendant sa frappe)
    const lastCaret = chars[chars.length - 1].lastElementChild;
    at(lastCaret, [{ opacity: 1 }, { opacity: 0 }], S0 + chars.length * STEP, 240, 'steps(1,end)', 'both');
    // plage visée surlignée dès que « B2 » est tapé
    const tr = S0 + 9 * STEP;
    at(rg, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], tr, 220);
    // 3) le calcul s'exécute : les valeurs convergent vers B5
    const D = [1320, 1390, 1460], FL = 250, dys = [0, 1, 2].map(i => 9.9 - (3.9 + 2 * i));
    chips.forEach((c, i) => {
      at(c, [{ opacity: 1, transform: 'none' }, { opacity: 1, transform: `translateY(${dys[i] * .8}em)`, offset: .75 }, { opacity: 0, transform: `translateY(${dys[i]}em) scale(.85)` }], D[i], FL, EASE_M, 'forwards');
      at(content.find(o => o.r === i + 2 && o.c === 2).el, [{ color: 'rgb(255 255 255 / .92)' }, { color: 'rgb(255 255 255 / .35)' }], D[i], 200, 'linear', 'forwards');
    });
    partial.forEach((b, i) => {
      const on = D[i] + FL; at(b, [{ opacity: 1 }, { opacity: 1 }], on, 1, 'linear', 'forwards');
      if (i < 2) at(b, [{ opacity: 0 }, { opacity: 0 }], D[i + 1] + FL, 1, 'linear', 'forwards');
    });
    const done = D[2] + FL;
    at(partial[2], [{ transform: 'scale(1.35)' }, { transform: 'none' }], done, 260, EASE_IN);
    at(ring, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.5,1.9)' }], done, 420, EASE_IN, 'both');
    at(rg, [{ opacity: 1 }, { opacity: 0 }], done + 40, 200, 'linear', 'forwards');
    // 4) transformation : la feuille se replie en pavage de cellules, qui se retirent sur le symbole officiel
    const X = 1850;
    at(sheet, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.46)' }], X, 400, EASE_IO, 'forwards');
    at(mark, [{ opacity: 0 }, { opacity: 1 }], X + 60, 240, 'linear', 'both');
    tl.forEach(o => at(o.r, [{ transform: 'scale(1)' }, { transform: 'scale(0)' }], X + 280 + o.d / 45 * 300, 280, EASE_IO));
    at(sp.querySelector('.ci-glow'), [{ opacity: 0 }, { opacity: 1 }], X + 300, 700, 'linear');
    // 5) nom, signature, chargement
    at($('ciWord'), [{ opacity: 0, transform: 'translateY(.35em)', clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], 2350, 520, EASE_IN);
    at($('ciTag'), [{ opacity: 0, transform: 'translateY(.4em)' }, { opacity: 1, transform: 'none' }], 2560, 400, EASE_IN);
    at($('ciBar'), [{ opacity: 0 }, { opacity: 1 }], 2300, 500, 'linear');
    at($('spMsg'), [{ opacity: 0 }, { opacity: 1 }], 2300, 500, 'linear');
  }

  function start() {
    const btn = $('ciSkip');
    if (reduce || (seen && !force)) {
      st.hold = reduce ? REDUCED_HOLD : SEEN_HOLD;
      if (reduce) { const m = $('ciMark'); try { m.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, fill: 'both' }); } catch (e) {} }
      if (btn) btn.remove();
      return;
    }
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    st.playing = true;
    try {
      scene();
      if (btn) { btn.hidden = false; btn.addEventListener('click', skip); }
      document.addEventListener('keydown', onKey, true);
      // fin naturelle : on retire le décor de la scène
      setTimeout(() => { if (st.playing) { try { finish(); } catch (e) {} } }, 3000);
    } catch (e) {
      st.playing = false; st.hold = REDUCED_HOLD; A.forEach(a => { try { a.cancel(); } catch (e2) {} });
      ['ciSheet', 'ciTiles', 'ciSkip'].forEach(id => { const x = $(id); if (x) x.remove(); });
      try { console.warn('intro: scène ignorée', e); } catch (e3) {}
    }
  }
  start();
})();
