/* Menu du compte (accueil et éditeur) */
const um = $a('#userMenu');
const openUM = e => {
  e.stopPropagation(); if (!um.hidden){ um.hidden = true; return; }
  $a('#umName').textContent = `${me.firstName || ''} ${me.lastName || ''}`.trim() || 'Mon compte';
  $a('#umMail').textContent = me.email + (Auth.mode === 'demo' ? ' · mode démo' : '');
  $a('#umAv').textContent = initials();
  $a('#umLock').hidden = !Lock.get(me.uid)?.pin;
  const ls = licSummary(), ul = $a('#umLic'); ul.className = 'lic ' + ls.cls; ul.textContent = ls.short;
  const r = e.currentTarget.getBoundingClientRect(); um.hidden = false;
  um.style.top = Math.min(r.bottom + 8, innerHeight - um.offsetHeight - 12) + 'px';
  um.style.left = Math.max(12, Math.min(r.right - um.offsetWidth, innerWidth - um.offsetWidth - 12)) + 'px';
};
$a('#userBtn').addEventListener('click', openUM); $a('#homeUser').addEventListener('click', openUM);
document.addEventListener('click', e => { if (!um.hidden && !um.contains(e.target)) um.hidden = true; });
$a('#licBadge').addEventListener('click', () => show('licence'));
function setTheme(t){ document.documentElement.dataset.theme = t; try { localStorage.setItem('sc.theme', t); } catch(e){} }
um.addEventListener('click', e => {
  const b = e.target.closest('[data-um]'); if (!b) return; um.hidden = true;
  ({fiche:() => openClient(true), licence:() => show('licence'), home:() => showHome('home'), security:() => show('security'), lock:() => { Save.flush(true); show('lock', {noAuto:false}); }, logout:signOutAll, delete:deleteAccount,
    theme:() => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')})[b.dataset.um]();
});

/* Suppression du compte : sur le site Studio Prism (même compte), avec confirmation par mot de passe puis code PIN */
function deleteAccount(){
  if (Auth.mode === 'demo') return dlg(`<h3>Supprimer mon compte</h3><p class="dlg-p">Avec un vrai compte, ce bouton ouvre la page de suppression du site Studio Prism : votre mot de passe puis votre code PIN sont demandés.</p><div class="dlg-acts"><button type="button" class="ap-btn" data-dlg="close">Compris</button></div>`);
  confirmDlg('Supprimer mon compte Studio Prism', 'La suppression se fait sur le site Studio Prism, pour toutes les apps (SPECTRA Calc, ARCHIPLAN, Archi Vision…). Votre mot de passe puis votre code PIN vous seront demandés. Vos classeurs SPECTRA Calc seront supprimés avec le compte.', 'Continuer sur le site', async () => {
    try { if (Save.pending()) await withTimeout(Save.flush(true), 8000); } catch(e){}
    location.href = DELETE_URL + '?from=spectracalc';
  });
}

/* Tant que l'écran de compte ou une fenêtre est affiché, le clavier ne pilote pas l'éditeur */
window.addEventListener('keydown', e => {
  if (!$a('#apDlg').hidden && e.key === 'Escape'){ closeDlg(); e.stopPropagation(); return; }
  if (root().hidden) return;
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  if (pinHandler){
    if (/^\d$/.test(e.key)){ pinKey(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace'){ pinKey('del'); e.preventDefault(); }
  }
  e.stopPropagation();
}, true);

(async function start(){
  // Lien de partage (#/p/<doc>?k=…) ou classeur ouvert (#/doc/<id>) : gardé pendant la connexion
  const L = readLinkFromUrl();
  try { if (L) sessionStorage.setItem('sc.pendingLink', JSON.stringify(L)); ctx.pendingLink = L || JSON.parse(sessionStorage.getItem('sc.pendingLink') || 'null'); } catch(e){ ctx.pendingLink = L; }
  show('loading');
  bioOK = await withTimeout(Bio.available(), 1500).catch(() => false);
  try {
    const u = await Auth.init();
    if (!u) return show('login');
    me = u; startWatchP();
    Auth.verifying?.then(v => { if (me?.uid === v.uid && v.firstName){ me.firstName = v.firstName; me.lastName = v.lastName; } })
      .catch(async e => { if (isGone(e) && me?.uid === u.uid) kickOut(e); });
    if (Lock.get(u.uid)?.pin) return show('lock');
    return afterLogin(u);
  } catch(e){
    show('login', {err: e?.code === 'app/timeout' ? errMsg(e) : FIREBASE_CONFIG ? 'Le service de comptes ne répond pas. Vérifiez votre connexion, puis réessayez.' : errMsg(e)});
  }
})();
})();
