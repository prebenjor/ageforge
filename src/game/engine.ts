import {
  BUILDINGS,
  GLYPHS,
  HUNT_DURATION_SECONDS,
  OMEN_INTERVAL_SECONDS,
  RESOURCES,
  UPGRADES
} from "./content";
import type { BuildingDef, GameAction, GameState, ManualRitualKind, Resources } from "./types";
import { clamp, formatTime } from "./utils";

const buildingById = Object.fromEntries(BUILDINGS.map((building) => [building.id, building]));
const upgradeById = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade]));

function createEmptyBuildingMap(): Record<string, number> {
  return Object.fromEntries(BUILDINGS.map((building) => [building.id, 0]));
}

function createEmptyUpgradeMap(): Record<string, boolean> {
  return Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, false]));
}

export function randomOmen(): number[] {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * GLYPHS.length));
}

export function createInitialState(): GameState {
  return {
    resources: {
      static: 35,
      fear: 6,
      ink: 0,
      relics: 0
    },
    buildings: createEmptyBuildingMap(),
    upgrades: createEmptyUpgradeMap(),
    sigils: [0, 1, 2, 0],
    omen: randomOmen(),
    omenShiftIn: OMEN_INTERVAL_SECONDS,
    exposure: 18,
    breaches: 0,
    huntRemaining: 0,
    worldTime: 0,
    logs: ["The station wakes. Keep the signal alive."],
    dirty: true,
    loaded: false
  };
}

export function getBuildingCost(def: BuildingDef, level: number): Partial<Resources> {
  const cost: Partial<Resources> = {};
  for (const key of RESOURCES) {
    const base = def.baseCost[key];
    if (!base) {
      continue;
    }
    const raw = base * Math.pow(def.costScale, level);
    cost[key] = key === "relics" ? Math.ceil(raw) : Math.ceil(raw * 10) / 10;
  }
  return cost;
}

export function canAfford(resources: Resources, cost: Partial<Resources>): boolean {
  return RESOURCES.every((resource) => resources[resource] >= (cost[resource] ?? 0));
}

export function applyCost(resources: Resources, cost: Partial<Resources>): Resources {
  const next = { ...resources };
  for (const resource of RESOURCES) {
    const amount = cost[resource] ?? 0;
    if (!amount) {
      continue;
    }
    next[resource] = Math.max(0, next[resource] - amount);
  }
  return next;
}

function addLog(state: GameState, message: string): GameState {
  const timestamp = formatTime(state.worldTime);
  const logs = [`${timestamp} ${message}`, ...state.logs].slice(0, 70);
  return { ...state, logs };
}

function manualPowerMultiplier(state: GameState): number {
  return state.upgrades.black_diary ? 1.4 : 1;
}

export function getOmenMatch(state: GameState): number {
  return state.sigils.reduce((sum, glyph, index) => sum + (glyph === state.omen[index] ? 1 : 0), 0);
}

export function productionMultiplier(state: GameState, omenMatch: number): number {
  const perfectBonus = state.upgrades.deep_receiver && omenMatch === 4 ? 0.9 : omenMatch === 4 ? 0.45 : 0;
  return 0.75 + omenMatch * 0.14 + perfectBonus;
}

function tickProduction(next: GameState, dt: number, prodMult: number): void {
  const antennaCount = next.buildings.antenna ?? 0;
  const seanceCount = next.buildings.seance ?? 0;
  const pressCount = next.buildings.press ?? 0;
  const wardCount = next.buildings.ward ?? 0;

  if (antennaCount > 0) {
    const exposureFactor = next.upgrades.insulated_wires ? 0.65 : 1;
    next.resources.static += antennaCount * 0.95 * prodMult * dt;
    next.exposure += antennaCount * 0.08 * exposureFactor * dt;
  }

  if (seanceCount > 0) {
    const staticDemand = seanceCount * 0.82 * dt;
    const processed = Math.min(next.resources.static, staticDemand);
    next.resources.static -= processed;
    next.resources.fear += processed * 0.78 * prodMult;
    next.exposure += seanceCount * 0.03 * dt;
  }

  if (pressCount > 0) {
    const fearDemand = pressCount * 0.62 * dt;
    const processed = Math.min(next.resources.fear, fearDemand);
    const condenseBoost = next.upgrades.blood_condenser ? 1.32 : 1;
    next.resources.fear -= processed;
    next.resources.ink += processed * 0.56 * prodMult * condenseBoost;
  }

  if (wardCount > 0) {
    const inkDemand = wardCount * 0.2 * dt;
    const burned = Math.min(next.resources.ink, inkDemand);
    const wardBoost = next.upgrades.mirrored_chalk ? 1.45 : 1;
    next.resources.ink -= burned;
    next.exposure -= burned * 2.4 * wardBoost;
  }

  next.exposure += 0.018 * dt;
}

function tickHunt(next: GameState, dt: number, omenMatch: number): GameState {
  if (next.huntRemaining <= 0) {
    return next;
  }
  next.huntRemaining = Math.max(0, next.huntRemaining - dt);
  next.exposure += 0.34 * dt;
  if (next.huntRemaining <= 0) {
    const reward = 1 + Math.floor(omenMatch / 2) + (next.upgrades.relic_lens ? 1 : 0);
    next.resources.relics += reward;
    next.resources.fear += 8 + omenMatch * 2;
    return addLog(next, `Night Hunt completed. Recovered ${reward} relic(s).`);
  }
  return next;
}

function tickOmen(next: GameState, dt: number): GameState {
  next.omenShiftIn -= dt;
  if (next.omenShiftIn <= 0) {
    next.omen = randomOmen();
    next.omenShiftIn = OMEN_INTERVAL_SECONDS;
    return addLog(next, "The omen shifts. The walls whisper new symbols.");
  }
  return next;
}

