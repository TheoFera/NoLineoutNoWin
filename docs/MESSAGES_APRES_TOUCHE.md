# Messages affichés après une touche

Ce document décrit l'affichage actuel. Il permet de savoir quel texte modifier et dans quelle circonstance il apparaît.

## Où modifier les textes

Tous les textes français se trouvent dans :

```text
src/data/defaultTranslations.ts
```

Les clés concernées sont regroupées ainsi :

- `lineout.outcome.*` : titre principal de la fenêtre de résultat ;
- `lineout.explanation.*` : phrase courte affichée sous le titre ;
- `lineout.reason.*` : explication technique visible après avoir appuyé sur **Détails** ;
- `lineout.result.*` : anciens titres de secours, encore employés lorsque le résultat V2 n'existe pas.

Modifier uniquement `defaultTranslations.ts` change le texte, mais pas sa condition d'affichage. Les conditions sont principalement définies dans :

```text
src/rules/LineoutResolver.ts
src/rules/LineoutV2Resolver.ts
src/rules/LineoutResultPresentation.ts
```

La fenêtre est créée dans `src/scenes/LineoutScene.ts`, méthode `showResult()`.

## Composition de la fenêtre

Après une touche, la première fenêtre contient :

1. un **titre** issu de `lineout.outcome.*` ;
2. une **phrase courte** issue de `lineout.explanation.*` ;
3. un bouton **Détails**.

La fenêtre de détails contient d'abord une phrase issue de `lineout.reason.*`, puis les valeurs du lancer, du saut, de la réception, du duel ou du contre.

## Titres principaux actuels

| Clé | Texte français | Circonstance |
|---|---|---|
| `lineout.outcome.cleanWin` | Touche propre | Le camp qui lance conserve proprement le ballon. |
| `lineout.outcome.scrappyWin` | Touche gagnée difficilement | Le camp qui lance conserve le ballon, mais la réception n'est pas propre. |
| `lineout.outcome.deflectedTurnover` | Ballon contré et perdu | La défense dévie le ballon et récupère immédiatement la possession. |
| `lineout.outcome.cleanSteal` | Ballon volé proprement | La défense contrôle proprement le ballon. |
| `lineout.outcome.knockOn` | En-avant | Le camp qui lance ou la défense commet un en-avant. La phrase courte précise lequel. |
| `lineout.outcome.notStraight` | Lancer pas droit | La qualité du lancer est inférieure à 50. |
| `lineout.outcome.looseBall` | Ballon non récupéré | Personne ne contrôle immédiatement le ballon. Le moteur attribue ensuite la possession à l'une des deux équipes. |

Attention : ces titres décrivent l'issue du point de vue du **camp qui lance**, pas toujours du point de vue du joueur. Par exemple, lorsque le joueur défend bien et récupère un ballon dévié, il voit actuellement le titre **« Ballon contré et perdu »**, accompagné d'une phrase lui annonçant que son contre a réussi. C'est une source probable de confusion.

## Phrases courtes affichées sous le titre

Les mots « ton équipe » et « adversaire » ci-dessous sont calculés selon le point de vue du joueur, qu'il attaque ou qu'il défende.

