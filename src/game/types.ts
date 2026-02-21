export type ResourceKey = "credits" | "intel";

export type Resources = Record<ResourceKey, number>;

export type UnitRole = "frontline" | "ranged" | "support" | "siege";

export interface UnitConfig {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  trait: string;
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

export interface ShopOdds {
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
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
