import { useEffect, useMemo, useRef, useState } from "react";
import {
  AGES,
  COMMAND_COOLDOWNS,
  FORMATIONS,
  PREP_ACTIONS_PER_CYCLE,
  PREP_OPERATIONS,
  RESOURCE_LABELS,
  RESOURCE_ORDER,
  UNIT_CONFIGS,
  computeBattleModifiers,
  getUnitCapByAge
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

  const ageIndex = useGameStore((state) => state.ageIndex);
  const resources = useGameStore((state) => state.resources);
  const rates = useGameStore((state) => state.rates);
  const army = useGameStore((state) => state.army);
  const formation = useGameStore((state) => state.formation);
  const prepActionsRemaining = useGameStore((state) => state.prepActionsRemaining);
  const usedOperations = useGameStore((state) => state.usedOperations);
  const battleBuff = useGameStore((state) => state.battleBuff);
  const phase = useGameStore((state) => state.phase);
  const battleTimer = useGameStore((state) => state.battleTimer);
  const worldTime = useGameStore((state) => state.worldTime);
  const commandReadyAt = useGameStore((state) => state.commandCooldownReadyAt);
  const pendingTargetCommand = useGameStore((state) => state.pendingTargetCommand);
  const logs = useGameStore((state) => state.logs);
  const lastReport = useGameStore((state) => state.lastReport);
  const lifetime = useGameStore((state) => state.lifetime);
  const dirty = useGameStore((state) => state.dirty);

  const trainUnit = useGameStore((state) => state.trainUnit);
  const disbandUnit = useGameStore((state) => state.disbandUnit);
  const setFormation = useGameStore((state) => state.setFormation);
  const runPrepOperation = useGameStore((state) => state.runPrepOperation);
  const passPrepAction = useGameStore((state) => state.passPrepAction);
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

  const visibleResources = useMemo(() => getVisibleResources(ageIndex), [ageIndex]);
  const visibleUnits = useMemo(() => UNIT_CONFIGS.filter((unit) => ageIndex >= unit.unlockAge), [ageIndex]);
  const nextAge = ageIndex < AGES.length - 1 ? AGES[ageIndex + 1] : null;

  const progress = useMemo(() => {
    if (!nextAge) {
      return 1;
    }
    const entries = Object.entries(nextAge.requirements);
    if (!entries.length) {
      return 1;
    }
    let sum = 0;
    for (const [resource, amount] of entries) {
      const key = resource as ResourceKey;
      sum += Math.min(1, lifetime[key] / (amount ?? 1));
    }
    return sum / entries.length;
  }, [lifetime, nextAge]);

  const armyCount = Object.values(army).reduce((sum, value) => sum + value, 0);
  const unitCap = getUnitCapByAge(ageIndex);
  const battleMods = useMemo(() => computeBattleModifiers(army, formation), [army, formation]);
  const activePrepNotes = battleBuff.notes;
  const commandCooldownLeft = (kind: CommandKind): number => Math.max(0, Math.ceil(commandReadyAt[kind] - worldTime));

  return (
    <div className="app-shell">
      <header className="topbar panel">
        <div>
          <p className="kicker">Ageforge Command Front</p>
          <h1>{AGES[ageIndex].name}</h1>
          <p className="muted">
            Run prep operations, commit your formation, then command autobattler battles with RTS calls.
          </p>
        </div>
        <div className="topbar-actions">
          <button onClick={() => saveNow()}>Save</button>
          <button onClick={() => reset()}>Reset</button>
        </div>
      </header>

      <section className="panel progress-panel">
        <div className="progress-head">
          <span>{nextAge ? `Next: ${nextAge.name}` : "Final age unlocked"}</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="progress-rail">
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        {nextAge && (
          <p className="muted">
            {Object.entries(nextAge.requirements)
              .map(([resource, need]) => {
                const key = resource as ResourceKey;
                return `${RESOURCE_LABELS[key]} ${format(lifetime[key])}/${format(need ?? 0)}`;
              })
              .join(" | ")}
          </p>
        )}
      </section>

      <main className="layout">
        <section className="panel column">
          <h2>War Room</h2>
          <div className="resource-grid">
            {visibleResources.map((resource) => (
              <article key={resource} className="resource-card">
                <p className="muted">{RESOURCE_LABELS[resource]}</p>
                <p className="value">{format(resources[resource])}</p>
                <p className="muted">{`${rates[resource] >= 0 ? "+" : ""}${format(rates[resource])}/s (passive disabled)`}</p>
              </article>
            ))}
          </div>

          <h3>Preparation Operations</h3>
          <p className="muted">{`Prep actions remaining: ${prepActionsRemaining}/${PREP_ACTIONS_PER_CYCLE}`}</p>
          <div className="stack">
            {PREP_OPERATIONS.map((operation) => {
              const used = usedOperations.includes(operation.id);
              return (
                <article key={operation.id} className="card">
                  <div className="row">
                    <strong>{operation.name}</strong>
                    <span>{used ? "Used" : "Ready"}</span>
                  </div>
                  <p className="muted">{operation.description}</p>
                  <p className="muted">
                    {operation.resourceGain ? `Gain: ${costLabel(operation.resourceGain)}.` : "No direct resource gain."}
                    {operation.note ? ` ${operation.note}` : ""}
                  </p>
                  <button
                    disabled={phase !== "build" || prepActionsRemaining <= 0 || used}
                    onClick={() => runPrepOperation(operation.id)}
                  >
                    Execute Operation
                  </button>
                </article>
              );
            })}
            <button disabled={phase !== "build" || prepActionsRemaining <= 0} onClick={() => passPrepAction()}>
              Hold Position (consume prep point)
            </button>
          </div>
        </section>

        <section className="panel battle-column">
          <div className="row">
            <h2>Battle Theater</h2>
            <span className={`phase-chip ${phase}`}>{phase === "battle" ? `${Math.ceil(battleTimer)}s` : "Build"}</span>
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
            <button
              disabled={phase === "battle" || armyCount === 0 || prepActionsRemaining > 0}
              onClick={() => startBattle()}
            >
              Start Battle
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

          {phase === "build" && prepActionsRemaining > 0 && (
            <p className="muted">{`Spend ${prepActionsRemaining} more prep action(s) before launching battle.`}</p>
          )}
          <p className="muted">RTS command cooldowns: Rally {COMMAND_COOLDOWNS.rally}s, Retreat {COMMAND_COOLDOWNS.retreat}s, Overdrive {COMMAND_COOLDOWNS.overdrive}s.</p>
          <p className="report">{lastReport}</p>
        </section>

        <section className="panel column">
          <h2>Army</h2>
          <p className="muted">Units {armyCount}/{unitCap}</p>
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
            {visibleUnits.map((unit) => {
              const count = army[unit.id] ?? 0;
              return (
                <article key={unit.id} className="card">
                  <div className="row">
                    <strong>{unit.name}</strong>
                    <span>x{count}</span>
                  </div>
                  <p className="muted">
                    {unit.role} | HP {unit.hp} | DMG {unit.damage} | RNG {unit.range}
                  </p>
                  <p className="muted">Cost: {costLabel(unit.cost)}</p>
                  <div className="row">
                    <button disabled={!canAfford(resources, unit.cost) || armyCount >= unitCap} onClick={() => trainUnit(unit.id)}>
                      Train
                    </button>
                    <button disabled={count <= 0 || phase === "battle"} onClick={() => disbandUnit(unit.id)}>
                      Disband
                    </button>
                  </div>
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
