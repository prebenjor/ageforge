import { useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_TOWER_LEVEL,
  PAD_LAYOUT,
  RESOURCE_LABELS,
  RESOURCE_ORDER,
  TOWER_CONFIGS,
  WAVE_DURATION,
  getTowerStats,
  getTowerUpgradeCost,
  getWaveSummary
} from "./game/config";
import { getVisibleResources, useGameStore } from "./game/store";
import type { ResourceKey } from "./game/types";

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

  const wave = useGameStore((state) => state.wave);
  const phase = useGameStore((state) => state.phase);
  const lives = useGameStore((state) => state.lives);
  const income = useGameStore((state) => state.income);
  const resources = useGameStore((state) => state.resources);
  const board = useGameStore((state) => state.board);
  const selectedTowerId = useGameStore((state) => state.selectedTowerId);
  const battleTimer = useGameStore((state) => state.battleTimer);
  const battleTelemetry = useGameStore((state) => state.battleTelemetry);
  const logs = useGameStore((state) => state.logs);
  const lastReport = useGameStore((state) => state.lastReport);
  const dirty = useGameStore((state) => state.dirty);

  const selectTower = useGameStore((state) => state.selectTower);
  const upgradeTower = useGameStore((state) => state.upgradeTower);
  const sellTower = useGameStore((state) => state.sellTower);
  const startWave = useGameStore((state) => state.startWave);
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

  useEffect(() => {
    const towerHotkeys = TOWER_CONFIGS.slice(0, 4).map((tower) => tower.id);
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const digitMatch = event.code.match(/^(Digit|Numpad)([1-4])$/);
      if (digitMatch) {
        const index = Number(digitMatch[2]) - 1;
        const towerId = towerHotkeys[index];
        if (towerId) {
          useGameStore.getState().selectTower(towerId);
        }
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        useGameStore.getState().startWave();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const visibleResources = useMemo(() => getVisibleResources(), []);
  const builtTowers = useMemo(() => {
    const entries = Object.values(board).filter((slot): slot is NonNullable<typeof slot> => Boolean(slot));
    return entries.sort((a, b) => a.padId - b.padId);
  }, [board]);

  const waveSummary = useMemo(() => getWaveSummary(wave), [wave]);
  const selectedName = selectedTowerId ? TOWER_CONFIGS.find((tower) => tower.id === selectedTowerId)?.name : null;
  const phaseLabel = phase === "gameover" ? "Game Over" : phase === "battle" ? "Battle" : "Build";

  return (
    <div className="app-shell">
      <header className="topbar panel">
        <div>
          <p className="kicker">Ironfront Bastion</p>
          <h1>Legion Rift Defense</h1>
          <p className="muted">
            Warcraft III and Legion TD inspired lane defense. Select towers, place on pads, and hold the line.
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
            <span className="muted">Wave</span>
            <strong>{wave}</strong>
          </article>
          <article className="status-chip">
            <span className="muted">Lives</span>
            <strong>{lives}</strong>
          </article>
          <article className="status-chip">
            <span className="muted">Income</span>
            <strong>{`${income}/wave`}</strong>
          </article>
          <article className="status-chip">
            <span className="muted">Phase</span>
            <strong>{phaseLabel}</strong>
          </article>
          <article className="status-chip">
            <span className="muted">Timer</span>
            <strong>{phase === "battle" ? `${Math.ceil(battleTimer)}s` : `${WAVE_DURATION}s`}</strong>
          </article>
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

          <h3>Tower Deck</h3>
          <div className="stack">
            {TOWER_CONFIGS.map((tower) => {
              const stats = getTowerStats(tower.id, 1);
              const selected = selectedTowerId === tower.id;
              return (
                <article key={tower.id} className={`card tower-pick ${selected ? "active" : ""}`}>
                  <div className="row">
                    <strong>{tower.name}</strong>
                    <span>{tower.role}</span>
                  </div>
                  <p className="muted">{tower.description}</p>
                  <p className="muted">Cost: {costLabel(tower.cost)}</p>
                  <p className="muted statline">
                    DMG {stats.damage} | RNG {stats.range} | CD {stats.cooldown}s
                  </p>
                  <button
                    className={selected ? "pill active" : "pill"}
                    disabled={phase !== "build"}
                    onClick={() => selectTower(selected ? null : tower.id)}
                  >
                    {selected ? "Selected" : "Select"}
                  </button>
                </article>
              );
            })}
            <button disabled={phase !== "build"} onClick={() => selectTower(null)}>
              Clear Selection
            </button>
          </div>
        </section>

        <section className="panel battle-column">
          <div className="row">
            <h2>Battlefield</h2>
            <span className={`phase-chip ${phase}`}>{phaseLabel}</span>
          </div>
          <div className="scene-wrap">
            <div ref={sceneRef} className="scene-host" />
            {!sceneReady ? (
              <p className="scene-overlay">Loading tower defense renderer...</p>
            ) : phase === "build" ? (
              <p className="scene-overlay">
                {selectedName
                  ? `Click a pad to build or upgrade ${selectedName}.`
                  : "Select a tower from the deck, then click a pad."}
              </p>
            ) : null}
          </div>

          <div className="row controls">
            <button disabled={phase !== "build" || builtTowers.length === 0 || lives <= 0} onClick={() => startWave()}>
              Start Wave {wave}
            </button>
            <span className="muted">{`Kills ${battleTelemetry.kills} | Leaks ${battleTelemetry.leaks}`}</span>
          </div>
          <p className="muted">
            {`Active enemies ${battleTelemetry.remaining} | Incoming ${battleTelemetry.incoming} | Bounty +${format(
              battleTelemetry.goldEarned
            )} Gold`}
          </p>
          <p className="muted">Hotkeys: `1-4` select tower, `Space` starts wave.</p>
          <p className="report">{lastReport}</p>
        </section>

        <section className="panel column">
          <h2>Build Pads</h2>
          <p className="muted">{`Placed towers ${builtTowers.length}/${PAD_LAYOUT.length}`}</p>

          <div className="card">
            <strong>Incoming Wave Intel</strong>
            <p className="muted">{waveSummary}</p>
          </div>

          <div className="stack">
            {builtTowers.length === 0 ? (
              <article className="card">
                <p className="muted">No towers deployed yet.</p>
              </article>
            ) : (
              builtTowers.map((slot) => {
                const tower = TOWER_CONFIGS.find((entry) => entry.id === slot.towerId);
                if (!tower) {
                  return null;
                }
                const pad = PAD_LAYOUT.find((entry) => entry.id === slot.padId);
                const stats = getTowerStats(slot.towerId, slot.level);
                const upgradeCost = slot.level < MAX_TOWER_LEVEL ? getTowerUpgradeCost(slot.towerId, slot.level) : null;
                const canUpgrade = Boolean(upgradeCost && canAfford(resources, upgradeCost));

                return (
                  <article key={`${slot.padId}-${slot.towerId}`} className="card">
                    <div className="row">
                      <strong>{tower.name}</strong>
                      <span>{`T${slot.level}`}</span>
                    </div>
                    <p className="muted">{pad?.label ?? `Pad ${slot.padId + 1}`}</p>
                    <p className="muted statline">
                      DMG {stats.damage} | RNG {stats.range} | CD {stats.cooldown}s
                    </p>
                    <div className="row">
                      <button
                        disabled={phase !== "build" || slot.level >= MAX_TOWER_LEVEL || !canUpgrade}
                        onClick={() => upgradeTower(slot.padId)}
                      >
                        {slot.level >= MAX_TOWER_LEVEL
                          ? "Max"
                          : `Upgrade${upgradeCost ? ` (${costLabel(upgradeCost)})` : ""}`}
                      </button>
                      <button disabled={phase !== "build"} onClick={() => sellTower(slot.padId)}>
                        Sell
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <h3>War Log</h3>
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
