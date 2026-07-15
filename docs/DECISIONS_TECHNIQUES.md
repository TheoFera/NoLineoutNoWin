# Décisions techniques

## Stack retenue

- TypeScript plutôt que JavaScript pur pour limiter les erreurs de structure.
- Phaser 3 pour tout le jeu, y compris les menus.
- Vite pour le développement local.
- Capacitor pour produire l'application Android.
- Android Studio pour tester et générer l'app Android.

## Pourquoi TypeScript

Le jeu manipule beaucoup de données : joueurs, équipes, positions, combinaisons, division, match, sauvegarde. TypeScript évite les erreurs simples : mauvais nom de champ, stat inexistante, position hors 1..7.

## Pourquoi Phaser partout

Cela évite de mélanger DOM HTML et canvas Phaser. Toute l'interface du jeu reste dans la même logique : scènes, boutons Phaser, textes Phaser, objets interactifs Phaser.

## Ce qui est exclu en V1

- serveur ;
- multijoueur ;
- cloud ;
- publicité ;
- achats intégrés ;
- vraie simulation complète du rugby ;
- 3D ;
- météo ;
- recrutement ;
- blessures complexes.

## Convention provisoire de réception V2

Le pack V2 calcule `scoreReceptionBloc` sans définir ses seuils de sortie. En
attendant une précision fonctionnelle, l'intégration utilise les seuils déjà
présents dans les règles voisines :

- moins de 50 : réception manquée ;
- de 50 à 60 inclus : ballon gagné difficilement ;
- plus de 60 : ballon gagné proprement.

Un lancer précis ou trop bas manqué devient un ballon libre attribué à 50/50.
Un lancer trop haut manqué suit la cascade prévue trois positions derrière la
cible. Ces valeurs restent centralisées dans `LineoutBalance.ts`.

## IA V2 : valeurs de sélection non chiffrées

`IA_TOUCHE_V2.md` impose les termes des scores mais ne chiffre pas l'amplitude
de l'ajustement aléatoire ni le poids minimal d'un choix. Les valeurs initiales
se trouvent dans `LINEOUT_BALANCE.ai.selection` : ajustement de -10 à +10,
poids minimal 1 et échelles normalisées sur 100. Elles sont provisoires et ne
sont jamais codées directement dans les modules d'IA.

## Simulation V2 : occasion de marque hors touche

`SIMULATION_MATCH_V2.md` définit le seuil de pression et les points, mais pas la
probabilité de convertir une pression de 30 en occasion ni la part de pénalités
hors des 22 mètres. Les valeurs initiales sont respectivement 35 % par minute
et 35 %, dans `LINEOUT_BALANCE.match`. Elles sont provisoires. Les probabilités
d'essai immédiat après une touche et de transformation restent exactement
celles du document V2.

## Outil statistique Gameplay V2

Le module `src/simulation/GameplayV2Simulation.ts` expose les deux points
d'entrée prévus par le plan : `simulateLineouts({ iterations, teams, context,
seed })` et `simulateMatches({ iterations, teams, division, seed })`. Le rapport
agrégé complet est reproductible avec `runGameplayV2Simulation`.

Le CLI s'exécute avec :

```text
npm run simulate:v2 -- [seed] [lancersParCellule] [touchesParDivision] [prédictionsIAParDivision] [matchsParDivision]
```

Sans argument, il utilise la graine `20260715` et produit le rapport JSON sur la
sortie standard. Les « points directs de touche » correspondent uniquement aux
points marqués lors de l'application immédiate de `LineoutResolution`. L'effet
indirect de la possession, du terrain gagné et de la pression reste inclus dans
le score final, mais n'est pas artificiellement attribué à une seule touche.
