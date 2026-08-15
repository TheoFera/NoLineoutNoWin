# Génération des équipes et attribution des combinaisons V2

Version : 2026-07-15

## 1. Principe général

- Le niveau de la division fixe une moyenne générale.
- Chaque club reçoit un modificateur fixe faible.
- Les statistiques individuelles sont générées autour de ces valeurs.
- Les statistiques déterminent les rôles ; le rôle ne doit jamais imposer directement la statistique finale.
- Il n’existe pas de surcouche de « profil de club » ajoutant artificiellement des bonus throwing/jump/lift/hands.

## 2. Niveau moyen par division

| Division | Moyenne | Plage habituelle générale |
|---|---:|---:|
| Régionale 3 | 60 | 50–70 |
| Régionale 2 | 65 | 55–75 |
| Régionale 1 | 70 | 60–80 |
| Fédérale 3 | 74 | 64–84 |
| Fédérale 2 | 78 | 68–88 |
| Fédérale 1 | 82 | 72–92 |
| Nationale 2 | 85 | 75–95 |
| Nationale | 88 | 78–98 |
| Pro D2 | 91 | 82–100 |
| Top 14 | 94 | 86–100 |

La moyenne est un budget collectif exact pour les trois statistiques des sept
joueurs de champ. Elle n'impose pas la même moyenne à chaque joueur : les
niveaux individuels sont volontairement dispersés, mais leur somme conserve la
moyenne de la division après application du modificateur du club.

Les statistiques `jump` et `lift` peuvent être inférieures à 60 dans les divisions basses, même si le niveau général du joueur est supérieur.

## 3. Écart entre clubs d’une même division

Chaque club reçoit un modificateur fixe :

```text
club faible : −3
club moyen : 0
club fort : +3
```

Cette différence reste faible afin que les décisions de touche aient davantage d’impact que l’écart brut entre équipes.

Le modificateur est appliqué à la moyenne collective avant la répartition des
points. Il ne doit pas être ajouté séparément à certaines statistiques, ce qui
fausserait le budget final.

## 4. Déduction automatique des rôles

Seuil provisoire : `60`.

```ts
canJump = jump >= 60;
canLift = lift >= 60;
```

| Jump | Lift | Rôle déduit |
|---:|---:|---|
| < 60 | < 60 | Aucun rôle aérien principal |
| < 60 | ≥ 60 | Lifteur |
| ≥ 60 | < 60 | Sauteur |
| ≥ 60 | ≥ 60 | Sauteur-lifteur |

`hands` ne détermine pas le rôle ; cette statistique sert à la réception.

## 5. Composition de référence en Régionale 3

Pour les sept joueurs d’alignement :

- joueurs 1 et 3 : deux lifteurs, avec `lift >= 60` et `jump < 60` ;
- trois sauteurs-lifteurs : deux relativement fiables et un plus faible proche du seuil de 60 ;
- deux sauteurs : `jump >= 60`, avec un `lift` faible, inférieur à 60.

Les sept joueurs possèdent donc déjà un rôle aérien.

Les profils de génération servent uniquement à orienter les valeurs. Après génération, le rôle affiché et utilisé est toujours déduit des statistiques réelles.

La Régionale 3 accepte volontairement de vrais points faibles :

- point faible : `25–45` ;
- statistique médiocre : `46–54` ;
- statistique normale : `55–67` ;
- point fort habituel : `68–79` ;
- point fort exceptionnel : `80–84`.

Une statistique ordinaire ne dépasse pas `79`. Une équipe de Régionale 3 a
`10 %` de chances de posséder un unique point fort exceptionnel entre `80` et
`84`. Aucun autre joueur de cette équipe ne dépasse alors `79` à la génération.

Chaque joueur possède un point fort relatif à ses deux autres statistiques. Un
lifteur peut donc avoir une Force normale autour de `70`, tout en ayant une
Vitesse et une Technique très faibles. Un point fort ne signifie pas forcément
une statistique exceptionnelle à l'échelle de la division.

## 6. Progression jusqu’à Fédérale 1

La montée de niveau augmente surtout les statistiques secondaires :

- les sauteurs améliorent progressivement leur `lift` ;
- les lifteurs améliorent progressivement leur `jump` ;
- les sauteurs-lifteurs deviennent plus fiables.

À partir de Fédérale 1, contrainte obligatoire pour les sept joueurs de l’alignement :

```ts
jump >= 60;
lift >= 60;
```

Tous peuvent donc sauter et lifter, avec des niveaux variables. Les différences de spécialisation restent visibles grâce aux écarts de statistiques.

Pour les divisions intermédiaires, ne pas imposer un nombre artificiel exact de rôles : la hausse des moyennes doit produire progressivement davantage de polyvalence. Seuls les points de contrôle Régionale 3 et Fédérale 1 sont obligatoires.

