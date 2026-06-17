import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
