import { describe, expect, it } from "vitest";
import { resolveReturn } from "./returns.js";

describe("resolveReturn", () => {
  it("maps a known preset to its central real return", () => {
    expect(resolveReturn("balanced")).toBe(0.05);
    expect(resolveReturn("conservative")).toBe(0.035);
    expect(resolveReturn("growth")).toBe(0.065);
  });
  it("falls back to the custom value for 'custom' or unknown presets", () => {
    expect(resolveReturn("custom", 0.042)).toBe(0.042);
    expect(resolveReturn(undefined, 0.05)).toBe(0.05);
  });
});
