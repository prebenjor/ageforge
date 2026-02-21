const SAVE_KEY = "ageforge-save-v1";
const SAVE_VERSION = 2;

const RESOURCE_ORDER = ["food", "materials", "knowledge", "power", "data"];

const RESOURCES = {
  food: { label: "Food", unlockAge: 0 },
  materials: { label: "Materials", unlockAge: 0 },
  knowledge: { label: "Knowledge", unlockAge: 0 },
  power: { label: "Power", unlockAge: 4 },
  data: { label: "Data", unlockAge: 5 }
};

const AGES = [
  {
    name: "Neolithic Age",
    requirements: {},
    reward: { food: 30, materials: 20 }
  },
  {
    name: "Bronze Age",
    requirements: { food: 220, materials: 260, knowledge: 130 },
    reward: { food: 80, materials: 80, knowledge: 20 }
  },
  {
    name: "Classical Age",
    requirements: { food: 1000, materials: 1250, knowledge: 520 },
    reward: { food: 130, materials: 160, knowledge: 70 }
  },
  {
    name: "Medieval Age",
    requirements: { food: 2800, materials: 3900, knowledge: 1700 },
    reward: { food: 240, materials: 250, knowledge: 180 }
  },
  {
    name: "Industrial Age",
    requirements: { food: 7600, materials: 10800, knowledge: 4800 },
    reward: { food: 450, materials: 450, power: 120 }
  },
  {
    name: "Modern Age",
    requirements: { food: 18000, materials: 28000, knowledge: 12000, power: 4600 },
    reward: { food: 700, materials: 900, knowledge: 420, power: 300 }
  },
  {
    name: "Futuristic Age",
    requirements: {
      food: 36000,
      materials: 62000,
      knowledge: 28000,
      power: 18000,
      data: 7200
    },
    reward: { materials: 1500, knowledge: 1200, power: 900, data: 420 }
  }
];

const VICTORY_TARGET = { knowledge: 90000, data: 42000, power: 50000 };

const MANUAL_ACTIONS = [
  {
    id: "forage",
    label: "Forage",
    description: "Search nearby lands for food.",
    unlockAge: 0,
    retireAge: 2,
    resource: "food",
    gain: 6
  },
  {
    id: "scavenge",
    label: "Gather Materials",
    description: "Collect timber, stone, and ore.",
    unlockAge: 0,
    retireAge: 4,
    resource: "materials",
    gain: 5
  },
  {
    id: "study",
    label: "Study",
    description: "Turn food into ideas.",
    unlockAge: 0,
    retireAge: 5,
    resource: "knowledge",
    gain: 3,
    costs: { food: 2 }
  },
  {
    id: "draft",
    label: "Draft Blueprints",
    description: "Convert materials into knowledge.",
    unlockAge: 2,
    retireAge: 6,
    resource: "knowledge",
    gain: 7,
    costs: { materials: 4 }
  },
  {
    id: "generator",
    label: "Crank Generator",
    description: "Burn materials for electric output.",
    unlockAge: 4,
    resource: "power",
    gain: 8,
    costs: { materials: 6 }
  },
  {
    id: "mine-data",
    label: "Harvest Data",
    description: "Use power to produce data.",
    unlockAge: 5,
    resource: "data",
    gain: 8,
    costs: { power: 5 }
  }
];

const AGE_SCENES = [
  {
    title: "Valley Settlement",
    caption: "Direct your tribe by clicking active landmarks.",
    hotspots: [
      { id: "berry-grove", label: "Berry Grove", actionId: "forage", x: 17, y: 62, gainMult: 1.45, cooldown: 0.9 },
      { id: "stone-ridge", label: "Stone Ridge", actionId: "scavenge", x: 45, y: 52, gainMult: 1.4, cooldown: 0.9 },
      { id: "council-circle", label: "Council Circle", actionId: "study", x: 75, y: 67, gainMult: 1.3, cooldown: 1.1 }
    ]
  },
  {
    title: "Bronze Frontier",
    caption: "Smelters and farms expand your reach.",
    hotspots: [
      { id: "river-farms", label: "River Farms", actionId: "forage", x: 20, y: 64, gainMult: 1.5, cooldown: 0.85 },
      { id: "copper-pit", label: "Copper Pit", actionId: "scavenge", x: 50, y: 50, gainMult: 1.45, cooldown: 0.9 },
      { id: "scribe-tent", label: "Scribe Tent", actionId: "study", x: 78, y: 62, gainMult: 1.35, cooldown: 1.05 }
    ]
  },
  {
    title: "Classical Polis",
    caption: "Knowledge and engineering define this era.",
    hotspots: [
      { id: "granary-square", label: "Granary Square", actionId: "forage", x: 18, y: 60, gainMult: 1.55, cooldown: 0.8 },
      { id: "forum-works", label: "Forum Works", actionId: "draft", x: 48, y: 48, gainMult: 1.4, cooldown: 1.0 },
      { id: "academy-steps", label: "Academy Steps", actionId: "study", x: 80, y: 59, gainMult: 1.4, cooldown: 1.0 }
    ]
  },
  {
    title: "Medieval Stronghold",
    caption: "Guild labor and scholarship push productivity.",
    hotspots: [
      { id: "market-yard", label: "Market Yard", actionId: "scavenge", x: 21, y: 62, gainMult: 1.55, cooldown: 0.8 },
      { id: "guild-desk", label: "Guild Desk", actionId: "draft", x: 49, y: 47, gainMult: 1.45, cooldown: 0.95 },
      { id: "scriptorium", label: "Scriptorium", actionId: "study", x: 77, y: 62, gainMult: 1.45, cooldown: 0.95 }
    ]
  },
  {
    title: "Industrial Metropolis",
    caption: "Mechanized systems generate massive output.",
    hotspots: [
      { id: "rail-yard", label: "Rail Yard", actionId: "scavenge", x: 19, y: 63, gainMult: 1.6, cooldown: 0.75 },
      { id: "power-floor", label: "Power Floor", actionId: "generator", x: 49, y: 49, gainMult: 1.4, cooldown: 0.95 },
      { id: "design-office", label: "Design Office", actionId: "draft", x: 79, y: 59, gainMult: 1.48, cooldown: 0.95 }
    ]
  },
  {
    title: "Connected Megacity",
    caption: "Networks and automation accelerate growth.",
    hotspots: [
      { id: "grid-hub", label: "Grid Hub", actionId: "generator", x: 19, y: 58, gainMult: 1.5, cooldown: 0.8 },
      { id: "compute-cluster", label: "Compute Cluster", actionId: "mine-data", x: 50, y: 46, gainMult: 1.5, cooldown: 0.9 },
      { id: "innovation-lab", label: "Innovation Lab", actionId: "draft", x: 79, y: 59, gainMult: 1.55, cooldown: 0.88 }
    ]
  },
  {
    title: "Orbital Civilization",
    caption: "Quantum planning and fusion grids reshape society.",
    hotspots: [
      { id: "fusion-array", label: "Fusion Array", actionId: "generator", x: 19, y: 58, gainMult: 1.65, cooldown: 0.72 },
      { id: "quantum-net", label: "Quantum Net", actionId: "mine-data", x: 50, y: 45, gainMult: 1.65, cooldown: 0.82 },
      { id: "nano-command", label: "Nano Command", actionId: "draft", x: 79, y: 58, gainMult: 1.65, cooldown: 0.82 }
    ]
  }
];

