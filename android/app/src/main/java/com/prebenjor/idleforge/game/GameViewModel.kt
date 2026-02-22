package com.prebenjor.idleforge.game

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class GameViewModel(application: Application) : AndroidViewModel(application) {
  private val storage = GameStorage(application.applicationContext)
  private var tickJob: Job? = null
  private var autosaveJob: Job? = null

  var uiState by mutableStateOf(GameUiState())
    private set

  init {
    loadGame()
    startTickLoop()
    startAutosaveLoop()
  }

  fun manualTap() {
    val state = uiState
    val gain = ResourceState(metal = state.tapMetal, credits = state.tapCredits)
    uiState = state.copy(
      resources = state.resources + gain,
      taps = state.taps + 1
    )
  }

  fun buyBuilding(buildingId: String) {
    val state = uiState
    val def = BUILDINGS.find { it.id == buildingId } ?: return
    val level = buildingLevel(state, buildingId)
    val cost = buildingCost(def, level)
    if (!state.resources.canAfford(cost)) {
      return
    }

    val nextLevels = state.buildings.toMutableMap().apply {
      this[buildingId] = level + 1
    }

    uiState = state.copy(
      resources = state.resources - cost,
      buildings = nextLevels
    )
  }

  fun buyUpgrade(upgradeId: String) {
    val state = uiState
    val def = UPGRADES.find { it.id == upgradeId } ?: return
    val rank = upgradeRank(state, upgradeId)
    if (rank >= def.maxRank) {
      return
    }

    val cost = upgradeCost(def, rank)
    if (!state.resources.canAfford(cost)) {
      return
    }

    val nextRanks = state.upgrades.toMutableMap().apply {
      this[upgradeId] = rank + 1
    }

    var nextTapMetal = state.tapMetal
    var nextTapCredits = state.tapCredits
    var nextMultiplier = state.productionMultiplier

    when (upgradeId) {
      "tap_tools" -> nextTapMetal += 1.0
      "precision_rigs" -> nextMultiplier *= 1.2
      "market_ai" -> nextTapCredits += 0.35
    }

    uiState = state.copy(
      resources = state.resources - cost,
      tapMetal = nextTapMetal,
      tapCredits = nextTapCredits,
      productionMultiplier = nextMultiplier,
      upgrades = nextRanks
    )
  }

  fun saveNow() {
    storage.save(snapshotFromState(uiState))
  }

  fun resetProgress() {
    uiState = GameUiState(loaded = true)
    saveNow()
  }

  private fun loadGame() {
    val snapshot = storage.load()
    if (snapshot == null) {
      uiState = GameUiState(loaded = true)
      return
    }

    var loadedState = GameUiState(
      resources = snapshot.resources,
      tapMetal = snapshot.tapMetal,
      tapCredits = snapshot.tapCredits,
      productionMultiplier = snapshot.productionMultiplier,
      buildings = DEFAULT_BUILDING_LEVELS + snapshot.buildings,
      upgrades = DEFAULT_UPGRADE_RANKS + snapshot.upgrades,
      taps = snapshot.taps,
      sessionSeconds = snapshot.sessionSeconds,
      loaded = true
    )

    val elapsedSeconds = ((System.currentTimeMillis() - snapshot.savedAtEpochMs) / 1000.0)
      .coerceIn(0.0, 8 * 60 * 60.0)
    if (elapsedSeconds > 1.0) {
      val offlineGain = totalProductionPerSecond(loadedState).scale(elapsedSeconds)
      loadedState = loadedState.copy(
        resources = loadedState.resources + offlineGain,
        offlineSecondsApplied = elapsedSeconds.toLong()
      )
    }

    uiState = loadedState
  }

  private fun startTickLoop() {
    tickJob?.cancel()
    tickJob = viewModelScope.launch {
      var lastNs = System.nanoTime()
      while (isActive) {
        delay(100)
        val now = System.nanoTime()
        val deltaSeconds = ((now - lastNs) / 1_000_000_000.0).coerceAtMost(0.5)
        lastNs = now
        tick(deltaSeconds)
      }
    }
  }

  private fun startAutosaveLoop() {
    autosaveJob?.cancel()
    autosaveJob = viewModelScope.launch {
      while (isActive) {
        delay(2000)
        saveNow()
      }
    }
  }

  private fun tick(dt: Double) {
    if (!uiState.loaded) {
      return
    }
    val production = totalProductionPerSecond(uiState)
    uiState = uiState.copy(
      resources = uiState.resources + production.scale(dt),
      sessionSeconds = uiState.sessionSeconds + dt
    )
  }

  private fun snapshotFromState(state: GameUiState): SaveSnapshot {
    return SaveSnapshot(
      resources = state.resources,
      tapMetal = state.tapMetal,
      tapCredits = state.tapCredits,
      productionMultiplier = state.productionMultiplier,
      buildings = state.buildings,
      upgrades = state.upgrades,
      taps = state.taps,
      sessionSeconds = state.sessionSeconds,
      savedAtEpochMs = System.currentTimeMillis()
    )
  }

  override fun onCleared() {
    saveNow()
    super.onCleared()
  }
}
