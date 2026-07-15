# Intelligence artificielle de touche V2 — Source de vérité

Version : 2026-07-15

## 1. Principes

- Chaque équipe IA possède son propre répertoire de combinaisons.
- Une combinaison décrit un positionnement précis et peut proposer plusieurs cibles.
- Il n’existe pas de `fakePosition` : un bloc non ciblé devient naturellement un leurre.
- `complexity`, `risk`, `preferredZone` et `minimumSkill` ne participent pas au choix en match.
- Toutes les options déjà présentes dans le répertoire de l’équipe sont considérées faisables.
- L’IA offensive et défensive utilise une logique commune : style naturel + mémoire + conséquence des choix récents + hasard.
- L’IA d’une équipe est persistante : elle conserve ce qu’elle a personnellement observé pour le match retour.

## 2. Modèle des combinaisons

```ts
interface LineoutCombinationDefinition {
  id: string;
  occupiedPositions: Array<1 | 2 | 3 | 4 | 5 | 6 | 7>;
  targetOptions: TargetOption[];
}
```

Les rôles sont définis par option de lancer, car un joueur peut être sauteur dans une option et lifteur ou leurre dans une autre.

```ts
interface TargetOption {
  id: string;
  targetPosition: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  type: "jumpBlock" | "directCatch";
  roles: {
    jumperPosition?: number;
    frontLifterPosition?: number;
    rearLifterPosition?: number;
    receiverPosition?: number;
  };
  naturalWeight: number;
}
```

## 3. Style d’une équipe

Le style est enregistré avec un seul champ :

```ts
interface TeamLineoutStyle {
  sizeWeights: Partial<Record<4 | 5 | 6 | 7, number>>;
  naturalTargetWeights: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number>>;
}
```

Exemple :

```ts
sizeWeights: {
  5: 70,
  7: 30
}
```

Il n’existe pas de champ `preferredSizes` séparé.

## 4. Nombre de combinaisons actives et de réserve

Le nombre dépend uniquement de la division et doit être identique pour le joueur et les équipes IA.

Valeurs V2 proposées, à aligner avec les valeurs déjà présentes dans le jeu si elles sont déjà définies :

| Division | Actives | Réserves |
|---|---:|---:|
| Régionale 3 | 2 | 0 |
| Régionale 2 | 2 | 1 |
| Régionale 1 | 3 | 1 |
| Fédérale 3 | 3 | 2 |
| Fédérale 2 | 4 | 2 |
| Fédérale 1 | 4 | 3 |
| Nationale 2 | 5 | 3 |
| Nationale | 5 | 4 |
| Pro D2 | 6 | 4 |
| Top 14 | 6 | 5 |

Règle générale : lorsqu’un niveau n’ajoute pas de combinaison active, il ajoute une combinaison de réserve.

## 5. Changement de répertoire au match retour

L’IA analyse les résultats de ses combinaisons offensives au match aller.

```ts
failureRate = failedUses / totalUses;
```

- Une utilisation est un échec si le camp qui lance ne récupère pas le ballon ou commet un en-avant / lancer pas droit.
- Une combinaison doit avoir été utilisée au moins deux fois avant d’être éligible au remplacement.
- Au match retour, trier les combinaisons actives par taux d’échec décroissant.
- Remplacer, dans la limite des réserves disponibles, celles dont le taux d’échec est supérieur à 50 %.
- Les seuils et le nombre maximal de remplacements doivent rester configurables.

## 6. Influence de la zone du terrain

La zone influence d’abord la taille de l’alignement.

| Zone | Touches à 4 | Touches à 5 | Touches à 6 | Touches à 7 |
|---|---:|---:|---:|---:|
| Dans ses 22 m | ×0,6 | ×0,6 | ×1,5 | ×1,5 |
| Entre les 22 m | ×1,4 | ×1,4 | ×0,6 | ×0,6 |
| Dans les 22 m adverses | ×0,6 | ×0,6 | ×1,5 | ×1,5 |

La zone ne choisit pas entre 4 et 5, ni entre 6 et 7. Le style naturel de l’équipe décide à l’intérieur de chaque paire.

## 7. IA offensive : choix de la combinaison

```ts
scoreCombinaison =
  naturalWeight * zoneMultiplier
  + memoryBonus
  + repetitionPenalty
  + randomAdjustment;
```

Le choix final est un tirage pondéré, pas forcément le score maximal.

### 7.1 Malus de répétition

Le malus porte principalement sur la cible, plus légèrement sur la combinaison.

| Résultat précédent | Malus cible | Malus combinaison |
|---|---:|---:|
| Ballon gagné proprement | 0 | 0 |
| Ballon gagné difficilement | −5 | 0 |
| Ballon perdu ou dévié | −15 | −5 |
| En-avant ou lancer pas droit | −25 | −10 |

Une touche réussie peut être rejouée immédiatement.

## 8. IA offensive : choix de la cible

