import { create } from "zustand";
import {
  AGES,
  BASE_BATTLE_BUFF,
  COMMAND_COOLDOWNS,
  FORMATIONS,
  INITIAL_RESOURCES,
  MANUAL_ACTIONS,
  PREP_ACTIONS_PER_CYCLE,
  PREP_OPERATIONS,
  RESOURCE_LABELS,
  RESOURCE_ORDER,
  RESOURCE_UNLOCK_AGE,
  STRUCTURES,
  UNIT_CONFIGS,
  createResourceMap,
  getUnitCapByAge
} from "./config";
import type { BattleCommand, BattleResult, CommandKind, FormationId, ResourceKey, Resources } from "./types";
import type { BattleBuff } from "./types";

const SAVE_KEY = "ageforge-v2-save";
const SAVE_VERSION = 1;

const structureById = Object.fromEntries(STRUCTURES.map((item) => [item.id, item]));
const unitById = Object.fromEntries(UNIT_CONFIGS.map((item) => [item.id, item]));
const actionById = Object.fromEntries(MANUAL_ACTIONS.map((item) => [item.id, item]));
const formationById = Object.fromEntries(FORMATIONS.map((item) => [item.id, item]));
const operationById = Object.fromEntries(PREP_OPERATIONS.map((item) => [item.id, item]));

export type Phase = "build" | "battle";

export interface GameState {
  resources: Resources;
  lifetime: Resources;
  rates: Resources;
  ageIndex: number;
  structures: Record<string, number>;
  army: Record<string, number>;
  formation: FormationId;
  prepActionsRemaining: number;
  usedOperations: string[];
  battleBuff: BattleBuff;
  phase: Phase;
  battleNonce: number;
  battleTimer: number;
  worldTime: number;
  commandQueue: BattleCommand[];
  commandCooldownReadyAt: Record<CommandKind, number>;
  pendingTargetCommand: CommandKind | null;
  logs: string[];
  lastReport: string;
  dirty: boolean;
  loaded: boolean;
  manualAction: (actionId: string) => void;
  buildStructure: (structureId: string) => void;
  trainUnit: (unitId: string) => void;
  disbandUnit: (unitId: string) => void;
  setFormation: (formationId: FormationId) => void;
  runPrepOperation: (operationId: string) => void;
  passPrepAction: () => void;
  beginTargetingCommand: (kind: CommandKind) => void;
  cancelTargetingCommand: () => void;
  issueCommand: (kind: CommandKind, target?: { x: number; y: number }) => void;
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
  void state;
  return createResourceMap(0);
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
    formation: state.formation,
    prepActionsRemaining: state.prepActionsRemaining,
    usedOperations: state.usedOperations,
    battleBuff: state.battleBuff,
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
  formation: "line",
  prepActionsRemaining: PREP_ACTIONS_PER_CYCLE,
  usedOperations: [],
  battleBuff: { ...BASE_BATTLE_BUFF },
  phase: "build",
  battleNonce: 0,
  battleTimer: 0,
  worldTime: 0,
  commandQueue: [],
  commandCooldownReadyAt: { rally: 0, retreat: 0, overdrive: 0 },
  pendingTargetCommand: null,
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

  setFormation: (formationId) => {
    if (!formationById[formationId]) {
      return;
    }
    const state = get();
    set({ formation: formationId, logs: addLog(state.logs, `${formationById[formationId].name} selected.`), dirty: true });
  },

  runPrepOperation: (operationId) => {
    const state = get();
    const operation = operationById[operationId];
    if (!operation || state.phase !== "build" || state.prepActionsRemaining <= 0) {
      return;
    }
    if (state.usedOperations.includes(operationId)) {
      return;
    }

    let nextResources = state.resources;
    let nextLifetime = state.lifetime;
    if (operation.resourceGain) {
      [nextResources, nextLifetime] = addGain(nextResources, nextLifetime, operation.resourceGain);
    }

    const nextBuff: BattleBuff = {
      ...state.battleBuff,
      allyDamageMult: state.battleBuff.allyDamageMult * (operation.buff?.allyDamageMult ?? 1),
      allyHpMult: state.battleBuff.allyHpMult * (operation.buff?.allyHpMult ?? 1),
      allySpeedMult: state.battleBuff.allySpeedMult * (operation.buff?.allySpeedMult ?? 1),
      allyRangeMult: state.battleBuff.allyRangeMult * (operation.buff?.allyRangeMult ?? 1),
      allyCooldownMult: state.battleBuff.allyCooldownMult * (operation.buff?.allyCooldownMult ?? 1),
      enemyDamageMult: state.battleBuff.enemyDamageMult * (operation.buff?.enemyDamageMult ?? 1),
      enemyHpMult: state.battleBuff.enemyHpMult * (operation.buff?.enemyHpMult ?? 1),
      notes: operation.note ? [...state.battleBuff.notes, operation.note] : state.battleBuff.notes
    };

    set({
      resources: nextResources,
      lifetime: nextLifetime,
      battleBuff: nextBuff,
      usedOperations: [...state.usedOperations, operationId],
      prepActionsRemaining: Math.max(0, state.prepActionsRemaining - 1),
      logs: addLog(state.logs, `${operation.name} executed.`),
      dirty: true
    });
  },

