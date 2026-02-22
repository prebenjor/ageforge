import { useCallback, useMemo } from "react";
import { ResourceGrid } from "./components/ResourceGrid";
import { BuildingsPanel } from "./components/BuildingsPanel";
import { RitualPanel } from "./components/RitualPanel";
import { StatusPanel } from "./components/StatusPanel";
import { UpgradesPanel } from "./components/UpgradesPanel";
import { deriveStats } from "./game/selectors";
import type { ManualRitualKind } from "./game/types";
import { useHorrorGame } from "./hooks/useHorrorGame";

export default function App(): JSX.Element {
  const { state, dispatch, saveNow, reset } = useHorrorGame();
  const stats = useMemo(() => deriveStats(state), [state]);

  const onRitual = useCallback(
    (kind: ManualRitualKind): void => {
      dispatch({ type: "manual_ritual", kind });
    },
    [dispatch]
  );

  const onRotateSigil = useCallback(
    (index: number): void => {
      dispatch({ type: "rotate_sigil", index });
    },
    [dispatch]
  );

  const onBuyBuilding = useCallback(
    (buildingId: string): void => {
      dispatch({ type: "buy_building", buildingId });
    },
    [dispatch]
  );

  const onBuyUpgrade = useCallback(
    (upgradeId: string): void => {
      dispatch({ type: "buy_upgrade", upgradeId });
    },
    [dispatch]
  );

  const onStartHunt = useCallback((): void => {
    dispatch({ type: "start_hunt" });
  }, [dispatch]);

  return (
    <div className="shell">
      <header className="panel header">
        <div>
          <p className="kicker">BLACK SIGNAL</p>
          <h1>The Vigil Station</h1>
          <p className="muted">
            A horror incremental game about tuning cursed frequencies, surviving exposure, and harvesting relics.
          </p>
        </div>
        <div className="header-actions">
          <button onClick={saveNow}>Save</button>
          <button onClick={reset}>Reset</button>
        </div>
      </header>

      <StatusPanel state={state} stats={stats} />

      <main className="layout">
        <section className="panel column">
          <h2>Resources</h2>
          <ResourceGrid resources={state.resources} />
        </section>

        <RitualPanel state={state} stats={stats} onRitual={onRitual} onRotateSigil={onRotateSigil} />

        <BuildingsPanel state={state} stats={stats} onBuyBuilding={onBuyBuilding} />

        <UpgradesPanel state={state} onStartHunt={onStartHunt} onBuyUpgrade={onBuyUpgrade} />
      </main>
    </div>
  );
}