| Clé | Texte français | Circonstance exacte |
|---|---|---|
| `lineout.explanation.clean` | Sortie propre vers le 9. | Le joueur est le camp qui lance et conserve proprement le ballon. |
| `lineout.explanation.dirty` | Ballon conservé mais sortie ralentie. | Le joueur est le camp qui lance et conserve difficilement le ballon. |
| `lineout.explanation.lost` | L'adversaire récupère la possession. | Le joueur est le camp qui lance et la défense récupère le ballon, hors en-avant et ballon libre. |
| `lineout.explanation.fault` | Lancer pas droit sifflé. | Le joueur lance et son lancer est inférieur au seuil de 50. |
| `lineout.explanation.defenseStolen` | Contre réussi : ton sauteur vole le ballon. | Le joueur défend et récupère proprement le ballon. |
| `lineout.explanation.defenseContested` | Touche fortement gênée, mais ballon mal négocié par l'adversaire. | Le joueur défend et récupère un ballon dévié ou difficile. |
| `lineout.explanation.defenseBeaten` | Bonne lecture, mais l'adversaire sécurise quand même son ballon. | Le joueur défend, mais le camp qui lance conserve le ballon, hors cas spéciaux. Cette phrase s'affiche même si le bloc défensif n'était pas réellement au bon poste, dès lors qu'une défense valide avait été sélectionnée. |
| `lineout.explanation.defenseMissed` | Aucun sauteur contesté : l'adversaire gagne facilement la touche. | Aucun défenseur valide n'a été sélectionné, aucune position défensive n'existe, ou le joueur sélectionné ne correspond pas à la position défensive. |
| `lineout.explanation.opponentNotStraight` | Le lancer adverse n'est pas droit : mêlée pour ton équipe. | Le joueur défend et le lancer adverse est inférieur à 50. |
| `lineout.explanation.ourKnockOn` | Ton équipe commet un en-avant : mêlée pour l'adversaire. | L'équipe du joueur commet l'en-avant, en attaque ou en défense. |
| `lineout.explanation.opponentKnockOn` | L'adversaire commet un en-avant : mêlée pour ton équipe. | L'équipe adverse commet l'en-avant, en attaque ou en défense. |
| `lineout.explanation.looseBallWon` | Personne ne capte le ballon proprement, puis ton équipe le récupère dans la continuité. | Une réception directe ou une réception de bloc échoue, puis le tirage du ballon libre donne la possession au joueur. |
| `lineout.explanation.looseBallLost` | Personne ne capte le ballon proprement, puis l'adversaire le récupère dans la continuité. | Même situation, mais le tirage donne la possession à l'adversaire. |
| `lineout.explanation.highBallLooseWon` | Le ballon est lancé trop haut et retombe au-delà des 15 m. Ton équipe le récupère ensuite. | Un ballon trop haut traverse toute la cascade sans être capté, puis le tirage donne la possession au joueur. |
| `lineout.explanation.highBallLooseLost` | Le ballon est lancé trop haut et retombe au-delà des 15 m. L'adversaire le récupère ensuite. | Même situation, mais le tirage donne la possession à l'adversaire. |
| `lineout.explanation.invalidSetup` | La cible choisie n'est pas correctement placée dans l'alignement. | En attaque, aucune cible n'est définie ou la cible ne correspond pas au joueur placé à la position attendue. |

### Clé actuellement inutilisée

`lineout.explanation.defenseLate` — « Le contre part trop loin de la cible : l'adversaire garde une touche propre. » — existe dans les traductions, mais aucun chemin du code actuel ne la sélectionne.

## Explications affichées dans « Détails »