const BUILDINGS = [
  {
    id: "hearth",
    name: "Hearth Camp",
    unlockAge: 0,
    description: "Families produce food reliably.",
    baseCost: { food: 24, materials: 18 },
    costScale: 1.15,
    produces: { food: 1.1 }
  },
  {
    id: "stoneworks",
    name: "Stoneworks",
    unlockAge: 0,
    description: "Extract and process materials.",
    baseCost: { food: 28, materials: 25 },
    costScale: 1.15,
    produces: { materials: 0.95 }
  },
  {
    id: "council-fire",
    name: "Council Fire",
    unlockAge: 0,
    description: "Elders produce shared knowledge.",
    baseCost: { food: 34, materials: 30, knowledge: 18 },
    costScale: 1.16,
    produces: { knowledge: 0.23 },
    consumes: { food: 0.34 }
  },
  {
    id: "smelter",
    name: "Smelter Yard",
    unlockAge: 1,
    description: "Turn ore into useful materials.",
    baseCost: { food: 72, materials: 140, knowledge: 40 },
    costScale: 1.16,
    produces: { materials: 1.85, knowledge: 0.14 },
    consumes: { food: 0.2 }
  },
  {
    id: "academy",
    name: "Academy",
    unlockAge: 2,
    description: "Formal education increases knowledge.",
    baseCost: { food: 150, materials: 270, knowledge: 120 },
    costScale: 1.16,
    produces: { knowledge: 0.9 },
    consumes: { food: 0.4 }
  },
  {
    id: "guild",
    name: "Guild Hall",
    unlockAge: 3,
    description: "Specialists organize material output.",
    baseCost: { food: 340, materials: 500, knowledge: 290 },
    costScale: 1.16,
    produces: { materials: 2.45, knowledge: 0.35 },
    consumes: { food: 0.65 }
  },
  {
    id: "steam-plant",
    name: "Steam Plant",
    unlockAge: 4,
    description: "Converts materials into power.",
    baseCost: { food: 560, materials: 1000, knowledge: 760 },
    costScale: 1.17,
    produces: { power: 2.5 },
    consumes: { materials: 0.9, food: 0.3 }
  },
  {
    id: "factory",
    name: "Factory",
    unlockAge: 4,
    description: "High throughput material production.",
    baseCost: { food: 500, materials: 1300, knowledge: 900, power: 130 },
    costScale: 1.17,
    produces: { materials: 4.3 },
    consumes: { power: 1.1 }
  },
  {
    id: "lab",
    name: "Research Lab",
    unlockAge: 5,
    description: "Scientific acceleration.",
    baseCost: { food: 950, materials: 2300, knowledge: 1900, power: 340 },
    costScale: 1.17,
    produces: { knowledge: 2.45, data: 0.52 },
    consumes: { power: 1.6 }
  },
  {
    id: "data-center",
    name: "Data Center",
    unlockAge: 5,
    description: "Scales data operations.",
    baseCost: { food: 1250, materials: 3300, knowledge: 2500, power: 840 },
    costScale: 1.17,
    produces: { data: 2.6 },
    consumes: { power: 2.2, materials: 0.82 }
  },
  {
    id: "fusion-core",
    name: "Fusion Core",
    unlockAge: 6,
    description: "Dense clean power generation.",
    baseCost: { food: 2200, materials: 6200, knowledge: 6400, data: 900 },
    costScale: 1.18,
    produces: { power: 8.2, data: 0.7 },
    consumes: { materials: 1.4 }
  },
  {
    id: "nanoforge",
    name: "Nanoforge",
    unlockAge: 6,
    description: "Atomic-level manufacturing.",
    baseCost: { food: 2600, materials: 8200, knowledge: 8700, data: 1450 },
    costScale: 1.18,
    produces: { materials: 9.3, knowledge: 1.55, data: 1.85 },
    consumes: { power: 3.8 }
  },
  {
    id: "quantum-archive",
    name: "Quantum Archive",
    unlockAge: 6,
    description: "Massive simulation and cognition stack.",
    baseCost: { food: 3200, materials: 10200, knowledge: 12400, data: 2600 },
    costScale: 1.18,
    produces: { knowledge: 6.2, data: 4.25 },
    consumes: { power: 4.6, materials: 1.5 }
  }
];

