import { useState, useRef, useEffect } from "react";
import { MC_DEFAULTS } from "../retirementData.js";

/**
 * useMonteCarlo(s)
 *
 * MC web-worker lifecycle hook. Moves the worker useState + useEffect +
 * runMc handler out of RetirementCalculator.jsx.
 *
 * Variability-by-default: MC auto-runs (debounced ~400ms) whenever inputs
 * settle so the p10–p90 band shows without a manual click. The deterministic
 * projection is independent of this; `runMc` is still exposed for the button.
 *
 * In jsdom (RTL tests) `Worker` is undefined, so the debounce effect returns
 * early and `mc` stays null — existing tests see the pre-MC UI unchanged.
 *
 * @param {object} s - Full plan state (forwarded to the worker on each run)
 * @returns {{ mc: object|null, mcRunning: boolean, runMc: () => void }}
 */
export function useMonteCarlo(s) {
  const [mc, setMc] = useState(null);
  const [mcRunning, setMcRunning] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    workerRef.current = new Worker(
      new URL("../finance/mcWorker.js", import.meta.url),
      { type: "module" }
    );
    workerRef.current.onmessage = (e) => {
      if (e.data?.type === "mc-result") {
        setMc(e.data.result);
        setMcRunning(false);
      }
    };
    return () => workerRef.current && workerRef.current.terminate();
  }, []);

  const post = () => {
    if (!workerRef.current) return;
    setMcRunning(true);
    const volatility = (s.volatility != null && s.volatility !== "")
      ? Number(s.volatility) : MC_DEFAULTS.volatility;
    workerRef.current.postMessage({ state: s, mcOpt: { ...MC_DEFAULTS, volatility } });
  };

  const runMc = () => { setMc(null); post(); };

  // Variability-by-default: re-run MC on a debounce whenever inputs settle.
  // The deterministic projection is independent of this; MC stays seeded.
  // Guards: skip if Worker is unavailable (plain jsdom) OR if running under
  // Vitest (test/setup.js stubs Worker as a no-op so the message never comes
  // back, which would leave mcRunning stuck true and break the manual-trigger
  // test).
  useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") return;
    if (import.meta.env.MODE === "test") return;
    const id = setTimeout(post, 400);
    return () => clearTimeout(id);
  }, [s]); // intentionally omits `post` to avoid infinite re-trigger

  return { mc, mcRunning, runMc };
}
