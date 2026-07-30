# Sommaire rapide pour Codex

Ce fichier sert à choisir la documentation utile sans charger tout le dépôt dans le contexte.

## Lecture minimale

`AGENTS.md` contient les règles permanentes. Ensuite, lire seulement la ligne correspondant à la tâche :

| Domaine modifié | Document à lire |
|---|---|
| Architecture, dossiers, responsabilités | `docs/ARCHITECTURE.md` |
| Parcours joueur, périmètre V1, règles générales | `docs/CDC_NORMALISE.md` |
| Résolution d'une touche, lancer, saut, contre, réception | `docs/GAMEPLAY_TOUCHE_V2.md` |
| Décisions, mémoire et adaptation de l'IA | `docs/IA_TOUCHE_V2.md` |
| Chronomètre, terrain, possession, occupation et score | `docs/SIMULATION_MATCH_V2.md` |
| Génération des joueurs, rôles et combinaisons | `docs/GENERATION_EQUIPES_V2.md` |
| Travail explicitement demandé par numéro de lot V2 | `docs/PLAN_IMPLEMENTATION_GAMEPLAY_V2.md`, puis le document métier du lot |
| Choix techniques déjà arbitrés | `docs/DECISIONS_TECHNIQUES.md` |
| Intégration globale de plusieurs domaines | uniquement les documents des domaines réellement concernés |

## Documents qui ne sont pas requis pour coder

- `docs/PLAN_DEVELOPPEMENT_CODEX.md` : historique et ordre général des anciens lots.
- `docs/INTEGRATION_GAMEPLAY_V2.md` : procédure historique d'ajout des documents V2.
- `docs/PROMPTS_CODEX.md` et `docs/PROMPTS_GAMEPLAY_V2.md` : exemples de prompts.
- `docs/CHECKLIST_RELECTURE.md` : checklist manuelle de fin de jalon.

Ne pas lire ces documents par défaut.

## Méthode rapide

1. Rechercher le symbole ou le texte concerné avec `rg`.
2. Ouvrir les fichiers directement liés à la demande.
3. Lire un seul document métier, ou deux si la modification traverse réellement deux domaines.
4. Modifier le plus petit nombre de fichiers possible.
5. Relire le diff.
6. Appliquer la validation proportionnée définie dans `AGENTS.md`.

Un audit complet du dépôt, des tests automatisés, une simulation, un serveur local ou un contrôle visuel ne sont réalisés que si l'utilisateur les demande explicitement.
