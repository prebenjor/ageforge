import Phaser from "phaser";
import {
  MAX_TOWER_LEVEL,
  PAD_LAYOUT,
  RESOURCE_ORDER,
  RESOURCE_LABELS,
  TOWER_CONFIGS,
  WAVE_DURATION,
  getEnemyById,
  getTowerById,
  getTowerStats,
  getTowerUpgradeCost,
  getWaveDefinition
} from "../../game/config";
import { useGameStore } from "../../game/store";
import type { BattleTelemetry, TowerPlacement } from "../../game/types";

type StoreSnapshot = ReturnType<typeof useGameStore.getState>;
type PadActionKind = "build" | "upgrade" | "occupied" | "maxed" | "invalid" | "inactive";

interface TowerActor {
  padId: number;
  towerId: string;
  level: number;
  damage: number;
  range: number;
  cooldown: number;
  splashRadius: number;
  slowFactor: number;
  slowDuration: number;
  projectileSpeed: number;
  body: Phaser.GameObjects.Rectangle;
  turret: Phaser.GameObjects.Rectangle;
  tierText: Phaser.GameObjects.Text;
  ring: Phaser.GameObjects.Arc;
  cooldownLeft: number;
}

interface EnemyActor {
  enemyId: string;
  hp: number;
  maxHp: number;
  speed: number;
  rewardGold: number;
  rewardEssence: number;
  progress: number;
  radius: number;
  body: Phaser.GameObjects.Arc;
  hpBack: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  slowFactor: number;
  slowUntil: number;
  alive: boolean;
}

interface SpawnJob {
  enemyId: string;
  spawnAt: number;
}

const PATH_POINTS = [
  new Phaser.Math.Vector2(40, 300),
  new Phaser.Math.Vector2(190, 300),
  new Phaser.Math.Vector2(190, 190),
  new Phaser.Math.Vector2(390, 190),
  new Phaser.Math.Vector2(390, 410),
  new Phaser.Math.Vector2(620, 410),
  new Phaser.Math.Vector2(620, 260),
  new Phaser.Math.Vector2(760, 260)
];

export class BattleScene extends Phaser.Scene {
  private towers = new Map<number, TowerActor>();
  private enemies: EnemyActor[] = [];
  private pads = new Map<number, Phaser.GameObjects.Arc>();
  private padZones: Phaser.GameObjects.Zone[] = [];
  private hoveredPadId: number | null = null;
  private activeWaveNonce = -1;
  private running = false;
  private waveElapsed = 0;
  private spawnQueue: SpawnJob[] = [];
  private waveKills = 0;
  private waveLeaks = 0;
  private waveGold = 0;
  private waveEssence = 0;
  private telemetryAccumulator = 0;
  private statusText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private coreText!: Phaser.GameObjects.Text;
  private previewBody!: Phaser.GameObjects.Rectangle;
  private previewTurret!: Phaser.GameObjects.Rectangle;
  private previewRange!: Phaser.GameObjects.Arc;
  private previewHint!: Phaser.GameObjects.Text;
  private segmentLengths: number[] = [];
  private pathLength = 0;

  constructor() {
    super("battle");
  }