const UPGRADES = [
  {
    id: "flint-tools",
    unlockAge: 0,
    name: "Flint Tools",
    description: "Manual foraging and gathering are stronger.",
    cost: { food: 90, materials: 95, knowledge: 55 },
    manualMult: { food: 1.6, materials: 1.6 }
  },
  {
    id: "seed-selection",
    unlockAge: 1,
    name: "Seed Selection",
    description: "Food production scales up.",
    cost: { food: 280, materials: 260, knowledge: 170 },
    resourceMult: { food: 1.55 }
  },
  {
    id: "bronze-craft",
    unlockAge: 1,
    name: "Bronze Craft",
    description: "Smelters become substantially better.",
    cost: { food: 360, materials: 540, knowledge: 260 },
    buildingOutputMult: { smelter: 1.8 }
  },
  {
    id: "natural-philosophy",
    unlockAge: 2,
    name: "Natural Philosophy",
    description: "Boosts manual and passive knowledge generation.",
    cost: { food: 650, materials: 820, knowledge: 620 },
    manualMult: { knowledge: 2 },
    resourceMult: { knowledge: 1.25 }
  },
  {
    id: "masonry",
    unlockAge: 3,
    name: "Advanced Masonry",
    description: "Improves construction throughput.",
    cost: { food: 1800, materials: 2400, knowledge: 1400 },
    resourceMult: { materials: 1.45 }
  },
  {
    id: "merchant-ledgers",
    unlockAge: 3,
    name: "Merchant Ledgers",
    description: "Guild management efficiency rises.",
    cost: { food: 1700, materials: 2100, knowledge: 1500 },
    buildingOutputMult: { guild: 1.6 }
  },
  {
    id: "steam-turbines",
    unlockAge: 4,
    name: "Steam Turbines",
    description: "Power infrastructure doubles output.",
    cost: { food: 3700, materials: 6400, knowledge: 4200, power: 900 },
    buildingOutputMult: { "steam-plant": 2 },
    resourceMult: { power: 1.2 }
  },
  {
    id: "electrified-grid",
    unlockAge: 4,
    name: "Electrified Grid",
    description: "Late buildings need less power.",
    cost: { food: 4200, materials: 7100, knowledge: 4900, power: 1300 },
    buildingConsumeMult: { factory: 0.72, lab: 0.85, "data-center": 0.85 }
  },
  {
    id: "internet-age",
    unlockAge: 5,
    name: "Internet Age",
    description: "Data output surges globally.",
    cost: { food: 7400, materials: 12000, knowledge: 8400, power: 4200 },
    resourceMult: { data: 1.9 }
  },
  {
    id: "ai-research",
    unlockAge: 5,
    name: "AI Research Assistants",
    description: "Labs and archives generate much more knowledge.",
    cost: { food: 9400, materials: 14000, knowledge: 10200, power: 6200, data: 850 },
    buildingOutputMult: { lab: 1.9, "quantum-archive": 1.35 }
  },
  {
    id: "fusion-theory",
    unlockAge: 6,
    name: "Fusion Theory",
    description: "Futuristic power and fabrication rise.",
    cost: { food: 16000, materials: 28000, knowledge: 22000, power: 14000, data: 6400 },
    buildingOutputMult: { "fusion-core": 2, nanoforge: 1.35 }
  },
  {
    id: "nanite-swarm",
    unlockAge: 6,
    name: "Nanite Swarm",
    description: "Entire economy receives a multiplicative boost.",
    cost: { food: 22000, materials: 36000, knowledge: 32000, power: 21000, data: 12000 },
    globalOutputMult: 1.35
  }
];

const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((building) => [building.id, building]));
const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade]));
const MANUAL_ACTION_BY_ID = Object.fromEntries(MANUAL_ACTIONS.map((action) => [action.id, action]));

const INITIAL_RESOURCES = {
  food: 40,
  materials: 30,
  knowledge: 0,
  power: 0,
  data: 0
};

let state = createInitialState();
let statusTimer;
let lastFrame = performance.now();
let simulationAccumulator = 0;
let renderAccumulator = 0;
let autosaveAccumulator = 0;
let heavyAccumulator = 0;
let lastRenderedAge = -1;
const sceneCooldownUntil = {};
let uiDirty = true;
let frameCache = null;
let saveDirty = false;
let latestAutoSaveAt = 0;

const numberFormatCache = new Map();
const stringFormatCache = new Map();
const MAX_FORMAT_CACHE_ENTRIES = 2000;

const SIMULATION_STEP = 0.05;
const MAX_SIMULATION_CATCHUP = 0.4;
const DYNAMIC_RENDER_INTERVAL = 1 / 30;
const HEAVY_RENDER_INTERVAL = 0.4;
const AUTOSAVE_INTERVAL = 15;

const perfStats = {
  enabled: false,
  panel: null,
  frames: 0,
  dynamicMs: 0,
  heavyMs: 0,
  simMs: 0,
  simSteps: 0,
  lastReportAt: performance.now()
};

const resourceGrid = document.getElementById("resource-grid");
const actionsList = document.getElementById("actions-list");
const buildingsList = document.getElementById("buildings-list");
const upgradesList = document.getElementById("upgrades-list");
const timelineList = document.getElementById("timeline-list");
const eventLog = document.getElementById("event-log");
const ageName = document.getElementById("age-name");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const goalText = document.getElementById("goal-text");
const worldTitle = document.getElementById("world-title");
const worldCaption = document.getElementById("world-caption");
const worldScene = document.getElementById("world-scene");
const worldStatus = document.getElementById("world-status");
const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");
const saveStatus = document.getElementById("save-status");
const victoryBanner = document.getElementById("victory-banner");
const dismissVictory = document.getElementById("dismiss-victory");

const viewCache = {
  keys: {
    resources: "",
    actions: "",
    buildings: "",
    upgrades: "",
    scene: "",
    timeline: ""
  },
  resources: new Map(),
  actions: new Map(),
  buildings: new Map(),
  upgrades: new Map(),
  hotspots: new Map()
};

function createInitialState() {
  const buildings = {};
  for (const building of BUILDINGS) {
    buildings[building.id] = 0;
  }

  return {
    resources: { ...INITIAL_RESOURCES },
    lifetime: { food: 0, materials: 0, knowledge: 0, power: 0, data: 0 },
    buildings,
    upgrades: [],
    ageIndex: 0,
    logs: [],
    victoryDismissed: false
  };
}

function invalidateFrameCache() {
  frameCache = null;
}

function markStateDirty(options = {}) {
  const withUI = options.ui !== false;
  saveDirty = true;
  invalidateFrameCache();
  if (withUI) {
    uiDirty = true;
  }
}

function ensureFormatCacheCapacity() {
  if (numberFormatCache.size > MAX_FORMAT_CACHE_ENTRIES) {
    numberFormatCache.clear();
  }
  if (stringFormatCache.size > MAX_FORMAT_CACHE_ENTRIES) {
    stringFormatCache.clear();
  }
}

function ensurePerfPanel() {
  if (perfStats.panel) {
    return perfStats.panel;
  }

  const panel = document.createElement("div");
  panel.id = "perf-hud";
  panel.style.position = "fixed";
  panel.style.right = "10px";
  panel.style.bottom = "10px";
  panel.style.zIndex = "1000";
  panel.style.padding = "8px 10px";
  panel.style.borderRadius = "10px";
  panel.style.border = "1px solid rgba(31,42,44,0.24)";
  panel.style.background = "rgba(252,250,244,0.92)";
  panel.style.font = "12px/1.35 Space Grotesk, Trebuchet MS, sans-serif";
  panel.style.color = "#1f2a2c";
  panel.style.whiteSpace = "pre";
  panel.style.pointerEvents = "none";
  panel.style.display = "none";
  document.body.appendChild(panel);
  perfStats.panel = panel;
  return panel;
}

function setPerfHudEnabled(enabled) {
  perfStats.enabled = enabled;
  const panel = ensurePerfPanel();
  panel.style.display = enabled ? "block" : "none";
}

