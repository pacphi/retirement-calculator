import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BridgeSummary } from "./BridgeSummary.jsx";
import { makeDefaultPlan } from "../../defaultPlan.js";
import { calculatePlan } from "../../calculatorCore.js";

describe("BridgeSummary", () => {
  const plan = calculatePlan(makeDefaultPlan());

  it("derives the bridge window from the simulation rows", () => {
    render(<BridgeSummary rows={plan.simChosen.rows} steadyStartAge={plan.steady.startAgeA} />);
    // Default persona: paychecks end at 65, all benefits online at 74.
    expect(screen.getByText(/Ages 65–73: the portfolio carries you/i)).toBeInTheDocument();
    expect(screen.getByText("Bridge length")).toBeInTheDocument();
    expect(screen.getByText("9 yrs")).toBeInTheDocument();
    expect(screen.getByText("Portfolio drawdown")).toBeInTheDocument();
    expect(screen.getByText("Peak annual withdrawal")).toBeInTheDocument();
    expect(screen.getByText("Covered by guaranteed income")).toBeInTheDocument();
  });

  it("responds to input changes (shorter gap when the spouse claims early)", () => {
    const early = calculatePlan({ ...makeDefaultPlan(), claimB: 62, pensionAge: 62 });
    render(<BridgeSummary rows={early.simChosen.rows} steadyStartAge={early.steady.startAgeA} />);
    expect(screen.getByText(/Ages 65–70: the portfolio carries you/i)).toBeInTheDocument();
  });

  it("renders nothing when there is no gap", () => {
    const { container } = render(<BridgeSummary rows={[]} steadyStartAge={74} />);
    expect(container).toBeEmptyDOMElement();
  });
});
