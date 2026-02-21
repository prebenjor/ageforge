import { useEffect, useMemo, useRef, useState } from "react";
import {
  COMMAND_COOLDOWNS,
  FORMATIONS,
  MAX_LEVEL,
  PREP_OPERATIONS,
  RESOURCE_LABELS,
  RESOURCE_ORDER,
  UNIT_CONFIGS,
  XP_PURCHASE_COST,
  XP_PURCHASE_GAIN,
  computeBattleModifiers,
  getStageThreatLabel,
  getUnitCapByLevel,
  getXpRequiredForLevel
} from "./game/config";
import { getVisibleResources, useGameStore } from "./game/store";
import type { CommandKind, ResourceKey } from "./game/types";

const STEP = 0.05;
const AUTOSAVE_INTERVAL = 15;

function format(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1000) {
    return value.toFixed(abs >= 100 ? 0 : 1);
  }
  const suffixes = ["K", "M", "B", "T"];
  let index = -1;
  let current = abs;
  while (current >= 1000 && index < suffixes.length - 1) {
    current /= 1000;
    index += 1;
  }
  return `${value < 0 ? "-" : ""}${current.toFixed(current >= 100 ? 0 : 1)}${suffixes[index]}`;
}

function canAfford(resources: Record<ResourceKey, number>, cost: Partial<Record<ResourceKey, number>>): boolean {
  return RESOURCE_ORDER.every((resource) => resources[resource] >= (cost[resource] ?? 0));
}

function costLabel(cost: Partial<Record<ResourceKey, number>>): string {
  const parts: string[] = [];
  for (const resource of RESOURCE_ORDER) {
    const value = cost[resource];
    if (!value) {
      continue;
    }
    parts.push(`${format(value)} ${RESOURCE_LABELS[resource]}`);
  }
  return parts.join(" | ");
}

