/* ---------- Assainissement du HTML : documents ouverts, collés, importés ou partagés (aucun script, aucun gestionnaire d'événement) ---------- */
const SAN = (() => {
  const KEEP = new Set(('p br div span b strong i em u s strike del ins mark sub sup small a h1 h2 h3 h4 h5 h6 ul ol li blockquote pre code hr '
    + 'table thead tbody tfoot tr th td colgroup col caption figure figcaption img section article header footer aside nav label time abbr cite q kbd').split(' '));
  const SVG = new Set('svg path circle rect g defs lineargradient radialgradient stop ellipse polygon line polyline text tspan'.split(' '));
  const DROP = new Set('script style iframe object embed link meta form input textarea select button noscript template frame frameset base title head foreignobject animate animatemotion animatetransform set use image audio video source track canvas map area applet math'.split(' '));
  const ATTR = new Set('class style href src alt title colspan rowspan width height contenteditable lang dir start type datetime'.split(' '));
  const SVGATTR = new Set('viewbox d fill stroke stroke-width stroke-linecap stroke-linejoin stroke-dasharray cx cy r rx ry x y x1 x2 y1 y2 width height offset stop-color stop-opacity points transform opacity fill-opacity preserveaspectratio xmlns gradienttransform gradientunits id class style text-anchor font-size font-weight font-family'.split(' '));
  const okUrl = (u, img) => { const v = String(u || '').trim().replace(/[\u0000-\u001F\s]+/g, ''); if (!v) return false;
    // une image SVG affichée par <img> ne peut exécuter aucun script : on l'accepte comme les autres formats
    if (img) return /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(v) || /^https:\/\//i.test(v);
    return /^(https?:|mailto:|tel:|#)/i.test(v); };
  const cleanStyle = s => String(s || '').split(';').map(x => x.trim()).filter(x => {
    if (!x) return false; const l = x.toLowerCase();
    if (/expression\s*\(|javascript:|behavior\s*:|-moz-binding|@import/.test(l)) return false;
    if (/url\s*\(/.test(l) && !/url\s*\(\s*['"]?data:image\/(png|jpe?g|gif|webp);base64,/.test(l)) return false;
    if (/^position\s*:\s*(fixed|sticky)/.test(l)) return false;
    return true;
  }).join('; ');
  function walk(node, preview){
    for (const el of [...node.children]){
      const tag = el.localName.toLowerCase(), isSvg = el.namespaceURI === 'http://www.w3.org/2000/svg';
      if (DROP.has(tag) || (preview && (tag === 'img'))){ el.remove(); continue; }
      walk(el, preview);   // descendants d'abord : un élément déballé ne laisse passer que du contenu déjà assaini
      if (!KEEP.has(tag) && !(isSvg && SVG.has(tag))){
        if (tag === 'font'){ const sp = el.ownerDocument.createElement('span'); const st = [];
          const col = el.getAttribute('color'), face = el.getAttribute('face');
          if (col && /^[#\w(),.\s%]+$/.test(col)) st.push('color:' + col); if (face && /^[\w\s,'"-]+$/.test(face)) st.push('font-family:' + face);
          if (st.length) sp.setAttribute('style', st.join(';')); while (el.firstChild) sp.appendChild(el.firstChild); el.replaceWith(sp); continue; }
        // élément inconnu (balises Word o:p, etc.) : on garde son contenu
        const parent = el.parentNode; while (el.firstChild) parent.insertBefore(el.firstChild, el); el.remove(); continue;
      }
      for (const a of [...el.attributes]){
        const n = a.name.toLowerCase();
        if (n.startsWith('on')){ el.removeAttribute(a.name); continue; }
        if (n.startsWith('data-')){ if (!/^data-(sw[\w-]*|done|align|level|cols|style|wrap|w)$/.test(n)) el.removeAttribute(a.name); continue; }
        if (isSvg){ if (!SVGATTR.has(n)) el.removeAttribute(a.name); else if (/url\s*\(\s*['"]?(?!#)/i.test(a.value) || /javascript:/i.test(a.value)) el.removeAttribute(a.name); continue; }
        if (!ATTR.has(n)){ el.removeAttribute(a.name); continue; }
        if (n === 'href' && !okUrl(a.value)) el.removeAttribute('href');
        else if (n === 'src' && !(tag === 'img' && okUrl(a.value, true))) el.remove();
        else if (n === 'style'){ const c = cleanStyle(a.value); c ? el.setAttribute('style', c) : el.removeAttribute('style'); }
        else if (n === 'contenteditable' && a.value !== 'false') el.removeAttribute(a.name);
      }
      if (tag === 'a' && el.getAttribute('href') && !el.getAttribute('href').startsWith('#')){ el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
    }
  }
  return function sanitize(html, opts = {}){
    if (!html) return '';
    const doc = new DOMParser().parseFromString('<!doctype html><body>' + String(html), 'text/html');
    doc.body.querySelectorAll('.sw-pbs').forEach(x => x.remove());
    walk(doc.body, !!opts.preview);
    // les anciens repères de pagination ne sont jamais conservés
    doc.body.querySelectorAll('[style*="--pb"]').forEach(e => e.style.removeProperty('--pb'));
    doc.body.querySelectorAll('a[target]').forEach(a => { if (!a.getAttribute('href')) { a.removeAttribute('target'); a.removeAttribute('rel'); } });
    return doc.body.innerHTML;
  };
})();
window.SWSanitize = SAN;
