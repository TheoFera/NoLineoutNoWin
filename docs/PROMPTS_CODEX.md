# Prompts prêts à copier dans Codex

Les prompts dédiés au nouveau gameplay de touche sont regroupés dans
`docs/PROMPTS_GAMEPLAY_V2.md`.

## Prompt de lancement

```text
Lis AGENTS.md, docs/CDC_NORMALISE.md et docs/ARCHITECTURE.md.
Explique-moi en 10 lignes maximum l'architecture du projet et les règles métier non négociables.
Ne modifie aucun fichier pour l'instant.
```

## Prompt Lot 1 — Vérification du squelette

```text
Lis AGENTS.md, docs/CDC_NORMALISE.md et docs/PLAN_DEVELOPPEMENT_CODEX.md.
Travaille sur le Lot 1 uniquement.
Objectif : vérifier que le squelette compile et que le parcours minimal fonctionne : menu → entraînement → touche → résultat.
Contraintes :
- ne change pas la stack ;
- ne crée pas de targetZone ;
- joueurs de champ = jump/lift/hands seulement ;
- talonneur = throwing ;
- textes visibles via t(key) quand c'est un texte stable d'interface ;
- garde les règles dans src/rules et l'affichage dans src/scenes.
À la fin, exécute npm run check puis npm run build, corrige les erreurs et résume les fichiers modifiés.
```

## Prompt Lot 2 — Création du club

```text
Travaille sur le Lot 2 uniquement.
Remplace ClubCreationScene par une vraie création de club mobile :
- champ de saisie du nom du club ;
- choix couleur principale ;
- choix couleur secondaire ;
- sauvegarde du club ;
- retour menu possible.
Respecte Phaser 3 + TypeScript. N'ajoute pas de framework HTML externe.
Tous les textes stables doivent passer par le système de traduction.
Exécute npm run check et npm run build à la fin.
```

## Prompt Lot 3 — Combinaisons offensives

```text
Travaille sur le Lot 3 uniquement.
Crée un vrai écran d'entraînement offensif pour modifier les combinaisons :
- afficher la liste des combinaisons disponibles selon la division ;
- choisir une combinaison ;
- déplacer les 7 joueurs dans les 7 positions ;
- enregistrer l'ordre des joueurs dans Combination.slots ;
- supprimer tout raisonnement en front/middle/back ;
- une combinaison ne cible pas une zone, elle définit une organisation.
Ne code pas encore le championnat.
Exécute npm run check et npm run build à la fin.
```

## Prompt Lot 4 — Touches offensives complètes

```text
Travaille sur le Lot 4 uniquement.
Améliore LineoutScene et LineoutResolver pour les touches offensives :
- le joueur choisit une combinaison ;
- le joueur clique sur un joueur cible ;
- le système calcule targetPosition à partir de l'ordre actuel ;
- animation simple du lancer vers ce joueur ;
- animation simple du saut ou de la réception ;
- résultat simple affiché : Ballon gagné / gagné difficilement / perdu / faute.
Le moteur peut calculer des événements internes, mais ne noie pas l'interface.
Exécute npm run check et npm run build à la fin.
```

## Prompt Lot 5 — Touches défensives

```text
Travaille sur le Lot 5 uniquement.
Ajoute les touches défensives :
- ordre de priorité défensive des 7 joueurs ;
- quand l'adversaire lance à N joueurs, choisir les N premiers de la priorité ;
- permettre de déplacer ces joueurs ;
- mémoriser l'organisation par nombre de joueurs ;
- le joueur clique sur le joueur qui saute ;
- contre le plus fort au même niveau que la cible adverse ;
- 1 ou 2 positions devant = contre possible mais réduit ;
- derrière la cible = pas de contre direct.
Ne crée pas de stat Lecture.
Exécute npm run check et npm run build à la fin.
```

## Prompt de revue globale après chaque lot

```text
Fais une revue de cohérence du projet après le dernier lot.
Vérifie :
- pas de targetZone ;
- pas de stat joueur interdite ;
- textes d'interface stables traduits ;
- logique métier hors des scènes quand possible ;
- aucun fichier devenu trop gros ;
- npm run check et npm run build passent.
Ne modifie que les corrections nécessaires.
```

## Prompt anti-dérapage

```text
Tu es en train de modifier le jeu No Lineout No Win.
Avant de coder, relis AGENTS.md.
Ne propose pas de nouveau gameplay, ne change pas la stack, ne rajoute pas de serveur, de météo, de recrutement, de blessures, de 3D, de compte utilisateur ou d'achats intégrés.
Travaille seulement sur la tâche demandée.
```
