import type { BuildingDef, ResourceKey, UpgradeDef } from "./types";

export const SAVE_KEY = "black-signal-save-v1";
export const SAVE_VERSION = 1;

export const TICK_STEP = 0.05;
export const AUTOSAVE_SECONDS = 12;
export const OMEN_INTERVAL_SECONDS = 95;
export const HUNT_DURATION_SECONDS = 45;

export const RESOURCES: ResourceKey[] = ["static", "fear", "ink", "relics"];

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  static: "Static",
  fear: "Fear",
  ink: "Night Ink",
  relics: "Relics"
};

export const GLYPHS = ["O", "/\\", "*"];

export const BUILDINGS: BuildingDef[] = [
  {
    id: "antenna",
    name: "Rust Antenna",
    lore: "Harvests cursed frequencies. Strong static output, raises exposure.",
    baseCost: { static: 22 },
    costScale: 1.17
  },
  {
    id: "seance",
    name: "Seance Circle",
    lore: "Distills static into fear. Core conversion node.",
    baseCost: { static: 90, fear: 12 },
    costScale: 1.19
  },
  {
    id: "press",
    name: "Bone Press",
    lore: "Prints whisper-script into Night Ink.",
    baseCost: { static: 180, fear: 66, ink: 8 },
    costScale: 1.21
  },
  {
    id: "ward",
    name: "Ash Ward",
    lore: "Auto-suppresses exposure by burning ink into ash sigils.",
    baseCost: { static: 210, fear: 105, ink: 24 },
    costScale: 1.23
  }
];

export const UPGRADES: UpgradeDef[] = [
  {
    id: "insulated_wires",
    name: "Insulated Wires",
    lore: "Antenna exposure gain -35%.",
    cost: { static: 280, fear: 110, ink: 36 }
  },
  {
    id: "blood_condenser",
    name: "Blood Condenser",
    lore: "Fear -> Ink conversion +32%.",
    cost: { static: 320, fear: 140, ink: 52, relics: 1 }
  },
  {
    id: "mirrored_chalk",
    name: "Mirrored Chalk",
    lore: "Ash Ward exposure suppression +45%.",
    cost: { static: 380, fear: 170, ink: 66, relics: 1 }
  },
  {
    id: "black_diary",
    name: "Black Diary",
    lore: "Manual rituals +40% output.",
    cost: { static: 230, fear: 95, ink: 40 }
  },
  {
    id: "deep_receiver",
    name: "Deep Receiver",
    lore: "Perfect omen match grants much stronger production bonus.",
    cost: { static: 460, fear: 220, ink: 95, relics: 2 }
  },
  {
    id: "relic_lens",
    name: "Relic Lens",
    lore: "Night Hunts yield +1 relic.",
    cost: { static: 420, fear: 180, ink: 84, relics: 2 }
  }
];
