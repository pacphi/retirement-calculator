import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LongRun } from "./LongRun.jsx";

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
    ReferenceLine: Primitive,
  };
});

const baseBalRows = [
  { age: 65, withSS: 700000, withoutSS: 600000, stress: 500000, shock: 650000 },
  { age: 70, withSS: 750000, withoutSS: 620000, stress: 480000, shock: 680000 },
  { age: 80, withSS: 600000, withoutSS: 450000, stress: 300000, shock: 520000 },
];

const baseProps = {
  balRows: baseBalRows,
  sellDots: [],
  mc: null,
  mcRunning: false,
  onRunMc: () => {},
  horizon: 95,
  ssMode: "trustees",
  effHaircut: 0.81,
  mcSummaryLines: () => [],
};

describe("LongRun shock overlay (Task 10)", () => {
  it("renders 'With emergent shocks' legend text when hasShock is true", () => {
    render(<LongRun {...baseProps} hasShock={true} />);
    expect(screen.getByText("With emergent shocks")).toBeInTheDocument();
  });

  it("renders the shock caption when hasShock is true", () => {
    render(<LongRun {...baseProps} hasShock={true} />);
    expect(screen.getByText(/Dashed purple = balance if the events you flagged/i)).toBeInTheDocument();
  });

  it("does NOT render 'With emergent shocks' legend when hasShock is false", () => {
    render(<LongRun {...baseProps} hasShock={false} />);
    expect(screen.queryByText("With emergent shocks")).not.toBeInTheDocument();
  });

  it("does NOT render the shock caption when hasShock is false", () => {
    render(<LongRun {...baseProps} hasShock={false} />);
    expect(screen.queryByText(/Dashed purple = balance if the events you flagged/i)).not.toBeInTheDocument();
  });

  it("does NOT render shock overlay when hasShock prop is omitted (default false)", () => {
    render(<LongRun {...baseProps} />);
    expect(screen.queryByText("With emergent shocks")).not.toBeInTheDocument();
  });

  it("still renders 'With Social Security' legend regardless of hasShock", () => {
    render(<LongRun {...baseProps} hasShock={true} />);
    expect(screen.getByText("With Social Security")).toBeInTheDocument();
  });

  it("still renders 'Without SS' legend regardless of hasShock", () => {
    render(<LongRun {...baseProps} hasShock={true} />);
    expect(screen.getByText("Without SS")).toBeInTheDocument();
  });
});
