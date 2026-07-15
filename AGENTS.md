# Instructions permanentes pour Codex

Ce dépôt contient un jeu mobile Phaser 3 + TypeScript + Capacitor : **No Lineout No Win**.

## Règles de travail

1. Ne jamais tout réécrire sans raison.
2. Avancer par petites étapes vérifiables.
3. Avant chaque modification importante, lire :
   - `docs/CDC_NORMALISE.md`
   - `docs/ARCHITECTURE.md`
   - `docs/PLAN_DEVELOPPEMENT_CODEX.md`
   - `docs/GAMEPLAY_TOUCHE_V2.md`
   - `docs/IA_TOUCHE_V2.md`
   - `docs/SIMULATION_MATCH_V2.md`
   - `docs/GENERATION_EQUIPES_V2.md`
   - `docs/PLAN_IMPLEMENTATION_GAMEPLAY_V2.md`
   - `docs/INTEGRATION_GAMEPLAY_V2.md`
4. Après chaque lot de travail, exécuter au minimum :
   - `npm run check`
   - `npm run build`
5. Corriger les erreurs TypeScript avant d'ajouter une nouvelle fonctionnalité.
6. Ne pas ajouter de framework non demandé.
7. Ne pas ajouter de serveur, de compte utilisateur, de cloud, de pub ou d'achats intégrés dans la V1.
8. Ne pas ajouter de stat joueur non prévue.

## Sources de vérité du gameplay V2

- Les documents `*_V2.md` décrivent le nouveau gameplay à atteindre.
- En cas de contradiction avec le code actuel, le document V2 prévaut pour le nouveau chantier.
- Les valeurs indiquées comme provisoires dans les documents V2 sont les valeurs initiales à implémenter et restent configurables.
- Les valeurs ajustables doivent être centralisées dans `src/config/LineoutBalance.ts`.
- Les sources aléatoires des règles et de l'IA doivent être injectables pour permettre des tests déterministes.

## Règles métier non négociables

- Le jeu est centré uniquement sur la touche au rugby.
- Le match complet n'est pas jouable : il est simulé entre les touches.
- Il y a 7 positions de lancer : `1, 2, 3, 4, 5, 6, 7`.
- Il n'y a pas de `targetZone` abstraite.
- En attaque, le joueur choisit une combinaison puis clique sur un joueur cible.
- La cible est donc un `targetPlayerId`, dont la position actuelle est calculée dans l'alignement.
- Les joueurs de champ ont uniquement 3 stats :
  - `jump` = Saut
  - `lift` = Lift
  - `hands` = Main
- Le talonneur est un rôle spécial avec `throwing` = Lancer.
- Ne pas ajouter `reading`, `timing`, `strength`, `morale`, `endurance` ou d'autres stats joueur.
- La fatigue est une variable temporaire de match exprimée en pourcentage, jamais une stat joueur permanente.
- Aucun mini-jeu de timing : l'attaque sélectionne une cible et la défense sélectionne un bloc de contre.
- Une combinaison peut proposer plusieurs options de lancer, chacune désignant une cible réelle de l'alignement.
- Tous les textes visibles doivent passer par le système de traduction `t(key)`.
- Le jeu doit être mobile portrait, sans scroll.

## Séparation technique

- Les scènes Phaser gèrent l'affichage et les interactions.
- Les règles du jeu vont dans `src/rules/`.
- L'IA va dans `src/ai/`.
- Les types métier vont dans `src/models/`.
- La sauvegarde va dans `src/systems/SaveSystem.ts` et `src/state/GameStore.ts`.
- Ne pas mettre toute la logique dans une seule scène Phaser.

## Style de code

- TypeScript strict.
- Fonctions courtes.
- Noms explicites.
- Pas de magie cachée.
- Préférer des calculs simples et commentés aux grosses formules opaques.
