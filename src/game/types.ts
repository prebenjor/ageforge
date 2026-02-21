export type ResourceKey = "food" | "materials" | "knowledge" | "power" | "data";

export type Resources = Record<ResourceKey, number>;

export interface AgeConfig {
  name: string;
  requirements: Partial<Record<ResourceKey, number>>;
}

export interface ManualAction {
  id: string;
  label: string;
  unlockAge: number;
  gain: Partial<Resources>;
  cost?: Partial<Resources>;
}

export interface StructureConfig {
  id: string;
  name: string;
  unlockAge: number;
  baseCost: Partial<Resources>;
  costScale: number;
  produces: Partial<Record<ResourceKey, number>>;
  consumes?: Partial<Record<ResourceKey, number>>;
}

export type UnitRole = "frontline" | "ranged" | "support" | "siege";

export interface UnitConfig {
  id: string;
  name: string;
  unlockAge: number;
  role: UnitRole;
  cost: Partial<Resources>;
  hp: number;
  damage: number;
  range: number;
  speed: number;
  cooldown: number;
  radius: number;
}

export interface BattleCommand {
  seq: number;
  kind: "rally" | "retreat" | "overdrive";
  issuedAt: number;
}

export interface BattleResult {
  victory: boolean;
  casualties: Record<string, number>;
  sectorsHeld: number;
}
