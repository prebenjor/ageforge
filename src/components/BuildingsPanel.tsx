import { memo } from "react";
import { BUILDINGS, RESOURCE_LABELS, RESOURCES } from "../game/content";
import { canAfford, getBuildingCost } from "../game/engine";
import type { DerivedStats, GameState } from "../game/types";
import { formatNumber } from "../game/utils";

interface BuildingsPanelProps {
  state: GameState;
  stats: DerivedStats;
  onBuyBuilding: (buildingId: string) => void;
}

export const BuildingsPanel = memo(function BuildingsPanel({
  state,
  stats,
  onBuyBuilding
}: BuildingsPanelProps): JSX.Element {
  return (
    <section className="panel column">
      <h2>Station Engine</h2>
      <p className="muted">
        Production/s: +{formatNumber(stats.productionPerSecond.staticGain)} Static | +
        {formatNumber(stats.productionPerSecond.fearGain)} Fear | +{formatNumber(stats.productionPerSecond.inkGain)} Ink
      </p>
      <p className="muted">
        Exposure/s: +{formatNumber(stats.productionPerSecond.exposureDrift)} / -
        {formatNumber(stats.productionPerSecond.exposureControl)}
      </p>
      <div className="stack">
        {BUILDINGS.map((building) => {
          const count = state.buildings[building.id] ?? 0;
          const cost = getBuildingCost(building, count);
          const affordable = canAfford(state.resources, cost);
          return (
            <article key={building.id} className="card">
              <div className="row">
                <strong>{building.name}</strong>
                <span>x{count}</span>
              </div>
              <p className="muted">{building.lore}</p>
              <p className="muted">
                Cost: {RESOURCES.map((resource) => {
                  const amount = cost[resource];
                  return amount ? `${formatNumber(amount)} ${RESOURCE_LABELS[resource]}` : null;
                })
                  .filter(Boolean)
                  .join(" | ")}
              </p>
              <button disabled={!affordable} onClick={() => onBuyBuilding(building.id)}>
                Install
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
});
