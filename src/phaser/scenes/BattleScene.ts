import Phaser from "phaser";
import {
  PAD_LAYOUT,
  RESOURCE_LABELS,
  TOWER_CONFIGS,
  WAVE_DURATION,
  getEnemyById,
  getTowerById,
  getTowerStats,
  getWaveDefinition
} from "../../game/config";
import { useGameStore } from "../../game/store";
import type { BattleTelemetry, TowerPlacement } from "../../game/types";

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
  }

  update(_: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    const state = useGameStore.getState();
    this.timerText.setText(state.phase === "battle" ? `${Math.ceil(state.battleTimer)}s` : `${WAVE_DURATION}s`);
    this.syncPadVisuals(state.selectedTowerId, state.phase);
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

  private syncPadVisuals(selectedTowerId: string | null, phase: string): void {
    for (const pad of PAD_LAYOUT) {
      const padCircle = this.pads.get(pad.id);
      if (!padCircle) {
        continue;
      }
      const hasTower = Boolean(this.towers.get(pad.id));
      const interactiveGlow = phase === "build" && selectedTowerId && !hasTower;
      padCircle.setFillStyle(hasTower ? 0x33566e : 0x2a3e4f, interactiveGlow ? 0.9 : 0.62);
      padCircle.setStrokeStyle(2, interactiveGlow ? 0x9de9ff : 0x70a4bd, hasTower ? 0.95 : 0.55);
    }
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
