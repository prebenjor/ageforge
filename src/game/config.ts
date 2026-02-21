import type {
  BattleBuff,
  BattleModifiers,
  FormationConfig,
  FormationId,
  PrepOperation,
  ResourceKey,
  Resources,
  ShopOdds,
  UnitConfig,
  UnitRole
} from "./types";

export const RESOURCE_ORDER: ResourceKey[] = ["credits", "intel"];

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  credits: "Credits",
  intel: "Intel"
};

export const INITIAL_RESOURCES: Resources = {
  credits: 10,
  intel: 0
};

export const MAX_LEVEL = 9;
export const SHOP_SIZE = 5;
export const XP_PURCHASE_COST = 4;
export const XP_PURCHASE_GAIN = 4;

export const LEVEL_XP_REQUIREMENTS: Record<number, number> = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 22,
  6: 28,
  7: 34,
  8: 40
};

export const UNIT_CONFIGS: UnitConfig[] = [
  {
    id: "militia",
    name: "Shock Trooper",
    tier: 1,
    trait: "Vanguard",
    role: "frontline",
    cost: { credits: 1 },
    hp: 120,
    damage: 12,
    range: 28,
    speed: 76,
    cooldown: 0.92,
    radius: 10
  },
  {
    id: "slinger",
    name: "Pulse Ranger",
    tier: 1,
    trait: "Marksman",
    role: "ranged",
    cost: { credits: 1 },
    hp: 82,
    damage: 10,
    range: 132,
    speed: 74,
    cooldown: 0.78,
    radius: 8
  },
  {
    id: "knight",
    name: "Aegis Lancer",
    tier: 2,
    trait: "Sentinel",
    role: "frontline",
    cost: { credits: 2 },
    hp: 188,
    damage: 20,
    range: 32,
    speed: 84,
    cooldown: 1.02,
    radius: 11
  },
  {
    id: "artillery",
    name: "Rail Artillery",
    tier: 3,
    trait: "Ordnance",
    role: "siege",
    cost: { credits: 3, intel: 1 },
    hp: 128,
    damage: 42,
    range: 200,
    speed: 54,
    cooldown: 1.38,
    radius: 12
  },
  {
    id: "drone",
    name: "Drone Swarm",
    tier: 3,
    trait: "Swarm",
    role: "ranged",
    cost: { credits: 3, intel: 1 },
    hp: 100,
    damage: 24,
    range: 166,
    speed: 96,
    cooldown: 0.64,
    radius: 9
  },
  {
    id: "mech",
    name: "Titan Exo",
    tier: 4,
    trait: "Titan",
    role: "frontline",
    cost: { credits: 4, intel: 2 },
    hp: 280,
    damage: 36,
    range: 48,
    speed: 76,
    cooldown: 0.9,
    radius: 13
  }
];

export const UNIT_POOL_BY_TIER: Record<1 | 2 | 3 | 4, string[]> = {
  1: UNIT_CONFIGS.filter((unit) => unit.tier === 1).map((unit) => unit.id),
  2: UNIT_CONFIGS.filter((unit) => unit.tier === 2).map((unit) => unit.id),
  3: UNIT_CONFIGS.filter((unit) => unit.tier === 3).map((unit) => unit.id),
  4: UNIT_CONFIGS.filter((unit) => unit.tier === 4).map((unit) => unit.id)
};

export const SHOP_ODDS_BY_LEVEL: Record<number, ShopOdds> = {
  1: { tier1: 1, tier2: 0, tier3: 0, tier4: 0 },
  2: { tier1: 0.75, tier2: 0.25, tier3: 0, tier4: 0 },
  3: { tier1: 0.55, tier2: 0.35, tier3: 0.1, tier4: 0 },
  4: { tier1: 0.42, tier2: 0.4, tier3: 0.18, tier4: 0 },
  5: { tier1: 0.3, tier2: 0.42, tier3: 0.25, tier4: 0.03 },
  6: { tier1: 0.2, tier2: 0.4, tier3: 0.34, tier4: 0.06 },
  7: { tier1: 0.12, tier2: 0.35, tier3: 0.4, tier4: 0.13 },
  8: { tier1: 0.06, tier2: 0.24, tier3: 0.45, tier4: 0.25 },
  9: { tier1: 0.02, tier2: 0.18, tier3: 0.44, tier4: 0.36 }
};

