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

export type CommandKind = "rally" | "retreat" | "overdrive";
export type FormationId = "line" | "vanguard" | "skirmish" | "siege";

export interface FormationConfig {
  id: FormationId;
  name: string;
  description: string;
}

export interface BattleModifiers {
  hpMult: number;
  damageMult: number;
  speedMult: number;
  rangeMult: number;
  cooldownMult: number;
  hpByRole: Partial<Record<UnitRole, number>>;
  damageByRole: Partial<Record<UnitRole, number>>;
  speedByRole: Partial<Record<UnitRole, number>>;
  rangeByRole: Partial<Record<UnitRole, number>>;
  cooldownByRole: Partial<Record<UnitRole, number>>;
  labels: string[];
}

export interface BattleBuffScalars {
  allyDamageMult: number;
  allyHpMult: number;
  allySpeedMult: number;
  allyRangeMult: number;
  allyCooldownMult: number;
  enemyDamageMult: number;
  enemyHpMult: number;
}

export interface BattleBuff extends BattleBuffScalars {
  notes: string[];
}

export interface PrepOperation {
  id: string;
  name: string;
  description: string;
  resourceGain?: Partial<Resources>;
  buff?: Partial<BattleBuffScalars>;
  note?: string;
}

export interface BattleCommand {
  seq: number;
  kind: CommandKind;
  issuedAt: number;
  target?: { x: number; y: number };
}

export interface BattleResult {
  victory: boolean;
  casualties: Record<string, number>;
  sectorsHeld: number;
}
