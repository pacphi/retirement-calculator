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

  it("exposes event type and emergent controls", () => {
    render(<RetirementCalculator />);
    expect(screen.getAllByLabelText(/event type/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/emergent/i).length).toBeGreaterThan(0);
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

  it("reports the never-depletes case against the plan horizon, not a hardcoded 95", () => {
    const mc = { successProb: 1, sustainableIncome: { p10: 1, p50: 2, p90: 3 }, depletionAge: { p10: 101, p50: 101 } };
    expect(mcSummaryLines(mc, 100)[2]).toContain("beyond 100");
    // A depletion at or below the horizon still reports the actual age.
    expect(mcSummaryLines({ ...mc, depletionAge: { p10: 98, p50: 98 } }, 100)[2]).toContain("98");
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

describe("Plan horizon input", () => {
  async function openAssumptions() {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await user.click(screen.getByRole("button", { name: /assumptions/i }));
    return screen.getByLabelText(/Plan horizon \(age\)/i);
  }

  it("does not jump to the age floor while typing a low leading digit", async () => {
    const input = await openAssumptions();
    // First keystroke of "100": the leading "1" must NOT be clamped up to the
    // older-spouse age floor (57) mid-edit — that's what produced "5700".
    fireEvent.change(input, { target: { value: "1" } });
    expect(input).toHaveValue(1);
  });

  it("lets you replace the default 95 with 100", async () => {
    const input = await openAssumptions();
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.blur(input);
    expect(input).toHaveValue(100);
  });

  it("floors a below-minimum entry to the older spouse's age on blur", async () => {
    const input = await openAssumptions();
    fireEvent.change(input, { target: { value: "30" } });
    expect(input).toHaveValue(30); // not clamped while editing
    fireEvent.blur(input);
    expect(input).toHaveValue(57); // max(ageA 57, ageB 48) applied on blur
  });

  it("drives the never-depletes labels off the chosen horizon, not a hardcoded 95", async () => {
    const input = await openAssumptions();
    // Default plan doesn't deplete, so labels read "beyond 95" / "95+".
    expect(screen.getAllByText(/beyond 95|95\+/).length).toBeGreaterThan(0);
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.blur(input);
    expect(screen.getAllByText(/beyond 100|100\+/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/beyond 95|95\+/)).not.toBeInTheDocument();
  });
});

describe("Strategy & assumptions controls update the projection", () => {
  // Every control in the advanced panel should produce a visible change. These
  // guard the "did anything happen?" concern: the headline (or, for inflation,
  // the future-dollar figures) must move when the control is touched.
  async function openAssumptions() {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await user.click(screen.getByRole("button", { name: /assumptions/i }));
    return user;
  }
  const headline = () => screen.getByText(/can sustain up to/i).textContent;

  it("Return assumption preset moves the sustainable-income headline", async () => {
    const user = await openAssumptions();
    const before = headline();
    // Switch from "balanced" (~5%) to "conservative" (~3.5%) — headline must shift.
    // Use getAllByText + first match to avoid the Field <label> wrapper affecting accessible names.
    await user.click(screen.getAllByText(/Conservative ~3\.5%/i)[0]);
    expect(headline()).not.toBe(before);
  });

  it("Withdrawal rate selection moves the headline", async () => {
    const user = await openAssumptions();
    const before = headline();
    await user.click(screen.getByRole("button", { name: "5.7%" }));
    expect(headline()).not.toBe(before);
  });

  it("Pre-tax share slider moves the headline", async () => {
    await openAssumptions();
    const before = headline();
    fireEvent.change(screen.getByLabelText(/Pre-tax 401\(k\)\/IRA share/i), { target: { value: "0" } });
    expect(headline()).not.toBe(before);
  });

  it("toggling the pre-tax share to a dollar amount keeps it in sync and moves the headline", async () => {
    const user = await openAssumptions();
    const before = headline();
    await user.click(screen.getByRole("button", { name: /\$ amount/i }));
    // The dollar view shows the share applied to the $670k default savings (70% = $469k).
    const dollarInput = screen.getByLabelText(/Pre-tax 401\(k\)\/IRA share/i);
    expect(Number(dollarInput.value)).toBe(469000);
    fireEvent.change(dollarInput, { target: { value: "0" } });
    expect(headline()).not.toBe(before);
  });

  it("Extra income tax moves the headline", async () => {
    await openAssumptions();
    const before = headline();
    fireEvent.change(screen.getByLabelText(/Extra income tax/i), { target: { value: "10" } });
    expect(headline()).not.toBe(before);
  });

  it("Inflation slider updates the future-dollar cost-of-living figures", async () => {
    await openAssumptions();
    const infFigure = () => screen.getByText(/inflation over/i).textContent;
    const before = infFigure();
    fireEvent.change(screen.getByLabelText(/^Inflation/i), { target: { value: "5" } });
    expect(infFigure()).not.toBe(before);
  });

  it("exposes the active segmented option via aria-pressed", async () => {
    await openAssumptions();
    expect(screen.getByRole("button", { name: "4%" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "5.7%" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("deterministic headline caveat", () => {
  it("flags that the headline assumes steady returns and points to Monte Carlo", () => {
    render(<RetirementCalculator />);
    expect(screen.getByText(/best-case-within-average, not a median/i)).toBeInTheDocument();
    expect(screen.getByText(/Run Monte Carlo \(below\) for the realistic range/i)).toBeInTheDocument();
  });
});

describe("investments chart view toggle", () => {
  it("defaults to the cash-flow view and switches to the tax-bucket view", () => {
    render(<RetirementCalculator />);
    expect(screen.getByRole("button", { name: "Cash flow" })).toHaveAttribute("aria-pressed", "true");
    const buckets = screen.getByRole("button", { name: "Tax buckets" });
    expect(buckets).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(buckets);
    expect(buckets).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Cash flow" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("year-by-year navigator", () => {
  it("renders the navigable year section with a year slider", () => {
    render(<RetirementCalculator />);
    expect(screen.getByText(/A month in the life of/i)).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /select year/i })).toBeInTheDocument();
  });

  it("advances the displayed year when Next is clicked", () => {
    render(<RetirementCalculator />);
    const slider = screen.getByRole("slider", { name: /select year/i });
    const before = Number(slider.value);
    fireEvent.click(screen.getByRole("button", { name: /next year/i }));
    expect(Number(screen.getByRole("slider", { name: /select year/i }).value)).toBe(before + 1);
  });

  it("exposes play and step controls for moving through the years", () => {
    render(<RetirementCalculator />);
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous year/i })).toBeInTheDocument();
  });
});

describe("spending basis toggle", () => {
  it("defaults to the income-share basis and shows the share slider", () => {
    render(<RetirementCalculator />);
    expect(screen.getByRole("button", { name: "% of income" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Retire on this share of income/i)).toBeInTheDocument();
  });

  it("switches to the location-cost basis, hiding the income share and revealing the lifestyle slider", () => {
    render(<RetirementCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Location cost" }));
    expect(screen.queryByText(/Retire on this share of income/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Lifestyle —/i)).toBeInTheDocument();
  });
});

describe("recurring life events editor", () => {
  it("seeds a recurring vehicle default with a repeat field", () => {
    render(<RetirementCalculator />);
    expect(screen.getByDisplayValue("Vehicle replacement")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/repeat every years/i).length).toBeGreaterThan(0);
  });
});

describe("year-by-year polish", () => {
  it("offers a month vs full-year view toggle, defaulting to typical month", () => {
    render(<RetirementCalculator />);
    expect(screen.getByRole("button", { name: "Typical month" })).toHaveAttribute("aria-pressed", "true");
    const fullYear = screen.getByRole("button", { name: "Full year" });
    fireEvent.click(fullYear);
    expect(fullYear).toHaveAttribute("aria-pressed", "true");
  });

  it("collapses the section, hiding the year slider", () => {
    render(<RetirementCalculator />);
    expect(screen.getByRole("slider", { name: /select year/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /collapse year by year/i }));
    expect(screen.queryByRole("slider", { name: /select year/i })).not.toBeInTheDocument();
  });
});

describe("B2 sequence-of-returns stress toggle", () => {
  async function openAssumptions() {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await user.click(screen.getByRole("button", { name: /assumptions/i }));
    return user;
  }

  it("exposes a sequence-of-returns stress toggle", async () => {
    await openAssumptions();
    expect(screen.getByLabelText(/bad first decade|sequence stress/i)).toBeInTheDocument();
  });

  it("stress toggle is unchecked by default", async () => {
    await openAssumptions();
    const toggle = screen.getByLabelText(/bad first decade|sequence stress/i);
    expect(toggle).not.toBeChecked();
  });
});

describe("B1 return preset and variability controls", () => {
  async function openAssumptions() {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await user.click(screen.getByRole("button", { name: /assumptions/i }));
    return user;
  }

  it("exposes the Return assumption label in the advanced panel", async () => {
    await openAssumptions();
    expect(screen.getByText(/Return assumption/i)).toBeInTheDocument();
  });

  it("exposes the Variability label in the advanced panel", async () => {
    await openAssumptions();
    expect(screen.getByText(/Variability/i)).toBeInTheDocument();
  });

  it("preset buttons are accessible and balanced is active by default", async () => {
    await openAssumptions();
    // Query by visible text to avoid Field <label> wrapper inflating accessible names.
    const balanced = screen.getAllByText(/Balanced ~5%/i)[0].closest("button");
    const conservative = screen.getAllByText(/Conservative ~3\.5%/i)[0].closest("button");
    const growth = screen.getAllByText(/Growth ~6\.5%/i)[0].closest("button");
    expect(balanced).toHaveAttribute("aria-pressed", "true");
    expect(conservative).toHaveAttribute("aria-pressed", "false");
    expect(growth).toHaveAttribute("aria-pressed", "false");
  });

  it("the headline return caption tracks the selected preset, not the raw slider", async () => {
    const user = await openAssumptions();
    // Default preset is Balanced (5.0%).
    expect(screen.getByText(/assumes a steady 5\.0% real return every year/i)).toBeInTheDocument();
    // Switching to Growth must move the caption to 6.5% (it previously stayed at the raw slider 5.0%).
    await user.click(screen.getAllByText(/Growth ~6\.5%/i)[0].closest("button"));
    expect(screen.getByText(/assumes a steady 6\.5% real return every year/i)).toBeInTheDocument();
    // ...and Conservative to 3.5%.
    await user.click(screen.getAllByText(/Conservative ~3\.5%/i)[0].closest("button"));
    expect(screen.getByText(/assumes a steady 3\.5% real return every year/i)).toBeInTheDocument();
  });

  it("switching to Custom reveals the custom real return input", async () => {
    const user = await openAssumptions();
    expect(screen.queryByLabelText(/Custom real return/i)).not.toBeInTheDocument();
    // "Custom" also appears in the ssMode Segmented (Timing step, always visible).
    // The return-preset "Custom" button is the last one in DOM order — take the last match.
    const allCustom = screen.getAllByText(/^Custom$/i);
    const customBtn = allCustom[allCustom.length - 1].closest("button");
    await user.click(customBtn);
    expect(screen.getByLabelText(/Custom real return/i)).toBeInTheDocument();
  });
});

describe("spending smile (C1)", () => {
  it("exposes the retirement spending smile control", () => {
    render(<RetirementCalculator />);
    // Section heading appears multiple times due to nested label wrappers — take first match.
    expect(screen.getAllByText(/Retirement spending/i)[0]).toBeInTheDocument();
    // Query by visible text (Field wraps children in <label>, inflating button accessible names)
    expect(screen.getAllByText(/Spending smile/i)[0]).toBeInTheDocument();
  });
});

describe("lifestyle step-changes (C2)", () => {
  it("can add a lifestyle change row", () => {
    render(<RetirementCalculator />);
    const btn = screen.getByRole("button", { name: /add a lifestyle change/i });
    fireEvent.click(btn);
    expect(screen.getAllByLabelText(/lifestyle change amount|delta/i).length).toBeGreaterThan(0);
  });
});

describe("live headroom read-out (E1)", () => {
  it("shows a live headroom read-out", () => {
    render(<RetirementCalculator />);
    expect(screen.getByText(/raise spending by up to|over budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/spending headroom/i)).toBeInTheDocument();
  });
});

describe("accumulation summary read-out (A3)", () => {
  it("shows an accumulation summary while still working", () => {
    render(<RetirementCalculator />); // default state has yearsToRet > 0
    // All three read-out labels must render, not just one.
    expect(screen.getAllByText(/at retirement/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/total contributed/i)).toBeInTheDocument();
    expect(screen.getAllByText(/blended return/i).length).toBeGreaterThan(0);
  });
});

describe("Housing step (Wave 2 Task 4)", () => {
  it("renders the Housing section and shows the monthly rent input by default", () => {
    render(<RetirementCalculator />);
    // Section heading — at least eyebrow + title
    expect(screen.getAllByText(/housing/i).length).toBeGreaterThan(0);
    // Monthly rent label is unique to the Housing step; confirms rent mode is default
    expect(screen.getByLabelText(/monthly rent/i)).toBeInTheDocument();
  });

  it("switches to mortgage mode and reveals mortgage-specific inputs", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    // "Mortgage" button exists in Housing Segmented; click the first unpressed one
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
    // Click the "Own outright" button (unique label, first unpressed instance)
    const ownBtns = screen.getAllByRole("button", { name: /own outright/i });
    const unpressed = ownBtns.find(b => b.getAttribute("aria-pressed") === "false");
    await user.click(unpressed);
    expect(screen.queryByLabelText(/monthly rent/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mortgage principal/i)).not.toBeInTheDocument();
  });

  it("shows the housing-outside-floor disclosure note", () => {
    render(<RetirementCalculator />);
    // At least one paragraph must contain the floor policy explanation
    expect(screen.getAllByText(/outside.*35%.*floor|hard.*obligation/i).length).toBeGreaterThan(0);
  });
});

describe("LocationTax step (Wave 2 Task 6)", () => {
  it("renders the Retirement state select with accessible label", () => {
    render(<RetirementCalculator />);
    expect(screen.getByLabelText(/retirement state/i)).toBeInTheDocument();
  });

  it("shows the state rate override input with accessible label", () => {
    render(<RetirementCalculator />);
    expect(screen.getByLabelText(/state rate override/i)).toBeInTheDocument();
  });

  it("shows a plain-language note when a no-tax state is selected", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    const select = screen.getByLabelText(/retirement state/i);
    await user.selectOptions(select, "TX");
    expect(screen.getByText(/Texas.*no state income tax/i)).toBeInTheDocument();
  });

  it("shows a typed-rate note when CA is selected", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    const select = screen.getByLabelText(/retirement state/i);
    await user.selectOptions(select, "CA");
    expect(screen.getByText(/California.*effective state income tax/i)).toBeInTheDocument();
  });

  it("renders the work-state select and relocation-year input with accessible labels", () => {
    render(<RetirementCalculator />);
    expect(screen.getByLabelText(/where you live and earn now|work state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/relocation year/i)).toBeInTheDocument();
  });

  it("shows the simplified-transition / Pension Source Tax Act note near relocation year", () => {
    render(<RetirementCalculator />);
    expect(screen.getByText(/transition year is simplified/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pension Source Tax Act/i })).toBeInTheDocument();
  });
});

describe("relocation home disposition (Wave 2 Task 8)", () => {
  // The default persona works in WA and retires to Austria (jurisdictions differ), so
  // switching the work home to an owned tenure reveals the disposition controls.
  const ownTheWorkHome = async (user) => {
    // Switch the (main) work-home tenure to "own outright". Segmented buttons share an
    // accessible name, so match the option by exact button text.
    const ownBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent.trim() === "Own outright");
    await user.click(ownBtn);
  };

  // Note: the app mounts the Housing step in more than one responsive layout, so the
  // controls can appear more than once — assert on counts, not single-element queries.
  it("hides the disposition controls while the work home is a rental", () => {
    render(<RetirementCalculator />);
    // Default persona rents → no relocation home transition is offered.
    expect(screen.queryAllByLabelText(/work home at relocation/i).length).toBe(0);
  });

  it("reveals the work-home disposition control when the work home is owned in a different state", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await ownTheWorkHome(user);
    expect(screen.getAllByLabelText(/work home at relocation/i).length).toBeGreaterThan(0);
  });

  it("offers an estimated-sale-value input with a planning-grade caption for the sell action", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await ownTheWorkHome(user);
    // Sell is the default action → the estimated sale value field is shown.
    expect(screen.getAllByLabelText(/estimated sale value/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/selling costs.*capital-gains exclusion|~?7% selling costs/i).length).toBeGreaterThan(0);
  });

  it("exposes a retirement-home control labeled for the post-relocation dwelling", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await ownTheWorkHome(user);
    // The "Retirement home" sub-config (tenure Segmented) appears once revealed.
    expect(screen.getAllByText(/^Retirement home$/i).length).toBeGreaterThan(0);
  });

  it("shows the keep-as-rental caption when that disposition is chosen", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    await ownTheWorkHome(user);
    // Segmented buttons share an accessible name (the Field wraps all options), so select
    // the keep option by its exact button text rather than the fuzzy accessible name.
    const keepBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent.trim() === "Keep as rental");
    await user.click(keepBtn);
    expect(screen.getAllByText(/Kept as a rental.*work mortgage continues/i).length).toBeGreaterThan(0);
  });
});