export default function App(): JSX.Element {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const phaserGameRef = useRef<{ destroy: (removeCanvas: boolean, noReturn?: boolean) => void } | null>(null);
  const [sceneReady, setSceneReady] = useState(false);

  const stage = useGameStore((state) => state.stage);
  const level = useGameStore((state) => state.level);
  const xp = useGameStore((state) => state.xp);
  const commanderHp = useGameStore((state) => state.commanderHp);
  const resources = useGameStore((state) => state.resources);
  const army = useGameStore((state) => state.army);
  const shop = useGameStore((state) => state.shop);
  const shopLocked = useGameStore((state) => state.shopLocked);
  const formation = useGameStore((state) => state.formation);
  const directiveUsed = useGameStore((state) => state.directiveUsed);
  const battleBuff = useGameStore((state) => state.battleBuff);
  const phase = useGameStore((state) => state.phase);
  const battleTimer = useGameStore((state) => state.battleTimer);
  const worldTime = useGameStore((state) => state.worldTime);
  const commandReadyAt = useGameStore((state) => state.commandCooldownReadyAt);
  const pendingTargetCommand = useGameStore((state) => state.pendingTargetCommand);
  const logs = useGameStore((state) => state.logs);
  const lastReport = useGameStore((state) => state.lastReport);
  const winStreak = useGameStore((state) => state.winStreak);
  const loseStreak = useGameStore((state) => state.loseStreak);
  const dirty = useGameStore((state) => state.dirty);

  const refreshShop = useGameStore((state) => state.refreshShop);
  const toggleShopLock = useGameStore((state) => state.toggleShopLock);
  const buyShopUnit = useGameStore((state) => state.buyShopUnit);
  const buyXp = useGameStore((state) => state.buyXp);
  const disbandUnit = useGameStore((state) => state.disbandUnit);
  const setFormation = useGameStore((state) => state.setFormation);
  const runPrepOperation = useGameStore((state) => state.runPrepOperation);
  const beginTargetingCommand = useGameStore((state) => state.beginTargetingCommand);
  const cancelTargetingCommand = useGameStore((state) => state.cancelTargetingCommand);
  const startBattle = useGameStore((state) => state.startBattle);
  const issueCommand = useGameStore((state) => state.issueCommand);
  const load = useGameStore((state) => state.load);
  const saveNow = useGameStore((state) => state.saveNow);
  const reset = useGameStore((state) => state.reset);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let accumulator = 0;
    let autosaveAccumulator = 0;

    const loop = (now: number): void => {
      const delta = Math.min(0.25, (now - last) / 1000);
      last = now;
      accumulator += delta;
      autosaveAccumulator += delta;

      while (accumulator >= STEP) {
        useGameStore.getState().tick(STEP);
        accumulator -= STEP;
      }

      if (autosaveAccumulator >= AUTOSAVE_INTERVAL) {
        const state = useGameStore.getState();
        if (state.dirty) {
          state.saveNow();
        }
        autosaveAccumulator = 0;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }
    let disposed = false;
    setSceneReady(false);

    void import("./phaser/createBattleGame").then((module) => {
      if (disposed || !sceneRef.current) {
        return;
      }
      phaserGameRef.current = module.createBattleGame(sceneRef.current);
      setSceneReady(true);
    });

    return () => {
      disposed = true;
      phaserGameRef.current?.destroy(true);
      phaserGameRef.current = null;
      setSceneReady(false);
    };
  }, []);

  const visibleResources = useMemo(() => getVisibleResources(), []);
  const armyCount = Object.values(army).reduce((sum, value) => sum + value, 0);
  const unitCap = getUnitCapByLevel(level);
  const battleMods = useMemo(() => computeBattleModifiers(army, formation), [army, formation]);
  const activePrepNotes = battleBuff.notes;
  const commandCooldownLeft = (kind: CommandKind): number => Math.max(0, Math.ceil(commandReadyAt[kind] - worldTime));
  const xpToNext = getXpRequiredForLevel(level);
  const xpProgress = level >= MAX_LEVEL ? 1 : xpToNext > 0 ? Math.min(1, xp / xpToNext) : 0;
  const threat = getStageThreatLabel(stage);

  return (
    <div className="app-shell">
      <header className="topbar panel">
        <div>
          <p className="kicker">Autochess Command Node | Live Sync</p>
          <h1>Sector Run</h1>
          <p className="muted">
            Roll shop, field your roster, then command engagements with tactical RTS calls.
          </p>
        </div>
        <div className="topbar-actions">
          <button onClick={() => saveNow()}>Save</button>
          <button onClick={() => reset()}>Reset Run</button>
        </div>
      </header>

      <section className="panel progress-panel">
        <div className="status-grid">
          <article className="status-chip">
            <span className="muted">Stage</span>
            <strong>{stage}</strong>
          </article>
          <article className="status-chip">
            <span className="muted">Threat</span>
            <strong>{threat}</strong>
          </article>
          <article className="status-chip">
            <span className="muted">Command Lv</span>
            <strong>{level}</strong>
          </article>
          <article className="status-chip">
            <span className="muted">Commander HP</span>
            <strong>{commanderHp}%</strong>
          </article>
          <article className="status-chip">
            <span className="muted">Streak</span>
            <strong>{`${winStreak}W / ${loseStreak}L`}</strong>
          </article>
        </div>
        <div className="progress-head">
          <span>{level >= MAX_LEVEL ? "Max command level reached" : `XP ${format(xp)}/${format(xpToNext)}`}</span>
          <span>{Math.round(xpProgress * 100)}%</span>
        </div>
        <div className="progress-rail">
          <div className="progress-fill" style={{ width: `${xpProgress * 100}%` }} />
        </div>
      </section>

      <main className="layout">
        <section className="panel column">
          <h2>Economy</h2>
          <div className="resource-grid">
            {visibleResources.map((resource) => (
              <article key={resource} className="resource-card">
                <p className="muted">{RESOURCE_LABELS[resource]}</p>
                <p className="value">{format(resources[resource])}</p>
              </article>
            ))}
          </div>
          <div className="row controls">
            <button disabled={phase !== "build" || resources.credits < 2} onClick={() => refreshShop()}>
              Refresh Shop (-2)
            </button>
            <button disabled={phase !== "build" || level >= MAX_LEVEL || resources.credits < XP_PURCHASE_COST} onClick={() => buyXp()}>
              Buy XP (+{XP_PURCHASE_GAIN})
            </button>
            <button disabled={phase !== "build"} onClick={() => toggleShopLock()}>
              {shopLocked ? "Unlock Shop" : "Lock Shop"}
            </button>
          </div>

          <h3>Shop</h3>
          <div className="stack">
            {shop.map((unitId, slotIndex) => {
              if (!unitId) {
                return (
                  <article key={`empty-${slotIndex}`} className="card">
                    <div className="row">
                      <strong>Empty Slot</strong>
                      <span>#{slotIndex + 1}</span>
                    </div>
                  </article>
                );
              }
              const unit = UNIT_CONFIGS.find((entry) => entry.id === unitId);
              if (!unit) {
                return null;
              }
              return (
                <article key={`${unitId}-${slotIndex}`} className="card">
                  <div className="row">
                    <strong>{unit.name}</strong>
                    <span>{`Tier ${unit.tier}`}</span>
                  </div>
                  <p className="muted">{`${unit.role} | Trait ${unit.trait}`}</p>
                  <p className="muted">{`Cost: ${costLabel(unit.cost)}`}</p>
                  <button
                    disabled={phase !== "build" || !canAfford(resources, unit.cost) || armyCount >= unitCap}
                    onClick={() => buyShopUnit(slotIndex)}
                  >
                    Deploy From Shop
                  </button>
                </article>
              );
            })}
          </div>

          <h3>Tactical Directive</h3>
          <div className="stack">
            {PREP_OPERATIONS.map((operation) => (
              <article key={operation.id} className="card">
                <div className="row">
                  <strong>{operation.name}</strong>
                  <span>{directiveUsed ? "Used" : "Ready"}</span>
                </div>
                <p className="muted">{operation.description}</p>
                {operation.note && <p className="muted">{operation.note}</p>}
                <button disabled={phase !== "build" || directiveUsed} onClick={() => runPrepOperation(operation.id)}>
                  Prime Directive
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="panel battle-column">
          <div className="row">
            <h2>Battlefield</h2>
            <span className={`phase-chip ${phase}`}>{phase === "battle" ? `${Math.ceil(battleTimer)}s` : "Prep"}</span>
          </div>
          <div className={`scene-wrap ${pendingTargetCommand === "rally" ? "targeting" : ""}`}>
            <div ref={sceneRef} className="scene-host" />
            {!sceneReady ? (
              <p className="scene-overlay">Loading battle renderer...</p>
            ) : pendingTargetCommand === "rally" ? (
              <p className="scene-overlay">Click battlefield to place Rally target</p>
            ) : null}
          </div>

          <div className="row controls">
            <button disabled={phase === "battle" || armyCount === 0 || commanderHp <= 0} onClick={() => startBattle()}>
              Start Stage Battle
            </button>
            <button
              disabled={phase !== "battle" || (pendingTargetCommand !== "rally" && worldTime < commandReadyAt.rally)}
              onClick={() =>
                pendingTargetCommand === "rally" ? cancelTargetingCommand() : beginTargetingCommand("rally")
              }
            >
              {pendingTargetCommand === "rally"
                ? "Cancel Rally Target"
                : `Rally Target (${commandCooldownLeft("rally")}s)`}
            </button>
            <button
              disabled={phase !== "battle" || worldTime < commandReadyAt.retreat}
              onClick={() => issueCommand("retreat")}
            >
              Retreat ({commandCooldownLeft("retreat")}s)
            </button>
            <button
              disabled={phase !== "battle" || worldTime < commandReadyAt.overdrive}
              onClick={() => issueCommand("overdrive")}
            >
              Overdrive ({commandCooldownLeft("overdrive")}s)
            </button>
          </div>

          <p className="muted">
            RTS cooldowns: Rally {COMMAND_COOLDOWNS.rally}s, Retreat {COMMAND_COOLDOWNS.retreat}s, Overdrive{" "}
            {COMMAND_COOLDOWNS.overdrive}s.
          </p>
          <p className="report">{lastReport}</p>
        </section>

        <section className="panel column">
          <h2>Roster</h2>
          <p className="muted">Deployed Units {armyCount}/{unitCap}</p>

          <h3>Formation</h3>
          <div className="formation-grid">
            {FORMATIONS.map((option) => (
              <button
                key={option.id}
                className={`formation-btn ${formation === option.id ? "active" : ""}`}
                disabled={phase === "battle"}
                onClick={() => setFormation(option.id)}
              >
                <strong>{option.name}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>

          <div className="card">
            <strong>Active Modifiers</strong>
            <ul className="mods-list">
              {battleMods.labels.length || activePrepNotes.length ? (
                [...battleMods.labels, ...activePrepNotes].map((label) => <li key={label}>{label}</li>)
              ) : (
                <li>No active bonuses.</li>
              )}
            </ul>
          </div>

          <div className="stack">
            {UNIT_CONFIGS.map((unit) => {
              const count = army[unit.id] ?? 0;
              return (
                <article key={unit.id} className="card">
                  <div className="row">
                    <strong>{unit.name}</strong>
                    <span>x{count}</span>
                  </div>
                  <p className="muted">
                    {`Tier ${unit.tier} | ${unit.role} | Trait ${unit.trait}`}
                  </p>
                  <p className="muted">
                    HP {unit.hp} | DMG {unit.damage} | RNG {unit.range} | SPD {unit.speed}
                  </p>
                  <p className="muted">Cost: {costLabel(unit.cost)}</p>
                  <button disabled={count <= 0 || phase === "battle"} onClick={() => disbandUnit(unit.id)}>
                    Sell
                  </button>
                </article>
              );
            })}
          </div>

          <h3>Command Log</h3>
          <ul className="log-list">
            {logs.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ul>
          <p className="muted">{dirty ? "Unsaved changes." : "All changes saved."}</p>
        </section>
      </main>
    </div>
  );
}
