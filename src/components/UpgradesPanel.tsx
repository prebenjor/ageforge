import { memo } from "react";
import { RESOURCE_LABELS, RESOURCES, UPGRADES } from "../game/content";
import { canAfford } from "../game/engine";
import type { GameState } from "../game/types";
import { formatNumber } from "../game/utils";

interface UpgradesPanelProps {
  state: GameState;
  onStartHunt: () => void;
  onBuyUpgrade: (upgradeId: string) => void;
}

export const UpgradesPanel = memo(function UpgradesPanel({
  state,
  onStartHunt,
  onBuyUpgrade
}: UpgradesPanelProps): JSX.Element {
  return (
    <section className="panel column">
      <h2>Upgrades & Hunts</h2>
      <button disabled={state.huntRemaining > 0 || state.resources.ink < 25} onClick={onStartHunt}>
        {state.huntRemaining > 0 ? `Hunt Active (${Math.ceil(state.huntRemaining)}s)` : "Start Night Hunt (25 Ink)"}
      </button>
      <div className="stack">
        {UPGRADES.map((upgrade) => {
          const purchased = state.upgrades[upgrade.id];
          const affordable = canAfford(state.resources, upgrade.cost);
          return (
            <article key={upgrade.id} className={`card ${purchased ? "card-active" : ""}`}>
              <div className="row">
                <strong>{upgrade.name}</strong>
                <span>{purchased ? "Unlocked" : "Locked"}</span>
              </div>
              <p className="muted">{upgrade.lore}</p>
              <p className="muted">
                Cost: {RESOURCES.map((resource) => {
                  const amount = upgrade.cost[resource];
                  return amount ? `${formatNumber(amount)} ${RESOURCE_LABELS[resource]}` : null;
                })
                  .filter(Boolean)
                  .join(" | ")}
              </p>
              <button disabled={purchased || !affordable} onClick={() => onBuyUpgrade(upgrade.id)}>
                {purchased ? "Owned" : "Etch Upgrade"}
              </button>
            </article>
          );
        })}
      </div>

      <h3>Station Log</h3>
      <ul className="log-list">
        {state.logs.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ul>
      <p className="muted">{state.dirty ? "Unsaved changes." : "All changes saved."}</p>
    </section>
  );
});