describe("DualTaxExposure panel (Wave 2 Task 6)", () => {
  it("renders cross-border tax exposure for the default international location (Austria)", () => {
    render(<RetirementCalculator />);
    // The accessible label marks the section.
    expect(screen.getByRole("region", { name: /cross-border tax exposure/i })).toBeInTheDocument();
  });

  it("shows the worldwide taxation and government pension notes", () => {
    render(<RetirementCalculator />);
    expect(screen.getAllByText(/worldwide income/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/government-service pension|WA DRS pension/i).length).toBeGreaterThan(0);
  });

  it("hides the panel when a US state is selected", async () => {
    const user = userEvent.setup();
    render(<RetirementCalculator />);
    const select = screen.getByLabelText(/retirement state/i);
    await user.selectOptions(select, "TX");
    expect(screen.queryByRole("region", { name: /cross-border tax exposure/i })).not.toBeInTheDocument();
  });
});

describe("Task 8 — work-vs-retire jurisdiction split UI", () => {
  it("renders the Work state selector with an accessible label", () => {
    render(<RetirementCalculator />);
    expect(screen.getByLabelText(/where you live and earn now/i)).toBeInTheDocument();
  });

  it("renders the Relocation year input with an accessible label", () => {
    render(<RetirementCalculator />);
    expect(screen.getByLabelText(/relocation year/i)).toBeInTheDocument();
  });

  it("defaults the work state to Washington (WA)", () => {
    render(<RetirementCalculator />);
    const workStateSelect = screen.getByLabelText(/where you live and earn now/i);
    expect(workStateSelect.value).toBe("WA");
  });
});
