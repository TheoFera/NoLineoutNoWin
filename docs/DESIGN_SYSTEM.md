# Design system — Retransmission sportive

Ce document est l'unique source de vérité pour créer ou modifier un menu, une fenêtre, un panneau de match ou un contrôle dans **No Lineout No Win**. Il rassemble la direction visuelle, les règles d'expérience utilisateur et les consignes d'implémentation destinées à Codex.

## 1. Direction visuelle

Le jeu adopte une esthétique de **retransmission sportive lumineuse en journée** :

- le terrain, les joueurs et les décors restent colorés et visibles ;
- les informations utilisent des plaques sombres inspirées des tableaux de score et de l'analyse TV ;
- l'ambre sert à l'action principale et aux accents de sélection ;
- l'interface reste claire, compacte et facile à toucher sur téléphone ;
- ne jamais recréer une ambiance « Rugby Night » uniformément sombre.

Les surfaces sombres servent uniquement de plaques de lecture au-dessus d'un terrain, d'une photo ou d'une illustration riche. Les références TV doivent avoir une fonction réelle : score, statistiques, conducteur d'une combinaison, tracé tactique, résultat ou commentaire. Ne pas ajouter de faux éléments `REC`, caméra ou « direct » uniquement pour décorer.

## 2. Principes fondamentaux

1. Le terrain et les joueurs restent prioritaires pendant la touche.
2. Une seule action de progression reçoit normalement un bouton principal rempli.
3. Une sélection n'est jamais présentée comme une action principale.
4. Une information ne dépend jamais uniquement de sa couleur.
5. Les couleurs des clubs restent indépendantes des couleurs fonctionnelles de l'interface.
6. Les écrans de gestion peuvent être plus clairs que les plaques affichées sur le terrain.
7. Tous les textes visibles passent par `t(key)` et sont rédigés avec les accents français.
8. Une nouvelle scène réutilise les composants et rôles existants avant d'introduire une nouvelle valeur.

Le design system s'applique à **toutes les scènes** : chargement, création, gestion, édition, match, résultat et progression.

## 3. Contraintes non négociables

- Format logique : `390 × 844`, mobile portrait, sans défilement.
- Une action tactile standard possède une zone d'au moins `48 × 48` px, même si son apparence est plus petite.
- Une scène ne doit pas forcer `camera.setZoom(1)`. Le rendu haute densité utilise le zoom de base fourni par `HighDensityRendering.ts`.
- Une information colorée possède également un texte, un symbole ou une différence de forme.
- Les couleurs des clubs, maillots, carnations, cheveux, terrains et météos sont des données de contenu. Elles ne remplacent jamais les couleurs fonctionnelles de l'interface.

## 4. Sources de vérité dans le code

Avant de créer un style, vérifier si le besoin est déjà couvert par :

| Besoin | Fichier à réutiliser |
|---|---|
| Couleurs, typographie, espacements, rayons et mouvement | `src/ui/UITheme.ts` |
| Bouton et états tactiles | `src/ui/UIButton.ts` |
| Variantes des boutons | `src/ui/ButtonStyle.ts` |
| Fond, en-tête et panneau de menu | `src/ui/MenuChrome.ts` |
| Fenêtre bloquante ou confirmation | `src/ui/Modal.ts` |
| Champ HTML au-dessus du canvas | `src/ui/DomControlStyle.ts` |
| Timeline des combinaisons offensives | `src/ui/CombinationSequenceBar.ts` |
| Score et statistiques de match | `src/ui/MatchScoreOverlay.ts`, `src/ui/MatchStatsOverlay.ts` |
| Panneau de résultat | `src/ui/ResultOverlayPanel.ts` |
| Ancrage d'un futur tutoriel | `src/ui/TutorialAnchor.ts` |

Ne pas recopier localement les couleurs ou le dessin d'un composant partagé.

## 5. Palette sémantique

Toutes les valeurs d'interface viennent de `UI.colors.*`. Ne pas introduire de valeur hexadécimale dans une scène pour un élément d'interface.

