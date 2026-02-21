import { create } from "zustand";
import {
  AGES,
  COMMAND_COOLDOWNS,
  INITIAL_RESOURCES,
  MANUAL_ACTIONS,
  RESOURCE_LABELS,
  RESOURCE_ORDER,
  RESOURCE_UNLOCK_AGE,
  STRUCTURES,
  UNIT_CONFIGS,
  createResourceMap,
  getUnitCapByAge
} from "./config";
import type { BattleCommand, BattleResult, ResourceKey, Resources } from "./types";

const SAVE_KEY = "ageforge-v2-save";
const SAVE_VERSION = 1;

const structureById = Object.fromEntries(STRUCTURES.map((item) => [item.id, item]));
const unitById = Object.fromEntries(UNIT_CONFIGS.map((item) => [item.id, item]));
const actionById = Object.fromEntries(MANUAL_ACTIONS.map((item) => [item.id, item]));

export type Phase = "build" | "battle";

export interface GameState {
  resources: Resources;
  lifetime: Resources;
  rates: Resources;
  ageIndex: number;
  structures: Record<string, number>;
  army: Record<string, number>;
  phase: Phase;
  battleNonce: number;
  battleTimer: number;
  worldTime: number;
  commandQueue: BattleCommand[];
  commandCooldownReadyAt: Record<BattleCommand["kind"], number>;
  logs: string[];
  lastReport: string;
  dirty: boolean;
  loaded: boolean;
  manualAction: (actionId: string) => void;
  buildStructure: (structureId: string) => void;
  trainUnit: (unitId: string) => void;
  disbandUnit: (unitId: string) => void;
  issueCommand: (kind: BattleCommand["kind"]) => void;
  startBattle: () => void;
  resolveBattle: (result: BattleResult) => void;
  tick: (dt: number) => void;
  load: () => void;
  saveNow: () => void;
  reset: () => void;
}

function addLog(logs: string[], message: string): string[] {
  const next = [`${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${message}`, ...logs];
  return next.slice(0, 50);
}

function canAfford(resources: Resources, cost?: Partial<Resources>): boolean {
  if (!cost) {
    return true;
  }
  return RESOURCE_ORDER.every((resource) => (resources[resource] ?? 0) >= (cost[resource] ?? 0));
}

function applyCost(resources: Resources, cost?: Partial<Resources>): Resources {
  if (!cost) {
    return resources;
  }
  const next = { ...resources };
  for (const resource of RESOURCE_ORDER) {
    const value = cost[resource];
    if (!value) {
      continue;
    }
    next[resource] = Math.max(0, next[resource] - value);
  }
  return next;
}

function addGain(resources: Resources, lifetime: Resources, gain: Partial<Resources>, scale = 1): [Resources, Resources] {
  const nextResources = { ...resources };
  const nextLifetime = { ...lifetime };
  for (const resource of RESOURCE_ORDER) {
    const amount = (gain[resource] ?? 0) * scale;
    if (amount === 0) {
      continue;
    }
    nextResources[resource] += amount;
    if (amount > 0) {
      nextLifetime[resource] += amount;
    }
  }
  return [nextResources, nextLifetime];
}

function calculateStructureCost(structureId: string, count: number): Partial<Resources> {
  const config = structureById[structureId];
  const output: Partial<Resources> = {};
  for (const resource of RESOURCE_ORDER) {
    const base = config.baseCost[resource];
    if (!base) {
      continue;
    }
    output[resource] = Math.ceil(base * Math.pow(config.costScale, count));
  }
  return output;
}

function requirementsMet(lifetime: Resources, requirements: Partial<Resources>): boolean {
  return RESOURCE_ORDER.every((resource) => (lifetime[resource] ?? 0) >= (requirements[resource] ?? 0));
}

function calculateRates(state: Pick<GameState, "structures" | "resources" | "ageIndex" | "phase">): Resources {
  const rates = createResourceMap(0);
  const economyScale = state.phase === "battle" ? 0.45 : 1;

  for (const structure of STRUCTURES) {
    if (state.ageIndex < structure.unlockAge) {
      continue;
    }

    const count = state.structures[structure.id] ?? 0;
    if (count === 0) {
      continue;
    }

    let utilization = 1;
    if (structure.consumes) {
      for (const resource of RESOURCE_ORDER) {
        const consume = (structure.consumes[resource] ?? 0) * count;
        if (consume <= 0) {
          continue;
        }
        utilization = Math.min(utilization, (state.resources[resource] ?? 0) / consume);
      }
    }

    utilization = Math.max(0, Math.min(1, utilization));
    if (utilization === 0) {
      continue;
    }

    for (const resource of RESOURCE_ORDER) {
      rates[resource] -= (structure.consumes?.[resource] ?? 0) * count * utilization * economyScale;
      rates[resource] += (structure.produces[resource] ?? 0) * count * utilization * economyScale;
    }
  }

  return rates;
}

