import Phaser from "phaser";
import { RESOURCE_LABELS, UNIT_CONFIGS, getEnemyWave } from "../../game/config";
import { useGameStore } from "../../game/store";
import type { BattleCommand } from "../../game/types";

type Team = "ally" | "enemy";

interface UnitActor {
  actorId: number;
  unitId: string;
  team: Team;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  cooldown: number;
  cooldownLeft: number;
  radius: number;
  body: Phaser.GameObjects.Arc;
  hpBack: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  forcedX: number | null;
  forcedY: number | null;
  forcedUntil: number;
  alive: boolean;
}

interface CapturePoint {
  x: number;
  y: number;
  ring: Phaser.GameObjects.Arc;
  owner: Team | "neutral";
  progress: number;
}

const unitById = Object.fromEntries(UNIT_CONFIGS.map((unit) => [unit.id, unit]));
const LANES = [140, 220, 300, 380, 460];

export class BattleScene extends Phaser.Scene {
  private actors: UnitActor[] = [];
  private capturePoints: CapturePoint[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private activeBattleNonce = -1;
  private commandCursor = 0;
  private lastActorId = 0;
  private overdriveUntil = 0;
  private startingArmy: Record<string, number> = {};
  private running = false;

  constructor() {
    super("battle");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#11212b");
    this.add.rectangle(400, 300, 760, 500, 0x183340, 0.9).setStrokeStyle(1, 0x9ad5cc, 0.25);
    this.add.rectangle(400, 300, 2, 500, 0x91bccf, 0.34);

    this.statusText = this.add.text(18, 16, "Build phase active.", {
      fontFamily: "system-ui",
      fontSize: "14px",
      color: "#d8f3f0"
    });

    this.timerText = this.add.text(650, 16, "00:00", {
      fontFamily: "system-ui",
      fontSize: "14px",
      color: "#d8f3f0"
    });

    const points = [240, 400, 560];
    for (const x of points) {
      const ring = this.add.circle(x, 300, 26, 0x607d8b, 0.22).setStrokeStyle(2, 0x84a8b5, 0.5);
      this.capturePoints.push({ x, y: 300, ring, owner: "neutral", progress: 0 });
    }
  }

  update(_: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    const state = useGameStore.getState();
    this.timerText.setText(state.phase === "battle" ? `${Math.ceil(state.battleTimer)}s` : "Build");

    if (state.phase === "battle" && state.battleNonce !== this.activeBattleNonce) {
      this.startBattle(state.battleNonce);
    }

    if (state.phase !== "battle" || !this.running) {
      return;
    }

    this.consumeCommands(state.commandQueue, state.worldTime);
    this.simulateBattle(dt, state.worldTime);

    if (this.shouldEndBattle()) {
      this.finishBattle();
    }
  }

  private startBattle(nonce: number): void {
    this.clearBattlefield();
    this.running = true;
    this.activeBattleNonce = nonce;
    this.commandCursor = 0;
    this.overdriveUntil = 0;
    this.statusText.setText("Battle started. Hold sectors and break enemy lines.");

    const state = useGameStore.getState();
    this.startingArmy = { ...state.army };

    const allyStartX = 120;
    const enemyStartX = 680;
    let laneIndex = 0;

    for (const [unitId, count] of Object.entries(state.army)) {
      for (let i = 0; i < count; i += 1) {
        const y = LANES[laneIndex % LANES.length] + Phaser.Math.Between(-16, 16);
        this.spawnUnit("ally", unitId, allyStartX + Phaser.Math.Between(-22, 22), y);
        laneIndex += 1;
      }
    }

    laneIndex = 0;
    const wave = getEnemyWave(state.ageIndex);
    for (const group of wave) {
      for (let i = 0; i < group.count; i += 1) {
        const y = LANES[laneIndex % LANES.length] + Phaser.Math.Between(-16, 16);
        this.spawnUnit("enemy", group.unitId, enemyStartX + Phaser.Math.Between(-22, 22), y);
        laneIndex += 1;
      }
    }

    for (const point of this.capturePoints) {
      point.owner = "neutral";
      point.progress = 0;
      point.ring.setFillStyle(0x607d8b, 0.22);
      point.ring.setStrokeStyle(2, 0x84a8b5, 0.5);
    }
  }

  private clearBattlefield(): void {
    for (const actor of this.actors) {
      actor.body.destroy();
      actor.hpBack.destroy();
      actor.hpBar.destroy();
    }
    this.actors = [];
  }

  private spawnUnit(team: Team, unitId: string, x: number, y: number): void {
    const config = unitById[unitId];
    if (!config) {
      return;
    }

    const color = team === "ally" ? 0x7fe2c5 : 0xf08d8b;
    const body = this.add.circle(x, y, config.radius, color, 0.95).setDepth(10);
    const hpBack = this.add.rectangle(x, y - config.radius - 7, config.radius * 2.1, 4, 0x22313a, 0.9).setDepth(11);
    const hpBar = this.add.rectangle(x, y - config.radius - 7, config.radius * 2.1, 4, 0x99e6d8, 0.95).setDepth(12);

    this.lastActorId += 1;
    this.actors.push({
      actorId: this.lastActorId,
      unitId,
      team,
      hp: config.hp,
      maxHp: config.hp,
      damage: config.damage,
      range: config.range,
      speed: config.speed,
      cooldown: config.cooldown,
      cooldownLeft: Phaser.Math.FloatBetween(0, config.cooldown * 0.6),
      radius: config.radius,
      body,
      hpBack,
      hpBar,
      forcedX: null,
      forcedY: null,
      forcedUntil: 0,
      alive: true
    });
  }

  private consumeCommands(commands: BattleCommand[], now: number): void {
    while (this.commandCursor < commands.length) {
      const command = commands[this.commandCursor];
      this.commandCursor += 1;
      this.applyCommand(command, now);
    }
  }

  private applyCommand(command: BattleCommand, now: number): void {
    const allies = this.actors.filter((actor) => actor.alive && actor.team === "ally");
    if (!allies.length) {
      return;
    }

    if (command.kind === "overdrive") {
      this.overdriveUntil = now + 8;
      this.statusText.setText("Overdrive active: allied attack cadence increased.");
      return;
    }

    if (command.kind === "rally") {
      const rallyY = LANES[Phaser.Math.Between(1, LANES.length - 2)];
      for (const actor of allies) {
        actor.forcedX = 420;
        actor.forcedY = rallyY;
        actor.forcedUntil = now + 5;
      }
      this.statusText.setText("Rally order: push center line.");
      return;
    }

    if (command.kind === "retreat") {
      for (const actor of allies) {
        actor.forcedX = 100;
        actor.forcedY = actor.body.y;
        actor.forcedUntil = now + 4.5;
      }
      this.statusText.setText("Retreat order: regroup behind the line.");
    }
  }

  private simulateBattle(dt: number, now: number): void {
    for (const actor of this.actors) {
      if (!actor.alive) {
        continue;
      }

      actor.cooldownLeft = Math.max(0, actor.cooldownLeft - dt);

      const target = this.findTarget(actor);
      if (!target) {
        continue;
      }

      let targetX = target.body.x;
      let targetY = target.body.y;
      if (actor.forcedX !== null && actor.forcedY !== null && actor.forcedUntil > now) {
        targetX = actor.forcedX;
        targetY = actor.forcedY;
      }

      const dx = targetX - actor.body.x;
      const dy = targetY - actor.body.y;
      const distance = Math.hypot(dx, dy);

      if (distance > actor.range) {
        const safeDistance = Math.max(distance, 0.0001);
        const move = actor.speed * dt;
        actor.body.x += (dx / safeDistance) * move;
        actor.body.y += (dy / safeDistance) * move;
      } else if (actor.cooldownLeft <= 0 && target.alive) {
        const overdriveMultiplier = actor.team === "ally" && this.overdriveUntil > now ? 1.35 : 1;
        target.hp -= actor.damage * overdriveMultiplier;
        actor.cooldownLeft = actor.cooldown * (actor.team === "ally" && this.overdriveUntil > now ? 0.72 : 1);
        if (target.hp <= 0) {
          target.alive = false;
          target.body.destroy();
          target.hpBack.destroy();
          target.hpBar.destroy();
        }
      }

      if (!actor.body.active) {
        continue;
      }

      actor.body.x = Phaser.Math.Clamp(actor.body.x, 30, 770);
      actor.body.y = Phaser.Math.Clamp(actor.body.y, 90, 520);
      actor.hpBack.setPosition(actor.body.x, actor.body.y - actor.radius - 7);
      actor.hpBar.setPosition(actor.body.x, actor.body.y - actor.radius - 7);
      actor.hpBar.width = (actor.hp / actor.maxHp) * actor.radius * 2.1;
    }

    this.updateCapturePoints(dt);
  }

  private updateCapturePoints(dt: number): void {
    for (const point of this.capturePoints) {
      let allyNearby = 0;
      let enemyNearby = 0;
      for (const actor of this.actors) {
        if (!actor.alive) {
          continue;
        }
        const distance = Phaser.Math.Distance.Between(actor.body.x, actor.body.y, point.x, point.y);
        if (distance <= 62) {
          if (actor.team === "ally") {
            allyNearby += 1;
          } else {
            enemyNearby += 1;
          }
        }
      }

      const delta = (allyNearby - enemyNearby) * dt * 0.32;
      point.progress = Phaser.Math.Clamp(point.progress + delta, -1, 1);
      if (point.progress >= 0.96) {
        point.owner = "ally";
      } else if (point.progress <= -0.96) {
        point.owner = "enemy";
      } else if (Math.abs(point.progress) < 0.08) {
        point.owner = "neutral";
      }

      if (point.owner === "ally") {
        point.ring.setFillStyle(0x74ddb8, 0.42);
        point.ring.setStrokeStyle(2, 0xb8f4e4, 0.9);
      } else if (point.owner === "enemy") {
        point.ring.setFillStyle(0xd88484, 0.42);
        point.ring.setStrokeStyle(2, 0xf8b2b2, 0.9);
      } else {
        point.ring.setFillStyle(0x607d8b, 0.22);
        point.ring.setStrokeStyle(2, 0x84a8b5, 0.5);
      }
    }
  }

  private findTarget(source: UnitActor): UnitActor | null {
    const candidates = this.actors.filter((actor) => actor.alive && actor.team !== source.team);
    if (!candidates.length) {
      return null;
    }
    let best: UnitActor | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const d = Phaser.Math.Distance.Between(source.body.x, source.body.y, candidate.body.x, candidate.body.y);
      if (d < bestDistance) {
        bestDistance = d;
        best = candidate;
      }
    }
    return best;
  }

