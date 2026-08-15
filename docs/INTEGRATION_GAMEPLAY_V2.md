# Intégration des documents Gameplay V2 dans le dépôt existant

> **Archive périmée :** cette procédure d'intégration V2 est terminée et ne
> doit plus être appliquée. Consulter `docs/GAMEPLAY_V3.md`.

## Fichiers existants à conserver

Ne pas remplacer automatiquement :

- `AGENTS.md` ;
- `docs/ARCHITECTURE.md` ;
- `docs/CDC_NORMALISE.md` ;
- `docs/DECISIONS_TECHNIQUES.md` ;
- `docs/PLAN_DEVELOPPEMENT_CODEX.md` ;
- `docs/PROMPTS_CODEX.md` ;
- les autres documents déjà présents.

## Nouveaux fichiers à copier dans `docs/`

- `GAMEPLAY_TOUCHE_V2.md`
- `IA_TOUCHE_V2.md`
- `GENERATION_EQUIPES_V2.md`
- `SIMULATION_MATCH_V2.md`
- `PLAN_IMPLEMENTATION_GAMEPLAY_V2.md`
- `PROMPTS_GAMEPLAY_V2.md`

## Routage actuel dans l’AGENTS.md

Le dépôt utilise maintenant `docs/SOMMAIRE_CODEX.md` pour éviter de charger
toute la documentation à chaque demande. Une tâche ordinaire ne doit lire que
le document du domaine modifié.

```md
## Sources de vérité Gameplay V2

Lire uniquement le document du domaine modifié, selon docs/SOMMAIRE_CODEX.md.

En cas de contradiction sur le nouveau gameplay de touche, les documents V2 prévalent.

## Architecture Gameplay V2

- Calculs de touche dans src/rules.
- Décisions IA dans src/ai.
- Valeurs ajustables dans src/config/LineoutBalance.ts.
- Données de combinaisons dans src/data.
- Les scènes Phaser affichent les résultats et ne contiennent pas les formules.
- L’aléatoire doit être injectable pour les tests.
- Aucun mini-jeu de timing.
- En attaque : clic sur la cible ou le bloc choisi.
- En défense : clic sur le bloc de contre choisi.
- Ne pas recréer targetZone.
```

## Mise à jour des documents existants

Il est préférable de demander à Codex de :

1. ajouter un lien vers `PLAN_IMPLEMENTATION_GAMEPLAY_V2.md` dans `PLAN_DEVELOPPEMENT_CODEX.md` ;
2. ajouter un lien vers `PROMPTS_GAMEPLAY_V2.md` dans `PROMPTS_CODEX.md` ;
3. ne pas recopier toutes les formules dans les anciens documents ;
4. conserver les documents V2 comme sources uniques pour éviter les doublons.

## Ordre d’utilisation

1. Copier les six nouveaux fichiers dans `docs/`.
2. Ajouter le bloc ci-dessus dans `AGENTS.md`.
3. Utiliser le sommaire pour sélectionner le document du lot.
4. Continuer lot par lot, avec une validation proportionnée.