  passPrepAction: () => {
    const state = get();
    if (state.phase !== "build" || state.prepActionsRemaining <= 0) {
      return;
    }
    set({
      prepActionsRemaining: state.prepActionsRemaining - 1,
      logs: addLog(state.logs, "Preparation point held."),
      dirty: true
    });
  },

  beginTargetingCommand: (kind) => {
    const state = get();
    if (state.phase !== "battle") {
      return;
    }
    if (kind !== "rally") {
      return;
    }
    const readyAt = state.commandCooldownReadyAt[kind];
    if (state.worldTime < readyAt) {
      return;
    }
    set({ pendingTargetCommand: kind });
  },

  cancelTargetingCommand: () => {
    set({ pendingTargetCommand: null });
  },

  issueCommand: (kind, target) => {
    const state = get();
    if (state.phase !== "battle") {
      return;
    }

    if (kind === "rally" && !target) {
      return;
    }

    const readyAt = state.commandCooldownReadyAt[kind];
    if (state.worldTime < readyAt) {
      return;
    }

    set({
      commandQueue: [
        ...state.commandQueue,
        { seq: state.commandQueue.length + 1, kind, issuedAt: state.worldTime, target }
      ],
      commandCooldownReadyAt: {
        ...state.commandCooldownReadyAt,
        [kind]: state.worldTime + COMMAND_COOLDOWNS[kind]
      },
      pendingTargetCommand: null,
      dirty: true
    });
  },

  startBattle: () => {
    const state = get();
    const armyCount = Object.values(state.army).reduce((sum, value) => sum + value, 0);
    if (state.phase === "battle" || armyCount <= 0 || state.prepActionsRemaining > 0) {
      return;
    }
    const prepSummary = state.battleBuff.notes.length
      ? ` Prep: ${state.battleBuff.notes.join(" ")}`
      : "";
    set({
      phase: "battle",
      battleTimer: 90,
      battleNonce: state.battleNonce + 1,
      commandQueue: [],
      pendingTargetCommand: null,
      logs: addLog(state.logs, `Battle phase started.${prepSummary}`),
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
      prepActionsRemaining: PREP_ACTIONS_PER_CYCLE,
      usedOperations: [],
      battleBuff: { ...BASE_BATTLE_BUFF },
      commandQueue: [],
      pendingTargetCommand: null,
      lastReport: report,
      logs: addLog(state.logs, report),
      dirty: true
    });
  },

  tick: (dt) => {
    const state = get();
    const rates = calculateRates(state);
    let resources = state.resources;
    let lifetime = state.lifetime;
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
      pendingTargetCommand: state.phase === "battle" ? state.pendingTargetCommand : null,
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
        formation?: FormationId;
        prepActionsRemaining?: number;
        usedOperations?: string[];
        battleBuff?: Partial<BattleBuff>;
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
        formation: formationById[parsed.formation ?? "line"] ? (parsed.formation as FormationId) : "line",
        prepActionsRemaining: Math.max(
          0,
          Math.min(PREP_ACTIONS_PER_CYCLE, parsed.prepActionsRemaining ?? PREP_ACTIONS_PER_CYCLE)
        ),
        usedOperations: Array.isArray(parsed.usedOperations)
          ? parsed.usedOperations.filter((id) => Boolean(operationById[id]))
          : [],
        battleBuff: {
          ...BASE_BATTLE_BUFF,
          ...(parsed.battleBuff ?? {}),
          notes: Array.isArray(parsed.battleBuff?.notes) ? parsed.battleBuff.notes : []
        },
        logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 50) : ["Save loaded."],
        lastReport: parsed.lastReport ?? "No battles yet.",
        pendingTargetCommand: null,
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
      formation: "line",
      prepActionsRemaining: PREP_ACTIONS_PER_CYCLE,
      usedOperations: [],
      battleBuff: { ...BASE_BATTLE_BUFF },
      phase: "build",
      battleNonce: 0,
      battleTimer: 0,
      worldTime: 0,
      commandQueue: [],
      commandCooldownReadyAt: { rally: 0, retreat: 0, overdrive: 0 },
      pendingTargetCommand: null,
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
