# SPECTRA Calc face à Excel et Canva — liste des écarts

Établie le 04/11/2026 à partir de la documentation Microsoft (« Fonctions Excel par catégorie », types de graphiques d'Excel 2016 à 365, options de mise en forme conditionnelle, validation, tableaux croisés) et de l'aide Canva (« Choose chart types », graphiques infographiques). Sources : support.microsoft.com/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb, canva.com/help/chart-types, vertex42.com (nouveaux graphiques Excel 2016).

Légende : ✅ déjà présent avant ce lot · 🆕 ajouté en novembre 2026 · ⏳ reste à faire.
Priorité (P1 = très utilisé au quotidien, P3 = usage expert).

## 1. Fonctions et formules

| Catégorie | Excel | SPECTRA Calc avant | Écart et priorité | État |
| --- | --- | --- | --- | --- |
| Maths et trigo | ~80 | 40 | COMBIN, PERMUT, MULTINOMIAL, SOMME.SERIES, BASE, DECIMAL, CHIFFRE.ARABE, PRODUITMAT, INVERSEMAT, DETERMAT, MATRICE.UNITAIRE, TABLEAU.ALEA, fonctions hyperboliques, COT/CSC/SEC, SOMME.X2MY2… (P2) | 🆕 |
| Statistiques | ~110 | 26 | MOYENNE.GEOMETRIQUE / HARMONIQUE, ECART.MOYEN, SOMME.CARRES.ECARTS, KURTOSIS, COEFFICIENT.ASYMETRIE, LOI.NORMALE(.N/.STANDARD/.INVERSE), LOI.BINOMIALE, LOI.POISSON, LOI.EXPONENTIELLE, LOI.STUDENT, INTERVALLE.CONFIANCE, RANG.MOYEN, RANG.POURCENTAGE, CENTILE.EXCLURE, QUARTILE.EXCLURE, FREQUENCE, TENDANCE, CROISSANCE, COEFFICIENT.DETERMINATION, ERREUR.TYPE.XY, COVARIANCE, MOYENNE.REDUITE, NBVAL/MAXA/MINA, CENTREE.REDUITE, FISHER, PROBABILITE (P1-P2) | 🆕 |
| Logique | 12 | 10 | LAMBDA, MAP, REDUCE, SCAN, BYROW, BYCOL, MAKEARRAY (P2) | 🆕 |
| Recherche et matrices | ~40 | 19 | CHOISIRCOLS, CHOISIRLIGNES, EXCLURE (DROP), DEVELOPPER (EXPAND), ORGA.COLS / ORGA.LIGNES (TOCOL / TOROW), BOUCLAGE.LIGNES / COLONNES (WRAPROWS / WRAPCOLS), FORMULETEXTE, ZONES, GROUPER.PAR et PIVOTER.PAR (GROUPBY / PIVOTBY) (P1-P2) | 🆕 |
| Texte | ~50 | 27 | REGEX.TEST / REGEX.EXTRAIRE / REGEX.REMPLACER, VALEUR.EN.TEXTE, TABLEAU.EN.TEXTE, UNICODE, CNUM avec séparateurs, TEXTE.AVANT/APRES avec occurrence (P1-P2) | 🆕 |
| Date et heure | 25 | 22 | TEMPSVAL, SERIE.JOUR.OUVRE.INTL, NB.JOURS.OUVRES.INTL (P2) | 🆕 |
| Finances | ~55 | 12 | DDB, DB, SYD (amortissements), CUMUL.INTER, CUMUL.PRINCPER, TAUX.NOMINAL, VAN.PAIEMENTS (XNPV), TRI.PAIEMENTS (XIRR), TRIM (MIRR), VC.PAIEMENTS, PDUREE, TAUX.INT.EQUIV, ISPMT (P2) | 🆕 |
| Base de données | 12 | 0 | BDSOMME, BDNB, BDNBVAL, BDMOYENNE, BDMAX, BDMIN, BDLIRE, BDPRODUIT, BDECARTYPE, BDVAR (P2) | 🆕 |
| Ingénierie | ~54 | 0 | CONVERT (unités : longueurs, masses, surfaces, volumes, températures, pressions, énergie…), DECBIN / BINDEC / DECHEX / HEXDEC / DECOCT / OCTDEC, BITET / BITOU / BITOUEXCLUSIF, DELTA, SUP.SEUIL, ERF (P2) ; nombres complexes (P3) | 🆕 (complexes ⏳) |
| Informations | 20 | 14 | CELLULE (adresse, ligne, col, contenu, type, format), INFORMATIONS, ESTREF, N déjà, FEUILLES (P3) | 🆕 |
| Cubes / Web | 10 | 0 | Sans objet hors ligne (P3) | ⏳ |
| **Au-delà d'Excel** | — | — | NOMBRE.EN.LETTRES (montants en toutes lettres pour factures et chèques), PAQUES, JOURS.FERIES (France), EST.FERIE, TVA / HT / TTC, SPARKLINE dans la cellule (comme Google Sheets), POURCENTAGE.EVOLUTION, IBAN.VALIDE, SIRET.VALIDE | 🆕 |

## 2. Mise en forme conditionnelle

| Excel | Avant | État |
| --- | --- | --- |
| Règles de surbrillance : supérieur, inférieur, entre, égal, texte contenant, date, doublons | ✅ (sauf commence/finit par, dates relatives variées) | 🆕 commence par, finit par, ne contient pas, hier / aujourd'hui / demain / 7 derniers jours / ce mois / mois dernier / mois prochain / cette année, erreurs, sans erreur |
| Règles des valeurs plus/moins élevées : 10 premiers, 10 % premiers, 10 derniers, 10 % derniers, au-dessus / en dessous de la moyenne | partiel (10 premiers, au-dessus) | 🆕 tous, avec nombre réglable |
| Barres de données (dégradé, plein, négatifs) | ✅ dégradé | 🆕 barres pleines, barres négatives rouges, couleur au choix |
| Nuances de couleurs (2 et 3 couleurs) | ✅ 2 préréglages | 🆕 8 nuances prêtes + couleurs au choix |
| Jeux d'icônes (flèches, feux, drapeaux, étoiles, coches, notes 5 niveaux…) | 1 jeu (flèches) | 🆕 10 jeux |
| Gestionnaire de règles : modifier, réordonner, « Interrompre si vrai » | supprimer seulement | 🆕 modifier, monter/descendre, interrompre |
| Styles de mise en forme (police, remplissage, bordure) | 6 couleurs + gras | 🆕 12 couleurs, gras, italique, barré |

## 3. Graphiques

| Type | Excel | Canva | Avant | État |
| --- | --- | --- | --- | --- |
| Colonnes, barres, courbes, aires, secteurs, anneau, nuage | ✅ | ✅ | ✅ | ✅ |
| Colonnes empilées | ✅ | ✅ | ✅ | ✅ |
| Barres empilées, colonnes / barres 100 %, aires empilées | ✅ | partiel | — | 🆕 |
| Courbes lissées, en escalier | ✅ (lissée) | ✅ | — | 🆕 |
| Combiné colonnes + courbe | ✅ | — | — | 🆕 |
| Bulles | ✅ | ✅ | — | 🆕 |
| Radar | ✅ | ✅ | — | 🆕 |
| Cascade (waterfall) | ✅ | — | — | 🆕 |
| Entonnoir | ✅ | ✅ | — | 🆕 |
| Histogramme | ✅ | ✅ | — | 🆕 |
| Boîte à moustaches | ✅ | — | — | 🆕 |
| Compartimentage (treemap) | ✅ | ✅ (hiérarchie) | — | 🆕 |
| Jauge / anneau de progression, barre de progression, pictogramme, chiffre clé | — | ✅ (infographies) | — | 🆕 |
| Rayons de soleil, carte géographique, boursier, surface 3D | ✅ | — | — | ⏳ (P3) |
| Course de barres animée | — | ✅ | — | ⏳ (P3) |
| Graphiques sparkline dans la cellule | ✅ (courbe, colonnes, gain/perte) | — | — | 🆕 (fonction SPARKLINE + menu) |
| Options : titres d'axes, quadrillage, légende (position), étiquettes, courbe de tendance, couleurs par série, min / max d'axe, style de fond | ✅ | partiel | titre, légende, étiquettes | 🆕 |

## 4. Données

| Excel | Avant | État |
| --- | --- | --- |
| Tableau croisé dynamique (lignes, colonnes, valeurs, somme / nombre / moyenne / max / min, actualisation) | — | 🆕 (P1) |
| Validation : liste, nombre entier, décimal, date, longueur du texte, formule, message de saisie, alerte d'erreur | liste seulement | 🆕 (P1) |
| Filtres : valeurs, texte (contient, commence par…), nombres (supérieur, entre, 10 premiers, au-dessus de la moyenne), couleur | valeurs + recherche | 🆕 filtres de texte et de nombres |
| Tri multi-niveaux | ✅ | ✅ |
| Supprimer les doublons, convertir en colonnes, transposer | ✅ | ✅ |
| Remplissage instantané (Flash Fill) | — | 🆕 (P2) |
| Sous-totaux automatiques par groupe | — | 🆕 (P2) |
| Valeur cible (Goal Seek) | — | 🆕 (P2) |
| Grouper / plan (lignes repliables) | — | ⏳ (P3) |
| Gestionnaire de scénarios, table de données, solveur | — | ⏳ (P3) |
| Requêtes Power Query, modèle de données | — | ⏳ (hors périmètre) |

## 5. Styles, texte et objets

| Excel / Canva | Avant | État |
| --- | --- | --- |
| Styles de cellules (Titre, En-tête, Bon, Neutre, Mauvais, Entrée, Calcul, Remarque, Total, Avertissement…) | — | 🆕 (P1) |
| Reproduire la mise en forme (pinceau) | — | 🆕 (P1) |
| Barré, exposant, rotation du texte (45°, 90°, vertical) | barré (raccourci) | 🆕 barré dans la barre, rotation |
| Bordures pointillées, tirets, couleur | couleur, épais, double | 🆕 pointillés et tirets |
| Formats : comptabilité, fraction, téléphone, code postal, SIRET, milliers « k », millions « M » | partiel | 🆕 |
| Formes (rectangle, cercle, flèches, bulles, étoile…), zones de texte, images, icônes / émojis (Canva) | — (l'entrée image existait sans être branchée) | 🆕 (P1) |
| WordArt, SmartArt | — | ⏳ (P3) |
| Afficher les formules (Ctrl + `), protection de feuille | — / partiel | 🆕 afficher les formules, protection de feuille |
| Mise en page : orientation, ajustement à une page, quadrillage et en-têtes à l'impression | automatique | 🆕 (P2) |

## 6. Ordre d'implémentation retenu (du plus utilisé au moins utilisé)

1. Fonctions courantes manquantes (statistiques, recherche matricielle, texte, finances, base de données, conversions) et fonctions « au-delà d'Excel ».
2. Mise en forme conditionnelle complète (jeux d'icônes, top/bottom %, dates relatives, gestionnaire de règles).
3. Graphiques : nouveaux types Excel + infographies Canva + options d'axes et de style + sparklines.
4. Tableau croisé dynamique, validation des données complète, filtres de texte et de nombres.
5. Styles de cellules, pinceau, rotation, formats spéciaux.
6. Formes, zones de texte, images, émojis sur la feuille.
7. Valeur cible, remplissage instantané, sous-totaux, afficher les formules, protection, mise en page.