function updatePerfStats(timestamp) {
  if (timestamp - perfStats.lastReportAt < 1000) {
    return;
  }

  const elapsed = (timestamp - perfStats.lastReportAt) / 1000;
  const fps = perfStats.frames / elapsed;
  const avgDynamic = perfStats.frames ? perfStats.dynamicMs / perfStats.frames : 0;
  const avgHeavy = perfStats.frames ? perfStats.heavyMs / perfStats.frames : 0;
  const avgSim = perfStats.simSteps ? perfStats.simMs / perfStats.simSteps : 0;
  const panel = ensurePerfPanel();

  if (perfStats.enabled) {
    const sinceSave = latestAutoSaveAt ? ((performance.now() - latestAutoSaveAt) / 1000).toFixed(1) : "-";
    panel.textContent =
      `FPS ${fps.toFixed(1)}\n` +
      `dyn ${avgDynamic.toFixed(2)}ms\n` +
      `heavy ${avgHeavy.toFixed(2)}ms\n` +
      `sim ${avgSim.toFixed(2)}ms\n` +
      `dirty ${saveDirty ? "yes" : "no"}\n` +
      `saved ${sinceSave}s`;
  }

  perfStats.frames = 0;
  perfStats.dynamicMs = 0;
  perfStats.heavyMs = 0;
  perfStats.simMs = 0;
  perfStats.simSteps = 0;
  perfStats.lastReportAt = timestamp;
}

function buildVisibleActions(ageIndex = state.ageIndex) {
  return MANUAL_ACTIONS.filter((action) => isActionVisible(action, ageIndex));
}

function buildVisibleBuildings(ageIndex = state.ageIndex) {
  return BUILDINGS.filter((building) => ageIndex >= building.unlockAge);
}

function buildVisibleResources(ageIndex = state.ageIndex) {
  return RESOURCE_ORDER.filter((resource) => ageIndex >= RESOURCES[resource].unlockAge);
}

function buildAvailableUpgrades(ageIndex = state.ageIndex, owned = state.upgrades) {
  const ownedSet = new Set(owned);
  return UPGRADES.filter((upgrade) => ageIndex >= upgrade.unlockAge && !ownedSet.has(upgrade.id));
}

function createEmptyRates() {
  const rates = {};
  for (const resource of RESOURCE_ORDER) {
    rates[resource] = 0;
  }
  return rates;
}

function mapAllResources(initialValue) {
  const map = {};
  for (const key of RESOURCE_ORDER) {
    map[key] = initialValue;
  }
  return map;
}

function isActionVisible(action, ageIndex = state.ageIndex) {
  if (ageIndex < action.unlockAge) {
    return false;
  }
  if (action.retireAge !== undefined && ageIndex > action.retireAge) {
    return false;
  }
  return true;
}

function getManualGain(action, gainMult = 1, mods = null) {
  const useMods = mods || ensureFrameCache().mods;
  const ageManualBonus = 1 + state.ageIndex * 0.04;
  return action.gain * (useMods.manualMult[action.resource] || 1) * ageManualBonus * gainMult;
}

function getCurrentScene() {
  return AGE_SCENES[Math.min(state.ageIndex, AGE_SCENES.length - 1)];
}

function getHotspotCooldownRemaining(hotspotId) {
  const remaining = (sceneCooldownUntil[hotspotId] || 0) - performance.now();
  return Math.max(0, remaining / 1000);
}

function getModifiers() {
  const mods = {
    resourceMult: mapAllResources(1),
    manualMult: mapAllResources(1),
    buildingOutputMult: {},
    buildingConsumeMult: {},
    globalOutputMult: 1 + state.ageIndex * 0.08
  };

  for (const upgradeId of state.upgrades) {
    const upgrade = UPGRADE_BY_ID[upgradeId];
    if (!upgrade) {
      continue;
    }

    multiplyInto(mods.resourceMult, upgrade.resourceMult);
    multiplyInto(mods.manualMult, upgrade.manualMult);

    if (upgrade.buildingOutputMult) {
      for (const [buildingId, mult] of Object.entries(upgrade.buildingOutputMult)) {
        mods.buildingOutputMult[buildingId] = (mods.buildingOutputMult[buildingId] || 1) * mult;
      }
    }

    if (upgrade.buildingConsumeMult) {
      for (const [buildingId, mult] of Object.entries(upgrade.buildingConsumeMult)) {
        mods.buildingConsumeMult[buildingId] = (mods.buildingConsumeMult[buildingId] || 1) * mult;
      }
    }

    if (upgrade.globalOutputMult) {
      mods.globalOutputMult *= upgrade.globalOutputMult;
    }
  }

  return mods;
}

function calculateRatesPerSecond(mods) {
  const preview = { ...state.resources };
  const before = { ...preview };
  runProductionStep(1, preview, null, mods);

  const rates = createEmptyRates();
  for (const resource of RESOURCE_ORDER) {
    rates[resource] = (preview[resource] || 0) - (before[resource] || 0);
  }
  return rates;
}

function ensureFrameCache() {
  if (frameCache) {
    return frameCache;
  }

  const mods = getModifiers();
  const rates = calculateRatesPerSecond(mods);
  const visibleActions = buildVisibleActions();
  const visibleBuildings = buildVisibleBuildings();
  const visibleResources = buildVisibleResources();
  const availableUpgrades = buildAvailableUpgrades();

  const actionGains = {};
  for (const action of visibleActions) {
    actionGains[action.id] = getManualGain(action, 1, mods);
  }

  frameCache = {
    mods,
    rates,
    visibleActions,
    visibleBuildings,
    visibleResources,
    availableUpgrades,
    actionGains
  };

  return frameCache;
}

function multiplyInto(target, changes) {
  if (!changes) {
    return;
  }
  for (const [key, value] of Object.entries(changes)) {
    target[key] = (target[key] || 1) * value;
  }
}

function calculateBuildingCost(building) {
  const count = state.buildings[building.id];
  const costs = {};

  for (const [resource, baseValue] of Object.entries(building.baseCost)) {
    const scaled = baseValue * Math.pow(building.costScale, count);
    costs[resource] = Math.ceil(scaled);
  }

  return costs;
}

function canAfford(costs) {
  for (const [resource, amount] of Object.entries(costs || {})) {
    if ((state.resources[resource] || 0) < amount) {
      return false;
    }
  }
  return true;
}

function applyCosts(costs) {
  for (const [resource, amount] of Object.entries(costs || {})) {
    state.resources[resource] = Math.max(0, state.resources[resource] - amount);
  }
}

function addLog(message, options = {}) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  state.logs.unshift({ time, message });
  if (state.logs.length > 36) {
    state.logs.length = 36;
  }
  if (options.persist !== false) {
    saveDirty = true;
  }
  uiDirty = true;
}

function getRequirementProgress(targetRequirements) {
  const entries = Object.entries(targetRequirements || {});
  if (!entries.length) {
    return 1;
  }

  let total = 0;
  for (const [resource, amount] of entries) {
    total += Math.min(1, (state.lifetime[resource] || 0) / amount);
  }
  return total / entries.length;
}

