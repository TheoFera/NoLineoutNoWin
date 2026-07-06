# Checklist de relecture après chaque passage Codex

## Compilation

- [ ] `npm run check` passe.
- [ ] `npm run build` passe.
- [ ] Le jeu démarre avec `npm run dev`.

## Gameplay

- [ ] Le match reste centré sur les touches.
- [ ] Le joueur ne contrôle pas les phases de jeu classiques.
- [ ] Toutes les touches générées sont jouées.
- [ ] Le score évolue pendant le match.

## Touche

- [ ] Il y a 7 positions numérotées.
- [ ] Aucun `targetZone` n'a été ajouté.
- [ ] En attaque, on clique sur un joueur cible.
- [ ] En défense, on clique sur le joueur qui saute.
- [ ] Les lifteurs influencent le saut.

## Stats

- [ ] Joueurs de champ : `jump`, `lift`, `hands` uniquement.
- [ ] Talonneur : `throwing` uniquement pour le lancer.
- [ ] Pas de `reading`.
- [ ] Pas de `timing`.
- [ ] Pas de `strength`.
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
