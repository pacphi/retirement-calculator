import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
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
    Bar: Primitive,
    XAxis: Primitive,
    YAxis: Primitive,
    CartesianGrid: Primitive,
    Tooltip: Primitive,
    ReferenceDot: Primitive,
    ReferenceLine: Primitive,
    PieChart: Chart,
    Pie: Primitive,
    Cell: Primitive,
  };
});

// --- Two-stage wizard/report navigation helpers ------------------------------
// Inputs live in a step wizard (one step visible at a time); results live in a
// sectioned report reached via "Generate report". Tests navigate via the Stepper
// bubbles (real buttons) before asserting on hidden content.
async function gotoStep(user, re) {
  await user.click(screen.getByRole("button", { name: re }));
}
async function openReport(user) {
  // The Assumptions bubble is the last step, which surfaces "Generate report".
  await user.click(screen.getByRole("button", { name: /assumptions/i }));
  await user.click(screen.getByRole("button", { name: /generate report/i }));
}
async function editInputs(user) {
  await user.click(screen.getByRole("button", { name: /edit inputs/i }));
}
async function gotoSection(user, re) {
  await user.click(screen.getByRole("button", { name: re }));
}
const headlineText = () => screen.getByText(/can sustain up to/i).textContent;

describe("RetirementCalculator UI", () => {
  it("shows plain-language source links for the main formulas", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /reference/i);
    expect(screen.getByRole("link", { name:/IRS 2026 tax rules/i })).toHaveAttribute("href", expect.stringContaining("irs.gov"));
    expect(screen.getByRole("link", { name:/SSA benefit formula/i })).toHaveAttribute("href", expect.stringContaining("ssa.gov"));
    expect(screen.getByRole("link", { name:/WA DRS pension/i })).toHaveAttribute("href", expect.stringContaining("drs.wa.gov"));
  });

  it("makes place rows keyboard-operable buttons", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /taxes/i);
    // Austria (the default retirement location) is the expanded place by default.
    const austria = screen.getByRole("button", { name:/Austria/i });
    expect(austria).toHaveAttribute("aria-expanded", "true");
    await user.click(austria);
    expect(austria).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the Add event button for family milestones", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /milestones/i);
    expect(screen.getByRole("button", { name:/add event/i })).toBeInTheDocument();
  });

  it("exposes the withdrawal-order control", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /portfolio/i);
    expect(screen.getByLabelText("Withdrawal order")).toBeInTheDocument();
  });

  it("collapses and expands the header via its toggle button", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    const tagline = /This is about your money, your home, and what comes next\./i;
    // Without matchMedia (jsdom) the header starts expanded, so the tagline is visible.
    expect(screen.getByText(tagline)).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name:/collapse header/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);
    expect(screen.queryByText(tagline)).not.toBeInTheDocument();
    const expand = screen.getByRole("button", { name:/expand header/i });
    expect(expand).toHaveAttribute("aria-expanded", "false");

    await user.click(expand);
    expect(screen.getByText(tagline)).toBeInTheDocument();
  });

  it("keeps the brand name visible in the collapsed header", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await user.click(screen.getByRole("button", { name:/collapse header/i }));
    expect(screen.getByRole("heading", { name:/Nest & Next/i })).toBeInTheDocument();
  });
});

describe("reframed headline", () => {
  it("labels the headline as spending capacity, not guaranteed income", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    // The pinned verdict must distinguish what you spend from the return-dependent ceiling.
    expect(screen.getByText(/can sustain up to/i)).toBeInTheDocument();
    expect(screen.getByText(/isn't guaranteed/i)).toBeInTheDocument();
  });
});

describe("dynamic life events", () => {
  it("adds a new event row when 'Add event' is clicked", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /milestones/i);
    const before = screen.getAllByRole("button", { name: /remove event/i }).length;
    fireEvent.click(screen.getByRole("button", { name: /add event/i }));
    const after = screen.getAllByRole("button", { name: /remove event/i }).length;
    expect(after).toBe(before + 1);
  });

  it("removes an event row when its remove button is clicked", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /milestones/i);
    const before = screen.getAllByRole("button", { name: /remove event/i }).length;
    fireEvent.click(screen.getAllByRole("button", { name: /remove event/i })[0]);
    const after = screen.getAllByRole("button", { name: /remove event/i }).length;
    expect(after).toBe(before - 1);
  });

  it("exposes event type and emergent controls", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /milestones/i);
    expect(screen.getAllByLabelText(/event type/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/emergent/i).length).toBeGreaterThan(0);
  });
});

