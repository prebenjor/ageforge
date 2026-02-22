package com.prebenjor.idleforge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.prebenjor.idleforge.game.BUILDINGS
import com.prebenjor.idleforge.game.GameUiState
import com.prebenjor.idleforge.game.GameViewModel
import com.prebenjor.idleforge.game.UPGRADES
import com.prebenjor.idleforge.game.buildingCost
import com.prebenjor.idleforge.game.buildingLevel
import com.prebenjor.idleforge.game.formatCompact
import com.prebenjor.idleforge.game.totalProductionPerSecond
import com.prebenjor.idleforge.game.upgradeCost
import com.prebenjor.idleforge.game.upgradeRank

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      val viewModel: GameViewModel = viewModel()
      val state = viewModel.uiState

      MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
          IdleForgeScreen(
            state = state,
            onTap = viewModel::manualTap,
            onBuyBuilding = viewModel::buyBuilding,
            onBuyUpgrade = viewModel::buyUpgrade,
            onSave = viewModel::saveNow,
            onReset = viewModel::resetProgress
          )
        }
      }
    }
  }
}

@Composable
private fun IdleForgeScreen(
  state: GameUiState,
  onTap: () -> Unit,
  onBuyBuilding: (String) -> Unit,
  onBuyUpgrade: (String) -> Unit,
  onSave: () -> Unit,
  onReset: () -> Unit
) {
  val production = totalProductionPerSecond(state)

  LazyColumn(
    modifier = Modifier
      .fillMaxSize()
      .background(
        brush = Brush.verticalGradient(
          listOf(Color(0xFF091722), Color(0xFF050D15))
        )
      )
      .padding(14.dp),
    verticalArrangement = Arrangement.spacedBy(10.dp)
  ) {
    item {
      Card(colors = CardDefaults.cardColors(containerColor = Color(0xAA11263A))) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
          Text("Idle Forge", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
          Text(
            "Android incremental prototype. Tap for metal, scale production, and optimize upgrades.",
            color = Color(0xFFB4C9DA),
            style = MaterialTheme.typography.bodySmall
          )
          Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = onSave) { Text("Save") }
            Button(onClick = onReset) { Text("Reset") }
          }
        }
      }
    }

    item {
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        StatChip(title = "Metal", value = formatCompact(state.resources.metal), modifier = Modifier.weight(1f))
        StatChip(title = "Credits", value = formatCompact(state.resources.credits), modifier = Modifier.weight(1f))
        StatChip(title = "Science", value = formatCompact(state.resources.science), modifier = Modifier.weight(1f))
      }
    }

    item {
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        StatChip(title = "Tap", value = "+${formatCompact(state.tapMetal)} M", modifier = Modifier.weight(1f))
        StatChip(title = "Tap Credits", value = "+${formatCompact(state.tapCredits)} C", modifier = Modifier.weight(1f))
        StatChip(title = "Prod x", value = "${"%.2f".format(state.productionMultiplier)}x", modifier = Modifier.weight(1f))
      }
    }

    item {
      Card(colors = CardDefaults.cardColors(containerColor = Color(0xAA102030))) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          Button(onClick = onTap, modifier = Modifier.fillMaxWidth()) {
            Text("Tap To Mine")
          }
          Text(
            "Income/sec: ${formatCompact(production.metal)} Metal | ${formatCompact(production.credits)} Credits | ${formatCompact(production.science)} Science",
            color = Color(0xFFC6D8E5),
            style = MaterialTheme.typography.bodySmall
          )
          Text(
            "Taps: ${state.taps} | Session: ${formatCompact(state.sessionSeconds)}s",
            color = Color(0xFF97B3C7),
            style = MaterialTheme.typography.bodySmall
          )
          if (state.offlineSecondsApplied > 0) {
            Text(
              "Offline gains applied: ${state.offlineSecondsApplied}s",
              color = Color(0xFF9DEED4),
              style = MaterialTheme.typography.bodySmall
            )
          }
        }
      }
    }

    item {
      Text("Buildings", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    }

    items(BUILDINGS.size) { index ->
      val building = BUILDINGS[index]
      val level = buildingLevel(state, building.id)
      val cost = buildingCost(building, level)
      val canBuy = state.resources.canAfford(cost)
      val output = building.baseOutputPerSecond
      BuildingCard(
        title = building.name,
        description = building.description,
        level = level,
        outputText = "+${formatCompact(output.metal)} M | +${formatCompact(output.credits)} C | +${formatCompact(output.science)} S per lvl",
        costText = "Cost: ${formatCompact(cost.metal)} M | ${formatCompact(cost.credits)} C | ${formatCompact(cost.science)} S",
        canBuy = canBuy,
        onBuy = { onBuyBuilding(building.id) }
      )
    }

    item {
      Divider(color = Color(0x334E708A), thickness = 1.dp, modifier = Modifier.padding(vertical = 6.dp))
      Text("Upgrades", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    }

    items(UPGRADES.size) { index ->
      val upgrade = UPGRADES[index]
      val rank = upgradeRank(state, upgrade.id)
      val atMax = rank >= upgrade.maxRank
      val nextCost = if (atMax) null else upgradeCost(upgrade, rank)
      val canBuy = !atMax && nextCost != null && state.resources.canAfford(nextCost)

      UpgradeCard(
        title = upgrade.name,
        description = upgrade.description,
        rank = rank,
        maxRank = upgrade.maxRank,
        costText = nextCost?.let {
          "Cost: ${formatCompact(it.metal)} M | ${formatCompact(it.credits)} C | ${formatCompact(it.science)} S"
        } ?: "Max rank reached",
        canBuy = canBuy,
        atMax = atMax,
        onBuy = { onBuyUpgrade(upgrade.id) }
      )
    }

    item {
      Spacer(modifier = Modifier.height(20.dp))
    }
  }
}

