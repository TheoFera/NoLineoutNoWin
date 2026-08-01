# Assets de la touche

Les écrans d’entraînement et de match utilisent les assets présents dans `public/assets`.
Ils ne dépendent plus de placeholders Phaser destinés à être remplacés avant la sortie.

## Terrain et ballon

- `public/assets/images/lineout-pitch-training.png` sert de fond portrait à la touche et au match.
- `public/assets/sprites/ball.png` et `ball2.png` servent aux animations du ballon.

## Joueurs

Les sprites disponibles couvrent les gabarits `medium_standard` et `medium_large`.
Chaque pose est composée de calques séparés (`body`, `details`, `jersey`, `shorts` et `socks`) afin que les couleurs des équipes puissent être appliquées dynamiquement.

Lorsqu’une pose spécialisée n’existe pas pour un gabarit, le système utilise une pose de repli existante. Ce comportement est volontaire et testé ; l’absence d’une variante graphique ne bloque donc pas l’affichage du joueur.

De nouveaux gabarits ou de nouvelles poses pourront être ajoutés plus tard sans modifier le fonctionnement du jeu.
