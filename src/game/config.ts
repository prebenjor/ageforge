import type {
  AgeConfig,
  BattleBuff,
  BattleModifiers,
  FormationConfig,
  FormationId,
  ManualAction,
  PrepOperation,
  ResourceKey,
  Resources,
  StructureConfig,
  UnitConfig,
  UnitRole
} from "./types";

export const RESOURCE_ORDER: ResourceKey[] = ["food", "materials", "knowledge", "power", "data"];

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  food: "Food",
  materials: "Materials",
  knowledge: "Knowledge",
  power: "Power",
  data: "Data"
};

export const RESOURCE_UNLOCK_AGE: Record<ResourceKey, number> = {
  food: 0,
  materials: 0,
  knowledge: 0,
  power: 4,
  data: 5
};

export const AGES: AgeConfig[] = [
  { name: "Neolithic Age", requirements: {} },
  { name: "Bronze Age", requirements: { food: 220, materials: 260, knowledge: 130 } },
  { name: "Classical Age", requirements: { food: 1000, materials: 1250, knowledge: 520 } },
  { name: "Medieval Age", requirements: { food: 2800, materials: 3900, knowledge: 1700 } },
  { name: "Industrial Age", requirements: { food: 7600, materials: 10800, knowledge: 4800 } },
  { name: "Modern Age", requirements: { food: 18000, materials: 28000, knowledge: 12000, power: 4600 } },
  { name: "Futuristic Age", requirements: { food: 36000, materials: 62000, knowledge: 28000, power: 18000, data: 7200 } }
];

export const INITIAL_RESOURCES: Resources = {
  food: 50,
  materials: 40,
  knowledge: 0,
  power: 0,
  data: 0
};

export const MANUAL_ACTIONS: ManualAction[] = [
  { id: "forage", label: "Forage", unlockAge: 0, gain: { food: 7 } },
  { id: "scavenge", label: "Gather Materials", unlockAge: 0, gain: { materials: 6 } },
  { id: "study", label: "Study", unlockAge: 0, gain: { knowledge: 4 }, cost: { food: 2 } },
  { id: "generator", label: "Crank Generator", unlockAge: 4, gain: { power: 9 }, cost: { materials: 6 } },
  { id: "data-mine", label: "Harvest Data", unlockAge: 5, gain: { data: 9 }, cost: { power: 5 } }
];

export const STRUCTURES: StructureConfig[] = [
  {
    id: "farms",
    name: "Farms",
    unlockAge: 0,
    baseCost: { food: 20, materials: 16 },
    costScale: 1.15,
    produces: { food: 1.3 }
  },
  {
    id: "workshops",
    name: "Workshops",
    unlockAge: 0,
    baseCost: { food: 24, materials: 22 },
    costScale: 1.15,
    produces: { materials: 1.1 }
  },
  {
    id: "schools",
    name: "Schools",
    unlockAge: 1,
    baseCost: { food: 50, materials: 80, knowledge: 30 },
    costScale: 1.16,
    produces: { knowledge: 0.65 },
    consumes: { food: 0.25 }
  },
  {
    id: "plants",
    name: "Power Plants",
    unlockAge: 4,
    baseCost: { food: 130, materials: 320, knowledge: 180 },
    costScale: 1.17,
    produces: { power: 2.1 },
    consumes: { materials: 0.75 }
  },
  {
    id: "clusters",
    name: "Compute Clusters",
    unlockAge: 5,
    baseCost: { food: 200, materials: 430, knowledge: 340, power: 180 },
    costScale: 1.18,
    produces: { data: 1.8, knowledge: 0.7 },
    consumes: { power: 1.2 }
  }
];

export const UNIT_CONFIGS: UnitConfig[] = [
  {
    id: "militia",
    name: "Militia",
    unlockAge: 0,
    role: "frontline",
    cost: { food: 20, materials: 16 },
    hp: 110,
    damage: 11,
    range: 26,
    speed: 70,
    cooldown: 0.95,
    radius: 10
  },
  {
    id: "slinger",
    name: "Slinger",
    unlockAge: 0,
    role: "ranged",
    cost: { food: 16, materials: 20, knowledge: 8 },
    hp: 76,
    damage: 9,
    range: 120,
    speed: 68,
    cooldown: 0.8,
    radius: 8
  },
  {
    id: "knight",
    name: "Knight",
    unlockAge: 3,
    role: "frontline",
    cost: { food: 38, materials: 52, knowledge: 24 },
    hp: 175,
    damage: 19,
    range: 30,
    speed: 82,
    cooldown: 1.05,
    radius: 11
  },
  {
    id: "artillery",
    name: "Artillery",
    unlockAge: 4,
    role: "siege",
    cost: { food: 25, materials: 90, knowledge: 46, power: 18 },
    hp: 120,
    damage: 38,
    range: 190,
    speed: 52,
    cooldown: 1.4,
    radius: 12
  },
  {
    id: "drone",
    name: "Drone Wing",
    unlockAge: 5,
    role: "ranged",
    cost: { food: 18, materials: 75, knowledge: 55, power: 42, data: 20 },
    hp: 96,
    damage: 23,
    range: 160,
    speed: 92,
    cooldown: 0.65,
    radius: 9
  },
  {
    id: "mech",
    name: "Mech",
    unlockAge: 6,
    role: "frontline",
    cost: { food: 30, materials: 110, knowledge: 85, power: 70, data: 38 },
    hp: 260,
    damage: 34,
    range: 45,
    speed: 74,
    cooldown: 0.9,
    radius: 13
  }
];

