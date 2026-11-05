# Règles Firestore : elles ne sont plus dans ce dépôt

Toutes les apps Studio Prism partagent **un seul projet Firebase** (`archivision-studioprism`) et donc **un seul fichier de règles en ligne**.
Pour éviter qu'une copie ancienne écrase les règles des autres apps, la source unique est désormais dans le dépôt **Studio-Prism** :

- règles par app : `Studio-Prism/firebase/rules/*.rules`
- fichier complet à publier : `Studio-Prism/firebase/firestore.rules` (assemblé et contrôlé par `python3 tools/build_rules.py`)
- publication : depuis Studio-Prism uniquement (`firebase deploy --only firestore:rules`, ou coller le fichier complet dans la console)

Pour tester en local (émulateur), récupérer le fichier complet :

    curl -fsSL https://raw.githubusercontent.com/groupestudioprism/Studio-Prism/main/firebase/firestore.rules -o firebase/firestore.rules

(ce fichier téléchargé est ignoré par git).

## À republier : collection `scScripts` (Communauté des scripts, interface Développeur)

SPECTRA Calc utilise la collection **`scScripts`** (+ sous-document `content/main` pour le code) : macros et fonctions personnalisées partagées.
Les règles correspondantes sont dans `Studio-Prism/firebase/rules/21-spectra-calc.rules` (commit « Règles Firestore : scScripts »).
**Il faut republier le fichier complet `Studio-Prism/firebase/firestore.rules`** (console Firebase → Firestore → Règles, ou `firebase deploy --only firestore:rules`),
sinon l'onglet Communauté du Développeur affiche « s'ouvrira dès que les règles seront publiées ».

- Soumission : statut `pending` imposé, compteurs à zéro ; seul un administrateur (`isAdmin()` : profil `users/{uid}` actif avec `role == 'admin'`,
  le même critère que le site Studio Prism) peut passer à `published` ou `rejected` (motif obligatoire côté interface).
- Le code (`content/main`) n'est modifiable par l'auteur que tant que le script est `pending` : un script validé ne peut plus changer en douce.
- Lecture : scripts publiés pour tout membre connecté, ses propres scripts pour l'auteur, tout pour les administrateurs (file de validation).
- Compteur d'installations (+1 par membre) et signalement (une fois par compte, 3 signalements masquent le script).