describe("Monte Carlo trigger", () => {
  it("offers an opt-in button and does not run automatically", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /portfolio/i);
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

  it("reports the never-depletes case against the plan horizon, not a hardcoded 95", () => {
    const mc = { successProb: 1, sustainableIncome: { p10: 1, p50: 2, p90: 3 }, depletionAge: { p10: 101, p50: 101 } };
    expect(mcSummaryLines(mc, 100)[2]).toContain("beyond 100");
    // A depletion at or below the horizon still reports the actual age.
    expect(mcSummaryLines({ ...mc, depletionAge: { p10: 98, p50: 98 } }, 100)[2]).toContain("98");
  });
});

describe("Social Security statement guidance", () => {
  it("links to ssa.gov for the FRA amount and shows no estimate warning by default", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /timing/i);
    expect(screen.getByRole("link", { name: /my Social Security/i })).toHaveAttribute(
      "href",
      expect.stringContaining("ssa.gov"),
    );
    expect(screen.queryByText(/assumes a full 35-year/i)).not.toBeInTheDocument();
  });
});

describe("healthcare basis disclosure", () => {
  it("shows the US pre-65 cost gap when a non-US basis (Austria default) is selected", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /income/i);
    expect(screen.getByText(/until Medicare at 65/i)).toBeInTheDocument();
    expect(screen.getByText(/assumes you live abroad/i)).toBeInTheDocument();
  });
});

describe("long-term care disclosure", () => {
  it("warns that long-term care is not modeled by default", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /reference/i);
    expect(screen.getByText(/Long-term care is not modeled/i)).toBeInTheDocument();
  });

  it("shows the app semantic version in the footer", () => {
    render(<RetirementCalculator />);
    expect(screen.getByText(/Nest & Next · v\d+\.\d+\.\d+/)).toBeInTheDocument();
  });
});

describe("Plan horizon input", () => {
  async function openAssumptions(user) {
    await gotoStep(user, /assumptions/i);
    return screen.getByLabelText(/Plan horizon \(age\)/i);
  }

  it("does not jump to the age floor while typing a low leading digit", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    const input = await openAssumptions(user);
    // First keystroke of "100": the leading "1" must NOT be clamped up to the
    // older-spouse age floor (57) mid-edit — that's what produced "5700".
    fireEvent.change(input, { target: { value: "1" } });
    expect(input).toHaveValue(1);
  });

  it("lets you replace the default 95 with 100", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    const input = await openAssumptions(user);
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.blur(input);
    expect(input).toHaveValue(100);
  });

  it("floors a below-minimum entry to the older spouse's age on blur", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    const input = await openAssumptions(user);
    fireEvent.change(input, { target: { value: "30" } });
    expect(input).toHaveValue(30); // not clamped while editing
    fireEvent.blur(input);
    expect(input).toHaveValue(57); // max(ageA 57, ageB 48) applied on blur
  });

  it("drives the never-depletes labels off the chosen horizon, not a hardcoded 95", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    // Default plan doesn't deplete, so labels read "beyond 95".
    await openReport(user);
    await gotoSection(user, /verdict/i);
    expect(screen.getAllByText(/beyond 95|95\+/).length).toBeGreaterThan(0);
    // Raise the horizon to 100 on the Assumptions step, then re-check the report.
    await editInputs(user);
    const input = await openAssumptions(user);
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.blur(input);
    await openReport(user);
    await gotoSection(user, /verdict/i);
    expect(screen.getAllByText(/beyond 100|100\+/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/beyond 95|95\+/)).not.toBeInTheDocument();
  });
});