export const FORMATIONS: FormationConfig[] = [
  {
    id: "line",
    name: "Line Formation",
    description: "Balanced baseline with tighter spacing and no drawbacks."
  },
  {
    id: "vanguard",
    name: "Vanguard Push",
    description: "Frontline units surge forward and soak pressure."
  },
  {
    id: "skirmish",
    name: "Skirmish Grid",
    description: "Ranged units kite harder with faster attack cadence."
  },
  {
    id: "siege",
    name: "Siege Battery",
    description: "Siege units gain range and firepower, with slower infantry."
  }
];

export const COMMAND_COOLDOWNS = {
  rally: 8,
  retreat: 12,
  overdrive: 20
} as const;

export const PREP_ACTIONS_PER_CYCLE = 3;

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

export const PREP_OPERATIONS: PrepOperation[] = [
  {
    id: "supply-raid",
    name: "Supply Raid",
    description: "Launch a short convoy raid to stock the front.",
    resourceGain: { food: 120, materials: 100 },
    note: "Operation: front stockpiles increased."
  },
  {
    id: "field-lab",
    name: "Field Lab",
    description: "Deploy rapid prototypes and battlefield diagnostics.",
    resourceGain: { knowledge: 95, data: 24 },
    buff: { allyDamageMult: 1.08 },
    note: "Operation: +8% allied damage next battle."
  },
  {
    id: "fortify",
    name: "Fortify Line",
    description: "Set hardened cover and layered fallback points.",
    buff: { allyHpMult: 1.2, enemyDamageMult: 0.95 },
    note: "Operation: +20% allied HP, enemy damage -5%."
  },
  {
    id: "maneuvers",
    name: "Maneuver Drills",
    description: "Train synchronized movements before contact.",
    buff: { allySpeedMult: 1.16, allyCooldownMult: 0.92 },
    note: "Operation: +16% allied speed, cooldown -8%."
  },
  {
    id: "targeting-net",
    name: "Targeting Net",
    description: "Coordinate spotters and artillery vectors.",
    buff: { allyRangeMult: 1.12, enemyHpMult: 0.92 },
    note: "Operation: +12% allied range, enemy HP -8%."
  }
];

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
    mods.hpMult *= 1.05;
    mods.labels.push("Line: +5% global HP");
  } else if (formationId === "vanguard") {
    multiplyRoleValue(mods.hpByRole, "frontline", 1.24);
    multiplyRoleValue(mods.speedByRole, "frontline", 1.08);
    mods.damageMult *= 1.03;
    mods.labels.push("Vanguard: frontline HP/speed surge");
  } else if (formationId === "skirmish") {
    multiplyRoleValue(mods.cooldownByRole, "ranged", 0.84);
    multiplyRoleValue(mods.speedByRole, "ranged", 1.12);
    multiplyRoleValue(mods.hpByRole, "frontline", 0.92);
    mods.labels.push("Skirmish: ranged cadence boosted");
  } else if (formationId === "siege") {
    multiplyRoleValue(mods.damageByRole, "siege", 1.2);
    multiplyRoleValue(mods.rangeByRole, "siege", 1.2);
    mods.speedMult *= 0.94;
    mods.labels.push("Siege: artillery damage/range up");
  }

  if (roleCounts.frontline >= 6) {
    multiplyRoleValue(mods.hpByRole, "frontline", 1.16);
    mods.labels.push("Synergy Shieldwall: frontline +16% HP");
  }
  if (roleCounts.frontline >= 4 && roleCounts.ranged >= 5) {
    multiplyRoleValue(mods.damageByRole, "ranged", 1.18);
    mods.labels.push("Synergy Crossfire: ranged +18% damage");
  }
  if (roleCounts.siege >= 3) {
    multiplyRoleValue(mods.damageByRole, "siege", 1.15);
    multiplyRoleValue(mods.rangeByRole, "siege", 1.1);
    mods.labels.push("Synergy Battery: siege +15% damage");
  }
  if (droneCount >= 4) {
    mods.cooldownMult *= 0.9;
    mods.labels.push("Synergy Drone Mesh: global cooldown -10%");
  }
  if (mechCount >= 2 && droneCount >= 2) {
    mods.damageMult *= 1.08;
    mods.hpMult *= 1.08;
    mods.labels.push("Synergy Titan Net: +8% global HP/damage");
  }

  return mods;
}

export function createResourceMap(fill = 0): Resources {
  return {
    food: fill,
    materials: fill,
    knowledge: fill,
    power: fill,
    data: fill
  };
}

export function getEnemyWave(ageIndex: number): Array<{ unitId: string; count: number }> {
  const waveTier = Math.max(0, Math.min(6, ageIndex));
  if (waveTier <= 1) {
    return [
      { unitId: "militia", count: 6 + waveTier * 2 },
      { unitId: "slinger", count: 4 + waveTier }
    ];
  }
  if (waveTier <= 3) {
    return [
      { unitId: "militia", count: 8 },
      { unitId: "slinger", count: 8 },
      { unitId: "knight", count: 4 + waveTier }
    ];
  }
  if (waveTier <= 5) {
    return [
      { unitId: "knight", count: 8 },
      { unitId: "artillery", count: 4 + waveTier },
      { unitId: "drone", count: 5 + waveTier }
    ];
  }
  return [
    { unitId: "artillery", count: 10 },
    { unitId: "drone", count: 10 },
    { unitId: "mech", count: 6 }
  ];
}

export function getUnitCapByAge(ageIndex: number): number {
  return 12 + ageIndex * 2;
}
