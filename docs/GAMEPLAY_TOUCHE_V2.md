# Gameplay de touche V2 — Source de vérité

Version : 2026-07-15

Ce document décrit le moteur de résolution d’une touche. Il prévaut sur l’ancien comportement du code pour les mécaniques V2.

## 1. Principes obligatoires

- Aucun mini-jeu de timing ou d’exécution.
- En attaque, le joueur choisit une combinaison puis une option de lancer : bloc de saut ou réception directe.
- En défense, le joueur choisit le bloc avec lequel il veut contrer.
- Toutes les valeurs ajustables doivent être centralisées dans `src/config/LineoutBalance.ts`.
- L’aléatoire doit être injectable afin de rendre les tests déterministes.
- Les scènes Phaser affichent le résultat ; elles ne contiennent aucune formule métier.
- Les notes de lancer, saut, réception et contre sont bornées entre 0 et 100.

## 2. Données principales

```ts
interface LineoutResolutionInput {
  minute: number;
  throwingTeamId: string;
  defendingTeamId: string;
  targetOption: TargetOption;
  attackingAssignments: LineoutAssignments;
  defendingAssignments: LineoutAssignments;
  defensiveJumpPosition?: number;
  fatigueByPlayerId: Record<string, number>; // pourcentage actuel
  rng: RandomSource;
}
```

```ts
interface TargetOption {
  targetPosition: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  type: "jumpBlock" | "directCatch";
  roles: {
    jumperPosition?: number;
    frontLifterPosition?: number;
    rearLifterPosition?: number;
    directCatcherPosition?: number;
  };
}
```

## 3. Distance du lancer

La distance normalisée va de `0` à `7` :

- `0` : cible la plus proche du talonneur ;
- `7` : cible la plus éloignée.

Le moteur doit utiliser la géométrie réelle si elle existe déjà. À défaut, pour les positions 1 à 7 :

```ts
distanceIndex = ((targetPosition - 1) / 6) * 7;
```

Les coefficients entre deux indices entiers sont interpolés linéairement.

| Distance | Coefficient |
|---:|---:|
| 0 | 1,00 |
| 1 | 0,99 |
| 2 | 0,97 |
| 3 | 0,94 |
| 4 | 0,90 |
| 5 | 0,85 |
| 6 | 0,79 |
| 7 | 0,72 |

## 4. Qualité du lancer

### 4.1 Statistique du talonneur

- `throwing` est compris entre 60 et 100 pour les talonneurs jouables.
- Au début d’une partie en Régionale 3, le talonneur doit normalement se situer entre 60 et 70.

### 4.2 Fatigue

Chaque joueur reçoit au début du match une fatigue maximale aléatoire comprise entre 5 et 15 %.

```ts
fatigueActuelle = fatigueMaximale * (minute / 80);
```

Cette valeur doit rester configurable.

### 4.3 Amplitude d’irrégularité

L’incertitude normale diminue avec la statistique du talonneur :

```ts
amplitude = clamp(
  30 - ((throwing - 60) / 40) * 20,
  10,
  30
);
```

| Throwing | Hasard normal |
|---:|---:|
| 60 | −30 à +30 |
| 70 | −25 à +25 |
| 80 | −20 à +20 |
| 90 | −15 à +15 |
| 100 | −10 à +10 |

### 4.4 Erreur exceptionnelle

Même un talonneur à 100 peut complètement rater son geste.

```ts
pErreurExceptionnelle =
  0.001 + 0.049 * Math.pow(distanceIndex / 7, 2);
```

- Distance 0 : 0,1 %.
- Distance 7 : 5 %.

En cas d’erreur exceptionnelle :

```ts
qualiteLancer = uniform(0, 25);
```

### 4.5 Formule

```ts
qualiteBase = throwing * coefficientDistance;
qualiteFatiguee = qualiteBase * (1 - fatigueActuelle / 100);
qualiteLancer = clamp(
  qualiteFatiguee + uniform(-amplitude, amplitude),
  0,
  100
);
```

L’erreur exceptionnelle est testée avant le calcul normal.

### 4.6 Références statistiques sans fatigue

Un lancer est considéré « droit » si sa qualité atteint 50. Les probabilités approximatives attendues sont :

