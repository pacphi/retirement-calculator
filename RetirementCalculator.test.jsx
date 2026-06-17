import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RetirementCalculator from "./RetirementCalculator.jsx";

vi.mock("recharts", () => {
  const Chart = ({ children }) => <div>{children}</div>;
  const Primitive = () => null;
  return {
    ComposedChart: Chart,
    LineChart: Chart,
    ResponsiveContainer: Chart,
    Area: Primitive,
    Line: Primitive,
    XAxis: Primitive,
    YAxis: Primitive,
    CartesianGrid: Primitive,
    Tooltip: Primitive,
    ReferenceDot: Primitive,
  };
});

describe("RetirementCalculator UI", () => {
  it("shows plain-language source links for the main formulas", () => {
    render(<RetirementCalculator />);
    expect(screen.getByRole("link", { name:/IRS 2026 tax rules/i })).toHaveAttribute("href", expect.stringContaining("irs.gov"));
    expect(screen.getByRole("link", { name:/SSA benefit formula/i })).toHaveAttribute("href", expect.stringContaining("ssa.gov"));
    expect(screen.getByRole("link", { name:/WA DRS pension/i })).toHaveAttribute("href", expect.stringContaining("drs.wa.gov"));
  });

  it("makes place rows keyboard-operable buttons", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    const portugal = screen.getByRole("button", { name:/Portugal/i });
    expect(portugal).toHaveAttribute("aria-expanded", "true");
    await user.click(portugal);
    expect(portugal).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the Add event button for family milestones", () => {
    render(<RetirementCalculator />);
    expect(screen.getByRole("button", { name:/add event/i })).toBeInTheDocument();
  });
});

describe("reframed headline", () => {
  it("labels the headline as spending capacity, not guaranteed income", () => {
    render(<RetirementCalculator />);
    // The tile must distinguish what you spend from what you could spend.
    expect(screen.getByText(/could spend up to/i)).toBeInTheDocument();
  });
});

describe("dynamic life events", () => {
  it("adds a new event row when 'Add event' is clicked", () => {
    render(<RetirementCalculator />);
    const before = screen.getAllByRole("button", { name: /remove event/i }).length;
    fireEvent.click(screen.getByRole("button", { name: /add event/i }));
    const after = screen.getAllByRole("button", { name: /remove event/i }).length;
    expect(after).toBe(before + 1);
  });

  it("removes an event row when its remove button is clicked", () => {
    render(<RetirementCalculator />);
    const before = screen.getAllByRole("button", { name: /remove event/i }).length;
    fireEvent.click(screen.getAllByRole("button", { name: /remove event/i })[0]);
    const after = screen.getAllByRole("button", { name: /remove event/i }).length;
    expect(after).toBe(before - 1);
  });
});

describe("Monte Carlo trigger", () => {
  it("offers an opt-in button and does not run automatically", () => {
    render(<RetirementCalculator />);
    const btn = screen.getByRole("button", { name: /run monte carlo/i });
    expect(btn).toBeInTheDocument();
    // No percentile result is shown until the user runs it.
    expect(screen.queryByText(/success probability/i)).not.toBeInTheDocument();
  });
});
