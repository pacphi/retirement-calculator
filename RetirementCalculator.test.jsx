import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RetirementCalculator, { mcSummaryLines } from "./RetirementCalculator.jsx";

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
    // The tile must distinguish what you spend from the return-dependent ceiling.
    expect(screen.getByText(/can sustain up to/i)).toBeInTheDocument();
    expect(screen.getByText(/isn't guaranteed/i)).toBeInTheDocument();
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

describe("Monte Carlo summary formatting", () => {
  it("formats success, income, and worst-case age", () => {
    const lines = mcSummaryLines({
      successProb: 0.87,
      sustainableIncome: { p10: 90000, p50: 110000, p90: 140000 },
      depletionAge: { p10: 91, p50: 96 },
    });
    expect(lines[0]).toBe("Success probability: 87%");
    expect(lines[2]).toContain("91");
  });

  it("reports 'beyond 95' when even the 10th percentile never depletes", () => {
    const lines = mcSummaryLines({
      successProb: 1,
      sustainableIncome: { p10: 1, p50: 2, p90: 3 },
      depletionAge: { p10: 96, p50: 96 },
    });
    expect(lines[2]).toContain("beyond 95");
  });

  it("returns an empty array when mc is null", () => {
    expect(mcSummaryLines(null)).toEqual([]);
  });
});

describe("Social Security statement guidance", () => {
  it("links to ssa.gov for the FRA amount and shows no estimate warning by default", () => {
    render(<RetirementCalculator />);
    expect(screen.getByRole("link", { name: /my Social Security/i })).toHaveAttribute(
      "href",
      expect.stringContaining("ssa.gov"),
    );
    expect(screen.queryByText(/assumes a full 35-year/i)).not.toBeInTheDocument();
  });
});

describe("healthcare basis disclosure", () => {
  it("shows the US pre-65 cost gap when a non-US basis (Austria default) is selected", () => {
    render(<RetirementCalculator />);
    expect(screen.getByText(/until Medicare at 65/i)).toBeInTheDocument();
    expect(screen.getByText(/assumes you live abroad/i)).toBeInTheDocument();
  });
});

describe("long-term care disclosure", () => {
  it("warns that long-term care is not modeled by default", () => {
    render(<RetirementCalculator />);
    expect(screen.getByText(/Long-term care is not modeled/i)).toBeInTheDocument();
  });

  it("shows the app semantic version in the footer", () => {
    render(<RetirementCalculator />);
    expect(screen.getByText(/Nest & Next · v\d+\.\d+\.\d+/)).toBeInTheDocument();
  });
});

describe("deterministic headline caveat", () => {
  it("flags that the headline assumes steady returns and points to Monte Carlo", () => {
    render(<RetirementCalculator />);
    expect(screen.getByText(/best-case-within-average, not a median/i)).toBeInTheDocument();
    expect(screen.getByText(/Run Monte Carlo \(below\) for the realistic range/i)).toBeInTheDocument();
  });
});
