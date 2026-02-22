package com.prebenjor.idleforge.game

import kotlin.math.pow

private fun emptyMapFor(ids: List<String>): Map<String, Int> = ids.associateWith { 0 }

data class ResourceState(
  val metal: Double = 0.0,
  val credits: Double = 0.0,
  val science: Double = 0.0
) {
  operator fun plus(other: ResourceState): ResourceState {
    return ResourceState(
      metal = metal + other.metal,
      credits = credits + other.credits,
      science = science + other.science
    )
  }

  operator fun minus(other: ResourceState): ResourceState {
    return ResourceState(
      metal = (metal - other.metal).coerceAtLeast(0.0),
      credits = (credits - other.credits).coerceAtLeast(0.0),
      science = (science - other.science).coerceAtLeast(0.0)
    )
  }

  fun scale(multiplier: Double): ResourceState {
    return ResourceState(
      metal = metal * multiplier,
      credits = credits * multiplier,
      science = science * multiplier
    )
  }

  fun canAfford(cost: ResourceState): Boolean {
    return metal >= cost.metal && credits >= cost.credits && science >= cost.science
  }
}

data class BuildingDef(
  val id: String,
  val name: String,
  val description: String,
  val baseCost: ResourceState,
  val baseOutputPerSecond: ResourceState
)

data class UpgradeDef(
  val id: String,
  val name: String,
  val description: String,
  val baseCost: ResourceState,
  val maxRank: Int
)

val BUILDINGS = listOf(
  BuildingDef(
    id = "scavenger_drone",
    name = "Scavenger Drone",
    description = "Basic mining unit that steadily harvests raw metal.",
    baseCost = ResourceState(metal = 20.0),
    baseOutputPerSecond = ResourceState(metal = 0.45)
  ),
  BuildingDef(
    id = "smelter_core",
    name = "Smelter Core",
    description = "Refines materials into tradeable credits.",
    baseCost = ResourceState(metal = 120.0, credits = 6.0),
    baseOutputPerSecond = ResourceState(metal = 1.6, credits = 0.24)
  ),
  BuildingDef(
    id = "research_cell",
    name = "Research Cell",
    description = "Converts industrial surplus into science.",
    baseCost = ResourceState(metal = 240.0, credits = 30.0),
    baseOutputPerSecond = ResourceState(science = 0.18)
  )
)

val UPGRADES = listOf(
  UpgradeDef(
    id = "tap_tools",
    name = "Tap Tools",
    description = "+1 metal per manual tap per rank.",
    baseCost = ResourceState(metal = 60.0, science = 2.0),
    maxRank = 12
  ),
  UpgradeDef(
    id = "precision_rigs",
    name = "Precision Rigs",
    description = "+20% global production per rank.",
    baseCost = ResourceState(metal = 140.0, credits = 18.0, science = 8.0),
    maxRank = 10
  ),
  UpgradeDef(
    id = "market_ai",
    name = "Market AI",
    description = "+0.35 credits per tap per rank.",
    baseCost = ResourceState(metal = 200.0, credits = 50.0, science = 12.0),
    maxRank = 8
  )
)

val DEFAULT_BUILDING_LEVELS = emptyMapFor(BUILDINGS.map { it.id })
val DEFAULT_UPGRADE_RANKS = emptyMapFor(UPGRADES.map { it.id })

data class GameUiState(
  val resources: ResourceState = ResourceState(metal = 35.0),
  val tapMetal: Double = 1.0,
  val tapCredits: Double = 0.0,
  val productionMultiplier: Double = 1.0,
  val buildings: Map<String, Int> = DEFAULT_BUILDING_LEVELS,
  val upgrades: Map<String, Int> = DEFAULT_UPGRADE_RANKS,
  val taps: Long = 0,
  val sessionSeconds: Double = 0.0,
  val offlineSecondsApplied: Long = 0,
  val loaded: Boolean = false
)

fun buildingLevel(state: GameUiState, buildingId: String): Int {
  return state.buildings[buildingId] ?: 0
}

fun upgradeRank(state: GameUiState, upgradeId: String): Int {
  return state.upgrades[upgradeId] ?: 0
}

fun buildingCost(def: BuildingDef, currentLevel: Int): ResourceState {
  val scale = 1.18.pow(currentLevel.toDouble())
  return def.baseCost.scale(scale)
}

fun upgradeCost(def: UpgradeDef, currentRank: Int): ResourceState {
  val scale = 1.62.pow(currentRank.toDouble())
  return def.baseCost.scale(scale)
}

fun productionForBuilding(def: BuildingDef, level: Int, multiplier: Double): ResourceState {
  if (level <= 0) {
    return ResourceState()
  }
  val levelScale = level.toDouble() * (1.0 + (level - 1) * 0.025)
  return def.baseOutputPerSecond.scale(levelScale * multiplier)
}

fun totalProductionPerSecond(state: GameUiState): ResourceState {
  var sum = ResourceState()
  for (building in BUILDINGS) {
    val level = buildingLevel(state, building.id)
    sum += productionForBuilding(building, level, state.productionMultiplier)
  }
  return sum
}

fun formatCompact(value: Double): String {
  val abs = kotlin.math.abs(value)
  if (abs < 1000) {
    return if (abs >= 100) "%.0f".format(value) else "%.1f".format(value)
  }
  val suffixes = listOf("K", "M", "B", "T")
  var n = abs
  var index = -1
  while (n >= 1000 && index < suffixes.lastIndex) {
    n /= 1000
    index += 1
  }
  val sign = if (value < 0) "-" else ""
  val formatted = if (n >= 100) "%.0f".format(n) else "%.1f".format(n)
  return sign + formatted + suffixes[index]
}