| Rôle | Usage |
|---|---|
| `background` | fond neutre lorsqu'aucun décor n'est affiché |
| `panelDark` | plaque TV principale |
| `panel`, `panelAlternate` | surfaces de structure et alternances |
| `panelRaised` | contrôle ou ligne active |
| `successSurface`, `infoSurface`, `dangerSurface` | fond discret d'un état explicitement nommé |
| `outline`, `outlineStrong` | contours neutres |
| `divider` | séparation légère entre lignes ou groupes |
| `scrim` | voile au-dessus d'une image et ombre |
| `paper`, `ink` | bulle claire et texte sombre |
| `text` | texte principal sur fond sombre |
| `muted` | aide et information secondaire |
| `accent` | action principale ou repère de sélection |
| `success`, `warning`, `danger`, `info` | états explicitement nommés |
| `attack`, `defense` | information liée au camp, jamais hiérarchie d'un bouton |

Le jaune est une couleur d'accent, pas une couleur d'équipe. Un fond jaune indique une action principale. Un contour ou rail jaune accompagné d'un état explicite indique une sélection.

Les panneaux ne comportent pas de petite barre décorative sur leur bord supérieur. Leur structure repose sur le contour, les espacements et la hiérarchie du contenu.

## 6. Boutons et hiérarchie des actions

Utiliser les variantes de `UIButton` :

- `primary` : action principale de progression ;
- `secondary` : navigation et action ordinaire ;
- `selected` : valeur d'un réglage ou onglet actif, jamais simple action principale ;
- `danger` : suppression, abandon ou réinitialisation ;
- `ghost` : commande périphérique peu importante.

Tailles visuelles recommandées :

- 56 px : action principale structurante ;
- 48 px : commande standard ;
- 32 à 40 px : commande compacte, avec une zone tactile portée à 48 px si l'espace le permet.

L'état appuyé descend le contenu de 2 px, assombrit légèrement le fond et réduit l'ombre. L'état désactivé réduit le contraste et ne réagit pas au toucher.

Les glyphes `>` et `›` indiquent une navigation. Une action de lecture ou d'entraînement utilise `▶` avec un libellé explicite.

```ts
new UIButton(this, 195, 720, 260, 48, t("match.playNow"), onPlay, {
  variant: "primary"
});

new UIButton(this, 195, 784, 220, 42, t("button.back"), onBack, {
  variant: "secondary"
});
```

Ne pas utiliser un bouton principal jaune pour matérialiser la ligne actuellement consultée dans une liste. Préférer une ligne secondaire accompagnée d'un rail ambre et d'un `✓` ou d'un libellé explicite.

## 7. Typographie

- Les titres, scores et bandeaux courts peuvent employer une graisse forte et des capitales.
- Les boutons, aides et paragraphes utilisent une typographie non condensée et lisible.
- Les paragraphes et explications ne sont jamais écrits entièrement en capitales.
- Les noms de clubs et traductions longues doivent pouvoir réduire leur taille ou revenir à la ligne sans sortir du composant.
- Ne pas multiplier les titres dans des panneaux dont le contexte est déjà évident.

## 8. Menu sur une image de fond

Ordre de rendu recommandé :

1. image couvrant tout le format `390 × 844` ;
2. `scrim` léger garantissant la lecture ;
3. panneau presque opaque derrière les contrôles ;
4. titre, onglets, lignes et boutons ;
5. action de retour en bas de l'écran.

```ts
this.add.image(195, 422, "background-key").setDisplaySize(390, 844);
this.add.rectangle(195, 422, 390, 844, UI.colors.scrim, 0.35);

renderMenuPanel(this, {
  x: 195,
  y: 300,
  width: 354,
  height: 400,
  fillColor: UI.colors.panelDark,
  fillAlpha: 0.98,
  accentColor: UI.colors.outline
});
```

Si l'image contient déjà un titre, une enseigne ou des détails très contrastés derrière les contrôles, ne pas superposer directement l'interface. Repositionner le décor ou employer un panneau assez opaque pour éviter la concurrence visuelle.

## 9. Listes, onglets et sélections

Une ligne de liste doit avoir une fonction identifiable : ouvrir, choisir ou modifier.

- Une ligne qui ouvre un éditeur reste `secondary`.
- L'élément courant reçoit un rail ambre et un symbole ou texte explicite.
- Ne pas cumuler rail ambre, fond jaune, contour jaune et texte jaune.
- Les actions annexes, comme renommer, sont séparées dans un bouton carré de 46 à 48 px.
- Espacement vertical recommandé entre les centres des lignes : 64 à 72 px.

Pour deux catégories de même importance, utiliser deux onglets de largeur identique :

```text
[ Offensives ] [ Défensives ]
```

Les deux catégories portent le nom de **combinaisons**. Ne pas renommer les combinaisons défensives en « tactiques ».

