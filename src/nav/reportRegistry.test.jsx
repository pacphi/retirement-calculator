import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { buildReportSections } from "./reportRegistry.jsx";
import { makeDefaultPlan } from "../defaultPlan.js";

function renderReference(overrides = {}) {
  const s = { ...makeDefaultPlan(), ...overrides };
  const sections = buildReportSections({ s });
  const reference = sections.find((sec) => sec.id === "reference");
  render(reference.render());
}

describe("ReferenceSection source links", () => {
  it("shows the WA DRS pension source link when pensionOn is off (default, no misattribution risk)", () => {
    renderReference({ pensionOn: false });
    expect(screen.getByRole("link", { name: "WA DRS pension" })).toBeInTheDocument();
  });

  it("shows the WA DRS pension source link when pensionType is drs", () => {
    renderReference({ pensionOn: true, pensionType: "drs" });
    expect(screen.getByRole("link", { name: "WA DRS pension" })).toBeInTheDocument();
  });

  it("does not show the WA DRS pension source link for a non-DRS pension type (avoids misattributing the source)", () => {
    renderReference({ pensionOn: true, pensionType: "fers" });
    expect(screen.queryByRole("link", { name: "WA DRS pension" })).not.toBeInTheDocument();
  });
});