  private shouldEndBattle(): boolean {
    const allyAlive = this.actors.some((actor) => actor.alive && actor.team === "ally");
    const enemyAlive = this.actors.some((actor) => actor.alive && actor.team === "enemy");
    return !allyAlive || !enemyAlive;
  }

  private finishBattle(): void {
    if (!this.running) {
      return;
    }
    this.running = false;

    const allyAlive = this.actors.filter((actor) => actor.alive && actor.team === "ally");
    const enemyAlive = this.actors.filter((actor) => actor.alive && actor.team === "enemy");
    const survivors: Record<string, number> = {};
    for (const actor of allyAlive) {
      survivors[actor.unitId] = (survivors[actor.unitId] ?? 0) + 1;
    }

    const casualties: Record<string, number> = {};
    for (const [unitId, startCount] of Object.entries(this.startingArmy)) {
      casualties[unitId] = Math.max(0, startCount - (survivors[unitId] ?? 0));
    }

    const sectorsHeld = this.capturePoints.filter((point) => point.owner === "ally").length;
    const victory = allyAlive.length > 0 && (enemyAlive.length === 0 || sectorsHeld >= 2);
    const store = useGameStore.getState();
    store.resolveBattle({ victory, casualties, sectorsHeld });

    this.statusText.setText(
      victory
        ? `Victory. Sector control bonus applied (${sectorsHeld}).`
        : "Defeat. Rebuild your force and adapt formation."
    );

    if (victory) {
      this.statusText.setColor("#9bf3de");
    } else {
      this.statusText.setColor("#ffacaa");
    }

    this.time.delayedCall(1200, () => {
      this.statusText.setColor("#d8f3f0");
      const { resources } = useGameStore.getState();
      this.statusText.setText(
        `Build phase active. ${RESOURCE_LABELS.food}: ${Math.floor(resources.food)} | ${RESOURCE_LABELS.materials}: ${Math.floor(resources.materials)}`
      );
      this.clearBattlefield();
    });
  }
}
