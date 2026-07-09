# Assets a fournir pour atteindre le rendu cible de la touche

Le comportement et la structure des ecrans `entrainement` et `match` sont maintenant en place avec des placeholders Phaser.

Pour atteindre le rendu pixel-art montre dans les maquettes, il manque encore les assets suivants.

## Terrain

- `public/assets/images/lineout-pitch-training.png`
  - fond terrain portrait pour l'entrainement
- `public/assets/images/lineout-pitch-match.png`
  - fond terrain portrait pour le mode match

## Joueurs

- `public/assets/sprites/rugby-player/{gabarit}/{pose}/{calque}.png`
  - gabarits : `small_slim`, `small_standard`, `small_large`, `medium_slim`, `medium_standard`, `medium_large`, `large_slim`, `large_standard`, `large_large`
  - poses : `stand_front`, `stand_back`, `hooker_ready_back`, `hooker_throw_back`, `jumper_catch_front`, `lifter_front`, `lifter_back`, `receiver_front`
  - calques : `body`, `jersey`, `shorts`, `socks`
  - `body` contient les parties fixes : peau, cheveux, chaussures, ballon, contours et zones non recolorees
  - `jersey`, `shorts` et `socks` sont transparents avec des zones en niveaux de gris pour teinte dynamique par `setTint`
  - tous les calques d'un meme gabarit et d'une meme pose doivent avoir exactement les memes dimensions et la meme origine visuelle aux pieds

## Interface

- `public/assets/ui/lineout-training-header.png`
  - cadre/titre entrainement
- `public/assets/ui/lineout-match-scoreboard.png`
  - bandeau score/chrono du mode match
- `public/assets/ui/lineout-banner-gold.png`
  - bandeau d'annonce de la touche
- `public/assets/ui/lineout-panel-dark.png`
  - panneau sombre pour consignes et stats

## Icones optionnelles

- `public/assets/icons/lineout-hand.png`
  - icone main pour la consigne d'entrainement
- `public/assets/icons/lineout-ball.png`
  - ballon pour le bandeau match

Les placeholders actuels respectent cette arborescence et pourront etre remplaces fichier par fichier par les sprites finaux.
