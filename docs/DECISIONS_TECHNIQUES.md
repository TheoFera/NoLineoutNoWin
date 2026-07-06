# Décisions techniques

## Stack retenue

- TypeScript plutôt que JavaScript pur pour limiter les erreurs de structure.
- Phaser 3 pour tout le jeu, y compris les menus.
- Vite pour le développement local.
- Capacitor pour produire l'application Android.
- Android Studio pour tester et générer l'app Android.

## Pourquoi TypeScript

Le jeu manipule beaucoup de données : joueurs, équipes, positions, combinaisons, division, match, sauvegarde. TypeScript évite les erreurs simples : mauvais nom de champ, stat inexistante, position hors 1..7.

## Pourquoi Phaser partout

Cela évite de mélanger DOM HTML et canvas Phaser. Toute l'interface du jeu reste dans la même logique : scènes, boutons Phaser, textes Phaser, objets interactifs Phaser.

## Ce qui est exclu en V1

- serveur ;
- multijoueur ;
- cloud ;
- publicité ;
- achats intégrés ;
- vraie simulation complète du rugby ;
- 3D ;
- météo ;
- recrutement ;
- blessures complexes.
