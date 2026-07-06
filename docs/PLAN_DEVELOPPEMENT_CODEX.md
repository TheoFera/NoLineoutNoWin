# Plan de développement avec Codex

L'objectif est de faire coder le jeu par Codex en plusieurs lots courts. Chaque lot doit être testable avant de passer au suivant.

## Méthode générale

Pour chaque lot :

1. Créer un commit Git avant de demander le travail.
2. Donner à Codex un prompt précis.
3. Laisser Codex modifier les fichiers.
4. Demander à Codex d'exécuter :
   - `npm run check`
   - `npm run build`
5. Tester manuellement dans le navigateur avec `npm run dev`.
6. Relire les fichiers modifiés.
7. Corriger avant de passer au lot suivant.
8. Faire un commit Git.

## Lot 0 — Installation

Objectif : ouvrir le projet dans VS Code et vérifier qu'il se lance.

Commandes :

```bash
npm install
npm run dev
```

Puis ouvrir l'adresse affichée par Vite.

## Lot 1 — Nettoyage du squelette

Objectif : faire vérifier par Codex que le projet compile, que les scènes se lancent et que les règles non négociables sont respectées.

Fichiers prioritaires :

- `AGENTS.md`
- `docs/CDC_NORMALISE.md`
- `src/models/`
- `src/scenes/LineoutScene.ts`
- `src/rules/LineoutResolver.ts`

Critère de sortie :

- `npm run check` passe.
- `npm run build` passe.
- On peut ouvrir le menu.
- On peut aller en entraînement.
- On peut jouer une touche.

## Lot 2 — Vraie création de club

Objectif : remplacer la création de club temporaire par un écran utilisable mobile.

À coder :

- saisie du nom du club ;
- choix couleur principale ;
- choix couleur secondaire ;
- création de sauvegarde ;
- textes traduits.

Critère de sortie :

- le nom choisi apparaît en entraînement ;
- les couleurs apparaissent sur les joueurs ;
- la sauvegarde conserve le club.

## Lot 3 — Entraînement offensif

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

## Lot 4 — Touches offensives complètes

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

## Lot 5 — Touches défensives

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

## Lot 6 — Match complet V1

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

## Lot 7 — Championnat simple

Objectif : créer une saison de Régionale 3.

À coder :

- génération des adversaires ;
- calendrier ;
- résultats des autres matchs ;
- classement ;
- montée si top 2.

Critère de sortie :

- le classement se met à jour ;
- les autres équipes jouent ;
- la fin de saison monte ou maintient le club.

## Lot 8 — Progression des joueurs

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

## Lot 9 — Polissage mobile

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

## Lot 10 — Capacitor / Android

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