| Distance | T60 | T70 | T80 | T90 | T100 |
|---:|---:|---:|---:|---:|---:|
| 0 | 66,6 % | 89,9 % | 99,9 % | 99,9 % | 99,9 % |
| 1 | 65,5 % | 88,4 % | 99,8 % | 99,8 % | 99,8 % |
| 2 | 63,3 % | 85,4 % | 99,5 % | 99,5 % | 99,5 % |
| 3 | 60,1 % | 80,8 % | 99,0 % | 99,0 % | 99,0 % |
| 4 | 55,7 % | 74,7 % | 98,3 % | 98,3 % | 98,3 % |
| 5 | 50,3 % | 67,2 % | 92,5 % | 97,4 % | 97,4 % |
| 6 | 44,0 % | 58,4 % | 79,9 % | 96,3 % | 96,3 % |
| 7 | 36,7 % | 48,3 % | 65,5 % | 94,4 % | 95,0 % |

Les tests Monte-Carlo peuvent utiliser une tolérance raisonnable.

## 5. Trajectoire du lancer

### 5.1 Lancer pas droit

```ts
if (qualiteLancer < 50) {
  trajectory = "notStraight";
}
```

Un lancer inférieur à 50 est toujours pas droit.

### 5.2 Lancer droit : précis, trop bas ou trop haut

Pour `Q >= 50` :

```ts
x = (Q - 50) / 50;
smooth = 3 * x * x - 2 * x * x * x;
pPrecis = 1 / 3 + (2 / 3) * smooth;
pTropBas = (1 - pPrecis) / 2;
pTropHaut = (1 - pPrecis) / 2;
```

| Q | Précis | Trop bas | Trop haut |
|---:|---:|---:|---:|
| 50 | 33,3 % | 33,3 % | 33,3 % |
| 60 | 40,3 % | 29,9 % | 29,9 % |
| 70 | 56,8 % | 21,6 % | 21,6 % |
| 80 | 76,5 % | 11,7 % | 11,7 % |
| 90 | 93,1 % | 3,5 % | 3,5 % |
| 100 | 100 % | 0 % | 0 % |

## 6. Qualité du saut

### 6.1 Pondérations

```ts
jumpEffectif = jump * (1 - fatigueSauteur / 100);
rearLiftEffectif = rearLift * (1 - fatigueLifteurArriere / 100);
frontLiftEffectif = frontLift * (1 - fatigueLifteurAvant / 100);

qualiteBaseSaut =
  jumpEffectif * 0.50
  + rearLiftEffectif * 0.30
  + frontLiftEffectif * 0.20;
```

Le lifteur arrière est plus important que le lifteur avant.

### 6.2 Structure du bloc

| Structure | Modificateur |
|---|---:|
| Deux lifteurs | +10 |
| Un seul lifteur | −20 |
| Aucun lifteur | saut impossible |

### 6.3 Hasard du saut

Même logique que pour le lancer, basée sur `qualiteBaseSaut` :

```ts
amplitudeSaut = clamp(
  30 - ((qualiteBaseSaut - 60) / 40) * 20,
  10,
  30
);
```

```ts
qualiteSaut = clamp(
  qualiteBaseSaut
  + modificateurStructure
  + uniform(-amplitudeSaut, amplitudeSaut),
  0,
  100
);
```

La qualité du saut est une note continue ; un saut n’est pas simplement « réussi » ou « raté ».

## 7. Réception par le bloc offensif sans duel au même poste

### 7.1 Effet de trajectoire

| Trajectoire | Malus d’accessibilité |
|---|---:|
| Précis | 0 |
| Trop bas | −15 |
| Trop haut | −25 |

### 7.2 Correction des mains

```ts
correctionMains = (hands - 70) * 0.50;

scoreReceptionBloc = clamp(
  qualiteSaut
  + malusTrajectoire
  + correctionMains,
  0,
  100
);
```

Ce score sert lorsque le bloc offensif n’est pas en duel direct avec un bloc défensif au même poste.

## 8. Contre défensif

### 8.1 Défenseur au même poste que la cible

Il y a duel aérien.

```ts
scoreAttaque =
  qualiteSautAttaque * 0.50
  + handsAttaquant * 0.50
  + malusTrajectoireAttaque;

scoreDefense =
  qualiteSautDefense * 0.50
  + handsDefenseur * 0.50;

écart = scoreAttaque - scoreDefense;
```

| Écart | Résultat |
|---:|---|
| > +10 | Ballon gagné proprement par le camp qui lance |
| 0 à +10 | Ballon gagné difficilement par le camp qui lance |
| −15 à −1 | Ballon dévié et récupéré par la défense |
| < −15 | Ballon volé proprement par la défense |