describe("Strategy & assumptions controls update the projection", () => {
  // Every control should produce a visible change in the report headline (or, for
  // inflation, the future-dollar figures). Inputs live in the wizard; the headline lives
  // in the report, so each test mutates a control then re-opens the report to compare.
  it("Return assumption preset moves the sustainable-income headline", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    const before = headlineText();
    await editInputs(user); // returns to the Assumptions step
    await user.click(screen.getAllByText(/Conservative ~3\.5%/i)[0]);
    await openReport(user);
    expect(headlineText()).not.toBe(before);
  });

  it("Withdrawal rate selection moves the headline", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    const before = headlineText();
    await editInputs(user);
    await user.click(screen.getByRole("button", { name: "5.7%" }));
    await openReport(user);
    expect(headlineText()).not.toBe(before);
  });

  it("Pre-tax share slider moves the headline", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    const before = headlineText();
    await editInputs(user);
    await gotoStep(user, /income/i); // pre-tax share lives on the Income step
    fireEvent.change(screen.getByLabelText(/Pre-tax 401\(k\)\/IRA share/i), { target: { value: "100" } });
    await openReport(user);
    expect(headlineText()).not.toBe(before);
  });

  it("toggling the pre-tax share to a dollar amount keeps it in sync and moves the headline", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    const before = headlineText();
    await editInputs(user);
    await gotoStep(user, /income/i);
    await user.click(screen.getByRole("button", { name: /\$ amount/i }));
    // The dollar view shows the share applied to the $670k default savings (90% = $603k).
    const dollarInput = screen.getByLabelText(/Pre-tax 401\(k\)\/IRA share/i);
    expect(Number(dollarInput.value)).toBe(603000);
    fireEvent.change(dollarInput, { target: { value: "670000" } });
    await openReport(user);
    expect(headlineText()).not.toBe(before);
  });

  it("Extra income tax moves the headline", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    const before = headlineText();
    await editInputs(user); // Assumptions step
    fireEvent.change(screen.getByLabelText(/Extra income tax/i), { target: { value: "10" } });
    await openReport(user);
    expect(headlineText()).not.toBe(before);
  });

  it("Inflation slider updates the future-dollar cost-of-living figures", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    const infFigure = () => screen.getByText(/inflation over/i).textContent;
    await openReport(user);
    await gotoSection(user, /taxes/i);
    const before = infFigure();
    await editInputs(user); // Assumptions step
    fireEvent.change(screen.getByLabelText(/^Inflation/i), { target: { value: "5" } });
    await openReport(user);
    await gotoSection(user, /taxes/i);
    expect(infFigure()).not.toBe(before);
  });

  it("exposes the active segmented option via aria-pressed", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /assumptions/i);
    expect(screen.getByRole("button", { name: "4%" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "5.7%" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("deterministic headline caveat", () => {
  it("flags that the headline assumes steady returns and points to Monte Carlo", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    expect(screen.getByText(/best-case-within-average, not a median/i)).toBeInTheDocument();
    expect(screen.getByText(/Run Monte Carlo \(below\) for the realistic range/i)).toBeInTheDocument();
  });
});

describe("investments chart view toggle", () => {
  it("defaults to the cash-flow view and switches to the tax-bucket view", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /portfolio/i);
    expect(screen.getByRole("button", { name: "Cash flow" })).toHaveAttribute("aria-pressed", "true");
    const buckets = screen.getByRole("button", { name: "Tax buckets" });
    expect(buckets).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(buckets);
    expect(buckets).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Cash flow" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("year-by-year navigator", () => {
  it("renders the navigable year section with a year slider", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /income/i);
    expect(screen.getByText(/A month in the life of/i)).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /select year/i })).toBeInTheDocument();
  });

  it("advances the displayed year when Next is clicked", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /income/i);
    const slider = screen.getByRole("slider", { name: /select year/i });
    const before = Number(slider.value);
    fireEvent.click(screen.getByRole("button", { name: /next year/i }));
    expect(Number(screen.getByRole("slider", { name: /select year/i }).value)).toBe(before + 1);
  });

  it("exposes play and step controls for moving through the years", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /income/i);
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous year/i })).toBeInTheDocument();
  });
});

describe("spending basis toggle", () => {
  it("defaults to the income-share basis and shows the total-replacement slider", () => {
    render(<RetirementCalculator />); // Income step is the default first step
    expect(screen.getByRole("button", { name: "% of income" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Replace this share of income in retirement/i)).toBeInTheDocument();
  });

  it("switches to the location-cost basis, hiding the total-replacement slider and revealing the lifestyle slider", () => {
    render(<RetirementCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Location cost" }));
    expect(screen.queryByText(/Replace this share of income in retirement/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Lifestyle —/i)).toBeInTheDocument();
  });

  it("shows the total-replacement spending control with an accessible label", () => {
    render(<RetirementCalculator />);
    expect(screen.getByLabelText("Replace this share of income in retirement")).toBeInTheDocument();
  });

  it("exposes the spending-strategy control", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /spending/i);
    expect(screen.getByLabelText("Spending strategy")).toBeInTheDocument();
  });
});

