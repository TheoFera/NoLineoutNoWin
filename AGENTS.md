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
   - le test du lot concerné, par exemple `npm run test:lot3`
   - `npm run check`
   - `npm run build`
5. Ne pas commencer le lot suivant tant que les tests, le contrôle TypeScript, le build et l'audit du lot courant ne sont pas validés.
6. Corriger les erreurs TypeScript avant d'ajouter une nouvelle fonctionnalité.
7. Ne pas ajouter de framework non demandé.
8. Ne pas ajouter de serveur, de compte utilisateur, de cloud, de pub ou d'achats intégrés dans la V1.
9. Ne pas ajouter de stat joueur non prévue.
10. Préserver les modifications déjà présentes dans le dépôt et limiter chaque intervention au périmètre demandé.

## Sources de vérité du gameplay V2

- `docs/GAMEPLAY_TOUCHE_V2.md` décrit la résolution d'une touche.
- `docs/IA_TOUCHE_V2.md` décrit les décisions, la mémoire et l'adaptation de l'IA.
- `docs/SIMULATION_MATCH_V2.md` décrit la simulation accélérée entre les touches.
- `docs/GENERATION_EQUIPES_V2.md` décrit la génération des joueurs, les rôles et l'attribution des combinaisons.
- `docs/PLAN_IMPLEMENTATION_GAMEPLAY_V2.md` fixe l'ordre des lots et leurs critères de validation.
- En cas de contradiction avec le code actuel ou un ancien document, le document V2 spécialisé dans le domaine concerné prévaut.
- Ne pas recopier les formules V2 dans plusieurs fichiers : les documents spécialisés restent les sources uniques.
- Les valeurs indiquées comme provisoires dans les documents V2 sont les valeurs initiales à implémenter et restent configurables.
- Les valeurs ajustables doivent être centralisées dans `src/config/LineoutBalance.ts`.
- Les sources aléatoires des règles et de l'IA doivent être injectables pour permettre des tests déterministes.

## Règles métier non négociables

- Le jeu est centré uniquement sur la touche au rugby.
- Le match complet n'est pas jouable : il est simulé entre les touches.
- Il y a 7 positions de lancer : `1, 2, 3, 4, 5, 6, 7`.
- Il n'y a pas de `targetZone` abstraite.
- En attaque, le joueur choisit une combinaison puis une option de lancer réelle : bloc de saut (`jumpBlock`) ou réception directe (`directCatch`).
- L'option choisie désigne un joueur cible réel de l'alignement ; elle ne doit jamais recréer une zone abstraite.
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
- Les rôles d'une combinaison sont définis par option de lancer ; un même joueur peut changer de rôle d'une option à l'autre.
- Les rôles aériens sont déduits des statistiques réelles des joueurs, jamais l'inverse.
- Le joueur et l'IA disposent exactement du même nombre de touches offensives pendant un match ; ce nombre est tiré une seule fois selon la division.
- La possession et l'occupation cumulées sont calculées à partir du temps simulé ; elles ne sont pas modifiées directement comme des bonus abstraits.
- Tous les textes visibles doivent passer par le système de traduction `t(key)`.
- Les textes français visibles doivent être rédigés en français correct, avec les accents et les cédilles.
- Le jeu doit être mobile portrait, sans scroll.

## Séparation technique

- Les scènes Phaser gèrent l'affichage, les interactions et les animations, mais aucune formule métier.
- Les règles du jeu vont dans `src/rules/`.
- L'IA va dans `src/ai/`.
- Les types métier vont dans `src/models/`.
- Les valeurs d'équilibrage vont dans `src/config/LineoutBalance.ts`.
- La bibliothèque globale des combinaisons va dans `src/data/`.
- La sauvegarde va dans `src/systems/SaveSystem.ts` et `src/state/GameStore.ts`.
- Les résolveurs et simulateurs doivent rester utilisables sans Phaser afin d'être testés avec une graine déterministe.
- Ne pas mettre toute la logique dans une seule scène Phaser.

## Style de code

- TypeScript strict.
- Fonctions courtes.
- Noms explicites.
- Pas de magie cachée.
- Préférer des calculs simples et commentés aux grosses formules opaques.
