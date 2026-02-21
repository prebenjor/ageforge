import type {
  EnemyConfig,
  ResourceKey,
  Resources,
  TowerConfig,
  WaveDefinition,
  WaveGroup
} from "./types";

export const RESOURCE_ORDER: ResourceKey[] = ["gold", "essence"];

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  gold: "Gold",
  essence: "Essence"
};

export const INITIAL_RESOURCES: Resources = {
  gold: 180,
  essence: 0
};

export const INITIAL_LIVES = 25;
export const INITIAL_INCOME = 14;
export const WAVE_DURATION = 85;
export const MAX_TOWER_LEVEL = 3;

export const PAD_LAYOUT = [
  { id: 0, x: 154, y: 116, label: "North 1" },
  { id: 1, x: 246, y: 116, label: "North 2" },
  { id: 2, x: 338, y: 116, label: "North 3" },
  { id: 3, x: 496, y: 116, label: "North 4" },
  { id: 4, x: 588, y: 116, label: "North 5" },
  { id: 5, x: 154, y: 484, label: "South 1" },
  { id: 6, x: 246, y: 484, label: "South 2" },
  { id: 7, x: 338, y: 484, label: "South 3" },
  { id: 8, x: 496, y: 484, label: "South 4" },
  { id: 9, x: 588, y: 484, label: "South 5" },
  { id: 10, x: 408, y: 248, label: "Mid 1" },
  { id: 11, x: 408, y: 354, label: "Mid 2" }
] as const;

export const TOWER_CONFIGS: TowerConfig[] = [
  {
    id: "guard",
    name: "Guard Tower",
    role: "single",
    description: "Fast single-target bolts. Bread-and-butter anti-rush.",
    cost: { gold: 60 },
    baseDamage: 18,
    baseRange: 138,
    baseCooldown: 0.72,
    projectileSpeed: 560,
    color: 0x7cc8ff,
    projectileColor: 0xb8edff
  },
  {
    id: "arcane",
    name: "Arcane Spire",
    role: "single",
    description: "Heavy burst shots for armored enemies and elites.",
    cost: { gold: 90, essence: 1 },
    baseDamage: 44,
    baseRange: 162,
    baseCooldown: 1.18,
    projectileSpeed: 620,
    color: 0xc39bff,
    projectileColor: 0xe0cdff
  },
  {
    id: "bombard",
    name: "Bombard Keep",
    role: "aoe",
    description: "Slow shells with splash. Best for thick mid-wave packs.",
    cost: { gold: 120, essence: 2 },
    baseDamage: 66,
    baseRange: 186,
    baseCooldown: 1.65,
    projectileSpeed: 420,
    color: 0xffa25a,
    projectileColor: 0xffd3ad,
    splashRadius: 52
  },
  {
    id: "frost",
    name: "Frost Reliquary",
    role: "control",
    description: "Applies movement slow while maintaining steady DPS.",
    cost: { gold: 95, essence: 1 },
    baseDamage: 16,
    baseRange: 150,
    baseCooldown: 0.82,
    projectileSpeed: 530,
    color: 0x7cf3e8,
    projectileColor: 0xc2fff8,
    slowFactor: 0.68,
    slowDuration: 1.2
  }
];

export const ENEMY_CONFIGS: EnemyConfig[] = [
  {
    id: "raider",
    name: "Raider",
    hp: 62,
    speed: 70,
    rewardGold: 2,
    rewardEssence: 0,
    radius: 9,
    color: 0xd8817f
  },
  {
    id: "wolf",
    name: "Dire Wolf",
    hp: 40,
    speed: 108,
    rewardGold: 1,
    rewardEssence: 0,
    radius: 7,
    color: 0xcfb27e
  },
  {
    id: "ogre",
    name: "Ogre",
    hp: 220,
    speed: 46,
    rewardGold: 5,
    rewardEssence: 1,
    radius: 12,
    color: 0xaf8f7d
  },
  {
    id: "warlock",
    name: "Warlock",
    hp: 142,
    speed: 62,
    rewardGold: 4,
    rewardEssence: 1,
    radius: 10,
    color: 0xb48be4
  },
  {
    id: "infernal",
    name: "Infernal",
    hp: 490,
    speed: 38,
    rewardGold: 10,
    rewardEssence: 2,
    radius: 15,
    color: 0xff7668
  }
];

const towerById = Object.fromEntries(TOWER_CONFIGS.map((tower) => [tower.id, tower]));
const enemyById = Object.fromEntries(ENEMY_CONFIGS.map((enemy) => [enemy.id, enemy]));

export function createResourceMap(fill = 0): Resources {
  return {
    gold: fill,
    essence: fill
  };
}

export function getTowerById(towerId: string): TowerConfig | null {
  return towerById[towerId] ?? null;
}

export function getEnemyById(enemyId: string): EnemyConfig | null {
  return enemyById[enemyId] ?? null;
}

