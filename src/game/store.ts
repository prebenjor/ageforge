import { create } from "zustand";
import {
  INITIAL_INCOME,
  INITIAL_LIVES,
  INITIAL_RESOURCES,
  MAX_TOWER_LEVEL,
  PAD_LAYOUT,
  RESOURCE_LABELS,
  RESOURCE_ORDER,
  WAVE_DURATION,
  createResourceMap,
  getTowerById,
  getTowerSellRefund,
  getTowerUpgradeCost
} from "./config";
import type {
  BattleTelemetry,
  Phase,
  ResourceKey,
  Resources,
  TowerPlacement,
  WaveResult
} from "./types";

const SAVE_KEY = "ageforge-td-v1-save";
const SAVE_VERSION = 1;

function addLog(logs: string[], message: string): string[] {
  const next = [`${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${message}`, ...logs];
  return next.slice(0, 70);
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

function createEmptyBoard(): Record<number, TowerPlacement | null> {
  const board: Record<number, TowerPlacement | null> = {};
  for (const pad of PAD_LAYOUT) {
    board[pad.id] = null;
  }
  return board;
}

function countPlacedTowers(board: Record<number, TowerPlacement | null>): number {
  return Object.values(board).reduce((sum, slot) => sum + (slot ? 1 : 0), 0);
}

function defaultBattleTelemetry(): BattleTelemetry {
  return {
    kills: 0,
    leaks: 0,
    remaining: 0,
    incoming: 0,
    goldEarned: 0,
    essenceEarned: 0
  };
}

export interface GameState {
  resources: Resources;
  lifetime: Resources;
  phase: Phase;
  wave: number;
  lives: number;
  income: number;
  board: Record<number, TowerPlacement | null>;
  selectedTowerId: string | null;
  battleNonce: number;
  battleTimer: number;
  worldTime: number;
  battleTelemetry: BattleTelemetry;
  logs: string[];
  lastReport: string;
  dirty: boolean;
  loaded: boolean;
  selectTower: (towerId: string | null) => void;
  placeTower: (padId: number) => void;
  upgradeTower: (padId: number) => void;
  sellTower: (padId: number) => void;
  startWave: () => void;
  setBattleTelemetry: (telemetry: BattleTelemetry) => void;
  resolveWave: (result: WaveResult) => void;
  tick: (dt: number) => void;
  load: () => void;
  saveNow: () => void;
  reset: () => void;
}

function serializeState(state: GameState): object {
  return {
    version: SAVE_VERSION,
    resources: state.resources,
    lifetime: state.lifetime,
    phase: state.phase,
    wave: state.wave,
    lives: state.lives,
    income: state.income,
    board: state.board,
    selectedTowerId: state.selectedTowerId,
    logs: state.logs,
    lastReport: state.lastReport
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  resources: { ...INITIAL_RESOURCES },
  lifetime: createResourceMap(0),
  phase: "build",
  wave: 1,
  lives: INITIAL_LIVES,
  income: INITIAL_INCOME,
  board: createEmptyBoard(),
  selectedTowerId: "guard",
  battleNonce: 0,
  battleTimer: 0,
  worldTime: 0,
  battleTelemetry: defaultBattleTelemetry(),
  logs: ["Bastion command initialized."],
  lastReport: "No waves completed.",
  dirty: true,
  loaded: false,

  selectTower: (towerId) => {
    const state = get();
    if (towerId && !getTowerById(towerId)) {
      return;
    }
    set({
      selectedTowerId: towerId,
      logs: towerId ? addLog(state.logs, `${getTowerById(towerId)?.name ?? towerId} selected.`) : state.logs
    });
  },

  placeTower: (padId) => {
    const state = get();
    if (state.phase !== "build" || state.lives <= 0) {
      return;
    }
    if (!state.selectedTowerId) {
      return;
    }
    const selected = getTowerById(state.selectedTowerId);
    if (!selected) {
      return;
    }
    const current = state.board[padId];
    if (current && current.towerId !== selected.id) {
      return;
    }

    if (!current) {
      if (!canAfford(state.resources, selected.cost)) {
        return;
      }
      const nextBoard = { ...state.board, [padId]: { padId, towerId: selected.id, level: 1 } };
      set({
        resources: applyCost(state.resources, selected.cost),
        board: nextBoard,
        logs: addLog(state.logs, `${selected.name} built on pad ${padId + 1}.`),
        dirty: true
      });
      return;
    }

    if (current.level >= MAX_TOWER_LEVEL) {
      return;
    }
    const upgradeCost = getTowerUpgradeCost(current.towerId, current.level);
    if (!upgradeCost || !canAfford(state.resources, upgradeCost)) {
      return;
    }
    const upgraded: TowerPlacement = { ...current, level: current.level + 1 };
    set({
      resources: applyCost(state.resources, upgradeCost),
      board: { ...state.board, [padId]: upgraded },
      logs: addLog(state.logs, `${selected.name} upgraded to tier ${upgraded.level} on pad ${padId + 1}.`),
      dirty: true
    });
  },

  upgradeTower: (padId) => {
    const state = get();
    if (state.phase !== "build") {
      return;
    }
    const current = state.board[padId];
    if (!current || current.level >= MAX_TOWER_LEVEL) {
      return;
    }
    const upgradeCost = getTowerUpgradeCost(current.towerId, current.level);
    if (!upgradeCost || !canAfford(state.resources, upgradeCost)) {
      return;
    }
    const next = { ...current, level: current.level + 1 };
    set({
      resources: applyCost(state.resources, upgradeCost),
      board: { ...state.board, [padId]: next },
      logs: addLog(state.logs, `${getTowerById(current.towerId)?.name ?? current.towerId} upgraded to tier ${next.level}.`),
      dirty: true
    });
  },

  sellTower: (padId) => {
    const state = get();
    if (state.phase !== "build") {
      return;
    }
    const current = state.board[padId];
    if (!current) {
      return;
    }
    const refund = getTowerSellRefund(current.towerId, current.level);
    const [nextResources, nextLifetime] = addGain(state.resources, state.lifetime, refund);
    set({
      resources: nextResources,
      lifetime: nextLifetime,
      board: { ...state.board, [padId]: null },
      logs: addLog(state.logs, `${getTowerById(current.towerId)?.name ?? current.towerId} salvaged.`),
      dirty: true
    });
  },

  startWave: () => {
    const state = get();
    if (state.phase !== "build" || state.lives <= 0) {
      return;
    }
    if (countPlacedTowers(state.board) <= 0) {
      return;
    }
    set({
      phase: "battle",
      battleNonce: state.battleNonce + 1,
      battleTimer: WAVE_DURATION,
      battleTelemetry: defaultBattleTelemetry(),
      logs: addLog(state.logs, `Wave ${state.wave} started.`),
      dirty: true
    });
  },

  setBattleTelemetry: (telemetry) => {
    const state = get();
    if (state.phase !== "battle") {
      return;
    }
    set({ battleTelemetry: telemetry });
  },

  resolveWave: (result) => {
    const state = get();
    if (state.phase !== "battle") {
      return;
    }

    let nextLives = Math.max(0, state.lives - result.leaks);
    let nextWave = state.wave;
    let nextIncome = state.income;
    let phase: Phase = "build";

    if (result.completed) {
      nextWave += 1;
      if (nextWave % 3 === 0) {
        nextIncome += 1;
      }
    }

    if (nextLives <= 0) {
      phase = "gameover";
    }

    const interest = Math.min(9, Math.floor(state.resources.gold / 100));
    const waveBonus = result.completed ? Math.max(4, Math.floor(state.wave * 1.1)) : 0;
    const fallbackComp = result.completed ? 0 : 4;
    const passiveGain: Partial<Resources> = {
      gold: result.goldEarned + state.income + interest + waveBonus + fallbackComp,
      essence: result.essenceEarned + (result.completed && state.wave % 2 === 0 ? 1 : 0)
    };

    const [nextResources, nextLifetime] = addGain(state.resources, state.lifetime, passiveGain);

    const report = result.completed
      ? `Wave ${state.wave} cleared. Kills ${result.kills}, leaks ${result.leaks}.`
      : `Wave ${state.wave} timed out. Kills ${result.kills}, leaks ${result.leaks}.`;

    const gameOverLog =
      phase === "gameover"
        ? addLog(addLog(state.logs, report), "Bastion lost. Reset to launch a new defense run.")
        : addLog(state.logs, report);

    set({
      resources: nextResources,
      lifetime: nextLifetime,
      phase,
      wave: nextWave,
      lives: nextLives,
      income: nextIncome,
      battleTimer: 0,
      battleTelemetry: defaultBattleTelemetry(),
      lastReport: report,
      logs: gameOverLog,
      dirty: true
    });
  },

  tick: (dt) => {
    const state = get();
    const nextBattleTimer = state.phase === "battle" ? Math.max(0, state.battleTimer - dt) : 0;
    set({
      battleTimer: nextBattleTimer,
      worldTime: state.worldTime + dt
    });

    if (state.phase === "battle" && nextBattleTimer <= 0) {
      const pendingLeaks = state.battleTelemetry.remaining + state.battleTelemetry.incoming;
      get().resolveWave({
        completed: false,
        kills: state.battleTelemetry.kills,
        leaks: state.battleTelemetry.leaks + pendingLeaks,
        goldEarned: state.battleTelemetry.goldEarned,
        essenceEarned: state.battleTelemetry.essenceEarned
      });
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
        phase?: Phase;
        wave?: number;
        lives?: number;
        income?: number;
        board?: Record<number, TowerPlacement | null>;
        selectedTowerId?: string | null;
        logs?: string[];
        lastReport?: string;
      };

      const resources = { ...INITIAL_RESOURCES };
      const lifetime = createResourceMap(0);
      for (const resource of RESOURCE_ORDER) {
        resources[resource] = Math.max(0, parsed.resources?.[resource] ?? resources[resource]);
        lifetime[resource] = Math.max(0, parsed.lifetime?.[resource] ?? lifetime[resource]);
      }

      const board = createEmptyBoard();
      for (const [key, value] of Object.entries(parsed.board ?? {})) {
        const padId = Number(key);
        if (!Number.isFinite(padId) || !(padId in board) || !value) {
          continue;
        }
        const tower = getTowerById(value.towerId);
        if (!tower) {
          continue;
        }
        board[padId] = {
          padId,
          towerId: value.towerId,
          level: Math.max(1, Math.min(MAX_TOWER_LEVEL, value.level ?? 1))
        };
      }

      const phase = parsed.phase === "battle" ? "build" : parsed.phase ?? "build";

      set({
        resources,
        lifetime,
        phase,
        wave: Math.max(1, parsed.wave ?? 1),
        lives: Math.max(0, Math.min(INITIAL_LIVES, parsed.lives ?? INITIAL_LIVES)),
        income: Math.max(6, parsed.income ?? INITIAL_INCOME),
        board,
        selectedTowerId: parsed.selectedTowerId && getTowerById(parsed.selectedTowerId) ? parsed.selectedTowerId : "guard",
        battleNonce: 0,
        battleTimer: 0,
        worldTime: 0,
        battleTelemetry: defaultBattleTelemetry(),
        logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 70) : ["Save loaded."],
        lastReport: parsed.lastReport ?? "No waves completed.",
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
      phase: "build",
      wave: 1,
      lives: INITIAL_LIVES,
      income: INITIAL_INCOME,
      board: createEmptyBoard(),
      selectedTowerId: "guard",
      battleNonce: 0,
      battleTimer: 0,
      worldTime: 0,
      battleTelemetry: defaultBattleTelemetry(),
      logs: ["Bastion command reset."],
      lastReport: "No waves completed.",
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

