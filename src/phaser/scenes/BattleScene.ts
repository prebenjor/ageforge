import Phaser from "phaser";
import { BASE_BATTLE_BUFF, RESOURCE_LABELS, UNIT_CONFIGS, computeBattleModifiers, getEnemyWave } from "../../game/config";
import { useGameStore } from "../../game/store";
import type { BattleBuff, BattleCommand, BattleModifiers, UnitRole } from "../../game/types";

type Team = "ally" | "enemy";

interface UnitActor {
  actorId: number;
  unitId: string;
  role: UnitRole;
  team: Team;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  cooldown: number;
  cooldownLeft: number;
  radius: number;
  body: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  teamRing: Phaser.GameObjects.Arc;
  badge: Phaser.GameObjects.Image;
  hpBack: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  baseScale: number;
  forcedX: number | null;
  forcedY: number | null;
  forcedUntil: number;
  alive: boolean;
  dying: boolean;
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
const ROLE_KEYS: UnitRole[] = ["frontline", "ranged", "support", "siege"];
const ASSET_BASE = import.meta.env.BASE_URL;

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
  private allyMods: BattleModifiers = computeBattleModifiers({}, "line");
  private battleBuff: BattleBuff = { ...BASE_BATTLE_BUFF };
  private rallyMarker: Phaser.GameObjects.Arc | null = null;
  private running = false;

  constructor() {
    super("battle");
  }