export const FORMATIONS: FormationConfig[] = [
  {
    id: "line",
    name: "Adaptive Grid",
    description: "Stable baseline with no penalties."
  },
  {
    id: "vanguard",
    name: "Vanguard Spear",
    description: "Frontline surge with stronger breach pressure."
  },
  {
    id: "skirmish",
    name: "Skirmish Arc",
    description: "Ranged units kite harder with faster cadence."
  },
  {
    id: "siege",
    name: "Siege Matrix",
    description: "Long-range siege pressure, slower global movement."
  }
];

export const COMMAND_COOLDOWNS = {
  rally: 8,
  retreat: 12,
  overdrive: 20
} as const;

export const PREP_OPERATIONS: PrepOperation[] = [
  {
    id: "target-sync",
    name: "Target Sync",
    description: "Upload a precision target model before combat.",
    buff: { allyDamageMult: 1.1 },
    note: "Directive: +10% allied damage this round."
  },
  {
    id: "shield-grid",
    name: "Shield Grid",
    description: "Deploy temporary barrier projectors.",
    buff: { allyHpMult: 1.14 },
    note: "Directive: +14% allied HP this round."
  },
  {
    id: "throttle",
    name: "Throttle Burst",
    description: "Prime locomotion systems for rapid reposition.",
    buff: { allySpeedMult: 1.16, allyCooldownMult: 0.94 },
    note: "Directive: +16% speed, -6% cooldown this round."
  },
  {
    id: "jammer",
    name: "Signal Jammer",
    description: "Disrupt hostile telemetry and coordination.",
    buff: { enemyDamageMult: 0.9, enemyHpMult: 0.95 },
    note: "Directive: enemy damage -10%, enemy HP -5%."
  }
];

export const BASE_BATTLE_BUFF: BattleBuff = {
  allyDamageMult: 1,
  allyHpMult: 1,
  allySpeedMult: 1,
  allyRangeMult: 1,
  allyCooldownMult: 1,
  enemyDamageMult: 1,
  enemyHpMult: 1,
  notes: []
};

const roleByUnitId = Object.fromEntries(UNIT_CONFIGS.map((unit) => [unit.id, unit.role]));

function createRoleMap(fill = 1): Record<UnitRole, number> {
  return {
    frontline: fill,
    ranged: fill,
    support: fill,
    siege: fill
  };
}

function multiplyRoleValue(target: Partial<Record<UnitRole, number>>, role: UnitRole, value: number): void {
  target[role] = (target[role] ?? 1) * value;
}

function roleCountFromArmy(army: Record<string, number>): Record<UnitRole, number> {
  const counts = { frontline: 0, ranged: 0, support: 0, siege: 0 };
  for (const [unitId, count] of Object.entries(army)) {
    const role = roleByUnitId[unitId];
    if (!role) {
      continue;
    }
    counts[role] += count;
  }
  return counts;
}