function requirementsMet(targetRequirements) {
  for (const [resource, amount] of Object.entries(targetRequirements || {})) {
    if ((state.lifetime[resource] || 0) < amount) {
      return false;
    }
  }
  return true;
}

function unlockAges() {
  while (state.ageIndex < AGES.length - 1) {
    const nextAge = AGES[state.ageIndex + 1];
    if (!requirementsMet(nextAge.requirements)) {
      break;
    }

    state.ageIndex += 1;
    addLog(`${AGES[state.ageIndex].name} unlocked.`);
    applyAgeReward(AGES[state.ageIndex].reward);
    flashStatus(`${AGES[state.ageIndex].name} reached.`);
    markStateDirty();
  }
}

function applyAgeReward(reward) {
  for (const [resource, amount] of Object.entries(reward || {})) {
    state.resources[resource] = (state.resources[resource] || 0) + amount;
  }
  markStateDirty({ ui: false });
}

function checkVictory() {
  if (state.ageIndex !== AGES.length - 1) {
    return false;
  }
  return requirementsMet(VICTORY_TARGET);
}

function runProductionStep(dt, resourcesRef, lifetimeRef, mods = null) {
  const useMods = mods || getModifiers();

  for (const building of BUILDINGS) {
    if (state.ageIndex < building.unlockAge) {
      continue;
    }

    const count = state.buildings[building.id];
    if (!count) {
      continue;
    }

    const consumeMult = useMods.buildingConsumeMult[building.id] || 1;
    let utilization = 1;

    for (const [resource, ratePerSecond] of Object.entries(building.consumes || {})) {
      const need = ratePerSecond * count * dt * consumeMult;
      if (need <= 0) {
        continue;
      }
      utilization = Math.min(utilization, resourcesRef[resource] / need);
    }

    utilization = Math.max(0, Math.min(1, utilization));
    if (utilization <= 0) {
      continue;
    }

    for (const [resource, ratePerSecond] of Object.entries(building.consumes || {})) {
      const need = ratePerSecond * count * dt * consumeMult * utilization;
      resourcesRef[resource] = Math.max(0, resourcesRef[resource] - need);
    }

    for (const [resource, ratePerSecond] of Object.entries(building.produces || {})) {
      const buildingMult = useMods.buildingOutputMult[building.id] || 1;
      const gain =
        ratePerSecond *
        count *
        dt *
        useMods.globalOutputMult *
        buildingMult *
        (useMods.resourceMult[resource] || 1) *
        utilization;

      resourcesRef[resource] = (resourcesRef[resource] || 0) + gain;
      if (lifetimeRef) {
        lifetimeRef[resource] = (lifetimeRef[resource] || 0) + gain;
      }
    }
  }
}

function tick(dt) {
  const beforeAge = state.ageIndex;
  const beforeResources = {};
  const beforeLifetime = {};
  for (const resource of RESOURCE_ORDER) {
    beforeResources[resource] = state.resources[resource];
    beforeLifetime[resource] = state.lifetime[resource];
  }

  const mods = getModifiers();
  runProductionStep(dt, state.resources, state.lifetime, mods);
  unlockAges();
  let changed = beforeAge !== state.ageIndex;
  if (!changed) {
    for (const resource of RESOURCE_ORDER) {
      if (
        state.resources[resource] !== beforeResources[resource] ||
        state.lifetime[resource] !== beforeLifetime[resource]
      ) {
        changed = true;
        break;
      }
    }
  }
  if (changed) {
    markStateDirty({ ui: false });
  }

  if (checkVictory() && !state.victoryDismissed) {
    victoryBanner.classList.remove("hidden");
  }
}

function manualAction(actionId, options = {}) {
  const action = MANUAL_ACTION_BY_ID[actionId];
  if (!action || !isActionVisible(action)) {
    return { success: false };
  }

  if (!canAfford(action.costs || {})) {
    if (!options.silentFail) {
      flashStatus("Not enough resources.");
    }
    return { success: false };
  }

  const gain = getManualGain(action, options.gainMult || 1);

  applyCosts(action.costs || {});
  state.resources[action.resource] = (state.resources[action.resource] || 0) + gain;
  state.lifetime[action.resource] = (state.lifetime[action.resource] || 0) + gain;
  markStateDirty({ ui: false });
  return { success: true, gain, resource: action.resource };
}

function buyBuilding(buildingId) {
  const building = BUILDING_BY_ID[buildingId];
  if (!building || state.ageIndex < building.unlockAge) {
    return;
  }

  const cost = calculateBuildingCost(building);
  if (!canAfford(cost)) {
    flashStatus("Not enough resources.");
    return;
  }

  applyCosts(cost);
  state.buildings[building.id] += 1;
  addLog(`${building.name} built (${state.buildings[building.id]}).`);
  markStateDirty();
}

function buyUpgrade(upgradeId) {
  const upgrade = UPGRADE_BY_ID[upgradeId];
  if (!upgrade || state.ageIndex < upgrade.unlockAge || state.upgrades.includes(upgrade.id)) {
    return;
  }

  if (!canAfford(upgrade.cost)) {
    flashStatus("Not enough resources.");
    return;
  }

  applyCosts(upgrade.cost);
  state.upgrades.push(upgrade.id);
  addLog(`Upgrade complete: ${upgrade.name}.`);
  markStateDirty();
}

function triggerSceneHotspot(hotspotId) {
  const scene = getCurrentScene();
  const hotspot = scene.hotspots.find((item) => item.id === hotspotId);
  if (!hotspot) {
    return;
  }

  if (getHotspotCooldownRemaining(hotspot.id) > 0) {
    return;
  }

  const result = manualAction(hotspot.actionId, { gainMult: hotspot.gainMult, silentFail: true });
  if (!result.success) {
    flashStatus("Hotspot unavailable: missing input resources.");
    return;
  }

  sceneCooldownUntil[hotspot.id] = performance.now() + hotspot.cooldown * 1000;

  const bonusChance = 0.1 + state.ageIndex * 0.02;
  if (Math.random() < bonusChance) {
    const bonus = Math.max(1, result.gain * 0.6);
    state.resources[result.resource] += bonus;
    state.lifetime[result.resource] += bonus;
    markStateDirty({ ui: false });
    addLog(`${hotspot.label} discovery: +${formatNumber(bonus)} ${RESOURCES[result.resource].label}.`);
    worldStatus.textContent = `Discovery at ${hotspot.label}: +${formatNumber(bonus)} ${RESOURCES[result.resource].label}`;
  } else {
    worldStatus.textContent =
      `${hotspot.label}: +${formatNumber(result.gain)} ${RESOURCES[result.resource].label}`;
  }
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs < 1000) {
    const small = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
    const cacheKey = `s:${sign}${small}`;
    if (numberFormatCache.has(cacheKey)) {
      return numberFormatCache.get(cacheKey);
    }

    const formatted = sign + Number(small).toLocaleString();
    numberFormatCache.set(cacheKey, formatted);
    ensureFormatCacheCapacity();
    return formatted;
  }

  const suffixes = ["K", "M", "B", "T", "Qa"];
  let unitIndex = -1;
  let display = abs;
  while (display >= 1000 && unitIndex < suffixes.length - 1) {
    display /= 1000;
    unitIndex += 1;
  }

  const compact = display.toFixed(display >= 100 ? 0 : 1);
  const cacheKey = `l:${sign}${compact}${suffixes[unitIndex]}`;
  if (numberFormatCache.has(cacheKey)) {
    return numberFormatCache.get(cacheKey);
  }

  const formatted = `${sign}${compact}${suffixes[unitIndex]}`;
  numberFormatCache.set(cacheKey, formatted);
  ensureFormatCacheCapacity();
  return formatted;
}

