export type ResourceKey = "static" | "fear" | "ink" | "relics";

export type Resources = Record<ResourceKey, number>;

export interface BuildingDef {
  id: string;
  name: string;
  lore: string;
  baseCost: Partial<Resources>;
  costScale: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  lore: string;
  cost: Partial<Resources>;
}

export interface GameState {
  resources: Resources;
  buildings: Record<string, number>;
  upgrades: Record<string, boolean>;
  sigils: number[];
  omen: number[];
  omenShiftIn: number;
  exposure: number;
  breaches: number;
  huntRemaining: number;
  worldTime: number;
  logs: string[];
  dirty: boolean;
  loaded: boolean;
}

export type ManualRitualKind = "scan" | "invoke" | "scribe" | "calm";

export type GameAction =
  | { type: "load"; payload: GameState }
  | { type: "mark_loaded" }
  | { type: "tick"; dt: number }
  | { type: "rotate_sigil"; index: number }
  | { type: "manual_ritual"; kind: ManualRitualKind }
  | { type: "buy_building"; buildingId: string }
  | { type: "buy_upgrade"; upgradeId: string }
  | { type: "start_hunt" }
  | { type: "mark_saved" }
  | { type: "reset" };

export interface DerivedStats {
  omenMatch: number;
  productionPerSecond: {
    staticGain: number;
    fearGain: number;
    inkGain: number;
    exposureDrift: number;
    exposureControl: number;
  };
  night: number;
}
