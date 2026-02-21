import { create } from "zustand";
import {
  BASE_BATTLE_BUFF,
  COMMAND_COOLDOWNS,
  FORMATIONS,
  INITIAL_RESOURCES,
  MAX_LEVEL,
  PREP_OPERATIONS,
  RESOURCE_LABELS,
  RESOURCE_ORDER,
  SHOP_ODDS_BY_LEVEL,
  SHOP_SIZE,
  UNIT_CONFIGS,
  UNIT_POOL_BY_TIER,
  XP_PURCHASE_COST,
  XP_PURCHASE_GAIN,
  createResourceMap,
  getUnitCapByLevel,
  getXpRequiredForLevel
} from "./config";
import type { BattleBuff, BattleCommand, BattleResult, CommandKind, FormationId, ResourceKey, Resources } from "./types";

const SAVE_KEY = "ageforge-v3-save";
const SAVE_VERSION = 3;

const unitById = Object.fromEntries(UNIT_CONFIGS.map((item) => [item.id, item]));
const formationById = Object.fromEntries(FORMATIONS.map((item) => [item.id, item]));
const operationById = Object.fromEntries(PREP_OPERATIONS.map((item) => [item.id, item]));

export type Phase = "build" | "battle";

export interface GameState {
  resources: Resources;
  lifetime: Resources;
  rates: Resources;
  stage: number;
  level: number;
  xp: number;
  commanderHp: number;
  winStreak: number;
  loseStreak: number;
  army: Record<string, number>;
  shop: Array<string | null>;
  shopLocked: boolean;
  formation: FormationId;
  directiveUsed: boolean;
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
  refreshShop: (isFree?: boolean) => void;
  toggleShopLock: () => void;
  buyShopUnit: (slotIndex: number) => void;
  buyXp: () => void;
  trainUnit: (unitId: string) => void;
  disbandUnit: (unitId: string) => void;
  setFormation: (formationId: FormationId) => void;
  runPrepOperation: (operationId: string) => void;
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
  return next.slice(0, 60);
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

function addGain(resources: Resources, lifetime: Resources, gain: Partial<Resources>): [Resources, Resources] {
  const nextResources = { ...resources };
  const nextLifetime = { ...lifetime };
  for (const resource of RESOURCE_ORDER) {
    const amount = gain[resource] ?? 0;
    if (!amount) {
      continue;
    }
    nextResources[resource] += amount;
    if (amount > 0) {
      nextLifetime[resource] += amount;
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

function getTotalArmyCount(army: Record<string, number>): number {
  return Object.values(army).reduce((sum, value) => sum + value, 0);
}

function getXpProgress(level: number, xp: number): { level: number; xp: number; leveled: number } {
  let nextLevel = level;
  let nextXp = xp;
  let leveled = 0;

  while (nextLevel < MAX_LEVEL) {
    const needed = getXpRequiredForLevel(nextLevel);
    if (needed <= 0 || nextXp < needed) {
      break;
    }
    nextXp -= needed;
    nextLevel += 1;
    leveled += 1;
  }

  if (nextLevel >= MAX_LEVEL) {
    nextXp = 0;
  }

  return { level: nextLevel, xp: nextXp, leveled };
}

function pickTierFromOdds(level: number): 1 | 2 | 3 | 4 {
  const odds = SHOP_ODDS_BY_LEVEL[Math.max(1, Math.min(MAX_LEVEL, level))];
  const roll = Math.random();
  const tier2Cutoff = odds.tier1 + odds.tier2;
  const tier3Cutoff = tier2Cutoff + odds.tier3;
  if (roll < odds.tier1) {
    return 1;
  }
  if (roll < tier2Cutoff) {
    return 2;
  }
  if (roll < tier3Cutoff) {
    return 3;
  }
  return 4;
}

function rollShop(level: number): Array<string | null> {
  const slots: Array<string | null> = [];
  for (let i = 0; i < SHOP_SIZE; i += 1) {
    const tier = pickTierFromOdds(level);
    const pool = UNIT_POOL_BY_TIER[tier];
    if (!pool.length) {
      slots.push(null);
      continue;
    }
    slots.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return slots;
}

function serializeState(state: GameState): object {
  return {
    version: SAVE_VERSION,
    resources: state.resources,
    lifetime: state.lifetime,
    stage: state.stage,
    level: state.level,
    xp: state.xp,
    commanderHp: state.commanderHp,
    winStreak: state.winStreak,
    loseStreak: state.loseStreak,
    army: state.army,
    shop: state.shop,
    shopLocked: state.shopLocked,
    formation: state.formation,
    directiveUsed: state.directiveUsed,
    battleBuff: state.battleBuff,
    logs: state.logs,
    lastReport: state.lastReport
  };
}

const initialShop = rollShop(1);

export const useGameStore = create<GameState>((set, get) => ({
  resources: { ...INITIAL_RESOURCES },
  lifetime: createResourceMap(0),
  rates: createResourceMap(0),
  stage: 1,
  level: 1,
  xp: 0,
  commanderHp: 100,
  winStreak: 0,
  loseStreak: 0,
  army: emptyCountsFromList(UNIT_CONFIGS),
  shop: [...initialShop],
  shopLocked: false,
  formation: "line",
  directiveUsed: false,
  battleBuff: { ...BASE_BATTLE_BUFF },
  phase: "build",
  battleNonce: 0,
  battleTimer: 0,
  worldTime: 0,
  commandQueue: [],
  commandCooldownReadyAt: { rally: 0, retreat: 0, overdrive: 0 },
  pendingTargetCommand: null,
  logs: ["Command uplink active."],
  lastReport: "No rounds completed.",
  dirty: true,
  loaded: false,

  refreshShop: (isFree = false) => {
    const state = get();
    if (state.phase !== "build") {
      return;
    }
    const refreshCost = isFree ? 0 : 2;
    if (!isFree && state.resources.credits < refreshCost) {
      return;
    }
    const nextResources = isFree ? state.resources : applyCost(state.resources, { credits: refreshCost });
    set({
      resources: nextResources,
      shop: rollShop(state.level),
      logs: addLog(state.logs, isFree ? "Shop synchronized." : `Shop refreshed (-${refreshCost} credits).`),
      dirty: true
    });
  },

  toggleShopLock: () => {
    const state = get();
    if (state.phase !== "build") {
      return;
    }
    set({
      shopLocked: !state.shopLocked,
      logs: addLog(state.logs, state.shopLocked ? "Shop unlocked." : "Shop locked for next round."),
      dirty: true
    });
  },

  buyShopUnit: (slotIndex) => {
    const state = get();
    if (state.phase !== "build") {
      return;
    }
    const unitId = state.shop[slotIndex];
    if (!unitId) {
      return;
    }
    const config = unitById[unitId];
    if (!config || !canAfford(state.resources, config.cost)) {
      return;
    }
    const unitCap = getUnitCapByLevel(state.level);
    if (getTotalArmyCount(state.army) >= unitCap) {
      return;
    }
    const nextShop = [...state.shop];
    nextShop[slotIndex] = null;
    set({
      resources: applyCost(state.resources, config.cost),
      army: { ...state.army, [unitId]: (state.army[unitId] ?? 0) + 1 },
      shop: nextShop,
      logs: addLog(state.logs, `${config.name} deployed from shop.`),
      dirty: true
    });
  },

  buyXp: () => {
    const state = get();
    if (state.phase !== "build" || state.level >= MAX_LEVEL) {
      return;
    }
    if (state.resources.credits < XP_PURCHASE_COST) {
      return;
    }
    const progressed = getXpProgress(state.level, state.xp + XP_PURCHASE_GAIN);
    const nextLogs =
      progressed.leveled > 0
        ? addLog(state.logs, `Command level upgraded to ${progressed.level}.`)
        : addLog(state.logs, `XP purchased (+${XP_PURCHASE_GAIN}).`);
    set({
      resources: applyCost(state.resources, { credits: XP_PURCHASE_COST }),
      level: progressed.level,
      xp: progressed.xp,
      logs: nextLogs,
      dirty: true
    });
  },

  trainUnit: (unitId) => {
    const state = get();
    const config = unitById[unitId];
    if (!config || state.phase !== "build") {
      return;
    }
    const unitCap = getUnitCapByLevel(state.level);
    if (getTotalArmyCount(state.army) >= unitCap || !canAfford(state.resources, config.cost)) {
      return;
    }
    set({
      resources: applyCost(state.resources, config.cost),
      army: { ...state.army, [unitId]: (state.army[unitId] ?? 0) + 1 },
      logs: addLog(state.logs, `${config.name} recruited.`),
      dirty: true
    });
  },

  disbandUnit: (unitId) => {
    const state = get();
    if (state.phase === "battle") {
      return;
    }
    const current = state.army[unitId] ?? 0;
    const config = unitById[unitId];
    if (current <= 0 || !config) {
      return;
    }

    const refund: Partial<Resources> = {};
    for (const resource of RESOURCE_ORDER) {
      const value = config.cost[resource];
      if (!value) {
        continue;
      }
      refund[resource] = Math.max(1, Math.floor(value * 0.5));
    }
    const [nextResources, nextLifetime] = addGain(state.resources, state.lifetime, refund);
    set({
      resources: nextResources,
      lifetime: nextLifetime,
      army: { ...state.army, [unitId]: current - 1 },
      logs: addLog(state.logs, `${config.name} sold.`),
      dirty: true
    });
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
    if (!operation || state.phase !== "build" || state.directiveUsed) {
      return;
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
      directiveUsed: true,
      battleBuff: nextBuff,
      logs: addLog(state.logs, `${operation.name} primed.`),
      dirty: true
    });
  },

  beginTargetingCommand: (kind) => {
    const state = get();
    if (state.phase !== "battle" || kind !== "rally") {
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
    if (state.phase === "battle" || getTotalArmyCount(state.army) <= 0 || state.commanderHp <= 0) {
      return;
    }
    const prepSummary = state.battleBuff.notes.length ? ` ${state.battleBuff.notes.join(" ")}` : "";
    set({
      phase: "battle",
      battleTimer: 90,
      battleNonce: state.battleNonce + 1,
      commandQueue: [],
      pendingTargetCommand: null,
      logs: addLog(state.logs, `Stage ${state.stage} engagement started.${prepSummary}`),
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

    let resources = state.resources;
    let lifetime = state.lifetime;
    let stage = state.stage;
    let commanderHp = state.commanderHp;
    let level = state.level;
    let xp = state.xp;
    let winStreak = state.winStreak;
    let loseStreak = state.loseStreak;

    const creditsInterest = Math.min(5, Math.floor(resources.credits / 10));
    const roundBase = 5 + Math.floor(state.stage / 2);

    if (result.victory) {
      stage += 1;
      winStreak += 1;
      loseStreak = 0;
      const streakBonus = Math.min(3, Math.floor(winStreak / 2));
      [resources, lifetime] = addGain(resources, lifetime, {
        credits: roundBase + creditsInterest + streakBonus,
        intel: 1 + Math.floor(stage / 4)
      });
    } else {
      loseStreak += 1;
      winStreak = 0;
      const chipDamage = 6 + Math.floor(state.stage / 2);
      commanderHp = Math.max(0, commanderHp - chipDamage);
      [resources, lifetime] = addGain(resources, lifetime, {
        credits: 2 + Math.min(3, Math.floor(loseStreak / 2)),
        intel: 1
      });
    }

    const xpGain = 2;
    const progressed = getXpProgress(level, xp + xpGain);
    level = progressed.level;
    xp = progressed.xp;

    const report = result.victory
      ? `Victory at Stage ${state.stage}. Sectors held: ${result.sectorsHeld}/3. XP +${xpGain}.`
      : `Defeat at Stage ${state.stage}. Commander integrity ${commanderHp}%. XP +${xpGain}.`;

    const leveledLog =
      progressed.leveled > 0
        ? addLog(state.logs, `Command level upgraded to ${level}.`)
        : state.logs;

    const nextShop = state.shopLocked ? state.shop : rollShop(level);
    const gameOverLog =
      commanderHp <= 0
        ? addLog(addLog(leveledLog, report), "Run terminated. Reset to begin a new command run.")
        : addLog(leveledLog, report);

    set({
      phase: "build",
      battleTimer: 0,
      army: nextArmy,
      resources,
      lifetime,
      stage,
      level,
      xp,
      commanderHp,
      winStreak,
      loseStreak,
      directiveUsed: false,
      battleBuff: { ...BASE_BATTLE_BUFF },
      commandQueue: [],
      pendingTargetCommand: null,
      shop: nextShop,
      shopLocked: state.shopLocked,
      lastReport: report,
      logs: gameOverLog,
      dirty: true
    });
  },

  tick: (dt) => {
    const state = get();
    const rates = createResourceMap(0);
    const nextBattleTimer = state.phase === "battle" ? Math.max(0, state.battleTimer - dt) : 0;

    set({
      rates,
      battleTimer: nextBattleTimer,
      worldTime: state.worldTime + dt,
      pendingTargetCommand: state.phase === "battle" ? state.pendingTargetCommand : null
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
        stage?: number;
        level?: number;
        xp?: number;
        commanderHp?: number;
        winStreak?: number;
        loseStreak?: number;
        army?: Record<string, number>;
        shop?: Array<string | null>;
        shopLocked?: boolean;
        formation?: FormationId;
        directiveUsed?: boolean;
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

      const inputLevel = Math.max(1, Math.min(MAX_LEVEL, parsed.level ?? 1));
      const normalizedXp = Math.max(0, parsed.xp ?? 0);
      const progressed = getXpProgress(inputLevel, normalizedXp);

      const savedShop = Array.isArray(parsed.shop) ? parsed.shop.slice(0, SHOP_SIZE) : [];
      while (savedShop.length < SHOP_SIZE) {
        savedShop.push(null);
      }

      set({
        resources,
        lifetime,
        rates: createResourceMap(0),
        stage: Math.max(1, parsed.stage ?? 1),
        level: progressed.level,
        xp: progressed.xp,
        commanderHp: Math.max(0, Math.min(100, parsed.commanderHp ?? 100)),
        winStreak: Math.max(0, parsed.winStreak ?? 0),
        loseStreak: Math.max(0, parsed.loseStreak ?? 0),
        army: { ...emptyCountsFromList(UNIT_CONFIGS), ...(parsed.army ?? {}) },
        shop: savedShop,
        shopLocked: Boolean(parsed.shopLocked),
        formation: formationById[parsed.formation ?? "line"] ? (parsed.formation as FormationId) : "line",
        directiveUsed: Boolean(parsed.directiveUsed),
        battleBuff: {
          ...BASE_BATTLE_BUFF,
          ...(parsed.battleBuff ?? {}),
          notes: Array.isArray(parsed.battleBuff?.notes) ? parsed.battleBuff.notes : []
        },
        logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 60) : ["Save loaded."],
        lastReport: parsed.lastReport ?? "No rounds completed.",
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
      stage: 1,
      level: 1,
      xp: 0,
      commanderHp: 100,
      winStreak: 0,
      loseStreak: 0,
      army: emptyCountsFromList(UNIT_CONFIGS),
      shop: rollShop(1),
      shopLocked: false,
      formation: "line",
      directiveUsed: false,
      battleBuff: { ...BASE_BATTLE_BUFF },
      phase: "build",
      battleNonce: 0,
      battleTimer: 0,
      worldTime: 0,
      commandQueue: [],
      commandCooldownReadyAt: { rally: 0, retreat: 0, overdrive: 0 },
      pendingTargetCommand: null,
      logs: ["Command uplink reset."],
      lastReport: "No rounds completed.",
      dirty: true
    });
  }
}));

export function getVisibleResources(): ResourceKey[] {
  return RESOURCE_ORDER;
}

export function formatResourcePair(resource: ResourceKey, value: number): string {
  return `${RESOURCE_LABELS[resource]} ${Math.floor(value).toLocaleString()}`;
}
