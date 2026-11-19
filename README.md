# Flappy Head

Flappy Bird jouable dans le navigateur (HTML/CSS/JS pur, aucune dépendance).

## Changer la tête
1. Mets ta photo dans ce dossier, par exemple `head.png` (de préférence carrée, visage centré).
2. Ouvre `game.js` et modifie la première ligne de réglages :
   `const HEAD_SRC = 'head.png';`

La photo est automatiquement recadrée en rond.

## Changer le texte de fin
Dans `game.js` : `const GAME_OVER_TEXT = 'SINGLE';`

## Tester en local
Ouvre simplement `index.html` dans un navigateur.

## Mettre en ligne (gratuit)
- **Netlify Drop** : va sur app.netlify.com/drop et glisse-dépose le dossier.
- **Netlify / Vercel / GitHub Pages** : connecte ton dépôt GitHub, aucune commande de build, dossier de publication = racine.

Le meilleur score est sauvegardé dans le navigateur du joueur (localStorage).
