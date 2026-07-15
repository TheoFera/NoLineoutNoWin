# Plan d’implémentation Gameplay V2

Version : 2026-07-15

## Règle de travail

Un lot à la fois. Ne jamais commencer le lot suivant avant :

- `npm run check` réussi ;
- tests du lot réussis ;
- audit du lot effectué ;
- commit ou sauvegarde réalisé.

## Lot 0 — Audit et modèles

Objectifs :

- lire le code actuel ;
- cartographier les modèles et résolveurs existants ;
- créer les nouveaux types sans changer le comportement ;
- créer une source aléatoire injectable ;
- créer `src/config/LineoutBalance.ts` ;
- identifier les anciennes valeurs codées en dur.

Critères :

- aucun changement visuel ;
- projet compilable ;
- aucune formule métier dans les scènes.

## Lot 1 — Qualité du lancer

Implémenter :

- distance normalisée ;
- coefficient de distance ;
- fatigue ;
- amplitude d’incertitude ;
- erreur exceptionnelle ;
- qualité finale bornée ;
- seuil de lancer pas droit ;
- trajectoire précise / basse / haute.

Tests :

- stats 60, 70, 80, 90, 100 ;
- distances 0 et 7 ;
- fatigue 0, 5 et 15 % ;
- erreur exceptionnelle forcée ;
- courbe de trajectoire à Q 50, 60, 70, 80, 90 et 100 ;
- résultats Monte-Carlo proches du tableau de référence.

## Lot 2 — Saut et réception offensive

Implémenter :

- pondérations sauteur / lifteur arrière / lifteur avant ;
- fatigue individuelle ;
- bonus deux lifteurs ;
- malus un lifteur ;
- hasard du saut ;
- accessibilité selon la trajectoire ;
- correction des mains.

Tests :

- deux, un et zéro lifteur ;
- importance supérieure du lifteur arrière ;
- bornage 0–100 ;
- trajectoires précises, basses et hautes.

## Lot 3 — Contre et duel aérien

Implémenter :

- même poste ;
- une position devant ;
- deux positions devant ;
- contre impossible derrière ou sur lancer trop haut ;
- correction des mains sur interception ;
- seuils propre / difficile / dévié / volé.

Tests déterministes pour toutes les frontières : −16, −15, −1, 0, 10, 11 et marge 15/16.

## Lot 4 — En-avant, réception directe et ballon trop haut

Implémenter :

- interpolation du risque d’en-avant ;
- pression adverse ;
- réception seule ;
- duel de mains ;
- cascade trois positions derrière ;
- ballon libre 50/50.

Tests :

- chaque point d’ancrage de hands ;
- pression une position devant ;
- deux joueurs au même poste ;
- cascade position 5 → 6 → 7 ;
- égalité favorable au camp qui lance.

## Lot 5 — Résolution finale de la touche

Implémenter un unique résolveur orchestrant les Lots 1 à 4.

Sortie obligatoire :

- outcome ;
- ballTeam ;
- restart ;
- offendingTeam éventuelle ;
- primaryReason ;
- détails numériques.

Supprimer les anciens raccourcis qui contredisent V2, sans toucher encore à l’IA.

## Lot 6 — Bibliothèque et répertoire d’équipe

Implémenter :

- fichier global de combinaisons ;
- options multiples par combinaison ;
- rôles par option ;
- actives et réserves ;
- filtres talonneur / sauteurs / qualité attendue ;
- sélection selon `sizeWeights` ;
- changement au match retour.

## Lot 7 — Génération des joueurs

Implémenter :

- moyennes par division ;
- modificateurs de club ;
- rôles déduits des stats ;
- composition Régionale 3 ;
- polyvalence obligatoire à partir de Fédérale 1 ;
- génération déterministe avec graine.

## Lot 8 — IA offensive

Implémenter :

- zone → multiplicateur de taille ;
- choix pondéré de la combinaison ;
- choix de la cible ;
- malus après échec ;
- adaptation selon les habitudes défensives ;
- nombre de touches égal au joueur.

## Lot 9 — IA défensive et mémoire

Implémenter :

- prédiction de la cible exacte ;
- mémoire directe par équipe ;
- mémoire du match aller ;
- analyse vidéo exacte ;
- intelligence continue par division ;
- préparation propre à chaque club ;
- choix progressivement plus strict.

## Lot 10 — Simulation du match

Implémenter :

- chrono accéléré ;
- terrain 0–100 m ;
- possession instantanée et cumulée ;
- occupation instantanée et cumulée ;
- déplacement ;
- changements de possession ;
- programmation égale des touches ;
- pression offensive ;
- score et transformation.

## Lot 11 — Interface

Implémenter :

- mini-terrain animé ;
- ballon coloré selon la possession ;
- arrêt sur touche avec métrage précis ;
- résultat court ;
- détails au clic ;
- aucune formule métier dans la scène.

## Lot 12 — Simulations statistiques et équilibrage

Créer un outil de simulation sans interface :

```ts
simulateLineouts({ iterations, teams, context, seed });
simulateMatches({ iterations, teams, division, seed });
```

Rapports obligatoires :

- taux de lancer droit par stat et distance ;
- taux de trajectoire ;
- taux de gains propres/difficiles ;
- taux de vols et en-avants ;
- résultats par division ;
- efficacité de chaque position ;
- effet de l’IA et de sa préparation ;
- impact des touches sur le score final.

