"""Outils communs des tests de bout en bout de SPECTRA Calc (démo autonome, Chromium via Playwright)."""
import functools, http.server, pathlib, threading
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'tests' / 'e2e' / 'out'; OUT.mkdir(parents=True, exist_ok=True)
RES = {'ok': 0, 'ko': 0, 'fails': []}
def check(name, cond, info=''):
    if cond: RES['ok'] += 1; print('  ✓', name)
    else: RES['ko'] += 1; RES['fails'].append(name); print('  ✗', name, info)
def serve():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT)); h.log_message = lambda *a: None
    s = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h); threading.Thread(target=s.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{s.server_port}/dist/spectracalc-demo.html'
async def signup(pg, email='test@studioprism.fr'):
    await pg.wait_for_selector('#auth:not([hidden]) .ap-tabs', timeout=30000)
    await pg.click('[data-go="signup"]'); await pg.fill('#ap-first', 'Kéliann'); await pg.fill('#ap-last', 'Mauger')
    await pg.fill('#ap-email', email); await pg.fill('#ap-pw', 'Spectra2026'); await pg.fill('#ap-pw2', 'Spectra2026')
    await pg.check('#ap-cgu'); await pg.click('#apForm button[type=submit]')
    await pg.wait_for_selector('#ap-phone', timeout=8000); await pg.fill('#ap-phone', '06 12 34 56 78'); await pg.click('#apForm button[type=submit]')
    await pg.wait_for_selector('#apSkip', timeout=8000); await pg.click('#apSkip'); await pg.wait_for_selector('#home:not([hidden])', timeout=8000); await pg.wait_for_timeout(600)
async def blank(pg):
    await pg.click('[data-tpl="blank"] >> nth=0'); await pg.wait_for_selector('#app:not([hidden])', timeout=8000); await pg.wait_for_timeout(500)
def report():
    print(f"\n{RES['ok']} réussis, {RES['ko']} en échec"); [print('  -', f) for f in RES['fails']]
    return 1 if RES['ko'] else 0