@Composable
private fun StatChip(title: String, value: String, modifier: Modifier = Modifier) {
  Card(
    modifier = modifier,
    colors = CardDefaults.cardColors(containerColor = Color(0xAA0F2132))
  ) {
    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
      Text(title, style = MaterialTheme.typography.bodySmall, color = Color(0xFF99B9CE))
      Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    }
  }
}

@Composable
private fun BuildingCard(
  title: String,
  description: String,
  level: Int,
  outputText: String,
  costText: String,
  canBuy: Boolean,
  onBuy: () -> Unit
) {
  Card(colors = CardDefaults.cardColors(containerColor = Color(0xAA0E1F2E))) {
    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
        Text("Lv $level", color = Color(0xFF86D8F5), style = MaterialTheme.typography.bodyMedium)
      }
      Text(description, style = MaterialTheme.typography.bodySmall, color = Color(0xFFAFCCDC))
      Text(outputText, style = MaterialTheme.typography.bodySmall, color = Color(0xFFA0EFC5))
      Text(costText, style = MaterialTheme.typography.bodySmall, color = Color(0xFFE9D3A0))
      Button(onClick = onBuy, enabled = canBuy, modifier = Modifier.fillMaxWidth()) {
        Text("Buy")
      }
    }
  }
}

@Composable
private fun UpgradeCard(
  title: String,
  description: String,
  rank: Int,
  maxRank: Int,
  costText: String,
  canBuy: Boolean,
  atMax: Boolean,
  onBuy: () -> Unit
) {
  Card(colors = CardDefaults.cardColors(containerColor = Color(0xAA0C1D2C))) {
    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
        Text("$rank/$maxRank", color = Color(0xFFD1B2FF), style = MaterialTheme.typography.bodyMedium)
      }
      Text(description, style = MaterialTheme.typography.bodySmall, color = Color(0xFFAFCCDC))
      Text(costText, style = MaterialTheme.typography.bodySmall, color = Color(0xFFE9D3A0))
      Button(onClick = onBuy, enabled = canBuy, modifier = Modifier.fillMaxWidth()) {
        Text(if (atMax) "Maxed" else "Upgrade")
      }
    }
  }
}
