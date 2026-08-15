# Checklist manuelle de fin de jalon

Cette checklist est destinée à une validation volontaire avant une livraison ou un jalon important. Codex ne l'exécute pas automatiquement après chaque intervention.

## Compilation

- [ ] `npm run check` passe.
- [ ] `npm run build` passe si une livraison est préparée.
- [ ] Le jeu démarre avec `npm run dev` si l'utilisateur souhaite effectuer un test manuel.

## Gameplay

- [ ] Le match reste centré sur les touches.
- [ ] Le joueur ne contrôle pas les phases de jeu classiques.
- [ ] Toutes les touches générées sont jouées.
- [ ] Le score évolue pendant le match.

## Touche

- [ ] Il y a 7 positions numérotées.
- [ ] Aucun `targetZone` n'a été ajouté.
- [ ] En attaque, le geste vertical produit une profondeur de lancer cohérente.
- [ ] Un geste trop court ou trop lent est refusé sans bloquer la touche.
- [ ] En défense, les blocs peuvent être déplacés avant le lancer puis le saut est déclenché au bon moment.
- [ ] Les lifteurs influencent le saut.

## Stats

- [ ] Joueurs de champ : `speed`, `strength`, `technique` uniquement.
- [ ] Talonneur : `throwing` uniquement pour le lancer.
- [ ] Pas de `reading`.
- [ ] Le timing reste une interaction, jamais une statistique permanente.
- [ ] Pas d'`endurance` comme stat permanente.

## Interface

- [ ] Pas de scroll pendant le match.
- [ ] Boutons assez gros.
- [ ] Pas de bouton technique inutile visible pendant le jeu.
- [ ] Les informations avancées sont cachées ou affichées seulement sur demande.

## Traduction

- [ ] Les textes stables utilisent `t(key)`.
- [ ] Les clés existent en français et en anglais.

## Architecture

- [ ] Les scènes Phaser ne contiennent pas toute la logique métier.
- [ ] Les règles sont dans `src/rules/`.
- [ ] L'IA est dans `src/ai/`.
- [ ] Les types sont dans `src/models/`.
- [ ] La sauvegarde reste dans `src/systems/` et `src/state/`.
