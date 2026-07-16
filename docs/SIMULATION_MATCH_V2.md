# Simulation accélérée du match V2 — Source de vérité

Version : 2026-07-15

## 1. Principes

- Le match ne simule pas visuellement toutes les phases de rugby.
- Le chronomètre défile très vite et s’arrête lorsqu’une touche doit être jouée.
- La touche est le cœur de l’impact du joueur sur le résultat.
- Les états instantanés sont distincts des statistiques cumulées.

## 2. Vitesse

Valeur initiale :

```ts
simulatedMinutesPerRealSecond = 3;
```

Un match de 80 minutes dure donc environ 27 secondes réelles hors écrans de touche.

La valeur doit être ajustable.

## 3. Terrain

Le terrain est représenté sur exactement 100 mètres :

- `0` : ligne d’en-but du joueur ;
- `22` : sortie des 22 mètres du joueur ;
- `50` : milieu ;
- `78` : entrée dans les 22 mètres adverses ;
- `100` : ligne d’en-but adverse.

```ts
ballPositionMeters: number; // borné entre 0 et 100
```

## 4. État instantané et statistiques cumulées

### 4.1 Possession actuelle

```ts
ballOwner: "player" | "opponent";
```

### 4.2 Possession cumulée

Calculée à partir du temps réel simulé pendant lequel chaque équipe possède le ballon.

```ts
playerPossessionPercent =
  playerPossessionTime / elapsedMatchTime * 100;
```

### 4.3 Position actuelle

`ballPositionMeters` indique où le ballon est disputé sur le mini-terrain.

### 4.4 Occupation cumulée

```ts
playerOccupationPercent =
  timeBallInOpponentHalf / elapsedMatchTime * 100;
```

Le taux d’occupation est donc le temps passé avec le ballon situé au-delà de 50 m, et non une valeur instantanée abstraite.

## 5. Boucle de simulation

Pas recommandé : 30 secondes simulées.

À chaque pas :

1. mettre à jour les temps de possession et d’occupation ;
2. déterminer le déplacement du ballon ;
3. tester une perte de balle ;
4. vérifier si une touche programmée doit se déclencher ;
5. vérifier si une occasion de marque est créée.

Le déplacement affiché à l’écran doit être interpolé de façon fluide, même si la simulation est discrète.

## 6. Déplacement du ballon

Probabilités provisoires :

| Situation | Probabilité | Déplacement |
|---|---:|---:|
| Progression forte | 15 % | 4 à 8 m |
| Progression normale | 45 % | 1 à 4 m |
| Stagnation | 25 % | −1 à +1 m |
| Recul | 15 % | 1 à 4 m dans le mauvais sens |

Si le joueur possède le ballon, une progression augmente la position. Si l’adversaire possède le ballon, elle la diminue.

L’écart de niveau entre les équipes ne peut modifier ces probabilités que faiblement, avec un correctif maximal de ±5 points de pourcentage.

### 6.1 Jeu à la main

Hors de ses propres 22 mètres, l'équipe en possession joue principalement à la main. Le ballon circule entre plusieurs couloirs latéraux et revient fréquemment dans la zone centrale située entre les deux lignes des 15 mètres. Les couloirs proches des touches restent possibles, mais le ballon ne doit pas alterner mécaniquement entre les deux extrêmes. Une phase peut avancer, stagner ou reculer et peut être suivie d'un point de fixation ramenant progressivement le jeu vers le centre.

Une phase à la main est représentée par deux segments : une passe latérale presque à hauteur ou légèrement vers l'arrière, puis une course droite dans le couloir de réception. La passe peut reculer de 0 à 1,8 mètre. La course assure ensuite la progression ou le recul longitudinal calculé par la simulation.

### 6.2 Dégagement depuis les 22 mètres

Dans ses propres 22 mètres, l'équipe en possession a 78 % de chances de se dégager au pied à chaque pas de simulation. Le ballon suit une trajectoire en cloche et retombe entre les 35 mètres du camp du botteur et une zone située dans le camp adverse. La réception rend normalement la possession à l'autre équipe. Une touche programmée peut conclure ce dégagement.

### 6.3 Percées

Une phase à la main peut produire une percée de 10 à 40 mètres. La probabilité initiale est de 5 % par minute simulée. Une perte de balle peut survenir à l'issue de la percée sans supprimer l'événement visuel de percée.

La probabilité de percée dépend du couloir : elle utilise 65 % de sa valeur de base au centre et monte progressivement jusqu'à 180 % sur les ailes. Lorsqu'une percée se déclenche, le porteur ne fait pas la passe suivante et continue tout droit dans son couloir. Une percée proche d'une ligne de touche peut se conclure par la touche programmée suivante.

## 7. Changement de possession

Risque de base : 8 % par minute simulée.

Pour un pas différent d’une minute :

```ts
pTurnoverStep = 1 - Math.pow(1 - 0.08, stepMinutes);
```

Une perte de balle change `ballOwner` sans téléportation du ballon.

Une perte aléatoire ne peut pas intervenir pendant les 1,5 premières minutes simulées d'une nouvelle séquence de possession. Après ce délai, le risque de base est de 5 % par minute. Cette protection ne concerne pas les dégagements, les scores ni les résultats de touche, qui peuvent changer immédiatement la possession.

## 8. Nombre de touches

Tirer une seule valeur par équipe au début du match ; le joueur et l’IA ont exactement le même nombre de lancers.

