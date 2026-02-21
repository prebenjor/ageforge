import type { AgeConfig, ManualAction, ResourceKey, Resources, StructureConfig, UnitConfig } from "./types";

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

export const COMMAND_COOLDOWNS = {
  rally: 8,
  retreat: 12,
  overdrive: 20
} as const;

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
