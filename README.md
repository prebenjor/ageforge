# Ageforge Command Front

Ageforge is now a `Vite + React + TypeScript + Phaser` game prototype that blends:

- incremental economy progression across historical ages
- autobattler army composition
- light RTS command abilities during combat (`Rally`, `Retreat`, `Overdrive`)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Gameplay Loop (Current Prototype)

1. Gather resources and build structures in the **build phase**.
2. Train units to fill your roster.
3. Start a battle in the Phaser theater.
4. Issue RTS commands while units auto-fight.
5. Win sectors and battles to accelerate progression to later ages.

## Deploy

GitHub Pages deployment is configured in `.github/workflows/pages.yml`.
Pushes to `main` run `npm ci`, `npm run build`, and publish `dist/`.
