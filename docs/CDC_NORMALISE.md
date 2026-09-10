# CDC normalisé — No Lineout No Win

Ce document est la version de travail que Codex doit suivre. Il intègre les corrections les plus récentes.

## 1. Concept

Jeu mobile tactique centré sur la touche au rugby. Le joueur passe par un menu d'accueil, puis gère son groupe touche avant de choisir les combinaisons ou le championnat. Il ne contrôle pas tout le match. Il intervient uniquement sur les touches. Le reste du match est simulé par un timer rapide, un score, la possession et l'occupation.

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
- si une sauvegarde existe, le bouton principal mène au gestionnaire du groupe touche.

Boucle principale visée :

```text
Lancement
→ menu d'accueil
→ création du club si besoin
→ création de l'équipe si besoin
→ gestion du groupe touche
→ combinaisons et entraînement, ou championnat
→ match
→ résultat
→ progression et éventuel bilan de saison
→ retour à la gestion du groupe touche
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

Pas de relégation, départs ou vieillissement dans la V1. Le recrutement gratuit par roue est disponible, sans publicité.

### Groupe touche et recrutement

- À la création : sept titulaires de champ et un talonneur, aucun remplaçant.
- Le gestionnaire charge le terrain dès l'arrivée et reprend la taille des joueurs de l'entraînement. Placement : 1–2–3 en bas (2 légèrement plus bas), 4–5 au milieu, 7–8–9 en haut (8 légèrement plus haut). Aucun titre ou panneau d'aide ne masque le terrain. Le banc est compact, illimité et paginé sans défilement.
- Toucher un joueur affiche en haut le même bandeau de statistiques que dans l'entraînement ; il est masqué par défaut.
- La roue produit un joueur de champ ou un talonneur (probabilité de talonneur : 1/8). Le résultat est sauvegardé avant l'animation.
- Le joueur peut refuser la recrue ou « Intégrer à l'équipe » : elle rejoint le banc. Son nom est prérempli et modifiable (12 caractères maximum), tiré parmi les noms libres dans l'effectif ; après épuisement de la liste, un suffixe permet de conserver des noms distincts.
- La génération réutilise `generateLineoutRoster`, comme à la création du club, avec ses profils spécialisés et points forts. Le recrutement conserve un joueur de ce groupe généré, sans produire de répertoire tactique.
- Niveau tiré : 75 % pour la division actuelle N, 20 % pour N+1, 5 % pour N+2. Ces probabilités sont centralisées dans `LineoutBalance.ts`. Les niveaux au-delà du Top 14 utilisent le générateur du Top 14.
- La roue présente six portraits cadrés sur le haut du corps, leur poste d'origine (Talon, Pilier, 2ème ligne ou 3ème ligne) et une à trois étoiles. Ce poste provient du profil de génération et reste indépendant du numéro porté ; il ne remplace pas les règles physiques de sauteur et de leveur. Les trois cases N pèsent chacune 25 %, les deux cases N+1 chacune 10 %, et la case N+2 pèse 5 %. Le joueur obtenu correspond à la case indiquée par la roue.
- Le panneau de recrutement occupe uniquement l'espace entre le haut du bandeau de statistiques et le banc. Son bouton « + joueur » permet également de le fermer, y compris pendant la rotation ; un résultat en attente reste sauvegardé.
- Pendant le recrutement, le banc et les boutons du bas sont assombris et bloqués. Seul le bouton de recrutement reste éclairé et actif pour refermer le panneau.
- L'apparition de la recrue est progressive et accompagnée de paillettes animées : effets discrets en N, renforcés en N+1, maximaux en N+2. Le niveau du résultat est sauvegardé. Les sprites et les fiches de statistiques du banc n'affichent pas de numéro.
- Glisser un remplaçant sur un titulaire, ou un titulaire sur un remplaçant, les échange. Le nouveau titulaire prend le numéro de la place. Deux titulaires de champ peuvent aussi échanger leurs places et numéros. Un dépôt hors d'un joueur compatible ramène le joueur à sa place. Les talonneurs s'échangent uniquement entre eux. Aucun remplacement pendant le match.
- Les plans offensifs et organisations défensives gardent leurs places et actions lorsque l'identité du titulaire change.
- « Combinaisons » ouvre d'abord la liste, sans déplacer les joueurs. Le choix d'une combinaison déclenche leur déplacement vers ses placements. Le bouton reste actif dans l'éditeur sans coche. Le bouton « Revenir à la gestion d'équipe » figure au bas de la liste. Les déplacements sont animés dans les deux sens et lors d'un changement de combinaison, sans changer les plans sauvegardés.
- Le bouton générique « Retour » du championnat restaure l'écran précédent : gestion, liste ou éditeur de combinaisons, avec la sélection courante.

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

Un match dure entre 80 et 82 minutes. Le timer avance vite jusqu'à une touche. Le joueur joue la touche. Puis le timer reprend. En fin de match, le résultat, la progression et l'éventuel bilan de saison précèdent le retour au gestionnaire du groupe touche.

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
- gestion du groupe touche avant l'accès à l'éditeur et à l'entraînement ;
- titulaires, banc et recrutement par roue ;
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