## 7. Talonneur

- La stat principale est `throwing`.
- Au démarrage en Régionale 3, elle doit normalement être comprise entre 60 et 70.
- La progression par division suit les moyennes générales, tout en restant bornée à 100.

## 8. Bibliothèque globale des combinaisons

Toutes les combinaisons existantes sont stockées dans un fichier de données unique, par exemple :

```text
src/data/LineoutCombinations.ts
```

La bibliothèque couvre exhaustivement toutes les dispositions de 3 à 7
joueurs parmi les 7 positions. Pour chaque disposition générée, elle expose
toutes les réceptions directes et tous les blocs de saut autorisés par les
règles ci-dessous.

Chaque combinaison contient uniquement :

- un identifiant stable ;
- les positions occupées ;
- les options de lancer ;
- les rôles par option.

Pour une réception directe ciblant la position `P`, les positions `P - 1` et
`P - 2` qui existent doivent toutes les deux être libres. La présence d'un
seul joueur de la même équipe dans l'une de ces deux positions invalide
l'option. Cette contrainte ne s'applique pas aux blocs de saut.

Les propriétés suivantes doivent être déduites du positionnement et ne doivent pas être dupliquées :

- nombre de blocs ;
- position maximale ;
- présence de deux lifteurs ;
- nombre de réceptions directes.

## 9. Attribution des combinaisons à une équipe

Cette attribution automatique concerne les équipes adverses générées. Lors de
la création du club et de l'équipe du joueur, aucune combinaison offensive
n'est définie, active ou placée en réserve. Les modèles vierges restent
disponibles dans l'éditeur afin que le joueur construise lui-même sa première
combinaison.

Ordre des filtres :

```text
Bibliothèque complète
→ compatibilité du talonneur avec les cibles
→ compatibilité avec les sauteurs disponibles
→ qualité attendue des blocs
→ compatibilité avec le style sizeWeights
→ tirage pondéré des actives et réserves
```

### 9.1 Compatibilité du talonneur

Pour chaque cible, utiliser la formule de lancer validée dans `GAMEPLAY_TOUCHE_V2.md`, sans fatigue et sur un grand nombre de simulations ou via son calcul analytique.

Une cible est normalement accessible si :

```ts
probabiliteLancerDroit >= 50 %;
```

Ne pas utiliser un tableau arbitraire de positions maximales si la formule permet le calcul directement.

### 9.2 Compatibilité des sauteurs

Pour une option `jumpBlock` :

- le joueur assigné comme sauteur doit avoir `jump >= 60` ;
- les autres joueurs du bloc sont considérés comme lifteurs ;
- il n’est pas nécessaire de vérifier un nombre abstrait de lifteurs en dehors du positionnement réel.

### 9.3 Qualité attendue du bloc

Sans fatigue ni hasard :

```ts
expectedJump =
  jumper.jump * 0.50
  + rearLifter.lift * 0.30
  + frontLifter.lift * 0.20
  + 10;
```

Seuil provisoire :

```ts
minimumExpectedJump = 50;
```

### 9.4 Cibles partielles

Une combinaison peut être attribuée même si certaines de ses options sont trop difficiles. Pour cette équipe, retirer uniquement les options non éligibles, à condition qu’il reste au moins une cible valide.

### 9.5 Part maximale de combinaisons sans saut porté

Dans chaque groupe de combinaisons actives ou de réserve attribué à une équipe
IA, les combinaisons qui ne proposent aucun `jumpBlock` avec un lifteur devant
et un lifteur derrière sont limitées à :

```ts
Math.floor(nombreDeCombinaisons / 3)
```

Avec deux combinaisons, elles sont donc toutes les deux aériennes. Avec trois
combinaisons, une seule peut ne proposer que des réceptions directes.

## 10. Attribution des joueurs aux rôles

Pour chaque option de lancer, rechercher l’affectation compatible la plus performante.

Scores d’aide à l’affectation :

```ts
jumperScore = jump * 0.70 + hands * 0.30;
rearLifterScore = lift * 0.80 + jump * 0.20;
frontLifterScore = lift * 0.70 + jump * 0.30;
directReceiverScore = hands;
```

Un joueur ne peut occuper qu’un rôle dans une option donnée. Il peut avoir un autre rôle dans une autre option de la même combinaison.

## 11. Contrôle après génération

```text
Générer les statistiques
→ déduire les rôles
→ vérifier les contraintes de la division
→ transférer les points nécessaires sans modifier le budget collectif
→ attribuer les combinaisons
```

Une correction ne doit jamais créer gratuitement des points. Par exemple, un
gain de deux points en Technique doit être compensé par le retrait de deux
points dans une autre statistique du même effectif.

Ne pas régénérer sans fin toute l’équipe. Le générateur doit être déterministe avec une graine et produire un rapport de validation exploitable dans les tests.