function applyBreachIfNeeded(next: GameState): GameState {
  if (next.exposure < 100) {
    return next;
  }
  next.exposure = 36;
  next.breaches += 1;
  next.resources.static *= 0.78;
  next.resources.fear *= 0.74;
  next.resources.ink *= 0.7;

  let output = addLog(next, "Breach event. The station was seen. Resources were lost.");
  if (output.breaches % 3 === 0) {
    output = {
      ...output,
      resources: {
        ...output.resources,
        relics: output.resources.relics + 1
      }
    };
    output = addLog(output, "The scar gave form to a relic shard.");
  }
  return output;
}

function normalizeState(next: GameState): GameState {
  const resources = { ...next.resources };
  for (const resource of RESOURCES) {
    resources[resource] = Math.max(0, resources[resource]);
  }
  return {
    ...next,
    resources,
    exposure: clamp(next.exposure, 0, 100),
    dirty: true
  };
}

export function stepGame(state: GameState, dt: number): GameState {
  if (!state.loaded) {
    return state;
  }

  let next: GameState = {
    ...state,
    resources: { ...state.resources },
    buildings: { ...state.buildings },
    upgrades: { ...state.upgrades },
    sigils: [...state.sigils],
    omen: [...state.omen],
    logs: [...state.logs],
    worldTime: state.worldTime + dt
  };

  const omenMatch = getOmenMatch(next);
  const prodMult = productionMultiplier(next, omenMatch);

  tickProduction(next, dt, prodMult);
  next = tickHunt(next, dt, omenMatch);
  next = tickOmen(next, dt);
  next = applyBreachIfNeeded(next);
  next = normalizeState(next);

  return next;
}

function applyManualRitual(state: GameState, kind: ManualRitualKind): GameState {
  const next: GameState = {
    ...state,
    resources: { ...state.resources }
  };
  const power = manualPowerMultiplier(state);

  if (kind === "scan") {
    next.resources.static += 7.2 * power;
    next.exposure += 1.15;
    return normalizeState(addLog(next, "You scan the dead band. Something scans back."));
  }

  if (kind === "invoke") {
    if (next.resources.static < 6) {
      return state;
    }
    next.resources.static -= 6;
    next.resources.fear += 5.3 * power;
    next.exposure += 1.45;
    return normalizeState(addLog(next, "A name is spoken. The room gets colder."));
  }

  if (kind === "scribe") {
    if (next.resources.fear < 8) {
      return state;
    }
    next.resources.fear -= 8;
    next.resources.ink += 3.7 * power;
    next.exposure += 0.6;
    return normalizeState(addLog(next, "You pin the whisper to paper."));
  }

  if (next.resources.ink < 10 || next.resources.fear < 6) {
    return state;
  }
  next.resources.ink -= 10;
  next.resources.fear -= 6;
  next.exposure -= 14;
  return normalizeState(addLog(next, "Containment protocol burns through the corridor."));
}

function applyBuyBuilding(state: GameState, buildingId: string): GameState {
  const building = buildingById[buildingId];
  if (!building) {
    return state;
  }
  const current = state.buildings[building.id] ?? 0;
  const cost = getBuildingCost(building, current);
  if (!canAfford(state.resources, cost)) {
    return state;
  }

  const next: GameState = {
    ...state,
    resources: applyCost(state.resources, cost),
    buildings: { ...state.buildings, [building.id]: current + 1 },
    dirty: true
  };
  return addLog(next, `${building.name} installed.`);
}

function applyBuyUpgrade(state: GameState, upgradeId: string): GameState {
  if (state.upgrades[upgradeId] === undefined || state.upgrades[upgradeId]) {
    return state;
  }
  const upgradeDef = upgradeById[upgradeId];
  if (!upgradeDef || !canAfford(state.resources, upgradeDef.cost)) {
    return state;
  }

  const next: GameState = {
    ...state,
    resources: applyCost(state.resources, upgradeDef.cost),
    upgrades: { ...state.upgrades, [upgradeId]: true },
    dirty: true
  };

  return addLog(next, `${upgradeDef.name} etched into the station ledger.`);
}

function applyRotateSigil(state: GameState, index: number): GameState {
  if (index < 0 || index >= state.sigils.length) {
    return state;
  }
  const sigils = [...state.sigils];
  sigils[index] = (sigils[index] + 1) % GLYPHS.length;
  return { ...state, sigils, dirty: true };
}

function applyStartHunt(state: GameState): GameState {
  if (state.huntRemaining > 0 || state.resources.ink < 25) {
    return state;
  }
  const next: GameState = {
    ...state,
    resources: { ...state.resources, ink: state.resources.ink - 25 },
    huntRemaining: HUNT_DURATION_SECONDS,
    dirty: true
  };
  return addLog(next, "Night Hunt launched. Hold exposure below collapse.");
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "load":
      return { ...action.payload, loaded: true, dirty: false };
    case "mark_loaded":
      return { ...state, loaded: true };
    case "tick":
      return stepGame(state, action.dt);
    case "rotate_sigil":
      return applyRotateSigil(state, action.index);
    case "manual_ritual":
      return applyManualRitual(state, action.kind);
    case "buy_building":
      return applyBuyBuilding(state, action.buildingId);
    case "buy_upgrade":
      return applyBuyUpgrade(state, action.upgradeId);
    case "start_hunt":
      return applyStartHunt(state);
    case "mark_saved":
      return { ...state, dirty: false };
    case "reset":
      return { ...createInitialState(), loaded: true };
    default:
      return state;
  }
}
