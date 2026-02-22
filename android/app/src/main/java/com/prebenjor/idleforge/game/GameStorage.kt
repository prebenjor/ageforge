package com.prebenjor.idleforge.game

import android.content.Context

data class SaveSnapshot(
  val resources: ResourceState,
  val tapMetal: Double,
  val tapCredits: Double,
  val productionMultiplier: Double,
  val buildings: Map<String, Int>,
  val upgrades: Map<String, Int>,
  val taps: Long,
  val sessionSeconds: Double,
  val savedAtEpochMs: Long
)

class GameStorage(context: Context) {
  private val prefs = context.getSharedPreferences("idle_forge_save", Context.MODE_PRIVATE)

  fun save(snapshot: SaveSnapshot) {
    prefs.edit()
      .putInt(KEY_VERSION, SAVE_VERSION)
      .putString(KEY_METAL, snapshot.resources.metal.toString())
      .putString(KEY_CREDITS, snapshot.resources.credits.toString())
      .putString(KEY_SCIENCE, snapshot.resources.science.toString())
      .putString(KEY_TAP_METAL, snapshot.tapMetal.toString())
      .putString(KEY_TAP_CREDITS, snapshot.tapCredits.toString())
      .putString(KEY_MULTIPLIER, snapshot.productionMultiplier.toString())
      .putString(KEY_BUILDINGS, encodeMap(snapshot.buildings))
      .putString(KEY_UPGRADES, encodeMap(snapshot.upgrades))
      .putLong(KEY_TAPS, snapshot.taps)
      .putString(KEY_SESSION_SECONDS, snapshot.sessionSeconds.toString())
      .putLong(KEY_LAST_SAVED_EPOCH_MS, snapshot.savedAtEpochMs)
      .apply()
  }

  fun load(): SaveSnapshot? {
    if (prefs.getInt(KEY_VERSION, 0) != SAVE_VERSION) {
      return null
    }

    val metal = prefs.getString(KEY_METAL, null)?.toDoubleOrNull() ?: return null
    val credits = prefs.getString(KEY_CREDITS, null)?.toDoubleOrNull() ?: return null
    val science = prefs.getString(KEY_SCIENCE, null)?.toDoubleOrNull() ?: return null

    val tapMetal = prefs.getString(KEY_TAP_METAL, null)?.toDoubleOrNull() ?: 1.0
    val tapCredits = prefs.getString(KEY_TAP_CREDITS, null)?.toDoubleOrNull() ?: 0.0
    val multiplier = prefs.getString(KEY_MULTIPLIER, null)?.toDoubleOrNull() ?: 1.0

    val buildingMap = decodeMap(prefs.getString(KEY_BUILDINGS, "") ?: "")
    val upgradeMap = decodeMap(prefs.getString(KEY_UPGRADES, "") ?: "")

    return SaveSnapshot(
      resources = ResourceState(metal = metal, credits = credits, science = science),
      tapMetal = tapMetal,
      tapCredits = tapCredits,
      productionMultiplier = multiplier,
      buildings = DEFAULT_BUILDING_LEVELS + buildingMap,
      upgrades = DEFAULT_UPGRADE_RANKS + upgradeMap,
      taps = prefs.getLong(KEY_TAPS, 0L),
      sessionSeconds = prefs.getString(KEY_SESSION_SECONDS, null)?.toDoubleOrNull() ?: 0.0,
      savedAtEpochMs = prefs.getLong(KEY_LAST_SAVED_EPOCH_MS, System.currentTimeMillis())
    )
  }

  private fun encodeMap(map: Map<String, Int>): String {
    return map.entries.joinToString(";") { "${it.key}=${it.value}" }
  }

  private fun decodeMap(raw: String): Map<String, Int> {
    if (raw.isBlank()) {
      return emptyMap()
    }
    val output = mutableMapOf<String, Int>()
    for (chunk in raw.split(";")) {
      val parts = chunk.split("=")
      if (parts.size != 2) {
        continue
      }
      val key = parts[0].trim()
      val value = parts[1].trim().toIntOrNull() ?: continue
      if (key.isNotEmpty()) {
        output[key] = value.coerceAtLeast(0)
      }
    }
    return output
  }

  companion object {
    private const val SAVE_VERSION = 1

    private const val KEY_VERSION = "version"
    private const val KEY_METAL = "metal"
    private const val KEY_CREDITS = "credits"
    private const val KEY_SCIENCE = "science"
    private const val KEY_TAP_METAL = "tap_metal"
    private const val KEY_TAP_CREDITS = "tap_credits"
    private const val KEY_MULTIPLIER = "multiplier"
    private const val KEY_BUILDINGS = "buildings"
    private const val KEY_UPGRADES = "upgrades"
    private const val KEY_TAPS = "taps"
    private const val KEY_SESSION_SECONDS = "session_seconds"
    private const val KEY_LAST_SAVED_EPOCH_MS = "last_saved_epoch_ms"
  }
}
