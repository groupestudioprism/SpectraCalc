#!/usr/bin/env python3
"""Assemble SPECTRA Calc en un seul fichier HTML à partir des sources de src/.

  src/parts/head.html         titre, icônes, polices de l'interface
  src/css/*.css               styles (ordre : CSS_ORDER)
  src/parts/body.html         structure : intro, compte, accueil, éditeur
  src/sheet/*.js              tableur (script classique, fichiers concaténés dans l'ordre alphabétique, une seule IIFE)
  src/js/sandbox-worker.js   moteur des macros (embarqué dans <script type=text/plain id=scWorkerSrc>)
  src/js/auth.js + cloud.js + community.js + scripts.js + ai.js + auth-end.js   compte Studio Prism, cloud, accueil (une seule IIFE)

Sorties :
  index.html                         site en ligne (GitHub Pages) : Firebase branché (projet Studio Prism)
  dist/spectracalc-demo.html       démo autonome (comptes et documents dans le navigateur)
Usage : python3 tools/build.py
"""
import pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
S = ROOT / 'src'
CSS_ORDER = ['base.css', 'splash.css', 'auth.css', 'home.css', 'shell.css', 'calc.css', 'dev.css']
FB = '10.12.2'
CONFIG = '''const FIREBASE_CONFIG = {
  // Projet Firebase de Studio Prism : le même que le site et qu'ARCHIPLAN. Configuration publique par conception
  // (la sécurité repose sur les règles Firestore, voir les règles Firestore (dépôt Studio-Prism, firebase/rules)).
  apiKey: "AIzaSyAAD5rrHuVh6_PC2_45L3y9F7zWe5ACW6E",
  authDomain: "archivision-studioprism.firebaseapp.com",
  projectId: "archivision-studioprism",
  storageBucket: "archivision-studioprism.firebasestorage.app",
  messagingSenderId: "226072216517",
  appId: "1:226072216517:web:0aeef645a4f1481fe801ac"
};'''
def rd(p): return (S / p).read_text(encoding='utf-8')
def assemble():
    editor = ''.join(f'/* ==== {f.name} ==== */\n' + f.read_text(encoding='utf-8') + '\n' for f in sorted((S / 'sheet').glob('*.js')))
    worker = rd('js/sandbox-worker.js'); assert '</script' not in worker.lower()
    return (rd('parts/head.html') + '<style>\n' + ''.join(rd('css/' + c) for c in CSS_ORDER) + '</style>\n</head><body>\n' + rd('parts/body.html').replace('<!--INTRO-->', '<script>\n' + rd('js/intro.js') + '</script>')
            + '<script type="text/plain" id="scWorkerSrc">\n' + worker + '</script>\n'
            + "<script>\n(() => {\n'use strict';\n" + editor + '})();\n</script>\n'
            + '<script>\n' + rd('js/auth.js') + rd('js/cloud.js') + rd('js/community.js') + rd('js/scripts.js') + rd('js/ai.js') + rd('js/auth-end.js') + '</script>\n')
def head(desc):
    return ('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        f'<meta name="description" content="{desc}">'
        '<meta name="theme-color" content="#0C0A16">'
        '<meta property="og:title" content="SPECTRA Calc · Studio Prism"><meta property="og:description" content="Le tableur de la gamme SPECTRA : formules en français, graphiques vivants, Excel en entrée et en sortie.">'
        '<link rel="preconnect" href="https://www.gstatic.com" crossorigin>'
        '<link rel="preconnect" href="https://firestore.googleapis.com">'
        '<link rel="preconnect" href="https://identitytoolkit.googleapis.com">'
        '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>'
        + ''.join(f'<link rel="preload" as="script" href="https://www.gstatic.com/firebasejs/{FB}/firebase-{n}-compat.js">' for n in ('app', 'auth', 'firestore')) +
        '<style>[hidden]{display:none!important}</style>\n')
