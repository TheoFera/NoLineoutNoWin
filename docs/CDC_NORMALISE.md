# CDC normalisé — No Lineout No Win

Ce document est la version de travail que Codex doit suivre. Il intègre les corrections les plus récentes.

## 1. Concept

Jeu mobile tactique centré sur la touche au rugby. Le joueur ne contrôle pas tout le match. Il intervient uniquement sur les touches. Le reste du match est simulé par un timer rapide, un score, la possession et l'occupation.

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

Le lanceur est le talonneur. Le joueur ne vise pas une zone abstraite. Il vise un joueur placé sur l'une de ces positions.

Donc il ne faut pas utiliser :

```ts
targetZone: "front" | "middle" | "back"
```

Il faut utiliser :

```ts
targetPlayerId: string
targetPosition: 1 | 2 | 3 | 4 | 5 | 6 | 7
```

### 4.2 Stats

Les joueurs de champ ont uniquement :

| Stat code | Nom français | Rôle |
|---|---|---|
| `jump` | Saut | capter ou contrer en l'air |
| `lift` | Lift | aider un sauteur à monter |
| `hands` | Main | recevoir, contrôler, transmettre |

Le talonneur est spécial :

| Stat code | Nom français | Rôle |
|---|---|---|
| `throwing` | Lancer | qualité du lancer |

Ne pas ajouter : endurance, lecture, force, timing, mental, morale, agilité, vitesse.

La lecture doit être faite par le joueur humain.

## 5. Menu principal

- Nouvelle partie
- Continuer
- Parties en cours plus tard
- Options
- Langue : Français / English

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
| Régionale 2 | 6 à 9 | 3 |
| Régionale 1 | 6 à 9 | 3 |
| Fédérale 3 | 7 à 10 | 4 |
| Fédérale 2 | 8 à 11 | 4 |
| Fédérale 1 | 8 à 12 | 4 |
| Nationale 2 | 9 à 13 | 5 |
| Nationale | 9 à 13 | 5 |
| Pro D2 | 10 à 14 | 5 |
| Top 14 | 10 à 14 | 5 |

## 9. Match

Un match dure entre 80 et 82 minutes. Le timer avance vite jusqu'à une touche. Le joueur joue la touche. Puis le timer reprend.

Variables internes :

- possession
- occupation
- score

Une touche gagnée améliore la possession et l'occupation. Une touche perdue les dégrade.

## 10. Touches offensives

En attaque :

1. le joueur choisit une combinaison offensive ;
2. il clique sur le joueur visé ;
3. le talonneur lance ;
4. le moteur résout la touche ;
5. le résultat affiché reste simple.

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
5. le joueur clique au bon moment sur le joueur qui saute.

## 12. Lifteurs

Saut optimal :

```text
lifteur - sauteur - lifteur
```

Petit saut possible :

```text
sauteur - lifteur
```

Pas de vrai saut efficace sans soutien.

## 13. Résolution interne

Le moteur peut calculer :

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

- menu principal
- options langue
- nouvelle partie
- création du club simple
- saison Régionale 3
- championnat simple
- classement
- match avec timer rapide
- 4 à 6 touches en Régionale 3
- touches offensives par clic sur joueur
- touches défensives avec priorité
- stats Saut / Lift / Main
- talonneur avec Lancer
- progression simple
- sauvegarde locale
- montée si top 2
