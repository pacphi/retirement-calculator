import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Worker is not available in jsdom. Provide a no-op stub so the component
// mounts without throwing; the worker does not execute in tests by design.
globalThis.Worker = class Worker {
  constructor() {}
  postMessage() {}
  terminate() {}
  set onmessage(_fn) {}
};
