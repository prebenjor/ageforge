export type ResourceKey = "gold" | "essence";

export type Resources = Record<ResourceKey, number>;

export type Phase = "build" | "battle" | "gameover";

export interface TowerConfig {
  id: string;
  name: string;
  role: "single" | "aoe" | "control";
  description: string;
  cost: Partial<Resources>;
  baseDamage: number;
  baseRange: number;
  baseCooldown: number;
  projectileSpeed: number;
  color: number;
  projectileColor: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
}

export interface TowerPlacement {
  padId: number;
  towerId: string;
  level: number;
}

export interface EnemyConfig {
  id: string;
  name: string;
  hp: number;
  speed: number;
  rewardGold: number;
  rewardEssence: number;
  radius: number;
  color: number;
}

export interface WaveGroup {
  enemyId: string;
  count: number;
  interval: number;
  startAt: number;
}

export interface WaveDefinition {
  label: string;
  groups: WaveGroup[];
}

export interface WaveResult {
  completed: boolean;
  leaks: number;
  kills: number;
  goldEarned: number;
  essenceEarned: number;
}

export interface BattleTelemetry {
  kills: number;
  leaks: number;
  remaining: number;
  incoming: number;
  goldEarned: number;
  essenceEarned: number;
}

