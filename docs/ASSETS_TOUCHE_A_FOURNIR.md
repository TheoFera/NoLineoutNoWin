# Assets à fournir pour atteindre le rendu cible de la touche

Le comportement et la structure des écrans `entraînement` et `match` sont maintenant en place avec des placeholders Phaser.

Pour atteindre le rendu pixel-art montré dans les maquettes, il manque encore les assets suivants :

## Terrain

- `public/assets/images/lineout-pitch-training.png`
  - fond terrain portrait pour l'entraînement
- `public/assets/images/lineout-pitch-match.png`
  - fond terrain portrait pour le mode match

## Joueurs

- `public/assets/sprites/player-lineout-blue.png`
  - joueur de face, équipe domicile
- `public/assets/sprites/player-lineout-red.png`
  - joueur de face, équipe adverse
- `public/assets/sprites/hooker-blue-back.png`
  - talonneur vu de dos avec ballon, équipe domicile

## Interface

- `public/assets/ui/lineout-training-header.png`
  - cadre/titre entraînement
- `public/assets/ui/lineout-match-scoreboard.png`
  - bandeau score/chrono du mode match
- `public/assets/ui/lineout-banner-gold.png`
  - bandeau d'annonce de la touche
- `public/assets/ui/lineout-panel-dark.png`
  - panneau sombre pour consignes et stats

## Icônes optionnelles

- `public/assets/icons/lineout-hand.png`
  - icône main pour la consigne d'entraînement
- `public/assets/icons/lineout-ball.png`
  - ballon pour le bandeau match

Quand ces fichiers seront fournis, la scène `src/scenes/LineoutScene.ts` pourra remplacer les rectangles/ellipses actuels par les vrais sprites.