  preload(): void {
    for (const unit of UNIT_CONFIGS) {
      this.load.svg(`unit-${unit.id}`, `${ASSET_BASE}assets/units/${unit.id}.svg`);
    }
    for (const role of ROLE_KEYS) {
      this.load.svg(`icon-${role}`, `${ASSET_BASE}assets/icons/role-${role}.svg`);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#11212b");
    this.add.rectangle(400, 300, 760, 500, 0x183340, 0.94).setStrokeStyle(1, 0x9ad5cc, 0.3);
    this.add.rectangle(400, 300, 2, 500, 0x91bccf, 0.34);

    for (const laneY of LANES) {
      this.add.line(400, laneY, 40, laneY, 760, laneY, 0x79a5af, 0.08);
    }

    this.statusText = this.add.text(18, 16, "Prep phase active.", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#d8f3f0"
    });

    this.timerText = this.add.text(650, 16, "00:00", {
      fontFamily: "Trebuchet MS",
      fontSize: "14px",
      color: "#d8f3f0"
    });

    for (const x of [240, 400, 560]) {
      const ring = this.add.circle(x, 300, 26, 0x607d8b, 0.22).setStrokeStyle(2, 0x84a8b5, 0.5);
      this.capturePoints.push({ x, y: 300, ring, owner: "neutral", progress: 0 });
    }

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const store = useGameStore.getState();
      if (store.phase !== "battle" || store.pendingTargetCommand !== "rally") {
        return;
      }
      const x = Phaser.Math.Clamp(pointer.x, 80, 720);
      const y = Phaser.Math.Clamp(pointer.y, 90, 520);
      store.issueCommand("rally", { x, y });
      this.flashRallyMarker(x, y);
    });
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

    const state = useGameStore.getState();
    this.startingArmy = { ...state.army };
    this.allyMods = computeBattleModifiers(state.army, state.formation);
    this.battleBuff = { ...BASE_BATTLE_BUFF, ...state.battleBuff, notes: [...(state.battleBuff.notes ?? [])] };

    this.statusText.setText(
      this.battleBuff.notes.length
        ? this.battleBuff.notes[0]
        : this.allyMods.labels[0] ?? "Engagement live. Secure sectors and collapse hostiles."
    );

    let laneIndex = 0;
    for (const [unitId, count] of Object.entries(state.army)) {
      for (let i = 0; i < count; i += 1) {
        const y = LANES[laneIndex % LANES.length] + Phaser.Math.Between(-16, 16);
        this.spawnUnit("ally", unitId, 120 + Phaser.Math.Between(-24, 24), y);
        laneIndex += 1;
      }
    }

    laneIndex = 0;
    for (const group of getEnemyWave(state.stage)) {
      for (let i = 0; i < group.count; i += 1) {
        const y = LANES[laneIndex % LANES.length] + Phaser.Math.Between(-16, 16);
        this.spawnUnit("enemy", group.unitId, 680 + Phaser.Math.Between(-24, 24), y);
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
      actor.shadow.destroy();
      actor.teamRing.destroy();
      actor.badge.destroy();
      actor.hpBack.destroy();
      actor.hpBar.destroy();
    }
    this.actors = [];
    this.rallyMarker?.destroy();
    this.rallyMarker = null;
  }

  private flashRallyMarker(x: number, y: number): void {
    this.rallyMarker?.destroy();
    this.rallyMarker = this.add.circle(x, y, 22, 0x7fe2c5, 0.16).setStrokeStyle(2, 0xaff5dd, 0.95).setDepth(30);
    this.tweens.add({
      targets: this.rallyMarker,
      radius: 42,
      alpha: 0,
      duration: 550,
      ease: "Sine.Out",
      onComplete: () => {
        this.rallyMarker?.destroy();
        this.rallyMarker = null;
      }
    });
  }

  private spawnUnit(team: Team, unitId: string, x: number, y: number): void {
    const config = unitById[unitId];
    if (!config) {
      return;
    }

    const role = config.role;
    const mods = team === "ally" ? this.allyMods : null;
    const hpMult = mods ? mods.hpMult * (mods.hpByRole[role] ?? 1) : 1;
    const damageMult = mods ? mods.damageMult * (mods.damageByRole[role] ?? 1) : 1;
    const speedMult = mods ? mods.speedMult * (mods.speedByRole[role] ?? 1) : 1;
    const rangeMult = mods ? mods.rangeMult * (mods.rangeByRole[role] ?? 1) : 1;
    const cooldownMult = mods ? mods.cooldownMult * (mods.cooldownByRole[role] ?? 1) : 1;
    const phaseHpMult = team === "ally" ? this.battleBuff.allyHpMult : this.battleBuff.enemyHpMult;
    const phaseDamageMult = team === "ally" ? this.battleBuff.allyDamageMult : this.battleBuff.enemyDamageMult;
    const phaseSpeedMult = team === "ally" ? this.battleBuff.allySpeedMult : 1;
    const phaseRangeMult = team === "ally" ? this.battleBuff.allyRangeMult : 1;
    const phaseCooldownMult = team === "ally" ? this.battleBuff.allyCooldownMult : 1;

    const maxHp = config.hp * hpMult * phaseHpMult;
    const damage = config.damage * damageMult * phaseDamageMult;
    const speed = config.speed * speedMult * phaseSpeedMult;
    const range = config.range * rangeMult * phaseRangeMult;
    const cooldown = config.cooldown * cooldownMult * phaseCooldownMult;

    const texture = `unit-${unitId}`;
    const display = config.radius * 3.3;
    const shadow = this.add.ellipse(x, y + config.radius + 4, display * 0.66, config.radius * 0.95, 0x071014, 0.45).setDepth(6);
    const teamColor = team === "ally" ? 0x7fe2c5 : 0xf08d8b;
    const ringColor = team === "ally" ? 0x99f5de : 0xffb5b2;

    const body = this.add.image(x, y, texture).setDisplaySize(display, display).setDepth(10);
    body.setTint(teamColor);

    const teamRing = this.add.circle(x, y, config.radius + 6, 0x000000, 0).setDepth(9).setStrokeStyle(2, ringColor, 0.9);
    const badge = this.add.image(x, y - config.radius - 14, `icon-${role}`).setDisplaySize(14, 14).setDepth(13);
    badge.setTint(team === "ally" ? 0xcafdf2 : 0xffd7d5);

    const hpBack = this.add.rectangle(x, y - config.radius - 7, config.radius * 2.2, 4, 0x20303a, 0.9).setDepth(11);
    const hpBar = this.add.rectangle(x, y - config.radius - 7, config.radius * 2.2, 4, team === "ally" ? 0x99e6d8 : 0xf7a8a5, 0.95).setDepth(12);

    this.lastActorId += 1;
    this.actors.push({
      actorId: this.lastActorId,
      unitId,
      role,
      team,
      hp: maxHp,
      maxHp,
      damage,
      range,
      speed,
      cooldown,
      cooldownLeft: Phaser.Math.FloatBetween(0, cooldown * 0.6),
      radius: config.radius,
      body,
      shadow,
      teamRing,
      badge,
      hpBack,
      hpBar,
      baseScale: 1,
      forcedX: null,
      forcedY: null,
      forcedUntil: 0,
      alive: true,
      dying: false
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
    const allies = this.actors.filter((actor) => actor.alive && !actor.dying && actor.team === "ally");
    if (!allies.length) {
      return;
    }

    if (command.kind === "overdrive") {
      this.overdriveUntil = now + 8;
      this.statusText.setText("Overdrive active: allied cadence increased.");
      return;
    }

    if (command.kind === "rally") {
      const rallyX = Phaser.Math.Clamp(command.target?.x ?? 420, 110, 690);
      const rallyY = Phaser.Math.Clamp(command.target?.y ?? LANES[2], 100, 500);
      this.flashRallyMarker(rallyX, rallyY);
      for (const actor of allies) {
        actor.forcedX = rallyX;
        actor.forcedY = rallyY;
        actor.forcedUntil = now + 5;
      }
      this.statusText.setText("Rally order: moving to target marker.");
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
      if (!actor.alive || actor.dying || !actor.body.active) {
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
      } else if (actor.cooldownLeft <= 0 && target.alive && !target.dying) {
        const overdriveMultiplier = actor.team === "ally" && this.overdriveUntil > now ? 1.35 : 1;
        this.spawnAttackFx(actor, target);
        target.hp -= actor.damage * overdriveMultiplier;
        this.flashHit(target);
        actor.cooldownLeft = actor.cooldown * (actor.team === "ally" && this.overdriveUntil > now ? 0.72 : 1);
        if (target.hp <= 0) {
          this.killActor(target);
        }
      }

      const bob = 1 + Math.sin(now * 5 + actor.actorId * 0.5) * 0.018;
      actor.body.setScale(actor.baseScale * bob);
      actor.body.x = Phaser.Math.Clamp(actor.body.x, 30, 770);
      actor.body.y = Phaser.Math.Clamp(actor.body.y, 90, 520);
      actor.shadow.setPosition(actor.body.x, actor.body.y + actor.radius + 4);
      actor.teamRing.setPosition(actor.body.x, actor.body.y);
      actor.badge.setPosition(actor.body.x, actor.body.y - actor.radius - 14);
      actor.hpBack.setPosition(actor.body.x, actor.body.y - actor.radius - 7);
      actor.hpBar.setPosition(actor.body.x, actor.body.y - actor.radius - 7);
      actor.hpBar.width = (Math.max(0, actor.hp) / actor.maxHp) * actor.radius * 2.2;
    }

    this.updateCapturePoints(dt);
  }

  private spawnAttackFx(attacker: UnitActor, target: UnitActor): void {
    const projectileColor = attacker.team === "ally" ? 0xaef8e6 : 0xffc4c2;
    if (attacker.role === "frontline") {
      this.tweens.add({
        targets: attacker.body,
        scaleX: attacker.baseScale * 1.09,
        scaleY: attacker.baseScale * 0.95,
        yoyo: true,
        duration: 70
      });
      return;
    }

    const radius = attacker.role === "siege" ? 5 : attacker.role === "ranged" ? 3 : 2.5;
    const projectile = this.add.circle(attacker.body.x, attacker.body.y, radius, projectileColor, 0.95).setDepth(20);
    const duration = attacker.role === "siege" ? 190 : 120;

    this.tweens.add({
      targets: projectile,
      x: target.body.x,
      y: target.body.y,
      ease: "Linear",
      duration,
      onComplete: () => {
        projectile.destroy();
        if (attacker.role === "siege") {
          const blast = this.add.circle(target.body.x, target.body.y, 9, projectileColor, 0.25).setDepth(19);
          this.tweens.add({
            targets: blast,
            radius: 24,
            alpha: 0,
            duration: 180,
            onComplete: () => blast.destroy()
          });
        }
      }
    });
  }

  private flashHit(target: UnitActor): void {
    if (!target.body.active) {
      return;
    }
    target.body.setTintFill(0xffffff);
    this.time.delayedCall(70, () => {
      if (target.body.active) {
        target.body.clearTint();
        target.body.setTint(target.team === "ally" ? 0x7fe2c5 : 0xf08d8b);
      }
    });
  }

  private killActor(actor: UnitActor): void {
    if (actor.dying || !actor.alive) {
      return;
    }
    actor.alive = false;
    actor.dying = true;

    this.tweens.add({
      targets: [actor.body, actor.teamRing, actor.shadow, actor.badge, actor.hpBack, actor.hpBar],
      alpha: 0,
      scaleX: 0.78,
      scaleY: 0.78,
      duration: 190,
      onComplete: () => {
        actor.body.destroy();
        actor.teamRing.destroy();
        actor.shadow.destroy();
        actor.badge.destroy();
        actor.hpBack.destroy();
        actor.hpBar.destroy();
      }
    });
  }

  private updateCapturePoints(dt: number): void {
    for (const point of this.capturePoints) {
      let allyNearby = 0;
      let enemyNearby = 0;
      for (const actor of this.actors) {
        if (!actor.alive || actor.dying) {
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
        point.ring.setStrokeStyle(2, 0xb8f4e4, 0.95);
      } else if (point.owner === "enemy") {
        point.ring.setFillStyle(0xd88484, 0.42);
        point.ring.setStrokeStyle(2, 0xf8b2b2, 0.95);
      } else {
        point.ring.setFillStyle(0x607d8b, 0.22);
        point.ring.setStrokeStyle(2, 0x84a8b5, 0.5);
      }
    }
  }

  private findTarget(source: UnitActor): UnitActor | null {
    const candidates = this.actors.filter(
      (actor) => actor.alive && !actor.dying && actor.team !== source.team && actor.body.active
    );
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
    const allyAlive = this.actors.some((actor) => actor.alive && !actor.dying && actor.team === "ally");
    const enemyAlive = this.actors.some((actor) => actor.alive && !actor.dying && actor.team === "enemy");
    return !allyAlive || !enemyAlive;
  }

  private finishBattle(): void {
    if (!this.running) {
      return;
    }
    this.running = false;

    const allyAlive = this.actors.filter((actor) => actor.alive && !actor.dying && actor.team === "ally");
    const enemyAlive = this.actors.filter((actor) => actor.alive && !actor.dying && actor.team === "enemy");
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
    useGameStore.getState().resolveBattle({ victory, casualties, sectorsHeld });

    this.statusText.setText(
      victory
        ? `Victory. Sector control bonus applied (${sectorsHeld}).`
        : "Defeat. Recompose roster and revise formation."
    );
    this.statusText.setColor(victory ? "#9bf3de" : "#ffacaa");

    this.time.delayedCall(1200, () => {
      this.statusText.setColor("#d8f3f0");
      const { resources } = useGameStore.getState();
      this.statusText.setText(
        `Prep phase active. ${RESOURCE_LABELS.credits}: ${Math.floor(resources.credits)} | ${RESOURCE_LABELS.intel}: ${Math.floor(resources.intel)}`
      );
      this.clearBattlefield();
    });
  }
}
