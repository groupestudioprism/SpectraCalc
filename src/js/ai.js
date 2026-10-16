/* =====================================================================
   IA de SPECTRA Calc : Gemini via Firebase AI Logic (projet Studio Prism), sans serveur.
   À activer une fois dans la console Firebase : AI Logic → Commencer → « Gemini Developer API ».
   Le SDK modulaire est chargé à la première demande seulement (aucun coût au démarrage).
   Limite quotidienne par compte (gratuit / licence), en plus des quotas configurables dans la console.
   ===================================================================== */
const AI_SDK = '13.0.0';
/* gemini-3.6-flash d'abord ; gemini-3.8-flash prend le relais quand le premier est saturé (quotas séparés) */
const AI_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash'];
const AI_DAY = {free:25, pro:300, admin:1000};
let aiInit = null, aiBlocked = '', aiBlockedAt = 0;
const aiGone = new Set();   // modèles introuvables pour ce projet
const aiDayKey = () => `sc.ai.${me?.uid || 'x'}.${new Date().toISOString().slice(0, 10)}`;
const aiUsed = () => +store.get(aiDayKey()) || 0;
const aiLimit = () => AI_DAY[planKey()] || AI_DAY.free;
function aiWhy(){
  if (!FIREBASE_CONFIG) return 'Cette version de démonstration n\'a pas d\'IA : elle fonctionne sur le site en ligne de SPECTRA Calc, avec votre compte Studio Prism. Les phrases simples (« total de la colonne C », « trie par prix », « graphique en barres »…) marchent partout.';
  if (!me) return 'Connectez-vous pour utiliser l\'IA.';
  if (aiBlocked && Date.now() - aiBlockedAt < 30000) return aiBlocked;   // on retente après 30 s : un réglage corrigé dans la console marche sans recharger
  if (aiUsed() >= aiLimit()) return `Vous avez utilisé vos ${aiLimit()} demandes à l'IA du jour${planKey() === 'free' ? ' (offre gratuite). Une licence SPECTRA Calc en donne bien plus.' : '.'} Le compteur repart demain.`;
  return '';
}
async function aiModel(sys = AI_SYSTEM, name = AI_MODELS[0]){
  if (!aiInit) aiInit = (async () => {
    const base = `https://www.gstatic.com/firebasejs/${AI_SDK}/`;
    const [A, I] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-ai.js')]);
    const app = A.getApps().find(x => x.name === 'sw-ai') || A.initializeApp(FIREBASE_CONFIG, 'sw-ai');
    return {I, ai:I.getAI(app, {backend:new I.GoogleAIBackend()})};
  })().catch(e => { aiInit = null; throw e; });
  const {I, ai} = await aiInit;
  return I.getGenerativeModel(ai, {model:name, systemInstruction:sys,
    generationConfig:{responseMimeType:'application/json', temperature:.7, maxOutputTokens:16384}});
}
const AI_SYSTEM = `Tu es Spectra, l'assistant intégré à SPECTRA Calc, le tableur de Studio Prism. Tu réponds en français.
Tu reçois une demande et le contenu de la feuille (adresses A1 et valeurs ; « formule → résultat » pour les formules). Tu réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{"reply":"une ou deux phrases : ce que tu fais, ou la réponse à la question","actions":[ … ]}
Actions possibles (n'utilise que celles-ci, dans l'ordre d'exécution) :
- {"do":"set","at":"A1","values":[["Mois","Ventes"],["Janvier","1200"]]} écrit un bloc de cellules à partir de "at" (textes, nombres, dates jj/mm/aaaa, ou formules commençant par =).
- {"do":"formula","at":"D2","formula":"=B2*C2","fill":"D2:D20"} écrit une formule et la recopie (références relatives ajustées) sur la plage "fill" (facultatif).
- {"do":"style","range":"A1:D1","style":{"b":1,"bg":"#RRGGBB","fc":"#RRGGBB","nf":"#,##0.00 €","ha":"c","fs":12}} mise en forme (nf : format comme Excel : "0", "#,##0.00", "#,##0.00 €", "0%", "0.0%", "dd/mm/yyyy", "hh:mm").
- {"do":"table","range":"A1:D20","total":true} transforme une plage en beau tableau (en-tête coloré, lignes alternées).
- {"do":"chart","type":"col|bar|line|area|pie|donut|scatter|stack","range":"A1:B13","title":"…"} graphique (première ligne = noms des séries, première colonne = catégories ; plusieurs plages possibles séparées par « ; »).
- {"do":"cf","range":"B2:B20","type":"scale|bar|gt|lt|between|eq|text|dup|top|above|neg|formula","a":1000,"b":2000,"style":{"bg":"#RRGGBB","fc":"#RRGGBB","b":1}} couleurs automatiques.
- {"do":"sort","range":"A2:D20","col":"C","asc":false} trie (sans la ligne d'en-tête).
- {"do":"filter","range":"A1:D20"} ajoute des filtres sur l'en-tête.
- {"do":"dv","range":"C2:C50","list":["À faire","En cours","Terminé"]} liste déroulante.
- {"do":"width","col":"B","w":180} largeur de colonne en pixels.
- {"do":"freeze","r":1,"c":0} fige les r premières lignes et c premières colonnes.
- {"do":"merge","range":"A1:D1"} fusionne.
- {"do":"sheet","name":"Synthèse"} crée une nouvelle feuille et y place les actions suivantes.
- {"do":"select","range":"A1:B5"} sélectionne une plage à la fin.
RÈGLES POUR LES FORMULES (très important) : syntaxe française d'Excel, noms de fonctions en français et « ; » comme séparateur d'arguments, virgule décimale. Exemples : =SOMME(B2:B13), =MOYENNE(C2:C9), =SI(B2>100;"Oui";"Non"), =RECHERCHEV(A2;Tarifs!A:B;2;FAUX), =SOMME.SI(A2:A50;"Loyer";C2:C50), =NB.SI(D2:D50;">=10"), =ARRONDI(B2*1,2;2), =AUJOURDHUI(), =DATEDIF(B2;AUJOURDHUI();"A"), =VPM(3%/12;240;-200000), =SIERREUR(B2/C2;0), =TEXTE(A2;"mmmm aaaa"), =UNIQUE(A2:A50), =FILTRE(A2:C50;C2:C50>100), =TRIER(A2:B20;2;-1), =RECHERCHEX(…).
Les références à une autre feuille s'écrivent Feuille!A1 (ou 'Nom avec espaces'!A1).
Choisis des emplacements libres : ne remplace pas des données existantes sauf si on te le demande ; pour ajouter un calcul à un tableau, mets-le dans la colonne vide à droite ou la ligne vide en dessous.
Pour créer un tableau complet : en-têtes en ligne 1 (ou à l'endroit demandé), données réalistes et utiles (pas de lorem ipsum), formules pour les totaux, puis un "table" et des formats adaptés (€, %, dates), et un graphique si c'est pertinent.
Si la demande est seulement une question, réponds dans "reply" et laisse "actions" vide (tu peux calculer de tête à partir des données fournies, en le disant).
Refuse poliment toute demande haineuse, illégale ou dangereuse.`;
function aiPrompt(q, c){
  const parts = [`Demande : ${q}`, `Classeur « ${c.title} » · feuille active « ${c.sheet} » · feuilles : ${c.sheets}`, `Cellule active : ${c.active} · sélection : ${c.selection} · tableau autour : ${c.region} · zone utilisée : ${c.used}${c.empty ? ' (feuille vide)' : ''}`];
  if (c.data) parts.push(`Contenu du tableau autour de la sélection :\n${c.data}`);
  if (c.sheetData && c.sheetData !== c.data) parts.push(`Reste de la feuille :\n${c.sheetData}`);
  parts.push(`Thèmes disponibles : ${c.themes}`);
  return parts.join('\n\n');
}
function aiParse(t){
  t = String(t || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch(e){}
  const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a){ try { return JSON.parse(t.slice(a, b + 1)); } catch(e){} }
  return {reply:t.slice(0, 600), actions:[]};
}
function aiErr(e){
  const m = String(e?.message || e || ''), code = String(e?.code || '');
  if (/Template-Only Mode/i.test(m))
    return {fatal:true, msg:'Le projet Firebase est en « mode modèles uniquement » : il refuse les demandes libres de SPECTRA Calc. Dans la console Firebase : AI Logic → onglet Paramètres → « Modèle » → désactiver « Appliquer le mode modèles uniquement » (Enforce template-only mode), puis Confirmer.'};
  if (/api-not-enabled|has not been used|SERVICE_DISABLED|requires the Firebase AI API/i.test(m + ' ' + code))
    return {fatal:true, msg:'L\'IA n\'est pas encore activée sur le projet Studio Prism. Un administrateur doit cliquer sur « Commencer » dans la console Firebase (AI Logic) : console.firebase.google.com/project/archivision-studioprism/ailogic. Si c\'est fait, patientez quelques minutes.'};
  if (/app.?check/i.test(m)) return {msg:'La demande a été refusée par App Check (protection du projet Firebase). Vérifiez la configuration App Check d\'AI Logic dans la console.'};
  if (/API key|API_KEY|referer|referrer/i.test(m)) return {msg:'La clé du projet Firebase refuse cette demande (restriction de la clé API). Autorisez l\'API « Firebase AI Logic » pour cette clé dans Google Cloud → Identifiants.'};
  if (/403|PERMISSION_DENIED/i.test(m)) return {msg:'Le projet Firebase a refusé la demande (403) : ' + (m.match(/\[403[^\]]*\]\s*([^(]{0,220})/) || [, m.slice(0, 220)])[1].trim()};
  if (/404|not found|is not supported|unknown model/i.test(m)) return {model:true, msg:'Modèle indisponible.'};
  if (/\b429\b|RESOURCE_EXHAUSTED|exceeded your current quota/i.test(m)){
    const wait = Math.ceil(parseFloat((m.match(/retry in ([\d.]+)s/i) || [])[1]) || 60), day = /per.?day|daily/i.test(m);
    return {busy:true, wait:day ? 0 : wait, msg:day ? 'Le quota gratuit du jour de l\'IA (Google) est épuisé pour tout le projet Studio Prism. Il repart demain, ou tout de suite en passant le projet Firebase au forfait Blaze.'
      : `Le quota gratuit de l'IA (quelques demandes par minute pour tout le projet Studio Prism) est atteint. Réessayez dans ${wait} s.`};
  }
  if (/\b(500|503)\b|high demand|overloaded|UNAVAILABLE/i.test(m)) return {busy:true, wait:3, msg:'Les serveurs de Google sont très sollicités en ce moment. Réessayez dans quelques secondes.'};
  if (/blocked|SAFETY|finishReason/i.test(m)) return {msg:'L\'IA a refusé cette demande. Reformulez-la autrement.'};
  if (/Failed to fetch|NetworkError|network|import/i.test(m)) return {msg:'Impossible de joindre l\'IA. Vérifiez votre connexion internet.'};
  return {msg:'Erreur de l\'IA : ' + m.slice(0, 220)};
}
async function aiCall(sys, prompt, onWait){
  const why = aiWhy(); if (why) throw new Error(why);
  const list = AI_MODELS.filter(n => !aiGone.has(n)); let last = null, waited = false;
  for (let i = 0; i < list.length; i++){
    try {
      const model = await aiModel(sys, list[i]);
      const r = await withTimeout(model.generateContent(prompt), 90000, 'ai/timeout');
      store.set(aiDayKey(), aiUsed() + 1);
      return aiParse(r.response.text());
    } catch(e){
      if (e?.code === 'ai/timeout') throw new Error('L\'IA a mis trop de temps à répondre. Réessayez avec une demande plus courte.');
      const x = aiErr(e); console.warn('[SPECTRA Calc] IA', list[i], e); last = x;
      if (x.model){ aiGone.add(list[i]); continue; }
      if (x.busy){
        if (i < list.length - 1) continue;                       // un autre modèle, avec son propre quota
        if (!waited && x.wait && x.wait <= 30){                  // dernier recours : on patiente une fois, puis on recommence
          waited = true; onWait?.(x.wait); await sleep(x.wait * 1000 + 300); i = -1; continue;
        }
      }
      if (x.fatal){ aiBlocked = x.msg; aiBlockedAt = Date.now(); }
      throw new Error(x.msg);
    }
  }
  throw new Error(last?.msg || 'Aucun modèle d\'IA disponible pour le moment.');
}
async function aiRun(q, ctx, onWait){
  const out = await aiCall(AI_SYSTEM, aiPrompt(q, ctx), onWait);
  if (!out.reply && !(out.actions || []).length) throw new Error('L\'IA a renvoyé une réponse vide. Reformulez votre demande.');
  return out;
}
const AI_MOD = `Tu es le modérateur de la bibliothèque publique de modèles de SPECTRA Calc (Studio Prism). On te donne le titre, la description et le texte d'un modèle de classeur proposé par un utilisateur.
Réponds UNIQUEMENT par un objet JSON : {"ok":true,"summary":"une phrase en français qui résume le modèle et ton avis","reasons":["…"]}.
"ok" vaut false si le contenu est haineux, violent, sexuel, discriminatoire, illégal, dangereux, trompeur (arnaque, faux classeur officiel, usurpation), du spam ou de la publicité agressive, s'il contient des données personnelles réelles apparentes (nom complet avec adresse, téléphone, email, IBAN ou numéro d'identité qui semblent réels), ou s'il est vide, absurde ou sans intérêt comme modèle.
Les zones à compléter entre crochets, les coordonnées d'exemple (06 00 00 00 00, contact@exemple.fr…) et les personnes fictives sont normales. "reasons" liste les problèmes trouvés (vide si aucun).`;
async function aiModerate(text){ const r = await aiCall(AI_MOD, text); return {ok:r.ok !== false, summary:String(r.summary || r.reply || ''), reasons:Array.isArray(r.reasons) ? r.reasons.map(String).slice(0, 6) : []}; }
window.SWAI = {available:() => !aiWhy(), why:aiWhy, run:aiRun, moderate:aiModerate, left:() => Math.max(0, aiLimit() - aiUsed()), limit:aiLimit};
