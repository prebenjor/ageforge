import { memo } from "react";
import type { DerivedStats, GameState } from "../game/types";

interface StatusPanelProps {
  state: GameState;
  stats: DerivedStats;
}

export const StatusPanel = memo(function StatusPanel({ state, stats }: StatusPanelProps): JSX.Element {
  return (
    <section className="panel status">
      <div className="chip-grid">
        <article className="chip">
          <span className="muted">Night</span>
          <strong>{stats.night}</strong>
        </article>
        <article className="chip">
          <span className="muted">Exposure</span>
          <strong>{`${Math.round(state.exposure)}%`}</strong>
        </article>
        <article className="chip">
          <span className="muted">Breaches</span>
          <strong>{state.breaches}</strong>
        </article>
        <article className="chip">
          <span className="muted">Omen Shift</span>
          <strong>{`${Math.ceil(state.omenShiftIn)}s`}</strong>
        </article>
        <article className="chip">
          <span className="muted">Hunt</span>
          <strong>{state.huntRemaining > 0 ? `${Math.ceil(state.huntRemaining)}s` : "Idle"}</strong>
        </article>
      </div>
      <div className="exposure-rail">
        <div
          className={`exposure-fill ${state.exposure >= 75 ? "danger" : state.exposure >= 45 ? "warn" : ""}`}
          style={{ width: `${state.exposure}%` }}
        />
      </div>
    </section>
  );
});
