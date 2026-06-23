import { describe, expect, it } from "vitest";
import { scheduledSpendForYear } from "./events.js";
import { DEFAULT_LIFE_EVENTS } from "../retirementData.js";

describe("typed & emergent events (C3)", () => {
  it("nets windfalls negative and adds gifts/purchases", () => {
    const evts = [
      { id: "g", on: true, year: 2030, amount: 15000, type: "gift" },
      { id: "w", on: true, year: 2030, amount: 50000, type: "windfall" },
    ];
    expect(scheduledSpendForYear(evts, 2030)).toBe(15000 - 50000);
  });
  it("excludes emergent events when includeEmergent is false", () => {
    const evts = [{ id: "e", on: true, year: 2030, amount: 40000, type: "purchase", emergent: true }];
    expect(scheduledSpendForYear(evts, 2030, { includeEmergent: false })).toBe(0);
    expect(scheduledSpendForYear(evts, 2030, { includeEmergent: true })).toBe(40000);
  });
  it("treats untyped events as additive spend (back-compat)", () => {
    expect(scheduledSpendForYear([{ id: "x", on: true, year: 2030, amount: 10000 }], 2030)).toBe(10000);
  });
});

describe("default event classifications", () => {
  const byId = Object.fromEntries(DEFAULT_LIFE_EVENTS.map((e) => [e.id, e]));
  it("classifies vehicle replacement as a purchase", () => expect(byId.car.type).toBe("purchase"));
  it("classifies home upkeep as a purchase", () => expect(byId.upkeep.type).toBe("purchase"));
  it("classifies weddings and the 529 seed as gifts", () => {
    expect(byId.wed1.type).toBe("gift");
    expect(byId.gk.type).toBe("gift");
  });
  it("gives every default event an explicit type", () => expect(DEFAULT_LIFE_EVENTS.every((e) => typeof e.type === "string")).toBe(true));
});
