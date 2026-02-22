# Black Signal: The Vigil Station

Browser-playable horror incremental game built with `Vite + React + TypeScript`.

## Concept

You run a cursed surveillance station.

- harvest static from dead frequencies
- transmute fear into Night Ink
- etch upgrades to survive escalating exposure
- solve rotating omen sigils for production bonuses
- launch risky Night Hunts for relic progression

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Architecture (Modular + Scalable)

- `src/game/content.ts`: game data tables (resources, buildings, upgrades, constants)
- `src/game/types.ts`: domain types and action contracts
- `src/game/engine.ts`: pure reducer + tick simulation + economy logic
- `src/game/storage.ts`: save/load persistence boundaries
- `src/game/selectors.ts`: derived values for UI
- `src/hooks/useHorrorGame.ts`: game loop and autosave orchestration
- `src/components/*`: isolated UI panels

This separation keeps features extensible without coupling simulation, persistence, and rendering.
