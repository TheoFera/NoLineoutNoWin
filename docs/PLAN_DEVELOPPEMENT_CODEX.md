# Plan de développement avec Codex

Pour le nouveau gameplay de touche, suivre le plan détaillé dans
`docs/PLAN_IMPLEMENTATION_GAMEPLAY_V2.md`. Les lots V2 prévalent sur les lots
historiques ci-dessous lorsqu'ils concernent la même mécanique.

L'objectif est de faire coder le jeu par Codex en plusieurs lots courts.

## Méthode générale

Pour chaque lot :

1. Donner à Codex un prompt précis et limité à un seul objectif.
2. Laisser Codex lire uniquement les fichiers et le document métier concernés.
3. Demander à Codex de relire son diff.
4. Pour du code TypeScript, exécuter `npm run check`.
5. Réserver `npm run build` aux livraisons et aux changements de configuration, de dépendances, d'assets, de point d'entrée ou de Capacitor.
6. L'utilisateur effectue les tests fonctionnels au moment qu'il choisit.
7. Ne demander un test visuel dans le navigateur que lorsqu'un problème visuel précis doit être contrôlé.

Codex ne lance pas de serveur de développement, de navigateur, de test automatisé, de simulation statistique ni d'audit global sans demande explicite.

## Lot 0 — Installation

Objectif : ouvrir le projet dans VS Code et vérifier qu'il se lance.

Commandes :

```bash
npm install
npm run dev
```

Puis ouvrir l'adresse affichée par Vite.

## Lot 1 — Squelette, menu d'accueil et entrée en entraînement

Objectif : faire vérifier par Codex que le projet compile, que les scènes se lancent, que le menu d'accueil fonctionne et que l'entrée en entraînement jouable se fait sans écran intermédiaire inutile.

Fichiers prioritaires :

- `AGENTS.md`
- `docs/CDC_NORMALISE.md`
- `src/models/`
- `src/scenes/LineoutScene.ts`
- `src/rules/LineoutResolver.ts`

Critère de sortie :

- `npm run check` passe.
- Le jeu démarre sur le menu d'accueil.
- Sans sauvegarde, `Jouer` mène à la création du club.
- Avec sauvegarde, `Continuer` mène directement à l'entraînement jouable.
- On peut jouer une touche.

## Lot 2 — Création de partie et équipe de départ

Objectif : créer une nouvelle partie proprement et générer l'équipe initiale du joueur.

À coder :

- création du club ;
- création de sauvegarde ;
- génération de l'équipe de départ ;
- joueurs de champ avec Saut / Lift / Main uniquement ;
- au moins un talonneur avec Lancer ;
- consultation simple de l'équipe ;
- textes traduits.

Critère de sortie :

- le nom choisi apparaît en entraînement ;
- l'équipe existe en sauvegarde ;
- l'équipe peut être consultée ;
- la sauvegarde conserve le club.

## Lot 3 — Navigation autour de l'entraînement

Objectif : structurer l'accès à l'équipe, au championnat et au match depuis l'entraînement jouable.

À coder :

- accès au prochain match ;
- accès à l'équipe ;
- accès au championnat ;
- navigation simple depuis la scène d'entraînement ;
- pas d'écran intermédiaire `Entraînement`.

Critère de sortie :

- l'entraînement jouable sert de point d'entrée après `Continuer` ;
- on peut aller vers match, équipe et championnat ;
- le retour après match mène bien à l'entraînement jouable.

## Lot 4 — Entraînement offensif

Objectif : créer/modifier/enregistrer des combinaisons.

À coder :

- liste des combinaisons ;
- déplacement des joueurs sur les 7 positions ;
- sauvegarde des positions ;
- sélection des combinaisons disponibles en match ;
- aucun `targetZone`.

Critère de sortie :

- une combinaison modifiée reste sauvegardée ;
- en match, la combinaison apparaît correctement.

## Lot 5 — Touches offensives complètes

Objectif : rendre l'action offensive agréable.

À coder :

- clic sur combinaison ;
- clic sur joueur cible ;
- animation du ballon ;
- animation simple du sauteur ;
- résultat affiché ;
- influence possession/occupation.

Critère de sortie :

- chaque touche donne un résultat lisible ;
- les résultats varient selon stats, lancer, position et pression ;
- pas d'information inutile affichée.

## Lot 6 — Touches défensives

Objectif : permettre au joueur de défendre sur lancer adverse.

À coder :

- ordre de priorité défensive ;
- sélection automatique des joueurs selon le nombre adverse ;
- réorganisation possible ;
- mémorisation par nombre de joueurs ;
- clic timing sur joueur qui saute ;
- résolution du contre.

Critère de sortie :

- une défense à 4 mémorisée revient à la prochaine touche adverse à 4 ;
- le contre dépend de la position choisie ;
- un saut derrière la cible ne contre pas directement.

## Lot 7 — Match complet V1

Objectif : faire un match complet court.

À coder :

- timer rapide ;
- génération 4 à 6 touches en Régionale 3 ;
- score qui évolue pendant le match ;
- fin de match ;
- résumé.

Critère de sortie :

- un match va du début à la fin ;
- toutes les touches générées sont jouées ;
- le score n'est pas généré uniquement à la fin.

## Lot 8 — Championnat simple et progression sportive

Objectif : créer une saison de Régionale 3.

À coder :

- génération des adversaires ;
- calendrier ;
- résultats des autres matchs ;
- classement ;
- montée si top 2 ;
- enchaînement propre entre phase club, match et classement.

Critère de sortie :

- le classement se met à jour ;
- les autres équipes jouent ;
- la fin de saison monte ou maintient le club.

## Lot 9 — Progression des joueurs

Objectif : faire progresser les joueurs selon les actions.

À coder :

- progression Saut ;
- progression Lift ;
- progression Main ;
- progression Lancer du talonneur ;
- sauvegarde.

Critère de sortie :

- les stats changent après match ;
- un joueur qui saute progresse plutôt en Saut ;
- un joueur utilisé à la main progresse plutôt en Main.

## Lot 10 — Polissage mobile

Objectif : rendre le jeu réellement confortable sur téléphone.

À coder :

- tailles tactiles ;
- safe area ;
- bouton retour Android ;
- orientation portrait ;
- aucun scroll ;
- sauvegarde automatique ;
- transitions propres.

Critère de sortie :

- jouable sur téléphone Android ;
- pas d'élément coupé ;
- pas de bouton inutile pendant le match.

## Lot 11 — Capacitor / Android

Objectif : générer l'application Android.

Commandes typiques :

```bash
npm run build
npx cap sync android
npx cap open android
```

Critère de sortie :

- Android Studio ouvre le projet ;
- l'application s'installe sur téléphone ;
- le jeu fonctionne hors ligne.
