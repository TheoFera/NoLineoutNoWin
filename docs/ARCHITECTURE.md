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
| `src/scenes/LineoutScene.ts` | écran de touche |
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