function formatCosts(costs) {
  let key = "c:";
  for (const resource of RESOURCE_ORDER) {
    const amount = costs?.[resource] || 0;
    if (amount) {
      key += `${resource}:${amount};`;
    }
  }

  if (stringFormatCache.has(key)) {
    return stringFormatCache.get(key);
  }

  const entries = [];
  for (const resource of RESOURCE_ORDER) {
    const amount = costs?.[resource];
    if (amount) {
      entries.push(`${formatNumber(amount)} ${RESOURCES[resource].label}`);
    }
  }
  const result = entries.join(" | ");
  stringFormatCache.set(key, result);
  ensureFormatCacheCapacity();
  return result;
}

function formatPerSecond(value) {
  const cacheKey = `ps:${value}`;
  if (stringFormatCache.has(cacheKey)) {
    return stringFormatCache.get(cacheKey);
  }

  const sign = value >= 0 ? "+" : "";
  const result = `${sign}${formatNumber(value)}/s`;
  stringFormatCache.set(cacheKey, result);
  ensureFormatCacheCapacity();
  return result;
}

function renderHeader() {
  const currentAge = AGES[state.ageIndex];
  ageName.textContent = currentAge.name;
  document.body.dataset.age = String(state.ageIndex);

  if (state.ageIndex >= AGES.length - 1) {
    progressFill.style.width = "100%";
    progressText.textContent = "100%";
    goalText.textContent = "Final age reached. Push for post-scarcity targets.";
    return;
  }

  const nextAge = AGES[state.ageIndex + 1];
  const progress = getRequirementProgress(nextAge.requirements);
  progressFill.style.width = `${(progress * 100).toFixed(1)}%`;
  progressText.textContent = `${(progress * 100).toFixed(0)}%`;

  const parts = [];
  for (const [resource, amount] of Object.entries(nextAge.requirements)) {
    const have = state.lifetime[resource] || 0;
    parts.push(`${RESOURCES[resource].label} ${formatNumber(have)}/${formatNumber(amount)}`);
  }
  goalText.textContent = `Unlock ${nextAge.name}: ${parts.join(" | ")}`;
}

function renderResources(frame) {
  const resourcesKey = frame.visibleResources.join("|");
  if (viewCache.keys.resources !== resourcesKey) {
    viewCache.keys.resources = resourcesKey;
    viewCache.resources.clear();
    resourceGrid.textContent = "";

    const fragment = document.createDocumentFragment();
    for (const resource of frame.visibleResources) {
      const card = document.createElement("article");
      card.className = "resource-card";

      const head = document.createElement("div");
      head.className = "resource-head";

      const name = document.createElement("span");
      name.className = "resource-name";
      name.textContent = RESOURCES[resource].label;

      const value = document.createElement("span");
      value.className = "resource-value";

      head.append(name, value);

      const rate = document.createElement("p");
      rate.className = "resource-rate";

      card.append(head, rate);
      fragment.appendChild(card);
      viewCache.resources.set(resource, { value, rate });
    }

    resourceGrid.appendChild(fragment);
  }

  for (const resource of frame.visibleResources) {
    const refs = viewCache.resources.get(resource);
    if (!refs) {
      continue;
    }

    refs.value.textContent = formatNumber(state.resources[resource]);
    refs.rate.textContent = formatPerSecond(frame.rates[resource] || 0);
  }
}

function renderActions(frame) {
  const actionsKey = frame.visibleActions.map((action) => action.id).join("|");
  if (viewCache.keys.actions !== actionsKey) {
    viewCache.keys.actions = actionsKey;
    viewCache.actions.clear();
    actionsList.textContent = "";

    const fragment = document.createDocumentFragment();
    for (const action of frame.visibleActions) {
      const button = document.createElement("button");
      button.dataset.action = action.id;
      fragment.appendChild(button);
      viewCache.actions.set(action.id, { button, action });
    }

    actionsList.appendChild(fragment);
  }

  for (const action of frame.visibleActions) {
    const refs = viewCache.actions.get(action.id);
    if (!refs) {
      continue;
    }

    const gain = frame.actionGains[action.id] || 0;
    const costsText = action.costs ? ` | Cost: ${formatCosts(action.costs)}` : "";
    refs.button.textContent =
      `${action.label}: +${formatNumber(gain)} ${RESOURCES[action.resource].label}${costsText}`;
    refs.button.disabled = !canAfford(action.costs || {});
  }
}

function describeBuildingRates(building, mods) {
  const buildMult = mods.buildingOutputMult[building.id] || 1;
  const consumeMult = mods.buildingConsumeMult[building.id] || 1;

  const produces = Object.entries(building.produces || {})
    .map(([resource, value]) => {
      const out = value * mods.globalOutputMult * (mods.resourceMult[resource] || 1) * buildMult;
      return `+${formatNumber(out)} ${RESOURCES[resource].label}/s`;
    })
    .join(" | ");

  const consumes = Object.entries(building.consumes || {})
    .map(([resource, value]) => {
      const use = value * consumeMult;
      return `-${formatNumber(use)} ${RESOURCES[resource].label}/s`;
    })
    .join(" | ");

  return consumes ? `${produces} (${consumes})` : produces;
}