En cas d’égalité, priorité au camp qui lance.

### 8.2 Défenseur une position devant

#### Lancer précis

```ts
scoreContre = qualiteSautDefense - 5;
difficulte = 70 + (qualiteLancer - 50) * 0.30;
```

#### Lancer trop bas

```ts
scoreContre = qualiteSautDefense - 5;
difficulte = 45 + (qualiteLancer - 50) * 0.20;
```

#### Lancer trop haut

Contre impossible.

### 8.3 Défenseur deux positions devant

Le contre est possible uniquement si le lancer est trop bas.

```ts
scoreContre = qualiteSautDefense - 30;
difficulte = 50 + (qualiteLancer - 50) * 0.20;
```

Pour un lancer précis ou trop haut : contre impossible.

### 8.4 Défenseur derrière la cible

Le contre initial est impossible.

### 8.5 Résultat d’une interception devant

```ts
margeInterception = scoreContre - difficulte;
```

Si la marge est négative, le ballon continue vers la cible offensive.

Correction des mains du défenseur :

```ts
correctionMainsInterception =
  20 * Math.pow(Math.max(0, hands - 50) / 50, 2);

margeControle = margeInterception + correctionMainsInterception;
```

| Mains | Correction approximative |
|---:|---:|
| 0 à 50 | 0 |
| 60 | +0,8 |
| 70 | +3,2 |
| 80 | +7,2 |
| 90 | +12,8 |
| 100 | +20 |

| Marge de contrôle | Résultat |
|---:|---|
| 0 à 15 | Ballon dévié et récupéré par la défense |
| > 15 | Ballon volé proprement par la défense |

Un ballon dévié et récupéré par la défense est immédiatement considéré comme gagné par elle ; aucune nouvelle cascade de mains n’est lancée.

## 9. Risque d’en-avant

Le risque de base dépend de `hands`, par interpolation linéaire entre ces points :

| Hands | Risque |
|---:|---:|
| 0 | 50 % |
| 20 | 30 % |
| 40 | 15 % |
| 50 | 10 % |
| 60 | 7,5 % |
| 70 | 5 % |
| 80 | 2,5 % |
| 90 | 1,3 % |
| 100 | 0,1 % |

Le test d’en-avant est appliqué :

- lorsqu’un attaquant gagne le duel aérien ;
- lorsqu’un défenseur vole proprement le ballon ;
- lorsqu’un joueur récupère un ballon trop haut ;
- lorsqu’un ballon est envoyé directement sur un joueur.

Il n’est pas rejoué après un résultat déjà classé « ballon dévié et récupéré ».

## 10. Réception directe et récupérations secondaires

Une première réception manquée ne devient pas automatiquement un `looseBall`.
Le ballon poursuit sa trajectoire et les joueurs réellement placés sur son
passage peuvent tenter de le capter. L’issue `looseBall` est réservée au ballon
qui dépasse réellement la position 7 et sort au-delà de la ligne des 15 mètres.

### 10.1 Score de récupération seul

```ts
scoreRecuperation =
  hands * 0.70
  + uniform(0, 100) * 0.30
  + modificateurPlacement;
```

Seuil de réussite : `50`.

| Placement adverse proche | Modificateur |
|---|---:|
| Aucun adversaire proche | +5 |
| Adversaire une position devant | −30 |
| Adversaire deux positions devant | −15 |
| Adversaire une position derrière | −15 |
| Plus éloigné | 0 |

Si plusieurs modificateurs sont possibles, appliquer uniquement le plus pénalisant.

### 10.2 Risque d’en-avant sous pression

- Adversaire une position devant : `risqueBase * 2 + 10`.
- Adversaire deux positions devant ou une position derrière : `risqueBase * 1,5 + 5`.
- Risque final borné à 60 %.

### 10.3 Deux joueurs adverses au même poste

Chaque joueur calcule :

```ts
score = hands * 0.70 + uniform(0, 100) * 0.30;
```

- Aucun score à 50 : le ballon continue derrière.
- Un seul score à 50 : ce joueur tente la réception.
- Les deux scores à 50 : le meilleur récupère.
- Égalité : priorité au camp qui lançait.
- Le vainqueur effectue ensuite son test d’en-avant.

### 10.4 Joueurs autorisés à tenter une récupération secondaire

