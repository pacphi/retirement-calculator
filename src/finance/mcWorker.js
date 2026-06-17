import { runMonteCarlo } from "./monteCarlo.js";

self.onmessage = (e) => {
  const { state, mcOpt } = e.data;
  const result = runMonteCarlo(state, mcOpt);
  self.postMessage({ type: "mc-result", result });
};