describe("recurring life events editor", () => {
  it("seeds a recurring vehicle default with a repeat field", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /milestones/i);
    expect(screen.getByDisplayValue("Vehicle replacement")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/repeat every years/i).length).toBeGreaterThan(0);
  });
});

describe("year-by-year polish", () => {
  it("offers a month vs full-year view toggle, defaulting to typical month", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /income/i);
    expect(screen.getByRole("button", { name: "Typical month" })).toHaveAttribute("aria-pressed", "true");
    const fullYear = screen.getByRole("button", { name: "Full year" });
    fireEvent.click(fullYear);
    expect(fullYear).toHaveAttribute("aria-pressed", "true");
  });

  it("collapses the section, hiding the year slider", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /income/i);
    expect(screen.getByRole("slider", { name: /select year/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /collapse year by year/i }));
    expect(screen.queryByRole("slider", { name: /select year/i })).not.toBeInTheDocument();
  });
});

describe("B2 sequence-of-returns stress toggle", () => {
  it("exposes a sequence-of-returns stress toggle", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /assumptions/i);
    expect(screen.getByLabelText(/bad first decade|sequence stress/i)).toBeInTheDocument();
  });

  it("stress toggle is unchecked by default", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /assumptions/i);
    const toggle = screen.getByLabelText(/bad first decade|sequence stress/i);
    expect(toggle).not.toBeChecked();
  });
});

describe("B1 return preset and variability controls", () => {
  it("exposes the Return assumption label in the advanced panel", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /assumptions/i);
    expect(screen.getByText(/Return assumption/i)).toBeInTheDocument();
  });

  it("exposes the Variability label in the advanced panel", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /assumptions/i);
    expect(screen.getByText(/Variability/i)).toBeInTheDocument();
  });

  it("preset buttons are accessible and balanced is active by default", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /assumptions/i);
    const balanced = screen.getAllByText(/Balanced ~5%/i)[0].closest("button");
    const conservative = screen.getAllByText(/Conservative ~3\.5%/i)[0].closest("button");
    const growth = screen.getAllByText(/Growth ~6\.5%/i)[0].closest("button");
    expect(balanced).toHaveAttribute("aria-pressed", "true");
    expect(conservative).toHaveAttribute("aria-pressed", "false");
    expect(growth).toHaveAttribute("aria-pressed", "false");
  });

  it("the headline return caption tracks the selected preset, not the raw slider", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    // Default preset is Balanced (5.0%); the caption lives in the report headline.
    await openReport(user);
    expect(screen.getByText(/assumes a steady 5\.0% real return every year/i)).toBeInTheDocument();
    await editInputs(user);
    await user.click(screen.getAllByText(/Growth ~6\.5%/i)[0].closest("button"));
    await openReport(user);
    expect(screen.getByText(/assumes a steady 6\.5% real return every year/i)).toBeInTheDocument();
    await editInputs(user);
    await user.click(screen.getAllByText(/Conservative ~3\.5%/i)[0].closest("button"));
    await openReport(user);
    expect(screen.getByText(/assumes a steady 3\.5% real return every year/i)).toBeInTheDocument();
  });

  it("switching to Custom reveals the custom real return input", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /assumptions/i);
    expect(screen.queryByLabelText(/Custom real return/i)).not.toBeInTheDocument();
    // "Custom" also appears in the ssMode Segmented (Timing step). Within the Assumptions
    // step, the return-preset "Custom" is the last match.
    const allCustom = screen.getAllByText(/^Custom$/i);
    const customBtn = allCustom[allCustom.length - 1].closest("button");
    await user.click(customBtn);
    expect(screen.getByLabelText(/Custom real return/i)).toBeInTheDocument();
  });

  it("exposes the Return model label in the advanced panel", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /assumptions/i);
    expect(screen.getByText(/Return model/i)).toBeInTheDocument();
  });

  it("Return model defaults to Blended with aria-pressed true", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /assumptions/i);
    const blended = screen.getAllByText(/^Blended$/i)[0].closest("button");
    expect(blended).toHaveAttribute("aria-pressed", "true");
  });

  it("switching to Glidepath reveals Equity % now and Equity % at retirement inputs", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /assumptions/i);
    expect(screen.queryByLabelText(/Equity % now/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Equity % at retirement/i)).not.toBeInTheDocument();
    const glidepath = screen.getAllByText(/^Glidepath$/i)[0].closest("button");
    await user.click(glidepath);
    expect(screen.getByLabelText(/Equity % now/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Equity % at retirement/i)).toBeInTheDocument();
  });

  it("Glidepath inputs are hidden when Blended is re-selected", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /assumptions/i);
    const glidepath = screen.getAllByText(/^Glidepath$/i)[0].closest("button");
    await user.click(glidepath);
    expect(screen.getByLabelText(/Equity % now/i)).toBeInTheDocument();
    const blended = screen.getAllByText(/^Blended$/i)[0].closest("button");
    await user.click(blended);
    expect(screen.queryByLabelText(/Equity % now/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Equity % at retirement/i)).not.toBeInTheDocument();
  });
});

