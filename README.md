# No Lineout No Win

Jeu mobile tactique de touche au rugby.

## Stack

- TypeScript
- Phaser 3
- Vite
- Capacitor
- Android Studio

## Installation

```bash
npm install
npm run dev
```

## Vérification

```bash
npm run check
npm run build
```

## Android

Après avoir vérifié que le jeu fonctionne en web :

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Puis ouvrir, tester et générer l'application dans Android Studio.

## Documents importants

- `AGENTS.md` : instructions permanentes pour Codex.
- `docs/CDC_NORMALISE.md` : cahier des charges nettoyé.
- `docs/PLAN_DEVELOPPEMENT_CODEX.md` : ordre de développement conseillé.
- `docs/PROMPTS_CODEX.md` : prompts prêts à copier dans Codex.
- `docs/CHECKLIST_RELECTURE.md` : contrôle qualité après chaque lot.

## Règles métier clés

- 7 positions de touche : 1 à 7.
- Pas de `targetZone`.
- Joueurs de champ : Saut / Lift / Main uniquement.
- Talonneur : Lancer.
- Match simulé entre les touches.
- Interface mobile portrait, sans scroll.
