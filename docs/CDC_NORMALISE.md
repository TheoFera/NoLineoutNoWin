# CDC normalisé — No Lineout No Win

Ce document est la version de travail que Codex doit suivre. Il intègre les corrections les plus récentes.

## 1. Concept

Jeu mobile tactique centré sur la touche au rugby. Le joueur passe par un menu d'accueil, puis entre directement dans l'entraînement jouable ou dans un match. Il ne contrôle pas tout le match. Il intervient uniquement sur les touches. Le reste du match est simulé par un timer rapide, un score, la possession et l'occupation.

## 2. Stack

- TypeScript
- Phaser 3 pour tous les écrans du jeu
- Vite pour le développement web
- Capacitor pour générer l'application Android
- Android Studio pour ouvrir, tester et publier l'app Android

## 3. Plateforme cible

- Mobile Android d'abord
- Portrait
- Pas de scroll pendant le match
- Gros boutons
- Interface sobre
- Sauvegarde locale
- Traduction Français / Anglais dès le départ

## 4. Règles non négociables

### 4.1 Positions de touche

Il existe exactement 7 positions dans l'alignement :

```text
1 - 2 - 3 - 4 - 5 - 6 - 7
```

Le lanceur est le talonneur. Ces positions sont les repères initiaux de l'alignement. Les plans V3 peuvent ensuite déplacer les joueurs sur une profondeur continue exprimée en mètres.

Donc il ne faut pas utiliser :

```ts
targetZone: "front" | "middle" | "back"
```

Le geste de lancer vise une profondeur physique réelle. Les cibles utilisées par la bibliothèque ou l'IA restent liées à une position et à un joueur réels, jamais à une zone abstraite.

### 4.2 Stats

Les joueurs de champ ont uniquement :

| Stat code | Nom français | Rôle |
|---|---|---|
| `speed` | Vitesse | se déplacer et contribuer au contact |
| `strength` | Force | lifter et maintenir le sauteur |
| `technique` | Technique | sauter, capter et contrôler le ballon |

Le talonneur est spécial :

| Stat code | Nom français | Rôle |
|---|---|---|
| `throwing` | Lancer | qualité du lancer |

Ne pas ajouter : endurance, lecture, mental, morale ou agilité. Le timing est une interaction du joueur, pas une statistique permanente.

La lecture doit être faite par le joueur humain.

## 5. Flux de lancement et boucle de jeu

Il y a un menu d'accueil simple dans le flux joueur.

Au lancement :

- le jeu ouvre le menu d'accueil ;
- si aucune sauvegarde n'existe, le bouton principal mène à la création du club puis de ses huit joueurs ;
- si une sauvegarde existe, le bouton principal mène directement à l'entraînement jouable.

Boucle principale visée :

```text
Lancement
→ menu d'accueil
→ création du club si besoin
→ création de l'équipe si besoin
→ entraînement jouable
→ match
→ résultat
→ retour à l'entraînement jouable
```

Le menu d'accueil affiche au minimum :

- le titre du jeu ;
- un bouton Jouer ou Continuer ;
- un bouton Paramètres.

Dans l'entraînement jouable, le joueur peut au minimum :

- jouer le match ;
- consulter l'équipe ;
- consulter le championnat.

L'écran intermédiaire avec le titre `Entraînement` ne fait pas partie du flux cible.

## 6. Création du club

V1 :

- nom du club
- couleur principale
- couleur secondaire

Pour l'instant, le squelette utilise un nom par défaut. Codex devra ensuite ajouter une vraie saisie mobile.

## 7. Progression

Le joueur commence en Régionale 3. Objectif : monter jusqu'au Top 14.

Montée en fin de saison :

- top 2 = montée
- sinon maintien

Pas de relégation, recrutement, départs ou vieillissement dans la V1.

## 8. Divisions

| Division | Touches par match | Combinaisons offensives |
|---|---:|---:|
| Régionale 3 | 4 à 6 | 2 |
| Régionale 2 | 5 à 7 | 3 |
| Régionale 1 | 5 à 7 | 3 |
| Fédérale 3 | 5 à 8 | 4 |
| Fédérale 2 | 6 à 9 | 4 |
| Fédérale 1 | 6 à 10 | 4 |
| Nationale 2 | 7 à 11 | 5 |
| Nationale | 7 à 11 | 5 |
| Pro D2 | 7 à 12 | 5 |
| Top 14 | 7 à 12 | 5 |

## 9. Match

Un match dure entre 80 et 82 minutes. Le timer avance vite jusqu'à une touche. Le joueur joue la touche. Puis le timer reprend. En fin de match, un écran de résultat simple s'affiche avant le retour à l'entraînement jouable.

Variables internes :

- possession
- occupation
- score

Une touche gagnée améliore la possession et l'occupation. Une touche perdue les dégrade.

## 10. Touches offensives

En attaque :

1. le joueur choisit une combinaison offensive ;
2. la combinaison exécute ses phases, déplacements, feintes et sauts ;
3. le joueur effectue un geste vertical pour choisir la profondeur du lancer ;
4. le talonneur lance selon sa statistique, sa fatigue et le geste ;
5. le moteur V3 suit la trajectoire et résout les contacts ;
6. le résultat affiché reste simple.

Résultats visibles :

- Ballon gagné
- Ballon gagné difficilement
- Ballon perdu
- Faute

## 11. Touches défensives

En défense :

1. l'adversaire choisit le nombre de joueurs dans l'alignement ;
2. le jeu sélectionne automatiquement les joueurs selon l'ordre de priorité défensive ;
3. le joueur peut les réorganiser ;
4. le jeu mémorise cette organisation par nombre de joueurs ;
5. le joueur peut déplacer un joueur ou un bloc avant le lancer ;
6. au départ du ballon, les déplacements sont verrouillés ;
7. le joueur déclenche au bon moment le saut du défenseur choisi.

## 12. Lifteurs

Saut offensif valide :

```text
lifteur - sauteur - lifteur
```

En défense, un saut avec le seul lifteur arrière est possible uniquement pour des joueurs dépassant les seuils V3 de Vitesse, Force et Technique.

Un joueur sans structure de lift peut encore quitter le sol physiquement, mais il ne constitue pas un bloc aérien offensif valide.

## 13. Résolution interne

Le moteur peut calculer :

- geste trop court ou trop lent
- lancer trop long
- lancer trop court
- lancer pas droit
- ballon mal capté
- ballon capté mais mal transmis
- ballon contesté
- ballon volé
- ballon gagné proprement

Mais l'interface affiche seulement un résultat simple.

## 14. MVP

La V1 doit contenir :

- menu d'accueil simple ;
- création du club simple ;
- personnalisation rapide des huit joueurs à la création ;
- entrée directe dans l'entraînement jouable ;
- équipe consultable ;
- championnat simple ;
- saison Régionale 3 ;
- classement ;
- match avec timer rapide ;
- écran de résultat simple ;
- 4 à 6 touches en Régionale 3 ;
- touches offensives par combinaison et geste vertical ;
- touches défensives avec placement et timing du saut ;
- stats Vitesse / Force / Technique ;
- talonneur avec Lancer ;
- progression simple ;
- sauvegarde locale ;
- montée si top 2 ;
- langue Français / English.