- Un lifteur encore engagé dans le bloc de saut ne peut pas tenter la
  récupération secondaire.
- À un poste occupé par un seul joueur disponible, ce joueur effectue une
  tentative individuelle.
- À un poste occupé par un joueur disponible de chaque équipe, les deux joueurs
  effectuent un duel de mains selon la règle de la section 10.3.
- Toute récupération secondaire réussie est suivie du test d’en-avant de la
  section 9.

### 10.5 Ordre des tentatives selon la trajectoire

`P` désigne la position initialement visée.

| Trajectoire et saut | Ordre des tentatives | Si personne ne capte le ballon |
|---|---|---|
| Ballon précis, saut réussi | Le sauteur en `P`, puis `P+2`, puis `P+3` | Ballon au sol après `P+3`, sauf si `P+3` dépasse la position 7 |
| Ballon précis, saut raté | `P+2`, puis `P+3` | Ballon au sol après `P+3`, sauf si `P+3` dépasse la position 7 |
| Ballon trop bas, saut réussi | `P−2` avec un malus de `−30`, puis `P−1` sans malus, puis le sauteur en `P` avec le malus de trajectoire `−15` | Ballon au sol en `P` |
| Ballon trop bas, saut raté | `P−2`, puis `P−1`, puis le sauteur initial en `P`, sous forme de tentatives individuelles | Ballon au sol en `P`, possession 50/50 |
| Ballon trop haut, saut réussi | Le sauteur en `P` peut encore capter avec le malus de trajectoire `−25`. En cas d’échec : `P+2`, `P+3`, puis chaque position de `P+4` à `P+7` encore située dans l’alignement | Si le ballon dépasse la position 7 : `looseBall`, possession 50/50 |
| Ballon trop haut, saut raté | Aucune tentative en `P` ni en `P+1`. Tentatives en `P+2`, `P+3`, puis de `P+4` jusqu’à la position 7 | Si le ballon dépasse la position 7 : `looseBall`, possession 50/50 |

Un saut est réussi lorsque sa qualité atteint le seuil configurable de `50`.

Pour une réception directe :

- ballon précis : tentative du joueur visé, puis `P+2` et `P+3` s’il échoue ;
- ballon trop bas : `P−2` avec `−30`, puis `P−1` sans malus, puis le joueur
  visé en `P` ;
- ballon trop haut : le joueur visé ne peut pas atteindre le ballon sans saut ;
  les tentatives commencent en `P+2`, puis continuent jusqu’à la position 7.

La position `P+1` ne tente jamais de capter un ballon qui poursuit sa
trajectoire derrière la cible.

### 10.6 Ballon au sol

Quand le ballon reste dans l’alignement et tombe au sol, ce n’est pas un
`looseBall`.

Chaque équipe désigne son joueur disponible le plus proche du point de chute.
Hors du cas « ballon trop bas et saut raté », leur score est :

```ts
scoreBallonAuSol =
  hands * 0.70
  + uniform(0, 100) * 0.30
  - distanceEnPositions * 10;
```

Le meilleur score récupère le ballon. En cas d’égalité, le camp qui lançait est
prioritaire.

Pour un ballon trop bas associé à un saut raté, l’équipe qui récupère est tirée
à 50/50, puis le joueur disponible le plus proche de cette équipe est désigné
comme récupérateur.

### 10.7 Consignes d’animation associées

- En `P+2` et `P+3`, une tentative utilise la pose `jumper` avec un petit saut
  vertical de `6 px`, qu’elle réussisse ou non.
- Sur un ballon trop bas avec un saut réussi, les tentatives en `P−2` et `P−1`
  utilisent également la pose `jumper` avec un saut de `6 px`.
- Sur un ballon trop bas avec un saut raté, les tentatives en `P−2`, `P−1` et
  `P` utilisent la pose `jumper` sans décoller du sol.
- À partir de `P+4`, une tentative sur ballon trop haut utilise uniquement la
  pose `hand`.
- Une récupération réussie se termine avec la pose `hand` et le ballon reste
  dans les mains du récupérateur jusqu’au changement de scène.
- Un en-avant secondaire part des mains du fautif, avance horizontalement vers
  le camp adverse, puis tombe au sol.
- Un ballon qui dépasse la position 7 continue en ligne droite vers le haut et
  sort de l’écran.
- Un ballon tombé au sol reste visible ; s’il est ensuite récupéré, il termine
  dans les mains du joueur désigné.

