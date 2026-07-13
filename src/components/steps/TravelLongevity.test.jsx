import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TravelLongevity } from "./TravelLongevity.jsx";
import { makeDefaultPlan } from "../../defaultPlan.js";

function setup(overrides = {}) {
  const s = { ...makeDefaultPlan(), ...overrides };
  const set = vi.fn((_key) => vi.fn());
  render(<TravelLongevity s={s} set={set} />);
}

describe("TravelLongevity survivor-election note", () => {
  it("points to Step five (Pension) when pensionType is drs", () => {
    setup({ pensionOn: true, pensionType: "drs", life: { ...makeDefaultPlan().life, on: true } });
    expect(screen.getByText(/Step five \(Pension\)/)).toBeInTheDocument();
  });

  it("does not claim a Step five survivor-election control exists for a non-DRS pension type", () => {
    setup({ pensionOn: true, pensionType: "fers", life: { ...makeDefaultPlan().life, on: true } });
    expect(screen.queryByText(/Step five \(Pension\)/)).not.toBeInTheDocument();
    expect(screen.getByText(/isn.t modeled for this pension type/)).toBeInTheDocument();
  });

  it("shows no survivor note at all when the pension is off", () => {
    setup({ pensionOn: false, life: { ...makeDefaultPlan().life, on: true } });
    expect(screen.queryByText(/Step five \(Pension\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/isn.t modeled for this pension type/)).not.toBeInTheDocument();
  });
});