describe("spending smile (C1)", () => {
  it("exposes the retirement spending smile control", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /spending/i);
    expect(screen.getAllByText(/Retirement spending/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Spending smile/i)[0]).toBeInTheDocument();
  });
});

describe("lifestyle step-changes (C2)", () => {
  it("can add a lifestyle change row", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /spending/i);
    const btn = screen.getByRole("button", { name: /add a lifestyle change/i });
    fireEvent.click(btn);
    expect(screen.getAllByLabelText(/lifestyle change amount|delta/i).length).toBeGreaterThan(0);
  });
});

describe("live headroom read-out (E1)", () => {
  it("shows a live headroom read-out", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user); // Verdict section is the default report section
    expect(screen.getByText(/raise spending by up to|over budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/spending headroom/i)).toBeInTheDocument();
  });
});

describe("accumulation summary read-out (A3)", () => {
  it("shows an accumulation summary while still working", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />); // default state has yearsToRet > 0
    await openReport(user);
    await gotoSection(user, /portfolio/i);
    expect(screen.getAllByText(/at retirement/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/total contributed/i)).toBeInTheDocument();
    expect(screen.getAllByText(/blended return/i).length).toBeGreaterThan(0);
  });
});

describe("Housing step (Wave 2 Task 4)", () => {
  it("renders the Housing section and shows the monthly rent input by default", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /housing/i);
    expect(screen.getAllByText(/housing/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/monthly rent/i)).toBeInTheDocument();
  });

  it("switches to mortgage mode and reveals mortgage-specific inputs", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /housing/i);
    const mortgageBtns = screen.getAllByRole("button", { name: /^mortgage$/i });
    const unpressed = mortgageBtns.find(b => b.getAttribute("aria-pressed") === "false");
    await user.click(unpressed);
    expect(screen.getByLabelText(/mortgage principal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mortgage rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mortgage term/i)).toBeInTheDocument();
  });

  it("switches to own-outright mode and hides rent input", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /housing/i);
    const ownBtns = screen.getAllByRole("button", { name: /own outright/i });
    const unpressed = ownBtns.find(b => b.getAttribute("aria-pressed") === "false");
    await user.click(unpressed);
    expect(screen.queryByLabelText(/monthly rent/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mortgage principal/i)).not.toBeInTheDocument();
  });

  it("shows the housing-outside-floor disclosure note", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /housing/i);
    expect(screen.getAllByText(/outside.*35%.*floor|hard.*obligation/i).length).toBeGreaterThan(0);
  });
});

