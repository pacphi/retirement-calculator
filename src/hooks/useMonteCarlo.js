import { useState, useRef, useEffect } from "react";
import { MC_DEFAULTS } from "../retirementData.js";

/**
 * useMonteCarlo(s)
 *
 * MC web-worker lifecycle hook. Moves the worker useState + useEffect +
 * runMc handler out of RetirementCalculator.jsx. Worker creation, teardown,
 * and the message handler are byte-identical to the originals so off-thread
 * behavior and determinism are unchanged.
 *
 * MC is intentionally NOT triggered automatically — it only runs when the
 * caller invokes runMc() (button-driven, same as before).
 *
 * @param {object} s - Full plan state (forwarded to the worker on each run)
 * @returns {{ mc: object|null, mcRunning: boolean, runMc: () => void }}
 */
export function useMonteCarlo(s) {
  const [mc, setMc] = useState(null);
  const [mcRunning, setMcRunning] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
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

  const runMc = () => {
    setMcRunning(true);
    setMc(null);
    workerRef.current.postMessage({ state: s, mcOpt: MC_DEFAULTS });
  };

  return { mc, mcRunning, runMc };
}