### 10.8 Textes affichés après une récupération secondaire

Le sous-texte est composé de deux informations obligatoires :

1. la cause initiale : trajectoire précise, trop basse ou trop haute, réussite
   du saut ou réception directe ;
2. l’issue réelle : récupération devant, derrière, lors d’un duel, au sol,
   en-avant ou dépassement de la ligne des 15 mètres.

Un lancer trop haut et un saut raté sont deux événements indépendants. Le texte
ne doit jamais déduire l’un à partir de l’autre.

| Option et trajectoire | Cause à expliquer |
|---|---|
| Bloc, précis, saut réussi | Lancer à la bonne hauteur, saut réussi, ballon non capté |
| Bloc, précis, saut raté | Lancer à la bonne hauteur, saut raté, ballon inaccessible |
| Bloc, bas, saut réussi | Lancer trop bas, ballon présenté d’abord aux joueurs devant |
| Bloc, bas, saut raté | Lancer trop bas et saut raté |
| Bloc, haut, saut réussi | Lancer trop haut malgré un saut réussi |
| Bloc, haut, saut raté | Lancer trop haut et saut raté |
| Réception directe précise | Lancer à la bonne hauteur, joueur visé ne captant pas le ballon |
| Réception directe basse | Lancer direct trop bas, joueurs devant servis en premier |
| Réception directe haute | Lancer direct trop haut, ballon passant au-dessus du joueur non lifté |

Les issues finales doivent ensuite préciser :

- si la récupération se produit devant ou derrière la cible ;
- si elle résulte d’une tentative individuelle ou d’un duel de mains ;
- si le ballon tombe au sol avant d’être récupéré ;
- quel camp récupère ;
- quel camp commet l’en-avant et à qui revient la mêlée.

Titres associés :

| Situation | Titre |
|---|---|
| Récupération secondaire par l’équipe du joueur | `Touche récupérée` |
| Perte en attaque après récupération secondaire adverse | `Perte du ballon` |
| Touche adverse conservée quand le joueur défend | `Touche perdue` |
| Récupération au sol par l’équipe du joueur | `Ballon récupéré au sol` |
| Récupération au sol par l’adversaire | `Ballon perdu au sol` |
| En-avant secondaire de l’équipe du joueur | `En-avant à la récupération` |
| En-avant secondaire adverse | `En-avant adverse` |
| Dépassement des 15 mètres après un lancer haut | `Ballon trop haut` |
| Dépassement des 15 mètres après un lancer précis non capté | `Ballon au-delà des 15 mètres` |

## 11. Issues finales

```ts
type LineoutOutcome =
  | "cleanWin"
  | "scrappyWin"
  | "deflectedTurnover"
  | "cleanSteal"
  | "knockOn"
  | "notStraight"
  | "looseBall";
```

```ts
interface LineoutResolution {
  outcome: LineoutOutcome;
  ballTeam: "throwingTeam" | "defendingTeam";
  restart: "continuousPlay" | "scrum";
  offendingTeam?: "throwingTeam" | "defendingTeam";
  primaryReason: string;
  details: Record<string, number | string | boolean>;
}
```

| Issue | Équipe qui récupère | Reprise |
|---|---|---|
| Ballon gagné proprement | Camp qui lance | Jeu continu |
| Ballon gagné difficilement | Camp qui lance | Jeu continu |
| Ballon dévié et récupéré | Défense | Jeu continu |
| Ballon volé proprement | Défense | Jeu continu |
| En-avant du camp qui lance | Défense | Mêlée |
| En-avant de la défense | Camp qui lance | Mêlée |
| Lancer pas droit | Défense | Mêlée |
| Ballon sorti au-delà des 15 mètres sans être capté | 50 % lanceur / 50 % défense | Jeu continu |

## 12. Ordre obligatoire du résolveur

```text
Choix de l’option de lancer
→ qualité du lancer
→ lancer pas droit ou trajectoire
→ qualité du saut offensif
→ qualité du saut défensif
→ position relative du contre
→ duel ou interception éventuelle
→ tentatives secondaires devant la cible si le ballon est trop bas
→ réception offensive si le contre et les tentatives devant échouent
→ test d’en-avant éventuel
→ récupérations secondaires derrière la cible si le ballon continue
→ duel au sol ou sortie réelle au-delà des 15 mètres
→ issue finale et équipe en possession
```
