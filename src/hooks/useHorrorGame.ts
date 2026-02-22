import { useEffect, useReducer, useRef } from "react";
import { AUTOSAVE_SECONDS, TICK_STEP } from "../game/content";
import { createInitialState, gameReducer } from "../game/engine";
import { clearState, loadState, saveState } from "../game/storage";

export function useHorrorGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const loaded = loadState();
    if (loaded) {
      dispatch({ type: "load", payload: loaded });
      return;
    }
    dispatch({ type: "mark_loaded" });
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let accumulator = 0;
    let autosaveAccumulator = 0;

    const frame = (now: number): void => {
      const delta = Math.min(0.25, (now - last) / 1000);
      last = now;
      accumulator += delta;
      autosaveAccumulator += delta;

      while (accumulator >= TICK_STEP) {
        dispatch({ type: "tick", dt: TICK_STEP });
        accumulator -= TICK_STEP;
      }

      if (autosaveAccumulator >= AUTOSAVE_SECONDS) {
        const snapshot = stateRef.current;
        if (snapshot.dirty && snapshot.loaded) {
          saveState(snapshot);
          dispatch({ type: "mark_saved" });
        }
        autosaveAccumulator = 0;
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const saveNow = (): void => {
    const snapshot = stateRef.current;
    if (!snapshot.loaded) {
      return;
    }
    saveState(snapshot);
    dispatch({ type: "mark_saved" });
  };

  const reset = (): void => {
    clearState();
    dispatch({ type: "reset" });
  };

  return {
    state,
    dispatch,
    saveNow,
    reset
  };
}