  create(): void {
    this.computePathMetrics();
    this.cameras.main.setBackgroundColor("#101f2e");
    this.add.rectangle(400, 300, 770, 520, 0x13273a, 0.95).setStrokeStyle(1, 0x5f95ad, 0.3);
    this.drawPath();

    this.statusText = this.add.text(18, 16, "Build phase active. Select a tower and click a pad.", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#d9f4ff"
    });
    this.timerText = this.add.text(686, 16, `${WAVE_DURATION}s`, {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#d9f4ff"
    });
    this.coreText = this.add.text(684, 245, "CORE", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#9de9ff"
    });
    this.add.circle(742, 264, 19, 0x1f4b63, 0.6).setStrokeStyle(2, 0x88daff, 0.75);

    for (const pad of PAD_LAYOUT) {
      const padCircle = this.add.circle(pad.x, pad.y, 16, 0x2a3e4f, 0.65).setStrokeStyle(2, 0x70a4bd, 0.6);
      const hitZone = this.add.zone(pad.x, pad.y, 44, 44).setInteractive({ useHandCursor: true });
      hitZone.on("pointerover", () => {
        this.hoveredPadId = pad.id;
      });
      hitZone.on("pointerout", () => {
        if (this.hoveredPadId === pad.id) {
          this.hoveredPadId = null;
        }
      });
      hitZone.on("pointerdown", () => {
        const state = useGameStore.getState();
        if (state.phase !== "build") {
          return;
        }
        state.placeTower(pad.id);
      });
      this.pads.set(pad.id, padCircle);
      this.padZones.push(hitZone);
    }

    this.previewRange = this.add.circle(0, 0, 42, 0x8ce8ff, 0.03).setStrokeStyle(1, 0x9de9ff, 0.32).setDepth(8);
    this.previewBody = this.add.rectangle(0, 0, 30, 34, 0x7cc8ff, 0.38).setStrokeStyle(1, 0xdff8ff, 0.28).setDepth(15);
    this.previewTurret = this.add.rectangle(0, 0, 8, 18, 0xe6f8ff, 0.5).setDepth(16);
    this.previewHint = this.add
      .text(0, 0, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "11px",
        color: "#d5f7ff",
        backgroundColor: "rgba(12, 34, 47, 0.72)"
      })
      .setPadding(5, 3, 5, 3)
      .setDepth(17);
    this.hidePreview();
  }

  update(_: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    const state = useGameStore.getState();
    this.timerText.setText(state.phase === "battle" ? `${Math.ceil(state.battleTimer)}s` : `${WAVE_DURATION}s`);
    this.syncPadVisuals(state);
    this.syncPreview(state);
    this.syncTowers(state.board, state.phase);

    if (state.phase === "battle" && state.battleNonce !== this.activeWaveNonce) {
      this.beginWave(state.wave, state.battleNonce);
    }

    if (state.phase !== "battle" || !this.running) {
      if (this.running && state.phase !== "battle") {
        this.running = false;
        this.clearWaveEnemies();
      }
      return;
    }

    this.waveElapsed += dt;
    this.spawnPendingEnemies();
    this.stepEnemies(dt, state.worldTime);
    this.stepTowers(dt, state.worldTime);

    this.telemetryAccumulator += dt;
    if (this.telemetryAccumulator >= 0.2) {
      this.telemetryAccumulator = 0;
      this.pushTelemetry();
    }

    if (this.spawnQueue.length === 0 && this.enemies.every((enemy) => !enemy.alive)) {
      this.finishWave(true);
    }
  }

  private drawPath(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(34, 0x2a4050, 0.74);
    graphics.beginPath();
    graphics.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
    for (let i = 1; i < PATH_POINTS.length; i += 1) {
      graphics.lineTo(PATH_POINTS[i].x, PATH_POINTS[i].y);
    }
    graphics.strokePath();

    graphics.lineStyle(3, 0x5f8fab, 0.68);
    graphics.beginPath();
    graphics.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
    for (let i = 1; i < PATH_POINTS.length; i += 1) {
      graphics.lineTo(PATH_POINTS[i].x, PATH_POINTS[i].y);
    }
    graphics.strokePath();
  }

  private computePathMetrics(): void {
    this.segmentLengths = [];
    this.pathLength = 0;
    for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
      const length = Phaser.Math.Distance.BetweenPoints(PATH_POINTS[i], PATH_POINTS[i + 1]);
      this.segmentLengths.push(length);
      this.pathLength += length;
    }
  }

  private pointAt(progress: number): Phaser.Math.Vector2 {
    const clamped = Phaser.Math.Clamp(progress, 0, 1);
    let remaining = clamped * this.pathLength;
    for (let index = 0; index < this.segmentLengths.length; index += 1) {
      const segment = this.segmentLengths[index];
      if (remaining <= segment || index === this.segmentLengths.length - 1) {
        const start = PATH_POINTS[index];
        const end = PATH_POINTS[index + 1];
        const t = segment <= 0 ? 0 : Phaser.Math.Clamp(remaining / segment, 0, 1);
        return new Phaser.Math.Vector2(Phaser.Math.Linear(start.x, end.x, t), Phaser.Math.Linear(start.y, end.y, t));
      }
      remaining -= segment;
    }
    return PATH_POINTS[PATH_POINTS.length - 1].clone();
  }

  private syncPadVisuals(state: StoreSnapshot): void {
    for (const pad of PAD_LAYOUT) {
      const padCircle = this.pads.get(pad.id);
      if (!padCircle) {
        continue;
      }

      const action = this.getPadAction(state, pad.id);
      const hovered = this.hoveredPadId === pad.id;
      let fillColor = 0x2a3e4f;
      let fillAlpha = 0.62;
      let strokeColor = 0x70a4bd;
      let strokeAlpha = 0.55;

      if (action.kind === "build") {
        fillColor = 0x2f5758;
        fillAlpha = 0.82;
        strokeColor = 0x89f8d9;
        strokeAlpha = 0.98;
      } else if (action.kind === "upgrade") {
        fillColor = 0x5f4f34;
        fillAlpha = 0.84;
        strokeColor = 0xffd08f;
        strokeAlpha = 0.98;
      } else if (action.kind === "invalid") {
        fillColor = 0x55373d;
        fillAlpha = 0.76;
        strokeColor = 0xff9c9c;
        strokeAlpha = 0.9;
      } else if (action.kind === "maxed") {
        fillColor = 0x4d3d66;
        fillAlpha = 0.82;
        strokeColor = 0xd7b8ff;
        strokeAlpha = 0.94;
      } else if (action.kind === "occupied") {
        fillColor = 0x33566e;
        fillAlpha = 0.86;
        strokeColor = 0x83c2e2;
        strokeAlpha = 0.9;
      } else if (this.towers.has(pad.id)) {
        fillColor = 0x33566e;
        fillAlpha = 0.78;
        strokeColor = 0x7db7d7;
        strokeAlpha = 0.82;
      }

      if (hovered) {
        fillAlpha = Math.min(0.96, fillAlpha + 0.12);
        strokeAlpha = 1;
      }

      padCircle.setRadius(hovered ? 17.6 : 16);
      padCircle.setFillStyle(fillColor, fillAlpha);
      padCircle.setStrokeStyle(2, strokeColor, strokeAlpha);
    }
  }

  private canAffordCost(resources: StoreSnapshot["resources"], cost?: Partial<StoreSnapshot["resources"]>): boolean {
    if (!cost) {
      return true;
    }
    return RESOURCE_ORDER.every((resource) => (resources[resource] ?? 0) >= (cost[resource] ?? 0));
  }

  private formatCost(cost?: Partial<StoreSnapshot["resources"]>): string {
    if (!cost) {
      return "";
    }
    const parts: string[] = [];
    for (const resource of RESOURCE_ORDER) {
      const value = cost[resource];
      if (!value) {
        continue;
      }
      parts.push(`${Math.ceil(value)} ${RESOURCE_LABELS[resource]}`);
    }
    return parts.join(" / ");
  }

  private getPadAction(
    state: StoreSnapshot,
    padId: number
  ): { kind: PadActionKind; hint: string; previewLevel: number } {
    if (state.phase !== "build") {
      return { kind: "inactive", hint: "", previewLevel: 1 };
    }
    const selectedTowerId = state.selectedTowerId;
    if (!selectedTowerId) {
      return { kind: "invalid", hint: "Select a tower first.", previewLevel: 1 };
    }
    const tower = getTowerById(selectedTowerId);
    if (!tower) {
      return { kind: "invalid", hint: "Invalid tower selection.", previewLevel: 1 };
    }

    const slot = state.board[padId];
    if (!slot) {
      if (this.canAffordCost(state.resources, tower.cost)) {
        return { kind: "build", hint: `Build ${tower.name} (${this.formatCost(tower.cost)})`, previewLevel: 1 };
      }
      return { kind: "invalid", hint: `Need ${this.formatCost(tower.cost)}`, previewLevel: 1 };
    }

    if (slot.towerId !== selectedTowerId) {
      return { kind: "occupied", hint: "Pad occupied by another tower type.", previewLevel: 1 };
    }

    if (slot.level >= MAX_TOWER_LEVEL) {
      return { kind: "maxed", hint: "Max tier reached on this pad.", previewLevel: slot.level };
    }

    const upgradeCost = getTowerUpgradeCost(slot.towerId, slot.level);
    const previewLevel = Math.min(MAX_TOWER_LEVEL, slot.level + 1);
    if (!upgradeCost) {
      return { kind: "maxed", hint: "Max tier reached on this pad.", previewLevel };
    }
    if (this.canAffordCost(state.resources, upgradeCost)) {
      return { kind: "upgrade", hint: `Upgrade (${this.formatCost(upgradeCost)})`, previewLevel };
    }
    return { kind: "invalid", hint: `Need ${this.formatCost(upgradeCost)}`, previewLevel };
  }

  private syncPreview(state: StoreSnapshot): void {
    if (state.phase !== "build" || this.hoveredPadId === null || !state.selectedTowerId) {
      this.hidePreview();
      return;
    }

    const tower = getTowerById(state.selectedTowerId);
    const pad = PAD_LAYOUT.find((entry) => entry.id === this.hoveredPadId);
    if (!tower || !pad) {
      this.hidePreview();
      return;
    }

    const action = this.getPadAction(state, pad.id);
    const stats = getTowerStats(state.selectedTowerId, action.previewLevel);
    const isValid = action.kind === "build" || action.kind === "upgrade";

    const ringColor =
      action.kind === "upgrade"
        ? 0xffcf8a
        : action.kind === "build"
          ? 0x89f8d9
          : action.kind === "maxed"
            ? 0xd7b8ff
            : action.kind === "occupied"
              ? 0x83c2e2
              : 0xff9c9c;
    const labelX = Phaser.Math.Clamp(pad.x - 78, 20, 650);
    const labelY = Phaser.Math.Clamp(pad.y - stats.range - 20, 30, 560);

    this.previewRange.setPosition(pad.x, pad.y);
    this.previewRange.setRadius(stats.range);
    this.previewRange.setStrokeStyle(1, ringColor, isValid ? 0.34 : 0.24);
    this.previewRange.setFillStyle(ringColor, isValid ? 0.035 : 0.018);

    this.previewBody.setPosition(pad.x, pad.y);
    this.previewBody.setFillStyle(tower.color, isValid ? 0.52 : 0.22);
    this.previewBody.setStrokeStyle(1, 0xe5f9ff, isValid ? 0.34 : 0.18);
    this.previewTurret.setPosition(pad.x, pad.y - 16);
    this.previewTurret.setFillStyle(0xe6f8ff, isValid ? 0.64 : 0.28);

    this.previewHint.setPosition(labelX, labelY);
    this.previewHint.setText(action.hint);
    this.previewHint.setColor(isValid ? "#d5f7ff" : "#ffd6d6");

    this.previewRange.setVisible(true);
    this.previewBody.setVisible(true);
    this.previewTurret.setVisible(true);
    this.previewHint.setVisible(true);
  }

  private hidePreview(): void {
    this.previewRange?.setVisible(false);
    this.previewBody?.setVisible(false);
    this.previewTurret?.setVisible(false);
    this.previewHint?.setVisible(false);
  }

  private syncTowers(board: Record<number, TowerPlacement | null>, phase: string): void {
    for (const pad of PAD_LAYOUT) {
      const slot = board[pad.id];
      const actor = this.towers.get(pad.id);

      if (!slot && actor) {
        this.destroyTower(actor);
        this.towers.delete(pad.id);
        continue;
      }
      if (!slot) {
        continue;
      }

      if (!actor || actor.towerId !== slot.towerId || actor.level !== slot.level) {
        if (actor) {
          this.destroyTower(actor);
          this.towers.delete(pad.id);
        }
        this.towers.set(pad.id, this.createTower(slot, pad.x, pad.y));
      }
    }

    for (const tower of this.towers.values()) {
      tower.ring.setAlpha(phase === "build" ? 0.08 : 0.04);
    }
  }

  private createTower(slot: TowerPlacement, x: number, y: number): TowerActor {
    const config = getTowerById(slot.towerId);
    const stats = getTowerStats(slot.towerId, slot.level);
    const color = config?.color ?? 0x88ccff;
    const body = this.add.rectangle(x, y, 30, 34, color, 0.92).setStrokeStyle(2, 0xd6f5ff, 0.32).setDepth(12);
    const turret = this.add.rectangle(x, y - 16, 8, 18, 0xe3f6ff, 0.95).setDepth(13);
    const tierText = this.add
      .text(x - 7, y + 12, `${slot.level}`, {
        fontFamily: "Trebuchet MS",
        fontSize: "11px",
        color: "#e5fbff"
      })
      .setDepth(14);
    const ring = this.add.circle(x, y, stats.range, 0x7fd9ff, 0.03).setStrokeStyle(1, 0x8bdfff, 0.18).setDepth(8);

    return {
      padId: slot.padId,
      towerId: slot.towerId,
      level: slot.level,
      damage: stats.damage,
      range: stats.range,
      cooldown: stats.cooldown,
      splashRadius: stats.splashRadius,
      slowFactor: stats.slowFactor,
      slowDuration: stats.slowDuration,
      projectileSpeed: config?.projectileSpeed ?? 500,
      body,
      turret,
      tierText,
      ring,
      cooldownLeft: Phaser.Math.FloatBetween(0, stats.cooldown * 0.55)
    };
  }

  private destroyTower(tower: TowerActor): void {
    tower.body.destroy();
    tower.turret.destroy();
    tower.tierText.destroy();
    tower.ring.destroy();
  }

  private beginWave(wave: number, nonce: number): void {
    this.activeWaveNonce = nonce;
    this.running = true;
    this.hoveredPadId = null;
    this.hidePreview();
    this.waveElapsed = 0;
    this.spawnQueue = [];
    this.waveKills = 0;
    this.waveLeaks = 0;
    this.waveGold = 0;
    this.waveEssence = 0;
    this.telemetryAccumulator = 0;
    this.clearWaveEnemies();

    const definition = getWaveDefinition(wave);
    for (const group of definition.groups) {
      for (let i = 0; i < group.count; i += 1) {
        this.spawnQueue.push({ enemyId: group.enemyId, spawnAt: group.startAt + i * group.interval });
      }
    }
    this.spawnQueue.sort((a, b) => a.spawnAt - b.spawnAt);

    this.statusText.setText(`Wave ${wave} live: ${definition.label}. Hold the core.`);
    this.pushTelemetry();
  }

  private spawnPendingEnemies(): void {
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].spawnAt <= this.waveElapsed) {
      const next = this.spawnQueue.shift();
      if (!next) {
        break;
      }
      this.spawnEnemy(next.enemyId);
    }
  }

  private spawnEnemy(enemyId: string): void {
    const config = getEnemyById(enemyId);
    if (!config) {
      return;
    }
    const spawnPoint = this.pointAt(0);
    const body = this.add.circle(spawnPoint.x, spawnPoint.y, config.radius, config.color, 0.96).setDepth(16);
    const hpBack = this.add.rectangle(spawnPoint.x, spawnPoint.y - config.radius - 7, config.radius * 2.4, 4, 0x243844, 0.92).setDepth(17);
    const hpBar = this.add.rectangle(
      spawnPoint.x,
      spawnPoint.y - config.radius - 7,
      config.radius * 2.4,
      4,
      0xb9f09a,
      0.95
    ).setDepth(18);

    this.enemies.push({
      enemyId: config.id,
      hp: config.hp,
      maxHp: config.hp,
      speed: config.speed,
      rewardGold: config.rewardGold,
      rewardEssence: config.rewardEssence,
      progress: 0,
      radius: config.radius,
      body,
      hpBack,
      hpBar,
      slowFactor: 1,
      slowUntil: 0,
      alive: true
    });
  }

  private stepEnemies(dt: number, now: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue;
      }
      const effectiveSpeed = enemy.speed * (enemy.slowUntil > now ? enemy.slowFactor : 1);
      enemy.progress += (effectiveSpeed * dt) / this.pathLength;

      if (enemy.progress >= 1) {
        this.leakEnemy(enemy);
        continue;
      }

      const point = this.pointAt(enemy.progress);
      enemy.body.setPosition(point.x, point.y);
      enemy.hpBack.setPosition(point.x, point.y - enemy.radius - 7);
      enemy.hpBar.setPosition(point.x, point.y - enemy.radius - 7);
      enemy.hpBar.width = (Math.max(0, enemy.hp) / enemy.maxHp) * enemy.radius * 2.4;
    }
  }

  private leakEnemy(enemy: EnemyActor): void {
    if (!enemy.alive) {
      return;
    }
    enemy.alive = false;
    this.waveLeaks += 1;
    this.fadeOutEnemy(enemy, false);
  }

  private stepTowers(dt: number, now: number): void {
    for (const tower of this.towers.values()) {
      tower.cooldownLeft = Math.max(0, tower.cooldownLeft - dt);
      if (tower.cooldownLeft > 0) {
        continue;
      }
      const target = this.findTargetForTower(tower);
      if (!target) {
        continue;
      }
      tower.cooldownLeft = tower.cooldown;
      const angle = Phaser.Math.Angle.Between(tower.body.x, tower.body.y, target.body.x, target.body.y);
      tower.turret.setRotation(angle);
      this.fireProjectile(tower, target);
      this.applyTowerHit(tower, target, now);
    }
  }

  private findTargetForTower(tower: TowerActor): EnemyActor | null {
    let best: EnemyActor | null = null;
    let bestProgress = -1;
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(tower.body.x, tower.body.y, enemy.body.x, enemy.body.y);
      if (distance > tower.range) {
        continue;
      }
      if (enemy.progress > bestProgress) {
        best = enemy;
        bestProgress = enemy.progress;
      }
    }
    return best;
  }

  private fireProjectile(tower: TowerActor, target: EnemyActor): void {
    const towerConfig = getTowerById(tower.towerId);
    const projectile = this.add
      .circle(tower.body.x, tower.body.y - 10, tower.splashRadius > 0 ? 5 : 3, towerConfig?.projectileColor ?? 0xd9f4ff, 0.96)
      .setDepth(22);
    const distance = Phaser.Math.Distance.Between(tower.body.x, tower.body.y, target.body.x, target.body.y);
    const duration = Math.max(65, (distance / Math.max(120, tower.projectileSpeed)) * 1000);

    this.tweens.add({
      targets: projectile,
      x: target.body.x,
      y: target.body.y,
      ease: "Linear",
      duration,
      onComplete: () => projectile.destroy()
    });
  }

  private applyTowerHit(tower: TowerActor, target: EnemyActor, now: number): void {
    if (!target.alive) {
      return;
    }

    if (tower.splashRadius > 0) {
      for (const enemy of this.enemies) {
        if (!enemy.alive) {
          continue;
        }
        const distance = Phaser.Math.Distance.Between(target.body.x, target.body.y, enemy.body.x, enemy.body.y);
        if (distance > tower.splashRadius) {
          continue;
        }
        const splashScale = enemy === target ? 1 : 0.62;
        this.damageEnemy(enemy, tower.damage * splashScale, tower, now);
      }
      return;
    }

    this.damageEnemy(target, tower.damage, tower, now);
  }

  private damageEnemy(enemy: EnemyActor, rawDamage: number, tower: TowerActor, now: number): void {
    if (!enemy.alive) {
      return;
    }
    enemy.hp -= rawDamage;
    if (tower.slowFactor < 1) {
      enemy.slowFactor = Math.min(enemy.slowFactor, tower.slowFactor);
      enemy.slowUntil = Math.max(enemy.slowUntil, now + tower.slowDuration);
    }
    enemy.body.setFillStyle(enemy.body.fillColor, 1);
    enemy.body.setScale(1.07);
    this.time.delayedCall(65, () => {
      if (enemy.body.active) {
        enemy.body.setScale(1);
      }
    });
    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemyActor): void {
    if (!enemy.alive) {
      return;
    }
    enemy.alive = false;
    this.waveKills += 1;
    this.waveGold += enemy.rewardGold;
    this.waveEssence += enemy.rewardEssence;
    this.fadeOutEnemy(enemy, true);
  }

  private fadeOutEnemy(enemy: EnemyActor, exploded: boolean): void {
    if (exploded) {
      const burst = this.add.circle(enemy.body.x, enemy.body.y, enemy.radius * 0.7, 0xffffff, 0.26).setDepth(21);
      this.tweens.add({
        targets: burst,
        radius: enemy.radius * 2.2,
        alpha: 0,
        duration: 180,
        onComplete: () => burst.destroy()
      });
    }
    this.tweens.add({
      targets: [enemy.body, enemy.hpBack, enemy.hpBar],
      alpha: 0,
      duration: 140,
      onComplete: () => {
        enemy.body.destroy();
        enemy.hpBack.destroy();
        enemy.hpBar.destroy();
      }
    });
  }

  private finishWave(completed: boolean): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.pushTelemetry();
    useGameStore.getState().resolveWave({
      completed,
      leaks: this.waveLeaks,
      kills: this.waveKills,
      goldEarned: this.waveGold,
      essenceEarned: this.waveEssence
    });

    this.statusText.setText(
      completed
        ? `Wave cleared. Bounty ${Math.floor(this.waveGold)} ${RESOURCE_LABELS.gold}.`
        : "Wave collapsed before clear. Rebuild and hold again."
    );
  }

  private pushTelemetry(): void {
    const telemetry: BattleTelemetry = {
      kills: this.waveKills,
      leaks: this.waveLeaks,
      remaining: this.enemies.filter((enemy) => enemy.alive).length,
      incoming: this.spawnQueue.length,
      goldEarned: this.waveGold,
      essenceEarned: this.waveEssence
    };
    useGameStore.getState().setBattleTelemetry(telemetry);
  }

  private clearWaveEnemies(): void {
    for (const enemy of this.enemies) {
      enemy.body.destroy();
      enemy.hpBack.destroy();
      enemy.hpBar.destroy();
    }
    this.enemies = [];
    this.spawnQueue = [];
  }
}