# ---- référencement et informations légales (ajouté le 19/11/2026, voir README) ----
SEO_URL = 'https://spectracalc.studio-prism.com/'
SEO_TITLE = 'SPECTRA Calc — Tableur en ligne gratuit · Studio Prism'
SEO_IMG = 'assets/spectra-calc-512.png'
SEO_CAT = 'BusinessApplication'
SP_LEGAL = 'https://studio-prism.com/'
def _spseo(live):
    import json as _j, re as _re, html as _h
    m = _re.search(r'<meta name="description" content="([^"]*)"', live); desc = _h.unescape(m.group(1)) if m else ''
    e = lambda s: _h.escape(s, quote=True)
    ld = {'@context': 'https://schema.org', '@type': 'SoftwareApplication', 'name': SEO_TITLE.split(' — ')[0], 'url': SEO_URL, 'description': desc,
          'applicationCategory': SEO_CAT, 'operatingSystem': 'Web (navigateur) : Windows, macOS, Linux, Android, iOS', 'inLanguage': 'fr-FR',
          'image': SEO_URL + SEO_IMG, 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR'},
          'publisher': {'@type': 'Organization', 'name': 'Studio Prism', 'url': SP_LEGAL}}
    tags = (f'<link rel="canonical" href="{SEO_URL}"><meta property="og:type" content="website"><meta property="og:site_name" content="Studio Prism">'
            f'<meta property="og:title" content="{e(SEO_TITLE)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{SEO_URL}">'
            f'<meta property="og:image" content="{SEO_URL}{SEO_IMG}"><meta property="og:locale" content="fr_FR"><meta name="twitter:card" content="summary">'
            '<script type="application/ld+json">' + _j.dumps(ld, ensure_ascii=False).replace('</', '<\\/') + '</script>')
    live = _re.sub(r'<title>[^<]*</title>', '<title>' + e(SEO_TITLE) + '</title>', live, count=1)
    live = live.replace('</head>', tags + '</head>', 1)
    nav = ('<nav class="sp-legal" aria-label="Informations légales"><a href="' + SP_LEGAL + 'mentions-legales" target="_blank" rel="noopener">Mentions légales</a>'
           '<a href="' + SP_LEGAL + 'confidentialite" target="_blank" rel="noopener">Confidentialité</a><a href="' + SP_LEGAL + 'conditions-utilisation" target="_blank" rel="noopener">CGU</a>'
           '<a href="' + SP_LEGAL + 'cgv" target="_blank" rel="noopener">CGV</a><a href="' + SP_LEGAL + 'cookies" target="_blank" rel="noopener">Cookies</a></nav>'
           '<style>.sp-legal{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:40;display:flex;flex-wrap:wrap;justify-content:center;gap:2px 14px;'
           'width:max-content;max-width:calc(100% - 16px);box-sizing:border-box;padding:4px 14px;border-radius:999px;background:rgba(255,255,255,.9);color:#3a4256;box-shadow:0 1px 4px rgba(0,0,0,.12);font:12px/1.5 Inter,system-ui,sans-serif}.sp-legal a{color:inherit;opacity:.85;text-decoration:none}.sp-legal a:hover,.sp-legal a:focus-visible{opacity:1;text-decoration:underline}</style>'
           '<script>(function(){var a=document.getElementById("auth"),n=document.querySelector(".sp-legal");if(a&&n)a.appendChild(n);else if(n)n.remove()})()</script>')
    i = live.rfind('</body>')
    return live[:i] + nav + live[i:] if i > 0 else live + nav
def _spdemo(s):
    return s.replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta name="robots" content="noindex,follow">', 1) if '<meta charset="utf-8">' in s[:300] else '<meta name="robots" content="noindex,follow">' + s

def main(argv):
    body = assemble()
    assert body.count('const FIREBASE_CONFIG = null;') == 1 and f"FIREBASE_VERSION = '{FB}'" in body
    desc = 'SPECTRA Calc · Studio Prism : le tableur simple comme Canva et plus puissant qu\'Excel.'
    (ROOT / 'dist').mkdir(exist_ok=True)
    demo = head(desc).replace('<link rel="preload"', '<link rel="x-preload"') + body.replace('<title>SPECTRA Calc</title>', '<title>SPECTRA Calc · démo</title>', 1) + '</body></html>\n'
    (ROOT / 'dist' / 'spectracalc-demo.html').write_text(_spdemo(demo.replace('href="assets/', 'href="../assets/').replace('href="manifest.webmanifest"', 'href="../manifest.webmanifest"')), encoding='utf-8')
    live = head(desc) + body.replace('const FIREBASE_CONFIG = null;', CONFIG).replace('<title>SPECTRA Calc</title>', '<title>SPECTRA Calc · Studio Prism</title>', 1) + '</body></html>\n'
    (ROOT / 'index.html').write_text(_spseo(live), encoding='utf-8')
    print('index.html', len(live), 'octets · dist/spectracalc-demo.html', len(demo), 'octets')
if __name__ == '__main__': main(sys.argv[1:])
