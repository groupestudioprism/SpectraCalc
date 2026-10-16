# SPECTRA Calc · Studio Prism

Le tableur de la **gamme SPECTRA** (Writer, Calc, Slide) : simple comme Canva, plus puissant qu'Excel.
Même compte que le site Studio Prism, SPECTRA Writer, ARCHIPLAN et Archi Vision.

**En ligne :** https://groupestudioprism.github.io/SpectraCalc/
**Démo autonome** (comptes et classeurs dans le navigateur) : `dist/spectracalc-demo.html`

## Ce que fait l'app

**Connexion** : compte Studio Prism (Firebase `archivision-studioprism`), identique à SPECTRA Writer (fiche client, code PIN, empreinte / visage facultatifs, clé de licence).

**Accueil** : « Que voulez-vous calculer ? » propose le bon modèle, un classeur existant, ou fait créer le tableau par l'IA. Classeur vierge, ouverture d'un fichier Excel / CSV (ou glisser-déposer), classeurs récents, dossiers, partagés avec moi, modèles personnels et **Communauté** (publication modérée par Studio Prism, comme dans Writer).

**Modèles** : 18 classeurs prêts à l'emploi (budget, facture, devis, dépenses, Gantt, tâches, inventaire, tableau de bord des ventes, prêt immobilier, feuille de temps, invités, notes, comparatif, DPGF, surfaces, TVA, calendrier du mois…).

**Le tableur**
- Plus de 180 fonctions en français et en anglais (`SOMME`/`SUM`, `RECHERCHEX`, `SI.CONDITIONS`, `FILTRE`, `TRIER`, `UNIQUE`, `LET`, `SEQUENCE`, dates, finances, texte…), tableaux dynamiques qui débordent, références entre feuilles, noms définis, détection des références circulaires.
- Saisie intelligente : nombres, € et %, dates françaises, format deviné automatiquement ; saisie semi-automatique des fonctions avec aide ; pointage des cellules à la souris ou au clavier ; F4 pour les `$`.
- Poignée de recopie (séries de nombres, dates, jours, mois, « Lot 1 »…), Ctrl + D / Ctrl + R, copier-coller avec Excel et Google Sheets, collage des valeurs ou du format, annuler / rétablir illimité.
- **Embellir** en un clic (styles de tableau), **couleurs automatiques** (dégradés, barres de données, flèches, doublons, règles par formule), listes déroulantes colorées, cases à cocher, filtres, tri, fusion, notes, volets figés, plusieurs feuilles.
- **Graphiques** : colonnes, barres, courbes, aires, secteurs, anneau, nuage de points ; déplaçables et redimensionnables.
- **La barre Prisme** en bas (mise en forme + tiroirs Insérer, Données, Couleurs, Thème, Modèles) et **le Spectre** (Ctrl + K) : « somme de la colonne Montant », « trie par date », « colore en vert les valeurs supérieures à 1000 », « graphique en secteurs », « fige la première ligne »… Le reste part à **l'IA**, qui remplit le tableau, écrit les formules, met en forme et ajoute le graphique (aperçu avant d'appliquer, Ctrl + Z annule tout). Limite : 25 demandes par jour (gratuit), 300 (licence), 1 000 (admin).
- **Exports** : PDF (feuille ou classeur), CSV ; avec licence Excel **.xlsx** (formules, formats, couleurs, mises en forme conditionnelles, listes), page web, sauvegarde `.spectra`. **Import** : .xlsx, .csv, .spectra.
- Grille virtualisée (des milliers de lignes restent fluides), interface claire ou sombre, mobile, installable comme une application.

## Offres

| Offre | Cloud | Dossiers | Exports |
| --- | --- | --- | --- |
| Gratuite | 10 Mo | 5 privés + 3 partagés | PDF et CSV |
| Licence SPECTRA Calc (`licenses/{uid}_spectracalc`) | 50 Mo | 5 + 3 | Tous (.xlsx…) |
| Administrateur | 1 Go | 5 + 3 | Tous |

## Contenu du dépôt

| Fichier | Rôle |
| --- | --- |
| `src/parts/` | En-tête et structure de la page |
| `src/css/` | Charte SPECTRA : `base`, `splash`, `auth`, `home`, `shell`, `calc` |
| `src/sheet/` | Le tableur : formats, moteur de formules, fonctions, modèle de données, modèles, grille, édition, interface, tiroirs, graphiques, import/export, Spectre, démarrage |
| `src/js/` | Compte (`auth.js`), cloud et accueil (`cloud.js`), Communauté (`community.js`), IA (`ai.js`), menu du compte (`auth-end.js`) |
| `tools/build.py` | `python3 tools/build.py` → `index.html` (en ligne) et `dist/spectracalc-demo.html` |
| `firebase/firestore.rules` | Règles Firestore complètes (site + SPECTRA Writer, Calc et Slide), à coller telles quelles dans la console |
| `firebase/firestore-spectracalc.rules` | Le seul bloc SPECTRA Calc (pour mémoire) |

On modifie `src/`, on lance `python3 tools/build.py`, on enregistre sur `main` : GitHub Pages publie en une minute.

## À faire côté Firebase (une fois)

1. Copier **tout** `firebase/firestore.rules` dans Firebase → Firestore → Règles, en remplaçant l'existant, puis Publier.
2. Créer le produit `spectracalc` (nom « SPECTRA Calc ») dans l'administration du site, pour attribuer licences et clés.
3. L'IA est la même que celle de SPECTRA Writer (Firebase AI Logic) : rien à activer de plus. Pour dépasser le quota gratuit de Gemini, passer le projet en formule Blaze.

Tant que les règles ne sont pas publiées, l'app fonctionne quand même : les classeurs sont enregistrés **sur l'appareil**.

La configuration Firebase écrite dans `index.html` est publique par conception ; la sécurité repose sur les règles. **Ne jamais ajouter de clé privée dans ce dépôt.**