function renderBuildings(frame) {
  const buildingsKey = frame.visibleBuildings.map((building) => building.id).join("|");
  if (viewCache.keys.buildings !== buildingsKey) {
    viewCache.keys.buildings = buildingsKey;
    viewCache.buildings.clear();
    buildingsList.textContent = "";

    if (!frame.visibleBuildings.length) {
      const empty = document.createElement("p");
      empty.className = "meta";
      empty.textContent = "No buildings yet.";
      buildingsList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const building of frame.visibleBuildings) {
      const card = document.createElement("article");
      card.className = "card";

      const top = document.createElement("div");
      top.className = "card-top";
      const title = document.createElement("h3");
      title.textContent = building.name;
      const count = document.createElement("p");
      top.append(title, count);

      const desc = document.createElement("p");
      desc.textContent = building.description;

      const rates = document.createElement("p");
      rates.className = "meta";

      const costs = document.createElement("p");
      costs.className = "meta";

      const button = document.createElement("button");
      button.dataset.build = building.id;
      button.textContent = "Build";

      card.append(top, desc, rates, costs, button);
      fragment.appendChild(card);
      viewCache.buildings.set(building.id, { count, rates, costs, button, building });
    }

    buildingsList.appendChild(fragment);
  }

  for (const building of frame.visibleBuildings) {
    const refs = viewCache.buildings.get(building.id);
    if (!refs) {
      continue;
    }

    const cost = calculateBuildingCost(building);
    refs.count.textContent = `x${state.buildings[building.id]}`;
    refs.rates.textContent = describeBuildingRates(building, frame.mods);
    refs.costs.textContent = `Cost: ${formatCosts(cost)}`;
    refs.button.disabled = !canAfford(cost);
  }
}

function renderUpgrades(frame) {
  const upgradesKey = frame.availableUpgrades.map((upgrade) => upgrade.id).join("|");
  if (viewCache.keys.upgrades !== upgradesKey) {
    viewCache.keys.upgrades = upgradesKey;
    viewCache.upgrades.clear();
    upgradesList.textContent = "";

    if (!frame.availableUpgrades.length) {
      const empty = document.createElement("p");
      empty.className = "meta";
      empty.textContent = "No available upgrades in this age.";
      upgradesList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const upgrade of frame.availableUpgrades) {
      const card = document.createElement("article");
      card.className = "card";

      const top = document.createElement("div");
      top.className = "card-top";
      const title = document.createElement("h3");
      title.textContent = upgrade.name;
      top.appendChild(title);

      const desc = document.createElement("p");
      desc.textContent = upgrade.description;

      const cost = document.createElement("p");
      cost.className = "meta";

      const button = document.createElement("button");
      button.dataset.upgrade = upgrade.id;
      button.textContent = "Research";

      card.append(top, desc, cost, button);
      fragment.appendChild(card);
      viewCache.upgrades.set(upgrade.id, { cost, button, upgrade });
    }

    upgradesList.appendChild(fragment);
  }

  for (const upgrade of frame.availableUpgrades) {
    const refs = viewCache.upgrades.get(upgrade.id);
    if (!refs) {
      continue;
    }

    refs.cost.textContent = `Cost: ${formatCosts(upgrade.cost)}`;
    refs.button.disabled = !canAfford(upgrade.cost);
  }
}

function renderWorldScene(frame) {
  const scene = getCurrentScene();
  worldTitle.textContent = scene.title;
  worldCaption.textContent = scene.caption;
  worldScene.className = `world-scene theme-${state.ageIndex}`;

  if (lastRenderedAge !== state.ageIndex) {
    worldStatus.textContent = `${AGES[state.ageIndex].name}: hotspots grant boosted manual gains.`;
    lastRenderedAge = state.ageIndex;
  }

  const visibleHotspots = scene.hotspots.filter((hotspot) => {
    const action = MANUAL_ACTION_BY_ID[hotspot.actionId];
    return action && isActionVisible(action);
  });

  const sceneKey = `${state.ageIndex}|${visibleHotspots.map((hotspot) => hotspot.id).join("|")}`;
  if (viewCache.keys.scene !== sceneKey) {
    viewCache.keys.scene = sceneKey;
    viewCache.hotspots.clear();
    worldScene.textContent = "";

    const fragment = document.createDocumentFragment();
    for (const hotspot of visibleHotspots) {
      const action = MANUAL_ACTION_BY_ID[hotspot.actionId];
      const button = document.createElement("button");
      button.className = "hotspot";
      button.dataset.hotspot = hotspot.id;
      button.style.left = `${hotspot.x}%`;
      button.style.top = `${hotspot.y}%`;

      const name = document.createElement("span");
      name.className = "hotspot-name";
      name.textContent = hotspot.label;

      const actionLabel = document.createElement("span");
      actionLabel.className = "hotspot-meta";
      actionLabel.textContent = action.label;

      const gainLabel = document.createElement("span");
      gainLabel.className = "hotspot-meta";

      button.append(name, actionLabel, gainLabel);
      fragment.appendChild(button);
      viewCache.hotspots.set(hotspot.id, { button, gainLabel, hotspot, action });
    }

    worldScene.appendChild(fragment);
  }

  for (const hotspot of visibleHotspots) {
    const refs = viewCache.hotspots.get(hotspot.id);
    if (!refs) {
      continue;
    }

    const cooldown = getHotspotCooldownRemaining(hotspot.id);
    const gain = getManualGain(refs.action, hotspot.gainMult, frame.mods);
    refs.gainLabel.textContent = cooldown > 0 ? `${cooldown.toFixed(1)}s` : `${formatNumber(gain)} gain`;
    refs.button.disabled = cooldown > 0 || !canAfford(refs.action.costs || {});
    refs.button.classList.toggle("cooldown", cooldown > 0);
  }
}

function renderTimeline() {
  const timelineKey = String(state.ageIndex);
  if (viewCache.keys.timeline === timelineKey) {
    return;
  }

  viewCache.keys.timeline = timelineKey;
  timelineList.textContent = "";
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < AGES.length; index += 1) {
    const age = AGES[index];
    const classes = index < state.ageIndex ? "past" : index === state.ageIndex ? "current" : "future";
    const item = document.createElement("li");
    item.className = classes;

    if (index === 0) {
      item.textContent = age.name;
    } else if (index > state.ageIndex + 1) {
      item.textContent = `${age.name} - ???`;
    } else {
      const req = Object.entries(age.requirements)
        .map(([resource, amount]) => `${RESOURCES[resource].label} ${formatNumber(amount)}`)
        .join(" | ");
      item.textContent = `${age.name} - ${req}`;
    }

    fragment.appendChild(item);
  }

  timelineList.appendChild(fragment);
}

function renderEventLog() {
  if (!state.logs.length) {
    eventLog.innerHTML = "<li>No events yet.</li>";
    return;
  }

  eventLog.innerHTML = state.logs
    .map((entry) => `<li><span class="time">[${entry.time}]</span> ${entry.message}</li>`)
    .join("");
}

function renderDynamic() {
  const frame = ensureFrameCache();
  renderHeader();
  renderResources(frame);
}

