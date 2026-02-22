import { memo } from "react";
import { GLYPHS } from "../game/content";
import type { DerivedStats, GameState, ManualRitualKind } from "../game/types";

interface RitualPanelProps {
  state: GameState;
  stats: DerivedStats;
  onRitual: (kind: ManualRitualKind) => void;
  onRotateSigil: (index: number) => void;
}

export const RitualPanel = memo(function RitualPanel({
  state,
  stats,
  onRitual,
  onRotateSigil
}: RitualPanelProps): JSX.Element {
  return (
    <section className="panel column">
      <h2>Ritual Console</h2>

      <h3>Manual Rituals</h3>
      <div className="stack">
        <button onClick={() => onRitual("scan")}>Scan Dead Band (+Static, +Exposure)</button>
        <button onClick={() => onRitual("invoke")} disabled={state.resources.static < 6}>
          Invoke Whisper (6 Static -&gt; Fear)
        </button>
        <button onClick={() => onRitual("scribe")} disabled={state.resources.fear < 8}>
          Scribe Black Ink (8 Fear -&gt; Ink)
        </button>
        <button onClick={() => onRitual("calm")} disabled={state.resources.ink < 10 || state.resources.fear < 6}>
          Burn Containment (10 Ink + 6 Fear -&gt; -Exposure)
        </button>
      </div>

      <h3>Omen Board</h3>
      <div className="omen-board">
        {state.sigils.map((glyph, index) => (
          <button key={`sigil-${index}`} className="sigil-btn" onClick={() => onRotateSigil(index)}>
            {GLYPHS[glyph]}
          </button>
        ))}
      </div>
      <p className="muted">
        Target omen: {state.omen.map((value) => GLYPHS[value]).join(" ")} | Matches: {stats.omenMatch}/4
      </p>
    </section>
  );
});
