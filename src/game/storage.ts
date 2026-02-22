import {
  BUILDINGS,
  GLYPHS,
  HUNT_DURATION_SECONDS,
  OMEN_INTERVAL_SECONDS,
  RESOURCES,
  SAVE_KEY,
  SAVE_VERSION,
  UPGRADES
} from "./content";
import { createInitialState } from "./engine";
import type { GameState } from "./types";
import { clamp } from "./utils";

export function saveState(state: GameState): void {
  const payload = {
    version: SAVE_VERSION,
    resources: state.resources,
    buildings: state.buildings,
    upgrades: state.upgrades,
    sigils: state.sigils,
    omen: state.omen,
    omenShiftIn: state.omenShiftIn,
    exposure: state.exposure,
    breaches: state.breaches,
    huntRemaining: state.huntRemaining,
    worldTime: state.worldTime,
    logs: state.logs
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

export function loadState(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      version?: number;
      resources?: Record<string, number>;
      buildings?: Record<string, number>;
      upgrades?: Record<string, boolean>;
      sigils?: number[];
      omen?: number[];
      omenShiftIn?: number;
      exposure?: number;
      breaches?: number;
      huntRemaining?: number;
      worldTime?: number;
      logs?: string[];
    };

    if (parsed.version !== SAVE_VERSION) {
      return null;
    }

    const state = createInitialState();
    for (const resource of RESOURCES) {
      state.resources[resource] = Math.max(0, parsed.resources?.[resource] ?? state.resources[resource]);
    }

    for (const building of BUILDINGS) {
      state.buildings[building.id] = Math.max(0, parsed.buildings?.[building.id] ?? 0);
    }

    for (const upgrade of UPGRADES) {
      state.upgrades[upgrade.id] = Boolean(parsed.upgrades?.[upgrade.id]);
    }

    const sanitizeGlyph = (value: number): number => Math.abs(Math.floor(value)) % GLYPHS.length;

    if (Array.isArray(parsed.sigils)) {
      state.sigils = parsed.sigils.slice(0, 4).map(sanitizeGlyph);
    }
    while (state.sigils.length < 4) {
      state.sigils.push(Math.floor(Math.random() * GLYPHS.length));
    }

    if (Array.isArray(parsed.omen)) {
      state.omen = parsed.omen.slice(0, 4).map(sanitizeGlyph);
    }
    while (state.omen.length < 4) {
      state.omen.push(Math.floor(Math.random() * GLYPHS.length));
    }

    state.omenShiftIn = clamp(parsed.omenShiftIn ?? state.omenShiftIn, 5, OMEN_INTERVAL_SECONDS);
    state.exposure = clamp(parsed.exposure ?? state.exposure, 0, 100);
    state.breaches = Math.max(0, Math.floor(parsed.breaches ?? state.breaches));
    state.huntRemaining = clamp(parsed.huntRemaining ?? 0, 0, HUNT_DURATION_SECONDS);
    state.worldTime = Math.max(0, parsed.worldTime ?? state.worldTime);
    state.logs = Array.isArray(parsed.logs) ? parsed.logs.slice(0, 70) : state.logs;
    state.loaded = true;
    state.dirty = false;

    return state;
  } catch {
    return null;
  }
}

export function clearState(): void {
  localStorage.removeItem(SAVE_KEY);
}