describe("RetirementPlace step (Step 5 — Wave 2.5 Task 3a)", () => {
  it("renders the Retirement state select with accessible label", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /place/i);
    expect(screen.getByLabelText(/retirement state/i)).toBeInTheDocument();
  });

  it("shows the state rate override input with accessible label", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /place/i);
    expect(screen.getByLabelText(/state rate override/i)).toBeInTheDocument();
  });

  it("shows a plain-language note when a no-tax state is selected", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /place/i);
    const select = screen.getByLabelText(/retirement state/i);
    await user.selectOptions(select, "TX");
    expect(screen.getByText(/Texas.*no state income tax/i)).toBeInTheDocument();
  });

  it("shows a typed-rate note when CA is selected", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /place/i);
    const select = screen.getByLabelText(/retirement state/i);
    await user.selectOptions(select, "CA");
    expect(screen.getByText(/California.*effective state income tax/i)).toBeInTheDocument();
  });

  it("renders the relocation-year input with an accessible label", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /place/i);
    expect(screen.getByLabelText(/relocation year/i)).toBeInTheDocument();
  });

  it("shows the simplified-transition / Pension Source Tax Act note near relocation year", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /place/i);
    expect(screen.getByText(/transition year is simplified/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pension Source Tax Act/i })).toBeInTheDocument();
  });

  it("places work-state on the Income step and retirement-place controls on Step 5", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    // Work state is on the default (Income) step.
    expect(screen.getByLabelText("Where you live and earn now")).toBeInTheDocument();
    // Retirement-place controls live on Step 5.
    await gotoStep(user, /place/i);
    expect(screen.getByLabelText("Retirement state")).toBeInTheDocument();
    expect(screen.getByLabelText("Relocation year")).toBeInTheDocument();
  });
});

describe("relocation home disposition (Wave 2 Task 8)", () => {
  // The default persona works in WA and retires to Austria (jurisdictions differ), so
  // switching the work home to an owned tenure reveals the disposition controls.
  const ownTheWorkHome = async (user) => {
    const ownBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent.trim() === "Own outright");
    await user.click(ownBtn);
  };

  it("hides the disposition controls while the work home is a rental", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /housing/i);
    expect(screen.queryAllByLabelText(/work home at relocation/i).length).toBe(0);
  });

  it("reveals the work-home disposition control when the work home is owned in a different state", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /housing/i);
    await ownTheWorkHome(user);
    expect(screen.getAllByLabelText(/work home at relocation/i).length).toBeGreaterThan(0);
  });

  it("offers an estimated-sale-value input with a planning-grade caption for the sell action", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /housing/i);
    await ownTheWorkHome(user);
    expect(screen.getAllByLabelText(/estimated sale value/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/selling costs.*capital-gains exclusion|~?7% selling costs/i).length).toBeGreaterThan(0);
  });

  it("exposes a retirement-home control labeled for the post-relocation dwelling", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /housing/i);
    await ownTheWorkHome(user);
    expect(screen.getAllByText(/^Retirement home$/i).length).toBeGreaterThan(0);
  });

  it("shows the keep-as-rental caption when that disposition is chosen", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /housing/i);
    await ownTheWorkHome(user);
    const keepBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent.trim() === "Keep as rental");
    await user.click(keepBtn);
    expect(screen.getAllByText(/Kept as a rental.*work mortgage continues/i).length).toBeGreaterThan(0);
  });
});

describe("Tax & residency panel (generalized from DualTaxExposure)", () => {
  it("renders the Tax & residency section for the default international location (Austria)", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /taxes/i);
    const region = screen.getByRole("region", { name: /tax and residency/i });
    expect(region).toBeInTheDocument();
    expect(within(region).getByText("Austria")).toBeInTheDocument();
  });

  it("shows the worldwide taxation and government pension notes for an international location", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /taxes/i);
    expect(screen.getAllByText(/worldwide income/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/government-service pension|Washington DRS pension/i).length).toBeGreaterThan(0);
  });

  it("still renders (with US-state facts) when a US state is selected", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    // Pick a US retirement state on Step 5, then view the report.
    await gotoStep(user, /place/i);
    await user.selectOptions(screen.getByLabelText(/retirement state/i), "TX");
    await openReport(user);
    await gotoSection(user, /taxes/i);
    const region = screen.getByRole("region", { name: /tax and residency/i });
    expect(region).toBeInTheDocument();
    expect(within(region).getByText("Texas")).toBeInTheDocument();
    // No cross-border FBAR/FATCA reminder for a US state.
    expect(within(region).queryByText(/FBAR \/ FATCA reminders/i)).not.toBeInTheDocument();
  });
});

