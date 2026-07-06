# Architecture du projet

## Structure principale

```text
src/
├── ai/          IA adverse et adaptation
├── data/        données par défaut
├── models/      types métier
├── rules/       règles de simulation
├── scenes/      écrans Phaser
├── state/       état global du jeu
├── systems/     sauvegarde, traduction, navigation, audio
├── ui/          composants Phaser réutilisables
└── utils/       fonctions simples
```

## Principe central

Les scènes Phaser ne doivent pas devenir des fichiers énormes. Elles doivent :

- afficher ;
- récupérer les clics ;
- lancer les animations ;
- appeler les règles.

Les règles doivent rester testables indépendamment de Phaser.

## Flux des scènes

Le flux principal du jeu passe par un menu d'accueil simple.

```text
BootScene
→ PreloadScene
→ MainMenuScene
→ ClubCreationScene si aucune sauvegarde
→ sinon LineoutScene en mode training

LineoutScene en mode training
→ TeamScene pour consulter l'équipe
→ ChampionshipScene pour consulter le championnat
→ MatchScene pour jouer le match

MatchScene
→ ResultScene en fin de match
→ LineoutScene en mode training après validation du résultat
```

Conséquences :

- `MainMenuScene` reste le point d'entrée du joueur ;
- `TrainingScene` n'est plus nécessaire dans le flux principal ;
- `LineoutScene` porte l'entraînement jouable ;
- `SettingsScene` reste un écran utilitaire lié au menu d'accueil ;
- la navigation doit rester simple, lisible et pensée mobile portrait.

Exemple :

```text
LineoutScene.ts
→ affiche l'alignement
→ reçoit le clic sur le joueur cible
→ appelle resolveLineout(...)

LineoutResolver.ts
→ calcule le résultat
→ renvoie un objet LineoutResult
```

## Fichiers les plus importants

| Fichier | Rôle |
|---|---|
| `src/scenes/PreloadScene.ts` | charge les assets initiaux puis ouvre le menu d'accueil |
| `src/scenes/MainMenuScene.ts` | affiche l'écran d'accueil |
| `src/scenes/ClubCreationScene.ts` | crée la partie initiale |
| `src/scenes/LineoutScene.ts` | écran de touche et entraînement jouable |
| `src/scenes/MatchScene.ts` | gère l'avancement du match |
| `src/scenes/ResultScene.ts` | affiche la fin de match |
| `src/scenes/TeamScene.ts` | affiche l'équipe du joueur |
| `src/scenes/ChampionshipScene.ts` | affiche le championnat |
| `src/rules/LineoutResolver.ts` | calcul d'une touche |
| `src/ai/DefenseAI.ts` | choix défensif adverse |
| `src/state/GameStore.ts` | état global et sauvegarde |
| `src/systems/I18n.ts` | traduction |
| `src/models/*.ts` | structure des données |

## Données métier à respecter

- 7 positions, pas de targetZone.
- Joueurs de champ : jump/lift/hands uniquement.
- Talonneur : throwing.
- Toutes les phrases visibles passent par une clé de traduction.