export function getTowerStats(towerId: string, level: number): {
  damage: number;
  range: number;
  cooldown: number;
  splashRadius: number;
  slowFactor: number;
  slowDuration: number;
} {
  const tower = getTowerById(towerId);
  if (!tower) {
    return { damage: 0, range: 0, cooldown: 1, splashRadius: 0, slowFactor: 1, slowDuration: 0 };
  }
  const normalizedLevel = Math.max(1, Math.min(MAX_TOWER_LEVEL, level));
  const levelScale = 1 + (normalizedLevel - 1) * 0.62;
  const cooldownScale = 1 + (normalizedLevel - 1) * 0.14;
  return {
    damage: Math.round(tower.baseDamage * levelScale),
    range: Math.round(tower.baseRange * (1 + (normalizedLevel - 1) * 0.06)),
    cooldown: Math.max(0.18, Number((tower.baseCooldown / cooldownScale).toFixed(2))),
    splashRadius: tower.splashRadius ? Math.round(tower.splashRadius + (normalizedLevel - 1) * 10) : 0,
    slowFactor: tower.slowFactor ? Math.max(0.42, tower.slowFactor - (normalizedLevel - 1) * 0.04) : 1,
    slowDuration: tower.slowDuration ? Number((tower.slowDuration + (normalizedLevel - 1) * 0.16).toFixed(2)) : 0
  };
}

export function getTowerUpgradeCost(towerId: string, currentLevel: number): Partial<Resources> | null {
  const tower = getTowerById(towerId);
  if (!tower || currentLevel >= MAX_TOWER_LEVEL) {
    return null;
  }
  const scale = 0.74 + currentLevel * 0.68;
  const baseGold = tower.cost.gold ?? 0;
  const baseEssence = tower.cost.essence ?? 0;
  return {
    gold: Math.max(1, Math.ceil(baseGold * scale)),
    essence: baseEssence > 0 ? Math.max(1, Math.ceil(baseEssence * (0.48 + currentLevel * 0.52))) : 0
  };
}

export function getTowerSellRefund(towerId: string, level: number): Partial<Resources> {
  const tower = getTowerById(towerId);
  if (!tower) {
    return { gold: 0, essence: 0 };
  }
  let totalGold = tower.cost.gold ?? 0;
  let totalEssence = tower.cost.essence ?? 0;
  for (let current = 1; current < level; current += 1) {
    const upgradeCost = getTowerUpgradeCost(towerId, current);
    if (!upgradeCost) {
      continue;
    }
    totalGold += upgradeCost.gold ?? 0;
    totalEssence += upgradeCost.essence ?? 0;
  }
  return {
    gold: Math.floor(totalGold * 0.72),
    essence: Math.floor(totalEssence * 0.72)
  };
}

function scaleGroups(groups: WaveGroup[], hpScale: number): WaveGroup[] {
  return groups.map((group) => ({ ...group, count: Math.max(1, Math.floor(group.count * hpScale)) }));
}

export function getWaveDefinition(wave: number): WaveDefinition {
  const stage = Math.max(1, wave);
  const densityScale = 1 + (stage - 1) * 0.08;
  if (stage % 5 === 0) {
    return {
      label: "Boss Siege",
      groups: scaleGroups(
        [
          { enemyId: "raider", count: 10 + stage, interval: 0.48, startAt: 0 },
          { enemyId: "warlock", count: 4 + Math.floor(stage / 2), interval: 0.84, startAt: 3.8 },
          { enemyId: "infernal", count: 1 + Math.floor(stage / 10), interval: 2.8, startAt: 8.6 }
        ],
        densityScale
      )
    };
  }
  if (stage % 3 === 0) {
    return {
      label: "Fast Pressure",
      groups: scaleGroups(
        [
          { enemyId: "wolf", count: 16 + stage * 2, interval: 0.29, startAt: 0.2 },
          { enemyId: "raider", count: 10 + stage, interval: 0.44, startAt: 3.2 }
        ],
        densityScale
      )
    };
  }
  if (stage >= 7) {
    return {
      label: "War Host",
      groups: scaleGroups(
        [
          { enemyId: "raider", count: 14 + stage, interval: 0.42, startAt: 0.1 },
          { enemyId: "ogre", count: 5 + Math.floor(stage / 2), interval: 1.06, startAt: 4.4 },
          { enemyId: "warlock", count: 7 + Math.floor(stage / 2), interval: 0.85, startAt: 6.8 }
        ],
        densityScale
      )
    };
  }
  return {
    label: "Scout Push",
    groups: scaleGroups(
      [
        { enemyId: "raider", count: 11 + stage * 2, interval: 0.44, startAt: 0 },
        { enemyId: "wolf", count: 6 + stage, interval: 0.36, startAt: 4.8 }
      ],
      densityScale
    )
  };
}

export function getWaveSummary(wave: number): string {
  const definition = getWaveDefinition(wave);
  const summary = definition.groups
    .map((group) => {
      const enemy = getEnemyById(group.enemyId);
      return `${enemy?.name ?? group.enemyId} x${group.count}`;
    })
    .join(" | ");
  return `${definition.label}: ${summary}`;
}