function applyRates(resources: Resources, lifetime: Resources, rates: Resources, dt: number): [Resources, Resources] {
  const nextResources = { ...resources };
  const nextLifetime = { ...lifetime };
  for (const resource of RESOURCE_ORDER) {
    const delta = rates[resource] * dt;
    if (delta === 0) {
      continue;
    }
    nextResources[resource] = Math.max(0, nextResources[resource] + delta);
    if (delta > 0) {
      nextLifetime[resource] += delta;
    }
  }
  return [nextResources, nextLifetime];
}

function emptyCountsFromList(list: Array<{ id: string }>): Record<string, number> {
  const record: Record<string, number> = {};
  for (const item of list) {
    record[item.id] = 0;
  }
  return record;
}

function serializeState(state: GameState): object {
  return {
    version: SAVE_VERSION,
    resources: state.resources,
    lifetime: state.lifetime,
    ageIndex: state.ageIndex,
    structures: state.structures,
    army: state.army,
    logs: state.logs,
    lastReport: state.lastReport
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  resources: { ...INITIAL_RESOURCES },
  lifetime: createResourceMap(0),
  rates: createResourceMap(0),
  ageIndex: 0,
  structures: emptyCountsFromList(STRUCTURES),
  army: emptyCountsFromList(UNIT_CONFIGS),
  phase: "build",
  battleNonce: 0,
  battleTimer: 0,
  worldTime: 0,
  commandQueue: [],
  commandCooldownReadyAt: { rally: 0, retreat: 0, overdrive: 0 },
  logs: ["Settlement command initialized."],
  lastReport: "No battles yet.",
  dirty: true,
  loaded: false,

  manualAction: (actionId) => {
    const state = get();
    const action = actionById[actionId];
    if (!action || state.ageIndex < action.unlockAge) {
      return;
    }
    if (!canAfford(state.resources, action.cost)) {
      return;
    }
    let nextResources = applyCost(state.resources, action.cost);
    let nextLifetime = state.lifetime;
    [nextResources, nextLifetime] = addGain(nextResources, nextLifetime, action.gain);
    set({ resources: nextResources, lifetime: nextLifetime, dirty: true });
  },

  buildStructure: (structureId) => {
    const state = get();
    const structure = structureById[structureId];
    if (!structure || state.ageIndex < structure.unlockAge) {
      return;
    }
    const owned = state.structures[structureId] ?? 0;
    const cost = calculateStructureCost(structureId, owned);
    if (!canAfford(state.resources, cost)) {
      return;
    }
    set({
      resources: applyCost(state.resources, cost),
      structures: { ...state.structures, [structureId]: owned + 1 },
      logs: addLog(state.logs, `${structure.name} built.`),
      dirty: true
    });
  },

  trainUnit: (unitId) => {
    const state = get();
    const config = unitById[unitId];
    if (!config || state.ageIndex < config.unlockAge) {
      return;
    }
    const armyCount = Object.values(state.army).reduce((sum, value) => sum + value, 0);
    if (armyCount >= getUnitCapByAge(state.ageIndex)) {
      return;
    }
    if (!canAfford(state.resources, config.cost)) {
      return;
    }
    set({
      resources: applyCost(state.resources, config.cost),
      army: { ...state.army, [unitId]: (state.army[unitId] ?? 0) + 1 },
      dirty: true
    });
  },

  disbandUnit: (unitId) => {
    const state = get();
    const current = state.army[unitId] ?? 0;
    if (current <= 0 || state.phase === "battle") {
      return;
    }
    set({ army: { ...state.army, [unitId]: current - 1 }, dirty: true });
  },

  issueCommand: (kind) => {
    const state = get();
    if (state.phase !== "battle") {
      return;
    }
    const readyAt = state.commandCooldownReadyAt[kind];
    if (state.worldTime < readyAt) {
      return;
    }
    set({
      commandQueue: [...state.commandQueue, { seq: state.commandQueue.length + 1, kind, issuedAt: state.worldTime }],
      commandCooldownReadyAt: {
        ...state.commandCooldownReadyAt,
        [kind]: state.worldTime + COMMAND_COOLDOWNS[kind]
      },
      dirty: true
    });
  },

  startBattle: () => {
    const state = get();
    const armyCount = Object.values(state.army).reduce((sum, value) => sum + value, 0);
    if (state.phase === "battle" || armyCount <= 0) {
      return;
    }
    set({
      phase: "battle",
      battleTimer: 90,
      battleNonce: state.battleNonce + 1,
      commandQueue: [],
      logs: addLog(state.logs, "Battle phase started."),
      dirty: true
    });
  },

  resolveBattle: (result) => {
    const state = get();
    if (state.phase !== "battle") {
      return;
    }

    const nextArmy = { ...state.army };
    for (const [unitId, loss] of Object.entries(result.casualties)) {
      nextArmy[unitId] = Math.max(0, (nextArmy[unitId] ?? 0) - loss);
    }

    let nextResources = state.resources;
    let nextLifetime = state.lifetime;
    if (result.victory) {
      const rewardBase = 120 + state.ageIndex * 65 + result.sectorsHeld * 80;
      [nextResources, nextLifetime] = addGain(nextResources, nextLifetime, {
        food: rewardBase,
        materials: rewardBase * 0.9,
        knowledge: rewardBase * 0.55,
        power: state.ageIndex >= 4 ? rewardBase * 0.35 : 0,
        data: state.ageIndex >= 5 ? rewardBase * 0.2 : 0
      });
    }

    const report = result.victory
      ? `Victory: held ${result.sectorsHeld}/3 sectors and looted new assets.`
      : `Defeat: ${Object.values(result.casualties).reduce((sum, loss) => sum + loss, 0)} units lost.`;

    set({
      phase: "build",
      battleTimer: 0,
      army: nextArmy,
      resources: nextResources,
      lifetime: nextLifetime,
      commandQueue: [],
      lastReport: report,
      logs: addLog(state.logs, report),
      dirty: true
    });
  },

  tick: (dt) => {
    const state = get();
    const rates = calculateRates(state);
    let [resources, lifetime] = applyRates(state.resources, state.lifetime, rates, dt);
    let ageIndex = state.ageIndex;
    while (ageIndex < AGES.length - 1 && requirementsMet(lifetime, AGES[ageIndex + 1].requirements)) {
      ageIndex += 1;
    }

    let logs = state.logs;
    if (ageIndex > state.ageIndex) {
      logs = addLog(logs, `${AGES[ageIndex].name} reached.`);
    }

    const nextBattleTimer = state.phase === "battle" ? Math.max(0, state.battleTimer - dt) : 0;

    set({
      resources,
      lifetime,
      rates,
      ageIndex,
      battleTimer: nextBattleTimer,
      worldTime: state.worldTime + dt,
      logs
    });

    if (state.phase === "battle" && nextBattleTimer <= 0) {
      get().resolveBattle({ victory: false, casualties: {}, sectorsHeld: 0 });
    }
  },

  load: () => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      set({ loaded: true });
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        version?: number;
        resources?: Partial<Resources>;
        lifetime?: Partial<Resources>;
        ageIndex?: number;
        structures?: Record<string, number>;
        army?: Record<string, number>;
        logs?: string[];
        lastReport?: string;
      };
      const resources = { ...INITIAL_RESOURCES };
      const lifetime = createResourceMap(0);
      for (const resource of RESOURCE_ORDER) {
        resources[resource] = Math.max(0, parsed.resources?.[resource] ?? resources[resource]);
        lifetime[resource] = Math.max(0, parsed.lifetime?.[resource] ?? lifetime[resource]);
      }
      set({
        resources,
        lifetime,
        ageIndex: Math.max(0, Math.min(AGES.length - 1, parsed.ageIndex ?? 0)),
        structures: { ...emptyCountsFromList(STRUCTURES), ...(parsed.structures ?? {}) },
        army: { ...emptyCountsFromList(UNIT_CONFIGS), ...(parsed.army ?? {}) },
        logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 50) : ["Save loaded."],
        lastReport: parsed.lastReport ?? "No battles yet.",
        loaded: true,
        dirty: false
      });
    } catch {
      set({ loaded: true, logs: addLog(get().logs, "Save file invalid. Starting new run.") });
    }
  },

  saveNow: () => {
    const state = get();
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeState(state)));
    set({ dirty: false });
  },

  reset: () => {
    localStorage.removeItem(SAVE_KEY);
    set({
      resources: { ...INITIAL_RESOURCES },
      lifetime: createResourceMap(0),
      rates: createResourceMap(0),
      ageIndex: 0,
      structures: emptyCountsFromList(STRUCTURES),
      army: emptyCountsFromList(UNIT_CONFIGS),
      phase: "build",
      battleNonce: 0,
      battleTimer: 0,
      worldTime: 0,
      commandQueue: [],
      commandCooldownReadyAt: { rally: 0, retreat: 0, overdrive: 0 },
      logs: ["Settlement command reset."],
      lastReport: "No battles yet.",
      dirty: true
    });
  }
}));

export function getVisibleResources(ageIndex: number): ResourceKey[] {
  return RESOURCE_ORDER.filter((resource) => ageIndex >= RESOURCE_UNLOCK_AGE[resource]);
}

export function formatResourcePair(resource: ResourceKey, value: number): string {
  return `${RESOURCE_LABELS[resource]} ${Math.floor(value).toLocaleString()}`;
}