```ts
scoreCible =
  poidsHabituel * (1 - adaptationEffective)
  + scoreTactique * adaptationEffective
  + repetitionPenalty
  + randomAdjustment;
```

- Au début, l’IA suit surtout les cibles habituelles de son répertoire.
- Avec l’expérience et un niveau d’intelligence élevé, elle choisit plus souvent les positions que le joueur défend mal.
- Aucune faisabilité technique n’est recalculée pendant le match.

## 9. Mémoire par adversaire

Chaque équipe possède sa propre mémoire du joueur.

```ts
interface OpponentLineoutMemory {
  directObservations: CombinationTargetMemory;
  videoObservations: CombinationTargetMemory;
  globalTargetCounts: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number>>;
}
```

Une nouvelle équipe ne connaît rien du joueur, sauf si sa préparation vidéo lui donne accès à des matchs précédents.

La mémoire directe est conservée pour le match retour.

## 10. Précision de la mémoire défensive

Pour une combinaison exacte :

```ts
frequenceEstimee =
  frequenceCombinaison * 0.70
  + frequenceGlobale * 0.30;
```

Confiance progressive :

```ts
confiance = Math.min(1, observationsDeCetteCombinaison / 5);
```

| Observations | Confiance |
|---:|---:|
| 0 | 0 % |
| 1 | 20 % |
| 2 | 40 % |
| 3 | 60 % |
| 4 | 80 % |
| 5 ou plus | 100 % |

## 11. Intelligence tactique continue

Chaque équipe possède un score `aiIntelligence` sur 100.

| Division | Base IA | Choix de la meilleure cible après apprentissage |
|---|---:|---:|
| Régionale 3 | 20 | 35 % |
| Régionale 2 | 28 | 42 % |
| Régionale 1 | 36 | 49 % |
| Fédérale 3 | 45 | 57 % |
| Fédérale 2 | 54 | 65 % |
| Fédérale 1 | 63 | 73 % |
| Nationale 2 | 72 | 80 % |
| Nationale | 80 | 86 % |
| Pro D2 | 88 | 91 % |
| Top 14 | 95 | 95 % |

Chaque club varie de `−5` à `+5` autour de la base de sa division.

Le système suit l’option B : plus l’intelligence augmente, plus l’IA privilégie le meilleur score estimé ; elle conserve toujours une part d’incertitude.

## 12. IA défensive

### 12.1 Action choisie

L’IA défensive prédit une cible exacte puis place son bloc exactement sur cette position.

Elle ne décide jamais volontairement de sauter une ou deux positions devant.

Ces cas apparaissent naturellement si sa prédiction est fausse :

- prédiction en position 4, cible réelle 5 : bloc une position devant ;
- prédiction en position 4, cible réelle 6 : bloc deux positions devant ;
- prédiction en position 4, cible réelle 3 : bloc derrière.

### 12.2 Informations utilisées

- combinaison exacte affichée ;
- positions exactes déjà ciblées avec cette combinaison ;
- habitudes globales du joueur ;
- mémoire directe ;
- analyse vidéo ;
- intelligence tactique ;
- hasard.

Le résultat de la touche n’altère pas la compréhension de la cible : une bonne prédiction reste une bonne prédiction même si le défenseur perd le duel aérien.

## 13. Analyse vidéo

L’analyse vidéo ne reconnaît que :

- la combinaison exacte ;
- la position exacte ciblée.

Une combinaison proche ou renommée avec un autre identifiant structurel ne transmet aucune information.

### 13.1 Préparation par division et variation entre clubs

| Division | Préparation vidéo habituelle | Matchs analysés |
|---|---:|---:|
| Régionale 3 | 0 à 10 | 0 |
| Régionale 2 | 5 à 20 | 0 à 1 |
| Régionale 1 | 10 à 30 | 0 à 1 |
| Fédérale 3 | 20 à 40 | 1 à 2 |
| Fédérale 2 | 30 à 50 | 1 à 3 |
| Fédérale 1 | 40 à 60 | 2 à 4 |
| Nationale 2 | 50 à 70 | 3 à 5 |
| Nationale | 60 à 80 | 4 à 6 |
| Pro D2 | 75 à 90 | 6 à 8 |
| Top 14 | 85 à 100 | 8 à 12 |

Chaque club reçoit une valeur fixe dans la plage de sa division. Cette valeur fait partie de son identité.

### 13.2 Ancienneté des vidéos

| Match | Poids |
|---|---:|
| Dernier match | 100 % |
| Avant-dernier | 80 % |
| 3e | 60 % |
| 4e | 40 % |
| 5e et suivants | 20 % |

### 13.3 Fusion des sources

Ordre de fiabilité :

```text
Mémoire directe > analyse vidéo > comportement défensif naturel
```

Les poids exacts évoluent avec le nombre d’observations directes et restent configurables.

## 14. Nombre de touches

L’IA doit avoir exactement le même nombre de touches offensives que le joueur pendant un match. Le nombre est tiré une fois selon la division, puis appliqué aux deux équipes.

