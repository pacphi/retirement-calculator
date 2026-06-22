// Per-year detail derivations for the "Year by year" navigator.
//
// The simulation engine is annual-only (see simulate.js): each row carries whole-year
// figures with no intra-year variation. So "monthly" here is an honest per-month RATE —
// the annual value divided by 12, presented as "a typical month" for the selected year.
// Genuinely lumpy, one-time items (a home sale, the first RMD year, a survivor transition)
// are NOT smeared across months; they are surfaced as flagged milestones instead.

const m = (x) => (Number(x) || 0) / 12;

// Break a simulation row into a typical month's income, portfolio draw, and expenses.
// Portfolio draw is the reconciling flow: non-portfolio income stacks up, expenses stack
// down, and the draw bridges the gap (in retirement) — so net ≈ 0 in a binding retirement
// year, and a positive surplus (which the engine routes to contributions) in working years.
export function monthlyBreakdown(row) {
  const income = {
    salA: m(row.salA),
    salB: m(row.salB),
    rent: m(row.rent),
    pens: m(row.pens),
    ssA: m(row.ssA),
    ssB: m(row.ssB),
  };
  const draw = m(row.wdSpend ?? row.wd);
  // need is after-tax spending and already includes extraSpend (travel/events/LTC);
  // core living is the remainder. tax is funded on top of need by the draw/income.
  const extra = m(row.extraSpend);
  const living = m((Number(row.need) || 0) - (Number(row.extraSpend) || 0));
  const tax = m(row.tax);
  const expenses = { living, extra, tax };
  const incomeTotalMo = income.salA + income.salB + income.rent + income.pens + income.ssA + income.ssB;
  const expenseTotalMo = living + extra + tax;
  // Net surplus/shortfall for the month: everything coming in (incl. the savings draw)
  // less everything going out. ~0 when the draw is sized to meet the need; positive in
  // working years where income exceeds need (the surplus the engine can contribute).
  const netMo = incomeTotalMo + draw - expenseTotalMo;
  return { income, draw, expenses, incomeTotalMo, expenseTotalMo, netMo };
}

// Detect the notable events that land in a given year by comparing against the prior row.
// Returns flagged badges (not month-placed). `kind` drives badge colour in the UI:
//   income  — a new income stream begins
//   life    — a life/coverage milestone (Medicare, work-stop, survivor)
//   tax     — a tax-relevant onset (RMDs begin)
//   spend   — a spending event (home sale proceeds are surfaced here as a windfall)
export function yearMilestones(row, prevRow, inputs = {}, depAge = null) {
  if (!row) return [];
  const out = [];
  const began = (key) => (Number(row[key]) || 0) > 0 && (!prevRow || (Number(prevRow[key]) || 0) === 0);

  if (began("ssA")) out.push({ key: "ssA", label: "Social Security starts (you)", kind: "income" });
  if (began("ssB")) out.push({ key: "ssB", label: "Social Security starts (spouse)", kind: "income" });
  if (began("pens")) out.push({ key: "pens", label: "WA pension starts", kind: "income" });
  if (began("rmd")) out.push({ key: "rmd", label: "RMDs begin", kind: "tax" });

  if (row.aA === 65) out.push({ key: "med-a", label: "Medicare eligibility (you)", kind: "life" });
  if (row.aB === 65) out.push({ key: "med-b", label: "Medicare eligibility (spouse)", kind: "life" });
  if (inputs.stopA != null && row.aA === Number(inputs.stopA)) out.push({ key: "stop-a", label: "You stop working", kind: "life" });
  if (inputs.stopB != null && row.aB === Number(inputs.stopB)) out.push({ key: "stop-b", label: "Spouse stops working", kind: "life" });

  if ((Number(row.sellLump) || 0) > 0) out.push({ key: "sell", label: "Home sale", kind: "spend", amount: Math.round(row.sellLump) });
  if (row.survivor && (!prevRow || !prevRow.survivor)) out.push({ key: "surv", label: "Survivor year begins", kind: "life" });
  if ((Number(row.extraSpend) || 0) > 0) out.push({ key: "extra", label: "Travel / one-time spending", kind: "spend", amount: Math.round(row.extraSpend) });
  if (depAge != null && row.aA === depAge) out.push({ key: "dep", label: "Savings depleted", kind: "tax" });

  return out;
}