Cette égalité de navigation n'impose pas le même éditeur :

- une combinaison offensive possède un placement de départ puis des phases ;
- une combinaison défensive mémorise une organisation par nombre de joueurs, puis le choix et le timing du saut restent joués en direct.

## 10. Timeline d'une combinaison offensive

Une phase décrit ce qui se passe **entre deux états**. La timeline représente donc des états reliés par des phases :

```text
      Phase 1       Phase 2
Départ ●━━━━━━━━●━━━━━━━━●
                  1        2
```

- les points représentent le placement initial et les états obtenus ;
- la ligne entre deux points représente la phase configurable ;
- la zone cliquable est le segment, pas uniquement son numéro ;
- la phase sélectionnée colore toute sa ligne en ambre ;
- `+` ajoute une phase après le dernier état ;
- la suppression dit explicitement `Supprimer la phase 2` ;
- l'action utilise le libellé `▶ S'entraîner` ;
- ne pas répéter « Combinaison offensive » si le contexte l'indique déjà ;
- le panneau reste aligné avec les autres overlays et ne laisse jamais un bouton sortir de son cadre.

Les segments ne représentent pas des durées égales. La durée réelle dépend notamment des déplacements et de la Vitesse des joueurs.

Toujours utiliser `CombinationSequenceBar` au lieu de redessiner cette timeline dans une scène.

## 11. Fenêtres, match et résultats

Une fenêtre utilise une surface neutre. Sa tonalité est portée par son contour, son titre et son icône, sans teinter toute la fenêtre.

- réussite : vert et texte explicite ;
- avertissement : orange et texte explicite ;
- erreur ou défaite : rouge et texte explicite ;
- action destructive : bouton rouge explicite.

Le terrain et les joueurs restent prioritaires. Les plaques TV utilisent `panelDark` avec un contour neutre. Les couleurs des équipes peuvent apparaître dans le score, mais ne définissent pas la priorité des actions.

L'action de progression reste principale. Les détails et l'annulation utilisent une variante secondaire.

## 12. Futur tutoriel avec personnage

Tout contrôle important susceptible d'être expliqué doit pouvoir recevoir un ancrage via `markTutorialAnchor`.

Ancrages existants :

- `combinations.attack` et `combinations.defense` ;
- `combination.placement` ;
- `combination.phase` ;
- `combination.add-phase` et `combination.remove-phase` ;
- `combination.train`.

Le futur personnage utilisera une bulle inspirée d'un consultant TV. La bulle ne masque jamais le contrôle présenté. Le tutoriel reste court, contextuel, désactivable et rejouable.

## 13. Erreurs à éviter

- Ajouter des couleurs codées en dur dans une scène.
- Créer une nouvelle classe de bouton pour une différence seulement cosmétique.
- Utiliser le jaune simultanément pour une équipe, une sélection et une action principale.
- Faire ressembler une sélection à un bouton de validation.
- Multiplier les titres à l'intérieur de panneaux déjà contextualisés.
- Ajouter une barre décorative par automatisme.
- Laisser une image de fond concurrencer le texte ou traverser visuellement les contrôles.
- Réduire les zones tactiles pour faire rentrer davantage d'éléments.
- Faire sortir une ombre, un bouton ou un libellé du panneau qui le contient.
- Utiliser uniquement une icône ambiguë comme `−`, `>` ou `P` pour une action importante.
- Modifier le zoom caméra pour régler un problème de mise en page.

## 14. Checklist avant livraison

- [ ] La scène utilise `UITheme`, `UIButton` et les composants partagés appropriés.
- [ ] Aucun texte visible n'est écrit directement dans la scène hors symboles universels.
- [ ] Les accents français sont présents.
- [ ] Une seule action principale jaune domine la zone.
- [ ] Les sélections sont distinctes des actions.
- [ ] Les zones tactiles mesurent au moins 48 px lorsque l'espace le permet.
- [ ] Aucun contrôle ne dépasse de son panneau.
- [ ] Le fond ne gêne pas la lecture.
- [ ] L'interface tient dans `390 × 844` sans défilement.
- [ ] Les couleurs d'équipe ne remplacent pas les couleurs sémantiques.
- [ ] Les éléments importants possèdent un ancrage de tutoriel si nécessaire.
- [ ] Après une modification TypeScript ordinaire, `npm run check` passe.

Ne pas lancer automatiquement le serveur, un navigateur ou une validation visuelle : suivre les règles de validation définies dans `AGENTS.md`.
