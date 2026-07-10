import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClaimTiming } from "./ClaimTiming.jsx";
import { makeDefaultPlan } from "../../defaultPlan.js";
import { calculatePlan } from "../../calculatorCore.js";

vi.mock("recharts", () => {
  const Chart = ({ children }) => <div>{children}</div>;
  const Primitive = () => null;
  return {
    LineChart: Chart,
    ResponsiveContainer: Chart,
    Line: Primitive,
    XAxis: Primitive,
    YAxis: Primitive,
    CartesianGrid: Primitive,
    Tooltip: Primitive,
  };
});

describe("ClaimTiming", () => {
  it("compares the current claim ages against claiming at FRA, recomputed from inputs", () => {
    const s = makeDefaultPlan(); // claims at 65/65
    const plan = calculatePlan(s);
    render(<ClaimTiming s={s} rows={plan.simChosen.rows} steadyNet={plan.steady.net} />);
    expect(screen.getByText(/What claiming at 67 would change/i)).toBeInTheDocument();
    // Steady income rises with later claims for the default persona.
    expect(screen.getByText(/steady income rises by/i)).toBeInTheDocument();
    expect(screen.getByText("Claim at 65 (current)")).toBeInTheDocument();
    expect(screen.getByText("Claim at 67 (both)")).toBeInTheDocument();
  });

  it("flips to a claim-at-65 comparison when both claims already sit at FRA", () => {
    const s = { ...makeDefaultPlan(), claimA: 67, claimB: 67 };
    const plan = calculatePlan(s);
    render(<ClaimTiming s={s} rows={plan.simChosen.rows} steadyNet={plan.steady.net} />);
    expect(screen.getByText(/What claiming at 65 would change/i)).toBeInTheDocument();
    expect(screen.getByText("Claim at 65 (both)")).toBeInTheDocument();
  });
});
