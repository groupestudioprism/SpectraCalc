#!/usr/bin/env python3
"""Assemble SPECTRA Calc en un seul fichier HTML à partir des sources de src/.

  src/parts/head.html         titre, icônes, polices de l'interface
  src/css/*.css               styles (ordre : CSS_ORDER)
  src/parts/body.html         structure : intro, compte, accueil, éditeur
  src/sheet/*.js              tableur (script classique, fichiers concaténés dans l'ordre alphabétique, une seule IIFE)
  src/js/auth.js + cloud.js + community.js + ai.js + auth-end.js   compte Studio Prism, cloud, accueil (une seule IIFE)

Sorties :
  index.html                         site en ligne (GitHub Pages) : Firebase branché (projet Studio Prism)
  dist/spectracalc-demo.html       démo autonome (comptes et documents dans le navigateur)
Usage : python3 tools/build.py
"""
import pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
S = ROOT / 'src'
CSS_ORDER = ['base.css', 'splash.css', 'auth.css', 'home.css', 'shell.css', 'calc.css']
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
    return (rd('parts/head.html') + '<style>\n' + ''.join(rd('css/' + c) for c in CSS_ORDER) + '</style>\n</head><body>\n' + rd('parts/body.html').replace('<!--INTRO-->', '<script>\n' + rd('js/intro.js') + '</script>')
            + "<script>\n(() => {\n'use strict';\n" + editor + '})();\n</script>\n'
            + '<script>\n' + rd('js/auth.js') + rd('js/cloud.js') + rd('js/community.js') + rd('js/ai.js') + rd('js/auth-end.js') + '</script>\n')
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
def main(argv):
    body = assemble()
    assert body.count('const FIREBASE_CONFIG = null;') == 1 and f"FIREBASE_VERSION = '{FB}'" in body
    desc = 'SPECTRA Calc · Studio Prism : le tableur simple comme Canva et plus puissant qu\'Excel.'
    (ROOT / 'dist').mkdir(exist_ok=True)
    demo = head(desc).replace('<link rel="preload"', '<link rel="x-preload"') + body.replace('<title>SPECTRA Calc</title>', '<title>SPECTRA Calc · démo</title>', 1) + '</body></html>\n'
    (ROOT / 'dist' / 'spectracalc-demo.html').write_text(demo.replace('href="assets/', 'href="../assets/').replace('href="manifest.webmanifest"', 'href="../manifest.webmanifest"'), encoding='utf-8')
    live = head(desc) + body.replace('const FIREBASE_CONFIG = null;', CONFIG).replace('<title>SPECTRA Calc</title>', '<title>SPECTRA Calc · Studio Prism</title>', 1) + '</body></html>\n'
    (ROOT / 'index.html').write_text(live, encoding='utf-8')
    print('index.html', len(live), 'octets · dist/spectracalc-demo.html', len(demo), 'octets')
if __name__ == '__main__': main(sys.argv[1:])