| Division | Touches offensives par équipe |
|---|---|
| Régionale 3 | 4 à 6 |
| Régionale 2 / Régionale 1 | 6 à 9 |
| Fédérale 3 | 7 à 10 |
| Fédérale 2 | 8 à 11 |
| Fédérale 1 | 8 à 12 |
| Nationale 2 / Nationale | 9 à 13 |
| Pro D2 / Top 14 | 10 à 14 |

Contraintes :

- minutes aléatoires ;
- minimum 3 minutes simulées entre deux touches ;
- aucune augmentation artificielle de fréquence en fin de match ;
- toutes les touches prévues doivent être jouées.

## 9. Déclenchement et cause d’une touche

La position du ballon fixe l’endroit de la touche. Une variation de −3 à +3 m peut être appliquée puis bornée entre 0 et 100.

Le côté latéral de la sortie est également mémorisé. Après la résolution de la touche, la simulation reprend près de la même ligne de touche avant que le jeu ne revienne progressivement vers le centre.

Causes internes possibles :

```ts
type TouchCause =
  | "carrierIntoTouch"
  | "openPlayKick"
  | "penaltyKick"
  | "fiftyTwenty"
  | "deflection";
```

La cause détermine l’équipe qui lance. Le quota égal de lancers par équipe reste prioritaire : le générateur doit choisir une cause compatible avec le lanceur programmé.

## 10. Résultat de la touche et état du match

Le moteur de touche donne directement la nouvelle équipe en possession.

- Ballon gagné proprement : possession au gagnant et bonus initial de progression.
- Ballon gagné difficilement : possession au gagnant, sans bonus.
- Ballon perdu, volé, en-avant ou pas droit : possession selon `LineoutResolution`.
- Les points de possession et d’occupation ne sont jamais modifiés directement : leurs pourcentages découlent de la suite de la simulation.

## 11. Pression offensive

Chaque équipe possède une pression offensive courante.

Seuil d’occasion de marque :

```ts
attackingPressureThreshold = 30;
```

| Événement dans les 22 adverses | Pression |
|---|---:|
| Conservation normale | +3 |
| Progression vers la ligne | +5 |
| Touche gagnée difficilement | +6 |
| Touche gagnée proprement | +12 |
| Touche volée à l’adversaire | +10 pour la nouvelle équipe |
| Touche perdue | remise à 0 |
| En-avant ou lancer pas droit | remise à 0 |

Une perte de possession remet la pression offensive de l’équipe à zéro.

## 12. Occasion immédiate après une touche dans les 22 adverses

La réussite d’une touche proche de la ligne doit avoir un impact très fort.

| Distance de la ligne adverse | Gagnée proprement | Gagnée difficilement |
|---:|---:|---:|
| 16 à 22 m | 50 % d’essai | 20 % |
| 8 à 15 m | 65 % | 35 % |
| 0 à 7 m | 80 % | 50 % |

Si l’essai n’est pas marqué :

- le gagnant conserve le ballon ;
- une forte pression offensive est maintenue ;
- la simulation reprend.

Si la défense récupère la touche, l’occasion immédiate d’essai est annulée et la pression offensive adverse revient à zéro.

## 13. Points

Résultats possibles :

- pénalité : 3 points ;
- essai non transformé : 5 points ;
- essai transformé : 7 points ;
- occasion manquée : 0 point.

Transformation provisoire :

```ts
conversionSuccessProbability = 0.75;
```

L’écart de niveau des équipes ne peut modifier une probabilité de marque que de ±5 points de pourcentage maximum.

Les pénalités peuvent être marquées hors des 22 mètres, mais elles ne doivent pas devenir le cœur du gameplay.

Après un score :

- ballon replacé visuellement à 50 m pour la remise au centre ;
- coup d’envoi donné par l’équipe qui vient d’encaisser vers le camp adverse ;
- réception et possession à l’équipe qui vient de marquer, dans son propre camp ;
- pression offensive remise à zéro.

## 14. Fin du match

Le match se termine entre 80 et 82 minutes simulées. La variation doit être tirée au début ou à l’approche de la 80e minute et rester reproductible avec une graine.

## 15. Affichage

Pendant la simulation :

- score ;
- chronomètre ;
- mini-terrain de 0 à 100 m ;
- ballon rempli avec la couleur principale de l'équipe et entouré de sa couleur secondaire lorsqu'il est tenu ;
- ballon blanc pendant une passe, un coup de pied ou toute autre phase libre ;
- possession cumulée ;
- occupation cumulée.
- bandeau court indiquant les phases importantes : jeu à la main, point de fixation, dégagement, percée, score, remise en jeu et sortie en touche.

Mouvement du ballon : fluide, avec déplacements latéraux sur les passes et trajectoires en cloche sur les coups de pied. La vitesse du ballon est indépendante de celle du chronomètre.

Une perte de balle n'ajoute ni texte ni animation dédiée : elle est indiquée uniquement par la couleur du ballon lors de sa nouvelle prise de possession. Il n'y a aucun choix tactique demandé au joueur pendant la simulation entre les touches.

Pendant le jeu à la main, le ballon conserve sans interruption la couleur principale de l'équipe en possession, y compris pendant une passe, un point de fixation, une percée ou un déplacement. Il devient blanc uniquement pendant un coup de pied, une sortie en touche ou une autre phase où aucune équipe ne le contrôle.

Dans le header du match et de la touche, le panneau de chaque équipe utilise sa couleur principale en fond et sa couleur secondaire en bordure.

Lors d’une touche :

```text
TOUCHE — 46e minute
Votre lancer
Dans les 22 m adverses — à 8 m de la ligne
```

Après la touche : une phrase courte. Un clic ouvre les détails du lancer, saut, mains et contre.