describe("two-stage wizard navigation", () => {
  it("starts on the first input step (Income)", () => {
    render(<RetirementCalculator />);
    const nav = screen.getByRole("navigation", { name: /input steps/i });
    expect(within(nav).getByRole("button", { name: /income/i })).toHaveAttribute("aria-current", "step");
    // First-step content is visible.
    expect(screen.getByLabelText("Where you live and earn now")).toBeInTheDocument();
  });

  it("lists the ten input steps in order with distinct titles", () => {
    render(<RetirementCalculator />);
    const nav = screen.getByRole("navigation", { name: /input steps/i });
    const titles = within(nav).getAllByRole("button").map((b) => b.textContent.replace(/^[0-9✓]+/, "").trim());
    expect(titles).toEqual([
      "Income", "Housing", "Timing", "Pension", "Place",
      "Inheritance", "Spending", "Milestones", "Travel", "Assumptions",
    ]);
  });

  it("jumps non-linearly to any step via the breadcrumb bubbles", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /milestones/i);
    expect(screen.getByRole("button", { name: /add event/i })).toBeInTheDocument();
  });

  it("'Generate report' switches to the report and 'Edit inputs' returns to the wizard", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    expect(screen.getByRole("navigation", { name: /report sections/i })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /input steps/i })).not.toBeInTheDocument();
    await editInputs(user);
    expect(screen.getByRole("navigation", { name: /input steps/i })).toBeInTheDocument();
  });

  it("preserves input state across the report round-trip", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await user.selectOptions(screen.getByLabelText(/where you live and earn now/i), "TX");
    await openReport(user);
    await editInputs(user);
    await gotoStep(user, /income/i);
    expect(screen.getByLabelText(/where you live and earn now/i).value).toBe("TX");
  });

  it("navigates the six report sections via their bubbles", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    const nav = screen.getByRole("navigation", { name: /report sections/i });
    const titles = within(nav).getAllByRole("button").map((b) => b.textContent.replace(/^[0-9✓]+/, "").trim());
    expect(titles).toEqual(["Verdict", "Income", "Portfolio", "Taxes & Location", "Risks", "Reference"]);
  });
});

describe("report export", () => {
  let printSpy;
  beforeEach(() => {
    printSpy = vi.fn();
    vi.stubGlobal("print", printSpy);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes a single Print button in the report", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    expect(screen.getByRole("button", { name: /^print$/i })).toBeInTheDocument();
    // No app-level paper or HTML controls — the OS print dialog handles both.
    expect(screen.queryByLabelText(/paper size/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /export html/i })).not.toBeInTheDocument();
  });

  it("opens the browser print dialog when Print is clicked", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await user.click(screen.getByRole("button", { name: /^print$/i }));
    await waitFor(() => expect(printSpy).toHaveBeenCalled());
  });
});

describe("Task 8 — work-vs-retire jurisdiction split UI", () => {
  it("renders the Work state selector with an accessible label", () => {
    render(<RetirementCalculator />);
    expect(screen.getByLabelText(/where you live and earn now/i)).toBeInTheDocument();
  });

  it("renders the Relocation year input with an accessible label", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await gotoStep(user, /place/i);
    expect(screen.getByLabelText(/relocation year/i)).toBeInTheDocument();
  });

  it("defaults the work state to Washington (WA)", () => {
    render(<RetirementCalculator />);
    const workStateSelect = screen.getByLabelText(/where you live and earn now/i);
    expect(workStateSelect.value).toBe("WA");
  });
});

describe("Places panel — housing caption (Wave 2.5 Part 5)", () => {
  it("should_renderHousingCostCaption_when_placesAreDisplayed", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await openReport(user);
    await gotoSection(user, /taxes/i);
    expect(screen.getByLabelText(/housing cost note/i)).toBeInTheDocument();
    expect(screen.getByText(/you bring one home/i)).toBeInTheDocument();
    expect(screen.getByText(/each location.s local rent is shown/i)).toBeInTheDocument();
  });
});

describe("Saving controls — accessible (Wave 3 Task 1)", () => {
  it("exposes the contributions controls on the Income step", () => {
    render(<RetirementCalculator />); // Saving is grouped into the default Income step
    expect(screen.getByLabelText("Contribution mode")).toBeInTheDocument();
    expect(screen.getByLabelText("Real raise")).toBeInTheDocument();
  });
});
