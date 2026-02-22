import { BUILDINGS } from "./content";
import { getOmenMatch, productionMultiplier } from "./engine";
import type { DerivedStats, GameState } from "./types";

export function deriveStats(state: GameState): DerivedStats {
  const omenMatch = getOmenMatch(state);
  const mult = productionMultiplier(state, omenMatch);

  const antennaCount = state.buildings.antenna ?? 0;
  const seanceCount = state.buildings.seance ?? 0;
  const pressCount = state.buildings.press ?? 0;
  const wardCount = state.buildings.ward ?? 0;

  return {
    omenMatch,
    productionPerSecond: {
      staticGain: antennaCount * 0.95 * mult,
      fearGain: seanceCount * 0.82 * 0.78 * mult,
      inkGain: pressCount * 0.62 * 0.56 * mult * (state.upgrades.blood_condenser ? 1.32 : 1),
      exposureDrift:
        0.018 +
        antennaCount * 0.08 * (state.upgrades.insulated_wires ? 0.65 : 1) +
        seanceCount * 0.03 +
        (state.huntRemaining > 0 ? 0.34 : 0),
      exposureControl: wardCount * 0.2 * 2.4 * (state.upgrades.mirrored_chalk ? 1.45 : 1)
    },
    night: Math.floor(state.worldTime / 120) + 1
  };
}

export function totalInstalledBuildings(state: GameState): number {
  let total = 0;
  for (const building of BUILDINGS) {
    total += state.buildings[building.id] ?? 0;
  }
  return total;
}