export function computeBattleModifiers(army: Record<string, number>, formationId: FormationId): BattleModifiers {
  const mods: BattleModifiers = {
    hpMult: 1,
    damageMult: 1,
    speedMult: 1,
    rangeMult: 1,
    cooldownMult: 1,
    hpByRole: createRoleMap(),
    damageByRole: createRoleMap(),
    speedByRole: createRoleMap(),
    rangeByRole: createRoleMap(),
    cooldownByRole: createRoleMap(),
    labels: []
  };

  const roleCounts = roleCountFromArmy(army);
  const droneCount = army.drone ?? 0;
  const mechCount = army.mech ?? 0;

  if (formationId === "line") {
    mods.hpMult *= 1.04;
    mods.labels.push("Adaptive Grid: +4% global HP");
  } else if (formationId === "vanguard") {
    multiplyRoleValue(mods.hpByRole, "frontline", 1.22);
    multiplyRoleValue(mods.speedByRole, "frontline", 1.08);
    mods.damageMult *= 1.04;
    mods.labels.push("Vanguard Spear: frontline breach bonus");
  } else if (formationId === "skirmish") {
    multiplyRoleValue(mods.cooldownByRole, "ranged", 0.84);
    multiplyRoleValue(mods.speedByRole, "ranged", 1.12);
    multiplyRoleValue(mods.hpByRole, "frontline", 0.94);
    mods.labels.push("Skirmish Arc: ranged cadence bonus");
  } else if (formationId === "siege") {
    multiplyRoleValue(mods.damageByRole, "siege", 1.22);
    multiplyRoleValue(mods.rangeByRole, "siege", 1.2);
    mods.speedMult *= 0.93;
    mods.labels.push("Siege Matrix: siege firepower bonus");
  }

  if (roleCounts.frontline >= 5) {
    multiplyRoleValue(mods.hpByRole, "frontline", 1.16);
    mods.labels.push("Trait Sentinel Core: frontline +16% HP");
  }
  if (roleCounts.frontline >= 3 && roleCounts.ranged >= 4) {
    multiplyRoleValue(mods.damageByRole, "ranged", 1.18);
    mods.labels.push("Trait Crosslink: ranged +18% damage");
  }
  if (roleCounts.siege >= 2) {
    multiplyRoleValue(mods.damageByRole, "siege", 1.15);
    multiplyRoleValue(mods.rangeByRole, "siege", 1.1);
    mods.labels.push("Trait Battery: siege +15% damage");
  }
  if (droneCount >= 3) {
    mods.cooldownMult *= 0.9;
    mods.labels.push("Trait Swarm Mesh: global cooldown -10%");
  }
  if (mechCount >= 2 && droneCount >= 2) {
    mods.damageMult *= 1.08;
    mods.hpMult *= 1.08;
    mods.labels.push("Trait Titan Net: +8% global HP/damage");
  }

  return mods;
}

export function createResourceMap(fill = 0): Resources {
  return {
    credits: fill,
    intel: fill
  };
}

export function getUnitCapByLevel(level: number): number {
  return Math.min(11, 2 + level);
}

export function getXpRequiredForLevel(level: number): number {
  return LEVEL_XP_REQUIREMENTS[level] ?? 0;
}

export function getStageThreatLabel(stage: number): string {
  if (stage < 4) {
    return "Low Threat";
  }
  if (stage < 8) {
    return "Elevated Threat";
  }
  if (stage < 13) {
    return "High Threat";
  }
  return "Critical Threat";
}

export function getEnemyWave(stage: number): Array<{ unitId: string; count: number }> {
  if (stage <= 2) {
    return [
      { unitId: "militia", count: 5 + stage },
      { unitId: "slinger", count: 3 + Math.floor(stage / 2) }
    ];
  }
  if (stage <= 5) {
    return [
      { unitId: "militia", count: 6 + Math.floor(stage / 2) },
      { unitId: "slinger", count: 5 + Math.floor(stage / 2) },
      { unitId: "knight", count: 2 + Math.floor((stage - 2) / 2) }
    ];
  }
  if (stage <= 9) {
    return [
      { unitId: "knight", count: 5 + Math.floor((stage - 4) / 2) },
      { unitId: "artillery", count: 2 + Math.floor((stage - 5) / 2) },
      { unitId: "drone", count: 3 + Math.floor((stage - 5) / 2) }
    ];
  }
  return [
    { unitId: "knight", count: 8 + Math.floor((stage - 9) / 2) },
    { unitId: "artillery", count: 5 + Math.floor((stage - 9) / 2) },
    { unitId: "drone", count: 6 + Math.floor((stage - 9) / 2) },
    { unitId: "mech", count: 2 + Math.floor((stage - 10) / 3) }
  ];
}