function renderHeavy() {
  const frame = ensureFrameCache();
  renderWorldScene(frame);
  renderActions(frame);
  renderBuildings(frame);
  renderUpgrades(frame);
  renderTimeline();
  renderEventLog();
}

function render(forceHeavy = false) {
  const dynamicStart = performance.now();
  renderDynamic();
  perfStats.dynamicMs += performance.now() - dynamicStart;

  if (forceHeavy || uiDirty) {
    const heavyStart = performance.now();
    renderHeavy();
    perfStats.heavyMs += performance.now() - heavyStart;
    uiDirty = false;
  }

  perfStats.frames += 1;
}

function flashStatus(message) {
  clearTimeout(statusTimer);
  saveStatus.textContent = message;
  statusTimer = setTimeout(() => {
    saveStatus.textContent = "Autosave every 15s (dirty only)";
  }, 2200);
}

function migrateSavePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const current = { ...payload };
  const version = Number.isInteger(current.version) ? current.version : 1;

  if (version < 2) {
    if (!Array.isArray(current.logs)) {
      current.logs = [];
    }
    current.victoryDismissed = Boolean(current.victoryDismissed);
    current.version = 2;
  }

  return current;
}

function saveGame(silent = false) {
  const payload = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    resources: state.resources,
    lifetime: state.lifetime,
    buildings: state.buildings,
    upgrades: state.upgrades,
    ageIndex: state.ageIndex,
    logs: state.logs,
    victoryDismissed: state.victoryDismissed
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    saveDirty = false;
    latestAutoSaveAt = performance.now();
    if (!silent) {
      flashStatus("Saved.");
    }
  } catch (error) {
    if (!silent) {
      flashStatus("Save failed.");
    }
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return;
    }

    const parsed = migrateSavePayload(JSON.parse(raw));
    if (!parsed) {
      return;
    }
    const fresh = createInitialState();

    for (const resource of RESOURCE_ORDER) {
      if (typeof parsed.resources?.[resource] === "number") {
        fresh.resources[resource] = parsed.resources[resource];
      }
      if (typeof parsed.lifetime?.[resource] === "number") {
        fresh.lifetime[resource] = parsed.lifetime[resource];
      }
    }

    for (const building of BUILDINGS) {
      const value = parsed.buildings?.[building.id];
      if (Number.isInteger(value) && value >= 0) {
        fresh.buildings[building.id] = value;
      }
    }

    if (Array.isArray(parsed.upgrades)) {
      fresh.upgrades = parsed.upgrades.filter((upgradeId) => Boolean(UPGRADE_BY_ID[upgradeId]));
    }

    if (Number.isInteger(parsed.ageIndex)) {
      fresh.ageIndex = Math.max(0, Math.min(AGES.length - 1, parsed.ageIndex));
    }

    if (Array.isArray(parsed.logs)) {
      fresh.logs = parsed.logs.slice(0, 36);
    }

    fresh.victoryDismissed = Boolean(parsed.victoryDismissed);
    state = fresh;
    lastRenderedAge = -1;
    markStateDirty();
    addLog("Save loaded.", { persist: false });
    saveDirty = false;
    latestAutoSaveAt = performance.now();
  } catch (error) {
    addLog("Save file could not be loaded.", { persist: false });
  }
}

function resetGame() {
  const accepted = window.confirm("Reset all progress for this run?");
  if (!accepted) {
    return;
  }

  localStorage.removeItem(SAVE_KEY);
  state = createInitialState();
  lastRenderedAge = -1;
  markStateDirty();
  addLog("A fresh civilization begins.");
  victoryBanner.classList.add("hidden");
  render();
  flashStatus("Run reset.");
}

function gameLoop(timestamp) {
  const dt = Math.min(MAX_SIMULATION_CATCHUP, (timestamp - lastFrame) / 1000);
  lastFrame = timestamp;

  simulationAccumulator += dt;
  renderAccumulator += dt;
  autosaveAccumulator += dt;
  heavyAccumulator += dt;

  const simStart = performance.now();
  let simSteps = 0;
  while (simulationAccumulator >= SIMULATION_STEP) {
    tick(SIMULATION_STEP);
    simulationAccumulator -= SIMULATION_STEP;
    simSteps += 1;
  }
  if (simSteps > 0) {
    perfStats.simMs += performance.now() - simStart;
    perfStats.simSteps += simSteps;
  }

  if (heavyAccumulator >= HEAVY_RENDER_INTERVAL) {
    uiDirty = true;
    heavyAccumulator = 0;
  }

  if (renderAccumulator >= DYNAMIC_RENDER_INTERVAL) {
    render(false);
    renderAccumulator = 0;
  }

  if (autosaveAccumulator >= AUTOSAVE_INTERVAL) {
    if (saveDirty) {
      saveGame(true);
    }
    autosaveAccumulator = 0;
  }

  updatePerfStats(timestamp);
  requestAnimationFrame(gameLoop);
}

function handleGameplayButtonPress(target) {
  const actionId = target.dataset.action;
  const buildingId = target.dataset.build;
  const upgradeId = target.dataset.upgrade;
  const hotspotId = target.dataset.hotspot;

  if (actionId) {
    manualAction(actionId);
    render(false);
    return true;
  }

  if (hotspotId) {
    triggerSceneHotspot(hotspotId);
    render(false);
    return true;
  }

  if (buildingId) {
    buyBuilding(buildingId);
    render(true);
    return true;
  }

  if (upgradeId) {
    buyUpgrade(upgradeId);
    render(true);
    return true;
  }

  return false;
}

document.addEventListener("pointerdown", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const target = event.target.closest("button");
  if (!target || target.disabled) {
    return;
  }

  const handled = handleGameplayButtonPress(target);
  if (handled) {
    event.preventDefault();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "F3") {
    setPerfHudEnabled(!perfStats.enabled);
    flashStatus(perfStats.enabled ? "Performance HUD enabled." : "Performance HUD disabled.");
    event.preventDefault();
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  if (!(event.target instanceof HTMLButtonElement)) {
    return;
  }

  if (event.target.disabled) {
    return;
  }

  const handled = handleGameplayButtonPress(event.target);
  if (handled) {
    event.preventDefault();
  }
});

saveBtn.addEventListener("click", () => {
  saveGame(false);
});

resetBtn.addEventListener("click", () => {
  resetGame();
});

dismissVictory.addEventListener("click", () => {
  state.victoryDismissed = true;
  victoryBanner.classList.add("hidden");
  markStateDirty({ ui: false });
});

loadGame();
if (!state.logs.length) {
  addLog("The first settlement is founded.");
}
render();
requestAnimationFrame(gameLoop);
