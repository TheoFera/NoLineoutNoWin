# Gameplay V3 — Source de vérité

Version du jeu : 1.0.2

Ce document décrit le gameplay actuellement officiel de **No Lineout No Win**.
Il remplace les documents Gameplay V2 pour toute décision future. Les anciens
documents V2 restent dans le dépôt uniquement comme historique et ne doivent
plus servir à modifier le jeu.

## 1. Principes

- Le jeu reste centré sur la touche au rugby.
- Le match est simulé entre les touches ; le joueur intervient sur les touches.
- L'alignement conserve sept positions de référence numérotées de 1 à 7.
- Les déplacements d'une combinaison utilisent ensuite une profondeur physique
  continue exprimée en mètres.
- Il n'existe pas de `targetZone` abstraite.
- Le moteur V3 résout les déplacements, les sauts, la trajectoire du ballon et
  les contacts à partir de leur géométrie et de leur chronologie réelles.

## 2. Statistiques des joueurs

Les joueurs de champ possèdent uniquement trois statistiques permanentes :

| Code | Nom visible | Effet principal |
|---|---|---|
| `speed` | Vitesse | vitesse des déplacements et contribution secondaire au contact |
| `strength` | Force | efficacité et maintien du lift |
| `technique` | Technique | qualité du saut, du contact aérien et de la réception |

Le talonneur possède `throwing` (**Lancer**), qui détermine la précision de la
trajectoire.

La fatigue est une valeur temporaire du match exprimée en pourcentage. Elle
réduit les statistiques effectives, mais ne devient jamais une statistique
permanente du joueur.

Ne pas ajouter de statistique permanente comme `reading`, `timing`, `morale`,
`endurance` ou `agility`.

## 3. Combinaisons

Une combinaison contient :

- des joueurs affectés aux positions de référence ;
- un plan composé d'une ou plusieurs phases ;
- dans chaque phase, des actions `move`, `feint` ou `jump` ;
- pour un saut, le sauteur et ses lifteurs compatibles.

Les actions sont exécutées dans l'ordre des phases. Les mouvements utilisent la
Vitesse réelle des joueurs. Les sauts offensifs valides nécessitent un lifteur
avant et un lifteur arrière placés à portée. Les leurres peuvent se déplacer ou
effectuer une feinte avant le saut final.

Les anciennes options `jumpBlock` et `directCatch` restent utilisables par la
bibliothèque et par l'IA pour préparer un plan, mais la résolution V3 dépend de
la position physique réelle des joueurs et du ballon.

## 4. Touche offensive du joueur

1. Le joueur choisit une combinaison.
2. La combinaison démarre et exécute ses phases.
3. Le joueur effectue un geste vertical vers le haut pour lancer.
4. La distance du geste choisit la profondeur physique demandée.
5. Un geste trop court ou trop lent est refusé et peut être recommencé.
6. La statistique Lancer, la fatigue et la part aléatoire injectable déterminent
   l'écart réel en profondeur, en hauteur et latéralement.
7. Le moteur suit ensuite le ballon jusqu'au contact ou à sa récupération.

Le geste ne choisit jamais une zone abstraite. Il vise une profondeur réelle de
l'alignement, à laquelle les joueurs présents peuvent tenter de capter le ballon.

## 5. Touche défensive du joueur

Avant le lancer adverse, le joueur peut :

- réorganiser les défenseurs ;
- déplacer un joueur ou un groupe compatible ;
- préparer un bloc de saut.

Au départ du ballon, les déplacements défensifs sont verrouillés. Le joueur
déclenche alors le saut du défenseur choisi. Le moment du saut influence la
hauteur atteinte lors du passage du ballon et produit les retours « trop tôt »,
« bon timing » ou « trop tard ».

Un bloc défensif peut utiliser deux lifteurs. Un unique lifteur arrière n'est
possible que si les seuils V3 de Force, Vitesse et Technique sont dépassés.

## 6. Trajectoire et résolution

Le geste détermine une profondeur demandée. Le moteur calcule ensuite :

- la profondeur réelle ;
- la hauteur et la classe de trajectoire : précise, basse, haute ou pas droite ;
- la déviation latérale ;
- la durée du vol ;
- les joueurs à portée du ballon au même instant.

La résolution distingue notamment :

- réception propre ou difficile ;
- duel aérien gagné ou perdu ;
- en-avant ;
- lancer pas droit ;
- ballon non touché ;
- récupération au sol.

Les détails numériques restent internes. Au relâchement d'un lancer valide, la
barre évalue uniquement la profondeur demandée par rapport à la réception prévue
par la combinaison : vert avec une étoile pour un bon dosage, orange ou rouge
avec un repère d'écart sinon. Les déplacements prévus sont pris en compte ; ce
retour ne garantit ni la précision réelle du talonneur ni la réception.

En match, après la réception ou la récupération, une pulsation sur les bords de
l'écran indique le résultat pour le joueur (vert ou rouge), sans texte ni symbole
près des joueurs. Le dézoom et la simulation reprennent automatiquement après
cette pulsation. Le sifflet accompagne les en-avant et les lancers sanctionnés
« pas droits ». Le mode « S'entraîner » utilise la même pulsation, puis un dézoom
et un retour automatique à l'éditeur de la combinaison, sans panneau de résultat.

## 7. IA et match

- L'IA continue de choisir ses combinaisons et ses cibles selon son identité, sa
  mémoire, sa division et une source aléatoire injectable.
- Son plan V3 peut ajouter des phases, des feintes et des mouvements de leurre
  selon la division.
- Son lancer est synchronisé avec la phase correspondant à sa cible réelle.
- La simulation accélérée du terrain, de la possession, de l'occupation et du
  score reprend entre les touches.

## 8. Sources techniques

| Domaine | Source principale |
|---|---|
| Modèles V3 | `src/models/LineoutV3.ts` et `src/models/Combination.ts` |
| Moteur | `src/rules/LineoutV3Engine.ts` |
| Géométrie | `src/rules/LineoutV3Geometry.ts` |
| Éligibilité des sauts | `src/rules/LineoutV3ActionEligibility.ts` |
| Plans de combinaison | `src/rules/LineoutV3Combination.ts` |
| Plans offensifs de l'IA | `src/ai/LineoutAiCombinationPlan.ts` |
| Équilibrage | `src/config/LineoutBalance.ts`, section `gameplayV3` |
| Présentation et interactions | `src/scenes/LineoutScene.ts` |

Les valeurs réglables doivent rester centralisées dans `LineoutBalance.ts`. Les
formules métier doivent rester dans `src/rules/` et ne pas être déplacées dans
la scène Phaser.
