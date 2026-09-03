# Instructions permanentes pour Codex

Ce dépôt contient un jeu mobile Phaser 3 + TypeScript + Capacitor : **No Lineout No Win**.

## Règles de travail

1. Ne jamais tout réécrire sans raison.
2. Avancer par petites étapes vérifiables.
3. Lire `docs/SOMMAIRE_CODEX.md`, puis uniquement les documents indiqués pour le domaine réellement modifié. Ne pas relire les documents V2 archivés.
4. Réutiliser les informations déjà lues dans la conversation tant que les fichiers n'ont pas changé.
5. Inspecter d'abord les fichiers directement concernés. Ne pas auditer tout le dépôt sauf demande explicite.
6. Validation proportionnée :
   - modification de documentation uniquement : aucune commande ;
   - modification TypeScript ordinaire : `npm run check` ;
   - `npm run build` uniquement sur demande ou si la modification touche Vite, les dépendances, les points d'entrée, les assets, Capacitor ou une livraison ;
   - ne jamais exécuter de tests automatisés, de simulations statistiques ou de tests Monte-Carlo sans demande explicite de l'utilisateur ;
   - ne jamais lancer `npm run dev`, un navigateur, Playwright, Chrome, une capture d'écran ou un test visuel sans demande explicite de l'utilisateur.
7. Ne pas effectuer automatiquement un second audit global après un lot. Relire le diff et les fichiers modifiés suffit, sauf demande contraire.
8. Corriger les erreurs TypeScript liées au périmètre courant avant d'ajouter une nouvelle fonctionnalité.
9. Ne pas ajouter de framework non demandé.
10. Ne pas ajouter de serveur, de compte utilisateur, de cloud, de pub ou d'achats intégrés dans la V1.
11. Ne pas ajouter de stat joueur non prévue.
12. Préserver les modifications déjà présentes dans le dépôt et limiter chaque intervention au périmètre demandé.

## Source de vérité du gameplay V3

- `docs/GAMEPLAY_V3.md` décrit le gameplay officiel : geste de lancer, plans de combinaison, déplacements, timing défensif, trajectoire et résolution physique.
- Les documents dont le nom contient `V2` sont périmés et conservés uniquement comme historique. Ils ne doivent plus guider une modification.
- En cas de contradiction avec un ancien document, `docs/GAMEPLAY_V3.md` et les règles V3 actuelles prévalent.
- Ne pas réintroduire une règle V2 pour conserver une ancienne formule ou une ancienne sauvegarde sans demande explicite.
- Les valeurs ajustables doivent être centralisées dans `src/config/LineoutBalance.ts`.
- Les sources aléatoires des règles et de l'IA doivent être injectables pour permettre des tests déterministes.

## Règles métier non négociables

- Le jeu est centré uniquement sur la touche au rugby.
- Le match complet n'est pas jouable : il est simulé entre les touches.
- Il y a 7 positions de référence : `1, 2, 3, 4, 5, 6, 7`, puis des déplacements continus exprimés en mètres.
- Il n'y a pas de `targetZone` abstraite.
- En attaque, le joueur choisit une combinaison, lance son plan puis effectue un geste vertical dont la distance fixe la profondeur physique demandée.
- Un geste trop court ou trop lent est refusé ; la précision réelle dépend du talonneur, de la fatigue et de l'aléatoire injecté.
- En défense, le joueur peut réorganiser et déplacer ses blocs avant le lancer, puis déclenche le saut du défenseur choisi au passage du ballon.
- Le timing du saut défensif fait partie du gameplay V3.
- Les joueurs de champ ont uniquement 3 stats :
  - `speed` = Vitesse
  - `strength` = Force
  - `technique` = Technique
- Le talonneur est un rôle spécial avec `throwing` = Lancer.
- Ne pas ajouter `reading`, `timing`, `morale`, `endurance`, `agility` ou d'autres stats joueur.
- La fatigue est une variable temporaire de match exprimée en pourcentage, jamais une stat joueur permanente.
- Une combinaison V3 contient des temps et des actions `move`, `feint` ou `jump`.
- Les anciennes options `jumpBlock` et `directCatch` peuvent préparer un plan, mais la résolution dépend toujours de la géométrie réelle.
- Les rôles aériens et l'éligibilité des lifteurs sont déduits des statistiques et positions réelles, jamais l'inverse.
- Le nombre total de touches du match est tiré une seule fois selon la division. Il est réparti également entre le joueur et l'IA ; lorsque le total est impair, une équipe dispose d'une seule touche offensive supplémentaire, attribuée aléatoirement.
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