| Clé | Texte français | Circonstance exacte |
|---|---|---|
| `lineout.reason.notStraight` | Le lancer sort du couloir et l'arbitre accorde une mêlée. | Qualité du lancer inférieure à 50. |
| `lineout.reason.counterDeflected` | Le contre placé devant la cible dévie le ballon. | Bloc défensif une position devant sur lancer précis ou bas, ou deux positions devant sur lancer bas ; interception réussie avec marge de contrôle inférieure ou égale à 15. |
| `lineout.reason.counterCleanSteal` | Le contre placé devant la cible contrôle directement le ballon. | Même placement, mais avec une marge de contrôle supérieure à 15, puis aucun en-avant défensif. |
| `lineout.reason.blockReceptionClean` | Le bloc de saut domine et sécurise une sortie propre. | Aucun contre décisif ; réception du bloc offensif avec un score strictement supérieur à 60. |
| `lineout.reason.blockReceptionScrappy` | Le bloc capte le ballon, mais sans maîtrise complète. | Aucun contre décisif ; score de réception du bloc compris entre 50 et 60 inclus. |
| `lineout.reason.blockReceptionMissed` | Le bloc ne parvient pas à contrôler la trajectoire. | Score de réception inférieur à 50, ou saut impossible, sur un lancer précis ou bas. Le ballon devient libre. |
| `lineout.reason.duelDeflected` | Le duel au même niveau provoque une déviation défensive. | Les deux blocs sautent au même poste et l'écart attaque-défense est compris entre -15 et -1. |
| `lineout.reason.duelCleanSteal` | Le défenseur remporte nettement le duel aérien. | Même poste, écart strictement inférieur à -15, puis aucun en-avant défensif. |
| `lineout.reason.attackingKnockOn` | L'équipe qui lance perd le contrôle vers l'avant. | En-avant du camp qui lance après un duel gagné, une réception directe ou une récupération de ballon haut. |
| `lineout.reason.duelWonClean` | Le sauteur offensif remporte proprement le duel. | Même poste, écart strictement supérieur à 10, puis aucun en-avant offensif. |
| `lineout.reason.duelWonScrappy` | Le sauteur offensif gagne le duel sous pression. | Même poste, écart compris entre 0 et 10 inclus, puis aucun en-avant offensif. |
| `lineout.reason.defendingKnockOn` | Le défenseur touche le ballon puis commet un en-avant. | En-avant défensif après un vol propre au même poste ou pendant la récupération d'un ballon haut. |
| `lineout.reason.directReceptionMissed` | La réception directe échoue et personne ne récupère immédiatement le ballon. | Option de réception directe avec un score inférieur à 50. Le ballon devient libre. |
| `lineout.reason.directReceptionClean` | Le réceptionneur contrôle directement le lancer. | Réception directe réussie avec un score strictement supérieur à 60, sans en-avant. |
| `lineout.reason.directReceptionScrappy` | Le réceptionneur conserve difficilement le lancer direct. | Réception directe réussie avec un score compris entre 50 et 60 inclus, sans en-avant. |
| `lineout.reason.highBallLoose` | Le ballon est lancé trop haut et retombe au-delà des 15 m sans être récupéré. | Le bloc ciblé manque un lancer haut et aucun joueur ne le récupère dans la cascade jusqu'à la position 7. |
| `lineout.reason.highBallRecoveredClean` | L'attaque récupère proprement le ballon haut. | Le camp qui lance récupère le ballon dans la cascade avec un score strictement supérieur à 60. |
| `lineout.reason.highBallRecoveredScrappy` | L'attaque récupère difficilement le ballon haut. | Le camp qui lance récupère le ballon dans la cascade avec un score compris entre 50 et 60 inclus. |
| `lineout.reason.highBallStolenClean` | La défense récupère proprement le ballon haut. | La défense récupère le ballon dans la cascade avec un score strictement supérieur à 60. |
| `lineout.reason.highBallStolenScrappy` | La défense récupère difficilement le ballon haut. | La défense récupère le ballon dans la cascade avec un score compris entre 50 et 60 inclus. |

## Anciens titres de secours

Ces clés ne servent pas de titre aux résultats V2 normaux. Elles sont encore utilisées si le résultat ne contient pas de résolution V2, notamment en cas de sélection invalide ou de défense non sélectionnée.

| Clé | Texte français |
|---|---|
| `lineout.result.won` | Ballon gagné |
| `lineout.result.won_dirty` | Ballon gagné difficilement |
| `lineout.result.lost` | Ballon perdu |
| `lineout.result.fault` | Faute |

## Points à clarifier avant une refonte des textes

- Les titres principaux ne sont pas adaptés au point de vue du joueur.
- **« Ballon non récupéré »** est affiché alors que le moteur attribue tout de suite la possession à une équipe.
- **« Bonne lecture »** peut être affiché même lorsque le défenseur a choisi une position éloignée de la cible.
- La phrase spécifique au contre trop loin (`defenseLate`) n'est jamais utilisée.
- Les documents V2 demandent une phrase courte après la touche, mais l'interface actuelle combine un titre technique et une phrase de perspective, ce qui peut produire des messages contradictoires.
