# Prompts Codex — Gameplay V2

## Prompt 1 — Préparation sans coder

```text
Lis AGENTS.md et les documents suivants :
- docs/CDC_NORMALISE.md
- docs/ARCHITECTURE.md
- docs/DECISIONS_TECHNIQUES.md
- docs/GAMEPLAY_TOUCHE_V2.md
- docs/IA_TOUCHE_V2.md
- docs/GENERATION_EQUIPES_V2.md
- docs/SIMULATION_MATCH_V2.md
- docs/PLAN_IMPLEMENTATION_GAMEPLAY_V2.md

Mission documentaire uniquement :
1. analyse le code actuel et indique où chaque règle V2 doit être implémentée ;
2. liste les contradictions entre le code actuel et les documents V2 ;
3. propose les fichiers à modifier ou créer pour chaque lot ;
4. ne modifie aucun fichier de src ;
5. ne change pas l’interface ;
6. n’invente aucune règle absente des documents.

À la fin, exécute npm run check et fournis un rapport court et précis.
```

## Prompt type pour un lot

```text
Lis AGENTS.md et tous les documents V2.

Travaille uniquement sur le Lot [NUMÉRO ET NOM] décrit dans
`docs/PLAN_IMPLEMENTATION_GAMEPLAY_V2.md`.

Avant de modifier le code :
1. inspecte les fichiers concernés ;
2. vérifie les dépendances avec les lots précédents ;
3. annonce brièvement les fichiers que tu vas modifier.

Contraintes :
- ne commence pas le lot suivant ;
- aucune valeur métier importante en dur ;
- utilise `src/config/LineoutBalance.ts` ;
- utilise une source aléatoire injectable ;
- ne mets aucune formule métier dans `src/scenes` ;
- aucun mini-jeu de timing ;
- ne recrée pas `targetZone` ;
- conserve la compatibilité avec le parcours actuel lorsque cela ne contredit pas V2.

Ajoute les tests exigés par le plan.

À la fin :
- exécute npm run check ;
- exécute les tests ;
- corrige toutes les erreurs ;
- liste les fichiers modifiés ;
- liste les critères d’acceptation validés ;
- indique explicitement ce qui reste non implémenté.
```

## Prompt d’audit après chaque lot

```text
Audite le Lot [NUMÉRO] sans ajouter de nouvelle fonctionnalité.

Compare l’implémentation avec :
- les documents V2 ;
- `src/config/LineoutBalance.ts` ;
- les critères d’acceptation du lot.

Cherche en priorité :
- formule incorrecte ;
- seuil ou probabilité codé en dur ;
- aléatoire non injectable ;
- calcul dupliqué ;
- règle placée dans une scène ;
- cas limite absent ;
- régression sur le parcours actuel.

Corrige uniquement les écarts constatés.
Exécute ensuite npm run check et les tests.
```

## Prompt final d’intégration

```text
Tous les lots V2 sont supposés terminés.

Effectue un audit d’intégration complet :
1. vérifie que le parcours menu → championnat → match → touche → résultat fonctionne ;
2. vérifie que les scènes utilisent le nouveau moteur sans dupliquer ses calculs ;
3. vérifie la persistance des mémoires IA et des répertoires ;
4. lance les simulations statistiques ;
5. compare les résultats aux tableaux de référence ;
6. corrige uniquement les écarts ou régressions ;
7. exécute npm run check et l’intégralité des tests.

Ne modifie pas l’équilibrage pour masquer un bug logique.
```

